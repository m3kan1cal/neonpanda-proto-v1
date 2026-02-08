/**
 * Greeting Prompt Generation for the Coach Config Domain
 *
 * Builds system and user prompts for generating personalized
 * contextual greetings on the Training Grounds dashboard.
 * The greeting is generated from the coach's perspective using
 * their personality profile from the coach config.
 *
 * Uses the same lightweight personality extraction pattern as
 * contextual-updates.ts (coach_name, coaching_style, catchphrases, etc.)
 * rather than the full CoachPersonalityContext from personality-utils.ts,
 * since the greeting only needs surface-level personality fields.
 */

import type { GenerateGreetingRequest } from "../greeting/types";

/**
 * Coach config fields relevant to greeting generation.
 * Using `any` for the full config object to avoid coupling to
 * the DynamoDB entity type -- we just extract what we need.
 */
interface CoachPersonality {
  coachName: string;
  coachingStyle: string;
  communicationStyle: string;
  motivationalApproach: string;
  personalityTraits: string[];
  specialties: string[];
  expertise: string[];
  background: string;
  catchphrases: string[];
}

/**
 * Extract coach personality fields from a raw coach config object
 */
export function extractCoachPersonality(coachConfig: any): CoachPersonality {
  return {
    coachName: coachConfig.coach_name || "Coach",
    coachingStyle: coachConfig.coaching_style || "supportive",
    communicationStyle: coachConfig.communication_style || "friendly",
    motivationalApproach: coachConfig.motivational_approach || "encouraging",
    personalityTraits: coachConfig.personality_traits || [],
    specialties: coachConfig.specialties || [],
    expertise: coachConfig.expertise || [],
    background: coachConfig.background || "",
    catchphrases: coachConfig.catchphrases || [],
  };
}

/**
 * Build the system prompt for generating contextual greetings
 * from the coach's perspective
 */
export function buildGreetingSystemPrompt(coach: CoachPersonality): string {
  return `You are ${coach.coachName}, a fitness coach greeting your athlete on their training dashboard.

COACHING PROFILE:
- Name: ${coach.coachName}
- Coaching Style: ${coach.coachingStyle}
- Communication Style: ${coach.communicationStyle}
- Motivational Approach: ${coach.motivationalApproach}
- Personality Traits: ${coach.personalityTraits.join(", ") || "supportive"}
- Specialties: ${coach.specialties.join(", ") || "general fitness"}
- Expertise Areas: ${coach.expertise.join(", ") || "general fitness"}
${coach.background ? `- Background: ${coach.background}` : ""}
${coach.catchphrases.length > 0 ? `- Your Catchphrases: ${coach.catchphrases.join(", ")}` : ""}

Guidelines:
- Write exactly 1-2 sentences, no more
- Speak as yourself (${coach.coachName}) -- this is YOUR greeting to your athlete
- Be natural and in-character with your coaching style and personality
- Reference the user's context naturally (time of day, workout schedule, progress)
- Vary your phrasing -- never use the same opening twice
- Occasionally weave in one of your catchphrases if it fits naturally
- Do NOT use emojis
- Do NOT address the user by name (their name is displayed separately)
- Do NOT say "Welcome back" every time -- mix it up
- Sound like a real coach who knows this athlete`;
}

/**
 * Build the user prompt with context about the user's current state
 */
export function buildGreetingUserPrompt(
  request: GenerateGreetingRequest,
): string {
  const parts: string[] = [];

  parts.push(`Time of day: ${request.timeOfDay}`);
  parts.push(`Active training programs: ${request.activeProgramCount}`);
  parts.push(`Workouts scheduled today: ${request.todaysWorkoutCount}`);

  if (request.todaysWorkoutNames && request.todaysWorkoutNames.length > 0) {
    parts.push(
      `Today's workout templates: ${request.todaysWorkoutNames.join(", ")}`,
    );
  }

  if (request.lastWorkoutDate) {
    parts.push(`Last workout completed: ${request.lastWorkoutDate}`);
  } else {
    parts.push("No workouts logged yet");
  }

  return `Generate a brief, personalized greeting (1-2 sentences) for your athlete's training dashboard.

User context:
${parts.join("\n")}

Remember: Keep it short, varied, and in-character. You can reference specific workout names if it feels natural. No emojis.`;
}
