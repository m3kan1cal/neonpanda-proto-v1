/**
 * ShareProgramModal - Generate shareable links for programs
 *
 * Allows users to create shareable links for their active or completed programs.
 * Provides options to copy link, share on social media, and view the public preview.
 */

import React, { useState, useEffect } from "react";
import { createSharedProgram } from "../../utils/apis/sharedProgramApi.js";
import {
  containerPatterns,
  buttonPatterns,
  formPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns.js";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { logger } from "../../utils/logger";

function ShareProgramModal({ program, userId, onClose, onSuccess }) {
  const [shareUrl, setShareUrl] = useState(null);
  const [sharedProgramId, setSharedProgramId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate share link on mount
  useEffect(() => {
    const abortController = new AbortController();

    const generateLink = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get first coach ID (programs can have multiple coaches, use first)
        const coachId = program.coachIds?.[0];

        if (!coachId) {
          throw new Error("Program has no associated coach");
        }

        // Pass AbortSignal to cancel request if component unmounts (React Strict Mode)
        const result = await createSharedProgram(
          userId,
          program.programId,
          coachId,
          { signal: abortController.signal },
        );

        // Request completed successfully - update state
        setSharedProgramId(result.sharedProgramId);
        setShareUrl(result.shareUrl);

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        // Ignore AbortErrors - these are expected when component unmounts
        if (err.name === "AbortError") {
          return;
        }

        logger.error("Failed to create share link:", err);
        setError(
          err.message || "Failed to create share link. Please try again.",
        );
      } finally {
        // Only update loading state if not aborted
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    generateLink();

    // Cleanup: abort the request if component unmounts
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: generate link once on mount

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [loading, onClose]);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      const coachId = program.coachIds?.[0];

      if (!coachId) {
        throw new Error("Program has no associated coach");
      }

      const result = await createSharedProgram(
        userId,
        program.programId,
        coachId,
      );

      setSharedProgramId(result.sharedProgramId);
      setShareUrl(result.shareUrl);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      logger.error("Failed to create share link:", err);
      setError(err.message || "Failed to create share link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;

    navigator.clipboard.writeText(shareUrl);
    setCopied(true);

    // Reset copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSocialShare = (platform) => {
    if (!shareUrl) return;

    const text = `Just crushed this training program on @NeonPanda! Check it out:`;

    // Instagram doesn't have a direct web share URL, so we copy link and open Instagram
    if (platform === "instagram") {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      window.open("https://www.instagram.com/", "_blank");
      return;
    }

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const handleViewPreview = () => {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 p-4 flex items-center justify-center animate-fade-in"
        onClick={() => !loading && onClose()}
      >
        <div
          className={`${containerPatterns.successModal} p-6 relative w-full max-w-md`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {!loading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <h3 className={`${typographyPatterns.cardTitle} mb-2`}>
              Share Your Journey
            </h3>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm">
              Generate a shareable link for "{program.name}". Anyone with the
              link can preview it and adapt it with their AI coach.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-synthwave-neon-cyan/20 border-t-synthwave-neon-cyan rounded-full animate-spin mb-4"></div>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Generating share link...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center mb-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 font-rajdhani text-sm">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className={`${buttonPatterns.secondary} w-full`}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success State - Share Options */}
          {shareUrl && !loading && !error && (
            <div className="space-y-5">
              {/* Share Link Input */}
              <div>
                <label className={formPatterns.label}>Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl text-synthwave-text-primary font-rajdhani cursor-text select-all transition-all duration-300 focus:outline-none focus:border-synthwave-neon-cyan focus:bg-synthwave-bg-primary/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={(e) => e.target.select()}
                    style={{ boxShadow: "none", outline: "none" }}
                    onFocus={(e) => {
                      e.target.style.outline = "none";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors rounded-lg hover:bg-synthwave-neon-cyan/10 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <svg
                        className="w-5 h-5 text-synthwave-neon-cyan"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-synthwave-neon-cyan font-rajdhani text-sm mt-2">
                    Link copied to clipboard!
                  </p>
                )}
              </div>

              {/* Social Share Buttons */}
              <div>
                <label className={formPatterns.label}>Social Sharing</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSocialShare("twitter")}
                    className={`${buttonPatterns.secondaryMedium} flex-1`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="hidden sm:inline">X</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleSocialShare("facebook")}
                    className={`${buttonPatterns.secondaryMedium} flex-1`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span className="hidden sm:inline">Facebook</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleSocialShare("instagram")}
                    className={`${buttonPatterns.secondaryMedium} flex-1`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      <span className="hidden sm:inline">Instagram</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Preview Button */}
              <div className="pt-2 border-t border-synthwave-neon-cyan/10">
                <button
                  onClick={handleViewPreview}
                  className={`${buttonPatterns.secondary} w-full`}
                >
                  View Public Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ShareProgramModal;
