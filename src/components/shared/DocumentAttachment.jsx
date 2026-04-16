import React, { useState, useCallback } from "react";
import { getPresignedImageUrl } from "../../utils/s3Helper";
import { logger } from "../../utils/logger";

/**
 * File type icon mapping — returns an emoji/label for each supported extension.
 */
function getFileIcon(s3Key) {
  const ext = s3Key.split(".").pop()?.toLowerCase() || "";
  const iconMap = {
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
  return iconMap[ext] || "FILE";
}

function getFileName(s3Key) {
  return s3Key.split("/").pop() || "document";
}

/**
 * Renders a document attachment pill in a message bubble.
 * Click to download via presigned GET URL.
 *
 * @param {string} s3Key - The S3 key for the document
 * @param {string} userId - The user ID for generating presigned URLs
 */
export default function DocumentAttachment({ s3Key, userId }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      // Reuse the existing presigned URL helper (works for any S3 key)
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

  const fileLabel = getFileIcon(s3Key);
  const fileName = getFileName(s3Key);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-2 bg-synthwave-bg-primary/60 border border-synthwave-neon-purple/30 rounded-md px-3 py-1.5 text-xs font-body hover:border-synthwave-neon-purple/60 hover:bg-synthwave-bg-primary/80 transition-all duration-200 cursor-pointer group"
    >
      <span className="shrink-0 px-1 py-0.5 rounded bg-synthwave-neon-purple/20 text-synthwave-neon-purple text-[10px] font-semibold uppercase tracking-wide">
        {fileLabel}
      </span>
      <span className="text-synthwave-text-secondary group-hover:text-synthwave-text-primary truncate max-w-[160px] transition-colors">
        {fileName}
      </span>
      {isDownloading && (
        <div className="w-3 h-3 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin shrink-0"></div>
      )}
    </button>
  );
}
