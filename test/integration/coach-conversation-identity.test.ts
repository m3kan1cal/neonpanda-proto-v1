/**
 * Coach Conversation Identity Regression
 *
 * Replays the failing scenario from the April 2026 incident where the coach
 * deflected a meet-weight question to "Mark and Neon Panda" instead of
 * coaching the user through it.
 *
 * This is a deterministic integration-level test that exercises two layers
 * simultaneously:
 *
 *   1. Prospective memory filter: an extraction result that contains a
 *      "follow up with Mark at Neon Panda" item should be dropped by the
 *      post-extraction filter, so the living profile / conversation context
 *      never sees it.
 *   2. Conversation prompt assembly: when the coach receives a weight-selection
 *      question, the rendered system prompt must contain the platform
 *      identity grounding, coaching responsibility section, and the
 *      required-tool-use rules that together forbid deflection.
 *
 * A true end-to-end Lambda test is avoided intentionally: Bedrock is
 * non-deterministic and the integration harness for streaming Lambdas
 * requires live AWS infra. The deterministic guarantees verified here are
 * the ones that would have prevented the incident, so regression value is
 * high without infrastructure cost.
 */

import { describe, it, expect } from "vitest";
import { buildConversationAgentPrompt } from "../../amplify/functions/libs/agents/conversation/prompts";
import { filterPlatformSupportItems } from "../../amplify/functions/libs/memory/prospective";
import type { ProspectiveExtractionResult } from "../../amplify/functions/libs/memory/types";
import type { CoachConfig } from "../../amplify/functions/libs/coach-creator/types";

const DEFLECTION_PHRASES = [
  "reach out to",
  "contact support",
  "talk to the team",
  "talk to mark",
  "ask neonpanda",
  "ask the neonpanda team",
  "the platform will",
  "NeonPanda can help",
  "I don't have access to",
];

const makeCoachConfig = (): CoachConfig => ({
  coach_id: "coach_identity_regression",
  coach_name: "Marcus",
  coach_description: "Strength coach for the identity regression scenario",
  status: "active",
  gender_preference: "male",
  selected_personality: {
    primary_template: "marcus",
    secondary_influences: [],
    selection_reasoning: "direct, competent",
    blending_weights: { primary: 1, secondary: 0 },
  },
  selected_methodology: {
    primary_methodology: "conjugate",
    methodology_reasoning: "user is a competitive powerlifter",
    programming_emphasis: "max effort + dynamic effort",
    periodization_approach: "block",
    creativity_emphasis: "moderate",
    workout_innovation: "moderate",
  },
  technical_config: {
    methodology: "conjugate",
    programming_focus: ["powerlifting"],
    experience_level: "advanced",
    training_frequency: 4,
    specializations: ["powerlifting", "meet prep"],
    injury_considerations: [],
    goal_timeline: "next meet in 8 weeks",
    preferred_intensity: "high",
    equipment_available: ["barbell", "rack", "chains", "bands"],
    time_constraints: { session_duration: "90 minutes" },
    safety_constraints: {
      volume_progression_limit: "10% per week",
      contraindicated_exercises: [],
      required_modifications: [],
      recovery_requirements: [],
      safety_monitoring: [],
    },
  },
  generated_prompts: {
    personality_prompt: "Direct, competent, meets-focused.",
    safety_integrated_prompt: "Prioritize form and recovery.",
    motivation_prompt: "Earn the next attempt.",
    methodology_prompt: "Conjugate: max effort + dynamic effort + accessory.",
    communication_style: "Direct, no fluff.",
    learning_adaptation_prompt: "Lean on the athlete's data.",
    gender_tone_prompt: "Assertive and grounded.",
  },
  modification_capabilities: {
    enabled_modifications: ["intensity", "volume", "exercise selection"],
    personality_flexibility: "low",
    programming_adaptability: "high",
    creative_programming: "moderate",
    workout_variety_emphasis: "moderate",
    safety_override_level: "low",
  },
  metadata: {
    version: "1.0",
    created_date: "2026-01-01",
    total_conversations: 42,
    safety_profile: null,
  } as any,
});

describe("coach-conversation-identity regression — prospective memory filter", () => {
  it("drops the 'follow up with Mark at Neon Panda' memory from the incident", () => {
    const extraction: ProspectiveExtractionResult = {
      hasProspectiveElements: true,
      items: [
        {
          content:
            "User will follow up with Mark and Neon Panda about the workout logging bug",
          targetDateType: "relative",
          followUpType: "commitment_check",
          followUpPrompt:
            "Ask if Mark and Neon Panda got the logging issue sorted",
          importance: "medium",
          triggerWindowDaysBefore: 2,
          triggerWindowDaysAfter: 3,
          originalContext:
            "User said they would reach out to Mark at Neon Panda about the bug",
        },
        {
          content:
            "User has a sanctioned powerlifting meet on April 27",
          targetDate: "2026-04-27",
          targetDateType: "specific",
          followUpType: "event_outcome",
          followUpPrompt:
            "Ask how the meet went and how openers and third attempts felt",
          importance: "high",
          triggerWindowDaysBefore: 90,
          triggerWindowDaysAfter: 7,
          originalContext:
            "User mentioned their meet on April 27 and is selecting openers",
        },
      ],
    };

    const filtered = filterPlatformSupportItems(extraction.items);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].content).toContain("powerlifting meet");
  });
});

describe("coach-conversation-identity regression — system prompt guarantees", () => {
  const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
    userTimezone: "America/Los_Angeles",
  });

  it("contains platform identity grounding so 'NeonPanda' is never read as a third party", () => {
    expect(staticPrompt).toContain("## PLATFORM IDENTITY");
    expect(staticPrompt).toMatch(
      /"NeonPanda".*refers to THIS platform/is,
    );
  });

  it("contains the coaching responsibility section forbidding deferral", () => {
    expect(staticPrompt).toContain("## YOUR COACHING RESPONSIBILITY");
    expect(staticPrompt).toMatch(/Never defer coaching decisions to/i);
    expect(staticPrompt).toMatch(/Platform developers, the NeonPanda team/i);
  });

  it("instructs tool use for weight/meet/PR questions", () => {
    expect(staticPrompt).toContain(
      "### Coaching Questions That REQUIRE Tool Use",
    );
    expect(staticPrompt).toContain("query_exercise_history");
    expect(staticPrompt).toContain("query_programs");
    expect(staticPrompt).toContain("get_recent_workouts");
  });

  it("contains no instructions that invite the known deflection phrases", () => {
    for (const phrase of DEFLECTION_PHRASES) {
      const lowercased = staticPrompt.toLowerCase();
      const index = lowercased.indexOf(phrase.toLowerCase());
      if (index === -1) continue;

      // Any appearance of a deflection phrase in the static prompt must be
      // inside a negative instruction (e.g. preceded by "never", "do not",
      // "don't", "forbid"). Anything else would re-introduce the bug.
      const windowStart = Math.max(0, index - 200);
      const window = lowercased.slice(windowStart, index);
      expect(
        window,
        `Deflection phrase "${phrase}" appears without a negative instruction nearby`,
      ).toMatch(/(never|do not|don't|forbid|must not|instead of)/);
    }
  });

  it("keeps the coach's identity anchored within NeonPanda (not a third-party service)", () => {
    expect(staticPrompt).toContain(
      "You are Marcus, an AI fitness coach on NeonPanda.",
    );
  });
});
