import { useState, useEffect, useCallback } from "react";
import {
  getSubscriptionStatus,
  SUBSCRIPTION_TIERS,
} from "../utils/apis/subscriptionApi";
import {
  checkUpgradeTriggers,
  shouldShowUpgradePrompt,
  UPGRADE_TRIGGERS,
} from "../components/subscription/UpgradePrompt";

/**
 * Storage keys for subscription and upgrade prompt tracking
 * Centralized location for all localStorage/sessionStorage keys
 */
export const STORAGE_KEYS = {
  // User onboarding and signup tracking
  SIGNUP_DATE: "npUserSignupDate",
  ONBOARDING_SHOWN: "npOnboardingShown",

  // Upgrade prompt rate limiting
  LAST_PROMPT_TIME: "npUpgradePromptLast",
  LAST_TRIGGER_TIMES: "npUpgradeTriggerTimes",
  SESSION_PROMPTED: "npUpgradeSessionPrompted",
};

/**
 * useUpgradePrompts - Hook for managing contextual upgrade prompts
 *
 * Tracks user activity and determines when to show upgrade prompts based on:
 * - Coach count (2+ coaches triggers prompt)
 * - Messages count (20+ messages triggers prompt)
 * - Workout count (4+ workouts triggers prompt)
 * - Days since signup (7+ days triggers prompt)
 *
 * Respects rate limiting:
 * - Max once per week per trigger type
 * - Max one prompt per session
 *
 * @param {string} userId - The current user's ID
 * @param {Object} userData - User activity data
 * @param {number} userData.coachCount - Number of coaches created
 * @param {number} userData.messagesCount - Total conversation messages exchanged
 * @param {number} userData.workoutCount - Number of workouts logged
 * @returns {Object} - Prompt state and handlers
 */
export function useUpgradePrompts(userId, userData = {}) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { coachCount = 0, messagesCount = 0, workoutCount = 0 } = userData;

  // Calculate days since signup
  const getDaysSinceSignup = useCallback(() => {
    const signupDateStr = localStorage.getItem(
      `${STORAGE_KEYS.SIGNUP_DATE}_${userId}`,
    );

    if (!signupDateStr) {
      // First time - record signup date
      localStorage.setItem(
        `${STORAGE_KEYS.SIGNUP_DATE}_${userId}`,
        new Date().toISOString(),
      );
      return 0;
    }

    const signupDate = new Date(signupDateStr);
    const now = new Date();
    const diffTime = Math.abs(now - signupDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }, [userId]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const status = await getSubscriptionStatus(userId);
        setSubscription(status);
      } catch (error) {
        console.warn("Failed to fetch subscription status:", error);
        // Default to free tier on error
        setSubscription({
          tier: SUBSCRIPTION_TIERS.FREE,
          hasSubscription: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  // Check triggers when user data changes
  useEffect(() => {
    // Skip if still loading, no userId, or user already has premium
    if (isLoading || !userId) return;
    if (subscription?.tier === SUBSCRIPTION_TIERS.ELECTRIC) return;

    // Don't show if prompt is already open
    if (isPromptOpen) return;

    const daysSinceSignup = getDaysSinceSignup();

    const triggerResult = checkUpgradeTriggers(
      {
        coachCount,
        messagesCount,
        workoutCount,
        daysSinceSignup,
      },
      userId,
    );

    if (triggerResult) {
      // Small delay to avoid showing immediately on page load
      const timeoutId = setTimeout(() => {
        setActiveTrigger(triggerResult.trigger);
        setIsPromptOpen(true);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [
    userId,
    coachCount,
    messagesCount,
    workoutCount,
    isLoading,
    subscription,
    isPromptOpen,
    getDaysSinceSignup,
  ]);

  // Handler to close prompt
  const closePrompt = useCallback(() => {
    setIsPromptOpen(false);
    setActiveTrigger(null);
  }, []);

  // Handler to manually trigger a prompt (e.g., from a button)
  const showPrompt = useCallback(
    (trigger = UPGRADE_TRIGGERS.MANUAL) => {
      if (subscription?.tier === SUBSCRIPTION_TIERS.ELECTRIC) return;

      setActiveTrigger(trigger);
      setIsPromptOpen(true);
    },
    [subscription],
  );

  // Check if user needs onboarding shown
  const shouldShowOnboarding = useCallback(() => {
    if (!userId) return false;

    const onboardingShown = localStorage.getItem(
      `${STORAGE_KEYS.ONBOARDING_SHOWN}_${userId}`,
    );

    // Return false if onboarding was shown (either old "true" format or timestamp)
    return !onboardingShown;
  }, [userId]);

  // Check if onboarding was shown recently (within cooldown period)
  const wasOnboardingShownRecently = useCallback(() => {
    if (!userId) return false;

    const onboardingShown = localStorage.getItem(
      `${STORAGE_KEYS.ONBOARDING_SHOWN}_${userId}`,
    );

    if (!onboardingShown) return false;

    // Handle old format ("true") - no timestamp, so treat cooldown as expired
    // This allows upgrade prompts to show for existing users
    if (onboardingShown === "true") return false;

    // Handle timestamp format - check if within cooldown period (24 hours)
    const onboardingTimestamp = parseInt(onboardingShown, 10);
    if (isNaN(onboardingTimestamp)) return false;

    const hoursSinceOnboarding =
      (Date.now() - onboardingTimestamp) / (1000 * 60 * 60);
    const COOLDOWN_HOURS = 24; // Don't show upgrade prompt for 24 hours after onboarding

    return hoursSinceOnboarding < COOLDOWN_HOURS;
  }, [userId]);

  // Mark onboarding as shown (stores timestamp for cooldown tracking)
  const markOnboardingShown = useCallback(() => {
    if (!userId) return;

    // Store timestamp instead of just "true" to track when onboarding was shown
    localStorage.setItem(
      `${STORAGE_KEYS.ONBOARDING_SHOWN}_${userId}`,
      Date.now().toString(),
    );
  }, [userId]);

  return {
    // Prompt state
    isPromptOpen,
    activeTrigger,
    closePrompt,
    showPrompt,

    // Subscription state
    subscription,
    isLoadingSubscription: isLoading,
    isPremium: subscription?.tier === SUBSCRIPTION_TIERS.ELECTRIC,

    // Onboarding state
    shouldShowOnboarding: shouldShowOnboarding(),
    markOnboardingShown,
    wasOnboardingShownRecently: wasOnboardingShownRecently(),

    // Utilities
    UPGRADE_TRIGGERS,
  };
}

/**
 * Check if onboarding was shown recently (within cooldown period)
 * Exported for use in UpgradePrompt rate limiting
 * @param {string} userId - The user ID
 * @returns {boolean} - Whether onboarding was shown within the last 24 hours
 */
export function wasOnboardingShownRecently(userId) {
  if (!userId) return false;

  const onboardingShown = localStorage.getItem(
    `${STORAGE_KEYS.ONBOARDING_SHOWN}_${userId}`,
  );

  if (!onboardingShown) return false;

  // Handle old format ("true") - no timestamp, so treat cooldown as expired
  // This allows upgrade prompts to show for existing users
  if (onboardingShown === "true") return false;

  // Handle timestamp format - check if within cooldown period (24 hours)
  const onboardingTimestamp = parseInt(onboardingShown, 10);
  if (isNaN(onboardingTimestamp)) return false;

  const hoursSinceOnboarding =
    (Date.now() - onboardingTimestamp) / (1000 * 60 * 60);
  const COOLDOWN_HOURS = 24; // Don't show upgrade prompt for 24 hours after onboarding

  return hoursSinceOnboarding < COOLDOWN_HOURS;
}

export default useUpgradePrompts;
