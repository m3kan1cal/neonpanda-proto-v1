/**
 * Training Program Summary Generation
 *
 * This module handles AI-powered summary generation for training programs
 * to provide concise, coach-friendly context for semantic search and conversations.
 */

import { callBedrockApi, TEMPERATURE_PRESETS } from "../api-helpers";
import { Program } from "./types";
import { logger } from "../logger";

/**
 * Generate an AI-powered summary of a training program for coaching context
 * Similar to workout summary generation, but focused on program-level details
 *
 * @param program - The complete training program object
 * @param conversationMessages - Original conversation messages for context
 * @returns Promise<string> - Concise summary for coach reference
 */
export const generateProgramSummary = async (
  program: Program,
  conversationMessages: any[],
  enableThinking: boolean = false,
): Promise<string> => {
  // Extract relevant conversation context (last few messages for brevity)
  const conversationContext = conversationMessages
    .slice(-5)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  // STATIC PROMPT (cacheable - instructions and examples don't change)
  const staticPrompt = `
You are a fitness coach creating a concise summary of a newly created training program for coaching context and display.

Create a 3-4 sentence summary that captures:
1. Program name and primary training goals
2. Structure overview (duration, phases, training frequency)
3. Key focus areas and progression strategy
4. Any important context from the conversation (user's needs, constraints, preferences)

Keep it concise, engaging, and useful for coaching reference. Focus on what makes this program unique for this user.

EXAMPLE GOOD SUMMARIES:
- "12-Week Strength Builder: 4x/week program targeting squat, deadlift, and bench press improvements. Structured in 3 phases: Foundation (4 weeks), Intensification (6 weeks), Peak (2 weeks). User focused on hitting a 405lb squat by competition in March."
- "8-Week CrossFit Competition Prep: 5x/week program preparing for local throwdown. Emphasis on Olympic lifting technique, high-intensity metcons, and gymnastics skills. User needs to improve muscle-ups and barbell cycling under fatigue."
- "6-Week Home Gym Hypertrophy: 3x/week bodybuilding program with dumbbells up to 50lbs and pull-up bar. Progressive overload focused on upper body development. User recovering from knee injury, lower body work limited to bodyweight."`;

  // DYNAMIC PROMPT (not cacheable - program data and conversation vary)
  const dynamicPrompt = `PROGRAM DATA:
${JSON.stringify(
  {
    name: program.name,
    description: program.description,
    totalDays: program.totalDays,
    trainingFrequency: program.trainingFrequency,
    startDate: program.startDate,
    endDate: program.endDate,
    phases: program.phases.map((p) => ({
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      focusAreas: p.focusAreas,
    })),
    trainingGoals: program.trainingGoals,
    equipmentConstraints: program.equipmentConstraints,
    totalWorkouts: program.totalWorkouts,
  },
  null,
  2,
)}

CONVERSATION CONTEXT:
${conversationContext}

Write the summary now:`;

  try {
    const response = (await callBedrockApi(
      staticPrompt,
      dynamicPrompt,
      undefined, // Use default model
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        staticPrompt,
        dynamicPrompt,
        enableThinking,
      },
    )) as string; // No tools used, always returns string

    // Clean up the response - remove any prefix like "SUMMARY:" and trim
    const cleanSummary = response.trim();

    return cleanSummary;
  } catch (error) {
    logger.error("Error generating training program summary:", error);

    // Fallback to basic summary if AI fails
    const phaseSummary =
      program.phases.length === 1
        ? `${program.phases.length} phase`
        : `${program.phases.length} phases`;

    const fallback = `${program.name}: ${program.totalDays}-day program (${program.trainingFrequency}x/week) with ${phaseSummary}. Goals: ${program.trainingGoals.slice(0, 2).join(", ")}.`;

    return fallback;
  }
};
