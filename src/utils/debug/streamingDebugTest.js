/**
 * Simple streaming debug test - tests the raw API response without any UI
 * This will help us identify if the issue is in the API, parsing, or UI layer
 */

import { streamCoachConversationLambda } from '../apis/streamingLambdaApi';
import { logger } from "../logger";

/**
 * Test raw streaming API response
 * @param {string} userId - User ID
 * @param {string} coachId - Coach ID
 * @param {string} conversationId - Conversation ID
 * @param {string} testMessage - Message to send
 */
export async function testRawStreamingAPI(userId, coachId, conversationId, testMessage = "Hello, this is a streaming test message.") {
  logger.info('🧪 Starting raw streaming API test...');
  logger.info('Parameters:', { userId, coachId, conversationId, testMessage });

  try {
    const messageStream = streamCoachConversationLambda(userId, coachId, conversationId, testMessage);

    let chunkCount = 0;
    let totalContent = '';
    let startTime = Date.now();

    logger.info('📡 Starting to read stream...');

    for await (const chunk of messageStream) {
      chunkCount++;
      const chunkTime = Date.now() - startTime;
      const timestamp = new Date().toISOString();

      logger.info(`📦 Chunk ${chunkCount} (${chunkTime}ms) [${timestamp}]:`, {
        type: chunk.type,
        content: chunk.content || '[no content]',
        contentLength: chunk.content?.length || 0,
        fullMessage: chunk.fullMessage ? chunk.fullMessage.substring(0, 100) + '...' : '[no fullMessage]',
        conversationId: chunk.conversationId || '[no conversationId]',
        rawChunk: JSON.stringify(chunk, null, 2)
      });

      if (chunk.content) {
        totalContent += chunk.content;
      }

      // Log every 5th chunk to avoid spam
      if (chunkCount % 5 === 0) {
        logger.info(`📊 Progress: ${chunkCount} chunks, ${totalContent.length} total characters`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    logger.info('✅ Streaming completed!');
    logger.info('📊 Final Results:', {
      totalChunks: chunkCount,
      totalContentLength: totalContent.length,
      totalTimeMs: totalTime,
      averageChunkTime: totalTime / chunkCount,
      finalContent: totalContent.substring(0, 200) + (totalContent.length > 200 ? '...' : '')
    });

    return {
      success: true,
      chunkCount,
      totalContent,
      totalTime,
      averageChunkTime: totalTime / chunkCount
    };

  } catch (error) {
    logger.error('❌ Raw streaming API test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Test streaming with manual chunk processing (simulating what the agent does)
 */
export async function testStreamingWithManualProcessing(userId, coachId, conversationId, testMessage = "Hello, this is a manual processing test.") {
  logger.info('🔧 Testing streaming with manual chunk processing...');

  try {
    const messageStream = streamCoachConversationLambda(userId, coachId, conversationId, testMessage);

    let streamingContent = '';
    let isStreaming = true;
    let chunkCount = 0;

    // Simulate what the agent does
    for await (const chunk of messageStream) {
      chunkCount++;

      if (chunk.type === 'chunk' && chunk.content) {
        streamingContent += chunk.content;
        const timestamp = new Date().toISOString();
        logger.info(`🔄 Chunk ${chunkCount} [${timestamp}]: Added "${chunk.content}" | Total: "${streamingContent}"`);
      } else if (chunk.type === 'complete') {
        isStreaming = false;
        logger.info('🏁 Streaming complete:', {
          finalContent: chunk.fullMessage,
          ourAccumulatedContent: streamingContent,
          contentMatches: chunk.fullMessage === streamingContent
        });
        break;
      } else if (chunk.type === 'fallback') {
        logger.info('⚠️ Fallback triggered:', chunk.data);
        return { success: false, reason: 'fallback', data: chunk.data };
      } else if (chunk.type === 'error') {
        logger.info('❌ Error in stream:', chunk.error);
        return { success: false, reason: 'error', error: chunk.error };
      }
    }

    return {
      success: true,
      chunkCount,
      streamingContent,
      isStreaming
    };

  } catch (error) {
    logger.error('❌ Manual processing test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the streaming API helper directly
 */
export async function testStreamingApiHelper(userId, coachId, conversationId, testMessage = "Hello, this is a helper test.") {
  logger.info('🛠️ Testing Lambda Function URL directly...');

  try {
    const { testLambdaStreamingConnection } = await import('../apis/streamingLambdaApi');

    logger.info('📡 Calling Lambda Function URL directly with:', { userId, coachId, conversationId, testMessage });

    const result = await testLambdaStreamingConnection(userId, coachId, conversationId, testMessage);

    return {
      success: true,
      ...result
    };

  } catch (error) {
    logger.error('❌ Lambda Function URL test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the streaming agent helper functions
 */
export async function testStreamingAgentHelper(userId, coachId, conversationId, testMessage = "Hello, this is an agent helper test.") {
  logger.info('🤖 Testing streaming agent helper functions...');

  try {
    const { processStreamingChunks, createStreamingMessage, resetStreamingState, validateStreamingInput } = await import('../agents/streamingAgentHelper');

    // Create a mock agent for testing
    const mockAgent = {
      _generateMessageId: () => 'test-message-' + Date.now(),
      _addMessage: (message) => {
        logger.info('📝 Mock agent _addMessage:', message);
        mockAgent.messages = mockAgent.messages || [];
        mockAgent.messages.push(message);
      },
      _appendToStreamingMessage: (messageId, chunk) => {
        logger.info('📝 Mock agent _appendToStreamingMessage:', { messageId, chunk });
        const message = mockAgent.messages.find(m => m.id === messageId);
        if (message) {
          message.content += chunk;
        }
      },
      _updateStreamingMessage: (messageId, content) => {
        logger.info('📝 Mock agent _updateStreamingMessage:', { messageId, content });
        const message = mockAgent.messages.find(m => m.id === messageId);
        if (message) {
          message.content = content;
        }
      },
      _removeMessage: (messageId) => {
        logger.info('🗑️ Mock agent _removeMessage:', messageId);
        mockAgent.messages = mockAgent.messages.filter(m => m.id !== messageId);
      },
      _updateState: (newState) => {
        logger.info('🔄 Mock agent _updateState:', newState);
        mockAgent.state = { ...mockAgent.state, ...newState };
      },
      state: {
        isTyping: false,
        isStreaming: false,
        streamingMessage: '',
        streamingMessageId: null,
        messages: []
      },
      userId,
      coachId,
      conversationId
    };

    // Test 1: Input validation
    logger.info('🧪 Test 1: Input validation');
    const isValid = validateStreamingInput(mockAgent, testMessage);
    logger.info('Input validation result:', isValid);

    // Test 2: Create streaming message
    logger.info('🧪 Test 2: Create streaming message');
    const streamingMsg = createStreamingMessage(mockAgent);
    logger.info('Created streaming message:', streamingMsg);

    // Test 3: Process streaming chunks
    logger.info('🧪 Test 3: Process streaming chunks');
    const messageStream = streamCoachConversationLambda(userId, coachId, conversationId, testMessage);

    let chunkCount = 0;
    let accumulatedContent = '';

    const result = await processStreamingChunks(messageStream, {
      onChunk: async (content) => {
        chunkCount++;
        accumulatedContent += content;
        const timestamp = new Date().toISOString();
        logger.info(`📦 Processing chunk ${chunkCount} [${timestamp}]: "${content}"`);
        streamingMsg.append(content);
      },
      onComplete: async (chunk) => {
        logger.info('🏁 Streaming complete:', chunk);
        streamingMsg.update(chunk.fullMessage);
        return chunk;
      },
      onFallback: async (data) => {
        logger.info('⚠️ Fallback triggered:', data);
        return data;
      },
      onError: async (errorMessage) => {
        logger.info('❌ Error in stream:', errorMessage);
      }
    });

    // Test 4: Reset streaming state
    logger.info('🧪 Test 4: Reset streaming state');
    resetStreamingState(mockAgent, { conversation: { id: 'test' } });

    return {
      success: true,
      chunkCount,
      accumulatedContent,
      finalMessage: mockAgent.messages.find(m => m.id === streamingMsg.messageId),
      agentState: mockAgent.state,
      result
    };

  } catch (error) {
    logger.error('❌ Streaming agent helper test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export a function to run all tests
export async function runAllStreamingTests(userId, coachId, conversationId) {
  logger.info('🚀 Running all streaming debug tests...');
  logger.info('='.repeat(60));

  const results = {};

  // Test 1: Raw API
  logger.info('\n1️⃣ Testing Raw Streaming API');
  logger.info('-'.repeat(40));
  results.rawAPI = await testRawStreamingAPI(userId, coachId, conversationId);

  // Test 2: Manual Processing
  logger.info('\n2️⃣ Testing Manual Chunk Processing');
  logger.info('-'.repeat(40));
  results.manualProcessing = await testStreamingWithManualProcessing(userId, coachId, conversationId);

  // Test 3: API Helper
  logger.info('\n3️⃣ Testing Streaming API Helper');
  logger.info('-'.repeat(40));
  results.apiHelper = await testStreamingApiHelper(userId, coachId, conversationId);

  // Test 4: Agent Helper
  logger.info('\n4️⃣ Testing Streaming Agent Helper');
  logger.info('-'.repeat(40));
  results.agentHelper = await testStreamingAgentHelper(userId, coachId, conversationId);

  // Summary
  logger.info('\n📋 Test Summary');
  logger.info('='.repeat(60));
  logger.info('Raw API:', results.rawAPI.success ? '✅ PASS' : '❌ FAIL');
  logger.info('Manual Processing:', results.manualProcessing.success ? '✅ PASS' : '❌ FAIL');
  logger.info('API Helper:', results.apiHelper.success ? '✅ PASS' : '❌ FAIL');
  logger.info('Agent Helper:', results.agentHelper.success ? '✅ PASS' : '❌ FAIL');

  return results;
}
