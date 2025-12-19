/**
 * Shared S3 Utilities
 *
 * Centralized S3 operations to avoid duplication across the codebase
 * Provides singleton S3 client and common operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Singleton S3 client
let s3ClientInstance: S3Client | null = null;

/**
 * Get or create S3 client (singleton pattern)
 */
export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.AWS_REGION || "us-west-2",
    });
  }
  return s3ClientInstance;
}

/**
 * Get the configured bucket name from environment
 */
export function getBucketName(): string {
  const bucketName = process.env.APPS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("APPS_BUCKET_NAME environment variable is not set");
  }
  return bucketName;
}

/**
 * Get an object from S3 as a Buffer
 * Common pattern used across multiple handlers
 */
export async function getObjectAsBuffer(
  s3Key: string,
  bucketName?: string,
): Promise<Buffer> {
  const client = getS3Client();
  const bucket = bucketName || getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  const response = await client.send(command);
  const chunks: Uint8Array[] = [];

  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Get an object from S3 as Uint8Array (for image processing)
 */
export async function getObjectAsUint8Array(
  s3Key: string,
  bucketName?: string,
): Promise<Uint8Array> {
  const buffer = await getObjectAsBuffer(s3Key, bucketName);
  return new Uint8Array(buffer);
}

/**
 * Get an object from S3 and parse as JSON
 */
export async function getObjectAsJson<T>(
  s3Key: string,
  bucketName?: string,
): Promise<T> {
  const buffer = await getObjectAsBuffer(s3Key, bucketName);
  return JSON.parse(buffer.toString("utf-8"));
}

/**
 * Put an object to S3
 */
export async function putObject(
  s3Key: string,
  data: string | Buffer | Uint8Array,
  options?: {
    bucketName?: string;
    contentType?: string;
    metadata?: Record<string, string>;
    serverSideEncryption?: "AES256" | "aws:kms";
  },
): Promise<void> {
  const client = getS3Client();
  const bucket = options?.bucketName || getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: data,
    ContentType: options?.contentType || "application/octet-stream",
    Metadata: options?.metadata,
    ServerSideEncryption: options?.serverSideEncryption || "AES256",
  });

  await client.send(command);
}

/**
 * Put a JSON object to S3
 */
export async function putObjectAsJson<T>(
  s3Key: string,
  data: T,
  options?: {
    bucketName?: string;
    metadata?: Record<string, string>;
    pretty?: boolean;
  },
): Promise<void> {
  const jsonString = options?.pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);

  await putObject(s3Key, jsonString, {
    bucketName: options?.bucketName,
    contentType: "application/json",
    metadata: options?.metadata,
  });
}

/**
 * Generate a presigned URL for uploading to S3
 */
export async function generatePresignedPutUrl(
  s3Key: string,
  options?: {
    bucketName?: string;
    contentType?: string;
    expiresIn?: number; // seconds
  },
): Promise<string> {
  const client = getS3Client();
  const bucket = options?.bucketName || getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: options?.contentType,
  });

  return await getSignedUrl(client, command, {
    expiresIn: options?.expiresIn || 300, // Default 5 minutes
  });
}

/**
 * Generate a presigned URL for downloading from S3
 */
export async function generatePresignedGetUrl(
  s3Key: string,
  options?: {
    bucketName?: string;
    expiresIn?: number; // seconds
  },
): Promise<string> {
  const client = getS3Client();
  const bucket = options?.bucketName || getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  return await getSignedUrl(client, command, {
    expiresIn: options?.expiresIn || 900, // Default 15 minutes
  });
}

/**
 * Validate that an S3 key belongs to a specific user
 * Common security check for user-uploaded files
 */
export function validateUserS3Key(s3Key: string, userId: string): boolean {
  return s3Key.startsWith(`user-uploads/${userId}/`);
}

/**
 * Delete an object from S3
 * Used for cleaning up resources like workout templates when programs are deleted
 */
export async function deleteObject(
  s3Key: string,
  bucketName?: string,
): Promise<void> {
  const client = getS3Client();
  const bucket = bucketName || getBucketName();

  console.info("🗑️ Deleting S3 object:", {
    bucket,
    key: s3Key,
  });

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  await client.send(command);

  console.info("✅ S3 object deleted successfully:", {
    bucket,
    key: s3Key,
  });
}

/**
 * Delete multiple objects from S3 in a single batch operation
 * More efficient than individual deleteObject calls when deleting multiple files
 *
 * @param s3Keys - Array of S3 keys to delete
 * @param bucketName - Optional bucket name (defaults to APPS_BUCKET_NAME)
 * @returns Object with deleted count and any errors encountered
 */
export async function deleteObjects(
  s3Keys: string[],
  bucketName?: string,
): Promise<{
  deletedCount: number;
  errors: Array<{ key: string; error: string }>;
}> {
  const client = getS3Client();
  const bucket = bucketName || getBucketName();

  if (s3Keys.length === 0) {
    console.info("No S3 objects to delete");
    return { deletedCount: 0, errors: [] };
  }

  console.info("🗑️ Batch deleting S3 objects:", {
    bucket,
    count: s3Keys.length,
  });

  // AWS S3 DeleteObjects supports up to 1000 keys per request
  const batchSize = 1000;
  const batches: string[][] = [];

  for (let i = 0; i < s3Keys.length; i += batchSize) {
    batches.push(s3Keys.slice(i, i + batchSize));
  }

  let totalDeleted = 0;
  const allErrors: Array<{ key: string; error: string }> = [];

  for (const batch of batches) {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: false, // Return info about deleted objects
        },
      });

      const response = await client.send(command);

      // Count successfully deleted objects
      const deletedInBatch = response.Deleted?.length || 0;
      totalDeleted += deletedInBatch;

      // Collect any errors
      if (response.Errors && response.Errors.length > 0) {
        for (const error of response.Errors) {
          allErrors.push({
            key: error.Key || "unknown",
            error: error.Message || "Unknown error",
          });
        }
      }

      console.info(`✅ Batch deleted ${deletedInBatch} objects from S3`);
    } catch (error) {
      console.error("❌ Failed to batch delete S3 objects:", error);
      // Add all keys in this batch to errors
      for (const key of batch) {
        allErrors.push({
          key,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  console.info("Batch delete completed:", {
    bucket,
    totalRequested: s3Keys.length,
    totalDeleted,
    totalErrors: allErrors.length,
  });

  return {
    deletedCount: totalDeleted,
    errors: allErrors,
  };
}
