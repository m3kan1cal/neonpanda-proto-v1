/**
 * S3 Helper Utilities
 * Constructs S3 URLs based on the current environment (sandbox, develop, main)
 */

import outputs from "../../amplify_outputs.json";
import { logger } from "./logger";

/**
 * Get the S3 bucket name based on the current environment
 * Pattern: midgard-apps-main, midgard-apps-develop, midgard-apps-sandbox-{id}
 */
export function getAppsBucketName() {
  // Read from Amplify outputs (set during deployment)
  const bucketName = outputs.custom?.storage?.appsBucket?.bucketName;

  if (!bucketName) {
    logger.error(
      "CRITICAL: S3 bucket name not found in amplify_outputs.json. Please redeploy the backend.",
    );
    throw new Error(
      "S3 bucket configuration missing. Please redeploy the backend with: npx ampx sandbox --outputs-out-dir src",
    );
  }

  return bucketName;
}

/**
 * Get the S3 region
 */
export function getS3Region() {
  return (
    outputs.custom?.storage?.appsBucket?.region ||
    outputs.auth?.aws_region ||
    "us-west-2"
  );
}

/**
 * Construct a full S3 URL from an S3 key
 * Note: This returns a direct S3 URL which won't work for private buckets.
 * Use getPresignedImageUrl() instead for displaying images from private buckets.
 * @param {string} s3Key - The S3 key (e.g., "user-uploads/user-123/image.jpg")
 * @returns {string} - Full S3 URL
 */
export function getS3Url(s3Key) {
  if (!s3Key) return "";

  const bucketName = getAppsBucketName();
  const region = getS3Region();

  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Get presigned URLs for viewing images from S3
 * This is required because the S3 bucket is private
 * @param {string[]} s3Keys - Array of S3 keys (e.g., ["user-uploads/user-123/image.jpg"])
 * @param {string} userId - The user ID for authorization
 * @returns {Promise<Object>} - Map of s3Key to presigned download URL
 */
export async function getPresignedImageUrls(s3Keys, userId) {
  if (!s3Keys || s3Keys.length === 0 || !userId) return {};

  try {
    const { authenticatedFetch } = await import("./apis/apiConfig");

    // Call the backend to get presigned download URLs
    const response = await authenticatedFetch(
      `/users/${userId}/generate-download-urls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ s3Keys }),
      },
    );

    if (!response.ok) {
      logger.error(
        "Failed to get presigned URLs:",
        response.status,
        response.statusText,
      );
      return {};
    }

    const data = await response.json();

    // Convert array to map for easy lookup
    const urlMap = {};
    data.downloadUrls.forEach(({ s3Key, downloadUrl }) => {
      urlMap[s3Key] = downloadUrl;
    });

    return urlMap;
  } catch (error) {
    logger.error("Error getting presigned URLs:", error);
    return {};
  }
}

/**
 * Get a presigned URL for a single image (convenience wrapper)
 * @param {string} s3Key - The S3 key
 * @param {string} userId - The user ID for authorization
 * @returns {Promise<string>} - Presigned download URL
 */
export async function getPresignedImageUrl(s3Key, userId) {
  const urlMap = await getPresignedImageUrls([s3Key], userId);
  return urlMap[s3Key] || "";
}

/**
 * Check if an S3 key is valid
 * @param {string} s3Key - The S3 key to validate
 * @returns {boolean}
 */
export function isValidS3Key(s3Key) {
  return (
    typeof s3Key === "string" &&
    s3Key.length > 0 &&
    s3Key.startsWith("user-uploads/")
  );
}

// ─── Upload helpers (write side) ──────────────────────────────────────────────

/**
 * Request presigned PUT URLs for a batch of file uploads.
 * Mirrors getPresignedImageUrls on the download side.
 *
 * @param {string} userId - The user ID for authorization
 * @param {string[]} fileTypes - File extensions without dots, e.g. ['jpg', 'png']
 * @returns {Promise<Array<{index: number, uploadUrl: string, s3Key: string}>>}
 */
export async function generateUploadUrls(userId, fileTypes) {
  const { authenticatedFetch, getApiUrl } = await import("./apis/apiConfig");
  const url = `${getApiUrl("")}/users/${userId}/generate-upload-urls`;

  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify({ fileCount: fileTypes.length, fileTypes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to generate upload URLs: ${response.status}`,
    );
  }

  const { uploadUrls } = await response.json();
  return uploadUrls;
}

/**
 * Upload a single file to S3 using a presigned PUT URL.
 * The URL is self-authenticating; no auth header is needed.
 *
 * @param {string} uploadUrl - Presigned S3 PUT URL
 * @param {File} file - The file object to upload
 * @throws {Error} if the S3 PUT returns a non-2xx status
 */
export async function putFileToPresignedUrl(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!response.ok) {
    throw new Error(
      `S3 upload failed: ${response.status} ${response.statusText}`,
    );
  }
}
