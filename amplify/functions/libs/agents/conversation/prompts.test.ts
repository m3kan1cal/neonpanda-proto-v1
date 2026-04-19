import { describe, it, expect } from "vitest";
import { buildConversationAgentPrompt } from "./prompts";
import type { CoachConfig } from "../../coach-creator/types";

const makeCoachConfig = (overrides?: Partial<CoachConfig>): CoachConfig => ({
  coach_id: "test_coach_id",
  coach_name: "TestCoach",
  coach_description: "A test coach for unit tests",
  status: "active",
  gender_preference: "neutral",
  selected_personality: {
    primary_template: "marcus",
    secondary_influences: [],
    selection_reasoning: "test",
    blending_weights: { primary: 1.0, secondary: 0 },
  },
  selected_methodology: {
    primary_methodology: "general-strength",
    methodology_reasoning: "test reasoning",
    programming_emphasis: "balanced",
    periodization_approach: "linear",
    creativity_emphasis: "moderate",
    workout_innovation: "moderate",
  },
  technical_config: {
    methodology: "general-strength",
    programming_focus: ["strength"],
    experience_level: "intermediate",
    training_frequency: 4,
    specializations: ["strength training"],
    injury_considerations: [],
    goal_timeline: "ongoing",
    preferred_intensity: "moderate",
    equipment_available: ["barbell", "dumbbells"],
    time_constraints: {},
    safety_constraints: {
      volume_progression_limit: "10% per week",
      contraindicated_exercises: [],
      required_modifications: [],
      recovery_requirements: [],
      safety_monitoring: [],
    },
  },
  generated_prompts: {
    personality_prompt: "You coach with calm authority.",
    safety_integrated_prompt: "Always prioritize safety.",
    motivation_prompt: "Motivate through competence.",
    methodology_prompt: "Use progressive overload.",
    communication_style: "Direct and clear.",
    learning_adaptation_prompt: "Adapt to the user's pace.",
    gender_tone_prompt: "Balanced and professional.",
  },
  modification_capabilities: {
    enabled_modifications: ["intensity", "volume"],
    personality_flexibility: "moderate",
    programming_adaptability: "high",
    creative_programming: "moderate",
    workout_variety_emphasis: "moderate",
    safety_override_level: "low",
  },
  metadata: {
    version: "1.0",
    created_date: "2026-01-01",
    total_conversations: 0,
    safety_profile: null,
  } as any,
  ...overrides,
});

describe("buildConversationAgentPrompt — platform identity grounding", () => {
  it("includes the PLATFORM IDENTITY section in the static prompt", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain("## PLATFORM IDENTITY");
    expect(staticPrompt).toContain("NeonPanda");
    expect(staticPrompt).toContain("CRITICAL GROUNDING RULES");
  });

  it("grounds the coach name within NeonPanda in the core identity line", () => {
    const { staticPrompt } = buildConversationAgentPrompt(
      makeCoachConfig({ coach_name: "Vesper" }),
      { userTimezone: "America/Los_Angeles" },
    );

    expect(staticPrompt).toContain(
      "You are Vesper, an AI fitness coach on NeonPanda.",
    );
  });

  it("does not use the old flat identity opening without platform grounding", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    const platformIdentityIndex = staticPrompt.indexOf("## PLATFORM IDENTITY");
    const coreIdentityIndex = staticPrompt.indexOf(
      "You are TestCoach, an AI fitness coach on NeonPanda.",
    );

    expect(platformIdentityIndex).toBeGreaterThanOrEqual(0);
    expect(coreIdentityIndex).toBeGreaterThanOrEqual(0);
    expect(platformIdentityIndex).toBeLessThan(coreIdentityIndex);
  });
});

describe("buildConversationAgentPrompt — coaching responsibility", () => {
  it("includes the YOUR COACHING RESPONSIBILITY section", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain("## YOUR COACHING RESPONSIBILITY");
  });

  it("explicitly forbids deferral to platform developers or the NeonPanda team", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(/Never defer coaching decisions to/i);
    expect(staticPrompt).toMatch(/Platform developers, the NeonPanda team/i);
  });

  it("instructs brief acknowledgment of platform issues with no follow-up", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(
      /If the user raises a platform or app issue.*acknowledge it briefly/is,
    );
    expect(staticPrompt).toMatch(
      /Do not create follow-up commitments about platform issues/i,
    );
  });
});

describe("buildConversationAgentPrompt — required tool-use for coaching questions", () => {
  it("includes the Coaching Questions That REQUIRE Tool Use subsection", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain(
      "### Coaching Questions That REQUIRE Tool Use",
    );
  });

  it("lists the specific tools the coach must call for meet/PR/weight questions", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain("query_exercise_history");
    expect(staticPrompt).toContain("query_programs");
    expect(staticPrompt).toContain("get_recent_workouts");
    expect(staticPrompt).toMatch(
      /never defer the decision to the platform, to the NeonPanda team, or to anyone else/i,
    );
  });
});

describe("buildConversationAgentPrompt — structural ordering", () => {
  it("orders platform identity before coach personality and coaching responsibility before tool guidelines", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    const platformIdentityIdx = staticPrompt.indexOf("## PLATFORM IDENTITY");
    const personalityIdx = staticPrompt.indexOf("# COACH IDENTITY");
    const responsibilityIdx = staticPrompt.indexOf(
      "## YOUR COACHING RESPONSIBILITY",
    );
    const toolGuidelinesIdx = staticPrompt.indexOf("## TOOL USAGE GUIDELINES");

    expect(platformIdentityIdx).toBeGreaterThanOrEqual(0);
    expect(personalityIdx).toBeGreaterThanOrEqual(0);
    expect(responsibilityIdx).toBeGreaterThanOrEqual(0);
    expect(toolGuidelinesIdx).toBeGreaterThanOrEqual(0);

    expect(platformIdentityIdx).toBeLessThan(personalityIdx);
    expect(personalityIdx).toBeLessThan(responsibilityIdx);
    expect(responsibilityIdx).toBeLessThan(toolGuidelinesIdx);
  });
});
