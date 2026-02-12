/**
 * Build Program V2 Lambda Handler
 *
 * Uses ProgramDesigner agent to design, validate, and save training programs.
 * Triggered asynchronously from program designer sessions (session-based flow).
 * Note: conversationId is not used - program designer sessions are standalone.
 */

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import type { BuildProgramEvent } from "../libs/program/types";
import { ProgramDesignerAgent } from "../libs/agents/program-designer/agent";
import {
  getProgramDesignerSession,
  saveProgramDesignerSession,
  getProgram,
} from "../../dynamodb/operations";
import { generateProgramDesignerSessionSummary } from "../libs/program-designer/session-management";
import { storeProgramDesignerSessionSummaryInPinecone } from "../libs/program-designer/pinecone";
import {
  validateProgramDurationInput,
  validateTrainingFrequencyInput,
} from "../libs/program/validation-helpers";
import { normalizeDuration } from "../libs/program/duration-normalizer";
import { DEFAULT_PROGRAM_DURATION_STRING } from "../libs/program/duration-parser";
import { logger } from "../libs/logger";

// Duration calculation constants
const DEFAULT_DURATION_FALLBACK_MS = 600000; // 10 minutes in milliseconds

// QA validation thresholds for detecting incomplete program generation
const WORKOUT_COUNT_MIN_THRESHOLD = 0.5; // Expect at least 50% of calculated training days
const DAY_COVERAGE_MIN_THRESHOLD = 0.7; // Expect at least 70% of expected day coverage
const DAY_COVERAGE_FLOOR_PERCENT = 20; // Absolute minimum day coverage percentage

export const handler = async (event: BuildProgramEvent) => {
  return withHeartbeat("Program Designer Agent", async () => {
    try {
      logger.info("🏋️ Starting program designer agent (V2):", {
        userId: event.userId,
        coachId: event.coachId,
        programId: event.programId,
        sessionId: event.sessionId,
        timestamp: new Date().toISOString(),
      });

      // Pre-validation
      // Note: conversationId is optional when sessionId is provided (for program designer sessions)
      if (!event.userId || !event.coachId || !event.programId) {
        logger.error("❌ Missing required fields:", {
          hasUserId: !!event.userId,
          hasCoachId: !!event.coachId,
          hasProgramId: !!event.programId,
          hasSessionId: !!event.sessionId,
        });
        return createErrorResponse(
          400,
          "Missing required fields (userId, coachId, programId)",
        );
      }

      if (!event.todoList) {
        logger.error("❌ No todo list provided");
        return createErrorResponse(400, "Todo list is required");
      }

      // Check for obviously incomplete program requirements
      const todoList = event.todoList;
      const hasBasicRequirements =
        todoList.trainingGoals?.value || todoList.programDuration?.value;

      if (!hasBasicRequirements) {
        logger.warn("⚠️ Incomplete program requirements detected:", {
          hasTrainingGoals: !!todoList.trainingGoals?.value,
          hasProgramDuration: !!todoList.programDuration?.value,
          todoListKeys: Object.keys(todoList),
        });

        return createOkResponse({
          success: false,
          skipped: true,
          reason:
            "Program requirements incomplete - please provide at least training goals and program duration",
          validation: {
            requiredFields: ["trainingGoals", "programDuration"],
            providedFields: Object.keys(todoList).filter(
              (k) => todoList[k]?.value,
            ),
          },
        });
      }

      // Validate programDuration value type
      const durationValidation = validateProgramDurationInput(
        todoList.programDuration?.value,
      );
      if (!durationValidation.isValid) {
        logger.warn(
          "⚠️ Duration validation failed, attempting AI normalization:",
          {
            providedValue: todoList.programDuration?.value,
          },
        );

        // Try AI normalization as fallback (returns structured JSON via tool config)
        const normalizationResult = await normalizeDuration(
          String(todoList.programDuration?.value || ""),
          todoList.trainingGoals?.value, // Provide context
        );

        // Check for malformed AI response (undefined/null normalized duration)
        // Best effort: fall back to default instead of blocking program creation
        if (
          normalizationResult.normalizedDuration === undefined ||
          normalizationResult.normalizedDuration === null
        ) {
          logger.warn(
            "⚠️ AI normalization returned malformed data, using default:",
            {
              original: todoList.programDuration?.value,
              normalized: normalizationResult.normalizedDuration,
              confidence: normalizationResult.confidence,
              fallback: DEFAULT_PROGRAM_DURATION_STRING,
            },
          );
          normalizationResult.normalizedDuration =
            DEFAULT_PROGRAM_DURATION_STRING;
          normalizationResult.confidence = "low";
          normalizationResult.originalInterpretation =
            "Fallback due to malformed AI response";
        }

        // Re-validate the normalized duration
        // Best effort: if still invalid, fall back to default instead of blocking
        const revalidation = validateProgramDurationInput(
          normalizationResult.normalizedDuration,
        );
        if (!revalidation.isValid) {
          logger.warn(
            "⚠️ AI normalization produced invalid value, using default:",
            {
              original: todoList.programDuration?.value,
              normalized: normalizationResult.normalizedDuration,
              confidence: normalizationResult.confidence,
              fallback: DEFAULT_PROGRAM_DURATION_STRING,
            },
          );
          normalizationResult.normalizedDuration =
            DEFAULT_PROGRAM_DURATION_STRING;
          normalizationResult.confidence = "low";
          normalizationResult.originalInterpretation =
            "Fallback due to invalid AI response";
        }

        // Update the todoList with normalized value
        logger.info("✅ AI normalization succeeded:", {
          original: todoList.programDuration?.value,
          normalized: normalizationResult.normalizedDuration,
          confidence: normalizationResult.confidence,
        });
        todoList.programDuration = {
          ...todoList.programDuration,
          value: normalizationResult.normalizedDuration,
          confidence: normalizationResult.confidence,
          notes: `AI-normalized from: "${todoList.programDuration?.value}" (${normalizationResult.originalInterpretation || "no interpretation"})`,
        };
      }

      // Validate trainingFrequency value type
      const frequencyValidation = validateTrainingFrequencyInput(
        todoList.trainingFrequency?.value,
      );
      if (!frequencyValidation.isValid) {
        logger.error("❌ Invalid training frequency:", {
          providedValue: frequencyValidation.providedValue,
          error: frequencyValidation.error,
        });
        return createErrorResponse(400, frequencyValidation.error!, {
          invalidField: frequencyValidation.field,
          providedValue: frequencyValidation.providedValue,
        });
      }

      // Create ProgramDesigner agent
      // ProgramDesignerContext extends BuildProgramEvent, so event is the context
      const agent = new ProgramDesignerAgent(event);

      // Let agent handle the entire workflow
      logger.info("🤖 Starting agent workflow...");
      const result = await agent.designProgram();

      logger.info("✅ Agent workflow completed:", {
        success: result.success,
        programId: result.programId,
        skipped: result.skipped,
      });

      // Add program generation summary
      if (result.success) {
        const endTime = Date.now();

        // Calculate actual duration if session exists with startedAt timestamp
        let startTimeMs = endTime - DEFAULT_DURATION_FALLBACK_MS;
        if (event.sessionId) {
          try {
            const session = await getProgramDesignerSession(
              event.userId,
              event.sessionId,
            );
            if (session?.programGeneration?.startedAt) {
              startTimeMs = new Date(
                session.programGeneration.startedAt,
              ).getTime();
            }
          } catch (error) {
            logger.warn(
              "⚠️ Could not load session for duration calculation:",
              error,
            );
          }
        }

        const durationSeconds = Math.floor((endTime - startTimeMs) / 1000);

        logger.info("📊 PROGRAM GENERATION SUMMARY:", {
          // Identity
          programId: result.programId,
          programName: result.programName || "Unknown",
          userId: event.userId,
          sessionId: event.sessionId,

          // Structure
          totalDays: result.totalDays,
          phaseCount: result.phaseCount || 0,
          totalWorkoutTemplates: result.totalWorkoutTemplates || 0,
          uniqueTrainingDays: result.uniqueTrainingDays || 0,
          trainingFrequency: result.trainingFrequency,

          // Dates
          startDate: result.startDate,
          endDate: result.endDate,

          // Performance
          durationSeconds: durationSeconds,
          durationMinutes: (durationSeconds / 60).toFixed(1),
          averageSessionsPerDay: result.averageSessionsPerDay || "0.0",

          // Validation
          s3KeyStored: !!result.s3DetailKey,
          sessionUpdated: true,
          parallelPhasesExecuted: true,

          // Method
          generationMethod: result.generationMethod || "agent_v2",
          normalizationApplied: result.normalizationApplied || false,
          pruningApplied: result.pruningApplied || false,
        });

        // QA Check: Validate metrics consistency
        // Detect suspiciously low workout counts that might indicate metric calculation bugs
        const phaseCount = result.phaseCount || 0;
        const totalWorkoutTemplates = result.totalWorkoutTemplates || 0;
        const uniqueTrainingDays = result.uniqueTrainingDays || 0;
        const totalDays = result.totalDays || 0;
        const trainingFrequency = result.trainingFrequency || 0;

        // Calculate expected values based on program parameters
        const expectedTrainingDays =
          totalDays > 0 && trainingFrequency > 0
            ? Math.floor((totalDays / 7) * trainingFrequency)
            : 0;
        const expectedDayCoveragePercent =
          totalDays > 0 ? (expectedTrainingDays / totalDays) * 100 : 0;

        // Check if workout count is suspiciously low (less than threshold of expected)
        // This accounts for programs that may have multiple sessions per day
        if (
          expectedTrainingDays > 0 &&
          totalWorkoutTemplates <
            expectedTrainingDays * WORKOUT_COUNT_MIN_THRESHOLD
        ) {
          logger.error(
            `❌ METRICS ANOMALY DETECTED: Program has only ${totalWorkoutTemplates} workout templates ` +
              `but expected at least ${Math.floor(expectedTrainingDays * WORKOUT_COUNT_MIN_THRESHOLD)} based on ${trainingFrequency}x/week training over ${totalDays} days. ` +
              `This may indicate incomplete generation.`,
          );
        }

        // Check if day coverage is significantly lower than expected
        const actualDayCoveragePercent =
          totalDays > 0 ? (uniqueTrainingDays / totalDays) * 100 : 0;
        const coverageThreshold = Math.max(
          expectedDayCoveragePercent * DAY_COVERAGE_MIN_THRESHOLD,
          DAY_COVERAGE_FLOOR_PERCENT,
        );

        if (
          actualDayCoveragePercent > 0 &&
          actualDayCoveragePercent < coverageThreshold
        ) {
          logger.error(
            `❌ METRICS ANOMALY DETECTED: Day coverage is ${actualDayCoveragePercent.toFixed(0)}% ` +
              `(${uniqueTrainingDays}/${totalDays} days) but expected ~${expectedDayCoveragePercent.toFixed(0)}% ` +
              `for ${trainingFrequency}x/week training. This may indicate incomplete program generation.`,
          );
        }
      }

      // Update session status to COMPLETE
      if (result.success && event.sessionId) {
        try {
          logger.info("Updating session status to COMPLETE...", {
            sessionId: event.sessionId,
            programId: result.programId,
          });

          // Load the existing session
          const existingSession = await getProgramDesignerSession(
            event.userId,
            event.sessionId,
          );

          if (existingSession) {
            // Update programGeneration status
            existingSession.programGeneration = {
              status: "COMPLETE",
              programId: result.programId,
              startedAt:
                existingSession.programGeneration?.startedAt || new Date(),
              completedAt: new Date(),
            };
            existingSession.lastActivity = new Date();

            // Save updated session
            await saveProgramDesignerSession(existingSession);

            logger.info("✅ Session updated to COMPLETE status");

            // Store program designer session summary in Pinecone (async, non-blocking)
            try {
              logger.info(
                "🔍 Storing program designer session summary in Pinecone...",
              );

              // Only proceed if we have a programId
              if (!result.programId) {
                logger.warn(
                  "⚠️ No programId available for Pinecone session storage",
                );
                // Skip Pinecone storage but continue handler execution
              } else {
                // Get the created program for additional context
                const program = await getProgram(
                  event.userId,
                  event.coachId,
                  result.programId,
                );

                if (program) {
                  // Generate AI-powered session summary and store in Pinecone (fire-and-forget, non-blocking)
                  generateProgramDesignerSessionSummary(
                    existingSession,
                    program,
                  )
                    .then((sessionSummary) =>
                      storeProgramDesignerSessionSummaryInPinecone(
                        event.userId,
                        sessionSummary,
                        existingSession,
                        program,
                      ),
                    )
                    .then((pineconeResult) => {
                      if (pineconeResult.success) {
                        logger.info(
                          "✅ Program designer session stored in Pinecone:",
                          {
                            summaryId: pineconeResult.summaryId,
                            recordId: pineconeResult.recordId,
                            namespace: pineconeResult.namespace,
                          },
                        );
                      } else {
                        logger.warn(
                          "⚠️ Failed to store session in Pinecone (non-blocking):",
                          {
                            error: pineconeResult.error,
                          },
                        );
                      }
                    })
                    .catch((error) => {
                      logger.error(
                        "⚠️ Pinecone session storage error (non-blocking):",
                        error,
                      );
                    });
                } else {
                  logger.warn(
                    "⚠️ Program not found for Pinecone session storage",
                  );
                }
              }
            } catch (error) {
              logger.error(
                "⚠️ Failed to store session in Pinecone (non-blocking):",
                error,
              );
              // Don't throw - this is optional
            }
          } else {
            logger.warn("⚠️ Session not found for update:", {
              sessionId: event.sessionId,
            });
          }
        } catch (error) {
          logger.error("⚠️ Failed to update session (non-blocking):", error);
          // Don't throw - program was saved successfully
        }
      }

      // Return same response format as original build-program
      if (result.success) {
        return createOkResponse({
          success: true,
          programId: result.programId,
          programName: result.programName,
          totalDays: result.totalDays,
          phaseCount: result.phaseCount,
          totalWorkoutTemplates: result.totalWorkoutTemplates,
          uniqueTrainingDays: result.uniqueTrainingDays,
          averageSessionsPerDay: result.averageSessionsPerDay,
          trainingFrequency: result.trainingFrequency,
          startDate: result.startDate,
          endDate: result.endDate,
          status: result.status,
          summary: result.summary,
          pineconeStored: result.pineconeStored,
          pineconeRecordId: result.pineconeRecordId,
          normalizationApplied: result.normalizationApplied,
          pruningApplied: result.pruningApplied,
          generationMethod: result.generationMethod || "agent_v2",
        });
      } else {
        // Update session status to FAILED for skipped/incomplete results
        if (event.sessionId) {
          try {
            const existingSession = await getProgramDesignerSession(
              event.userId,
              event.sessionId,
            );

            if (
              existingSession &&
              existingSession.programGeneration?.status === "IN_PROGRESS"
            ) {
              existingSession.programGeneration = {
                status: "FAILED",
                startedAt: existingSession.programGeneration.startedAt,
                failedAt: new Date(),
                error:
                  result.reason ||
                  "Program generation was skipped or incomplete",
              };
              existingSession.lastActivity = new Date();
              await saveProgramDesignerSession(existingSession);
              logger.info("✅ Session updated to FAILED status (skipped)");
            }
          } catch (error) {
            logger.error(
              "⚠️ Failed to update session to FAILED (non-blocking):",
              error,
            );
          }
        }

        return createOkResponse({
          success: false,
          skipped: true,
          reason: result.reason,
        });
      }
    } catch (error) {
      logger.error("❌ Error in program designer agent:", error);
      logger.error("Event data:", {
        userId: event.userId,
        coachId: event.coachId,
        programId: event.programId,
        sessionId: event.sessionId,
      });

      // Update session status to FAILED
      if (event.sessionId) {
        try {
          const existingSession = await getProgramDesignerSession(
            event.userId,
            event.sessionId,
          );

          if (
            existingSession &&
            existingSession.programGeneration?.status === "IN_PROGRESS"
          ) {
            existingSession.programGeneration = {
              status: "FAILED",
              startedAt: existingSession.programGeneration.startedAt,
              failedAt: new Date(),
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown generation error",
            };
            existingSession.lastActivity = new Date();
            await saveProgramDesignerSession(existingSession);
            logger.info("✅ Session updated to FAILED status (exception)");
          }
        } catch (updateError) {
          logger.error(
            "⚠️ Failed to update session to FAILED (non-blocking):",
            updateError,
          );
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown generation error";
      return createErrorResponse(500, "Failed to design training program", {
        error: errorMessage,
        userId: event.userId,
        sessionId: event.sessionId,
      });
    }
  }); // 10 second default heartbeat interval
};
