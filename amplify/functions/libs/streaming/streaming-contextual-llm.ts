/**
 * Bounded LLM pulses for streaming contextual UX (max a few per turn).
 */

import {
  generateContextualUpdate,
  generateCoachCreatorContextualUpdate,
} from "../coach-conversation/contextual-updates";
import { logger } from "../logger";

export type StreamingContextualRole =
  | "coach"
  | "program_designer"
  | "coach_creator";

export interface StreamingCoachPulseInput {
  role: StreamingContextualRole;
  userSnippet: string;
  streamingPhase: "after_attachments" | "react_iteration";
  iterationIndex: number;
  hasCurrentImages: boolean;
  hasCurrentDocuments: boolean;
  historyHasUserImages: boolean;
  historyHasUserDocuments: boolean;
  /** Coach conversation + program designer */
  coachConfig?: any;
  /** Program designer: display name when coachConfig absent */
  coachName?: string;
  /** Program designer: personality prompt snippet */
  coachPersonality?: string;
}

function buildDesignerCoachConfig(input: StreamingCoachPulseInput): any {
  const name = input.coachName?.trim() || "Coach";
  const personality = (input.coachPersonality || "").trim();
  return {
    coach_name: name,
    coaching_style: "supportive",
    communication_style: "clear",
    motivational_approach: "encouraging",
    personality_traits: ["detail-oriented", "program-focused"],
    specialties: ["training program design"],
    catchphrases: [],
    background: personality
      ? `Program design session. Coach personality notes: ${personality.slice(0, 1200)}`
      : "Program design session.",
    expertise: ["periodization", "progressive overload", "recovery"],
  };
}

/**
 * One short contextual line from the fast contextual model. Returns null on failure.
 */
export async function maybeStreamingCoachPulse(
  input: StreamingCoachPulseInput,
): Promise<string | null> {
  const snippet = (input.userSnippet || "").slice(0, 500);
  const context = {
    streamingPhase: input.streamingPhase,
    iterationIndex: input.iterationIndex,
    hasCurrentImages: input.hasCurrentImages,
    hasCurrentDocuments: input.hasCurrentDocuments,
    historyHasUserImages: input.historyHasUserImages,
    historyHasUserDocuments: input.historyHasUserDocuments,
  };

  try {
    if (input.role === "coach_creator") {
      return await generateCoachCreatorContextualUpdate(
        snippet || "(attachment or short message)",
        "response_crafting",
        context,
      );
    }

    const coachConfig =
      input.role === "program_designer" && input.coachConfig
        ? input.coachConfig
        : input.role === "program_designer"
          ? buildDesignerCoachConfig(input)
          : input.coachConfig;

    if (!coachConfig) {
      logger.warn(
        "maybeStreamingCoachPulse: missing coachConfig for coach role",
      );
      return null;
    }

    return await generateContextualUpdate(
      coachConfig,
      snippet || "(attachment or short message)",
      "streaming_pulse",
      context,
    );
  } catch (err) {
    logger.warn("maybeStreamingCoachPulse failed (non-critical):", err);
    return null;
  }
}
