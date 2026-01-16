/**
 * Program Designer Agent
 *
 * Agent that orchestrates training program design, validation, and storage.
 * Uses 8 specialized tools to accomplish the task with Claude making decisions.
 */

import { Agent } from "../core/agent";
import type { ProgramDesignerContext, ProgramDesignResult } from "./types";
import {
  loadProgramRequirementsTool,
  generatePhaseStructureTool,
  generatePhaseWorkoutsTool,
  validateProgramStructureTool,
  pruneExcessWorkoutsTool,
  normalizeProgramDataTool,
  generateProgramSummaryTool,
  saveProgramToDatabaseTool,
} from "./tools";
import { buildProgramDesignerPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceAllBlocking, calculateProgramMetrics } from "./helpers";

/**
 * Semantic storage key mapping for tool results
 * Maps tool IDs to shorter, meaningful keys for cleaner result storage
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  load_program_requirements: "requirements",
  generate_phase_structure: "phase_structure",
  generate_phase_workouts: "phase_workouts", // Note: individual phases use "phase_workouts:{phaseId}"
  validate_program_structure: "validation",
  prune_excess_workouts: "pruning",
  normalize_program_data: "normalization",
  generate_program_summary: "summary",
  save_program_to_database: "save",
};

/**
 * Minimum number of tools that must be called for a complete program design workflow.
 * A complete workflow requires at minimum:
 * 1. load_program_requirements - Load user requirements and context
 * 2. generate_phase_structure - Create program phase structure
 * 3. generate_phase_workouts - Generate workouts for at least one phase
 *
 * Note: This is used to detect incomplete agent responses that should trigger a retry.
 */
const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 3;

/**
 * Program Designer Agent
 *
 * Coordinates program design using tool-based workflow.
 * Claude decides when to load requirements, generate phases, validate, normalize, summarize, and save.
 */
export class ProgramDesignerAgent extends Agent<ProgramDesignerContext> {
  private toolResults: Map<string, any> = new Map(); // Track tool results

  /**
   * Store tool result with unique key for later retrieval
   * Prevents Claude from needing to echo large objects
   */
  private storeToolResult(
    toolId: string,
    result: any,
    uniqueKey?: string,
  ): void {
    const storageKey = uniqueKey || STORAGE_KEY_MAP[toolId] || toolId;
    this.toolResults.set(storageKey, result);
    console.info(`📦 Stored tool result: ${toolId} → ${storageKey}`);
  }

  /**
   * Retrieve stored tool result by key
   */
  private getToolResult(key: string): any {
    return this.toolResults.get(key);
  }

  /**
   * Create augmented context with getToolResult accessor
   * Used by all tool executions for data retrieval
   */
  private createAugmentedContext(): ProgramDesignerContext & {
    getToolResult: (key: string) => any;
  } {
    return {
      ...this.config.context,
      getToolResult: this.getToolResult.bind(this),
    };
  }

  /**
   * Build standardized tool result structure for Bedrock conversation
   */
  private buildToolResult(
    toolUse: any,
    result: any,
    status: "success" | "error",
  ): any {
    return {
      toolResult: {
        toolUseId: toolUse.toolUseId,
        content: [{ json: result }],
        status,
      },
    };
  }

  /**
   * Extract all phase workout results (one per phase)
   */
  private getPhaseWorkoutResults(): any[] {
    return Array.from(this.toolResults.entries())
      .filter(([key]) => key.startsWith("phase_workouts:"))
      .map(([, value]) => value);
  }

  /**
   * Retrieve all tool results in structured format
   * Typed for better IntelliSense and error detection
   */
  private getStructuredToolResults() {
    return {
      requirements: this.toolResults.get("requirements"),
      phaseStructure: this.toolResults.get("phase_structure"),
      phaseWorkouts: this.getPhaseWorkoutResults(),
      validation: this.toolResults.get("validation"),
      normalization: this.toolResults.get("normalization"),
      summary: this.toolResults.get("summary"),
      save: this.toolResults.get("save"),
    };
  }

  /**
   * Extract tool uses from response and group by tool ID
   * Groups enable parallel execution of same-tool calls (e.g., phase workouts)
   */
  private extractAndGroupTools(
    contentBlocks: any[],
  ): Map<string, Array<{ block: any; tool: any }>> {
    const toolUses = contentBlocks.filter((block: any) => block.toolUse);
    const toolGroups = new Map<string, Array<{ block: any; tool: any }>>();

    for (const block of toolUses) {
      const toolUse = block.toolUse;
      const tool = this.config.tools.find((t) => t.id === toolUse.name);

      if (!tool) {
        console.warn(`⚠️ Tool not found: ${toolUse.name}`);
        continue;
      }

      if (!toolGroups.has(tool.id)) {
        toolGroups.set(tool.id, []);
      }
      toolGroups.get(tool.id)!.push({ block, tool });
    }

    return toolGroups;
  }

  /**
   * Execute multiple phase workout generations in parallel
   * Significantly reduces total generation time (60% faster)
   */
  private async executePhaseWorkoutsParallel(
    toolGroup: Array<{ block: any; tool: any }>,
  ): Promise<any[]> {
    const augmentedContext = this.createAugmentedContext();

    return await Promise.all(
      toolGroup.map(async ({ block, tool }) => {
        const toolUse = block.toolUse;

        console.info(`⚙️ Executing tool: ${tool.id}`, {
          phaseId: toolUse.input?.phase?.phaseId,
          phaseName: toolUse.input?.phase?.name,
        });

        try {
          const startTime = Date.now();
          const result = await tool.execute(toolUse.input, augmentedContext);
          const duration = Date.now() - startTime;

          console.info(`✅ Tool ${tool.id} completed in ${duration}ms`, {
            phaseId: result.phaseId,
            workoutCount: result.workoutTemplates?.length,
          });

          // Store result by phaseId for later retrieval
          const phaseId = result.phaseId || toolUse.input?.phase?.phaseId;
          if (phaseId) {
            this.storeToolResult(tool.id, result, `phase_workouts:${phaseId}`);
          } else {
            // Fallback: store with tool.id if phaseId is missing
            console.warn(
              `⚠️ Phase workout result missing phaseId - storing with tool.id fallback`,
            );
          }
          this.toolResults.set(tool.id, result);

          return this.buildToolResult(toolUse, result, "success");
        } catch (error) {
          console.error(`❌ Tool ${tool.id} failed:`, error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorResult = { error: errorMessage || "Unknown error" };

          // Store error result using semantic key mapping (same as success results)
          // This ensures blocking enforcement can find error results
          this.storeToolResult(tool.id, errorResult);

          return this.buildToolResult(toolUse, errorResult, "error");
        }
      }),
    );
  }

  /**
   * Execute tools sequentially with blocking enforcement
   * Applies validation and normalization blocking before save
   */
  private async executeToolsSequentially(
    toolGroup: Array<{ block: any; tool: any }>,
  ): Promise<any[]> {
    const results: any[] = [];
    const augmentedContext = this.createAugmentedContext();

    for (const { block, tool } of toolGroup) {
      const toolUse = block.toolUse;

      // Enforce blocking decisions (validation + normalization)
      const validationResult = this.toolResults.get("validation");
      const normalizationResult = this.toolResults.get("normalization");

      const blockingResult = enforceAllBlocking(
        tool.id,
        validationResult,
        normalizationResult,
      );

      if (blockingResult) {
        console.warn(`⛔ Blocking tool execution: ${tool.id}`);
        results.push(this.buildToolResult(toolUse, blockingResult, "error"));
        continue;
      }

      console.info(`⚙️ Executing tool: ${tool.id}`);

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolUse.input, augmentedContext);
        const duration = Date.now() - startTime;

        console.info(`✅ Tool ${tool.id} completed in ${duration}ms`);

        // Store results for retrieval by other tools
        if (tool.id === "generate_phase_workouts") {
          // Phase workouts need unique keys per phase
          const phaseId = result.phaseId || toolUse.input?.phase?.phaseId;
          if (phaseId) {
            this.storeToolResult(tool.id, result, `phase_workouts:${phaseId}`);
          } else {
            // Warning if phaseId is unexpectedly missing
            console.warn(
              `⚠️ Phase workout result missing phaseId - storing with tool.id fallback`,
            );
          }
          // Always store at tool.id (matches parallel execution behavior)
          this.toolResults.set(tool.id, result);
        } else if (tool.id === "prune_excess_workouts") {
          // Store pruning result
          this.storeToolResult(tool.id, result);

          // CRITICAL: Apply phase updates to stored phase workout results
          // This ensures save_program_to_database retrieves pruned templates
          if (result.phaseUpdates && Array.isArray(result.phaseUpdates)) {
            console.info(
              `📝 Applying ${result.phaseUpdates.length} phase updates from pruning...`,
            );
            for (const update of result.phaseUpdates) {
              this.toolResults.set(update.storageKey, update.updatedResult);
              console.info(
                `  ✓ Updated ${update.storageKey} with ${update.updatedResult.workoutTemplates.length} pruned templates`,
              );
            }
            console.info(
              "✅ All phase workout storage updated with pruned templates",
            );
          }
        } else {
          this.storeToolResult(tool.id, result);
        }

        results.push(this.buildToolResult(toolUse, result, "success"));
      } catch (error) {
        console.error(`❌ Tool ${tool.id} failed:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorResult = { error: errorMessage || "Unknown error" };

        // Store error result using semantic key mapping (same as success results)
        // This ensures blocking enforcement can find error results
        this.storeToolResult(tool.id, errorResult);

        results.push(this.buildToolResult(toolUse, errorResult, "error"));
      }
    }

    return results;
  }

  /**
   * Execute tool groups with parallel/sequential logic
   * Phase workouts run in parallel, others run sequentially
   */
  private async executeToolGroups(
    toolGroups: Map<string, Array<{ block: any; tool: any }>>,
  ): Promise<any[]> {
    const allResults: any[] = [];

    for (const [toolId, toolGroup] of toolGroups) {
      const count = toolGroup.length;

      // Parallelize phase workout generation
      if (toolId === "generate_phase_workouts" && count > 1) {
        console.info(`🚀 Executing ${count} phase workout(s) in parallel`);
        const parallelResults =
          await this.executePhaseWorkoutsParallel(toolGroup);
        allResults.push(...parallelResults);
        console.info(`✅ Completed ${count} phase workout(s) in parallel`);
      } else {
        // Execute sequentially with blocking checks
        const sequentialResults =
          await this.executeToolsSequentially(toolGroup);
        allResults.push(...sequentialResults);
      }
    }

    return allResults;
  }

  /**
   * Override handleToolUse to implement parallel execution for phase workouts
   * Orchestrates parallel vs sequential execution based on tool type
   */
  protected async handleToolUse(response: any): Promise<void> {
    const conversationHistory = this.getConversationHistory();
    const contentBlocks = response.output?.message?.content || [];

    // Add Claude's tool use message to history
    conversationHistory.push({
      role: "assistant",
      content: contentBlocks,
    });

    // Extract and group tools for parallelization
    const toolGroups = this.extractAndGroupTools(contentBlocks);

    console.info(`🔧 Executing ${toolGroups.size} tool group(s)`);

    // Execute tool groups with parallel/sequential logic
    const toolResults = await this.executeToolGroups(toolGroups);

    // Add tool results back to conversation
    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    console.info("📥 Tool results added to conversation history");
  }

  constructor(context: ProgramDesignerContext) {
    // Build full prompt
    const fullPrompt = buildProgramDesignerPrompt(context);

    // Extract dynamic values for small dynamic prompt
    const duration = context.todoList?.programDuration?.value || "Unknown";
    const trainingGoals =
      context.todoList?.trainingGoals?.value || "Not specified";
    const trainingFreq =
      context.todoList?.trainingFrequency?.value || "Unknown";
    const trainingMethodology =
      context.todoList?.trainingMethodology?.value || "Not specified";

    super({
      // Large static portion (tools, rules, examples, periodization) - ~95% of tokens
      staticPrompt: fullPrompt,

      // Small dynamic portion (session-specific data) - ~5% of tokens
      dynamicPrompt:
        `\n## CURRENT DESIGN SESSION\n` +
        `- Program Duration: ${duration}\n` +
        `- Training Goals: ${trainingGoals}\n` +
        `- Training Frequency: ${trainingFreq} days/week\n` +
        `- Training Methodology: ${trainingMethodology}\n` +
        `- Session ID: ${context.sessionId}\n` +
        `- Program ID: ${context.programId}`,

      // Backward compatibility (not used when staticPrompt/dynamicPrompt provided)
      systemPrompt: fullPrompt,

      tools: [
        loadProgramRequirementsTool,
        generatePhaseStructureTool,
        generatePhaseWorkoutsTool,
        validateProgramStructureTool,
        pruneExcessWorkoutsTool,
        normalizeProgramDataTool,
        generateProgramSummaryTool,
        saveProgramToDatabaseTool,
      ],
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      context,
    });

    console.info("🔥 ProgramDesignerAgent initialized with caching support");
  }

  /**
   * Design program from requirements
   * Returns standardized result structure matching existing build-program Lambda
   */
  async designProgram(): Promise<ProgramDesignResult> {
    console.info("🏋️ ProgramDesigner agent starting", {
      userId: this.config.context.userId,
      programId: this.config.context.programId,
      sessionId: this.config.context.sessionId,
      ...(this.config.context.conversationId && {
        conversationId: this.config.context.conversationId,
      }),
    });

    try {
      const response = await this.converse(
        "Design the complete training program based on the provided todo list and context.",
      );

      console.info("Agent response received:", {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        toolResultsCollected: Array.from(this.toolResults.keys()),
      });

      const result = this.buildResultFromToolData(response);

      // RETRY LOGIC: If AI didn't use tools (incomplete workflow),
      // retry with a stronger prompt forcing it to proceed
      if (this.shouldRetryWithStrongerPrompt(result, response)) {
        console.warn(
          "🔄 AI incomplete workflow - RETRYING with stronger prompt to force tool execution",
        );

        // Clear tool results and retry with explicit instruction
        this.toolResults.clear();

        const retryPrompt = this.buildRetryPrompt(response);
        const retryResponse = await this.converse(retryPrompt);

        console.info("Retry response received:", {
          responseLength: retryResponse.length,
          toolResultsCollected: Array.from(this.toolResults.keys()),
        });

        const retryResult = this.buildResultFromToolData(retryResponse);

        // If retry also failed, fall back to original result
        if (!retryResult.success && retryResult.skipped) {
          console.warn(
            "⚠️ Retry also resulted in skip - using original result",
          );
          return result;
        }

        console.info("✅ Retry successful - program designed after retry");
        return retryResult;
      }

      console.info("Built program design result:", {
        success: result.success,
        programId: result.programId,
        hasAllFields: !!(result.programName && result.totalDays),
      });

      return result;
    } catch (error) {
      console.error("❌ ProgramDesigner agent error:", error);

      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Determine if we should retry with a stronger prompt
   * This happens when AI doesn't use tools or workflow is incomplete
   */
  private shouldRetryWithStrongerPrompt(
    result: ProgramDesignResult,
    response: string,
  ): boolean {
    // Don't retry if it was successful
    if (result.success) {
      return false;
    }

    // Don't retry if validation explicitly failed (structural issues)
    if (
      result.reason &&
      result.reason.toLowerCase().includes("validation failed")
    ) {
      return false;
    }

    // Count only successful tool results (exclude error results and duplicates)
    // Error results are stored for blocking enforcement but shouldn't count toward progress
    // Exclude duplicate phase workout entry stored at raw tool.id to prevent count inflation
    // Check for property existence rather than truthiness to handle empty error messages
    // Null check prevents TypeError if a tool returns null/undefined
    const successfulToolCount = Array.from(this.toolResults.entries()).filter(
      ([key, result]) =>
        result && !("error" in result) && key !== "generate_phase_workouts", // Exclude duplicate raw tool ID
    ).length;

    // Retry if no tools succeeded or minimal tools succeeded
    const noToolsCalled = successfulToolCount === 0;
    const minimalToolsCalled =
      successfulToolCount < MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW;

    const looksIncomplete =
      response.includes("?") ||
      response.toLowerCase().includes("need to") ||
      response.toLowerCase().includes("should i") ||
      response.toLowerCase().includes("would you like") ||
      response.toLowerCase().includes("can you confirm");

    // ALSO retry if tools failed due to missing programContext
    // This detects the specific error pattern we're trying to fix
    const hasProgramContextError = !!(
      result.reason?.includes("programContext") ||
      result.reason?.includes("coachConfig") ||
      result.reason?.includes("missing required fields")
    );

    return (
      (noToolsCalled || minimalToolsCalled) &&
      (looksIncomplete || hasProgramContextError)
    );
  }

  /**
   * Build a stronger retry prompt that forces tool execution
   */
  private buildRetryPrompt(aiResponse: string): string {
    // Check if the error was related to programContext
    const hasProgramContextError =
      aiResponse.includes("programContext") ||
      aiResponse.includes("coachConfig") ||
      aiResponse.includes("missing required fields");

    // Get the requirementsResult if it was stored (exclude error results)
    const requirementsResult = this.toolResults.get("requirements");
    const hasRequirements =
      requirementsResult && !("error" in requirementsResult);

    let contextGuidance = "";
    if (hasProgramContextError && hasRequirements) {
      contextGuidance = `

🚨 CRITICAL DATA PASSING ERROR DETECTED:

You called generate_phase_workouts without passing the complete programContext.

The load_program_requirements tool returned:
${JSON.stringify(
  {
    coachConfig: "✓ Available",
    userProfile: requirementsResult.userProfile ? "✓ Available" : "null",
    pineconeContext: "✓ Available",
    programDuration: requirementsResult.programDuration,
    trainingFrequency: requirementsResult.trainingFrequency,
  },
  null,
  2,
)}

When you call generate_phase_workouts, you MUST pass this ENTIRE object as programContext:

generate_phase_workouts({
  phase: phaseStructureResult.phases[N],
  allPhases: phaseStructureResult.phases,
  programContext: requirementsResult  // ← Pass the ENTIRE load_program_requirements result
})

DO NOT construct programContext manually. DO NOT pass individual fields.
Pass the ENTIRE requirementsResult object exactly as you received it.`;
    }

    return `CRITICAL OVERRIDE: You did not complete the program design workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."
${contextGuidance}

You MUST now complete the workflow by calling ALL required tools:
1. load_program_requirements ${hasRequirements ? "(✓ ALREADY DONE - reuse this result)" : ""}
2. generate_phase_structure
3. generate_phase_workouts (for EACH phase) ${hasProgramContextError ? "← FIX YOUR DATA PASSING HERE" : ""}
4. validate_program_structure
5. normalize_program_data (if needed)
6. generate_program_summary
7. save_program_to_database

CRITICAL INSTRUCTIONS:
- ${hasRequirements ? "REUSE the existing requirementsResult from step 1" : "Call load_program_requirements first"}
- When calling generate_phase_workouts, pass requirementsResult as programContext
- DO NOT construct programContext manually
- DO NOT pass individual fields - pass the ENTIRE object
- Make reasonable assumptions for any missing information
- DO NOT ask any more questions
- CALL YOUR TOOLS to design and save the program

Now design the complete program using your tools with CORRECT data passing.`;
  }

  /**
   * Build ProgramDesignResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles incomplete workflows appropriately.
   */
  private buildResultFromToolData(agentResponse: string): ProgramDesignResult {
    // Extract tool results using structured helper
    const results = this.getStructuredToolResults();

    console.info("Tool results available:", {
      hasRequirements: !!results.requirements,
      hasPhaseStructure: !!results.phaseStructure,
      phaseWorkoutsCount: results.phaseWorkouts.length,
      hasValidation: !!results.validation,
      hasNormalization: !!results.normalization,
      hasSummary: !!results.summary,
      hasSave: !!results.save,
    });

    // If save tool was called successfully, we have a complete program
    if (results.save?.success && results.save?.programId) {
      console.info("✅ Building success result from save tool");

      // Assemble program data from tool results
      const phases = results.phaseStructure?.phases || [];

      // Collect all workout templates from phase results
      const allWorkoutTemplates = results.phaseWorkouts.flatMap(
        (result: any) => result.workoutTemplates || [],
      );

      // Calculate metrics using shared helper
      const metrics = calculateProgramMetrics(allWorkoutTemplates);

      console.info("📊 Program metrics calculated:", {
        phaseCount: phases.length,
        totalWorkoutTemplates: metrics.totalWorkoutTemplates,
        uniqueTrainingDays: metrics.uniqueTrainingDays,
        averageSessionsPerDay: metrics.averageSessionsPerDay,
      });

      return {
        success: true,
        programId: results.save.programId,
        programName: this.extractProgramName(),
        totalDays: results.requirements?.programDuration,
        phaseCount: phases.length,
        totalWorkoutTemplates: metrics.totalWorkoutTemplates,
        uniqueTrainingDays: metrics.uniqueTrainingDays,
        averageSessionsPerDay: metrics.averageSessionsPerDay,
        trainingFrequency: results.requirements?.trainingFrequency,
        summary: results.summary?.summary,
        pineconeStored: !!results.save.pineconeRecordId,
        pineconeRecordId: results.save.pineconeRecordId,
        normalizationApplied: !!results.normalization,
        generationMethod: "agent_v2",
        s3DetailKey: results.save.s3Key,
      };
    }

    // If validation blocked save, return structured failure
    if (results.validation && !results.validation.isValid) {
      console.info("⚠️ Building failure result from validation");

      return {
        success: false,
        skipped: true,
        reason: `Program validation failed: ${results.validation.validationIssues?.join(", ") || "Unknown issues"}`,
        blockingFlags: results.validation.validationIssues,
      };
    }

    // If no tools were called, agent may be asking for clarification
    // This is EXPECTED behavior in some cases, not a failure
    if (
      !results.requirements &&
      !results.phaseStructure &&
      !results.validation &&
      !results.save
    ) {
      console.info(
        "💬 Agent incomplete workflow (no tools called - may need retry)",
      );

      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent workflow incomplete - no tools called",
      };
    }

    // Partial tool execution without save - this is a failure
    // Note: We DO NOT attempt to parse program IDs from text, as this can
    // create false positives (e.g., Claude mentioning the input programId).
    // Only saveResult provides authoritative confirmation of success.
    console.warn("⚠️ Partial tool execution - workflow incomplete");

    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - program was not saved to database",
    };
  }

  /**
   * Extract program name from tool results or generate default
   */
  private extractProgramName(): string {
    const phaseStructureResult = this.toolResults.get("phase_structure");
    const requirementsResult = this.toolResults.get("requirements");

    // Try to extract from phase structure or requirements
    if (phaseStructureResult?.phases?.[0]?.name) {
      const durationDays = requirementsResult?.programDuration || 56;
      const durationWeeks = Math.round(durationDays / 7);
      return `${durationWeeks}-Week Training Program`;
    }

    // Fallback to todoList
    const todoList = this.config.context.todoList;
    if (todoList?.trainingGoals?.value) {
      const durationDays = requirementsResult?.programDuration || 56;
      const durationWeeks = Math.round(durationDays / 7);
      return `${durationWeeks}-Week ${todoList.trainingGoals.value}`;
    }

    return "Custom Training Program";
  }
}
