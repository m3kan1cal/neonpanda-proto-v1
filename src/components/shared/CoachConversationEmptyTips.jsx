import React from "react";
import {
  containerPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { CameraIcon } from "../themes/SynthwaveComponents";

/**
 * Coach chat empty state — full grid on the conversations page, curated compact tips in the Training Grounds drawer.
 *
 * @param {"page" | "drawer"} variant
 */
export default function CoachConversationEmptyTips({ variant = "page" }) {
  if (variant === "drawer") {
    return (
      <div className="flex flex-col items-stretch justify-start w-full py-2 px-1 space-y-3 overflow-y-auto synthwave-scrollbar-cyan">
        <div className="text-center space-y-1 px-1">
          <h3 className="font-header text-sm text-white uppercase tracking-wider">
            Ready to chat?
          </h3>
          <p className="font-body text-xs text-synthwave-text-secondary leading-snug">
            A few ways to get started from here.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div
            className={`${containerPatterns.emptyStateTipCard} !py-2.5 !px-3`}
          >
            <h3 className="font-semibold text-sm text-white mb-1">
              Show Me Your Work
            </h3>
            <p className="text-xs text-synthwave-text-secondary leading-snug">
              Hit the{" "}
              <span className="inline-flex items-center scale-90 text-synthwave-neon-pink translate-y-0.5">
                <CameraIcon />
              </span>{" "}
              below to share form videos, progress pics, or documents.
            </p>
          </div>

          <div
            className={`${containerPatterns.emptyStateTipCard} !py-2.5 !px-3`}
          >
            <h3 className="font-semibold text-sm text-white mb-1">
              Ask Me Anything
            </h3>
            <p className="text-xs text-synthwave-text-secondary leading-snug">
              Form checks, programming, recovery, or a pep talk—I&apos;m here
              for it.
            </p>
          </div>

          <div
            className={`${containerPatterns.emptyStateTipCard} !py-2.5 !px-3`}
          >
            <h3 className="font-semibold text-sm text-white mb-1">
              Log a result
            </h3>
            <p className="text-xs text-synthwave-text-secondary leading-snug mb-2">
              Drop a quick result so we can celebrate and track your gains.
            </p>
            <code className={`${typographyPatterns.inlineCode} !text-[10px]`}>
              /log-workout Fran 8:57
            </code>
          </div>

          <div
            className={`${containerPatterns.emptyStateTipCard} !py-2.5 !px-3`}
          >
            <h3 className="font-semibold text-sm text-white mb-1">
              Just Talk to Me
            </h3>
            <p className="text-xs text-synthwave-text-secondary leading-snug">
              Tell me what you want in plain language—I&apos;ll help you build
              from there.
            </p>
          </div>
        </div>

        <p
          className={`${typographyPatterns.emptyStateProTip} !text-xs text-center px-1`}
        >
          Pro tip: On the full chat page, hit{" "}
          <span className="text-synthwave-neon-cyan font-mono">/</span> to see
          commands.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 px-4">
      <div className="text-center space-y-2">
        <h3 className="font-header text-xl md:text-2xl text-white uppercase tracking-wider">
          Ready to Train?
        </h3>
        <p className={typographyPatterns.emptyStateDescription}>
          Let&apos;s get after it! Chat with me about anything fitness, or use
          these quick commands to dive right in.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-3xl">
        <div>
          <h4 className={typographyPatterns.emptyStateSectionHeader}>
            Use Slash Commands
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                Log Your Wins
              </h3>
              <p className={typographyPatterns.emptyStateCardTextWithMargin}>
                Drop your workout results so I can celebrate with you and track
                your gains
              </p>
              <code className={typographyPatterns.inlineCode}>
                /log-workout Fran 8:57
              </code>
            </div>

            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                Store What Matters
              </h3>
              <p className={typographyPatterns.emptyStateCardTextWithMargin}>
                Save notes about what works for you—I&apos;ll remember so you
                don&apos;t have to
              </p>
              <code className={typographyPatterns.inlineCode}>
                /save-memory prefer morning workouts
              </code>
            </div>
          </div>
        </div>

        <div>
          <h4 className={typographyPatterns.emptyStateSectionHeader}>
            Chat &amp; Build
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                Ask Me Anything
              </h3>
              <p className={typographyPatterns.emptyStateCardText}>
                Need form checks, programming help, guidance, answers, or a pep
                talk? I&apos;m here for all of it
              </p>
            </div>

            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                Just Talk to Me
              </h3>
              <p className={typographyPatterns.emptyStateCardText}>
                Log your session naturally or tell me what you want—I&apos;ll
                build the perfect workout for you
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className={typographyPatterns.emptyStateSectionHeader}>
            Media &amp; Quick Actions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                Show Me Your Work
              </h3>
              <p className={typographyPatterns.emptyStateCardText}>
                Hit the{" "}
                <span className="inline-flex items-center scale-90 text-synthwave-neon-pink translate-y-1">
                  <CameraIcon />
                </span>{" "}
                to share form videos, progress pics, or that whiteboard you just
                conquered
              </p>
            </div>

            <div className={containerPatterns.emptyStateTipCard}>
              <h3 className={typographyPatterns.emptyStateCardTitle}>
                One-Tap Favorites
              </h3>
              <p className={typographyPatterns.emptyStateCardText}>
                Check out Quick Prompts for instant check-ins, workout requests,
                and other handy shortcuts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className={typographyPatterns.emptyStateProTip}>
          Pro tip: Hit{" "}
          <span className="text-synthwave-neon-cyan font-mono">/</span> anytime
          to see what I can do
        </p>
      </div>
    </div>
  );
}
