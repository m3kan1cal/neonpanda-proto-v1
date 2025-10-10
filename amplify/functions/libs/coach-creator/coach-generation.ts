import { CoachCreatorSession, PersonalityCoherenceCheck, CoachPersonalityTemplate, MethodologyTemplate, SafetyRule, CoachModificationCapabilities, CoachConfig } from './types';
import { callBedrockApi, storeDebugDataInS3 } from '../api-helpers';
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from '../prompt-helpers';
import { extractSafetyProfile, extractMethodologyPreferences, extractTrainingFrequency, extractSpecializations, extractGoalTimeline, extractIntensityPreference } from './data-extraction';
import { generateCoachCreatorSessionSummary } from './session-management';
import { COACH_CREATOR_QUESTIONS } from './question-management';

// Coach Personality Templates
export const COACH_PERSONALITY_TEMPLATES: CoachPersonalityTemplate[] = [
  {
    id: "emma",
    name: "Emma - The Encouraging Coach",
    description: "Patient, supportive coach who excels at building confidence and teaching fundamentals",
    primaryTraits: ["patient", "encouraging", "safety-focused", "educational"],
    communicationStyle: "simple_language, positive_reinforcement, question_asking",
    programmingApproach: "gradual_progression, multiple_scaling_options, habit_formation",
    motivationStyle: "celebrate_small_wins, progress_over_perfection, non_judgmental",
    bestFor: ["foundation_building", "returning_to_fitness", "confidence_building", "injury_recovery"],
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
- Build confidence by ensuring early success experiences`
  },
  {
    id: "marcus",
    name: "Marcus - The Technical Skills Expert",
    description: "Master coach who specializes in skill development and technical excellence",
    primaryTraits: ["analytical", "technical", "methodical", "skill-focused"],
    communicationStyle: "detailed_explanations, technical_precision, educational_approach",
    programmingApproach: "skill_progression, weakness_identification, periodized_development",
    motivationStyle: "competence_building, problem_solving, achievement_recognition",
    bestFor: ["skill_development", "technical_improvement", "systematic_progression", "movement_mastery"],
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
- Competition preparation and strategy`
  },
  {
    id: "diana",
    name: "Diana - The Elite Performance Expert",
    description: "Elite-level coach who develops champions and maximizes athletic potential",
    primaryTraits: ["demanding", "performance-focused", "strategic", "results-driven"],
    communicationStyle: "direct_feedback, performance_oriented, goal_focused",
    programmingApproach: "periodized_peaking, competition_prep, advanced_methods",
    motivationStyle: "challenge_driven, performance_standards, competitive_spirit",
    bestFor: ["competitive_athletes", "performance_goals", "mental_toughness", "competition_prep"],
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
- Injury prevention through intelligent programming`
  },
  {
    id: "alex",
    name: "Alex - The Lifestyle Integration Expert",
    description: "Master of sustainable fitness who transforms how busy people achieve their goals",
    primaryTraits: ["practical", "adaptable", "lifestyle-focused", "sustainable"],
    communicationStyle: "realistic_planning, flexible_approach, lifestyle_integration",
    programmingApproach: "time_efficient, adaptable_programming, sustainable_habits",
    motivationStyle: "lifestyle_benefits, flexible_goals, long_term_thinking",
    bestFor: ["busy_professionals", "parents", "lifestyle_balance", "sustainable_fitness"],
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
- Show them how fitness supports their other life goals and responsibilities`
  }
];

// Methodology Integration implementation
export const METHODOLOGY_TEMPLATES: MethodologyTemplate[] = [
  {
    id: "comptrain_strength",
    name: "CompTrain Strength Focus",
    description: "Ben Bergeron's methodology emphasizing consistent strength progression with intelligent conditioning",
    principles: ["consistent_progressive_overload", "quality_over_quantity", "sustainable_progression"],
    programmingApproach: "Linear progression with intelligent deloads, emphasis on compound movements",
    bestFor: ["strength_focused_goals", "systematic_progression", "long_term_development"],
    strengthBias: "high",
    conditioningApproach: "supportive_but_structured"
  },
  {
    id: "mayhem_conditioning",
    name: "Mayhem Athletic Conditioning",
    description: "Rich Froning's high-intensity conditioning focus with strength as accessory",
    principles: ["high_intensity_conditioning", "work_capacity", "competitive_readiness"],
    programmingApproach: "Conditioning-focused with strength to support performance",
    bestFor: ["conditioning_goals", "competition_prep", "high_work_capacity"],
    strengthBias: "moderate",
    conditioningApproach: "primary_focus_high_intensity"
  },
  {
    id: "hwpo_training",
    name: "HWPO Training",
    description: "Mat Fraser's comprehensive approach balancing strength, conditioning, and sport-specific skills",
    principles: ["well_rounded_development", "competition_preparation", "weakness_identification"],
    programmingApproach: "Balanced approach with emphasis on identifying and addressing weaknesses",
    bestFor: ["competition_preparation", "well_rounded_fitness", "elite_performance"],
    strengthBias: "balanced",
    conditioningApproach: "sport_specific_conditioning"
  },
  {
    id: "invictus_fitness",
    name: "Invictus Fitness",
    description: "CJ Martin's methodology focusing on intelligent programming and injury prevention",
    principles: ["injury_prevention", "intelligent_progression", "sustainable_training"],
    programmingApproach: "Conservative progression with emphasis on movement quality and longevity",
    bestFor: ["injury_prevention", "masters_athletes", "sustainable_fitness"],
    strengthBias: "moderate",
    conditioningApproach: "sustainable_intensity"
  },
  {
    id: "misfit_athletics",
    name: "Misfit Athletics",
    description: "Drew Crandall's high-volume approach for competitive CrossFit athletes",
    principles: ["high_volume_training", "competitive_focus", "systematic_peaking"],
    programmingApproach: "High-volume training with systematic peaking for competition",
    bestFor: ["competitive_athletes", "high_volume_tolerance", "systematic_peaking"],
    strengthBias: "high",
    conditioningApproach: "high_volume_conditioning"
  },
  {
    id: "functional_bodybuilding",
    name: "Functional Bodybuilding",
    description: "Marcus Filly's approach combining functional movement with bodybuilding principles",
    principles: ["functional_movement", "bodybuilding_principles", "movement_quality"],
    programmingApproach: "Functional movements with bodybuilding rep schemes and movement quality focus",
    bestFor: ["movement_quality", "aesthetic_goals", "joint_health"],
    strengthBias: "moderate",
    conditioningApproach: "moderate_sustainable"
  },
  {
    id: "opex_fitness",
    name: "OPEX Fitness",
    description: "James Fitzgerald's individualized approach based on assessment and energy system development",
    principles: ["individualized_programming", "energy_system_development", "assessment_based"],
    programmingApproach: "Highly individualized based on comprehensive assessment and energy system needs",
    bestFor: ["individualized_approach", "energy_system_development", "assessment_based_training"],
    strengthBias: "individualized",
    conditioningApproach: "energy_system_specific"
  },
  {
    id: "crossfit_linchpin",
    name: "CrossFit Linchpin",
    description: "Pat Sherwood's approach focusing on general physical preparedness and real-world application",
    principles: ["general_physical_preparedness", "real_world_application", "functional_fitness"],
    programmingApproach: "GPP-focused with emphasis on functional, real-world movement patterns",
    bestFor: ["general_fitness", "functional_movement", "real_world_application"],
    strengthBias: "moderate",
    conditioningApproach: "functional_conditioning"
  },
  {
    id: "prvn_fitness",
    name: "PRVN Fitness",
    description: "Programming focused on balanced development with emphasis on strength and conditioning integration",
    principles: ["balanced_development", "strength_conditioning_integration", "progressive_overload"],
    programmingApproach: "Balanced strength and conditioning with systematic progression",
    bestFor: ["balanced_development", "strength_conditioning_balance", "systematic_progression"],
    strengthBias: "balanced",
    conditioningApproach: "integrated_conditioning"
  }
];

// Complete Safety Rules (15 rules from architecture documents)
export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "volume_progression",
    rule: "Maximum 10% volume increase per week for beginners, 5% for advanced users",
    category: "progression",
    severity: "critical",
    validation: "Check weekly volume increases in programming recommendations"
  },
  {
    id: "injury_considerations",
    rule: "Always consider user's injury history and current limitations in exercise selection",
    category: "injury_prevention",
    severity: "critical",
    validation: "Verify injury history is reflected in contraindicated exercises list"
  },
  {
    id: "experience_appropriate",
    rule: "Complex movements require prerequisite competency demonstration",
    category: "exercise_selection",
    severity: "high",
    validation: "Ensure complex movements have prerequisite requirements listed"
  },
  {
    id: "recovery_requirements",
    rule: "Mandatory rest days and deload periods based on training intensity and user capacity",
    category: "recovery",
    severity: "high",
    validation: "Check that programming includes appropriate recovery periods"
  },
  {
    id: "equipment_safety",
    rule: "Only recommend exercises for equipment user has confirmed access to and competency with",
    category: "equipment",
    severity: "high",
    validation: "Cross-reference exercise recommendations with user's available equipment"
  },
  {
    id: "realistic_expectations",
    rule: "Goal timelines must be realistic based on user's experience, commitment, and starting point",
    category: "goal_setting",
    severity: "medium",
    validation: "Assess goal timeline feasibility against user profile"
  },
  {
    id: "overtraining_prevention",
    rule: "Monitor for signs of overtraining and provide guidance on intensity management",
    category: "recovery",
    severity: "high",
    validation: "Include overtraining awareness in coach personality and programming"
  },
  {
    id: "form_over_intensity",
    rule: "Always prioritize movement quality and proper form over weight, speed, or intensity",
    category: "exercise_execution",
    severity: "critical",
    validation: "Ensure coach emphasizes form and technique in all programming"
  },
  {
    id: "contraindicated_exercises",
    rule: "Avoid exercises that are specifically contraindicated for user's injury history",
    category: "injury_prevention",
    severity: "critical",
    validation: "Maintain and enforce contraindicated exercise list based on injuries"
  },
  {
    id: "age_appropriate",
    rule: "Programming must be appropriate for user's age and physical development stage",
    category: "exercise_selection",
    severity: "high",
    validation: "Consider age-related factors in exercise selection and intensity"
  },
  {
    id: "pain_vs_discomfort",
    rule: "Coach must distinguish between beneficial training discomfort and harmful pain",
    category: "injury_prevention",
    severity: "critical",
    validation: "Include pain assessment and management in coach education"
  },
  {
    id: "environmental_safety",
    rule: "Consider training environment safety factors (space, flooring, supervision)",
    category: "environment",
    severity: "medium",
    validation: "Account for user's training environment in exercise recommendations"
  },
  {
    id: "medication_interactions",
    rule: "Be aware of common medications that may affect exercise capacity or safety",
    category: "medical_considerations",
    severity: "medium",
    validation: "Include medication awareness in coach safety education"
  },
  {
    id: "emergency_protocols",
    rule: "Coach should know when to recommend stopping exercise and seeking medical attention",
    category: "emergency_response",
    severity: "critical",
    validation: "Include emergency recognition and response protocols"
  },
  {
    id: "progressive_loading",
    rule: "All loading progressions must follow established biomechanical principles",
    category: "progression",
    severity: "high",
    validation: "Ensure loading progressions follow safe biomechanical patterns"
  }
];

export const COACH_MODIFICATION_OPTIONS: CoachModificationCapabilities = {
  personality_adjustments: [
    "make_more_encouraging",
    "increase_technical_detail",
    "reduce_intensity_pressure",
    "add_humor",
    "increase_directness",
    "add_empathy"
  ],
  programming_focus_changes: [
    "increase_strength_emphasis",
    "add_mobility_focus",
    "reduce_conditioning_volume",
    "add_sport_specificity",
    "increase_recovery_focus"
  ],
  communication_style_tweaks: [
    "shorter_responses",
    "more_detailed_explanations",
    "less_technical_jargon",
    "more_motivational_language",
    "adjust_check_in_frequency"
  ],
  goal_updates: [
    "change_timeline",
    "add_new_goals",
    "modify_priorities",
    "adjust_expectations",
    "update_competition_focus"
  ],
  template_switching: [
    "switch_primary_personality",
    "add_secondary_influence",
    "change_methodology_base",
    "update_coaching_philosophy"
  ]
};

// Validate personality coherence
export const validatePersonalityCoherence = async (coachConfig: CoachConfig): Promise<PersonalityCoherenceCheck> => {
  const personality = coachConfig.selected_personality;
  const methodology = coachConfig.selected_methodology;
  const conflictingTraits = [];
  let consistencyScore = 10;

  // Check for personality conflicts based on your actual templates
  if (personality.primary_template === 'emma' && personality.secondary_influences?.includes('diana')) {
    conflictingTraits.push('encouraging_vs_demanding_conflict');
    consistencyScore -= 2;
  }

  if (personality.primary_template === 'diana' && personality.secondary_influences?.includes('emma')) {
    conflictingTraits.push('performance_vs_beginner_focus_conflict');
    consistencyScore -= 2;
  }

  // Check methodology alignment with personality
  if (methodology.primary_methodology === 'mayhem_conditioning' && personality.primary_template === 'emma') {
    conflictingTraits.push('high_intensity_methodology_vs_beginner_personality');
    consistencyScore -= 1;
  }

  if (methodology.primary_methodology === 'comptrain_strength' && personality.primary_template === 'alex') {
    // This is actually a good match, no penalty
  }

  return {
    consistency_score: Math.max(0, consistencyScore),
    conflicting_traits: conflictingTraits,
    user_alignment_score: 8, // Would need more sophisticated logic
    recommendations: conflictingTraits.length > 0 ? ['Consider adjusting personality blend', 'Review methodology selection'] : []
  };
};

// Validate coach configuration against safety rules
export const validateCoachConfigSafety = async (coachConfig: CoachConfig, safetyProfile: any) => {
  const issues = [];
  let safetyScore = 10;

  // Check if injury considerations are properly integrated
  if (safetyProfile.injuries.length > 0) {
    if (!coachConfig.technical_config.injury_considerations || coachConfig.technical_config.injury_considerations.length === 0) {
      issues.push('Injury considerations not included in technical config');
      safetyScore -= 2;
    }
  }

  // Check if contraindicated exercises are handled
  if (safetyProfile.contraindications.length > 0) {
    if (!coachConfig.technical_config.safety_constraints?.contraindicated_exercises ||
        coachConfig.technical_config.safety_constraints.contraindicated_exercises.length === 0) {
      issues.push('Contraindicated exercises not properly restricted');
      safetyScore -= 2;
    }
  }

  // Check if progression limits are appropriate
  const progressionLimit = coachConfig.technical_config.safety_constraints?.volume_progression_limit;
  if (!progressionLimit) {
    issues.push('Volume progression limits not specified');
    safetyScore -= 1;
  }

  // Check if safety considerations are integrated into personality
  if (!coachConfig.generated_prompts.safety_integrated_prompt) {
    issues.push('Safety considerations not integrated into coach personality');
    safetyScore -= 1;
  }

  // Check if experience level matches programming complexity
  if (safetyProfile.experienceLevel === 'BEGINNER' &&
      coachConfig.selected_methodology.primary_methodology === 'misfit_athletics') {
    issues.push('High-volume methodology not appropriate for beginner');
    safetyScore -= 2;
  }

  return {
    approved: issues.length === 0 || safetyScore >= 7, // Allow minor issues
    issues,
    safetyScore: Math.max(0, safetyScore)
  };
};



// Generate final coach configuration
export const generateCoachConfig = async (session: CoachCreatorSession): Promise<CoachConfig> => {
  const userProfile = Object.entries(session.userContext.responses)
    .map(([questionId, response]) => {
      const question = COACH_CREATOR_QUESTIONS.find((q: any) => q.id === parseInt(questionId));
      return `${question?.topic || 'Question'}: ${response}`;
    })
    .join('\n');

  const safetyProfile = extractSafetyProfile(session.userContext.responses);
  const methodologyPreferences = extractMethodologyPreferences(session.userContext.responses);

  const finalPrompt = `You are an expert coach creator generating a comprehensive AI coach configuration. Your goal is to create a highly personalized coach that perfectly matches this user's needs, goals, and constraints.

USER PROFILE SUMMARY:
${userProfile}

USER SOPHISTICATION: ${session.userContext.sophisticationLevel}
SESSION DURATION: ${session.questionHistory.length} questions completed

SAFETY PROFILE:
${JSON.stringify(safetyProfile, null, 2)}

METHODOLOGY PREFERENCES:
${JSON.stringify(methodologyPreferences, null, 2)}

AVAILABLE COACH PERSONALITIES:
${COACH_PERSONALITY_TEMPLATES.map(template =>
  `${template.id.toUpperCase()}: ${template.name}
  Description: ${template.description}
  Best for: ${template.bestFor.join(', ')}
  Communication Style: ${template.communicationStyle}
  Programming Approach: ${template.programmingApproach}
  Motivation Style: ${template.motivationStyle}`
).join('\n\n')}

AVAILABLE METHODOLOGIES:
${METHODOLOGY_TEMPLATES.map(method =>
  `${method.id.toUpperCase()}: ${method.name}
  Description: ${method.description}
  Best for: ${method.bestFor.join(', ')}
  Programming Approach: ${method.programmingApproach}
  Strength Focus: ${method.strengthBias}
  Conditioning: ${method.conditioningApproach}`
).join('\n\n')}

CRITICAL SAFETY RULES TO INTEGRATE:
${SAFETY_RULES.filter(rule => rule.severity === 'critical').map(rule =>
  `- ${rule.rule} (${rule.category})`
).join('\n')}

IMPORTANT: You must select the most appropriate personality template and methodology based on the user's complete profile. Do not just use defaults - analyze their responses and choose what will work best for THIS specific user.

COACH DESCRIPTION GUIDELINES (for "coach_description" field):
Create a concise 3-5 word description that captures the coach's primary specialty and approach. This will be displayed under the coach's name in the chat interface. Examples:
- "Strength & Technical Excellence" (for powerlifting/technique focused)
- "Functional Movement Expert Coach" (for mobility/movement quality focus)
- "Endurance & Mental Toughness" (for cardio/mental resilience)
- "Olympic Lifting Specialist" (for weightlifting technique)
- "Competition Prep Coach" (for contest preparation)
- "Beginner-Friendly Guide" (for new athletes)
- "High-Intensity Conditioning Expert" (for conditioning focus)
- "Injury Prevention Specialist" (for rehabilitation/safety focus)

PERSONALITY SELECTION CRITERIA:
- Beginner/returning to fitness/lacks confidence → Emma (Encouraging)
- Intermediate/skill-focused/wants technical improvement → Marcus (Technical)
- Advanced/competitive/performance-focused → Diana (Competitive)
- Busy lifestyle/work-life balance/sustainable approach → Alex (Balanced)

METHODOLOGY SELECTION CRITERIA:
- Strength-focused goals → CompTrain Strength
- Conditioning/high-intensity preference → Mayhem Conditioning
- Competition preparation → HWPO Training
- Injury prevention/masters athletes → Invictus Fitness
- High-volume tolerance → Misfit Athletics
- Movement quality focus → Functional Bodybuilding
- Individual assessment needed → OPEX Fitness
- General fitness/real-world application → CrossFit Linchpin
- Balanced development → PRVN Fitness

Generate a JSON configuration following this EXACT structure:

{
  "coach_id": "user_${session.userId}_coach_${Date.now()}",
  "coach_name": "CreativePlayfulNameBasedOnPersonalityAndUserGoals",
  "coach_description": "5WordsOrLessDescribingCoachSpecialty",
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
    "methodology": "${methodologyPreferences.primary || 'hybrid'}",
    "programming_focus": ${JSON.stringify(methodologyPreferences.focus || ['strength', 'conditioning'])},
    "experience_level": "${session.userContext.sophisticationLevel.toLowerCase()}",
    "training_frequency": ${extractTrainingFrequency(session.userContext.responses)},
    "specializations": ${JSON.stringify(extractSpecializations(session.userContext.responses))},
    "injury_considerations": ${JSON.stringify(safetyProfile.injuries)},
    "goal_timeline": "${extractGoalTimeline(session.userContext.responses)}",
    "preferred_intensity": "${extractIntensityPreference(session.userContext.responses)}",
    "equipment_available": ${JSON.stringify(safetyProfile.equipment)},
    "time_constraints": ${JSON.stringify(safetyProfile.timeConstraints)},
    "safety_constraints": {
      "volume_progression_limit": "${safetyProfile.experienceLevel === 'BEGINNER' ? '10' : '5'}%_weekly",
      "contraindicated_exercises": ${JSON.stringify(safetyProfile.contraindications)},
      "required_modifications": ${JSON.stringify(safetyProfile.modifications)},
      "recovery_requirements": ${JSON.stringify(safetyProfile.recoveryNeeds)},
      "safety_monitoring": ${JSON.stringify(SAFETY_RULES.filter(rule => rule.severity === 'critical').map(rule => rule.id))}
    }
  },
  "generated_prompts": {
    "personality_prompt": "Generate a comprehensive personality prompt that blends the selected template with user-specific adaptations...",
    "safety_integrated_prompt": "Create safety-aware coaching personality with specific injury and limitation awareness...",
    "motivation_prompt": "Design motivation approach based on user's stated preferences and learning style...",
    "methodology_prompt": "Programming approach integrating selected methodology with safety constraints...",
    "communication_style": "Response format and interaction style based on user's learning preferences...",
    "learning_adaptation_prompt": "Teaching approach based on user's learning style and experience level..."
  },
  "modification_capabilities": {
    "enabled_modifications": ${JSON.stringify(Object.keys(COACH_MODIFICATION_OPTIONS))},
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
    "safety_profile": ${JSON.stringify(safetyProfile)},
    "methodology_profile": ${JSON.stringify(methodologyPreferences)},
    "coach_creator_session_summary": "${generateCoachCreatorSessionSummary(session).replace(/"/g, '\\"')}"
  }
}

COACH NAME GENERATION REQUIREMENTS:
Generate a creative, playful coach name that:
- Incorporates the selected personality template name (Emma, Marcus, Diana, or Alex)
- Reflects the user's primary goals and training focus
- Is fun and memorable but still professional
- Examples: "Marcus_the_Form_Master", "Emma_Your_Confidence_Coach", "Diana_the_PR_Crusher", "Alex_Your_Balance_Buddy"
- Keep it under 25 characters and use underscores or hyphens for readability
- Make it unique and personalized to THIS user's specific goals and personality match

CRITICAL REQUIREMENTS:
1. Analyze the user's complete profile and select the MOST APPROPRIATE personality and methodology
2. Generate a creative coach name that combines the personality template with user-specific goals
3. The personality_prompt must be a complete, ready-to-use system prompt for the AI coach
4. All generated prompts must reference specific user details from their responses
5. Safety constraints must be comprehensively integrated based on injuries and limitations
6. The configuration must be internally consistent and coherent

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}`;

  // Store prompt in S3 for debugging
  const promptContent = `SYSTEM PROMPT:\n${finalPrompt}\n\nUSER MESSAGE:\nGenerate my comprehensive coach configuration. I am a ${session.userContext.sophisticationLevel.toLowerCase()} level user who completed ${session.questionHistory.length} questions. Create a coach that perfectly matches my specific needs and goals.`;

  try {
    await storeDebugDataInS3(
      promptContent,
      {
        userId: session.userId,
        sessionId: session.sessionId,
        sophisticationLevel: session.userContext.sophisticationLevel,
        questionCount: session.questionHistory.length,
        promptLength: promptContent.length,
      },
      'coach-config'
    );
    console.info('✅ Stored coach config prompt in S3 for debugging');
  } catch (err) {
    console.warn('⚠️ Failed to store coach config prompt in S3 (non-critical):', err);
  }

  const coachConfigResponse = await callBedrockApi(
    finalPrompt,
    `Generate my comprehensive coach configuration. I am a ${session.userContext.sophisticationLevel.toLowerCase()} level user
who completed ${session.questionHistory.length} questions. Create a coach that perfectly matches my specific needs and goals.`
  );

  // Store response in S3 for debugging
  try {
    await storeDebugDataInS3(
      coachConfigResponse,
      {
        userId: session.userId,
        sessionId: session.sessionId,
        sophisticationLevel: session.userContext.sophisticationLevel,
        responseLength: coachConfigResponse.length,
      },
      'coach-config'
    );
    console.info('✅ Stored coach config response in S3 for debugging');
  } catch (err) {
    console.warn('⚠️ Failed to store coach config response in S3 (non-critical):', err);
  }

  // Parse JSON with fallback cleaning and fixing (handles markdown-wrapped JSON)
  let coachConfig: CoachConfig;
  try {
    coachConfig = JSON.parse(coachConfigResponse);
  } catch (parseError) {
    console.warn('JSON parsing failed, attempting to clean and fix response...');
    try {
      const { cleanResponse, fixMalformedJson } = await import('../response-utils');
      const cleanedResponse = cleanResponse(coachConfigResponse);
      const fixedResponse = fixMalformedJson(cleanedResponse);
      coachConfig = JSON.parse(fixedResponse);
      console.info('Successfully parsed response after cleaning and fixing');
    } catch (fallbackError) {
      console.error('Failed to parse coach config response after all attempts:', {
        originalResponse: coachConfigResponse.substring(0, 500),
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error',
        fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      });
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`);
    }
  }

  // Set created_date programmatically (not from AI response)
  if (!coachConfig.metadata) {
    coachConfig.metadata = {} as any;
  }
  coachConfig.metadata.created_date = new Date().toISOString();

  try {
    // Validate required fields exist
    if (!coachConfig.coach_name) {
      throw new Error('Missing coach name');
    }

    if (!coachConfig.selected_personality?.primary_template) {
      throw new Error('Missing personality template selection');
    }

    if (!coachConfig.selected_methodology?.primary_methodology) {
      throw new Error('Missing methodology selection');
    }

    if (!coachConfig.generated_prompts?.personality_prompt) {
      throw new Error('Missing generated personality prompt');
    }

    // Validate safety integration
    const safetyValidation = await validateCoachConfigSafety(coachConfig, safetyProfile);
    if (!safetyValidation.approved) {
      console.warn('Safety validation issues:', safetyValidation.issues);
      // Don't fail completely, but log the issues
    }

    // Validate personality coherence
    const personalityValidation = await validatePersonalityCoherence(coachConfig);
    if (personalityValidation.consistency_score < 7) {
      console.warn('Personality coherence issues detected:', personalityValidation.conflicting_traits);
    }

    // Note: Pinecone storage is now handled by the calling function (build-coach-config handler)
    // This allows for better separation of concerns and proper error handling

    return coachConfig;
  } catch (error) {
    console.error('Failed to parse or validate coach configuration:', error);
    throw new Error(`Failed to generate valid coach configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
