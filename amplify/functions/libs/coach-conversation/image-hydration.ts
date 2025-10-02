import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { CoachMessage } from './types';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
});

const BUCKET_NAME = process.env.APPS_BUCKET_NAME;

/**
 * Fetch image from S3 as buffer
 */
export async function fetchImageFromS3(s3Key: string): Promise<Uint8Array | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    return new Uint8Array(buffer);
  } catch (error) {
    console.error(`❌ Failed to fetch image ${s3Key}:`, error);
    return null;
  }
}

/**
 * Get image format from S3 key for Converse API
 */
export function getImageFormat(s3Key: string): 'jpeg' | 'png' | 'gif' | 'webp' {
  const extension = s3Key.split('.').pop()?.toLowerCase() || 'jpeg';
  const formatMap: Record<string, 'jpeg' | 'png' | 'gif' | 'webp'> = {
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    gif: 'gif',
    webp: 'webp',
  };
  return formatMap[extension] || 'jpeg';
}

/**
 * Build multimodal content for Claude Sonnet 4 (Converse API format)
 *
 * CRITICAL: Uses Converse API format, NOT Messages API!
 * Model: us.anthropic.claude-sonnet-4-5-20250929-v1:0
 */
export async function buildMultimodalContent(
  messages: CoachMessage[]
): Promise<any[]> {
  const converseMessages = [];

  for (const msg of messages) {
    const contentBlocks: any[] = [];

    // Add text first (if present)
    if (msg.content && msg.content.trim()) {
      contentBlocks.push({
        text: msg.content,
      });
    }

    // Add images if this message has them
    if (msg.messageType === 'text_with_images' && msg.imageS3Keys && msg.imageS3Keys.length > 0) {
      for (const s3Key of msg.imageS3Keys) {
        const imageBytes = await fetchImageFromS3(s3Key);

        if (imageBytes) {
          contentBlocks.push({
            image: {
              format: getImageFormat(s3Key),
              source: {
                bytes: imageBytes, // Converse API uses bytes directly
              },
            },
          });
        } else {
          console.warn(`⚠️ Skipping missing image: ${s3Key}`);
        }
      }
    }

    converseMessages.push({
      role: msg.role,
      content: contentBlocks,
    });
  }

  console.info(`✅ Built multimodal content: ${converseMessages.length} messages, ${messages.filter(m => m.imageS3Keys?.length).length} with images`);

  return converseMessages;
}

