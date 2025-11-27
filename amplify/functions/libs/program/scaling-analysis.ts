/**
 * Workout Template Scaling Analysis
 *
 * Utilities for analyzing if a user scaled or modified their workout
 * compared to the prescribed template using AI.
 */

import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";

/**
 * Builds prompt for AI to analyze scaling/modifications (Haiku 4.5 - fast, cheap)
 *
 * @param prescribedDescription - The original workout description from template
 * @param actualPerformance - What the user actually did
 * @param templateMetadata - Metadata about the template (name, equipment, scoring)
 * @returns Prompt string for AI analysis
 */
export const buildScalingAnalysisPrompt = (
  prescribedDescription: string,
  actualPerformance: string,
  templateMetadata: {
    name: string;
    equipment?: string[];
    scoringType: string;
  }
): string => {
  return `You are analyzing if a user scaled or modified their workout compared to what was prescribed.

PRESCRIBED WORKOUT:
Name: ${templateMetadata.name}
Description:
${prescribedDescription}

Equipment: ${templateMetadata.equipment?.join(', ') || 'Not specified'}
Scoring Type: ${templateMetadata.scoringType}

ACTUAL PERFORMANCE:
${actualPerformance}

Analyze if the user scaled or modified the workout. Consider:
- Weight reductions/increases
- Movement substitutions (e.g., ring rows instead of pull-ups)
- Rep scheme changes
- Time cap adjustments
- Equipment changes

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

RESPONSE SCHEMA:
{
  "wasScaled": boolean,
  "modifications": ["specific modification 1", "specific modification 2"],
  "adherenceScore": 0.85,
  "analysisConfidence": 0.9,
  "reasoning": "brief explanation"
}

FIELD DEFINITIONS:
- wasScaled: true if user made any modifications, false if performed as prescribed
- modifications: Array of specific changes (e.g., "weight reduced from 135lb to 115lb")
- adherenceScore: 0-1 (1 = perfect adherence, 0.5 = significant scaling, 0 = completely different workout)
- analysisConfidence: 0-1 (your confidence in this analysis based on clarity of performance data)
- reasoning: Brief explanation of your analysis

If no scaling detected, return: {"wasScaled": false, "modifications": [], "adherenceScore": 1.0, "analysisConfidence": 0.95, "reasoning": "Performed as prescribed"}`;
};

/**
 * Default scaling analysis result when AI analysis fails
 */
export const getDefaultScalingAnalysis = () => ({
  wasScaled: false,
  modifications: [],
  adherenceScore: 1.0,
  analysisConfidence: 0.5,
});

/**
 * Validates and normalizes scaling analysis response from AI
 *
 * @param parsed - Parsed JSON response from AI
 * @returns Normalized scaling analysis object
 */
export const normalizeScalingAnalysis = (parsed: any) => {
  if (!parsed || typeof parsed !== 'object') {
    return getDefaultScalingAnalysis();
  }

  return {
    wasScaled: parsed.wasScaled || false,
    modifications: Array.isArray(parsed.modifications) ? parsed.modifications : [],
    adherenceScore: typeof parsed.adherenceScore === 'number' ? parsed.adherenceScore : 1.0,
    analysisConfidence: typeof parsed.analysisConfidence === 'number' ? parsed.analysisConfidence : 0.5,
  };
};

