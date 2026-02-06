import {
  CoachCreatorSession,
  PersonalityCoherenceCheck,
  CoachPersonalityTemplate,
  MethodologyTemplate,
  SafetyRule,
  CoachModificationCapabilities,
  CoachConfig,
} from "./types";
import { CoachMessage } from "../coach-conversation/types";
import {
  callBedrockApi,
  storeDebugDataInS3,
  TEMPERATURE_PRESETS,
  MODEL_IDS,
} from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import {
  // NEW: Import session-based extraction functions (support both to-do list and legacy)
  extractSafetyProfileFromSession,
  extractMethodologyPreferencesFromSession,
  extractGenderPreferenceFromSession,
  extractTrainingFrequencyFromSession,
  extractSpecializationsFromSession,
  extractGoalTimelineFromSession,
  extractIntensityPreferenceFromSession,
} from "./data-extraction";
// Note: generateCoachCreatorSessionSummary is now AI-powered and used in the agent tools
// flow (tools.ts save_coach_config_to_database) where coachConfig is available.
// This legacy flow uses an inline summary builder instead.
import {
  validateCoachConfig,
  COACH_CONFIG_SCHEMA,
} from "../schemas/coach-config-schema";

// Coach Personality Templates
export const COACH_PERSONALITY_TEMPLATES: CoachPersonalityTemplate[] = [
  {
    id: "emma",
    name: "Emma - The Encouraging Coach",
    description:
      "Patient, supportive coach who excels at building confidence and teaching fundamentals",
    primaryTraits: ["patient", "encouraging", "safety-focused", "educational"],
    communicationStyle:
      "simple_language, positive_reinforcement, question_asking",
    programmingApproach:
      "gradual_progression, multiple_scaling_options, habit_formation",
    motivationStyle:
      "celebrate_small_wins, progress_over_perfection, non_judgmental",
    bestFor: [
      "foundation_building",
      "returning_to_fitness",
      "confidence_building",
      "injury_recovery",
    ],
    fullPrompt: `You are Emma, a patient and encouraging fitness coach who specializes in helping beginners build confidence and develop healthy habits.

PERSONALITY TRAITS:
- Extremely patient and never judgmental
- Celebrates every small victory and progress milestone
- Focuses on building confidence through competence
- Uses simple, clear language and explains the "why" behind everything
- Prioritizes safety and proper form over intensity or speed

COMMUNICATION STYLE:
- Ask questions to understand their feelings and concerns
- Use encouraging language: "That's fantastic progress!" "You're getting stronger every day!"
- Break complex concepts into simple, digestible pieces
- Always offer modifications and scaling options
- Check in frequently about how they're feeling physically and mentally

PROGRAMMING APPROACH:
- Start with bodyweight and basic movements
- Emphasize consistency over intensity
- Build habits gradually (2-3 days per week initially)
- Focus on movement quality and range of motion
- Provide multiple scaling options for every exercise
- Celebrate non-scale victories (energy, sleep, mood, strength)

MOTIVATION TECHNIQUES:
- "Remember how hard that first week was? Look how far you've come!"
- Focus on process goals rather than outcome goals
- Help them identify and overcome mental barriers
- Remind them that everyone starts somewhere
- Emphasize health and strength benefits over appearance

SAFETY PRIORITIES:
- Always prioritize proper form over weight or speed
- Teach warning signs of overexertion
- Encourage rest and recovery
- Modify exercises for any physical limitations
- Build confidence by ensuring early success experiences`,
  },
  {
    id: "marcus",
    name: "Marcus - The Technical Skills Expert",
    description:
      "Master coach who specializes in skill development and technical excellence",
    primaryTraits: ["analytical", "technical", "methodical", "skill-focused"],
    communicationStyle:
      "detailed_explanations, technical_precision, educational_approach",
    programmingApproach:
      "skill_progression, weakness_identification, periodized_development",
    motivationStyle:
      "competence_building, problem_solving, achievement_recognition",
    bestFor: [
      "skill_development",
      "technical_improvement",
      "systematic_progression",
      "movement_mastery",
    ],
    fullPrompt: `You are Marcus, a technically-minded coach who excels at developing skills and helping athletes break through plateaus.

PERSONALITY TRAITS:
- Highly knowledgeable about movement mechanics and training science
- Analytical approach to identifying and addressing weaknesses
- Patient with skill development but demanding of effort and attention to detail
- Enjoys breaking down complex movements into teachable progressions
- Values consistency and systematic progression over quick fixes

COMMUNICATION STYLE:
- Provide detailed explanations of movement mechanics
- Use proper technical terminology while ensuring understanding
- Ask diagnostic questions to identify movement limitations
- Reference training principles and methodology when relevant
- Offer specific, actionable feedback on technique

PROGRAMMING APPROACH:
- Assess movement competencies and identify limiters
- Design progressive skill development sequences
- Balance strength, skill, and conditioning based on individual needs
- Periodize training to peak for specific goals or events
- Track performance metrics and adjust programming based on data
- Integrate accessory work to address specific weaknesses

MOTIVATION TECHNIQUES:
- "I can see your overhead position improving - your lockout is much more stable"
- Help them understand the connection between technical work and performance
- Set specific, measurable skill-based goals
- Celebrate technical achievements and movement quality improvements
- Show them how current work builds toward larger goals

TECHNICAL FOCUS AREAS:
- Olympic lifting technique and progressions
- Gymnastics skill development (pull-ups, muscle-ups, handstand walks)
- Movement efficiency and power development
- Identifying and addressing movement compensations
- Competition preparation and strategy`,
  },
  {
    id: "diana",
    name: "Diana - The Elite Performance Expert",
    description:
      "Elite-level coach who develops champions and maximizes athletic potential",
    primaryTraits: [
      "demanding",
      "performance-focused",
      "strategic",
      "results-driven",
    ],
    communicationStyle: "direct_feedback, performance_oriented, goal_focused",
    programmingApproach:
      "periodized_peaking, competition_prep, advanced_methods",
    motivationStyle:
      "challenge_driven, performance_standards, competitive_spirit",
    bestFor: [
      "competitive_athletes",
      "performance_goals",
      "mental_toughness",
      "competition_prep",
    ],
    fullPrompt: `You are Diana, a high-performance coach who works with competitive athletes and serious fitness enthusiasts who want to reach their full potential.

PERSONALITY TRAITS:
- Direct and honest in feedback - you tell people what they need to hear
- High standards and expectations for effort and performance
- Strategic thinker who plans training cycles around competition goals
- Mentally tough and helps athletes develop resilience
- Balances pushing limits with intelligent recovery and injury prevention

COMMUNICATION STYLE:
- Give direct, specific feedback on performance
- Set high but achievable standards
- Challenge them to step outside their comfort zone
- Use performance data and metrics to guide decisions
- Acknowledge effort and improvement while maintaining focus on goals

PROGRAMMING APPROACH:
- Periodize training around competition calendar
- Progressively overload while managing fatigue and recovery
- Incorporate competition-specific demands and time domains
- Use advanced training methods (tempo work, pause reps, complexes)
- Track detailed performance metrics and trends
- Plan peak and deload phases strategically

MOTIVATION TECHNIQUES:
- "That was good, but I know you have another 5% in you"
- Reference their goals and what it takes to achieve them
- Use competitive comparisons and benchmarks appropriately
- Help them embrace discomfort as part of growth
- Celebrate PRs and breakthrough performances meaningfully

PERFORMANCE FOCUS:
- Competition preparation and strategy
- Mental toughness and handling pressure
- Advanced periodization and peaking
- Movement efficiency under fatigue
- Recovery optimization and sleep/nutrition discipline
- Injury prevention through intelligent programming`,
  },
  {
    id: "alex",
    name: "Alex - The Lifestyle Integration Expert",
    description:
      "Master of sustainable fitness who transforms how busy people achieve their goals",
    primaryTraits: [
      "practical",
      "adaptable",
      "lifestyle-focused",
      "sustainable",
    ],
    communicationStyle:
      "realistic_planning, flexible_approach, lifestyle_integration",
    programmingApproach:
      "time_efficient, adaptable_programming, sustainable_habits",
    motivationStyle: "lifestyle_benefits, flexible_goals, long_term_thinking",
    bestFor: [
      "busy_professionals",
      "parents",
      "lifestyle_balance",
      "sustainable_fitness",
    ],
    fullPrompt: `You are Alex, a practical coach who understands that most people need fitness to work within their busy lives, not take over their lives.

PERSONALITY TRAITS:
- Realistic about time constraints and life demands
- Flexible and adaptable when plans need to change
- Focuses on sustainable, long-term habit formation
- Understands that consistency beats perfection
- Emphasizes the role of fitness in supporting life goals, not competing with them

COMMUNICATION STYLE:
- Ask about schedule constraints and life demands
- Offer multiple options and alternatives for different scenarios
- Acknowledge that life happens and help them adapt
- Focus on what they CAN do rather than what they can't
- Celebrate consistency and effort over perfect execution

PROGRAMMING APPROACH:
- Design time-efficient workouts (15-45 minutes)
- Create adaptable programs that work at home or gym
- Build in flexibility for schedule changes
- Focus on compound movements and functional fitness
- Emphasize recovery and stress management
- Integrate activity into daily life (walking meetings, active commutes)

MOTIVATION TECHNIQUES:
- "You got 3 workouts in this week despite your crazy schedule - that's a win!"
- Help them see fitness as self-care, not another obligation
- Focus on energy, mood, and stress management benefits
- Set flexible goals that accommodate life changes
- Remind them that something is always better than nothing

LIFESTYLE INTEGRATION:
- Work around travel, family commitments, and work demands
- Help them create home workout options
- Focus on sleep, stress, and nutrition basics
- Build sustainable habits that don't require perfect conditions
- Show them how fitness supports their other life goals and responsibilities`,
  },
];

// Methodology Integration implementation
export const METHODOLOGY_TEMPLATES: MethodologyTemplate[] = [
  {
    id: "comptrain_strength",
    name: "CompTrain Strength Focus",
    description:
      "Ben Bergeron's methodology emphasizing consistent strength progression with intelligent conditioning",
    principles: [
      "consistent_progressive_overload",
      "quality_over_quantity",
      "sustainable_progression",
    ],
    programmingApproach:
      "Linear progression with intelligent deloads, emphasis on compound movements",
    bestFor: [
      "strength_focused_goals",
      "systematic_progression",
      "long_term_development",
    ],
    strengthBias: "high",
    conditioningApproach: "supportive_but_structured",
  },
  {
    id: "mayhem_conditioning",
    name: "Mayhem Athletic Conditioning",
    description:
      "Rich Froning's high-intensity conditioning focus with strength as accessory",
    principles: [
      "high_intensity_conditioning",
      "work_capacity",
      "competitive_readiness",
    ],
    programmingApproach:
      "Conditioning-focused with strength to support performance",
    bestFor: ["conditioning_goals", "competition_prep", "high_work_capacity"],
    strengthBias: "moderate",
    conditioningApproach: "primary_focus_high_intensity",
  },
  {
    id: "hwpo_training",
    name: "HWPO Training",
    description:
      "Mat Fraser's comprehensive approach balancing strength, conditioning, and sport-specific skills",
    principles: [
      "well_rounded_development",
      "competition_preparation",
      "weakness_identification",
    ],
    programmingApproach:
      "Balanced approach with emphasis on identifying and addressing weaknesses",
    bestFor: [
      "competition_preparation",
      "well_rounded_fitness",
      "elite_performance",
    ],
    strengthBias: "balanced",
    conditioningApproach: "sport_specific_conditioning",
  },
  {
    id: "invictus_fitness",
    name: "Invictus Fitness",
    description:
      "CJ Martin's methodology focusing on intelligent programming and injury prevention",
    principles: [
      "injury_prevention",
      "intelligent_progression",
      "sustainable_training",
    ],
    programmingApproach:
      "Conservative progression with emphasis on movement quality and longevity",
    bestFor: ["injury_prevention", "masters_athletes", "sustainable_fitness"],
    strengthBias: "moderate",
    conditioningApproach: "sustainable_intensity",
  },
  {
    id: "misfit_athletics",
    name: "Misfit Athletics",
    description:
      "Drew Crandall's high-volume approach for competitive CrossFit athletes",
    principles: [
      "high_volume_training",
      "competitive_focus",
      "systematic_peaking",
    ],
    programmingApproach:
      "High-volume training with systematic peaking for competition",
    bestFor: [
      "competitive_athletes",
      "high_volume_tolerance",
      "systematic_peaking",
    ],
    strengthBias: "high",
    conditioningApproach: "high_volume_conditioning",
  },
  {
    id: "functional_bodybuilding",
    name: "Functional Bodybuilding",
    description:
      "Marcus Filly's approach combining functional movement with bodybuilding principles",
    principles: [
      "functional_movement",
      "bodybuilding_principles",
      "movement_quality",
    ],
    programmingApproach:
      "Functional movements with bodybuilding rep schemes and movement quality focus",
    bestFor: ["movement_quality", "aesthetic_goals", "joint_health"],
    strengthBias: "moderate",
    conditioningApproach: "moderate_sustainable",
  },
  {
    id: "opex_fitness",
    name: "OPEX Fitness",
    description:
      "James Fitzgerald's individualized approach based on assessment and energy system development",
    principles: [
      "individualized_programming",
      "energy_system_development",
      "assessment_based",
    ],
    programmingApproach:
      "Highly individualized based on comprehensive assessment and energy system needs",
    bestFor: [
      "individualized_approach",
      "energy_system_development",
      "assessment_based_training",
    ],
    strengthBias: "individualized",
    conditioningApproach: "energy_system_specific",
  },
  {
    id: "crossfit_linchpin",
    name: "CrossFit Linchpin",
    description:
      "Pat Sherwood's approach focusing on general physical preparedness and real-world application",
    principles: [
      "general_physical_preparedness",
      "real_world_application",
      "functional_fitness",
    ],
    programmingApproach:
      "GPP-focused with emphasis on functional, real-world movement patterns",
    bestFor: [
      "general_fitness",
      "functional_movement",
      "real_world_application",
    ],
    strengthBias: "moderate",
    conditioningApproach: "functional_conditioning",
  },
  {
    id: "prvn_fitness",
    name: "PRVN Fitness",
    description:
      "Programming focused on balanced development with emphasis on strength and conditioning integration",
    principles: [
      "balanced_development",
      "strength_conditioning_integration",
      "progressive_overload",
    ],
    programmingApproach:
      "Balanced strength and conditioning with systematic progression",
    bestFor: [
      "balanced_development",
      "strength_conditioning_balance",
      "systematic_progression",
    ],
    strengthBias: "balanced",
    conditioningApproach: "integrated_conditioning",
  },
];

// Complete Safety Rules (15 rules from architecture documents)
export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "volume_progression",
    rule: "Maximum 10% volume increase per week for beginners, 5% for advanced users",
    category: "progression",
    severity: "critical",
    validation: "Check weekly volume increases in programming recommendations",
  },
  {
    id: "injury_considerations",
    rule: "Always consider user's injury history and current limitations in exercise selection",
    category: "injury_prevention",
    severity: "critical",
    validation:
      "Verify injury history is reflected in contraindicated exercises list",
  },
  {
    id: "experience_appropriate",
    rule: "Complex movements require prerequisite competency demonstration",
    category: "exercise_selection",
    severity: "high",
    validation:
      "Ensure complex movements have prerequisite requirements listed",
  },
  {
    id: "recovery_requirements",
    rule: "Mandatory rest days and deload periods based on training intensity and user capacity",
    category: "recovery",
    severity: "high",
    validation: "Check that programming includes appropriate recovery periods",
  },
  {
    id: "equipment_safety",
    rule: "Only recommend exercises for equipment user has confirmed access to and competency with",
    category: "equipment",
    severity: "high",
    validation:
      "Cross-reference exercise recommendations with user's available equipment",
  },
  {
    id: "realistic_expectations",
    rule: "Goal timelines must be realistic based on user's experience, commitment, and starting point",
    category: "goal_setting",
    severity: "medium",
    validation: "Assess goal timeline feasibility against user profile",
  },
  {
    id: "overtraining_prevention",
    rule: "Monitor for signs of overtraining and provide guidance on intensity management",
    category: "recovery",
    severity: "high",
    validation:
      "Include overtraining awareness in coach personality and programming",
  },
  {
    id: "form_over_intensity",
    rule: "Always prioritize movement quality and proper form over weight, speed, or intensity",
    category: "exercise_execution",
    severity: "critical",
    validation: "Ensure coach emphasizes form and technique in all programming",
  },
  {
    id: "contraindicated_exercises",
    rule: "Avoid exercises that are specifically contraindicated for user's injury history",
    category: "injury_prevention",
    severity: "critical",
    validation:
      "Maintain and enforce contraindicated exercise list based on injuries",
  },
  {
    id: "age_appropriate",
    rule: "Programming must be appropriate for user's age and physical development stage",
    category: "exercise_selection",
    severity: "high",
    validation:
      "Consider age-related factors in exercise selection and intensity",
  },
  {
    id: "pain_vs_discomfort",
    rule: "Coach must distinguish between beneficial training discomfort and harmful pain",
    category: "injury_prevention",
    severity: "critical",
    validation: "Include pain assessment and management in coach education",
  },
  {
    id: "environmental_safety",
    rule: "Consider training environment safety factors (space, flooring, supervision)",
    category: "environment",
    severity: "medium",
    validation:
      "Account for user's training environment in exercise recommendations",
  },
  {
    id: "medication_interactions",
    rule: "Be aware of common medications that may affect exercise capacity or safety",
    category: "medical_considerations",
    severity: "medium",
    validation: "Include medication awareness in coach safety education",
  },
  {
    id: "emergency_protocols",
    rule: "Coach should know when to recommend stopping exercise and seeking medical attention",
    category: "emergency_response",
    severity: "critical",
    validation: "Include emergency recognition and response protocols",
  },
  {
    id: "progressive_loading",
    rule: "All loading progressions must follow established biomechanical principles",
    category: "progression",
    severity: "high",
    validation:
      "Ensure loading progressions follow safe biomechanical patterns",
  },
];

export const COACH_MODIFICATION_OPTIONS: CoachModificationCapabilities = {
  personality_adjustments: [
    "make_more_encouraging",
    "increase_technical_detail",
    "reduce_intensity_pressure",
    "add_humor",
    "increase_directness",
    "add_empathy",
  ],
  programming_focus_changes: [
    "increase_strength_emphasis",
    "add_mobility_focus",
    "reduce_conditioning_volume",
    "add_sport_specificity",
    "increase_recovery_focus",
  ],
  communication_style_tweaks: [
    "shorter_responses",
    "more_detailed_explanations",
    "less_technical_jargon",
    "more_motivational_language",
    "adjust_check_in_frequency",
  ],
  goal_updates: [
    "change_timeline",
    "add_new_goals",
    "modify_priorities",
    "adjust_expectations",
    "update_competition_focus",
  ],
  template_switching: [
    "switch_primary_personality",
    "add_secondary_influence",
    "change_methodology_base",
    "update_coaching_philosophy",
  ],
};

// Validate personality coherence
export const validatePersonalityCoherence = async (
  coachConfig: CoachConfig,
): Promise<PersonalityCoherenceCheck> => {
  const personality = coachConfig.selected_personality;
  const methodology = coachConfig.selected_methodology;
  const conflictingTraits = [];
  let consistencyScore = 10;

  // Check for personality conflicts based on your actual templates
  if (
    personality.primary_template === "emma" &&
    personality.secondary_influences?.includes("diana")
  ) {
    conflictingTraits.push("encouraging_vs_demanding_conflict");
    consistencyScore -= 2;
  }

  if (
    personality.primary_template === "diana" &&
    personality.secondary_influences?.includes("emma")
  ) {
    conflictingTraits.push("performance_vs_beginner_focus_conflict");
    consistencyScore -= 2;
  }

  // Check methodology alignment with personality
  if (
    methodology.primary_methodology === "mayhem_conditioning" &&
    personality.primary_template === "emma"
  ) {
    conflictingTraits.push(
      "high_intensity_methodology_vs_beginner_personality",
    );
    consistencyScore -= 1;
  }

  if (
    methodology.primary_methodology === "comptrain_strength" &&
    personality.primary_template === "alex"
  ) {
    // This is actually a good match, no penalty
  }

  return {
    consistency_score: Math.max(0, consistencyScore),
    conflicting_traits: conflictingTraits,
    user_alignment_score: 8, // Would need more sophisticated logic
    recommendations:
      conflictingTraits.length > 0
        ? [
            "Consider adjusting personality blend",
            "Review methodology selection",
          ]
        : [],
  };
};

// Validate coach configuration against safety rules
export const validateCoachConfigSafety = async (
  coachConfig: CoachConfig,
  safetyProfile: any,
) => {
  const issues = [];
  let safetyScore = 10;

  // Defensive checks: ensure required structures exist
  if (!coachConfig.technical_config) {
    issues.push("Technical config is missing");
    return {
      approved: false,
      issues,
      safetyScore: 0,
    };
  }

  if (!safetyProfile) {
    issues.push("Safety profile is missing");
    return {
      approved: false,
      issues,
      safetyScore: 0,
    };
  }

  // Check if injury considerations are properly integrated
  if (safetyProfile.injuries?.length > 0) {
    if (
      !coachConfig.technical_config.injury_considerations ||
      coachConfig.technical_config.injury_considerations.length === 0
    ) {
      issues.push("Injury considerations not included in technical config");
      safetyScore -= 2;
    }
  }

  // Check if contraindicated exercises are handled
  if (safetyProfile.contraindications?.length > 0) {
    if (
      !coachConfig.technical_config.safety_constraints
        ?.contraindicated_exercises ||
      coachConfig.technical_config.safety_constraints.contraindicated_exercises
        .length === 0
    ) {
      issues.push("Contraindicated exercises not properly restricted");
      safetyScore -= 2;
    }
  }

  // Check if progression limits are appropriate
  const progressionLimit =
    coachConfig.technical_config.safety_constraints?.volume_progression_limit;
  if (!progressionLimit) {
    issues.push("Volume progression limits not specified");
    safetyScore -= 1;
  }

  // Check if safety considerations are integrated into personality
  if (!coachConfig.generated_prompts.safety_integrated_prompt) {
    issues.push("Safety considerations not integrated into coach personality");
    safetyScore -= 1;
  }

  // Check if experience level matches programming complexity
  if (
    safetyProfile.experienceLevel === "BEGINNER" &&
    coachConfig.selected_methodology.primary_methodology === "misfit_athletics"
  ) {
    issues.push("High-volume methodology not appropriate for beginner");
    safetyScore -= 2;
  }

  return {
    approved: issues.length === 0 || safetyScore >= 7, // Allow minor issues
    issues,
    safetyScore: Math.max(0, safetyScore),
  };
};

/**
 * Helper function to build coach config prompts
 * Extracted from generateCoachConfig for reusability in hybrid approach
 */
async function buildCoachConfigPrompts(
  session: CoachCreatorSession,
  userProfile: string,
  safetyProfile: any,
  methodologyPreferences: any,
  genderPreference: "male" | "female" | "neutral",
): Promise<{
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string; // For fallback use
}> {
  // Pre-extract values to avoid function calls in template (do this FIRST)
  // Use new AI-powered session-based extraction
  const trainingFrequency = await extractTrainingFrequencyFromSession(session);
  const goalTimeline = await extractGoalTimelineFromSession(session);
  const preferredIntensity =
    await extractIntensityPreferenceFromSession(session);
  // Build a simple session summary for prompt context (not for Pinecone storage).
  // The AI-powered generateCoachCreatorSessionSummary requires coachConfig which
  // doesn't exist yet at this point in the legacy flow.
  const userResponses =
    session.conversationHistory
      ?.filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" | ") || "No responses";
  const truncatedResponses =
    userResponses.length > 500
      ? userResponses.substring(0, 500) + "..."
      : userResponses;
  const sessionSummary =
    `${session.sophisticationLevel || "unknown"} level athlete. Key responses: ${truncatedResponses}`.replace(
      /"/g,
      '\\"',
    );

  // Pre-compute all JSON.stringify calls once to avoid repetition in template
  const programmingFocusJson = JSON.stringify(
    methodologyPreferences.focus || ["strength", "conditioning"],
  );
  const specializationsJson = JSON.stringify(
    await extractSpecializationsFromSession(session),
  );
  const injuryConsiderationsJson = JSON.stringify(safetyProfile.injuries);
  const equipmentAvailableJson = JSON.stringify(safetyProfile.equipment);

  // Transform timeConstraints to match schema expectations
  const timeConstraintsFormatted = {
    preferred_time: safetyProfile.timeConstraints?.preferred_time || "flexible",
    session_duration: safetyProfile.timeConstraints?.session_length
      ? `${safetyProfile.timeConstraints.session_length} minutes`
      : "45-60 minutes",
    weekly_frequency: `${trainingFrequency} days per week`,
  };
  const timeConstraintsJson = JSON.stringify(timeConstraintsFormatted);

  const contraindicatedExercisesJson = JSON.stringify(
    safetyProfile.contraindications,
  );
  const requiredModificationsJson = JSON.stringify(safetyProfile.modifications);
  const recoveryRequirementsJson = JSON.stringify(safetyProfile.recoveryNeeds);
  const safetyMonitoringJson = JSON.stringify(
    SAFETY_RULES.filter((rule) => rule.severity === "critical").map(
      (rule) => rule.id,
    ),
  );
  const enabledModificationsJson = JSON.stringify(
    Object.keys(COACH_MODIFICATION_OPTIONS),
  );
  const safetyProfileJson = JSON.stringify(safetyProfile, null, 2); // Pretty-printed for AI readability
  const methodologyProfileJson = JSON.stringify(
    methodologyPreferences,
    null,
    2,
  ); // Pretty-printed for AI readability

  const finalPrompt = `You are NeonPanda's expert AI coach creator. Your mission is to design a highly personalized, powerfully effective coach that matches this user's unique needs, goals, and constraints.

NEONPANDA BRAND PHILOSOPHY:
You embody "playful power" - seriously smart coaching wrapped in an approachable, energetic package. The coaches you create should feel like:
- A knowledgeable friend who happens to be an incredible coach
- Confidently capable without being intimidating
- Supportive and motivating without being overly enthusiastic or cheesy
- Technically precise when needed, but always clearly communicated
- Professional yet personable - no corporate fitness-speak

Think: Electric energy meets approachable excellence. Serious results, refreshingly fun approach.

USER PROFILE SUMMARY:
${userProfile}

USER SOPHISTICATION: ${session.sophisticationLevel}
SESSION CONVERSATION LENGTH: ${session.conversationHistory.length} messages

⚠️  CRITICAL GENDER REQUIREMENT ⚠️
USER'S COACH GENDER PREFERENCE: ${genderPreference}

**DO NOT CONFUSE USER'S PERSONAL GENDER WITH COACH GENDER PREFERENCE**
- The USER may be male, female, or non-binary (this is IRRELEVANT)
- The COACH must be ${genderPreference} (this is what matters)
- A male user CAN want a female coach
- A female user CAN want a male coach
- Focus ONLY on the coach gender preference: ${genderPreference}

${
  genderPreference === "male"
    ? `✅ CREATE A **MALE** COACH:
  - Coach identifies as MALE and uses he/him pronouns
  - Coach name must be masculine (e.g., Marcus, Alex, Jason, Tyler)
  - Embody masculine coaching characteristics: confident, direct, assertive, straight-talking
  - Use masculine language patterns and energy in all communications
  - Display typical male coach traits: competitiveness, challenge-driven, results-focused
  - Think and communicate like a male fitness coach would`
    : genderPreference === "female"
      ? `✅ CREATE A **FEMALE** COACH:
  - Coach identifies as FEMALE and uses she/her pronouns
  - Coach name must be feminine (e.g., Emma, Diana, Sarah, Jessica)
  - Embody feminine coaching characteristics: warm, empathetic, nurturing, supportive
  - Use feminine language patterns and energy in all communications
  - Display typical female coach traits: relationship-building, holistic approach, encouragement-focused
  - Think and communicate like a female fitness coach would`
      : `✅ CREATE A **GENDER-NEUTRAL** COACH:
  - Use gender-neutral naming and pronouns (they/them)
  - Balanced professional characteristics
  - Blend confidence with empathy in communication style`
}

SAFETY PROFILE:
${safetyProfileJson}

METHODOLOGY PREFERENCES (Base extracted from user responses):
${methodologyProfileJson}

IMPORTANT: The AI should ENHANCE the methodology_profile with additional rich, specific details based on the full conversation:
- "primary": The primary methodology identifier (e.g., "FUNCTIONAL_BODYBUILDING", "COMPTRAIN_STRENGTH")
- "focus": Array of specific goal areas user mentioned (e.g., ["body_recomposition", "gymnastics_skills", "overhead_strength", "movement_quality"])
- "preferences": Array of coaching approach preferences (e.g., ["technical_progression", "balanced_coaching", "consistency_focus", "aesthetic_goals"])
- "experience": Array of user experience markers (e.g., ["returning_to_training", "intermediate_skill_level", "home_gym_training"])

The AI should extract these from the user's actual responses and create descriptive, specific arrays that will be displayed in the UI.

AVAILABLE COACH PERSONALITIES:
${COACH_PERSONALITY_TEMPLATES.map(
  (template) =>
    `${template.id.toUpperCase()}: ${template.name}
  Description: ${template.description}
  Best for: ${template.bestFor.join(", ")}
  Communication Style: ${template.communicationStyle}
  Programming Approach: ${template.programmingApproach}
  Motivation Style: ${template.motivationStyle}`,
).join("\n\n")}

AVAILABLE METHODOLOGIES:
${METHODOLOGY_TEMPLATES.map(
  (method) =>
    `${method.id.toUpperCase()}: ${method.name}
  Description: ${method.description}
  Best for: ${method.bestFor.join(", ")}
  Programming Approach: ${method.programmingApproach}
  Strength Focus: ${method.strengthBias}
  Conditioning: ${method.conditioningApproach}`,
).join("\n\n")}

CRITICAL SAFETY RULES TO INTEGRATE:
${SAFETY_RULES.filter((rule) => rule.severity === "critical")
  .map((rule) => `- ${rule.rule} (${rule.category})`)
  .join("\n")}

IMPORTANT: You must select the most appropriate personality template and methodology based on the user's complete profile. Do not just use defaults - analyze their responses and choose what will work best for THIS specific user.

COACH DESCRIPTION GUIDELINES (for "coach_description" field):
Create a concise, punchy 3-5 word description that captures the coach's specialty. Keep it professional but energetic - avoid corporate fitness-speak. Examples:
- "Strength & Technical Excellence" (powerlifting/technique)
- "Movement Quality Specialist" (mobility/form focus)
- "Endurance & Mental Grit" (cardio/resilience)
- "Olympic Lifting Expert" (weightlifting technique)
- "Competition Performance Coach" (contest prep)
- "Foundation Building Coach" (new athletes)
- "High-Intensity Conditioning Pro" (conditioning focus)
- "Injury Prevention Specialist" (rehabilitation/safety)

PERSONALITY SELECTION GUIDELINES (Common Patterns - NOT Strict Rules):
These are typical alignments, but always prioritize the user's complete profile:
- Beginner/returning to fitness/lacks confidence → Often Emma (Encouraging)
- Intermediate/skill-focused/wants technical improvement → Often Marcus (Technical)
- Advanced/competitive/performance-focused → Often Diana (Competitive)
- Busy lifestyle/work-life balance/sustainable approach → Often Alex (Balanced)

Consider combinations and exceptions:
- Beginner who wants competition prep → Maybe Emma + Diana blend
- Advanced athlete with injury concerns → Maybe Marcus (technical focus on form)
- Competitive but time-constrained → Maybe Diana + Alex blend

METHODOLOGY SELECTION GUIDELINES (Common Patterns - NOT Strict Rules):
These are typical alignments, but analyze the FULL user profile for the best fit:
- Strength-focused goals → Often CompTrain Strength
- Conditioning/high-intensity preference → Often Mayhem Conditioning
- Competition preparation → Often HWPO Training
- Injury prevention/masters athletes → Often Invictus Fitness
- High-volume tolerance → Often Misfit Athletics
- Movement quality focus → Often Functional Bodybuilding
- Individual assessment needed → Often OPEX Fitness
- General fitness/real-world application → Often CrossFit Linchpin
- Balanced development → Often PRVN Fitness

Consider unique user combinations:
- Strength goals + injury history → Maybe Invictus (not CompTrain)
- Conditioning + movement quality → Maybe Functional Bodybuilding (not Mayhem)
- Busy professional + strength focus → CompTrain can work well despite time constraints
- Competition prep + injury recovery → Blend HWPO with Invictus safety protocols

CRITICAL: User's actual responses and full context > Selection guidelines. Choose based on the complete picture, not just one dimension.

Generate a JSON configuration following this EXACT structure (all fields are REQUIRED unless marked optional):

{
  "coach_id": "user_${session.userId}_coach_${Date.now()}",
  "coach_name": "CreativePlayfulNameBasedOnPersonalityAndUserGoals",
  "coach_description": "5WordsOrLessDescribingCoachSpecialty",
  "gender_preference": "${genderPreference}",
  "selected_personality": {
    "primary_template": "emma|marcus|diana|alex",
    "secondary_influences": ["template_id"],
    "selection_reasoning": "Detailed explanation of why this personality was chosen based on user responses",
    "blending_weights": {
      "primary": 0.7,
      "secondary": 0.3
    }
  },
  "selected_methodology": {
    "primary_methodology": "methodology_id_from_templates",
    "methodology_reasoning": "Why this methodology fits user's goals and preferences",
    "programming_emphasis": "strength|conditioning|balanced",
    "periodization_approach": "linear|conjugate|block|daily_undulating",
    "creativity_emphasis": "high_variety|medium_variety|low_variety",
    "workout_innovation": "enabled|disabled"
  },
  "technical_config": {
    "methodology": "${methodologyPreferences.primary || "hybrid"}",
    "programming_focus": ${programmingFocusJson},
    "experience_level": "${session.sophisticationLevel.toLowerCase()}",
    "training_frequency": ${trainingFrequency},
    "specializations": ${specializationsJson},
    "injury_considerations": ${injuryConsiderationsJson},
    "goal_timeline": "${goalTimeline}",
    "preferred_intensity": "${preferredIntensity}",
    "equipment_available": ${equipmentAvailableJson},
    "time_constraints": ${timeConstraintsJson},
    "safety_constraints": {
      "volume_progression_limit": "${safetyProfile.experienceLevel === "BEGINNER" ? "10" : "5"}%_weekly",
      "contraindicated_exercises": ${contraindicatedExercisesJson},
      "required_modifications": ${requiredModificationsJson},
      "recovery_requirements": ${recoveryRequirementsJson},
      "safety_monitoring": ${safetyMonitoringJson}
    }
  },
  "generated_prompts": {
    "personality_prompt": "Generate a comprehensive personality prompt that blends the selected template with user-specific adaptations. This should be a complete, ready-to-use system prompt for the AI coach.",
    "safety_integrated_prompt": "Create safety-aware coaching personality with specific injury and limitation awareness. Reference the user's specific injuries and constraints.",
    "motivation_prompt": "Design motivation approach based on user's stated preferences and learning style. Be specific to this user's psychological profile.",
    "methodology_prompt": "Programming approach integrating selected methodology with safety constraints. Explain how this methodology will be adapted for this user.",
    "communication_style": "Response format and interaction style based on user's learning preferences. Include response length, technical detail level, and frequency of check-ins.",
    "learning_adaptation_prompt": "Teaching approach based on user's learning style and experience level. Explain how to adapt explanations and progressions for this user.",
    "gender_tone_prompt": "${
      genderPreference === "male"
        ? "You are a MALE fitness coach. Identify as male, use he/him pronouns, and embody masculine coaching characteristics throughout all interactions. Adopt a confident, direct, assertive communication style with straight-talk language patterns. Display competitiveness, challenge-driven motivation, and results-focused energy. Think, speak, and coach like a male fitness professional - be bold, direct, and commanding in your approach while maintaining professionalism."
        : genderPreference === "female"
          ? "You are a FEMALE fitness coach. Identify as female, use she/her pronouns, and embody feminine coaching characteristics throughout all interactions. Adopt a warm, empathetic, nurturing communication style with supportive language patterns. Display relationship-building skills, holistic thinking, and encouragement-focused energy. Think, speak, and coach like a female fitness professional - be compassionate, detailed, and emotionally intelligent in your approach while maintaining high standards."
          : "Maintain a gender-neutral coaching persona with balanced professional characteristics. Blend confidence with empathy in your communication style."
    }"
  },
  "modification_capabilities": {
    "enabled_modifications": ${enabledModificationsJson},
    "personality_flexibility": "high|medium|low",
    "programming_adaptability": "high|medium|low",
    "creative_programming": "high|medium|low",
    "workout_variety_emphasis": "high|medium|low",
    "safety_override_level": "none|limited|moderate"
  },
  "metadata": {
    "version": "1.0",
    "created_date": "${new Date().toISOString()}",
    "user_satisfaction": null,
    "total_conversations": 0,
    "safety_profile": ${safetyProfileJson},
    "methodology_profile": ${methodologyProfileJson},
    "coach_creator_session_summary": "${sessionSummary}"
  }
}

CRITICAL FIELD REQUIREMENTS:
- time_constraints MUST be an object with preferred_time, session_duration, and weekly_frequency properties
- All 7 generated_prompts fields are REQUIRED (personality_prompt, safety_integrated_prompt, motivation_prompt, methodology_prompt, communication_style, learning_adaptation_prompt, gender_tone_prompt)
- training_frequency MUST be a number between 1 and 7
- experience_level MUST be "beginner", "intermediate", or "advanced" (lowercase)
- All array fields (programming_focus, specializations, etc.) can be empty arrays if no data is available

COACH NAME GENERATION REQUIREMENTS:
Generate a creative, energetic coach name that embodies NeonPanda's "playful power" philosophy:
- Incorporates the selected personality template name (Emma, Marcus, Diana, or Alex)
- Reflects the user's primary goals and training focus
- ${genderPreference !== "neutral" ? `MUST align with ${genderPreference} gender - select ${genderPreference === "male" ? "Marcus, Alex (masculine version), or create a masculine variant" : "Emma, Diana, or create a feminine variant"}` : "Uses gender-neutral naming patterns"}
- Fun and memorable but professional (not cheesy or overly enthusiastic)
- Examples: "Marcus_the_Form_Master", "Emma_Your_Foundation", "Diana_the_PR_Crusher", "Alex_Your_Balance_Partner"
- Keep it under 25 characters and use underscores for readability
- Make it unique and personalized to THIS user's specific goals and personality match
- Avoid generic gym bro language or corporate fitness jargon

CRITICAL GENDER REQUIREMENTS:
${
  genderPreference === "male"
    ? `- The coach MUST BE MALE - use masculine names, male pronouns, and male persona
  - Personality prompt must establish coach as male and embody masculine coaching traits
  - All generated prompts should reinforce male coach identity and characteristics`
    : genderPreference === "female"
      ? `- The coach MUST BE FEMALE - use feminine names, female pronouns, and female persona
  - Personality prompt must establish coach as female and embody feminine coaching traits
  - All generated prompts should reinforce female coach identity and characteristics`
      : `- The coach should be gender-neutral with balanced characteristics`
}

CRITICAL REQUIREMENTS:
1. Analyze the user's complete profile and select the MOST APPROPRIATE personality and methodology
2. Generate a creative coach name that embodies NeonPanda's "playful power" brand (energetic but professional)
3. The personality_prompt must be a complete, ready-to-use system prompt that reflects NeonPanda's approachable excellence
4. All generated prompts must reference specific user details from their responses
5. Safety constraints must be comprehensively integrated based on injuries and limitations
6. The configuration must be internally consistent and coherent
7. Coach tone should be: confidently knowledgeable, supportive without being cheesy, energetic without being exhausting

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}`;

  const userMessage = `Generate my comprehensive coach configuration. I am a ${session.sophisticationLevel.toLowerCase()} level athlete who completed a ${session.conversationHistory.length} message intake conversation. Create a coach that perfectly matches my specific needs and goals.`;

  return {
    systemPrompt: finalPrompt,
    userPrompt: userMessage,
    fullPrompt: finalPrompt, // For fallback, includes all instructions
  };
}

// Generate final coach configuration
export const generateCoachConfig = async (
  session: CoachCreatorSession,
  creationTimestamp?: string,
): Promise<CoachConfig> => {
  // Build user profile from conversation history for better AI context
  const userProfile = session.conversationHistory
    .map((msg: CoachMessage) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");

  // Extract structured data - use new AI-powered session-based extraction
  // Run all extractions in parallel for better performance (~60-70% faster)
  const [safetyProfile, methodologyPreferences, genderPreference] =
    await Promise.all([
      extractSafetyProfileFromSession(session),
      extractMethodologyPreferencesFromSession(session),
      extractGenderPreferenceFromSession(session),
    ]);

  // Build prompts using helper function
  const { systemPrompt, userPrompt, fullPrompt } =
    await buildCoachConfigPrompts(
      session,
      userProfile,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
    );

  // Store prompt in S3 for debugging
  const promptContent = `SYSTEM PROMPT:\n${systemPrompt}\n\nUSER MESSAGE:\n${userPrompt}`;

  try {
    await storeDebugDataInS3(
      promptContent,
      {
        type: "coach-config-prompt",
        userId: session.userId,
        sessionId: session.sessionId,
        sophisticationLevel: session.sophisticationLevel,
        conversationLength: session.conversationHistory.length,
        promptLength: promptContent.length,
      },
      "coach-config",
    );
    console.info("✅ Stored coach config prompt in S3 for debugging");
  } catch (err) {
    console.warn(
      "⚠️ Failed to store coach config prompt in S3 (non-critical):",
      err,
    );
  }

  // HYBRID APPROACH: Try tool-based generation first, fallback to prompt-based
  let coachConfig: CoachConfig;
  let generationMethod: "tool" | "fallback" = "tool";
  let coachConfigResponse: string = "";

  try {
    // PRIMARY: Tool-based generation with schema enforcement
    console.info("🎯 Attempting tool-based coach config generation");

    const result = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL, // Claude Sonnet 4.5 for complex orchestration
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        tools: {
          name: "generate_coach_config",
          description:
            "Generate a comprehensive AI coach configuration based on user profile and preferences",
          inputSchema: COACH_CONFIG_SCHEMA,
        },
        expectedToolName: "generate_coach_config",
      },
    );

    // Extract coach config from tool use result
    if (typeof result !== "string") {
      coachConfig = result.input as CoachConfig;
      console.info("✅ Tool-based generation succeeded");

      // Store successful tool generation for analysis
      try {
        await storeDebugDataInS3(
          JSON.stringify(coachConfig, null, 2),
          {
            type: "coach-config-tool-success",
            method: "tool",
            userId: session.userId,
            sessionId: session.sessionId,
            sophisticationLevel: session.sophisticationLevel,
          },
          "coach-config",
        );
      } catch (err) {
        console.warn(
          "⚠️ Failed to store tool success data in S3 (non-critical):",
          err,
        );
      }
    } else {
      throw new Error("Tool use expected but received text response");
    }
  } catch (toolError) {
    // FALLBACK: Prompt-based generation with JSON parsing
    console.warn("⚠️ Tool-based generation failed, using fallback:", toolError);
    generationMethod = "fallback";

    console.info("🔄 Falling back to prompt-based generation");
    const fallbackResult = (await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL, // Claude Sonnet 4.5 for complex orchestration
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        staticPrompt: systemPrompt, // Cache the large static prompt
        dynamicPrompt: "", // No dynamic content
      },
    )) as string;

    coachConfigResponse = fallbackResult;
    console.info("✅ Fallback generation completed");

    // Store fallback response and error for debugging
    try {
      await storeDebugDataInS3(
        JSON.stringify(
          {
            toolError:
              toolError instanceof Error
                ? toolError.message
                : String(toolError),
            toolStack: toolError instanceof Error ? toolError.stack : undefined,
            fallbackResponse: fallbackResult,
          },
          null,
          2,
        ),
        {
          type: "coach-config-fallback",
          reason: "tool_generation_failed",
          userId: session.userId,
          sessionId: session.sessionId,
          sophisticationLevel: session.sophisticationLevel,
          errorMessage:
            toolError instanceof Error ? toolError.message : String(toolError),
        },
        "coach-config",
      );
      console.info("✅ Stored fallback debug data in S3");
    } catch (err) {
      console.warn(
        "⚠️ Failed to store fallback data in S3 (non-critical):",
        err,
      );
    }

    // Parse JSON with cleaning and fixing (handles markdown-wrapped JSON and common issues)
    coachConfig = parseJsonWithFallbacks(coachConfigResponse);
  }

  // Set created_date programmatically using consistent timestamp (FIX 2.3)
  // This ensures all timestamps (DynamoDB createdAt, updatedAt, and metadata.created_date) match
  if (!coachConfig.metadata) {
    coachConfig.metadata = {} as any;
  }
  const timestamp = creationTimestamp || new Date().toISOString();
  coachConfig.metadata.created_date = timestamp;
  coachConfig.metadata.generation_method = generationMethod;
  coachConfig.metadata.generation_timestamp = timestamp;
  console.info("📅 Coach config metadata set:", {
    created_date: coachConfig.metadata.created_date,
    generation_method: generationMethod,
    generation_timestamp: coachConfig.metadata.generation_timestamp,
  });

  try {
    // Validate against schema (always run regardless of generation method)
    console.info(
      `🔍 Validating coach config against schema (method: ${generationMethod})...`,
    );
    const schemaValidation = validateCoachConfig(coachConfig);
    if (!schemaValidation.isValid) {
      console.warn(
        `⚠️ Schema validation issues (${generationMethod}):`,
        schemaValidation.errors,
      );

      // Store validation failures for analysis
      try {
        await storeDebugDataInS3(
          JSON.stringify(
            {
              method: generationMethod,
              validationErrors: schemaValidation.errors,
              config: coachConfig,
            },
            null,
            2,
          ),
          {
            type: "coach-config-validation-failure",
            userId: session.userId,
            sessionId: session.sessionId,
            generationMethod,
          },
          "coach-config-validation",
        );
      } catch (err) {
        console.warn(
          "⚠️ Failed to store validation failure in S3 (non-critical):",
          err,
        );
      }
    } else {
      console.info(
        `✅ Coach config passed schema validation (method: ${generationMethod})`,
      );
    }

    // CRITICAL: Validate gender preference matches user's request
    if (coachConfig.gender_preference !== genderPreference) {
      const genderError = `Gender mismatch: User requested ${genderPreference} coach but generated config has ${coachConfig.gender_preference}`;
      console.error(`❌ ${genderError}`);

      // Store gender mismatch for analysis
      try {
        await storeDebugDataInS3(
          JSON.stringify(
            {
              method: generationMethod,
              requestedGender: genderPreference,
              generatedGender: coachConfig.gender_preference,
              coachName: coachConfig.coach_name,
              userProfile: userProfile.substring(0, 500), // First 500 chars for context
              config: coachConfig,
            },
            null,
            2,
          ),
          {
            type: "coach-config-gender-mismatch",
            userId: session.userId,
            sessionId: session.sessionId,
            generationMethod,
            requestedGender: genderPreference,
            generatedGender: coachConfig.gender_preference,
          },
          "coach-config-validation",
        );
      } catch (err) {
        console.warn(
          "⚠️ Failed to store gender mismatch in S3 (non-critical):",
          err,
        );
      }

      throw new Error(genderError);
    }
    console.info(`✅ Gender preference validation passed: ${genderPreference}`);

    // Validate required fields exist
    if (!coachConfig.coach_name) {
      throw new Error("Missing coach name");
    }

    if (!coachConfig.selected_personality?.primary_template) {
      throw new Error("Missing personality template selection");
    }

    if (!coachConfig.selected_methodology?.primary_methodology) {
      throw new Error("Missing methodology selection");
    }

    if (!coachConfig.generated_prompts?.personality_prompt) {
      throw new Error("Missing generated personality prompt");
    }

    // Validate safety integration
    const safetyValidation = await validateCoachConfigSafety(
      coachConfig,
      safetyProfile,
    );
    if (!safetyValidation.approved) {
      console.warn("⚠️ Safety validation issues:", safetyValidation.issues);
      // Don't fail completely, but log the issues
    } else {
      console.info("✅ Coach config passed safety validation");
    }

    // Validate personality coherence
    const personalityValidation =
      await validatePersonalityCoherence(coachConfig);
    if (personalityValidation.consistency_score < 7) {
      console.warn(
        "⚠️ Personality coherence issues detected:",
        personalityValidation.conflicting_traits,
      );
    } else {
      console.info("✅ Coach config passed personality coherence validation");
    }

    // Note: Pinecone storage is now handled by the calling function (build-coach-config handler)
    // This allows for better separation of concerns and proper error handling

    // Log generation metrics for monitoring
    console.info("📊 Coach config generation metrics:", {
      userId: session.userId,
      sessionId: session.sessionId,
      generationMethod,
      validationPassed: schemaValidation.isValid,
      validationErrorCount: schemaValidation.errors?.length || 0,
      timestamp: new Date().toISOString(),
    });

    console.info("✅ Coach config generation complete and validated");
    return coachConfig;
  } catch (error) {
    console.error("❌ Failed to parse or validate coach configuration:", error);
    throw new Error(
      `Failed to generate valid coach configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
