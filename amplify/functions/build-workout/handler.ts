import {
  createOkResponse,
  createErrorResponse,
  callBedrockApi,
  callBedrockApiMultimodal,
  MODEL_IDS,
  storeDebugDataInS3,
} from "../libs/api-helpers";
import { buildMultimodalContent } from "../libs/streaming/multimodal-helpers";
import { MESSAGE_TYPES } from "../libs/coach-conversation/types";
import { withHeartbeat } from "../libs/heartbeat";
import { saveWorkout, getProgram } from "../../dynamodb/operations";
import {
  buildWorkoutExtractionPrompt,
  calculateConfidence,
  calculateCompleteness,
  extractCompletedAtTime,
  generateWorkoutSummary,
  storeWorkoutSummaryInPinecone,
  classifyDiscipline,
  checkWorkoutComplexity,
  BuildWorkoutEvent,
  UniversalWorkoutSchema,
  DisciplineClassification,
} from "../libs/workout";
import { parseJsonWithFallbacks } from "../libs/response-utils";
import { WORKOUT_SCHEMA } from "../libs/schemas/workout-schema";
import {
  normalizeWorkout,
  shouldNormalizeWorkout,
  generateNormalizationSummary,
} from "../libs/workout/normalization";
import {
  getProgramDetailsFromS3,
  saveProgramDetailsToS3,
} from "../libs/program/s3-utils";

export const handler = async (event: BuildWorkoutEvent) => {
  return withHeartbeat('Workout Extraction', async () => {
    try {
    console.info("🏋️ Starting workout extraction:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      messageLength: event.userMessage.length,
      coachName: event.coachConfig.coach_name,
      detectionType: event.isSlashCommand
        ? "slash_command"
        : "natural_language",
      slashCommand: event.slashCommand || null,
      hasImages: !!(event.imageS3Keys && event.imageS3Keys.length > 0),
      imageCount: event.imageS3Keys?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // For slash commands, the message is already cleaned (just the workout content)
    // For natural language, the message is the full user response
    const workoutContent = event.userMessage;

    if (event.isSlashCommand) {
      console.info("🎯 Processing slash command workout:", {
        command: event.slashCommand,
        content: workoutContent,
        isExplicitLogging: true,
      });

      // Pre-validate slash command content to catch incomplete/accidental submissions
      const contentTrimmed = workoutContent.trim();
      const wordCount = contentTrimmed.split(/\s+/).length;
      const charCount = contentTrimmed.length;

      // Check for obviously incomplete submissions
      if (charCount < 10 || wordCount < 3) {
        console.warn("⚠️ Suspiciously short workout content detected:", {
          content: contentTrimmed,
          charCount,
          wordCount,
          isLikelyIncomplete: true,
        });

        // Return early with helpful error message
        return createOkResponse({
          success: false,
          skipped: true,
          reason: "Workout description too short - please provide more details about your workout (exercises, sets, reps, weights, etc.)",
          validation: {
            contentLength: charCount,
            wordCount,
            minimumRequired: "At least 10 characters and 3 words describing your workout",
          },
        });
      }

      // Check if it's just a single word or partial word (like "WARM" or "warm up" without context)
      const singleWordPattern = /^(warm|workout|exercise|training|gym|lift)\s*(up)?$/i;
      if (singleWordPattern.test(contentTrimmed)) {
        console.warn("⚠️ Single keyword detected without workout details:", {
          content: contentTrimmed,
          isKeywordOnly: true,
        });

        return createOkResponse({
          success: false,
          skipped: true,
          reason: "Please provide complete workout details - what exercises did you do? Sets, reps, weights?",
          validation: {
            detectedKeyword: contentTrimmed,
            suggestion: "Example: '3 sets of squats at 185lbs for 5 reps, then 20 minute AMRAP of burpees and pull-ups'",
          },
        });
      }
    }

    // Build extraction prompt using Universal Workout Schema
    const extractionPrompt = buildWorkoutExtractionPrompt(
      workoutContent,
      event.coachConfig,
      event.criticalTrainingDirective,
      event.userTimezone
    );

    // Store prompt for debugging
    const debugInfo = {
      extractionPrompt,
      extractionPromptLength: extractionPrompt.length,
      aiResponse: '', // Will be populated after AI call
      aiResponseLength: 0,
    };

    console.info("Generated extraction prompt:", {
      promptLength: extractionPrompt.length,
      userMessage: workoutContent,
      // Note: Prompt preview removed to avoid triggering SNS alerts on "CRITICAL" keyword
    });

    console.info("Calling Claude for workout extraction..");

    // Enable thinking for complex workouts to improve accuracy
    const isComplexWorkout = checkWorkoutComplexity(workoutContent);
    const enableThinking = isComplexWorkout;

    console.info("Extraction configuration:", {
      isComplexWorkout,
      enableThinking,
      workoutLength: workoutContent.length
    });

    // Extract workout data with AI using tool-based extraction
    let workoutData: UniversalWorkoutSchema;
    let generationMethod: "tool" | "fallback" = "tool";

    // Check if images are present (declare outside try-catch so it's available in fallback)
    const hasImages = event.imageS3Keys && event.imageS3Keys.length > 0;

    try {
      // PRIMARY: Tool-based generation with schema enforcement
      console.info("🎯 Attempting tool-based workout extraction");

      let result;

      if (hasImages) {
        console.info("🖼️ Processing workout extraction with images:", {
          imageCount: event.imageS3Keys!.length,
          imageKeys: event.imageS3Keys,
        });

        // Build multimodal message
        const currentMessage = {
          id: `msg_${Date.now()}_user`,
          role: "user" as const,
          content: workoutContent,
          timestamp: new Date(),
          messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
          imageS3Keys: event.imageS3Keys,
        };

        // Convert to Bedrock Converse format
        const converseMessages = await buildMultimodalContent([currentMessage]);

        // Call multimodal API with tools
        result = await callBedrockApiMultimodal(
          extractionPrompt,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            tools: {
              name: 'generate_workout',
              description: 'Generate structured workout data from natural language workout descriptions and images using the Universal Workout Schema v2.0',
              inputSchema: WORKOUT_SCHEMA
            },
            expectedToolName: 'generate_workout'
          }
        );
      } else {
        // Text-only extraction
        result = await callBedrockApi(
          extractionPrompt,
          workoutContent,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            tools: {
              name: 'generate_workout',
              description: 'Generate structured workout data from natural language workout descriptions using the Universal Workout Schema v2.0',
              inputSchema: WORKOUT_SCHEMA
            },
            expectedToolName: 'generate_workout'
          }
        );
      }

      // Extract workout data from tool use result (same as coach config)
      if (typeof result !== 'string') {
        workoutData = result.input as UniversalWorkoutSchema;
        console.info("✅ Tool-based extraction succeeded");

        // Set system-generated fields
        const shortId = Math.random().toString(36).substring(2, 11);
        workoutData.workout_id = `workout_${event.userId}_${Date.now()}_${shortId}`;
        workoutData.user_id = event.userId;

        // Capture AI response for debugging
        debugInfo.aiResponse = JSON.stringify(result, null, 2);
        debugInfo.aiResponseLength = debugInfo.aiResponse.length;

        // Store successful tool generation with prompts and responses for debugging
        try {
      await storeDebugDataInS3(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              userId: event.userId,
              conversationId: event.conversationId,
              coachId: event.coachId,
              workoutId: workoutData.workout_id,

              // AI Prompts and Responses
              aiGeneration: {
                extractionPrompt: debugInfo.extractionPrompt.substring(0, 1000) + '...', // First 1000 chars
                extractionPromptLength: debugInfo.extractionPromptLength,
                aiResponse: debugInfo.aiResponse.substring(0, 2000) + '...', // First 2000 chars
                aiResponseLength: debugInfo.aiResponseLength,
                method: 'tool',
                hasImages,
                enableThinking,
              },

              // Extracted workout data
              workoutData,

              // Metadata
              discipline: workoutData.discipline,
              isComplexWorkout,
            }, null, 2),
            {
              type: 'workout-extraction-tool-success',
              method: 'tool',
              userId: event.userId,
              conversationId: event.conversationId,
              coachId: event.coachId,
              discipline: workoutData.discipline,
              isComplexWorkout,
              enableThinking,
            },
            'workout-extraction'
          );
        } catch (err) {
          console.warn("⚠️ Failed to store tool success data in S3 (non-critical):", err);
        }
      } else {
        throw new Error("Tool use expected but received text response");
      }
    } catch (toolError) {
      // FALLBACK: Prompt-based generation with JSON parsing (same as coach config)
      console.warn("⚠️ Tool-based extraction failed, using fallback:", toolError);
      generationMethod = "fallback";

      console.info("🔄 Falling back to prompt-based extraction");

      let fallbackResult: string;

      if (hasImages) {
        console.info("🖼️ Fallback extraction with images");

        // Build multimodal message for fallback
        const currentMessage = {
          id: `msg_${Date.now()}_user_fallback`,
          role: "user" as const,
          content: workoutContent,
          timestamp: new Date(),
          messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
          imageS3Keys: event.imageS3Keys,
        };

        const converseMessages = await buildMultimodalContent([currentMessage]);

        fallbackResult = await callBedrockApiMultimodal(
          extractionPrompt,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            staticPrompt: extractionPrompt, // Cache the large static prompt
            dynamicPrompt: "", // No dynamic content
          }
        ) as string;
      } else {
        // Text-only fallback
        fallbackResult = await callBedrockApi(
          extractionPrompt,
          workoutContent,
          MODEL_IDS.CLAUDE_SONNET_4_FULL,
          {
            enableThinking,
            staticPrompt: extractionPrompt, // Cache the large static prompt
            dynamicPrompt: "", // No dynamic content
          }
        ) as string;
      }

      console.info("✅ Fallback extraction completed");

      // Parse JSON with fallbacks (same as coach config)
      workoutData = parseJsonWithFallbacks(fallbackResult);

      // Set system-generated fields for fallback
      const shortId = Math.random().toString(36).substring(2, 11);
      workoutData.workout_id = `workout_${event.userId}_${Date.now()}_${shortId}`;
      workoutData.user_id = event.userId;

      // Capture fallback response for debugging
      debugInfo.aiResponse = fallbackResult;
      debugInfo.aiResponseLength = fallbackResult.length;

      // Store fallback response with prompts and error for debugging
      try {
        await storeDebugDataInS3(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            userId: event.userId,
            conversationId: event.conversationId,
            coachId: event.coachId,
            workoutId: workoutData.workout_id,

            // AI Prompts and Responses
            aiGeneration: {
              extractionPrompt: debugInfo.extractionPrompt.substring(0, 1000) + '...', // First 1000 chars
              extractionPromptLength: debugInfo.extractionPromptLength,
              fallbackResponse: fallbackResult.substring(0, 2000) + '...', // First 2000 chars
              fallbackResponseLength: fallbackResult.length,
              method: 'fallback',
              hasImages,
              enableThinking,
            },

            // Error info
            toolError: toolError instanceof Error ? toolError.message : String(toolError),
            toolStack: toolError instanceof Error ? toolError.stack : undefined,

            // Extracted workout data
            workoutData,
          }, null, 2),
          {
            type: 'workout-extraction-fallback',
            reason: 'tool_extraction_failed',
          userId: event.userId,
            conversationId: event.conversationId,
          coachId: event.coachId,
            errorMessage: toolError instanceof Error ? toolError.message : String(toolError),
            isComplexWorkout,
            enableThinking,
        },
          'workout-extraction'
      );
        console.info("✅ Stored fallback debug data in S3");
      } catch (err) {
        console.warn("⚠️ Failed to store fallback data in S3 (non-critical):", err);
    }
    }

    // Add generation method to metadata
    if (!workoutData.metadata) {
      workoutData.metadata = {} as any;
    }
    workoutData.metadata.generation_method = generationMethod;
    workoutData.metadata.generation_timestamp = new Date().toISOString();

    console.info("Extraction completed:", {
      method: generationMethod,
      workoutId: workoutData.workout_id,
      discipline: workoutData.discipline,
      workoutName: workoutData.workout_name,
    });

    // For slash commands, add metadata about explicit logging
    if (event.isSlashCommand) {
      workoutData.metadata.logged_via = "slash_command";
      workoutData.metadata.extraction_notes =
        (workoutData.metadata.extraction_notes
          ? workoutData.metadata.extraction_notes + " "
          : "") +
        `User explicitly logged workout using /${event.slashCommand} command.`;
    }

    console.info("Parsed workout data structure:", {
      basicInfo: {
        workoutId: workoutData.workout_id,
        discipline: workoutData.discipline,
        workoutName: workoutData.workout_name,
        workoutType: workoutData.workout_type,
        duration: workoutData.duration,
        location: workoutData.location,
      },
      performanceMetrics: workoutData.performance_metrics
        ? "Present"
        : "Missing",
      disciplineSpecific: workoutData.discipline_specific
        ? Object.keys(workoutData.discipline_specific)
        : "Missing",
      crossfitData: workoutData.discipline_specific?.crossfit
        ? {
            workoutFormat:
              workoutData.discipline_specific.crossfit.workout_format,
            rxStatus: workoutData.discipline_specific.crossfit.rx_status,
            roundsCount:
              workoutData.discipline_specific.crossfit.rounds?.length || 0,
            performanceData: workoutData.discipline_specific.crossfit
              .performance_data
              ? "Present"
              : "Missing",
          }
        : "Missing",
      metadataCompleteness: workoutData.metadata?.data_completeness,
      validationFlags: workoutData.metadata?.validation_flags?.length || 0,
    });

    // Calculate confidence and completeness scores and update metadata
    const confidence = calculateConfidence(workoutData);
    workoutData.metadata.data_confidence = confidence;

    const completeness = calculateCompleteness(workoutData);
    workoutData.metadata.data_completeness = completeness;

    // NORMALIZATION STEP - Normalize workout data for schema compliance
    let finalWorkoutData = workoutData;
    let normalizationSummary = "Normalization skipped";

    if (shouldNormalizeWorkout(workoutData, confidence)) {
      console.info("🔧 Running normalization on workout data..", {
        reason: confidence < 0.7 ? "low_confidence" : "structural_check",
        confidence,
        hasCoachNotes: !!workoutData.coach_notes,
        hasDisciplineSpecific: !!workoutData.discipline_specific,
      });

      const normalizationResult = await normalizeWorkout(
        workoutData,
        event.userId,
        enableThinking // Use same thinking setting as extraction
      );
      normalizationSummary = generateNormalizationSummary(normalizationResult);

      console.info("Normalization completed:", {
        isValid: normalizationResult.isValid,
        issuesFound: normalizationResult.issues.length,
        correctionsMade: normalizationResult.issues.filter((i) => i.corrected)
          .length,
        normalizationConfidence: normalizationResult.confidence,
        summary: normalizationSummary,
      });

      // Use normalized data if normalization was successful
      if (
        normalizationResult.isValid ||
        normalizationResult.issues.some((i) => i.corrected)
      ) {
        finalWorkoutData = normalizationResult.normalizedData;

        // Update confidence if normalization improved the data
        if (normalizationResult.confidence > confidence) {
          finalWorkoutData.metadata.data_confidence = Math.min(
            confidence + 0.1, // Modest confidence boost for normalization
            normalizationResult.confidence
          );
        }
      }

      // Add normalization flags to metadata
      normalizationResult.issues.forEach((issue) => {
        if (
          !finalWorkoutData.metadata.validation_flags?.includes(issue.field)
        ) {
          finalWorkoutData.metadata.validation_flags?.push(issue.field);
        }
      });
    } else {
      console.info("⏩ Skipping normalization:", {
        reason: confidence > 0.9 ? "high_confidence" : "no_structural_issues",
        confidence,
      });
    }

    // Check for blocking validation flags that indicate this isn't a real workout log
    // More intelligent blocking logic based on context and discipline

    // Use AI to classify the discipline characteristics
    let isQualitativeDiscipline = false;
    let disciplineClassification: DisciplineClassification;

    try {
      disciplineClassification = await classifyDiscipline(
        finalWorkoutData.discipline,
        finalWorkoutData
      );
      isQualitativeDiscipline = disciplineClassification.isQualitative;
    } catch (error) {
      console.warn(
        "Failed to classify discipline, defaulting to quantitative:",
        error
      );
      // Default to quantitative (more restrictive) if classification fails
      isQualitativeDiscipline = false;
      disciplineClassification = {
        isQualitative: false,
        requiresPreciseMetrics: true,
        environment: "mixed",
        primaryFocus: "mixed",
        confidence: 0,
        reasoning: "Classification failed, defaulted to quantitative",
      };
    }

    // For slash commands, we're very lenient since user explicitly requested logging
    // For qualitative disciplines, we're more forgiving about missing precise metrics
    let blockingFlags: string[];

    if (event.isSlashCommand) {
      // For slash commands, only block if there's truly no workout information at all
      // Don't block on 'no_performance_data' since user explicitly wants to log something
      blockingFlags = [];
    } else if (isQualitativeDiscipline) {
      // For endurance/qualitative sports, be less strict about performance data
      // These often focus on time, effort, technique rather than precise metrics
      blockingFlags = ["planning_inquiry", "advice_seeking", "future_planning"];
    } else {
      // For strength/power sports, maintain stricter requirements
      blockingFlags = [
        "planning_inquiry",
        "no_performance_data",
        "advice_seeking",
        "future_planning",
      ];
    }

    const hasBlockingFlag = finalWorkoutData.metadata.validation_flags?.some(
      (flag) => blockingFlags.includes(flag)
    );

    if (hasBlockingFlag) {
      const detectedFlags = finalWorkoutData.metadata.validation_flags?.filter(
        (flag) => blockingFlags.includes(flag)
      );

      console.info(
        "🚫 Skipping workout save - blocking validation flags detected:",
        {
          workoutId: finalWorkoutData.workout_id,
          blockingFlags: detectedFlags,
          confidence,
          dataCompleteness: finalWorkoutData.metadata.data_completeness,
          extractionNotes: finalWorkoutData.metadata.extraction_notes,
          isSlashCommand: event.isSlashCommand,
          slashCommand: event.slashCommand,
          discipline: finalWorkoutData.discipline,
          disciplineClassification,
          appliedBlockingFlags: blockingFlags,
          normalizationSummary,
        }
      );

      let reason: string;
      if (event.isSlashCommand) {
        reason =
          "Unable to extract any workout information from slash command content";
      } else if (
        detectedFlags?.includes("no_performance_data") &&
        !isQualitativeDiscipline
      ) {
        reason = "No performance data found for strength/power workout";
      } else {
        reason = "Not a workout log - appears to be planning/advice seeking";
      }

      return createOkResponse({
        success: false,
        skipped: true,
        reason,
        blockingFlags: detectedFlags,
        confidence,
        workoutId: finalWorkoutData.workout_id,
        normalizationSummary,
      });
    }

    // Determine completed time using AI extraction with user's timezone
    const userTimezone = event.userTimezone || 'America/Los_Angeles'; // Default to Pacific Time
    const extractedTime = await extractCompletedAtTime(workoutContent, event.messageTimestamp, userTimezone);
    const completedAt = event.completedAt
      ? new Date(event.completedAt)
      : extractedTime || new Date();

    // Validate workout date field to prevent wrong year errors
    if (finalWorkoutData.date) {
      const workoutDate = new Date(finalWorkoutData.date);
      const currentYear = new Date().getFullYear();
      const workoutYear = workoutDate.getFullYear();
      const completedAtYear = completedAt.getFullYear();

      // Check if workout date is in wrong year (more than 1 year old or in future, or doesn't match completedAt year)
      if (workoutYear < currentYear - 1 || workoutYear > currentYear + 1 ||
          Math.abs(workoutYear - completedAtYear) > 1) {
        console.warn("⚠️ Detected workout date in wrong year - correcting:", {
          originalDate: finalWorkoutData.date,
          workoutYear,
          completedAtYear,
          currentYear,
        });

        // Correct the date to match completedAt's date
        const correctedDate = completedAt.toISOString().split('T')[0];
        finalWorkoutData.date = correctedDate;

        // Add to validation flags
        if (!finalWorkoutData.metadata.validation_flags?.includes('date')) {
          finalWorkoutData.metadata.validation_flags?.push('date');
        }

        console.info("✅ Corrected workout date to:", correctedDate);
      }
    }

    console.info("Workout timing analysis:", {
      userMessage: workoutContent.substring(0, 100),
      userTimezone,
      extractedTime: extractedTime ? extractedTime.toISOString() : null,
      finalCompletedAt: completedAt.toISOString(),
      workoutDate: finalWorkoutData.date,
      currentTime: new Date().toISOString(),
      isToday: completedAt.toDateString() === new Date().toDateString(),
      daysDifference: Math.floor(
        (new Date().getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    });

    // Generate AI summary for coach context and UI display
    console.info("Generating workout summary..");
    const summary = await generateWorkoutSummary(
      finalWorkoutData,
      event.userMessage
    );
    console.info("Generated summary:", { summary, length: summary.length });

    // Create workout session
    const workout = {
      workoutId: finalWorkoutData.workout_id,
      userId: event.userId,
      coachIds: [event.coachId],
      coachNames: [event.coachConfig.coach_name],
      conversationId: event.conversationId,
      completedAt,
      workoutData: finalWorkoutData,
      summary, // NEW: AI-generated summary
      // Add template relationship if from training program
      ...(event.templateContext && {
        templateId: event.templateContext.templateId,
        groupId: event.templateContext.groupId,
      }),
      extractionMetadata: {
        confidence: finalWorkoutData.metadata.data_confidence, // Use final confidence after normalization
        extractedAt: new Date(),
        reviewedBy: "system",
        reviewedAt: new Date(),
        normalizationSummary, // Include normalization summary in metadata
        // Add template comparison if from training program
        ...(event.templateContext?.scalingAnalysis && {
          templateComparison: event.templateContext.scalingAnalysis,
        }),
      },
    };

    console.info("Saving workout to DynamoDB..", {
      workoutId: workout.workoutId,
      discipline: finalWorkoutData.discipline,
      workoutName: finalWorkoutData.workout_name,
      confidence: finalWorkoutData.metadata.data_confidence,
      completeness: finalWorkoutData.metadata.data_completeness || 0,
      detectionType: event.isSlashCommand
        ? "slash_command"
        : "natural_language",
      slashCommand: event.slashCommand || null,
      normalizationSummary,
    });

    // Log the complete workout data structure being saved (with truncation for readability)
    console.info("Complete workout data being saved:", {
      workout: {
        workoutId: workout.workoutId,
        userId: workout.userId,
        conversationId: workout.conversationId,
        completedAt: workout.completedAt,
        extractionMetadata: workout.extractionMetadata,
      },
      workoutData: {
        ...finalWorkoutData,
        // Show discipline-specific data in readable format
        discipline_specific_summary: finalWorkoutData.discipline_specific
          ? {
              disciplines: Object.keys(finalWorkoutData.discipline_specific),
              crossfit_details: finalWorkoutData.discipline_specific.crossfit
                ? JSON.stringify(
                    finalWorkoutData.discipline_specific.crossfit
                  ).substring(0, 500) + "..."
                : null,
            }
          : null,
      },
    });

    // Save to DynamoDB
    await saveWorkout(workout);

    // Store workout summary in Pinecone for semantic search and coach context
    console.info("📝 Storing workout summary in Pinecone..");
    const pineconeResult = await storeWorkoutSummaryInPinecone(
      event.userId,
      summary,
      finalWorkoutData,
      workout
    );

    // If this workout is from a template, update the template's linkedWorkoutId
    if (event.templateContext) {
      console.info("🔗 Updating template linkedWorkoutId in S3..");
      try {
        const programData = await getProgram(
          event.userId,
          event.coachId,
          event.templateContext.programId
        );

        if (programData?.s3DetailKey) {
          const programDetails = await getProgramDetailsFromS3(programData.s3DetailKey);

          if (programDetails) {
            const templateIndex = programDetails.workoutTemplates.findIndex(
              (t: any) => t.templateId === event.templateContext?.templateId
            );

            if (templateIndex !== -1) {
              programDetails.workoutTemplates[templateIndex].linkedWorkoutId = workout.workoutId;
              await saveProgramDetailsToS3(programData.s3DetailKey, programDetails);
              console.info("✅ Template linkedWorkoutId updated:", {
                templateId: event.templateContext.templateId,
                workoutId: workout.workoutId,
              });
            }
          }
        }
      } catch (error) {
        console.error("⚠️ Failed to update template linkedWorkoutId (non-critical):", error);
        // Continue - this is not critical for workout logging
      }
    }

    console.info("✅ Workout extraction completed successfully:", {
      workoutId: workout.workoutId,
      discipline: finalWorkoutData.discipline,
      workoutName: finalWorkoutData.workout_name || "Custom Workout",
      confidence: finalWorkoutData.metadata.data_confidence,
      validationFlags: finalWorkoutData.metadata.validation_flags || [],
      normalizationSummary,
      pineconeStored: pineconeResult.success,
      pineconeRecordId:
        pineconeResult.success && "recordId" in pineconeResult
          ? pineconeResult.recordId
          : null,
      templateLinked: !!event.templateContext,
    });

    return createOkResponse({
      success: true,
      workoutId: workout.workoutId,
      discipline: finalWorkoutData.discipline,
      workoutName: finalWorkoutData.workout_name,
      confidence: finalWorkoutData.metadata.data_confidence,
      extractionMetadata: workout.extractionMetadata,
      normalizationSummary,
    });
    } catch (error) {
      console.error("❌ Error extracting workout session:", error);
      console.error("Event data:", {
        userId: event.userId,
        coachId: event.coachId,
        conversationId: event.conversationId,
        messagePreview: event.userMessage.substring(0, 100),
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown extraction error";
      return createErrorResponse(500, "Failed to extract workout session", {
        error: errorMessage,
        userId: event.userId,
        conversationId: event.conversationId,
      });
    }
  }); // 10 second default heartbeat interval
};
