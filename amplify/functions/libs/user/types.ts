import type { DynamoDBItem } from "../coach-creator/types";

/**
 * User Profile interface matching the Universal User Schema
 */
export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  nickname: string;
  avatar: {
    url: string;
    s3Key: string;
  };
  preferences: {
    timezone?: string; // User's preferred timezone (e.g., 'America/Los_Angeles')
    unitSystem?: "imperial" | "metric"; // Unit system for weights and distances (default: 'imperial')
    emailNotifications?: {
      coachCheckIns?: boolean; // Receive coach check-ins and reminders (inactivity, motivation, holidays, etc.)
      weeklyReports?: boolean; // Receive weekly progress reports
      monthlyReports?: boolean; // Receive monthly progress reports
      programUpdates?: boolean; // Receive notifications about training program updates
      featureAnnouncements?: boolean; // Receive notifications about new features and app releases
      programAdherence?: boolean; // Receive reminders when falling behind on an active training program
    };
    lastSent?: {
      coachCheckIns?: Date; // When the last coach check-in was sent
      weeklyReports?: Date; // When the last weekly report was sent
      monthlyReports?: Date; // When the last monthly report was sent
      programUpdates?: Date; // When the last program update notification was sent
      featureAnnouncements?: Date; // When the last feature announcement was sent
      programAdherence?: Date; // When the last program adherence reminder was sent
    };
  };
  subscription: {};
  demographics: {};
  fitness: {};
  metadata: {
    isActive: boolean;
  };
  athleteProfile?: {
    summary: string; // AI-generated natural language athlete profile
    updatedAt: Date; // When this profile was last generated
    version: number; // For tracking profile evolution
    confidence: number; // AI confidence in the profile accuracy (0-1)
    sources: string[]; // Data sources used (e.g., "workouts", "conversations", "memories")
  };
  criticalTrainingDirective?: CriticalTrainingDirective;
  /** Rich, structured coach "mental model" — updated asynchronously after conversations */
  livingProfile?: LivingProfile;
  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CriticalTrainingDirective {
  content: string; // The directive text (max 500 characters)
  enabled: boolean; // Whether the directive is active
  createdAt: Date; // When the directive was first created
  updatedAt: Date; // When the directive was last updated
}

/**
 * Living Profile: A rich, structured "mental model" the coach maintains of the user.
 * Updated asynchronously after conversation summaries.
 * This is the aggregation layer that other memory upgrades feed into.
 */
export interface LivingProfile {
  trainingIdentity: {
    /** High-level summary: "Intermediate lifter, 2yr exp, CrossFit background" */
    summary: string;
    experienceLevel: string;
    trainingAge: string;
    primaryDisciplines: string[];
    /** Their relationship with fitness in their own framing */
    identityNarrative: string;
  };
  communicationPreferences: {
    /** "Direct and technical" vs "Warm and encouraging" */
    preferredStyle: string;
    /** "concise" | "detailed" | "adaptive" */
    responseLength: string;
    motivationalTriggers: string[];
    sensitiveTopics: string[];
  };
  lifeContext: {
    summary: string;
    occupation: string;
    schedule: string;
    stressors: string[];
    supportFactors: string[];
    constraints: string[];
  };
  goalsAndProgress: {
    activeGoals: string[];
    recentMilestones: string[];
    /** "Building base" | "Peaking" | "Deload" | etc. */
    currentPhase: string;
    /** "Consistent improvement" | "Plateaued" | "Returning after break" */
    progressTrajectory: string;
  };
  coachingRelationship: {
    /** "new" | "developing" | "established" | "deep" */
    relationshipStage: string;
    totalConversations: number;
    rapport: string;
    communicationDynamic: string;
  };
  /** METAMEMORY: What the coach doesn't know but should */
  knowledgeGaps: {
    /** Topics we have no data on: "sleep schedule", "injury history" */
    unknownTopics: string[];
    /** Topics with partial info: "knows shoulder issue but not specifics" */
    partiallyKnown: string[];
    /** Natural questions to fill gaps over time */
    suggestedQuestions: string[];
    lastAssessed: string;
  };
  /** BEHAVIORAL PATTERNS: Observed from data, not explicitly stated */
  observedPatterns: {
    patterns: Array<{
      pattern: string;
      confidence: number;
      observedCount: number;
      firstObserved: string;
      lastObserved: string;
      category:
        | "training"
        | "communication"
        | "adherence"
        | "emotional"
        | "avoidance";
    }>;
  };
  /** EPISODIC HIGHLIGHTS: Significant shared moments worth referencing */
  highlightReel: Array<{
    moment: string;
    date: string;
    emotionalValence: "positive" | "negative" | "neutral" | "mixed";
    significance: "high" | "medium";
    themes: string[];
  }>;
  metadata: {
    version: number;
    lastUpdated: string;
    lastConversationId: string;
    /** Overall confidence in profile accuracy (0-1) */
    confidence: number;
    /** Data sources used: "conversations", "workouts", "memories", "analytics" */
    sources: string[];
  };
}

// UserProfileInput removed - no longer needed since operations.ts returns unwrapped types
