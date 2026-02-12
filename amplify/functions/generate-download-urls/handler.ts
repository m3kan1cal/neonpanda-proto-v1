import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { generatePresignedGetUrl, validateUserS3Key } from '../libs/s3-utils';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  logger.info('🖼️ Starting presigned download URL generation', {
    pathUserId: event.pathParameters?.userId,
    authenticatedUserId: event.user.userId,
  });

  const pathUserId = event.pathParameters?.userId;
  const authenticatedUserId = event.user.userId;

  const body = JSON.parse(event.body || '{}');
  const { s3Keys } = body;

  logger.info('📥 Request body parsed:', {
    hasS3Keys: !!s3Keys,
    s3KeysCount: s3Keys?.length || 0,
  });

  // Verify user can only access their own images
  if (authenticatedUserId !== pathUserId) {
    logger.error('❌ User mismatch:', { authenticatedUserId, pathUserId });
    return createErrorResponse(403, 'Cannot generate download URLs for other users');
  }

  // Validate input
  if (!s3Keys || !Array.isArray(s3Keys) || s3Keys.length === 0) {
    return createErrorResponse(400, 's3Keys array is required');
  }

  if (s3Keys.length > 20) {
    return createErrorResponse(400, 'Maximum 20 download URLs per request');
  }

  // Verify all S3 keys belong to this user
  for (const s3Key of s3Keys) {
    if (!validateUserS3Key(s3Key, authenticatedUserId)) {
      logger.error('❌ Security violation: S3 key does not belong to user', { authenticatedUserId, s3Key });
      return createErrorResponse(403, 'Invalid S3 key: access denied');
    }
  }

  try {
    // Generate presigned GET URLs for all requested images
    const downloadUrls = await Promise.all(
      s3Keys.map(async (s3Key) => {
        const downloadUrl = await generatePresignedGetUrl(s3Key, {
          expiresIn: 900, // 15 minutes
        });

        return {
          s3Key,
          downloadUrl,
        };
      })
    );

    logger.info('✅ Generated presigned download URLs:', {
      count: downloadUrls.length,
      expiresIn: '15min'
    });

    return createOkResponse({
      downloadUrls,
      expiresIn: 900,
    });
  } catch (error) {
    logger.error('❌ Error generating presigned URLs:', error);
    return createErrorResponse(500, 'Failed to generate presigned URLs', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const handler = withAuth(baseHandler);

