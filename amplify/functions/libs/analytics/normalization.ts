/**
 * Analytics Normalization Library
 *
 * This module provides intelligent normalization of weekly analytics data
 * to ensure consistent Universal Analytics Schema compliance.
 */

import {
  UserWeeklyData,
  UserMonthlyData,
  NormalizationResult,
  NormalizationIssue,
} from "./types";
import { callBedrockApi, TEMPERATURE_PRESETS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { getAnalyticsSchemaWithContext } from "../schemas/universal-analytics-schema";
import { logger } from "../logger";

/**
 * Builds AI normalization prompt that instructs the model to normalize
 * analytics data against the Universal Analytics Schema v1.0
 */
export const buildNormalizationPrompt = (
  analyticsData: any,
  weeklyData: UserWeeklyData | UserMonthlyData,
): string => {
  // Handle both weekRange and monthRange
  const rangeStart =
    "weekRange" in weeklyData
      ? weeklyData.weekRange.weekStart
      : weeklyData.monthRange.monthStart;
  const rangeEnd =
    "weekRange" in weeklyData
      ? weeklyData.weekRange.weekEnd
      : weeklyData.monthRange.monthEnd;
  const periodType = "weekRange" in weeklyData ? "Week" : "Month";

  const rangeStartStr = rangeStart.toISOString().split("T")[0];
  const rangeEndStr = rangeEnd.toISOString().split("T")[0];

  return `
You are an analytics data normalizer. Your job is to:

1. ANALYZE the analytics data against the Universal Analytics Schema v1.0
2. NORMALIZE the structure to match the schema exactly
3. FIX any structural, mathematical, or data consistency issues found
4. RETURN properly formatted analytics data that conforms to the schema

${periodType.toUpperCase()} BOUNDARY ENFORCEMENT:
- ${periodType} range: ${rangeStartStr} to ${rangeEndStr}
- ALL dates in raw_aggregations.daily_volume MUST be within this range
- Remove or fix any dates outside this boundary
- Ensure metadata.date_range matches the ${periodType.toLowerCase()} boundary exactly

RESPONSE REQUIREMENTS:
Return a JSON object with this exact structure:

{
  "isValid": boolean,
  "normalizedData": {
    "structured_analytics": { ... complete normalized analytics ... },
    "human_summary": "string"
  },
  "issues": [
    {
      "type": "structural|data_consistency|quality_threshold|cross_validation",
      "severity": "error|warning",
      "section": "string",
      "field": "string",
      "description": "string",
      "corrected": boolean
    }
  ],
  "confidence": number,
  "summary": "string"
}

ANALYTICS DATA TO NORMALIZE:
${JSON.stringify(analyticsData, null, 2)}

WEEKLY DATA CONTEXT:
- User ID: ${weeklyData.userId}
- ${periodType} Range: ${rangeStartStr} to ${rangeEndStr}
- Workouts Count: ${weeklyData.workouts.count}
- Conversations Count: ${weeklyData.coaching.count}

${getAnalyticsSchemaWithContext("normalization")}

CRITICAL: Return ONLY valid JSON in the exact format above. No markdown, no explanations, no text outside the JSON object. Start with { and end with }.`;
};

/**
 * Main normalization function that calls AI to normalize analytics data
 */
export const normalizeAnalytics = async (
  analyticsData: any,
  weeklyData: UserWeeklyData | UserMonthlyData,
  userId: string,
  enableThinking: boolean = false,
): Promise<NormalizationResult> => {
  try {
    const normalizationPrompt = buildNormalizationPrompt(
      analyticsData,
      weeklyData,
    );

    // Handle both weekRange and monthRange
    const rangeStart =
      "weekRange" in weeklyData
        ? weeklyData.weekRange.weekStart
        : weeklyData.monthRange.monthStart;
    const rangeEnd =
      "weekRange" in weeklyData
        ? weeklyData.weekRange.weekEnd
        : weeklyData.monthRange.monthEnd;

    logger.info("Analytics normalization call configuration:", {
      enableThinking,
      promptLength: normalizationPrompt.length,
      userId,
      range: `${rangeStart.toISOString().split("T")[0]} to ${rangeEnd.toISOString().split("T")[0]}`,
    });

    const normalizationResponse = (await callBedrockApi(
      normalizationPrompt,
      "analytics_normalization",
      undefined, // Use default model
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        enableThinking,
      },
    )) as string; // No tools used, always returns string

    // Parse JSON with cleaning and fixing (handles markdown-wrapped JSON and common issues)
    const normalizationResult = parseJsonWithFallbacks(normalizationResponse);

    // Validate the response structure
    if (!normalizationResult || typeof normalizationResult !== "object") {
      throw new Error("Response is not a valid object");
    }

    if (
      !normalizationResult.hasOwnProperty("isValid") ||
      !normalizationResult.hasOwnProperty("normalizedData")
    ) {
      throw new Error(
        "Response missing required fields (isValid, normalizedData)",
      );
    }

    // Add normalized flag to metadata if it exists
    if (normalizationResult.normalizedData?.structured_analytics?.metadata) {
      normalizationResult.normalizedData.structured_analytics.metadata.normalization_applied = true;
      normalizationResult.normalizedData.structured_analytics.metadata.normalization_timestamp =
        new Date().toISOString();
    }

    return {
      isValid: normalizationResult.isValid || false,
      normalizedData: normalizationResult.normalizedData || analyticsData,
      issues: normalizationResult.issues || [],
      confidence: normalizationResult.confidence || 0.8,
      summary:
        normalizationResult.summary || "Analytics normalization completed",
      normalizationMethod: "ai",
    };
  } catch (error) {
    logger.error("Analytics normalization failed:", error);
    return {
      isValid: false,
      normalizedData: analyticsData,
      issues: [
        {
          type: "structural",
          severity: "error",
          section: "system",
          field: "normalization_process",
          description: `Normalization error: ${error instanceof Error ? error.message : "Unknown error"}`,
          corrected: false,
        },
      ],
      confidence: 0.3,
      summary: "Analytics normalization failed due to system error",
      normalizationMethod: "ai",
    };
  }
};

/**
 * Determines if analytics need normalization based on validation issues and data quality
 */
export const shouldNormalizeAnalytics = (
  analyticsData: any,
  weeklyData: UserWeeklyData | UserMonthlyData,
): boolean => {
  const issues: NormalizationIssue[] = [];

  // 1. Check top-level structure
  if (!analyticsData.structured_analytics) {
    issues.push({
      type: "structural",
      severity: "error",
      section: "root",
      field: "structured_analytics",
      description: "Missing structured_analytics field",
      corrected: false,
    });
  }
  if (!analyticsData.human_summary) {
    issues.push({
      type: "structural",
      severity: "error",
      section: "root",
      field: "human_summary",
      description: "Missing human_summary field",
      corrected: false,
    });
  }

  // 2. Check required structured_analytics sections
  const requiredSections = [
    "metadata",
    "volume_breakdown",
    "weekly_progression",
    "performance_markers",
    "training_intelligence",
    "movement_analysis",
    "fatigue_management",
    "coaching_synthesis",
    "actionable_insights",
    "raw_aggregations",
    "data_quality_report",
  ];

  if (analyticsData.structured_analytics) {
    for (const section of requiredSections) {
      if (!analyticsData.structured_analytics[section]) {
        issues.push({
          type: "structural",
          severity: "error",
          section: "structured_analytics",
          field: section,
          description: `Missing required section: ${section}`,
          corrected: false,
        });
      }
    }

    // 3. Validate date consistency in raw_aggregations
    if (analyticsData.structured_analytics.raw_aggregations?.daily_volume) {
      // Handle both weekRange and monthRange
      const rangeStart =
        "weekRange" in weeklyData
          ? weeklyData.weekRange.weekStart
          : weeklyData.monthRange.monthStart;
      const rangeEnd =
        "weekRange" in weeklyData
          ? weeklyData.weekRange.weekEnd
          : weeklyData.monthRange.monthEnd;

      analyticsData.structured_analytics.raw_aggregations.daily_volume.forEach(
        (entry: any, index: number) => {
          if (entry.date) {
            const entryDate = new Date(entry.date);
            if (entryDate < rangeStart || entryDate > rangeEnd) {
              issues.push({
                type: "data_consistency",
                severity: "error",
                section: "raw_aggregations",
                field: `daily_volume[${index}].date`,
                description: `Date ${entry.date} is outside range ${rangeStart.toISOString().split("T")[0]} to ${rangeEnd.toISOString().split("T")[0]}`,
                corrected: false,
              });
            }
          }
        },
      );
    }

    // 4. Validate metadata fields
    if (analyticsData.structured_analytics.metadata) {
      const meta = analyticsData.structured_analytics.metadata;
      if (!meta.week_id) {
        issues.push({
          type: "structural",
          severity: "error",
          section: "metadata",
          field: "week_id",
          description: "Missing metadata.week_id",
          corrected: false,
        });
      }
      if (!meta.date_range || !meta.date_range.start || !meta.date_range.end) {
        issues.push({
          type: "structural",
          severity: "error",
          section: "metadata",
          field: "date_range",
          description: "Missing or incomplete metadata.date_range",
          corrected: false,
        });
      }
      if (typeof meta.sessions_completed !== "number") {
        issues.push({
          type: "data_consistency",
          severity: "error",
          section: "metadata",
          field: "sessions_completed",
          description: "metadata.sessions_completed should be a number",
          corrected: false,
        });
      }
      if (typeof meta.sessions_planned !== "number") {
        issues.push({
          type: "data_consistency",
          severity: "error",
          section: "metadata",
          field: "sessions_planned",
          description: "metadata.sessions_planned should be a number",
          corrected: false,
        });
      }
    }

    // 5. Validate volume_breakdown structure and mathematical consistency
    if (analyticsData.structured_analytics.volume_breakdown) {
      const vb = analyticsData.structured_analytics.volume_breakdown;
      if (!vb.working_sets) {
        issues.push({
          type: "structural",
          severity: "error",
          section: "volume_breakdown",
          field: "working_sets",
          description: "Missing volume_breakdown.working_sets",
          corrected: false,
        });
      }
      if (typeof vb.warm_up_volume !== "number") {
        issues.push({
          type: "data_consistency",
          severity: "warning",
          section: "volume_breakdown",
          field: "warm_up_volume",
          description: "volume_breakdown.warm_up_volume should be a number",
          corrected: false,
        });
      }
      if (!Array.isArray(vb.by_movement_detail)) {
        issues.push({
          type: "structural",
          severity: "error",
          section: "volume_breakdown",
          field: "by_movement_detail",
          description: "volume_breakdown.by_movement_detail should be an array",
          corrected: false,
        });
      }

      // Mathematical consistency checks
      if (
        vb.working_sets &&
        vb.by_movement_detail &&
        Array.isArray(vb.by_movement_detail)
      ) {
        const calculatedTonnage = vb.by_movement_detail.reduce(
          (sum: number, movement: any) => sum + (movement.tonnage || 0),
          0,
        );
        const calculatedReps = vb.by_movement_detail.reduce(
          (sum: number, movement: any) => sum + (movement.reps || 0),
          0,
        );
        const calculatedSets = vb.by_movement_detail.reduce(
          (sum: number, movement: any) => sum + (movement.sets || 0),
          0,
        );

        const tonnageDiff = Math.abs(
          calculatedTonnage - (vb.working_sets.total_tonnage || 0),
        );
        const repsDiff = Math.abs(
          calculatedReps - (vb.working_sets.total_reps || 0),
        );
        const setsDiff = Math.abs(
          calculatedSets - (vb.working_sets.total_sets || 0),
        );

        if (tonnageDiff > calculatedTonnage * 0.1) {
          // Allow 10% tolerance
          issues.push({
            type: "cross_validation",
            severity: "error",
            section: "volume_breakdown",
            field: "total_tonnage_consistency",
            description: `Total tonnage (${vb.working_sets.total_tonnage}) doesn't match sum of movements (${calculatedTonnage})`,
            corrected: false,
          });
        }

        if (repsDiff > 10) {
          // Allow small tolerance for reps
          issues.push({
            type: "cross_validation",
            severity: "error",
            section: "volume_breakdown",
            field: "total_reps_consistency",
            description: `Total reps (${vb.working_sets.total_reps}) doesn't match sum of movements (${calculatedReps})`,
            corrected: false,
          });
        }

        if (setsDiff > 5) {
          // Allow small tolerance for sets
          issues.push({
            type: "cross_validation",
            severity: "warning",
            section: "volume_breakdown",
            field: "total_sets_consistency",
            description: `Total sets (${vb.working_sets.total_sets}) doesn't match sum of movements (${calculatedSets})`,
            corrected: false,
          });
        }
      }
    }

    // 6. Validate actionable_insights structure
    if (analyticsData.structured_analytics.actionable_insights) {
      const ai = analyticsData.structured_analytics.actionable_insights;
      if (!ai.top_priority || typeof ai.top_priority !== "object") {
        issues.push({
          type: "structural",
          severity: "error",
          section: "actionable_insights",
          field: "top_priority",
          description:
            "Missing or invalid actionable_insights.top_priority object",
          corrected: false,
        });
      } else {
        const requiredTopPriorityFields = [
          "insight",
          "data_support",
          "recommended_action",
          "expected_outcome",
        ];
        for (const field of requiredTopPriorityFields) {
          if (!ai.top_priority[field]) {
            issues.push({
              type: "structural",
              severity: "error",
              section: "actionable_insights",
              field: `top_priority.${field}`,
              description: `Missing required field: top_priority.${field}`,
              corrected: false,
            });
          }
        }
      }
    }
  }

  // 7. Validate human_summary quality
  if (analyticsData.human_summary) {
    if (typeof analyticsData.human_summary !== "string") {
      issues.push({
        type: "data_consistency",
        severity: "error",
        section: "root",
        field: "human_summary",
        description: "human_summary should be a string",
        corrected: false,
      });
    } else if (analyticsData.human_summary.length < 100) {
      issues.push({
        type: "quality_threshold",
        severity: "warning",
        section: "root",
        field: "human_summary",
        description: "human_summary appears too short (< 100 characters)",
        corrected: false,
      });
    } else if (
      !analyticsData.human_summary.includes("Weekly Training Summary")
    ) {
      issues.push({
        type: "quality_threshold",
        severity: "warning",
        section: "root",
        field: "human_summary",
        description:
          "human_summary should start with 'Weekly Training Summary'",
        corrected: false,
      });
    }
  }

  // Decision logic based on issues found
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const criticalIssues = issues.filter(
    (issue) =>
      issue.type === "structural" ||
      issue.type === "data_consistency" ||
      issue.type === "cross_validation",
  );

  logger.info("🔍 Normalization decision analysis:", {
    totalIssues: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    criticalIssues: criticalIssues.length,
    userId: weeklyData.userId,
  });

  // Always normalize if there are any errors
  if (errors.length > 0) {
    logger.info("🔧 Normalization required: errors detected", {
      errorCount: errors.length,
      errorFields: errors.map((e) => e.field),
    });
    return true;
  }

  // Normalize if there are many warnings (quality threshold)
  if (warnings.length >= 3) {
    logger.info("🔧 Normalization required: multiple warnings", {
      warningCount: warnings.length,
      warningFields: warnings.map((w) => w.field),
    });
    return true;
  }

  // Normalize if there are critical structural or data consistency issues
  if (criticalIssues.length > 0) {
    logger.info("🔧 Normalization required: critical issues detected", {
      criticalCount: criticalIssues.length,
      criticalTypes: criticalIssues.map((i) => i.type),
    });
    return true;
  }

  logger.info("✅ Skipping normalization: no critical issues detected");
  return false;
};

/**
 * Generates a human-readable summary of normalization results for logging
 */
export const generateNormalizationSummary = (
  result: NormalizationResult,
): string => {
  const { isValid, issues, confidence, normalizationMethod } = result;

  let summary = `Analytics normalization ${isValid ? "PASSED" : "FAILED"} (confidence: ${confidence.toFixed(2)})`;

  if (issues.length > 0) {
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const corrections = issues.filter((i) => i.corrected);

    if (errors.length > 0) {
      summary += `\nErrors (${errors.length}): ${errors.map((e) => e.field).join(", ")}`;
    }

    if (warnings.length > 0) {
      summary += `\nWarnings (${warnings.length}): ${warnings.map((w) => w.field).join(", ")}`;
    }

    if (corrections.length > 0) {
      summary += `\nNormalized (${corrections.length}): ${corrections.map((c) => c.field).join(", ")}`;
    }
  }

  return summary;
};
