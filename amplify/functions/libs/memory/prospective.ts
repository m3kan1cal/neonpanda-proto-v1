/**
 * Prospective Memory Module
 *
 * Handles forward-looking memories: events, commitments, and follow-ups
 * that the coach should naturally bring up at the right time.
 *
 * Examples:
 * - "My marathon is October 15" → Follow up before/after the race
 * - "I'll try sumo deadlifts next week" → Ask how it went
 * - "Going on vacation Aug 1-15" → Adjust expectations, welcome back
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { PROSPECTIVE_MEMORY_EXTRACTION_SCHEMA } from "../schemas/prospective-memory-schema";
import {
  UserMemory,
  ProspectiveMemoryMetadata,
  ProspectiveExtractionResult,
} from "./types";
import { generateMemoryId } from "./utils";
import { initializeLifecycle } from "./lifecycle";
import { logger } from "../logger";
import { fixDoubleEncodedProperties } from "../response-utils";

/**
 * Patterns that indicate a prospective item is about platform/app support
 * rather than training. Items matching any of these should never become
 * coach follow-ups — they cause the coach to defer training decisions to
 * platform developers instead of doing its job.
 *
 * Case-insensitive, applied to the combined text of content, followUpPrompt,
 * relativeTimeframe, and originalContext.
 */
const PLATFORM_SUPPORT_PATTERNS: RegExp[] = [
  /\bneonpanda\b/i,
  /\bneon panda\b/i,
  /\breach out to (?:the )?(?:team|support|devs?|developers?)\b/i,
  /\bcontact (?:support|the team|customer service|customer support)\b/i,
  /\btalk to (?:support|the team)\b/i,
  /\b(?:email|message|text|dm|ping|chat)\s+(?:support|the team|customer service)\b/i,
  /\b(?:submit|open|raise|create)\s+(?:a\s+)?(?:ticket|bug report|support ticket|support request)\b/i,
  /\b(?:follow up|check in|chat)\s+with\s+(?:support|the team|customer service|neonpanda)\b/i,
  /\b(?:cancel|delete|close)\s+(?:my\s+)?account\b/i,
  /\b(?:reset|forgot|recover)\s+(?:my\s+)?password\b/i,
  /\b(?:app|platform|system|site|website) (?:bug|issue|problem|error|outage|glitch)\b/i,
  /\b(?:logging|deletion|account|billing|login|signup|signin|sign-in|sign-up) (?:bug|issue|problem|error)\b/i,
  /\breport (?:a |the )?bug\b/i,
  /\bfile (?:a |the )?(?:bug|ticket|support ticket)\b/i,
];

/**
 * Drop any item whose textual fields match a platform-support pattern.
 * Belt-and-suspenders against extraction that ignores the prompt rule.
 */
export function filterPlatformSupportItems(
  items: ProspectiveExtractionResult["items"],
): ProspectiveExtractionResult["items"] {
  return items.filter((item) => {
    const combinedText = [
      item.content,
      item.followUpPrompt,
      item.relativeTimeframe,
      item.originalContext,
    ]
      .filter(Boolean)
      .join(" ");

    const matchedPattern = PLATFORM_SUPPORT_PATTERNS.find((pattern) =>
      pattern.test(combinedText),
    );

    if (matchedPattern) {
      logger.info("Prospective memory filtered: platform-support item", {
        reason: "platform-support item filtered",
        matchedPattern: matchedPattern.source,
        content: item.content?.slice(0, 200),
        followUpPrompt: item.followUpPrompt?.slice(0, 200),
      });
      return false;
    }
    return true;
  });
}

/**
 * Extract prospective memory elements from a user message + AI response pair.
 * Runs as a fire-and-forget async call after each conversation turn.
 *
 * Looks for:
 * - Future events with dates ("marathon in October", "competition next month")
 * - Commitments ("I'll try sumo deadlifts next week")
 * - Milestones ("aiming for a 315 deadlift by June")
 * - Scheduled changes ("going on vacation", "starting new job Monday")
 * - Coach suggestions the user agreed to ("sounds good, I'll do 4 days a week")
 */
export async function extractProspectiveMemories(
  userMessage: string,
  aiResponse: string,
  currentDate: string,
): Promise<ProspectiveExtractionResult> {
  const systemPrompt = `You are an AI assistant that extracts forward-looking events, commitments, and follow-up opportunities from coaching conversations.

TASK: Analyze the user message and coach response to identify anything the coach should follow up on in the future.

CURRENT DATE: ${currentDate}

WHAT TO EXTRACT:
1. **Events with dates**: Competitions, races, vacations, start dates, deadlines
2. **Commitments**: Things the user said they'd try or do ("I'll try sumo deadlifts", "I'll increase to 4 days")
3. **Milestones**: Goals with timeframes ("want to hit 315 by June", "lose 10lbs by summer")
4. **Life changes**: New jobs, schedule changes, injuries healing, returning from breaks
5. **Coach suggestions accepted**: If the coach suggested something and user agreed, that's a commitment to follow up on

WHAT NOT TO EXTRACT:
- General preferences (those are regular memories, not prospective)
- Past events or completed workouts
- Vague aspirations without any timeframe ("I want to get stronger" — no date/timeframe)
- Things already being tracked as active program goals
- Platform or app support items: bug reports, feature requests, account issues (billing, payment, subscription, password reset, account deletion), logging/deletion problems, or any commitment directed at the NeonPanda platform or its developers — including "reach out to NeonPanda", "contact/chat/email/message support", "talk to/follow up with the team", "submit/open a ticket", or "cancel my account". These are infrastructure concerns, not training actions — do not extract them as follow-ups.

DATE RESOLUTION:
- Convert relative dates to ISO format using CURRENT DATE as anchor
- "next week" = 7 days from current date
- "next month" = ~30 days from current date
- "this weekend" = upcoming Saturday
- If unsure of exact date, use targetDateType "approximate" or "relative"

TRIGGER WINDOW GUIDELINES:
- Major events (competition, race, big goal milestone): startDaysBefore=90, endDaysAfter=7
- Medium events (try something new, start routine): startDaysBefore=7, endDaysAfter=5
- Vacations/breaks: startDaysBefore=7, endDaysAfter=3
- Small commitments (do X next session): startDaysBefore=2, endDaysAfter=3

BE SELECTIVE: Only extract genuinely forward-looking items that a good coach would naturally follow up on. Don't extract trivial mentions.`;

  const userPrompt = `USER MESSAGE:
"${userMessage}"

COACH RESPONSE:
"${aiResponse}"

Use the extract_prospective_memories tool to identify any forward-looking events, commitments, or follow-up opportunities.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.UTILITY_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "extract_prospective_memories",
          description:
            "Extract forward-looking events and commitments from coaching conversation",
          inputSchema: PROSPECTIVE_MEMORY_EXTRACTION_SCHEMA,
        },
        expectedToolName: "extract_prospective_memories",
      },
    );

    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    const fixedInput = fixDoubleEncodedProperties(response.input);
    const result = fixedInput as ProspectiveExtractionResult;

    // Belt-and-suspenders safeguard: drop any extracted item that looks like
    // a platform/app support task rather than a training follow-up, even if
    // the extraction prompt's "WHAT NOT TO EXTRACT" guidance was ignored.
    // Misclassified items like "follow up about the NeonPanda logging bug"
    // get the coach to defer to platform developers instead of coaching.
    const filteredItems = filterPlatformSupportItems(result.items ?? []);

    logger.info("Prospective memory extraction completed:", {
      hasElements: result.hasProspectiveElements,
      itemCount: filteredItems.length,
      rawItemCount: result.items?.length || 0,
      droppedItemCount: (result.items?.length || 0) - filteredItems.length,
    });

    return {
      ...result,
      items: filteredItems,
      hasProspectiveElements:
        result.hasProspectiveElements && filteredItems.length > 0,
    };
  } catch (error) {
    logger.error("Error extracting prospective memories:", error);
    return {
      hasProspectiveElements: false,
      items: [],
    };
  }
}

/**
 * Convert extracted prospective items into UserMemory objects ready for saving.
 */
export function buildProspectiveMemories(
  extraction: ProspectiveExtractionResult,
  userId: string,
  coachId: string,
  conversationId: string,
): UserMemory[] {
  if (!extraction.hasProspectiveElements || !extraction.items?.length) {
    return [];
  }

  return extraction.items.map((item) => ({
    memoryId: generateMemoryId(userId),
    userId,
    coachId,
    content: item.content,
    memoryType: "prospective" as const,
    metadata: {
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      source: "system_extraction" as const,
      importance: item.importance,
      tags: [
        "prospective",
        item.followUpType,
        ...(item.targetDate ? ["has_target_date"] : []),
      ],
      prospective: {
        targetDate: item.targetDate,
        targetDateType: item.targetDateType,
        relativeTimeframe: item.relativeTimeframe,
        followUpType: item.followUpType,
        followUpPrompt: item.followUpPrompt,
        status: "pending" as const,
        originalContext: item.originalContext,
        triggerWindow: {
          startDaysBefore: item.triggerWindowDaysBefore,
          endDaysAfter: item.triggerWindowDaysAfter,
        },
      },
      lifecycle: initializeLifecycle(item.importance),
    },
  }));
}

/**
 * Query active prospective memories that are within their trigger window for the current date.
 * This is a fast DynamoDB-only query (no AI call) used on the sync path.
 *
 * Returns memories where:
 * - status is "pending" or "triggered"
 * - current date is within [targetDate - startDaysBefore, targetDate + endDaysAfter]
 * - OR targetDate is relative/approximate and memory was created recently
 */
export function filterActiveProspectiveMemories(
  allMemories: UserMemory[],
  currentDate: Date = new Date(),
): UserMemory[] {
  const now = currentDate.getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return allMemories.filter((memory) => {
    if (memory.memoryType !== "prospective") return false;

    const prospective = memory.metadata.prospective;
    if (!prospective) return false;

    // Only show pending or triggered
    if (
      prospective.status !== "pending" &&
      prospective.status !== "triggered"
    ) {
      return false;
    }

    // If we have a specific/approximate target date, check the trigger window
    if (prospective.targetDate) {
      const targetTime = new Date(prospective.targetDate).getTime();
      const windowStart =
        targetTime - prospective.triggerWindow.startDaysBefore * MS_PER_DAY;
      const windowEnd =
        targetTime + prospective.triggerWindow.endDaysAfter * MS_PER_DAY;

      return now >= windowStart && now <= windowEnd;
    }

    // For relative/no-date items, show if created within last 14 days
    const createdTime = new Date(memory.metadata.createdAt).getTime();
    const daysSinceCreated = (now - createdTime) / MS_PER_DAY;
    return daysSinceCreated <= 14;
  });
}

/**
 * Format active prospective memories into a prompt section for injection.
 * Groups by temporal proximity and formats with coaching guidance.
 */
export function formatProspectiveMemoriesForPrompt(
  memories: UserMemory[],
  currentDate: Date = new Date(),
): string {
  if (memories.length === 0) return "";

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const now = currentDate.getTime();

  // Categorize memories by temporal relationship to current date
  const upcoming: Array<{ memory: UserMemory; daysUntil: number }> = [];
  const today: UserMemory[] = [];
  const recent: Array<{ memory: UserMemory; daysSince: number }> = [];
  const noDate: UserMemory[] = [];

  for (const memory of memories) {
    const prospective = memory.metadata.prospective;
    if (!prospective) continue;

    if (prospective.targetDate) {
      const targetTime = new Date(prospective.targetDate).getTime();
      const diffDays = Math.round((targetTime - now) / MS_PER_DAY);

      if (diffDays > 0) {
        upcoming.push({ memory, daysUntil: diffDays });
      } else if (diffDays === 0) {
        today.push(memory);
      } else {
        recent.push({ memory, daysSince: Math.abs(diffDays) });
      }
    } else {
      noDate.push(memory);
    }
  }

  const sections: string[] = [
    `# FOLLOW-UP ITEMS
These are things to naturally follow up on based on previous conversations. Weave these into conversation when relevant — don't force them all at once.`,
  ];

  // Today's items (highest priority)
  if (today.length > 0) {
    sections.push("\n## TODAY");
    for (const memory of today) {
      const p = memory.metadata.prospective!;
      sections.push(`- **${memory.content}**\n  → ${p.followUpPrompt}`);
    }
  }

  // Upcoming items
  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    sections.push("\n## UPCOMING");
    for (const { memory, daysUntil } of upcoming) {
      const p = memory.metadata.prospective!;
      const timeLabel =
        daysUntil === 1
          ? "Tomorrow"
          : daysUntil <= 7
            ? `In ${daysUntil} days`
            : `In ~${Math.round(daysUntil / 7)} weeks`;
      sections.push(
        `- ${timeLabel}: **${memory.content}**\n  → ${p.followUpPrompt}`,
      );
    }
  }

  // Recent past items (follow up on how it went)
  if (recent.length > 0) {
    recent.sort((a, b) => a.daysSince - b.daysSince);
    sections.push("\n## FOLLOW UP");
    for (const { memory, daysSince } of recent) {
      const p = memory.metadata.prospective!;
      const timeLabel = daysSince === 1 ? "Yesterday" : `${daysSince} days ago`;
      sections.push(
        `- ${timeLabel}: **${memory.content}**\n  → ${p.followUpPrompt}`,
      );
    }
  }

  // No-date items
  if (noDate.length > 0) {
    sections.push("\n## GENERAL");
    for (const memory of noDate) {
      const p = memory.metadata.prospective!;
      const daysAgo = Math.round(
        (now - new Date(memory.metadata.createdAt).getTime()) / MS_PER_DAY,
      );
      sections.push(
        `- Mentioned ${daysAgo}d ago: **${memory.content}**\n  → ${p.followUpPrompt}`,
      );
    }
  }

  return sections.join("\n");
}

/**
 * Mark a prospective memory as resolved.
 */
export function resolveProspectiveMemory(
  memory: UserMemory,
  reason: string,
): Partial<UserMemory> {
  return {
    metadata: {
      ...memory.metadata,
      prospective: {
        ...memory.metadata.prospective!,
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolvedReason: reason,
      },
    },
  };
}

/**
 * Find prospective memories that have expired (past their trigger window end).
 * These should be marked as expired by the lifecycle job.
 */
export function findExpiredProspectiveMemories(
  allMemories: UserMemory[],
  currentDate: Date = new Date(),
): UserMemory[] {
  const now = currentDate.getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return allMemories.filter((memory) => {
    if (memory.memoryType !== "prospective") return false;

    const prospective = memory.metadata.prospective;
    if (!prospective) return false;
    if (
      prospective.status !== "pending" &&
      prospective.status !== "triggered"
    ) {
      return false;
    }

    if (prospective.targetDate) {
      const targetTime = new Date(prospective.targetDate).getTime();
      const windowEnd =
        targetTime + prospective.triggerWindow.endDaysAfter * MS_PER_DAY;
      return now > windowEnd;
    }

    // For no-date items, expire after 30 days
    const createdTime = new Date(memory.metadata.createdAt).getTime();
    return (now - createdTime) / MS_PER_DAY > 30;
  });
}
