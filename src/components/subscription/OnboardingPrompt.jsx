import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { useAuth } from "../../auth/contexts/AuthContext";
import {
  getElectricPandaPaymentLink,
  getTierDisplayInfo,
  SUBSCRIPTION_TIERS,
} from "../../utils/apis/subscriptionApi";
import { ArrowRightIcon, CheckIcon } from "../themes/SynthwaveComponents";

/**
 * OnboardingPrompt - Feature announcement prompt shown after first login
 *
 * Uses in-app modal theming (blurred backdrop, centered card).
 * Offers two paths:
 * 1. Upgrade to ElectricPanda (redirects to Stripe checkout)
 * 2. Start using NeonPanda (continues to dashboard as free user)
 */
function OnboardingPrompt({ isOpen, onClose, userId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const userEmail = user?.attributes?.email || "";
  const electricInfo = getTierDisplayInfo(SUBSCRIPTION_TIERS.ELECTRIC);
  const freeInfo = getTierDisplayInfo(SUBSCRIPTION_TIERS.FREE);

  const handleStartFree = () => {
    // Simply close modal and continue to dashboard
    onClose();
    navigate(`/coaches?userId=${userId}`);
  };

  const handleUpgradeNow = () => {
    setIsLoading(true);
    const paymentLink = getElectricPandaPaymentLink(userId, userEmail);

    if (paymentLink) {
      setTimeout(() => {
        window.location.href = paymentLink;
      }, 1000);
    } else {
      console.error("Payment link not configured");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div
        className={`${containerPatterns.successModal} p-6 max-w-lg w-full mx-4`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-4">
          <img
            src="/images/logo-light-sm.png"
            alt="NeonPanda Logo"
            className="h-12 w-auto"
          />
        </div>

        {/* Header - left aligned like completion modal */}
        <div className="mb-6">
          <h1 className={`${typographyPatterns.cardTitle} mb-2`}>
            Ready to start your journey?
          </h1>
          <p className="font-rajdhani text-synthwave-text-secondary text-base mb-4">
            You've unlocked the next frontier in fitness – where AI becomes your
            trusted training partner, evolving and learning with every workout.
          </p>
          <p className="font-rajdhani text-synthwave-text-secondary text-base">
            You're starting as an{" "}
            <span className="text-synthwave-neon-cyan font-semibold">
              {freeInfo.displayName}
            </span>{" "}
            ({freeInfo.price}) with full access to all features. No credit card
            required.
          </p>
        </div>

        {/* ElectricPanda upgrade option */}
        <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-purple/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-purple/20 mb-6">
          <div className="mb-3">
            <p className="font-rajdhani text-synthwave-text-secondary text-sm mb-4">
              Upgrade to{" "}
              <span className="text-synthwave-neon-pink font-semibold">
                {electricInfo.displayName}
              </span>{" "}
              for{" "}
              <span className="text-synthwave-neon-pink font-semibold">
                {electricInfo.price}
              </span>{" "}
              to support platform development and lock in founding member
              pricing forever. Your rate stays the same as new features land.
              This exclusive tier won't be available indefinitely.
            </p>
          </div>
          <ul className="hidden md:block space-y-2 mb-4">
            {electricInfo.features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 font-rajdhani text-synthwave-text-secondary text-sm"
              >
                <div className="text-synthwave-neon-pink flex-shrink-0">
                  <CheckIcon />
                </div>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgradeNow}
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

        {/* Divider - styled like Coaches page */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-synthwave-neon-cyan/30"></div>
          <span className="font-russo text-synthwave-neon-cyan text-lg uppercase mx-6 tracking-wider">
            OR
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-synthwave-neon-cyan/30"></div>
        </div>

        {/* Getting started guidance */}
        <div className="mb-4">
          <p className="font-rajdhani text-synthwave-text-secondary text-sm">
            Want to get started? Create your first coach, start conversations,
            log workouts, and explore your Training Grounds to unlock the full
            power of AI coaching.
          </p>
        </div>

        {/* Primary CTA - Start using NeonPanda */}
        <button
          onClick={handleStartFree}
          className={`${buttonPatterns.primary} w-full`}
        >
          <span className="flex items-center justify-center gap-2">
            Start Using Platform
            <ArrowRightIcon className="w-5 h-5" />
          </span>
        </button>

        {/* Fine print */}
        <p className="font-rajdhani text-xs text-synthwave-text-muted text-center mt-6">
          You can upgrade anytime from Settings. No pressure, no deadlines.
        </p>
      </div>
    </div>
  );
}

export default OnboardingPrompt;
