import { CoachConfig, DynamoDBItem } from '../coach-creator/types';

/**
 * Coach config input type - can be either direct CoachConfig or DynamoDB item
 */
export type CoachConfigInput = CoachConfig | DynamoDBItem<CoachConfig>;

/**
 * Interface for system prompt generation options
 */
export interface PromptGenerationOptions {
  includeConversationGuidelines?: boolean;
  includeUserContext?: boolean;
  includeDetailedBackground?: boolean;
  conversationContext?: {
    userName?: string;
    currentGoals?: string[];
    sessionNumber?: number;
    previousSessions?: number;
  };
  additionalConstraints?: string[];
}

/**
 * Interface for the complete system prompt result
 */
export interface SystemPrompt {
  systemPrompt: string;
  metadata: {
    coachId: string;
    coachName: string;
    primaryPersonality: string;
    methodology: string;
    safetyConstraints: string[];
    generatedAt: string;
    promptLength: number;
  };
}

/**
 * Interface for coach config validation results
 */
export interface CoachConfigValidationResult {
  isValid: boolean;
  missingComponents: string[];
  warnings: string[];
}

/**
 * Interface for system prompt preview/summary
 */
export interface SystemPromptPreview {
  coachName: string;
  personality: string;
  methodology: string;
  safetyConstraints: number;
  estimatedLength: number;
  keyFeatures: string[];
  dataRichness: string[];
}

/**
 * Generates a complete system prompt from a coach configuration
 * This combines all individual prompts into a coherent coaching personality
 */
export const generateSystemPrompt = (
  coachConfigInput: CoachConfigInput,
  options: PromptGenerationOptions = {}
): SystemPrompt => {
  const {
    includeConversationGuidelines = true,
    includeUserContext = true,
    includeDetailedBackground = true,
    conversationContext,
    additionalConstraints = []
  } = options;

  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig = 'attributes' in coachConfigInput
    ? coachConfigInput.attributes
    : coachConfigInput;

  // Extract core prompts from config
  const {
    personality_prompt,
    safety_integrated_prompt,
    motivation_prompt,
    methodology_prompt,
    communication_style,
    learning_adaptation_prompt
  } = configData.generated_prompts;

  // Build the system prompt sections
  const promptSections = [];

    // 1. Core Identity & Personality
  promptSections.push(`# COACH IDENTITY & PERSONALITY
${personality_prompt}

## Personality Integration & Blending
You are primarily a ${configData.selected_personality.primary_template.toUpperCase()} coach${configData.selected_personality.secondary_influences?.length
  ? ` with ${configData.selected_personality.secondary_influences.join(' and ').toUpperCase()} influences`
  : ''}.

### Personality Blending Weights
- Primary personality (${configData.selected_personality.primary_template}): ${configData.selected_personality.blending_weights?.primary * 100 || 75}%
${configData.selected_personality.secondary_influences?.map((influence, index) =>
  `- Secondary influence (${influence}): ${configData.selected_personality.blending_weights?.secondary * 100 || 25}%`
).join('\n') || ''}

### Selection Reasoning
${configData.selected_personality.selection_reasoning || 'Selected personality aligns with user needs and coaching requirements.'}

# COMMUNICATION STYLE & APPROACH
${communication_style}

# LEARNING & ADAPTATION APPROACH
${learning_adaptation_prompt}`);

  // 2. Methodology & Programming Expertise
  promptSections.push(`# TRAINING METHODOLOGY & PROGRAMMING
${methodology_prompt}

## Methodology Selection Rationale
${configData.selected_methodology.methodology_reasoning || 'Selected methodology aligns with user goals and experience level.'}

## Programming Framework Details
- **Primary Methodology**: ${configData.selected_methodology.primary_methodology}
- **Programming Emphasis**: ${configData.selected_methodology.programming_emphasis || 'balanced'}
- **Periodization Approach**: ${configData.selected_methodology.periodization_approach || 'systematic'}

## Methodology Profile Integration
${configData.metadata?.methodology_profile ? `
Based on the user's methodology profile:
- **Experience Base**: ${configData.metadata.methodology_profile.experience?.join(', ') || 'General fitness background'}
- **Training Focus**: ${configData.metadata.methodology_profile.focus?.join(' and ') || 'Comprehensive fitness'}
- **Programming Preferences**: ${configData.metadata.methodology_profile.preferences?.join(', ') || 'Standard progression'}
- **Primary System**: ${configData.metadata.methodology_profile.primary || configData.selected_methodology.primary_methodology}
` : 'Apply methodology principles systematically and progressively.'}

## Technical Specializations
Your expertise includes: ${configData.technical_config.specializations.join(', ')}

## Programming Focus Areas
Your primary focus is on: ${configData.technical_config.programming_focus.join(', ')}

## Experience Level Adaptation
You are coaching a ${configData.technical_config.experience_level} level athlete. Adjust your explanations, expectations, and progressions accordingly.`);

  // 3. Motivation & Encouragement
  promptSections.push(`# MOTIVATION & ENCOURAGEMENT STRATEGY
${motivation_prompt}`);

  // 4. Safety & Constraints (Critical Section)
  promptSections.push(`# SAFETY PROTOCOLS & CONSTRAINTS
${safety_integrated_prompt}

## Critical Safety Rules
- NEVER recommend exercises in the contraindicated list: ${configData.technical_config.safety_constraints.contraindicated_exercises.join(', ')}
- ALWAYS consider required modifications: ${configData.technical_config.safety_constraints.required_modifications.join(', ')}
- Volume progression must not exceed: ${configData.technical_config.safety_constraints.volume_progression_limit}
- Monitor these areas closely: ${configData.technical_config.safety_constraints.safety_monitoring.join(', ')}

## Specific Injury Considerations
${configData.technical_config.injury_considerations?.length
  ? `Pay special attention to: ${configData.technical_config.injury_considerations.join(', ')}`
  : 'No specific injury history to monitor.'}

## Enhanced Safety Profile Integration
${configData.metadata?.safety_profile ? `
### Environmental Factors
Consider these environmental factors: ${configData.metadata.safety_profile.environmentalFactors?.join(', ') || 'Standard training environment'}

### Learning Considerations
This athlete learns best through: ${configData.metadata.safety_profile.learningConsiderations?.join(', ') || 'Traditional coaching methods'}

### Risk Factors to Monitor
Pay attention to: ${configData.metadata.safety_profile.riskFactors?.join(', ') || 'Standard risk monitoring'}

### Equipment Access
Available equipment: ${configData.metadata.safety_profile.equipment?.join(', ') || 'Basic equipment setup'}
` : ''}

## Recovery Requirements
${configData.technical_config.safety_constraints.recovery_requirements.join(', ')}`);

  // 5. Detailed User Background (if enabled and available)
  if (includeDetailedBackground && configData.metadata?.coach_creator_session_summary) {
    promptSections.push(`# DETAILED USER BACKGROUND
Based on the coach creation session, here's what you know about this user:

${configData.metadata.coach_creator_session_summary}

## Equipment Available
${configData.technical_config.equipment_available.join(', ')}

## Time Constraints
- Preferred training time: ${configData.technical_config.time_constraints.preferred_time || 'Not specified'}
- Session duration: ${configData.technical_config.time_constraints.session_duration || 'Not specified'}
- Weekly frequency: ${configData.technical_config.time_constraints.weekly_frequency || configData.technical_config.training_frequency + ' days'}

## Goal Timeline
${configData.technical_config.goal_timeline}

## Preferred Intensity
${configData.technical_config.preferred_intensity}`);
  }

  // 6. User Context (if provided and enabled)
  if (includeUserContext && conversationContext) {
    const userContextSection = generateUserContext(conversationContext);
    if (userContextSection) {
      promptSections.push(userContextSection);
    }
  }

  // 7. Conversation Guidelines (if enabled)
  if (includeConversationGuidelines) {
    promptSections.push(generateConversationGuidelines(configData));
  }

  // 7. Additional Constraints (if any)
  if (additionalConstraints.length > 0) {
    promptSections.push(`# ADDITIONAL CONSTRAINTS
${additionalConstraints.map(constraint => `- ${constraint}`).join('\n')}`);
  }

  // 8. Coach Adaptation Capabilities
  if (configData.modification_capabilities) {
    promptSections.push(`# COACH ADAPTATION CAPABILITIES
Your ability to adapt and modify approaches:
- Personality Flexibility: ${configData.modification_capabilities.personality_flexibility}
- Programming Adaptability: ${configData.modification_capabilities.programming_adaptability}
- Safety Override Level: ${configData.modification_capabilities.safety_override_level}

## Enabled Modifications
You can adjust: ${configData.modification_capabilities.enabled_modifications?.join(', ') || 'Standard coaching adjustments'}

Use these capabilities to better serve the athlete while maintaining your core coaching identity.`);
  }

  // 9. Final Instructions
  promptSections.push(`# FINAL INSTRUCTIONS
You are now ready to coach this athlete. Remember:
- Stay true to your personality: ${configData.selected_personality.primary_template}
- Apply your methodology: ${configData.selected_methodology.primary_methodology}
- Prioritize safety above all else
- Adapt your communication to their ${configData.technical_config.experience_level} level
- Be consistent with your established coaching style and approach

Begin each conversation by acknowledging the user and being ready to help them with their training.`);

  // Combine all sections
  const systemPrompt = promptSections.join('\n\n---\n\n');

  // Generate metadata
  const metadata = {
    coachId: configData.coach_id,
    coachName: configData.coach_name || 'Unknown Coach',
    primaryPersonality: configData.selected_personality.primary_template,
    methodology: configData.selected_methodology.primary_methodology,
    safetyConstraints: configData.technical_config.safety_constraints.contraindicated_exercises,
    generatedAt: new Date().toISOString(),
    promptLength: systemPrompt.length
  };

  return {
    systemPrompt,
    metadata
  };
};

/**
 * Generates user context for the system prompt
 */
const generateUserContext = (context: NonNullable<PromptGenerationOptions['conversationContext']>): string | null => {
  if (!context.userName && !context.currentGoals && !context.sessionNumber) {
    return null;
  }

  const sections = [];

  if (context.userName) {
    sections.push(`## User Name
You are coaching ${context.userName}.`);
  }

  if (context.currentGoals && context.currentGoals.length > 0) {
    sections.push(`## Current Goals
Their current training goals are:
${context.currentGoals.map(goal => `- ${goal}`).join('\n')}`);
  }

  if (context.sessionNumber || context.previousSessions) {
    const sessionInfo = [];
    if (context.sessionNumber) {
      sessionInfo.push(`This is session #${context.sessionNumber}`);
    }
    if (context.previousSessions) {
      sessionInfo.push(`You have had ${context.previousSessions} previous sessions together`);
    }
    sections.push(`## Session Context
${sessionInfo.join('. ')}.`);
  }

  return sections.length > 0 ? `# USER CONTEXT\n${sections.join('\n\n')}` : null;
};

/**
 * Generates conversation guidelines specific to the coach
 */
const generateConversationGuidelines = (configData: CoachConfig): string => {
  const guidelines = [
    '- Maintain consistency with your established personality and coaching style',
    '- Reference previous conversations when relevant (you will have access to conversation history)',
    '- Ask clarifying questions when you need more information about their training',
    '- Provide specific, actionable advice based on your methodology',
    '- Always prioritize safety and respect the established constraints',
    '- Adapt your response length and complexity to their experience level',
    '- Use encouraging language that matches your motivational style'
  ];

  // Add personality-specific guidelines
  const personalityTemplate = configData.selected_personality.primary_template;
  switch (personalityTemplate) {
    case 'marcus':
      guidelines.push('- Provide detailed technical explanations when discussing movements or programming');
      guidelines.push('- Focus on skill development and systematic progression');
      break;
    case 'emma':
      guidelines.push('- Use encouraging and supportive language, especially when discussing challenges');
      guidelines.push('- Break down complex concepts into manageable steps');
      break;
    case 'diana':
      guidelines.push('- Challenge them appropriately and celebrate achievements');
      guidelines.push('- Focus on performance improvements and competitive preparation');
      break;
    case 'alex':
      guidelines.push('- Consider their lifestyle and time constraints in all recommendations');
      guidelines.push('- Provide practical, sustainable solutions');
      break;
  }

  // Add methodology-specific guidelines
  const methodology = configData.selected_methodology.primary_methodology;
  if (methodology.includes('strength')) {
    guidelines.push('- Emphasize progressive overload and strength-building principles');
  }
  if (methodology.includes('conditioning')) {
    guidelines.push('- Focus on metabolic conditioning and work capacity development');
  }

  // Add equipment-specific guidelines if available
  if (configData.technical_config.equipment_available.length > 0) {
    guidelines.push(`- Consider available equipment: ${configData.technical_config.equipment_available.join(', ')}`);
  }

  // Add time constraint guidelines if available
  if (configData.technical_config.time_constraints.session_duration) {
    guidelines.push(`- Keep sessions within ${configData.technical_config.time_constraints.session_duration} timeframe`);
  }

  // Add critical workout analysis guidelines
  const workoutAnalysisGuidelines = [
    '',
    '## CRITICAL WORKOUT ANALYSIS GUIDELINES',
    '- When analyzing any workout data, be extremely careful with mathematical calculations',
    '- For circuit/round-based workouts: Total reps = rounds × reps per round (e.g., 5 rounds × 5 reps = 25 total reps)',
    '- For multi-exercise workouts: Calculate each exercise separately, never combine different exercises',
    '- For time-based workouts: Reference the actual time mentioned, never estimate or guess',
    '- For weight calculations: Use exact weights mentioned, multiply by actual reps performed',
    '- ALWAYS double-check your calculations before mentioning specific numbers',
    '- If unsure about any calculation, acknowledge the workout without specific numbers',
    '- Focus on effort, consistency, and progress rather than just raw numbers when possible',
    '- When discussing volume or training load, be precise about what you\'re calculating',
    '- Avoid making assumptions about workout data that wasn\'t explicitly provided',
    '',
    '## EQUIPMENT TERMINOLOGY INTERPRETATION',
    '- "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement',
    '- Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells',
    '- "Single DB" means using one dumbbell for the movement',
    '- "Alternating" means switching between arms/sides but count total reps, not per side',
    '- "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)',
    '- When in doubt about equipment terminology, count the TOTAL movement repetitions performed',
    '',
    '## INTERVAL-BASED WORKOUT ANALYSIS',
    '- For interval workouts (e.g., 4 x 5min intervals), analyze each interval segment separately',
    '- When counting rounds for specific exercises, only count the rounds WHERE THAT EXERCISE APPEARS',
    '- Example: If a workout has 4 intervals, but only 2 intervals contain AMRAPs, count only those 2 AMRAP segments',
    '- Do not add running rounds to AMRAP rounds - they are separate movement patterns',
    '- For AMRAP segments: "3 rounds + 2 rounds = 5 total rounds" (not "3+3+2+2" if there are only 2 AMRAP segments)',
    '- Always specify what you\'re counting: "power clean rounds", "total workout rounds", "AMRAP segments", etc.',
    '- When discussing performance across intervals, compare like with like (AMRAP 1 vs AMRAP 2, not interval 1 vs interval 3)',
    '- Interval fatigue patterns: earlier intervals often have higher round counts than later ones due to accumulated fatigue'
  ];

  return `# CONVERSATION GUIDELINES
${guidelines.join('\n')}

${workoutAnalysisGuidelines.join('\n')}`;
};

/**
 * Validates that a coach config has all required prompts for system prompt generation
 */
export const validateCoachConfig = (coachConfigInput: CoachConfigInput): CoachConfigValidationResult => {
  const missingComponents: string[] = [];
  const warnings: string[] = [];

  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig = 'attributes' in coachConfigInput
    ? coachConfigInput.attributes
    : coachConfigInput;

  // Check required prompt components
  const requiredPrompts = [
    'personality_prompt',
    'safety_integrated_prompt',
    'motivation_prompt',
    'methodology_prompt',
    'communication_style',
    'learning_adaptation_prompt'
  ];

  requiredPrompts.forEach(prompt => {
    if (!configData.generated_prompts[prompt as keyof typeof configData.generated_prompts]) {
      missingComponents.push(prompt);
    }
  });

  // Check for empty or very short prompts
  Object.entries(configData.generated_prompts).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length < 50) {
      warnings.push(`${key} is unusually short (${value.length} characters)`);
    }
  });

  // Check safety constraints
  if (!configData.technical_config.safety_constraints.contraindicated_exercises.length) {
    warnings.push('No contraindicated exercises specified - ensure safety review is complete');
  }

  // Check for missing detailed background data
  if (!configData.metadata?.coach_creator_session_summary) {
    warnings.push('No coach creator session summary available - prompts will be less personalized');
  }

  if (!configData.technical_config.equipment_available.length) {
    warnings.push('No equipment information available - programming recommendations may be generic');
  }

  return {
    isValid: missingComponents.length === 0,
    missingComponents,
    warnings
  };
};

/**
 * Generates a preview/summary of what the system prompt will contain
 * Useful for debugging and testing
 */
export const generateSystemPromptPreview = (coachConfigInput: CoachConfigInput): SystemPromptPreview => {
  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig = 'attributes' in coachConfigInput
    ? coachConfigInput.attributes
    : coachConfigInput;

  const keyFeatures = [];
  const dataRichness = [];

  // Analyze coach features
  if (configData.selected_personality.secondary_influences?.length) {
    keyFeatures.push(`Blended personality (${configData.selected_personality.primary_template} + ${configData.selected_personality.secondary_influences.join(', ')})`);
  } else {
    keyFeatures.push(`Pure ${configData.selected_personality.primary_template} personality`);
  }

  keyFeatures.push(`${configData.technical_config.experience_level} level adaptation`);
  keyFeatures.push(`${configData.technical_config.programming_focus.join(' + ')} focus`);

  if (configData.technical_config.specializations.length > 0) {
    keyFeatures.push(`Specializes in: ${configData.technical_config.specializations.join(', ')}`);
  }

  // Analyze data richness
  if (configData.metadata?.coach_creator_session_summary) {
    dataRichness.push('Detailed user background available');
  }
  if (configData.technical_config.equipment_available.length > 0) {
    dataRichness.push(`Equipment context: ${configData.technical_config.equipment_available.join(', ')}`);
  }
  if (configData.technical_config.time_constraints.session_duration) {
    dataRichness.push(`Time constraints: ${configData.technical_config.time_constraints.session_duration}`);
  }
  if (configData.technical_config.preferred_intensity) {
    dataRichness.push(`Intensity preference: ${configData.technical_config.preferred_intensity}`);
  }

  // Estimate prompt length (with enhanced background data)
  const baseLength = Object.values(configData.generated_prompts)
    .reduce((total, prompt) => total + (typeof prompt === 'string' ? prompt.length : 0), 0);
  const backgroundLength = configData.metadata?.coach_creator_session_summary?.length || 0;
  const estimatedLength = baseLength + backgroundLength + 3000; // Add overhead for guidelines and structure

  return {
    coachName: configData.coach_name || 'Unnamed Coach',
    personality: configData.selected_personality.primary_template,
    methodology: configData.selected_methodology.primary_methodology,
    safetyConstraints: configData.technical_config.safety_constraints.contraindicated_exercises.length,
    estimatedLength,
    keyFeatures,
    dataRichness
  };
};
