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
    emailNotifications?: {
      coachCheckIns?: boolean; // Receive coach check-ins and reminders (inactivity, motivation, holidays, etc.)
      weeklyReports?: boolean; // Receive weekly progress reports
      monthlyReports?: boolean; // Receive monthly progress reports
      programUpdates?: boolean; // Receive notifications about training program updates
      featureAnnouncements?: boolean; // Receive notifications about new features and app releases
    };
  };
  emailNotificationMetadata?: {
    lastInactivityReminderSent?: Date; // When the last inactivity reminder was sent
    lastWeeklyReportSent?: Date; // When the last weekly report was sent
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
  criticalTrainingDirective?: {
    content: string; // The directive text (max 500 characters)
    enabled: boolean; // Whether the directive is active
    createdAt: Date; // When the directive was first created
    updatedAt: Date; // When the directive was last updated
  };
  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

// UserProfileInput removed - no longer needed since operations.ts returns unwrapped types
