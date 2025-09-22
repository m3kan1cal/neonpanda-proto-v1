import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { queryMemories } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const {
      coachId,
      memoryType,
      importance,
      limit
    } = queryParams;

    // Build filtering options
    const options: any = {};

    if (memoryType) {
      const validMemoryTypes = ['preference', 'goal', 'constraint', 'instruction', 'context'];
      if (!validMemoryTypes.includes(memoryType)) {
        return createErrorResponse(400, `memoryType must be one of: ${validMemoryTypes.join(', ')}`);
      }
      options.memoryType = memoryType;
    }

    if (importance) {
      const validImportance = ['high', 'medium', 'low'];
      if (!validImportance.includes(importance)) {
        return createErrorResponse(400, `importance must be one of: ${validImportance.join(', ')}`);
      }
      options.importance = importance;
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return createErrorResponse(400, 'limit must be a number between 1 and 100');
      }
      options.limit = limitNum;
    }

    console.info('Querying memories for user:', {
      userId,
      coachId,
      filters: options
    });

    // Query memories
    const memories = await queryMemories(userId, coachId, options);

    // Transform the response to include summary information
    const memorySummaries = memories.map(memory => ({
      memoryId: memory.memoryId,
      userId: memory.userId,
      coachId: memory.coachId,
      content: memory.content,
      memoryType: memory.memoryType,
      metadata: {
        createdAt: memory.metadata.createdAt,
        lastUsed: memory.metadata.lastUsed,
        usageCount: memory.metadata.usageCount,
        source: memory.metadata.source,
        importance: memory.metadata.importance,
        tags: memory.metadata.tags
      }
    }));

  return createOkResponse({
    memories: memorySummaries,
    totalCount: memorySummaries.length
  });
};

export const handler = withAuth(baseHandler);
