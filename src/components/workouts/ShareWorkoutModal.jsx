/**
 * ShareWorkoutModal.jsx
 *
 * Opens a modal showing a scaled preview of the Instagram story card.
 * Captures the full-res (1080x1920) hidden card with html2canvas, then
 * offers "Save Image" (download) and "Share" (Web Share API on mobile).
 *
 * Usage:
 *   <ShareWorkoutModal workout={workout} coachData={coachData} onClose={() => setOpen(false)} />
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import WorkoutShareCard from "./WorkoutShareCard";
import { containerPatterns, buttonPatterns } from "../../utils/ui/uiPatterns";
import { logger } from "../../utils/logger";

const PREVIEW_HEIGHT = 520;
const PREVIEW_WIDTH = Math.round((PREVIEW_HEIGHT * 9) / 16);

const COLORS = {
  pink: "#ff0080",
  cyan: "#00ffff",
  purple: "#9f00ff",
  bgPrimary: "#0d0a1a",
  bgCard: "#1e1e2e",
  textPrimary: "#ffffff",
  textSecondary: "#b4b4b4",
};

function DownloadIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ShareWorkoutModal({ workout, coachData, onClose }) {
  const cardRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [captureError, setCaptureError] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const canNativeShare =
    typeof navigator !== "undefined" &&
    !!navigator.share &&
    !!navigator.canShare;

  const captureCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsCapturing(true);
    setCaptureError(null);

    try {
      const canvas = await html2canvas(cardRef.current, {
        width: 1080,
        height: 1920,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to convert canvas to blob"));
          },
          "image/png",
          1.0,
        );
      });

      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(url);
    } catch (err) {
      logger.error("Failed to capture share card:", err);
      setCaptureError("Failed to generate image. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Capture on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      captureCard();
    }, 200);
    return () => clearTimeout(timer);
  }, [captureCard]);

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    if (!capturedBlob) return;
    const workoutName =
      workout?.workoutData?.workout_name || workout?.workoutName || "workout";
    const slug = workoutName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(capturedBlob);
    a.download = `neonpanda-${slug}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleNativeShare = async () => {
    if (!capturedBlob || !navigator.share) return;
    const workoutName =
      workout?.workoutData?.workout_name || workout?.workoutName || "workout";
    const file = new File([capturedBlob], "neonpanda-workout.png", {
      type: "image/png",
    });

    try {
      setIsSharing(true);
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: workoutName,
          text: `Crushed it! ${workoutName} — tracked with NeonPanda AI`,
        });
      } else {
        await navigator.share({
          title: workoutName,
          text: `Crushed it! ${workoutName} — tracked with NeonPanda AI`,
          url: "https://neonpanda.ai",
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        logger.error("Share failed:", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const workoutName =
    workout?.workoutData?.workout_name ||
    workout?.workoutName ||
    "Your Workout";

  return (
    <>
      {/* Hidden full-res card for html2canvas capture */}
      <WorkoutShareCard ref={cardRef} workout={workout} coachData={coachData} />

      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal panel */}
        <div
          className="relative flex flex-col"
          style={{
            background: `linear-gradient(160deg, ${COLORS.bgPrimary} 0%, ${COLORS.bgCard} 100%)`,
            border: `1px solid rgba(0,255,255,0.15)`,
            borderRadius: "20px",
            boxShadow: `0 0 60px rgba(159,0,255,0.2), 0 24px 80px rgba(0,0,0,0.7)`,
            width: "min(92vw, 480px)",
            maxHeight: "96vh",
            overflow: "hidden",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              height: "3px",
              background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.cyan}, ${COLORS.purple})`,
              borderRadius: "20px 20px 0 0",
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="font-header font-bold text-white uppercase tracking-wide text-base">
                Share Workout
              </h2>
              <p
                className="text-xs font-body mt-0.5"
                style={{ color: COLORS.textSecondary }}
              >
                {workoutName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ color: COLORS.textSecondary }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = COLORS.textPrimary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = COLORS.textSecondary)
              }
              aria-label="Close share modal"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Card preview area */}
          <div
            className="flex items-center justify-center px-6 pb-4"
            style={{ minHeight: `${PREVIEW_HEIGHT}px` }}
          >
            {isCapturing && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: `${COLORS.cyan}66`,
                    borderTopColor: COLORS.cyan,
                  }}
                />
                <p
                  className="text-sm font-body"
                  style={{ color: COLORS.textSecondary }}
                >
                  Generating your card...
                </p>
              </div>
            )}

            {captureError && (
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <p className="text-sm font-body" style={{ color: COLORS.pink }}>
                  {captureError}
                </p>
                <button
                  onClick={captureCard}
                  className={buttonPatterns.secondarySmall}
                >
                  Try Again
                </button>
              </div>
            )}

            {capturedUrl && !isCapturing && (
              <div
                style={{
                  width: `${PREVIEW_WIDTH}px`,
                  height: `${PREVIEW_HEIGHT}px`,
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: `1px solid rgba(0,255,255,0.2)`,
                  boxShadow: `0 0 30px rgba(255,0,128,0.15), 0 8px 32px rgba(0,0,0,0.5)`,
                  flexShrink: 0,
                }}
              >
                <img
                  src={capturedUrl}
                  alt="Workout share card preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            )}
          </div>

          {/* Instruction text */}
          {capturedUrl && !isCapturing && (
            <p
              className="text-center text-xs font-body pb-3 px-6"
              style={{ color: COLORS.textMuted }}
            >
              Save the image and share it to your Instagram Story
            </p>
          )}

          {/* Action buttons */}
          <div
            className="flex gap-3 px-6 pb-6"
            style={{
              borderTop: `1px solid rgba(0,255,255,0.08)`,
              paddingTop: "20px",
            }}
          >
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={!capturedBlob || isCapturing}
              className={`flex-1 ${buttonPatterns.primaryMedium} gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <DownloadIcon />
              Save Image
            </button>

            {/* Native share (mobile) or Copy hint (desktop) */}
            {canNativeShare ? (
              <button
                onClick={handleNativeShare}
                disabled={!capturedBlob || isCapturing || isSharing}
                className={`flex-1 ${buttonPatterns.secondaryMedium} gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isSharing ? (
                  <>
                    <SpinnerIcon />
                    Sharing...
                  </>
                ) : (
                  <>
                    <ShareIcon />
                    Share
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`flex-1 ${buttonPatterns.secondaryMedium}`}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ShareWorkoutModal;
