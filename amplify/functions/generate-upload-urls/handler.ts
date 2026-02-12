import { nanoid } from 'nanoid';
import {
  createOkResponse,
  createErrorResponse,
} from '../libs/api-helpers';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { generatePresignedPutUrl, getBucketName } from '../libs/s3-utils';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  logger.info('🖼️ Starting presigned URL generation', {
    pathUserId: event.pathParameters?.userId,
    authenticatedUserId: event.user.userId,
  });

  const userId = event.user.userId;
  const pathUserId = event.pathParameters?.userId;

  // Verify user can only upload for themselves
  if (userId !== pathUserId) {
    logger.error('❌ User mismatch:', { userId, pathUserId });
    return createErrorResponse(403, 'Cannot upload images for other users');
  }

  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const body = JSON.parse(event.body);
  const { fileCount, fileTypes } = body;

  // Validation
  if (!fileCount || fileCount < 1 || fileCount > 5) {
    return createErrorResponse(400, 'File count must be between 1 and 5');
  }

  if (!fileTypes || !Array.isArray(fileTypes) || fileTypes.length !== fileCount) {
    return createErrorResponse(400, 'File types array must match file count');
  }

  try {
    // Validate bucket is configured
    getBucketName();
  } catch (error) {
    logger.error('❌ APPS_BUCKET_NAME environment variable not set');
    return createErrorResponse(500, 'Server configuration error');
  }

  // Generate presigned URLs
  const uploadUrls = [];

  for (let i = 0; i < fileCount; i++) {
    const fileType = fileTypes[i];

    // Normalize extension
    let extension = fileType.toLowerCase();
    if (extension === 'jpeg') extension = 'jpg';
    if (!['jpg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension)) {
      return createErrorResponse(400, `Unsupported file type: ${fileType}`);
    }

    // Generate unique S3 key
    const s3Key = `user-uploads/${userId}/${nanoid()}.${extension}`;

    // Create presigned URL (expires in 5 minutes)
    const uploadUrl = await generatePresignedPutUrl(s3Key, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      expiresIn: 300,
    });

    uploadUrls.push({
      index: i,
      s3Key,
      uploadUrl,
    });
  }

  logger.info(`✅ Generated ${uploadUrls.length} presigned URLs for user ${userId}`);

  return createOkResponse({
    uploadUrls,
    expiresIn: 300,
  });
};

// Export with withAuth middleware (matches your existing pattern)
export const handler = withAuth(baseHandler);

