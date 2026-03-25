/**
 * Living Profile Module
 *
 * Manages the coach's "mental model" of the user — a rich, structured snapshot
 * updated asynchronously after conversation summaries. This is the aggregation
 * layer that all other memory upgrades feed into.
 *
 * Pipeline:
 *   conversation → summary trigger → build-living-profile Lambda → DynamoDB
 *   (per-message: loads livingProfile from UserProfile, injects into prompt)
 */

import {
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../api-helpers";
import { LIVING_PROFILE_GENERATION_SCHEMA } from "../schemas/living-profile-schema";
import { LivingProfile } from "./types";
import { UserMemory } from "../memory/types";
import { logger } from "../logger";
import { fixDoubleEncodedProperties } from "../response-utils";

/**
 * Generate or update a Living Profile from conversation data.
 * Called by the build-living-profile Lambda.
 *
 * Input: existing profile (if any) + recent conversation summary + user memories
 * Output: updated LivingProfile
 */
export async function generateLivingProfile(params: {
  existingProfile?: LivingProfile;
  conversationSummary: string;
  conversationId: string;
  userMemories: UserMemory[];
  totalConversations: number;
  coachName: string;
}): Promise<LivingProfile> {
  const {
    existingProfile,
    conversationSummary,
    conversationId,
    userMemories,
    totalConversations,
    coachName,
  } = params;

  const isUpdate = !!existingProfile;

  const systemPrompt = `You are an AI assistant that builds and maintains a structured "mental model" of a fitness coaching client — their Living Profile.

TASK: ${isUpdate ? "UPDATE the existing profile with new information from the latest conversation." : "CREATE an initial profile from the available data."}

${isUpdate ? `EXISTING PROFILE:
${JSON.stringify(existingProfile, null, 2)}

IMPORTANT UPDATE RULES:
- PRESERVE existing information unless explicitly contradicted
- ADD new information discovered in the latest conversation
- UPDATE fields where new data provides a more accurate picture
- For observedPatterns: increase confidence and observedCount for repeated patterns, add new ones
- For highlightReel: add significant new moments, keep up to 10 most significant (drop oldest medium-significance)
- For knowledgeGaps: remove topics that are now known, add newly identified gaps
- If existing data conflicts with new data, favor the newer data and note the change in reasoning` : `INITIAL PROFILE CREATION:
- Build the best profile you can from available data
- Mark uncertain/unknown areas honestly
- Set confidence lower for areas with little data
- Populate knowledgeGaps with important unknown topics
- It's better to say "Unknown" than to guess`}

COACH NAME: ${coachName}
TOTAL CONVERSATIONS: ${totalConversations}

RELATIONSHIP STAGE GUIDELINES:
- new: 1-3 conversations
- developing: 4-10 conversations
- established: 11-30 conversations
- deep: 30+ conversations`;

  const memoriesContext =
    userMemories.length > 0
      ? `\n\nUSER MEMORIES (${userMemories.length} total):\n${userMemories
          .map(
            (m) =>
              `- [${m.memoryType}/${m.metadata.importance}] ${m.content}`,
          )
          .join("\n")}`
      : "";

  const userPrompt = `LATEST CONVERSATION SUMMARY:
${conversationSummary}${memoriesContext}

Use the generate_living_profile tool to ${isUpdate ? "update" : "create"} the Living Profile.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL, // Sonnet — complex synthesis
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        tools: {
          name: "generate_living_profile",
          description:
            "Generate or update a structured Living Profile for the coaching client",
          inputSchema: LIVING_PROFILE_GENERATION_SCHEMA,
        },
        expectedToolName: "generate_living_profile",
      },
    );

    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    const fixedInput = fixDoubleEncodedProperties(response.input);
    const result = fixedInput as any;

    // Transform AI output into LivingProfile structure
    const livingProfile: LivingProfile = {
      trainingIdentity: result.trainingIdentity,
      communicationPreferences: result.communicationPreferences,
      lifeContext: result.lifeContext,
      goalsAndProgress: result.goalsAndProgress,
      coachingRelationship: {
        ...result.coachingRelationship,
        totalConversations,
      },
      knowledgeGaps: {
        ...result.knowledgeGaps,
        lastAssessed: new Date().toISOString(),
      },
      observedPatterns: {
        patterns: (result.observedPatterns || []).map((p: any) => ({
          pattern: p.pattern,
          confidence: p.confidence,
          observedCount: isUpdate
            ? matchExistingPatternCount(
                existingProfile,
                p.pattern,
                p.confidence,
              )
            : 1,
          firstObserved: isUpdate
            ? matchExistingPatternDate(existingProfile, p.pattern) ||
              new Date().toISOString()
            : new Date().toISOString(),
          lastObserved: new Date().toISOString(),
          category: p.category,
        })),
      },
      highlightReel: (result.highlightReel || []).map((h: any) => ({
        moment: h.moment,
        date: new Date().toISOString(),
        emotionalValence: h.emotionalValence,
        significance: h.significance,
        themes: h.themes,
      })),
      metadata: {
        version: isUpdate ? (existingProfile?.metadata.version || 0) + 1 : 1,
        lastUpdated: new Date().toISOString(),
        lastConversationId: conversationId,
        confidence: result.profileConfidence || 0.5,
        sources: isUpdate
          ? [
              ...new Set([
                ...(existingProfile?.metadata.sources || []),
                "conversations",
              ]),
            ]
          : ["conversations"],
      },
    };

    // If updating, merge highlight reels (keep existing + add new, cap at 10)
    if (isUpdate && existingProfile?.highlightReel) {
      const existingHighlights = existingProfile.highlightReel;
      const newHighlights = livingProfile.highlightReel;
      const combined = [...existingHighlights, ...newHighlights];

      // Sort by significance (high first), then by date (newest first)
      combined.sort((a, b) => {
        if (a.significance !== b.significance) {
          return a.significance === "high" ? -1 : 1;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      livingProfile.highlightReel = combined.slice(0, 10);
    }

    logger.info("Living profile generated:", {
      isUpdate,
      version: livingProfile.metadata.version,
      confidence: livingProfile.metadata.confidence,
      patternCount: livingProfile.observedPatterns.patterns.length,
      highlightCount: livingProfile.highlightReel.length,
      gapCount: livingProfile.knowledgeGaps.unknownTopics.length,
    });

    return livingProfile;
  } catch (error) {
    logger.error("Error generating living profile:", error);
    throw error;
  }
}

/**
 * Format a Living Profile for injection into the coach's system prompt.
 * Produces a concise, coaching-oriented summary — not a data dump.
 */
export function formatLivingProfileForPrompt(
  profile: LivingProfile,
): string {
  const sections: string[] = [
    `# YOUR MENTAL MODEL OF THIS ATHLETE
_Last updated: ${profile.metadata.lastUpdated} (v${profile.metadata.version})_`,
  ];

  // Training identity
  sections.push(`## Who They Are
${profile.trainingIdentity.summary}
${profile.trainingIdentity.identityNarrative}`);

  // Communication preferences
  sections.push(`## How to Communicate
- Style: ${profile.communicationPreferences.preferredStyle}
- Length: ${profile.communicationPreferences.responseLength}
${profile.communicationPreferences.motivationalTriggers.length > 0 ? `- Motivators: ${profile.communicationPreferences.motivationalTriggers.join(", ")}` : ""}
${profile.communicationPreferences.sensitiveTopics.length > 0 ? `- ⚠️ Sensitive topics: ${profile.communicationPreferences.sensitiveTopics.join(", ")}` : ""}`);

  // Goals and progress
  if (
    profile.goalsAndProgress.activeGoals.length > 0 ||
    profile.goalsAndProgress.recentMilestones.length > 0
  ) {
    sections.push(`## Goals & Progress
- Phase: ${profile.goalsAndProgress.currentPhase} (${profile.goalsAndProgress.progressTrajectory})
${profile.goalsAndProgress.activeGoals.map((g) => `- Goal: ${g}`).join("\n")}
${profile.goalsAndProgress.recentMilestones.map((m) => `- ✅ ${m}`).join("\n")}`);
  }

  // Life context (only if meaningful)
  if (
    profile.lifeContext.summary &&
    profile.lifeContext.summary !== "Unknown"
  ) {
    sections.push(`## Life Context
${profile.lifeContext.summary}
${profile.lifeContext.constraints.length > 0 ? `Constraints: ${profile.lifeContext.constraints.join(", ")}` : ""}`);
  }

  // Coaching relationship
  sections.push(`## Your Relationship
Stage: ${profile.coachingRelationship.relationshipStage} (${profile.coachingRelationship.totalConversations} conversations)
${profile.coachingRelationship.communicationDynamic}`);

  // Knowledge gaps (coaching hints)
  if (
    profile.knowledgeGaps.suggestedQuestions.length > 0
  ) {
    sections.push(`## Knowledge Gaps (ask naturally over time)
${profile.knowledgeGaps.suggestedQuestions.slice(0, 3).map((q) => `- ${q}`).join("\n")}`);
  }

  // Observed patterns (coaching guidance)
  const strongPatterns = profile.observedPatterns.patterns.filter(
    (p) => p.confidence >= 0.6,
  );
  if (strongPatterns.length > 0) {
    sections.push(`## Observed Patterns
${strongPatterns.slice(0, 5).map((p) => `- ${p.pattern} (${p.category})`).join("\n")}`);
  }

  // Highlight reel (shared moments for continuity)
  const recentHighlights = profile.highlightReel
    .filter((h) => h.significance === "high")
    .slice(0, 3);
  if (recentHighlights.length > 0) {
    sections.push(`## Shared Moments
${recentHighlights.map((h) => `- ${h.moment} [${h.themes.join(", ")}]`).join("\n")}`);
  }

  return sections.join("\n\n");
}

// ── Helpers ──

/** Match existing pattern to get its observation count */
function matchExistingPatternCount(
  existingProfile: LivingProfile | undefined,
  pattern: string,
  newConfidence: number,
): number {
  if (!existingProfile?.observedPatterns?.patterns) return 1;

  const match = existingProfile.observedPatterns.patterns.find(
    (p) => p.pattern.toLowerCase() === pattern.toLowerCase(),
  );
  return match ? match.observedCount + 1 : 1;
}

/** Match existing pattern to preserve its firstObserved date */
function matchExistingPatternDate(
  existingProfile: LivingProfile | undefined,
  pattern: string,
): string | undefined {
  if (!existingProfile?.observedPatterns?.patterns) return undefined;

  const match = existingProfile.observedPatterns.patterns.find(
    (p) => p.pattern.toLowerCase() === pattern.toLowerCase(),
  );
  return match?.firstObserved;
}
