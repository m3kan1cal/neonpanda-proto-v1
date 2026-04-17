import React, { useState, useCallback } from "react";
import { getPresignedImageUrl } from "../../utils/s3Helper";
import { logger } from "../../utils/logger";

function getFileLabel(s3Key) {
  const ext = s3Key.split(".").pop()?.toLowerCase() || "";
  const labelMap = {
    pdf: "PDF",
    csv: "CSV",
    txt: "TXT",
    md: "MD",
    doc: "DOC",
    docx: "DOCX",
    xls: "XLS",
    xlsx: "XLSX",
    html: "HTML",
  };
  return labelMap[ext] || "FILE";
}

function getFileName(s3Key) {
  return s3Key.split("/").pop() || "document";
}

const VARIANT_STYLES = {
  maroon:
    "border-synthwave-neon-maroon/40 shadow-[0_0_6px_rgba(139,0,69,0.2)]",
  cyan: "border-synthwave-neon-cyan/40 shadow-[0_0_6px_rgba(0,255,255,0.15)]",
  purple:
    "border-synthwave-neon-purple/40 shadow-[0_0_6px_rgba(168,85,247,0.15)]",
};

const BADGE_STYLES = {
  maroon: "bg-synthwave-neon-maroon/20 text-synthwave-neon-maroon",
  cyan: "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan",
  purple: "bg-synthwave-neon-purple/20 text-synthwave-neon-purple",
};

/**
 * Renders a document attachment as a square thumbnail — visually consistent with
 * ImageWithPresignedUrl. Accepts the same thumbnailSize and variant props.
 * Click to download via presigned URL.
 *
 * @param {string} s3Key - The S3 key for the document
 * @param {string} userId - The user ID for generating presigned URLs
 * @param {string} thumbnailSize - Tailwind size classes (default "w-24 h-24")
 * @param {string} variant - Border/shadow color: "purple" | "maroon" | "cyan"
 */
export default function DocumentThumbnail({
  s3Key,
  userId,
  thumbnailSize = "w-24 h-24",
  variant = "purple",
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const url = await getPresignedImageUrl(s3Key, userId);
      if (url) {
        window.open(url, "_blank");
      }
    } catch (err) {
      logger.error("Failed to download document:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [s3Key, userId, isDownloading]);

  const fileLabel = getFileLabel(s3Key);
  const fileName = getFileName(s3Key);
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.purple;
  const badgeStyle = BADGE_STYLES[variant] ?? BADGE_STYLES.purple;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`relative overflow-hidden rounded-md border ${variantStyle} ${thumbnailSize} bg-synthwave-bg-primary/50 flex items-center justify-center cursor-pointer hover:brightness-110 transition-all duration-200`}
    >
      {/* Downloading spinner overlay */}
      {isDownloading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="w-5 h-5 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Document icon — centered */}
      <svg
        className="w-6 h-6 text-synthwave-text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      {/* File type badge — top-left */}
      <span
        className={`absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${badgeStyle}`}
      >
        {fileLabel}
      </span>

      {/* Filename — bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
        <span className="text-white text-[9px] font-body block truncate leading-tight">
          {fileName}
        </span>
      </div>
    </button>
  );
}
