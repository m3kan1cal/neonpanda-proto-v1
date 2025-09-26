/**
 * Simple streaming debug test - tests the raw API response without any UI
 * This will help us identify if the issue is in the API, parsing, or UI layer
 */

import { sendCoachConversationMessageStream } from '../apis/coachConversationApi';

/**
 * Test raw streaming API response
 * @param {string} userId - User ID
 * @param {string} coachId - Coach ID
 * @param {string} conversationId - Conversation ID
 * @param {string} testMessage - Message to send
 */
export async function testRawStreamingAPI(userId, coachId, conversationId, testMessage = "Hello, this is a streaming test message.") {
  console.info('🧪 Starting raw streaming API test...');
  console.info('Parameters:', { userId, coachId, conversationId, testMessage });

  try {
    const messageStream = sendCoachConversationMessageStream(userId, coachId, conversationId, testMessage);

    let chunkCount = 0;
    let totalContent = '';
    let startTime = Date.now();

    console.info('📡 Starting to read stream...');

    for await (const chunk of messageStream) {
      chunkCount++;
      const chunkTime = Date.now() - startTime;
      const timestamp = new Date().toISOString();

      console.info(`📦 Chunk ${chunkCount} (${chunkTime}ms) [${timestamp}]:`, {
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
        console.info(`📊 Progress: ${chunkCount} chunks, ${totalContent.length} total characters`);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.info('✅ Streaming completed!');
    console.info('📊 Final Results:', {
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
    console.error('❌ Raw streaming API test failed:', error);
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
  console.info('🔧 Testing streaming with manual chunk processing...');

  try {
    const messageStream = sendCoachConversationMessageStream(userId, coachId, conversationId, testMessage);

    let streamingContent = '';
    let isStreaming = true;
    let chunkCount = 0;

    // Simulate what the agent does
    for await (const chunk of messageStream) {
      chunkCount++;

      if (chunk.type === 'chunk' && chunk.content) {
        streamingContent += chunk.content;
        const timestamp = new Date().toISOString();
        console.info(`🔄 Chunk ${chunkCount} [${timestamp}]: Added "${chunk.content}" | Total: "${streamingContent}"`);
      } else if (chunk.type === 'complete') {
        isStreaming = false;
        console.info('🏁 Streaming complete:', {
          finalContent: chunk.fullMessage,
          ourAccumulatedContent: streamingContent,
          contentMatches: chunk.fullMessage === streamingContent
        });
        break;
      } else if (chunk.type === 'fallback') {
        console.info('⚠️ Fallback triggered:', chunk.data);
        return { success: false, reason: 'fallback', data: chunk.data };
      } else if (chunk.type === 'error') {
        console.info('❌ Error in stream:', chunk.error);
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
    console.error('❌ Manual processing test failed:', error);
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
  console.info('🛠️ Testing streaming API helper directly...');

  try {
    const { handleStreamingApiRequest } = await import('../apis/streamingApiHelper');

    const url = `/api/users/${userId}/coaches/${coachId}/conversations/${conversationId}/send-message?stream=true`;
    const requestBody = {
      userResponse: testMessage,
      messageTimestamp: new Date().toISOString()
    };

    const options = {
      method: 'POST',
      operationName: 'debug test',
      errorMessages: {
        notFound: 'Conversation not found',
        serviceUnavailable: 'Service temporarily unavailable'
      }
    };

    console.info('📡 Calling handleStreamingApiRequest with:', { url, requestBody, options });

    const stream = handleStreamingApiRequest(url, requestBody, options);

    let chunkCount = 0;
    for await (const chunk of stream) {
      chunkCount++;
      console.info(`📦 Helper chunk ${chunkCount}:`, chunk);
    }

    return {
      success: true,
      chunkCount
    };

  } catch (error) {
    console.error('❌ Streaming API helper test failed:', error);
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
  console.info('🤖 Testing streaming agent helper functions...');

  try {
    const { processStreamingChunks, createStreamingMessage, resetStreamingState, validateStreamingInput } = await import('../agents/streamingAgentHelper');

    // Create a mock agent for testing
    const mockAgent = {
      _generateMessageId: () => 'test-message-' + Date.now(),
      _addMessage: (message) => {
        console.info('📝 Mock agent _addMessage:', message);
        mockAgent.messages = mockAgent.messages || [];
        mockAgent.messages.push(message);
      },
      _appendToStreamingMessage: (messageId, chunk) => {
        console.info('📝 Mock agent _appendToStreamingMessage:', { messageId, chunk });
        const message = mockAgent.messages.find(m => m.id === messageId);
        if (message) {
          message.content += chunk;
        }
      },
      _updateStreamingMessage: (messageId, content) => {
        console.info('📝 Mock agent _updateStreamingMessage:', { messageId, content });
        const message = mockAgent.messages.find(m => m.id === messageId);
        if (message) {
          message.content = content;
        }
      },
      _removeMessage: (messageId) => {
        console.info('🗑️ Mock agent _removeMessage:', messageId);
        mockAgent.messages = mockAgent.messages.filter(m => m.id !== messageId);
      },
      _updateState: (newState) => {
        console.info('🔄 Mock agent _updateState:', newState);
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
    console.info('🧪 Test 1: Input validation');
    const isValid = validateStreamingInput(mockAgent, testMessage);
    console.info('Input validation result:', isValid);

    // Test 2: Create streaming message
    console.info('🧪 Test 2: Create streaming message');
    const streamingMsg = createStreamingMessage(mockAgent);
    console.info('Created streaming message:', streamingMsg);

    // Test 3: Process streaming chunks
    console.info('🧪 Test 3: Process streaming chunks');
    const messageStream = sendCoachConversationMessageStream(userId, coachId, conversationId, testMessage);

    let chunkCount = 0;
    let accumulatedContent = '';

    const result = await processStreamingChunks(messageStream, {
      onChunk: async (content) => {
        chunkCount++;
        accumulatedContent += content;
        const timestamp = new Date().toISOString();
        console.info(`📦 Processing chunk ${chunkCount} [${timestamp}]: "${content}"`);
        streamingMsg.append(content);
      },
      onComplete: async (chunk) => {
        console.info('🏁 Streaming complete:', chunk);
        streamingMsg.update(chunk.fullMessage);
        return chunk;
      },
      onFallback: async (data) => {
        console.info('⚠️ Fallback triggered:', data);
        return data;
      },
      onError: async (errorMessage) => {
        console.info('❌ Error in stream:', errorMessage);
      }
    });

    // Test 4: Reset streaming state
    console.info('🧪 Test 4: Reset streaming state');
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
    console.error('❌ Streaming agent helper test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export a function to run all tests
export async function runAllStreamingTests(userId, coachId, conversationId) {
  console.info('🚀 Running all streaming debug tests...');
  console.info('='.repeat(60));

  const results = {};

  // Test 1: Raw API
  console.info('\n1️⃣ Testing Raw Streaming API');
  console.info('-'.repeat(40));
  results.rawAPI = await testRawStreamingAPI(userId, coachId, conversationId);

  // Test 2: Manual Processing
  console.info('\n2️⃣ Testing Manual Chunk Processing');
  console.info('-'.repeat(40));
  results.manualProcessing = await testStreamingWithManualProcessing(userId, coachId, conversationId);

  // Test 3: API Helper
  console.info('\n3️⃣ Testing Streaming API Helper');
  console.info('-'.repeat(40));
  results.apiHelper = await testStreamingApiHelper(userId, coachId, conversationId);

  // Test 4: Agent Helper
  console.info('\n4️⃣ Testing Streaming Agent Helper');
  console.info('-'.repeat(40));
  results.agentHelper = await testStreamingAgentHelper(userId, coachId, conversationId);

  // Summary
  console.info('\n📋 Test Summary');
  console.info('='.repeat(60));
  console.info('Raw API:', results.rawAPI.success ? '✅ PASS' : '❌ FAIL');
  console.info('Manual Processing:', results.manualProcessing.success ? '✅ PASS' : '❌ FAIL');
  console.info('API Helper:', results.apiHelper.success ? '✅ PASS' : '❌ FAIL');
  console.info('Agent Helper:', results.agentHelper.success ? '✅ PASS' : '❌ FAIL');

  return results;
}
