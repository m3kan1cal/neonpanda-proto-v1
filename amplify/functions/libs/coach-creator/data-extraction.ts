/**
 * Coach Creator Data Extraction
 *
 * All extraction functions use the to-do list approach and AI-powered parsing
 * where keyword matching would be fragile or incomplete.
 */

import { SophisticationLevel, CoachCreatorSession } from "./types";
import { callBedrockApi, MODEL_IDS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";

// ============================================================================
// SOPHISTICATION LEVEL DETECTION
// ============================================================================

/**
 * Extracts sophistication level from AI response
 * Looks for pattern: SOPHISTICATION_LEVEL: [BEGINNER|INTERMEDIATE|ADVANCED]
 */
export const extractSophisticationLevel = (
  aiResponse: string
): SophisticationLevel | null => {
  const match = aiResponse.match(
    /SOPHISTICATION_LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)/
  );
  return match ? (match[1] as SophisticationLevel) : null;
};

// ============================================================================
// SESSION-BASED EXTRACTION FUNCTIONS (To-Do List Approach)
// ============================================================================

/**
 * Extract gender preference from to-do list
 * Fallback: Use AI to parse from conversation history
 */
export const extractGenderPreferenceFromSession = async (
  session: CoachCreatorSession
): Promise<'male' | 'female' | 'neutral'> => {
  // Try to-do list first
  if (session.todoList?.coachGenderPreference?.value) {
    const value = session.todoList.coachGenderPreference.value;
    if (typeof value === 'string' && ['male', 'female', 'neutral'].includes(value)) {
      return value as 'male' | 'female' | 'neutral';
    }
  }

  // AI Fallback: Parse from conversation history
  if (session.conversationHistory && session.conversationHistory.length > 0) {
    const conversationText = session.conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const prompt = `Extract the user's coach gender preference from this conversation:

"${conversationText}"

Return ONLY one word: "male", "female", or "neutral"`;

    try {
      const response = await callBedrockApi(
        prompt,
        '', // Empty string will default to "Please proceed."
        MODEL_IDS.CLAUDE_HAIKU_4FULL
      ) as string;

      const cleaned = response.toLowerCase().trim();
      if (['male', 'female', 'neutral'].includes(cleaned)) {
        return cleaned as 'male' | 'female' | 'neutral';
      }
    } catch (error) {
      console.warn('AI gender extraction failed, using default');
    }
  }

  return 'neutral';
};

/**
 * Extract training frequency from to-do list
 * Fallback: Use AI to parse number from conversation
 */
export const extractTrainingFrequencyFromSession = async (
  session: CoachCreatorSession
): Promise<number> => {
  // Try to-do list first
  if (session.todoList?.trainingFrequency?.value) {
    const value = session.todoList.trainingFrequency.value;
    if (typeof value === 'number' && value >= 1 && value <= 7) {
      return value;
    }
    // Try parsing if it's a string
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
        return parsed;
      }
    }
  }

  // AI Fallback: Parse from conversation history
  if (session.conversationHistory && session.conversationHistory.length > 0) {
    const conversationText = session.conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const prompt = `Extract how many days per week the user wants to train from this conversation:

"${conversationText}"

Return ONLY a single number between 1-7. If not found, return 4.`;

    try {
      const response = await callBedrockApi(
        prompt,
        '', // Empty string will default to "Please proceed."
        MODEL_IDS.CLAUDE_HAIKU_4FULL
      ) as string;

      const parsed = parseInt(response.trim(), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
        return parsed;
      }
    } catch (error) {
      console.warn('AI frequency extraction failed, using default');
    }
  }

  return 4; // Default
};

/**
 * Extract goal timeline from to-do list
 * Fallback: Use AI to parse timeline from conversation
 */
export const extractGoalTimelineFromSession = async (
  session: CoachCreatorSession
): Promise<string> => {
  // Try to-do list first
  if (session.todoList?.goalTimeline?.value) {
    const value = session.todoList.goalTimeline.value;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  // AI Fallback: Parse from conversation history
  if (session.conversationHistory && session.conversationHistory.length > 0) {
    const conversationText = session.conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const prompt = `Extract the user's goal timeline from this conversation:

"${conversationText}"

Common timeframes: "3 months", "6 months", "1 year", "no rush", "long term"
Return a simple phrase. If not mentioned, return "6 months"`;

    try {
      const response = await callBedrockApi(
        prompt,
        '', // Empty string will default to "Please proceed."
        MODEL_IDS.CLAUDE_HAIKU_4FULL
      ) as string;

      return response.trim() || '6 months';
    } catch (error) {
      console.warn('AI timeline extraction failed, using default');
    }
  }

  return '6 months';
};

/**
 * Extract intensity preference from to-do list
 * Fallback: Use AI to infer intensity preference
 */
export const extractIntensityPreferenceFromSession = async (
  session: CoachCreatorSession
): Promise<string> => {
  // Try to-do list first
  if (session.todoList?.primaryGoals?.value) {
    const goals = String(session.todoList.primaryGoals.value);

    const prompt = `Based on these fitness goals, determine the user's preferred training intensity:

"${goals}"

Return ONLY one word: "high", "moderate", or "low"`;

    try {
      const response = await callBedrockApi(
        prompt,
        '', // Empty string will default to "Please proceed."
        MODEL_IDS.CLAUDE_HAIKU_4FULL
      ) as string;

      const cleaned = response.toLowerCase().trim();
      if (['high', 'moderate', 'low'].includes(cleaned)) {
        return cleaned;
      }
    } catch (error) {
      console.warn('AI intensity extraction failed, using default');
    }
  }

  return 'moderate';
};

/**
 * Extract safety profile from to-do list
 * Fallback: Use AI to analyze safety concerns
 */
export const extractSafetyProfileFromSession = async (
  session: CoachCreatorSession
): Promise<any> => {
  // Try to-do list first
  if (session.todoList) {
    const injuries = session.todoList.injuryConsiderations?.value;
    const limitations = session.todoList.movementLimitations?.value;
    const equipment = session.todoList.equipmentAccess?.value;

    // If we have to-do list data, use AI to analyze it properly
    if (injuries || limitations || equipment) {
      const prompt = `Analyze this fitness safety information and return a structured JSON profile:

INJURIES: ${injuries || 'none'}
LIMITATIONS: ${limitations || 'none'}
EQUIPMENT: ${Array.isArray(equipment) ? equipment.join(', ') : equipment || 'basic'}

Return JSON with this structure:
{
  "injuries": ["specific injury 1", "specific injury 2"],
  "contraindications": ["exercise 1 to avoid", "exercise 2 to avoid"],
  "equipment": ["barbell", "dumbbells", "pull-up bar"],
  "modifications": ["modification 1", "modification 2"],
  "recoveryNeeds": ["recovery need 1", "recovery need 2"]
}

If "none" or empty, use empty arrays. Be specific and helpful.`;

      try {
        const response = await callBedrockApi(
          prompt,
          '', // Empty string will default to "Please proceed."
          MODEL_IDS.CLAUDE_HAIKU_4FULL,
          { prefillResponse: '{' }
        ) as string;

        const profile = parseJsonWithFallbacks(response);
        if (profile && typeof profile === 'object') {
          return {
            injuries: profile.injuries || [],
            contraindications: profile.contraindications || [],
            equipment: profile.equipment || [],
            modifications: profile.modifications || [],
            recoveryNeeds: profile.recoveryNeeds || [],
          };
        }
      } catch (error) {
        console.warn('AI safety profile extraction failed, using simple default');
      }
    }
  }

  // Simple default
  return {
    injuries: [],
    contraindications: [],
    equipment: ['basic'],
    modifications: [],
    recoveryNeeds: [],
  };
};

/**
 * Extract methodology preferences from to-do list
 * Fallback: Use AI to infer methodology from goals and preferences
 */
export const extractMethodologyPreferencesFromSession = async (
  session: CoachCreatorSession
): Promise<any> => {
  // Try to-do list first
  if (session.todoList) {
    const goals = session.todoList.primaryGoals?.value;
    const movementPrefs = session.todoList.movementPreferences?.value;
    const movementDislikes = session.todoList.movementDislikes?.value;
    const experience = session.todoList.experienceLevel?.value;

    // If we have data, use AI to analyze methodology fit
    if (goals || movementPrefs) {
      const prompt = `Based on this fitness profile, determine methodology preferences:

GOALS: ${goals || 'general fitness'}
MOVEMENT PREFERENCES: ${movementPrefs || 'varied'}
MOVEMENT DISLIKES: ${movementDislikes || 'none'}
EXPERIENCE: ${experience || 'intermediate'}

Return JSON with this structure:
{
  "focus": ["primary focus 1", "primary focus 2"],
  "preferences": ["preference 1", "preference 2"],
  "avoidances": ["thing to avoid 1"],
  "experience": "beginner|intermediate|advanced"
}

Focus should be training goals like "strength", "conditioning", "olympic lifting", etc.`;

      try {
        const response = await callBedrockApi(
          prompt,
          '', // Empty string will default to "Please proceed."
          MODEL_IDS.CLAUDE_HAIKU_4FULL,
          { prefillResponse: '{' }
        ) as string;

        const prefs = parseJsonWithFallbacks(response);
        if (prefs && typeof prefs === 'object') {
          return {
            focus: prefs.focus || ['strength', 'conditioning'],
            preferences: prefs.preferences || [],
            avoidances: prefs.avoidances || [],
            experience: prefs.experience || experience || 'intermediate',
          };
        }
      } catch (error) {
        console.warn('AI methodology extraction failed, using simple default');
      }
    }
  }

  // Simple default
  return {
    focus: ['strength', 'conditioning'],
    preferences: [],
    avoidances: [],
    experience: 'intermediate',
  };
};

/**
 * Extract specializations from to-do list
 * Fallback: Use AI to identify specializations
 */
export const extractSpecializationsFromSession = async (
  session: CoachCreatorSession
): Promise<string[]> => {
  // Try to-do list first
  if (session.todoList) {
    const goals = session.todoList.primaryGoals?.value;
    const movementPrefs = session.todoList.movementPreferences?.value;

    // If we have data, use AI to identify specializations
    if (goals || movementPrefs) {
      const prompt = `Identify fitness specializations from this profile:

GOALS: ${goals || 'none'}
MOVEMENT PREFERENCES: ${movementPrefs || 'none'}

Common specializations:
- Olympic Weightlifting
- Powerlifting
- Gymnastics
- Endurance
- Strength Training
- CrossFit
- Bodybuilding

Return ONLY a JSON array of relevant specializations. Example: ["Olympic Weightlifting", "Gymnastics"]
If none apply, return an empty array: []`;

      try {
        const response = await callBedrockApi(
          prompt,
          '', // Empty string will default to "Please proceed."
          MODEL_IDS.CLAUDE_HAIKU_4FULL,
          { prefillResponse: '[' }
        ) as string;

        const specializations = parseJsonWithFallbacks(response);
        if (Array.isArray(specializations)) {
          return specializations;
        }
      } catch (error) {
        console.warn('AI specialization extraction failed, using default');
      }
    }
  }

  return []; // No specializations
};

/**
 * Extract sophistication signals from user response
 * Simple keyword matching is fine here - just detecting technical terms
 */
export const extractSophisticationSignals = (
  userResponse: string,
  sophisticationSignals?: Record<SophisticationLevel, string[]>
): string[] => {
  const detectedSignals: string[] = [];

  if (sophisticationSignals) {
    const userResponseLower = userResponse.toLowerCase();

    // Check signals for all sophistication levels
    Object.entries(sophisticationSignals).forEach(([level, signals]) => {
      signals.forEach((signal: string) => {
        if (userResponseLower.includes(signal.toLowerCase())) {
          detectedSignals.push(signal);
        }
      });
    });
  }

  return detectedSignals;
};
