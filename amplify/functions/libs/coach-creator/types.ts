export type SophisticationLevel = 'UNKNOWN' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// ============================================================================
// TO-DO LIST BASED CONVERSATIONAL FLOW (New Approach)
// ============================================================================

/**
 * A single item in the coach creator to-do list
 * Tracks whether a piece of information has been collected
 */
export interface TodoItem {
  status: 'pending' | 'in_progress' | 'complete';
  value: any | null;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  extractedFrom?: string; // Which message index this was extracted from
}

/**
 * Complete to-do list for coach creator intake
 * Maps to all information needed from the current 11 questions
 */
export interface CoachCreatorTodoList {
  // Question 1: Coach Gender Preference
  coachGenderPreference: TodoItem;

  // Question 2: Goals and Timeline
  primaryGoals: TodoItem;
  goalTimeline: TodoItem;

  // Question 3: Age and Life Stage
  age: TodoItem;
  lifeStageContext: TodoItem;

  // Question 4: Experience Level
  experienceLevel: TodoItem;
  trainingHistory: TodoItem;

  // Question 5: Training Frequency and Time
  trainingFrequency: TodoItem;
  sessionDuration: TodoItem;
  timeOfDayPreference: TodoItem;

  // Question 6: Injuries and Limitations
  injuryConsiderations: TodoItem;
  movementLimitations: TodoItem;

  // Question 7: Equipment and Environment
  equipmentAccess: TodoItem;
  trainingEnvironment: TodoItem;

  // Question 8: Movement Focus and Preferences
  movementPreferences: TodoItem;
  movementDislikes: TodoItem;

  // Question 9: Coaching Style and Motivation
  coachingStylePreference: TodoItem;
  motivationStyle: TodoItem;

  // Question 10: Success Metrics
  successMetrics: TodoItem;
  progressTrackingPreferences: TodoItem;

  // Question 11: Competition Goals (Optional)
  competitionGoals: TodoItem;
  competitionTimeline: TodoItem;
}

/**
 * Message in the conversation history
 */
export interface ConversationMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
}

// ============================================================================
// UTILITY TYPES (Non-coach creator specific)
// ============================================================================

// Generic DynamoDB item interface
export interface DynamoDBItem<T = any> {
  pk: string;
  sk: string;
  attributes: T;
  entityType: string;
  createdAt: string;
  updatedAt: string;
  // Optional GSI keys for indexed queries
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  gsi3pk?: string;
  gsi3sk?: string;
}

// Contact form specific attributes interface
export interface ContactFormAttributes {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: string;
}

export interface CoachCreatorSession {
  userId: string;
  sessionId: string;

  // To-do list based conversational flow
  todoList: CoachCreatorTodoList;
  conversationHistory: ConversationMessage[];
  sophisticationLevel: SophisticationLevel;

  // Session status
  isComplete: boolean;
  isDeleted?: boolean; // Soft delete flag - set to true when coach build succeeds
  generatedCoachConfig?: any;
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;
  progressDetails?: {
    questionsCompleted: number;
    totalQuestions: number;
    percentage: number;
    sophisticationLevel: string;
    currentQuestion: number;
  };
  configGeneration?: {
    status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
    startedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
    coachConfigId?: string;
  };
}

export interface CoachPersonalityTemplate {
  id: string;
  name: string;
  description: string;
  primaryTraits: string[];
  communicationStyle: string;
  programmingApproach: string;
  motivationStyle: string;
  bestFor: string[];
  fullPrompt: string;
}

export interface MethodologyTemplate {
  id: string;
  name: string;
  description: string;
  principles: string[];
  programmingApproach: string;
  bestFor: string[];
  strengthBias: string;
  conditioningApproach: string;
}

export interface PersonalityCoherenceCheck {
  consistency_score: number;
  conflicting_traits: string[];
  user_alignment_score: number;
  recommendations: string[];
}

export interface PersonalityBlendingConfig {
  primary_weight: number;
  secondary_weights: Record<string, number>;
  conflict_resolution: Record<string, string>;
  blending_rules: string[];
}

export interface CoachModificationCapabilities {
  personality_adjustments: string[];
  programming_focus_changes: string[];
  communication_style_tweaks: string[];
  goal_updates: string[];
  template_switching: string[];
}

export interface CoachCreatorPineconeIntegration {
  store_coach_creator_conversations: boolean;
  methodology_knowledge_base: boolean;
  successful_coach_patterns: boolean;
  user_pattern_analysis: boolean;
}

export interface StartSessionResponse {
  sessionId: string;
  progress: number;
  estimatedDuration: string;
  totalQuestions: number;
  initialMessage: string;
}

export interface ProcessResponseResult {
  aiResponse: string;
  isComplete: boolean;
  progress: number;
  nextQuestion?: string;
  coachConfig?: any;
}

export interface SafetyRule {
  id: string;
  rule: string;
  category: string;
  severity: string;
  validation: string;
}

// Interface for coach config summary (for listing views) - preserves nested structure with limited properties
export interface CoachConfigSummary {
  coach_id: string;
  coach_name: string;
  coach_description?: string; // NEW: Concise specialty description
  status?: string; // For filtering archived coaches
  selected_personality: {
    primary_template: string;
    selection_reasoning?: string;
  };
  technical_config: {
    programming_focus: string[];
    specializations: string[];
    methodology: string;
    experience_level: string;
    training_frequency?: number; // NEW: Training days per week
  };
  metadata: {
    created_date: string;
    total_conversations: number;
    methodology_profile?: { // NEW: Rich methodology metadata
      primary?: string;
      focus?: string[];
      preferences?: string[];
      experience?: string[];
    };
  };
  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for coach config
export interface CoachConfig {
  coach_id: string;
  coach_name: string;
  coach_description?: string;
  status?: 'active' | 'archived'; // Optional for backwards compatibility, defaults to active
  gender_preference?: 'male' | 'female' | 'neutral'; // Optional for backwards compatibility
  selected_personality: {
    primary_template: string;
    secondary_influences?: string[];
    selection_reasoning: string;
    blending_weights: {
      primary: number;
      secondary: number;
    };
  };
  selected_methodology: {
    primary_methodology: string;
    methodology_reasoning: string;
    programming_emphasis: string;
    periodization_approach: string;
    creativity_emphasis: string;
    workout_innovation: string;
  };
  technical_config: {
    methodology: string;
    programming_focus: string[];
    experience_level: string;
    training_frequency: number;
    specializations: string[];
    injury_considerations: string[];
    goal_timeline: string;
    preferred_intensity: string;
    equipment_available: string[];
    time_constraints: {
      preferred_time?: string;
      session_duration?: string;
      weekly_frequency?: string;
    };
    safety_constraints: {
      volume_progression_limit: string;
      contraindicated_exercises: string[];
      required_modifications: string[];
      recovery_requirements: string[];
      safety_monitoring: string[];
    };
  };
  generated_prompts: {
    personality_prompt: string;
    safety_integrated_prompt: string;
    motivation_prompt: string;
    methodology_prompt: string;
    communication_style: string;
    learning_adaptation_prompt: string;
    gender_tone_prompt?: string; // Optional for backwards compatibility with legacy coaches
  };
  modification_capabilities: {
    enabled_modifications: string[];
    personality_flexibility: string;
    programming_adaptability: string;
    creative_programming: string;
    workout_variety_emphasis: string;
    safety_override_level: string;
  };
  metadata: {
    version: string;
    created_date: string;
    user_satisfaction?: number | null;
    total_conversations: number;
    safety_profile: any;
    methodology_profile: {
      primary?: string;
      focus?: string[];
      preferences?: string[];
      experience?: string[];
    };
    coach_creator_session_summary: string;
    // Generation method tracking (for hybrid tool/fallback approach)
    generation_method?: 'tool' | 'fallback';
    generation_timestamp?: string;
  };
  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

// Coach Template interface for pre-built coach configurations
export interface CoachTemplate {
  template_id: string;           // e.g., "tmpl_bsb_2025_08_23"
  template_name: string;         // e.g., "Beginner Strength Builder"
  persona_category: string;      // Maps to personas 1-7 (e.g., "persona_1")
  description: string;           // User-facing description
  target_audience: string[];     // ["beginners", "strength_focused", etc.]

  // Pre-configured coach config (same structure as CoachConfig)
  base_config: CoachConfig;

  // Template metadata
  metadata: {
    created_date: string;
    version: string;
    popularity_score?: number;   // Track usage for ordering
    is_active: boolean;         // Enable/disable templates
  };
}
