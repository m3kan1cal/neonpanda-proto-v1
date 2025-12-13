import type { LambdaFunctionURLEvent, Context } from "aws-lambda";
import { CoachMessage } from "../coach-conversation/types";

// SSE Event Types - Reusable across all streaming functions
export interface SseCompleteEvent {
  type: "complete";
  messageId: string;
  status: "finished";
  userMessage?: CoachMessage;
  aiMessage?: CoachMessage;
  conversationId?: string;
  pineconeContext?: {
    used: boolean;
    matches: number;
    contextLength: number;
  };
  // Allow additional completion data for different streaming functions
  [key: string]: any;
}

// Suggestion action button configuration
export interface SuggestionAction {
  label: string; // Button label to display
  action: string; // Action identifier (e.g., 'accept_program_design', 'decline_program_design')
}

// Union type for all SSE events (individual interfaces inlined for simplicity)
export type SseEvent =
  | { type: "start"; status: "initialized" }
  | { type: "chunk"; content: string }
  | { type: "contextual"; content: string; stage?: string } // Ephemeral UX feedback (not saved to conversation)
  | { type: "metadata"; mode?: string; [key: string]: any } // Early metadata for UI configuration (sent after detection, before AI streaming)
  | {
      type: "suggestion";
      suggestionType: string;
      message: string;
      actions: SuggestionAction[];
      confidence: number;
    } // User confirmation request with action buttons
  | SseCompleteEvent
  | { type: "error"; message: string; code?: string };

// Auth types for Lambda Function URL streaming
export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
}

export interface AuthenticatedLambdaFunctionURLEvent extends LambdaFunctionURLEvent {
  user: AuthenticatedUser;
}

// Streaming handler type
export type StreamingHandler = (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context,
) => Promise<void>;

// Path extraction result type - generic for different streaming endpoints
export interface PathParameters {
  userId?: string;
  coachId?: string;
  conversationId?: string;
  workoutId?: string;
  [key: string]: string | undefined;
}
