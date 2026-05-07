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
    // The hard "no defer" rule moved to CRITICAL SYSTEM RULES (consolidated
    // in PR 5). The phrasing is now slightly different — it lists "support"
    // as an explicit prohibited deferral target. See the dedicated
    // "consolidated CRITICAL SYSTEM RULES" describe block below.
    expect(staticPrompt).toMatch(
      /Never defer the decision to the platform, to the NeonPanda team/i,
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

describe("buildConversationAgentPrompt — today's workout status injection", () => {
  it("omits the TODAY'S PRESCRIBED WORKOUT STATUS section when not provided", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(dynamicPrompt).not.toContain("## TODAY'S PRESCRIBED WORKOUT STATUS");
  });

  it("renders the section with pending/completed labels when templates are provided", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
      todayWorkoutStatus: {
        dayNumber: 17,
        restDay: false,
        templates: [
          {
            templateId: "t_pc",
            name: "Power Clean Escalation",
            status: "pending",
          },
          {
            templateId: "t_acc",
            name: "Upper Accessory",
            status: "completed",
            completedAt: "2026-05-06T18:30:00.000Z",
          },
        ],
      },
    });

    expect(dynamicPrompt).toContain(
      "## TODAY'S PRESCRIBED WORKOUT STATUS (Day 17)",
    );
    expect(dynamicPrompt).toContain('"Power Clean Escalation" — pending');
    expect(dynamicPrompt).toContain('"Upper Accessory" — completed');
    expect(dynamicPrompt).toContain("query_exercise_history");
  });

  it("renders the rest-day variant when restDay is true", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
      todayWorkoutStatus: {
        dayNumber: 7,
        restDay: true,
        templates: [],
      },
    });

    expect(dynamicPrompt).toContain(
      "## TODAY'S PRESCRIBED WORKOUT STATUS (Day 7)",
    );
    expect(dynamicPrompt).toContain("rest day");
  });

  it("places the status block after Program Summary but before Session UI Context", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
      activeProgram: {
        programName: "Test Program",
        currentDay: 5,
        totalDays: 28,
        status: "active",
        completedWorkouts: 4,
        totalWorkouts: 24,
      },
      sessionProgramContext: {
        programId: "p_test",
        programName: "Test Program",
        surface: "view_workouts",
        dayNumber: 5,
        isViewingToday: true,
      },
      todayWorkoutStatus: {
        dayNumber: 5,
        restDay: false,
        templates: [{ templateId: "t", name: "Squat", status: "pending" }],
      },
    });

    const programSummaryIdx = dynamicPrompt.indexOf(
      "## ACTIVE TRAINING PROGRAM",
    );
    const todayStatusIdx = dynamicPrompt.indexOf(
      "## TODAY'S PRESCRIBED WORKOUT STATUS",
    );
    const sessionUiIdx = dynamicPrompt.indexOf("## SESSION UI CONTEXT");

    expect(programSummaryIdx).toBeGreaterThanOrEqual(0);
    expect(todayStatusIdx).toBeGreaterThanOrEqual(0);
    expect(sessionUiIdx).toBeGreaterThanOrEqual(0);
    expect(programSummaryIdx).toBeLessThan(todayStatusIdx);
    expect(todayStatusIdx).toBeLessThan(sessionUiIdx);
  });
});

describe("buildConversationAgentPrompt — consolidated CRITICAL SYSTEM RULES", () => {
  it("includes a single CRITICAL SYSTEM RULES block with the four subsections", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain("## CRITICAL SYSTEM RULES");
    expect(staticPrompt).toContain("### Tool Use Discipline");
    expect(staticPrompt).toContain("### Coaching Responsibility");
    expect(staticPrompt).toContain("### Memory Acknowledgment");
    // The block is consolidated — there should only be one occurrence of the
    // "## CRITICAL SYSTEM RULES" header in the static prompt
    const occurrences = staticPrompt.match(/## CRITICAL SYSTEM RULES/g) || [];
    expect(occurrences.length).toBe(1);
  });

  it("generalizes the no-preamble rule to ALL tools (not just save_memory)", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(
      /When calling any tool, do not generate conversational text in the same turn/i,
    );
    expect(staticPrompt).toMatch(/applies to ALL tools/i);
  });

  it("instructs the agent to consult TODAY'S PRESCRIBED WORKOUT STATUS for today-completion questions", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toContain("## TODAY'S PRESCRIBED WORKOUT STATUS");
    expect(staticPrompt).toMatch(/Did I do today's workout/i);
  });

  it("preserves the no-deferral rule inside CRITICAL SYSTEM RULES", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(/Never defer the decision to/i);
    expect(staticPrompt).toMatch(/the platform.*the NeonPanda team/i);
  });

  it("preserves the silent-memory rule inside CRITICAL SYSTEM RULES", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(
      /memory system works silently|never narrate the act of saving/i,
    );
  });

  it("forbids inferring today's prescription completion from query_exercise_history dates alone", () => {
    const { staticPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
    });

    expect(staticPrompt).toMatch(
      /Never infer today's prescribed-template completion from .*query_exercise_history.* row dates alone/i,
    );
  });
});

describe("buildConversationAgentPrompt — view_workouts surface framing", () => {
  it("disambiguates historical-performance from today-status questions on view_workouts", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
      sessionProgramContext: {
        programId: "p_test",
        programName: "Test Program",
        surface: "view_workouts",
        dayNumber: 5,
        isViewingToday: true,
      },
    });

    expect(dynamicPrompt).toMatch(/historical-performance questions/i);
    expect(dynamicPrompt).toMatch(/today.?(status|day-status) questions/i);
    expect(dynamicPrompt).toMatch(/Do not conflate/i);
    expect(dynamicPrompt).toContain("query_exercise_history");
    expect(dynamicPrompt).toContain("get_todays_workout");
    expect(dynamicPrompt).toContain("## TODAY'S PRESCRIBED WORKOUT STATUS");
  });

  it("does not apply the view_workouts disambiguation to program_dashboard surface", () => {
    const { dynamicPrompt } = buildConversationAgentPrompt(makeCoachConfig(), {
      userTimezone: "America/Los_Angeles",
      sessionProgramContext: {
        programId: "p_test",
        programName: "Test Program",
        surface: "program_dashboard",
      },
    });

    expect(dynamicPrompt).not.toMatch(/historical-performance questions/i);
  });
});
