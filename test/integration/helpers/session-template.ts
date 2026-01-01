/**
 * Real CoachCreatorSession Template
 *
 * This is a REAL session exported from DynamoDB that successfully generated a coach.
 * We use it as the template for all test sessions to ensure correct data structure.
 *
 * Test variations only override specific todoList values while preserving the structure.
 */

import type { CoachCreatorSession } from "../../../amplify/functions/libs/coach-creator/types";
import baseSessionData from "../examples/coachCreatorSession.json";

/**
 * Get the real session template (attributes only, no DynamoDB wrapper)
 */
export function getRealSessionTemplate(): CoachCreatorSession {
  // Return the attributes (the actual session data)
  return baseSessionData.attributes as unknown as CoachCreatorSession;
}

/**
 * Override options for creating test variations
 */
export interface SessionOverrides {
  // User identity
  userId?: string;
  sessionId?: string;

  // TodoList value overrides
  genderPreference?: "male" | "female" | "neutral";
  age?: number;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert";
  trainingFrequency?: number;
  primaryGoals?: string;
  injuryConsiderations?: string;
  movementLimitations?: string;
  equipmentAccess?: string[];
  coachingStylePreference?: string;
  motivationStyle?: string;
  goalTimeline?: string;
  sessionDuration?: string;
  timeOfDayPreference?: string;
  trainingEnvironment?: string;
  successMetrics?: string;
  progressTrackingPreferences?: string;
  movementPreferences?: string;
  movementDislikes?: string;
  trainingHistory?: string;
  lifeStageContext?: string;

  // Competition fields (optional)
  competitionGoals?: string | null;
  competitionTimeline?: string | null;

  // Session metadata overrides
  sophisticationLevel?: "UNKNOWN" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  conversationExcerpts?: Array<{ role: "user" | "assistant"; content: string }>;

  // Session status overrides (for error tests)
  isComplete?: boolean;
  isDeleted?: boolean;
}

/**
 * Create a test session from the real template with selective overrides
 *
 * This preserves the complete structure (todoList, conversationHistory, etc.)
 * while allowing specific values to be changed for test scenarios.
 */
export function createTestSessionFromTemplate(
  overrides: SessionOverrides = {},
): Partial<CoachCreatorSession> {
  const template = getRealSessionTemplate();

  // Start with the complete template structure
  const session: Partial<CoachCreatorSession> = {
    ...template,
    // Override IDs if provided
    userId: overrides.userId || template.userId,
    sessionId: overrides.sessionId || template.sessionId,
    isComplete:
      overrides.isComplete !== undefined
        ? overrides.isComplete
        : template.isComplete,
    isDeleted:
      overrides.isDeleted !== undefined
        ? overrides.isDeleted
        : template.isDeleted,
    sophisticationLevel:
      overrides.sophisticationLevel || template.sophisticationLevel,
  };

  // Clone the todoList to avoid mutating the template
  session.todoList = { ...template.todoList };

  // Apply todoList overrides
  if (overrides.genderPreference !== undefined) {
    session.todoList.coachGenderPreference = {
      status: "complete",
      value: overrides.genderPreference,
      confidence: "high",
      extractedFrom: "test_override",
      notes: `Test override: ${overrides.genderPreference}`,
    };
  }

  if (overrides.age !== undefined) {
    session.todoList.age = {
      status: "complete",
      value: overrides.age,
      confidence: "high",
      extractedFrom: "test_override",
      notes: `Test override: ${overrides.age} years old`,
    };
  }

  if (overrides.experienceLevel !== undefined) {
    session.todoList.experienceLevel = {
      status: "complete",
      value: overrides.experienceLevel,
      confidence: "high",
      extractedFrom: "test_override",
      notes: `Test override: ${overrides.experienceLevel}`,
    };
  }

  if (overrides.trainingFrequency !== undefined) {
    session.todoList.trainingFrequency = {
      status: "complete",
      value: overrides.trainingFrequency,
      confidence: "high",
      extractedFrom: "test_override",
      notes: `Test override: ${overrides.trainingFrequency} days per week`,
    };
  }

  if (overrides.primaryGoals !== undefined) {
    session.todoList.primaryGoals = {
      status: "complete",
      value: overrides.primaryGoals,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified goals",
    };
  }

  if (overrides.injuryConsiderations !== undefined) {
    session.todoList.injuryConsiderations = {
      status: "complete",
      value: overrides.injuryConsiderations,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified injury considerations",
    };
  }

  if (overrides.movementLimitations !== undefined) {
    session.todoList.movementLimitations = {
      status: "complete",
      value: overrides.movementLimitations,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified movement limitations",
    };
  }

  if (overrides.equipmentAccess !== undefined) {
    session.todoList.equipmentAccess = {
      status: "complete",
      value: overrides.equipmentAccess,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified equipment list",
    };
  }

  if (overrides.coachingStylePreference !== undefined) {
    session.todoList.coachingStylePreference = {
      status: "complete",
      value: overrides.coachingStylePreference,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified coaching style",
    };
  }

  if (overrides.motivationStyle !== undefined) {
    session.todoList.motivationStyle = {
      status: "complete",
      value: overrides.motivationStyle,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified motivation style",
    };
  }

  if (overrides.goalTimeline !== undefined) {
    session.todoList.goalTimeline = {
      status: "complete",
      value: overrides.goalTimeline,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified goal timeline",
    };
  }

  if (overrides.sessionDuration !== undefined) {
    session.todoList.sessionDuration = {
      status: "complete",
      value: overrides.sessionDuration,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified session duration",
    };
  }

  if (overrides.timeOfDayPreference !== undefined) {
    session.todoList.timeOfDayPreference = {
      status: "complete",
      value: overrides.timeOfDayPreference,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified time of day",
    };
  }

  if (overrides.trainingEnvironment !== undefined) {
    session.todoList.trainingEnvironment = {
      status: "complete",
      value: overrides.trainingEnvironment,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified training environment",
    };
  }

  if (overrides.successMetrics !== undefined) {
    session.todoList.successMetrics = {
      status: "complete",
      value: overrides.successMetrics,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified success metrics",
    };
  }

  if (overrides.progressTrackingPreferences !== undefined) {
    session.todoList.progressTrackingPreferences = {
      status: "complete",
      value: overrides.progressTrackingPreferences,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified progress tracking",
    };
  }

  if (overrides.movementPreferences !== undefined) {
    session.todoList.movementPreferences = {
      status: "complete",
      value: overrides.movementPreferences,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified movement preferences",
    };
  }

  if (overrides.movementDislikes !== undefined) {
    session.todoList.movementDislikes = {
      status: "complete",
      value: overrides.movementDislikes,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified movement dislikes",
    };
  }

  if (overrides.trainingHistory !== undefined) {
    session.todoList.trainingHistory = {
      status: "complete",
      value: overrides.trainingHistory,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified training history",
    };
  }

  if (overrides.lifeStageContext !== undefined) {
    session.todoList.lifeStageContext = {
      status: "complete",
      value: overrides.lifeStageContext,
      confidence: "high",
      extractedFrom: "test_override",
      notes: "Test override: modified life stage context",
    };
  }

  // Competition fields
  if (overrides.competitionGoals !== undefined) {
    session.todoList.competitionGoals = {
      status: overrides.competitionGoals ? "complete" : "pending",
      value: overrides.competitionGoals,
      confidence: overrides.competitionGoals ? "high" : undefined,
      extractedFrom: overrides.competitionGoals ? "test_override" : undefined,
      notes: overrides.competitionGoals
        ? "Test override: competition goals"
        : undefined,
    };
  }

  if (overrides.competitionTimeline !== undefined) {
    session.todoList.competitionTimeline = {
      status: overrides.competitionTimeline ? "complete" : "pending",
      value: overrides.competitionTimeline,
      confidence: overrides.competitionTimeline ? "high" : undefined,
      extractedFrom: overrides.competitionTimeline
        ? "test_override"
        : undefined,
      notes: overrides.competitionTimeline
        ? "Test override: competition timeline"
        : undefined,
    };
  }

  // Optionally append conversation excerpts for context
  if (
    overrides.conversationExcerpts &&
    overrides.conversationExcerpts.length > 0
  ) {
    // Clone conversation history and append test-specific messages
    session.conversationHistory = [
      ...(template.conversationHistory || []),
      ...overrides.conversationExcerpts.map((msg, idx) => ({
        role: msg.role,
        content: msg.content,
        id: `test_msg_${Date.now()}_${idx}`,
        timestamp: new Date(), // CoachMessage expects Date object, not string
        messageType: "text" as const,
      })),
    ];
  }

  return session;
}

/**
 * Helper to describe what was changed in a test session
 * Useful for test logging and debugging
 */
export function describeSessionOverrides(overrides: SessionOverrides): string {
  const changes: string[] = [];

  if (overrides.genderPreference)
    changes.push(`gender: ${overrides.genderPreference}`);
  if (overrides.age) changes.push(`age: ${overrides.age}`);
  if (overrides.experienceLevel)
    changes.push(`experience: ${overrides.experienceLevel}`);
  if (overrides.trainingFrequency)
    changes.push(`frequency: ${overrides.trainingFrequency}x/week`);
  if (overrides.isComplete !== undefined)
    changes.push(`isComplete: ${overrides.isComplete}`);

  return changes.length > 0
    ? changes.join(", ")
    : "no overrides (using template as-is)";
}
