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
  preferences: {};
  subscription: {};
  demographics: {};
  fitness: {};
  metadata: {
    isActive: boolean;
  };
  athleteProfile?: {
    summary: string; // AI-generated natural language athlete profile
    lastUpdated: Date; // When this profile was last generated
    version: number; // For tracking profile evolution
    confidence: number; // AI confidence in the profile accuracy (0-1)
    sources: string[]; // Data sources used (e.g., "workouts", "conversations", "memories")
  };
}

/**
 * User memory for persistent coaching context
 */
export interface UserMemory {
  memoryId: string;
  userId: string;
  coachId?: string | null; // Optional - memories can be coach-specific (string) or global (null/undefined)
  content: string; // The memory content/description
  memoryType: "preference" | "goal" | "constraint" | "instruction" | "context";
  metadata: {
    createdAt: Date;
    lastUsed?: Date;
    usageCount: number;
    source: "conversation" | "explicit_request";
    importance: "high" | "medium" | "low";
    tags?: string[];
  };
}
