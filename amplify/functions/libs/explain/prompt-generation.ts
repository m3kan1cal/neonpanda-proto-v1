/**
 * Prompt generation utilities for the explain-term feature
 */

import type { ExplainTermType } from "./types";

/**
 * Build the system prompt for explaining fitness terms
 */
export function buildSystemPrompt(): string {
  return `You are a knowledgeable fitness coach assistant. Your role is to provide clear, helpful explanations of fitness-related terms to help users understand their workout programs better.

Guidelines:
- Be concise but thorough (2-4 paragraphs max)
- Use accessible language that beginners can understand
- Include practical tips when relevant
- Focus on safety and proper form for exercises
- Be encouraging and supportive in tone`;
}

/**
 * Build the user prompt based on term type
 */
export function buildUserPrompt(
  termType: ExplainTermType,
  term: string,
): string {
  switch (termType) {
    case "exercise":
      return `Explain the exercise "${term}". Include:
1. What this exercise is and its purpose
2. Primary muscles targeted
3. Key form cues for proper execution
4. Common mistakes to avoid

Keep the explanation practical and actionable.`;

    case "equipment":
      return `Explain the fitness equipment "${term}". Include:
1. What this equipment is
2. What it looks like (brief description)
3. What it's commonly used for
4. Any tips for using it effectively

Keep the explanation helpful for someone who may not be familiar with it.`;

    case "focus_area":
      return `Explain the training focus area "${term}". Include:
1. What this focus area means in fitness training
2. Why it's important for overall fitness
3. What types of exercises or training typically target this area
4. Any tips for improving in this area

Keep the explanation motivating and educational.`;

    default:
      return `Explain "${term}" in the context of fitness and exercise.`;
  }
}
