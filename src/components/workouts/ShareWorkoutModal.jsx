/**
 * ShareWorkoutModal.jsx
 *
 * Opens a modal showing a scaled preview of the Instagram story card.
 * Captures the full-res (1080x1920) hidden card with html2canvas, then
 * offers "Share" (Web Share API on mobile) and "Save Image" (download).
 *
 * Usage:
 *   <ShareWorkoutModal workout={workout} coachData={coachData} onClose={() => setOpen(false)} />
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import WorkoutShareCard from "./WorkoutShareCard";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { logger } from "../../utils/logger";

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

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  // Close on Escape; lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
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

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-[10001] p-4 flex items-center justify-center animate-fade-in"
        onClick={onClose}
      >
        <div
          className={`${containerPatterns.successModal} p-6 relative w-full max-w-lg max-h-[92vh] overflow-y-auto synthwave-scrollbar-cyan`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer"
            aria-label="Close share modal"
          >
            <CloseIcon />
          </button>

          {/* Header */}
          <div className="pb-4 mb-4 border-b border-synthwave-neon-cyan/20 pr-8">
            <h3 className={typographyPatterns.cardTitle}>Share Workout</h3>
            <p className="font-body text-sm font-semibold text-synthwave-neon-cyan mt-1">
              {workoutName}
            </p>
          </div>

          {/* Card preview */}
          <div className="flex justify-center mb-4">
            {isCapturing && (
              <div
                className="flex flex-col items-center justify-center gap-4"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  aspectRatio: "9 / 16",
                }}
              >
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin border-synthwave-neon-cyan" />
                <p className="text-sm font-body text-synthwave-text-secondary">
                  Generating your card...
                </p>
              </div>
            )}

            {captureError && !isCapturing && (
              <div className="flex flex-col items-center gap-3 text-center py-8">
                <p className="text-sm font-body text-synthwave-neon-pink">
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
                  width: "100%",
                  maxWidth: "100%",
                  aspectRatio: "9 / 16",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(0,255,255,0.2)",
                  boxShadow:
                    "0 0 30px rgba(255,0,128,0.12), 0 8px 32px rgba(0,0,0,0.5)",
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
            <p className="text-center text-xs font-body text-synthwave-text-muted pb-3">
              Save the image and share it to your Instagram Story
            </p>
          )}

          {/* Action buttons — Save Image left, Share right */}
          <div className="flex gap-3 pt-4 border-t border-synthwave-neon-cyan/10">
            <button
              onClick={handleDownload}
              disabled={!capturedBlob || isCapturing}
              className={`flex-1 ${canNativeShare ? buttonPatterns.secondaryMedium : buttonPatterns.primaryMedium} gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <DownloadIcon />
              Save Image
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={!capturedBlob || isCapturing || isSharing}
                className={`flex-1 ${buttonPatterns.primaryMedium} gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ShareWorkoutModal;
