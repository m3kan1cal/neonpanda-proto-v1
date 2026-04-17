import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getPresignedImageUrl } from "../../utils/s3Helper";
import { logger } from "../../utils/logger";

/**
 * Component to load and display images with presigned URLs from private S3 bucket.
 * Clicking the thumbnail opens a full-screen lightbox (same pattern as LandingPage.jsx).
 * Images fade in on load to avoid the hard snap from spinner to image.
 *
 * @param {string} s3Key - The S3 key for the image
 * @param {string} userId - The user ID for authentication
 * @param {number} index - The index of the image (for alt text)
 */
const VARIANT_STYLES = {
  maroon: "border-synthwave-neon-maroon/40 shadow-[0_0_6px_rgba(139,0,69,0.2)]",
  cyan: "border-synthwave-neon-cyan/40 shadow-[0_0_6px_rgba(0,255,255,0.15)]",
};

const ImageWithPresignedUrl = ({
  s3Key,
  userId,
  index,
  thumbnailSize = "w-24 h-24",
  variant = "maroon",
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await getPresignedImageUrl(s3Key, userId);
        if (url) {
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        logger.error("Failed to load presigned URL:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [s3Key, userId]);

  // Escape key to close lightbox
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (error) {
    return null;
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className={`relative overflow-hidden rounded-md border ${VARIANT_STYLES[variant] ?? VARIANT_STYLES.maroon} ${thumbnailSize} bg-synthwave-bg-primary/50 cursor-zoom-in`}
        onClick={() => !loading && imageLoaded && setIsOpen(true)}
      >
        {/* Spinner — shown while URL is fetching OR while the browser is painting the image */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Image — rendered once URL is ready, fades in when browser finishes painting */}
        {!loading && imageUrl && (
          <img
            src={imageUrl}
            alt={`Uploaded image ${index + 1}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>

      {/* Lightbox — portal to document.body so CSS transform on ContextualChatDrawer doesn't break fixed positioning */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ maxWidth: "85vw", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={`Uploaded image ${index + 1}`}
              className="block object-contain rounded-md shadow-2xl"
              style={{ maxWidth: "85vw", maxHeight: "80vh" }}
            />
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-synthwave-neon-pink rounded-full flex items-center justify-center text-white hover:bg-synthwave-neon-pink/80 transition-colors duration-200"
              aria-label="Close image"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ImageWithPresignedUrl;
