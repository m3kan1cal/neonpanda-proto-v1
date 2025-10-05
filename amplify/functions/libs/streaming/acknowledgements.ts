/**
 * Random acknowledgement utilities for streaming responses
 */

/**
 * Coach-style acknowledgements for coach conversations
 * More direct and action-oriented
 */
const COACH_ACKNOWLEDGEMENTS = [
  "Alright, let's work.",
  "I hear you.",
  "Let's figure this out.",
  "Got it, let's go.",
  "Right on.",
  "Let's dive in.",
  "I'm on it.",
  "Let's tackle this.",
  "Copy that.",
];

/**
 * Friendly acknowledgements for coach creator sessions
 * More conversational and warm
 */
const COACH_CREATOR_ACKNOWLEDGEMENTS = [
  "Got it! ",
  "Okay! ",
  "Cool! ",
  "Alright! ",
  "Perfect! ",
  "Makes sense! ",
  "Awesome! ",
  "Great! ",
];

/**
 * Get a random acknowledgement from a list
 */
function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get a random coach-style acknowledgement
 * Used for coach conversations
 */
export function getRandomCoachAcknowledgement(): string {
  return getRandomItem(COACH_ACKNOWLEDGEMENTS);
}

/**
 * Get a random coach creator acknowledgement
 * Used for coach creator sessions
 */
export function getRandomCoachCreatorAcknowledgement(): string {
  return getRandomItem(COACH_CREATOR_ACKNOWLEDGEMENTS);
}

/**
 * Get a random acknowledgement based on context type
 */
export function getRandomAcknowledgement(
  type: "coach" | "coach-creator" = "coach"
): string {
  return type === "coach"
    ? getRandomCoachAcknowledgement()
    : getRandomCoachCreatorAcknowledgement();
}

