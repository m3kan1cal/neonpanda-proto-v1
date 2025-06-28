export type SophisticationLevel = 'UNKNOWN' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// Generic DynamoDB item interface
export interface DynamoDBItem<T = any> {
  pk: string;
  sk: string;
  attributes: T;
  entityType: string;
  createdAt: string;
  updatedAt: string;
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

export interface UserContext {
  sophisticationLevel: SophisticationLevel;
  responses: Record<string, string>;
  currentQuestion: number;
  detectedSignals: string[];
  sessionId: string;
  userId: string;
  startedAt: Date;
  lastActivity: Date;
}

export interface Question {
  id: number;
  topic: string;
  versions: Record<SophisticationLevel, string>;
  sophisticationSignals: Record<SophisticationLevel, string[]>;
  followUpLogic: Record<SophisticationLevel, string>;
  skipConditions?: (userContext: UserContext) => boolean;
  required: boolean;
  advancedOnly?: boolean;
}

export interface CoachCreatorSession {
  userId: string;
  sessionId: string;
  userContext: UserContext;
  questionHistory: any[];
  isComplete: boolean;
  generatedCoachConfig?: any;
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;
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
  selected_personality: {
    primary_template: string;
    selection_reasoning?: string;
  };
  technical_config: {
    programming_focus: string[];
    specializations: string[];
    methodology: string;
    experience_level: string;
  };
  metadata: {
    created_date: string;
    total_conversations: number;
  };
}

// Interface for coach config
export interface CoachConfig {
  coach_id: string;
  coach_name: string;
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
  };
  modification_capabilities: {
    enabled_modifications: string[];
    personality_flexibility: string;
    programming_adaptability: string;
    safety_override_level: string;
  };
  metadata: {
    version: string;
    created_date: string;
    user_satisfaction?: number | null;
    total_conversations: number;
    safety_profile: any;
    methodology_profile: any;
    coach_creator_session_summary: string;
  };
}
