/**
 * Program Designer Agent
 *
 * Agent that orchestrates training program design, validation, and storage.
 * Uses 7 specialized tools to accomplish the task with Claude making decisions.
 */

import { Agent } from "../core/agent";
import type { ProgramDesignerContext, ProgramDesignResult } from "./types";
import {
  loadProgramRequirementsTool,
  generatePhaseStructureTool,
  generatePhaseWorkoutsTool,
  validateProgramStructureTool,
  normalizeProgramDataTool,
  generateProgramSummaryTool,
  saveProgramToDatabaseTool,
} from "./tools";
import { buildProgramDesignerPrompt } from "./prompts";
import { MODEL_IDS } from "../../api-helpers";
import { enforceValidationBlocking } from "./helpers";

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

  constructor(context: ProgramDesignerContext) {
    super({
      systemPrompt: buildProgramDesignerPrompt(context),
      tools: [
        loadProgramRequirementsTool,
        generatePhaseStructureTool,
        generatePhaseWorkoutsTool,
        validateProgramStructureTool,
        normalizeProgramDataTool,
        generateProgramSummaryTool,
        saveProgramToDatabaseTool,
      ],
      modelId: MODEL_IDS.CLAUDE_SONNET_4_FULL,
      context,
    });
  }

  /**
   * Design program from requirements
   * Returns standardized result structure matching existing build-program Lambda
   */
  async designProgram(): Promise<ProgramDesignResult> {
    console.info("🏋️ ProgramDesigner agent starting", {
      userId: this.config.context.userId,
      programId: this.config.context.programId,
      conversationId: this.config.context.conversationId,
    });

    try {
      // Override tool execute to track results AND enforce blocking decisions
      const originalTools = this.config.tools;
      this.config.tools = originalTools.map((tool) => ({
        ...tool,
        execute: async (input: any, context: any) => {
          // ============================================================
          // CRITICAL: ENFORCE BLOCKING DECISIONS (Defense in Depth)
          // ============================================================
          // If validate_program_structure returned isValid: false,
          // prevent normalize_program_data and save_program_to_database
          // from executing, even if Claude tries to call them.
          //
          // This is a code-level enforcement in addition to prompt-level
          // guidance, ensuring blocking decisions are AUTHORITATIVE.
          // ============================================================

          const validationResult = this.toolResults.get(
            "validate_program_structure",
          );

          // Check if tool execution should be blocked
          const blockingResult = enforceValidationBlocking(
            tool.id,
            validationResult,
          );
          if (blockingResult) {
            return blockingResult; // Return error result to Claude
          }

          // Execute tool normally if not blocked
          const result = await tool.execute(input, context);

          // ============================================================
          // IMPORTANT: Handle multiple calls to generate_phase_workouts
          // ============================================================
          // Since generate_phase_workouts is called once per phase,
          // we need unique keys to avoid overwriting previous results.
          // Use phaseId from input to create unique storage key.
          // ============================================================
          let storageKey = tool.id;
          if (tool.id === "generate_phase_workouts" && input?.phase?.phaseId) {
            storageKey = `${tool.id}:${input.phase.phaseId}`;
            console.info(
              `📦 Storing phase workout result with unique key: ${storageKey}`,
            );
          }

          this.toolResults.set(storageKey, result);
          console.info(`📦 Stored tool result for ${tool.id}`);
          return result;
        },
      }));

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

    // Retry if no tools were called and response looks incomplete
    const noToolsCalled = this.toolResults.size === 0;
    const minimalToolsCalled =
      this.toolResults.size < MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW;

    const looksIncomplete =
      response.includes("?") ||
      response.toLowerCase().includes("need to") ||
      response.toLowerCase().includes("should i") ||
      response.toLowerCase().includes("would you like") ||
      response.toLowerCase().includes("can you confirm");

    return (noToolsCalled || minimalToolsCalled) && looksIncomplete;
  }

  /**
   * Build a stronger retry prompt that forces tool execution
   */
  private buildRetryPrompt(aiResponse: string): string {
    return `CRITICAL OVERRIDE: You did not complete the program design workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by calling ALL required tools:
1. load_program_requirements
2. generate_phase_structure
3. generate_phase_workouts (for EACH phase)
4. validate_program_structure
5. normalize_program_data (if needed)
6. generate_program_summary
7. save_program_to_database

- Make reasonable assumptions for any missing information
- Use the todoList and conversationContext from the system prompt
- DO NOT ask any more questions
- CALL YOUR TOOLS to design and save the program

Now design the complete program using your tools.`;
  }

  /**
   * Build ProgramDesignResult from tool execution data
   *
   * Uses stored tool results to construct complete response with all metadata.
   * Handles incomplete workflows appropriately.
   */
  private buildResultFromToolData(agentResponse: string): ProgramDesignResult {
    const requirementsResult = this.toolResults.get(
      "load_program_requirements",
    );
    const phaseStructureResult = this.toolResults.get(
      "generate_phase_structure",
    );
    // Collect ALL phase workout results (one per phase)
    // Keys are stored as "generate_phase_workouts:phaseId" to avoid overwrites
    const phaseWorkoutsResults = Array.from(this.toolResults.entries())
      .filter(([key]) => key.startsWith("generate_phase_workouts"))
      .map(([, value]) => value);
    const validationResult = this.toolResults.get("validate_program_structure");
    const normalizationResult = this.toolResults.get("normalize_program_data");
    const summaryResult = this.toolResults.get("generate_program_summary");
    const saveResult = this.toolResults.get("save_program_to_database");

    console.info("Tool results available:", {
      hasRequirements: !!requirementsResult,
      hasPhaseStructure: !!phaseStructureResult,
      phaseWorkoutsCount: phaseWorkoutsResults.length,
      hasValidation: !!validationResult,
      hasNormalization: !!normalizationResult,
      hasSummary: !!summaryResult,
      hasSave: !!saveResult,
    });

    // If save tool was called successfully, we have a complete program
    if (saveResult?.success && saveResult?.programId) {
      console.info("✅ Building success result from save tool");

      // Assemble program data from tool results
      const phases = phaseStructureResult?.phases || [];
      const totalWorkouts = phaseWorkoutsResults.reduce(
        (sum, result) => sum + (result.workoutTemplates?.length || 0),
        0,
      );

      return {
        success: true,
        programId: saveResult.programId,
        programName: this.extractProgramName(),
        totalDays: requirementsResult?.programDuration,
        phases: phases.length,
        totalWorkouts,
        trainingFrequency: requirementsResult?.trainingFrequency,
        summary: summaryResult?.summary,
        pineconeStored: !!saveResult.pineconeRecordId,
        pineconeRecordId: saveResult.pineconeRecordId,
        normalizationApplied: !!normalizationResult,
        generationMethod: "agent_v2",
        s3DetailKey: saveResult.s3Key,
      };
    }

    // If validation blocked save, return structured failure
    if (validationResult && !validationResult.isValid) {
      console.info("⚠️ Building failure result from validation");

      return {
        success: false,
        skipped: true,
        reason: `Program validation failed: ${validationResult.validationIssues?.join(", ") || "Unknown issues"}`,
        blockingFlags: validationResult.validationIssues,
      };
    }

    // If no tools were called, agent may be asking for clarification
    // This is EXPECTED behavior in some cases, not a failure
    if (
      !requirementsResult &&
      !phaseStructureResult &&
      !validationResult &&
      !saveResult
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
    const phaseStructureResult = this.toolResults.get(
      "generate_phase_structure",
    );
    const requirementsResult = this.toolResults.get(
      "load_program_requirements",
    );

    // Try to extract from phase structure or requirements
    if (phaseStructureResult?.phases?.[0]?.name) {
      return `${requirementsResult?.programDuration || ""}-Day Training Program`;
    }

    // Fallback to todoList
    const todoList = this.config.context.todoList;
    if (todoList?.trainingGoals?.value) {
      const duration = requirementsResult?.programDuration || "8-Week";
      return `${duration}-Week ${todoList.trainingGoals.value}`;
    }

    return "Custom Training Program";
  }
}
