import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
} from "../../utils/ui/uiPatterns";
import { useAuth } from "../../auth/contexts/AuthContext";
import {
  pollSubscriptionStatus,
  getTierDisplayInfo,
  SUBSCRIPTION_TIERS,
} from "../../utils/apis/subscriptionApi";
import { ArrowRightIcon, CheckIcon } from "../themes/SynthwaveComponents";

/**
 * WelcomePage - Post-checkout success page
 *
 * Uses auth-style full-page theming (gradient background, centered card).
 * Standalone landing page after Stripe redirect.
 * Polls for subscription status with exponential backoff to handle
 * the race condition between Stripe redirect and webhook processing.
 */
function WelcomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const userId =
    searchParams.get("userId") || user?.attributes?.["custom:user_id"];
  const sessionId = searchParams.get("session_id"); // Stripe adds this on redirect

  const [status, setStatus] = useState("polling"); // polling, success, timeout
  const [subscription, setSubscription] = useState(null);
  const [pollProgress, setPollProgress] = useState({
    attempt: 0,
    maxAttempts: 8,
  });

  // Poll for subscription status
  const checkSubscription = useCallback(async () => {
    if (!userId) {
      setStatus("timeout");
      return;
    }

    setStatus("polling");

    const result = await pollSubscriptionStatus(userId, {
      maxAttempts: 8,
      initialDelay: 500,
      maxDelay: 8000,
      expectedTier: SUBSCRIPTION_TIERS.ELECTRIC,
      onProgress: (progress) => {
        setPollProgress(progress);
      },
    });

    if (result.success) {
      setStatus("success");
      setSubscription(result.subscription);
    } else {
      setStatus("timeout");
      setSubscription(result.subscription);
    }
  }, [userId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const handleContinue = () => {
    navigate(`/coaches?userId=${userId}`);
  };

  const handleRetry = () => {
    checkSubscription();
  };

  const electricInfo = getTierDisplayInfo(SUBSCRIPTION_TIERS.ELECTRIC);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-y-contain bg-synthwave-bg-primary">
      {/* Full-page mask with gradient */}
      <div className={`fixed inset-0 ${layoutPatterns.authBackground}`}></div>

      {/* Content container */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg z-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img
                src="/images/logo-dark-sm.webp"
                alt="NeonPanda Logo"
                className="h-12 w-auto"
              />
            </div>

            {/* Tagline */}
            <p className="font-rajdhani text-synthwave-text-secondary">
              Where intelligent coaching meets grit, sweat, dreams, and science
            </p>
          </div>

          {/* Main content card */}
          <div className={`${containerPatterns.authForm} p-8`}>
            {/* Polling State */}
            {status === "polling" && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-synthwave-neon-purple/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-synthwave-neon-purple animate-spin"></div>
                  </div>

                  <h1 className="font-rajdhani font-bold text-2xl text-white mb-2 uppercase">
                    Processing Your Upgrade
                  </h1>
                  <p className="font-rajdhani text-synthwave-text-secondary mb-4">
                    Confirming your {electricInfo.displayName} subscription...
                  </p>

                  {/* Progress indicator */}
                  <div className="flex justify-center gap-1.5">
                    {Array.from({ length: pollProgress.maxAttempts }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            i < pollProgress.attempt
                              ? "bg-synthwave-neon-purple"
                              : "bg-synthwave-text-muted/30"
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {status === "success" && subscription && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple rounded-full flex items-center justify-center text-white">
                    <div className="scale-150">
                      <CheckIcon />
                    </div>
                  </div>

                  <h1 className="font-rajdhani font-bold text-2xl text-white mb-2 uppercase">
                    Thank you! You're All Set
                  </h1>
                  <p className="font-rajdhani text-synthwave-text-secondary mb-6">
                    You're now an{" "}
                    <span className="text-synthwave-neon-pink font-semibold">
                      {electricInfo.displayName}
                    </span>{" "}
                    with founding member pricing locked forever. You're
                    supporting active development, getting access to all new
                    features as they land, and have a voice in what we build
                    next.
                  </p>
                </div>

                {/* Benefits list */}
                <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-purple/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-purple/20 mb-6 text-left">
                  <h3 className="font-rajdhani text-sm text-synthwave-text-primary uppercase font-semibold mb-3">
                    Your Benefits
                  </h3>
                  <ul className="space-y-2">
                    {electricInfo.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 font-rajdhani text-synthwave-text-secondary text-sm"
                      >
                        <div className="text-synthwave-neon-pink shrink-0">
                          <CheckIcon />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleContinue}
                  className={`${buttonPatterns.heroCTA} w-full`}
                >
                  <span className="flex items-center justify-center gap-2">
                    Start Training
                    <ArrowRightIcon />
                  </span>
                </button>
              </div>
            )}

            {/* Timeout State - Graceful degradation */}
            {status === "timeout" && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-synthwave-neon-purple/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-synthwave-neon-purple animate-spin"></div>
                  </div>

                  <h1 className="font-rajdhani font-bold text-2xl text-white mb-2 uppercase">
                    Almost There
                  </h1>
                  <p className="font-rajdhani text-synthwave-text-secondary mb-2">
                    Your payment was received. We're still processing your
                    upgrade.
                  </p>
                  <p className="font-rajdhani text-synthwave-text-muted text-sm mb-6">
                    This usually takes just a moment. You can continue to the
                    app and check your subscription in Settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleContinue}
                    className={`${buttonPatterns.heroCTA} w-full`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Continue Training
                      <span className="w-5 h-5">
                        <ArrowRightIcon />
                      </span>
                    </span>
                  </button>

                  <button
                    onClick={handleRetry}
                    className={`${buttonPatterns.secondary} w-full`}
                  >
                    Check Again
                  </button>
                </div>

                <p className="font-rajdhani text-xs text-synthwave-text-muted text-center mt-6">
                  Having trouble?{" "}
                  <a
                    href="mailto:support@neonpanda.ai"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-pink transition-colors"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
