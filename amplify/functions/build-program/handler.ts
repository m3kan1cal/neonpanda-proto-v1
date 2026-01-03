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

// Duration calculation constants
const DEFAULT_DURATION_FALLBACK_MS = 600000; // 10 minutes in milliseconds

// QA validation thresholds for detecting incomplete program generation
const WORKOUT_COUNT_MIN_THRESHOLD = 0.5; // Expect at least 50% of calculated training days
const DAY_COVERAGE_MIN_THRESHOLD = 0.7; // Expect at least 70% of expected day coverage
const DAY_COVERAGE_FLOOR_PERCENT = 20; // Absolute minimum day coverage percentage

export const handler = async (event: BuildProgramEvent) => {
  return withHeartbeat("Program Designer Agent", async () => {
    try {
      console.info("🏋️ Starting program designer agent (V2):", {
        userId: event.userId,
        coachId: event.coachId,
        programId: event.programId,
        sessionId: event.sessionId,
        timestamp: new Date().toISOString(),
      });

      // Pre-validation
      // Note: conversationId is optional when sessionId is provided (for program designer sessions)
      if (!event.userId || !event.coachId || !event.programId) {
        console.error("❌ Missing required fields:", {
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
        console.error("❌ No todo list provided");
        return createErrorResponse(400, "Todo list is required");
      }

      // Check for obviously incomplete program requirements
      const todoList = event.todoList;
      const hasBasicRequirements =
        todoList.trainingGoals?.value || todoList.programDuration?.value;

      if (!hasBasicRequirements) {
        console.warn("⚠️ Incomplete program requirements detected:", {
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
        console.error("❌ Invalid program duration type:", {
          providedValue: durationValidation.providedValue,
          error: durationValidation.error,
        });
        return createErrorResponse(400, durationValidation.error!, {
          invalidField: durationValidation.field,
          providedValue: durationValidation.providedValue,
        });
      }

      // Validate trainingFrequency value type
      const frequencyValidation = validateTrainingFrequencyInput(
        todoList.trainingFrequency?.value,
      );
      if (!frequencyValidation.isValid) {
        console.error("❌ Invalid training frequency:", {
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
      console.info("🤖 Starting agent workflow...");
      const result = await agent.designProgram();

      console.info("✅ Agent workflow completed:", {
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
            console.warn(
              "⚠️ Could not load session for duration calculation:",
              error,
            );
          }
        }

        const durationSeconds = Math.floor((endTime - startTimeMs) / 1000);

        console.info("📊 PROGRAM GENERATION SUMMARY:", {
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
          console.error(
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
          console.error(
            `❌ METRICS ANOMALY DETECTED: Day coverage is ${actualDayCoveragePercent.toFixed(0)}% ` +
              `(${uniqueTrainingDays}/${totalDays} days) but expected ~${expectedDayCoveragePercent.toFixed(0)}% ` +
              `for ${trainingFrequency}x/week training. This may indicate incomplete program generation.`,
          );
        }
      }

      // Update session status to COMPLETE
      if (result.success && event.sessionId) {
        try {
          console.info("Updating session status to COMPLETE...", {
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

            console.info("✅ Session updated to COMPLETE status");

            // Store program designer session summary in Pinecone (async, non-blocking)
            try {
              console.info(
                "🔍 Storing program designer session summary in Pinecone...",
              );

              // Only proceed if we have a programId
              if (!result.programId) {
                console.warn(
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
                  // Generate session summary
                  const sessionSummary =
                    generateProgramDesignerSessionSummary(existingSession);

                  // Store in Pinecone (fire-and-forget, non-blocking)
                  storeProgramDesignerSessionSummaryInPinecone(
                    event.userId,
                    sessionSummary,
                    existingSession,
                    program,
                  )
                    .then((pineconeResult) => {
                      if (pineconeResult.success) {
                        console.info(
                          "✅ Program designer session stored in Pinecone:",
                          {
                            summaryId: pineconeResult.summaryId,
                            recordId: pineconeResult.recordId,
                            namespace: pineconeResult.namespace,
                          },
                        );
                      } else {
                        console.warn(
                          "⚠️ Failed to store session in Pinecone (non-blocking):",
                          {
                            error: pineconeResult.error,
                          },
                        );
                      }
                    })
                    .catch((error) => {
                      console.error(
                        "⚠️ Pinecone session storage error (non-blocking):",
                        error,
                      );
                    });
                } else {
                  console.warn(
                    "⚠️ Program not found for Pinecone session storage",
                  );
                }
              }
            } catch (error) {
              console.error(
                "⚠️ Failed to store session in Pinecone (non-blocking):",
                error,
              );
              // Don't throw - this is optional
            }
          } else {
            console.warn("⚠️ Session not found for update:", {
              sessionId: event.sessionId,
            });
          }
        } catch (error) {
          console.error("⚠️ Failed to update session (non-blocking):", error);
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
              console.info("✅ Session updated to FAILED status (skipped)");
            }
          } catch (error) {
            console.error(
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
      console.error("❌ Error in program designer agent:", error);
      console.error("Event data:", {
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
            console.info("✅ Session updated to FAILED status (exception)");
          }
        } catch (updateError) {
          console.error(
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
