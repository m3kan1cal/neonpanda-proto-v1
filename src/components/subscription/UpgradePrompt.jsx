import React, { useState, useEffect, useCallback } from "react";
import { containerPatterns, buttonPatterns } from "../../utils/ui/uiPatterns";
import { useAuth } from "../../auth/contexts/AuthContext";
import {
  getElectricPandaPaymentLink,
  getTierDisplayInfo,
  SUBSCRIPTION_TIERS,
} from "../../utils/apis/subscriptionApi";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { logger } from "../../utils/logger";
import {
  STORAGE_KEYS,
  wasOnboardingShownRecently,
} from "../../hooks/useUpgradePrompts";

/**
 * Upgrade trigger types for analytics and rate limiting
 */
const UPGRADE_TRIGGERS = {
  COACHES_COUNT: "coaches_count",
  WORKOUTS_COUNT: "workouts_count",
  MESSAGES_COUNT: "messages_count",
  DAYS_ACTIVE: "days_active",
  MANUAL: "manual",
};

/**
 * Rate limit constants
 */
const RATE_LIMITS = {
  MIN_DAYS_BETWEEN_SAME_TRIGGER: 7, // Max once per week per trigger
  ONE_PER_SESSION: true, // Only one prompt per browser session
};

/**
 * UpgradePrompt - Smart contextual upgrade prompt
 *
 * Uses app theming (private pages).
 * Shows upgrade prompts based on smart triggers:
 * - After 2 coaches created
 * - After 4 workouts logged
 * - After 7 days of use
 * - After first positive feedback
 *
 * Includes rate limiting:
 * - Max once per week per trigger type
 * - Max one prompt per session
 */
function UpgradePrompt({
  isOpen,
  onClose,
  userId,
  trigger = UPGRADE_TRIGGERS.MANUAL,
  contextMessage = null,
}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const userEmail = user?.attributes?.email || "";
  const electricInfo = getTierDisplayInfo(SUBSCRIPTION_TIERS.ELECTRIC);

  // Record this prompt for rate limiting
  useEffect(() => {
    if (isOpen && trigger !== UPGRADE_TRIGGERS.MANUAL && userId) {
      recordPrompt(trigger, userId);
    }
  }, [isOpen, trigger, userId]);

  const handleUpgrade = () => {
    setIsLoading(true);
    const paymentLink = getElectricPandaPaymentLink(userId, userEmail);

    if (paymentLink) {
      setTimeout(() => {
        window.location.href = paymentLink;
      }, 1000);
    } else {
      logger.error("Payment link not configured");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  // Get context-aware messaging
  const getMessage = () => {
    if (contextMessage) return contextMessage;

    const pinkText = (text) => (
      <span className="text-synthwave-neon-pink font-semibold">{text}</span>
    );

    switch (trigger) {
      case UPGRADE_TRIGGERS.COACHES_COUNT:
        return (
          <>
            You're getting great value from multiple AI coaches. Consider
            becoming an {pinkText("ElectricPanda")} founding member to support
            development while locking in your rate for new features.
          </>
        );
      case UPGRADE_TRIGGERS.WORKOUTS_COUNT:
        return (
          <>
            You've been actively logging workouts. If you're finding value,
            consider becoming an {pinkText("ElectricPanda")} founding member to
            shape how we evolve and access new features as they land.
          </>
        );
      case UPGRADE_TRIGGERS.MESSAGES_COUNT:
        return (
          <>
            You're getting a lot out of your coach conversations. Consider{" "}
            {pinkText("ElectricPanda")} founding membership to support your
            training journey and get access to all future features.
          </>
        );
      case UPGRADE_TRIGGERS.DAYS_ACTIVE:
        return (
          <>
            You've been training with NeonPanda for a week. If you're enjoying
            it, consider {pinkText("ElectricPanda")} founding membership to lock
            in your rate while it's still available.
          </>
        );
      default:
        return (
          <>
            Consider becoming an {pinkText("ElectricPanda")} founding member to
            lock in your rate forever and support platform development as new
            advanced features and analytics land.
          </>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Prompt card - centered on both mobile and desktop */}
      <div
        className="fixed inset-0 z-50 p-4 flex items-center justify-center animate-fade-in"
        onClick={handleClose}
      >
        <div
          className={`${containerPatterns.successModal} p-6 relative w-full max-w-md`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>

          {/* Logo */}
          <div className="flex items-center justify-center mb-4">
            <img
              src="/images/logo-dark-sm.webp"
              alt="NeonPanda Logo"
              className="h-10 w-auto"
            />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="font-rajdhani font-bold text-xl text-white mb-2 uppercase">
              Become a Founding Member
            </h3>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-3">
              You're currently on{" "}
              <span className="text-synthwave-neon-cyan font-semibold">
                EarlyPanda (Free)
              </span>
              .
            </p>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm">
              {getMessage()}
            </p>
          </div>

          {/* Price highlight */}
          <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-lg p-4 mb-6 text-center">
            <span className="font-rajdhani text-white text-2xl font-bold">
              {electricInfo.price}
            </span>
            <span className="font-rajdhani text-synthwave-text-muted text-sm ml-2">
              locked forever
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className={`${buttonPatterns.heroCTA} w-full`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Redirecting...</span>
                </span>
              ) : (
                "Upgrade Plan"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Rate Limiting Utilities
// ============================================================================

/**
 * Check if an upgrade prompt should be shown based on rate limiting
 * @param {string} trigger - The trigger type
 * @param {string} userId - The user ID for user-specific rate limiting
 * @returns {boolean} - Whether the prompt should be shown
 */
export function shouldShowUpgradePrompt(trigger, userId) {
  if (!userId) return false;

  // Check onboarding cooldown - don't show upgrade prompt if onboarding was shown recently
  if (wasOnboardingShownRecently(userId)) {
    return false;
  }

  // Check session limit
  if (RATE_LIMITS.ONE_PER_SESSION) {
    const sessionPrompted = sessionStorage.getItem(
      `${STORAGE_KEYS.SESSION_PROMPTED}_${userId}`,
    );
    if (sessionPrompted === "true") {
      return false;
    }
  }

  // Check per-trigger rate limit
  if (trigger !== UPGRADE_TRIGGERS.MANUAL) {
    const triggerTimesJson = localStorage.getItem(
      `${STORAGE_KEYS.LAST_TRIGGER_TIMES}_${userId}`,
    );
    const triggerTimes = triggerTimesJson ? JSON.parse(triggerTimesJson) : {};

    const lastTriggerTime = triggerTimes[trigger];
    if (lastTriggerTime) {
      const daysSinceLastTrigger =
        (Date.now() - lastTriggerTime) / (1000 * 60 * 60 * 24);

      if (daysSinceLastTrigger < RATE_LIMITS.MIN_DAYS_BETWEEN_SAME_TRIGGER) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Record that an upgrade prompt was shown
 * @param {string} trigger - The trigger type
 * @param {string} userId - The user ID for user-specific tracking
 */
function recordPrompt(trigger, userId) {
  if (!userId) return;

  // Mark session as prompted
  sessionStorage.setItem(`${STORAGE_KEYS.SESSION_PROMPTED}_${userId}`, "true");

  // Record trigger time
  const triggerTimesJson = localStorage.getItem(
    `${STORAGE_KEYS.LAST_TRIGGER_TIMES}_${userId}`,
  );
  const triggerTimes = triggerTimesJson ? JSON.parse(triggerTimesJson) : {};
  triggerTimes[trigger] = Date.now();
  localStorage.setItem(
    `${STORAGE_KEYS.LAST_TRIGGER_TIMES}_${userId}`,
    JSON.stringify(triggerTimes),
  );

  // Record overall last prompt time
  localStorage.setItem(
    `${STORAGE_KEYS.LAST_PROMPT_TIME}_${userId}`,
    Date.now().toString(),
  );
}

/**
 * Check trigger thresholds against user data
 * @param {Object} userData - User activity data
 * @param {string} userId - The user ID for user-specific rate limiting
 * @returns {Object|null} - Trigger info if threshold met, null otherwise
 */
export function checkUpgradeTriggers(userData, userId) {
  if (!userId) return null;

  const {
    coachCount = 0,
    workoutCount = 0,
    messagesCount = 0,
    daysSinceSignup = 0,
  } = userData;

  // Check thresholds in priority order
  if (
    coachCount >= 2 &&
    shouldShowUpgradePrompt(UPGRADE_TRIGGERS.COACHES_COUNT, userId)
  ) {
    return { trigger: UPGRADE_TRIGGERS.COACHES_COUNT };
  }

  if (
    messagesCount >= 20 &&
    shouldShowUpgradePrompt(UPGRADE_TRIGGERS.MESSAGES_COUNT, userId)
  ) {
    return { trigger: UPGRADE_TRIGGERS.MESSAGES_COUNT };
  }

  if (
    workoutCount >= 4 &&
    shouldShowUpgradePrompt(UPGRADE_TRIGGERS.WORKOUTS_COUNT, userId)
  ) {
    return { trigger: UPGRADE_TRIGGERS.WORKOUTS_COUNT };
  }

  if (
    daysSinceSignup >= 7 &&
    shouldShowUpgradePrompt(UPGRADE_TRIGGERS.DAYS_ACTIVE, userId)
  ) {
    return { trigger: UPGRADE_TRIGGERS.DAYS_ACTIVE };
  }

  return null;
}

export { UPGRADE_TRIGGERS };
export default UpgradePrompt;
