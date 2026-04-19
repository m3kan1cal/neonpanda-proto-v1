/**
 * Curated static lines for streaming contextual UX (SSE type "contextual").
 * Warm coach energy, no snark. Used between LLM tokens and during long waits.
 */

export type StreamingAttachmentKind = "image" | "document" | "mixed";

const IMAGE_ONLY_OPENERS = [
  "Pulling your photos into focus..",
  "Taking a careful look at what you sent..",
  "Walking through your images step by step..",
  "Letting your pictures settle into context..",
  "Studying the details in your shots..",
];

const DOCUMENT_ONLY_OPENERS = [
  "Opening up what you uploaded..",
  "Walking through your file with care..",
  "Letting your document settle into context..",
  "Tracing the main points in your upload..",
  "Reading through what you attached..",
];

const MIXED_OPENERS = [
  "Taking in your photos and file together..",
  "Blending your images and document into context..",
  "Working through your attachments as a set..",
  "Connecting what you typed with what you sent..",
  "Sorting your visuals and document side by side..",
];

const BETWEEN_ITERATION_LINES = [
  "Still with you — tightening the next move..",
  "Keeping the thread in view while I work..",
  "Steady progress on your request..",
  "Carrying your last point forward..",
  "Building on what we just figured out..",
  "Holding the plan together while I think..",
  "Staying locked on what you asked for..",
  "Weaving this turn into a clear answer..",
];

const HISTORY_VISUAL_LINES = [
  "Leaning on the visuals you shared earlier in this chat..",
  "Keeping your recent photos in mind as I answer..",
  "Carrying context from the images in this thread..",
  "Still weighing what you showed in earlier messages..",
];

const HISTORY_DOC_LINES = [
  "Working from what you wrote about your earlier uploads..",
  "Using your notes and filenames from past turns as cues..",
  "Building on the text around your previous attachments..",
];

function pickRandom<T>(items: T[], avoid?: string): T {
  if (items.length === 0) {
    throw new Error("pickRandom: empty list");
  }
  let choice = items[Math.floor(Math.random() * items.length)] as T;
  if (avoid !== undefined && items.length > 1 && typeof choice === "string") {
    let guard = 0;
    while (choice === avoid && guard < 8) {
      choice = items[Math.floor(Math.random() * items.length)] as T;
      guard++;
    }
  }
  return choice;
}

export function getAttachmentBurstMessages(
  kind: StreamingAttachmentKind,
  count = 3,
): string[] {
  const pool =
    kind === "mixed"
      ? MIXED_OPENERS
      : kind === "document"
        ? DOCUMENT_ONLY_OPENERS
        : IMAGE_ONLY_OPENERS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const n = Math.min(count, pool.length);
  return shuffled.slice(0, n);
}

export function getBetweenIterationLine(lastLine?: string): string {
  return pickRandom(BETWEEN_ITERATION_LINES, lastLine) as string;
}

export function getHistoryAwareStaticLine(options: {
  historyHasUserImages: boolean;
  historyHasUserDocuments: boolean;
  currentHasImages: boolean;
  currentHasDocuments: boolean;
  lastLine?: string;
}): string | null {
  const {
    historyHasUserImages,
    historyHasUserDocuments,
    currentHasImages,
    currentHasDocuments,
    lastLine,
  } = options;

  if (currentHasImages || currentHasDocuments) {
    return null;
  }
  if (historyHasUserImages && historyHasUserDocuments) {
    return pickRandom(
      [...HISTORY_VISUAL_LINES, ...HISTORY_DOC_LINES],
      lastLine,
    ) as string;
  }
  if (historyHasUserImages) {
    return pickRandom(HISTORY_VISUAL_LINES, lastLine) as string;
  }
  if (historyHasUserDocuments) {
    return pickRandom(HISTORY_DOC_LINES, lastLine) as string;
  }
  return null;
}

export const CONTEXTUAL_TICK_MS = 3000;
export const CONTEXTUAL_TICK_JITTER_MS = 400;
export const TOOL_CONTEXTUAL_HOLD_MS = 5000;
export const ATTACHMENT_BURST_GAP_MS = 420;

export function nextTickDelayMs(): number {
  const jitter =
    Math.floor(Math.random() * (CONTEXTUAL_TICK_JITTER_MS * 2 + 1)) -
    CONTEXTUAL_TICK_JITTER_MS;
  return Math.max(1200, CONTEXTUAL_TICK_MS + jitter);
}
