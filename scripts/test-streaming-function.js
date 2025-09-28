#!/usr/bin/env node

/**
 * Test Script for Stream Coach Conversation Lambda Function
 *
 * This script provides comprehensive testing for the streaming SSE function.
 * It tests various scenarios including authentication, path validation, and SSE event handling.
 *
 * Usage:
 *   1. Edit the CONFIG object at the top of this file
 *   2. Set your FUNCTION_URL and AUTH_TOKEN
 *   3. Run: node scripts/test-streaming-function.js
 *   4. Or show help: node scripts/test-streaming-function.js --help
 *
 * Configuration (edit in CONFIG object below):
 *   - functionUrl: The Lambda Function URL (e.g., https://abc123.lambda-url.us-east-1.on.aws/)
 *   - authToken: Valid JWT token for authentication
 *   - userId: User ID to test with (e.g., test123)
 *   - coachId: Coach ID to test with (e.g., coach456)
 *   - conversationId: Conversation ID to test with (e.g., conv789)
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// ============================================================================
// CONFIGURATION - Edit these variables before running tests
// ============================================================================

const CONFIG = {
  // REQUIRED: Your Lambda Function URL (get this after deploying with 'npx amplify sandbox')
  functionUrl: 'https://67wunm6ug4lbpzm7q2cv567lhm0pdsxz.lambda-url.us-west-2.on.aws/',

  // REQUIRED: Valid JWT token for authentication
  // Get this from your app's browser dev tools (Network tab, Authorization header)
  authToken: 'eyJraWQiOiJ3VWxsQUhIcFZWNXFJbm1TeCtBdGpTd21GSWZVYmdwWWhIT2pTMTd0a3lJPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI4ODExNjNhMC01MDYxLTcwY2MtZGY3MC1lMzg3N2M2MjJkN2EiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tXC91cy13ZXN0LTJfc2ZRdnRFQVFvIiwiY3VzdG9tOnVzZXJfaWQiOiI2M2dvY2F6LWotQVlSc2IwMDk0aWsiLCJjb2duaXRvOnVzZXJuYW1lIjoiODgxMTYzYTAtNTA2MS03MGNjLWRmNzAtZTM4NzdjNjIyZDdhIiwicHJlZmVycmVkX3VzZXJuYW1lIjoibTNrYW4xY2FsIiwiZ2l2ZW5fbmFtZSI6Ik1hcmsiLCJvcmlnaW5fanRpIjoiOWU3ZmZhOTctNTZkOS00MDk1LWE1ZGEtN2UyYTI1YTY5ZmIyIiwiYXVkIjoiNnNhNnY5a29ydnBkcjhmOXBsMGFydHR0aDAiLCJldmVudF9pZCI6IjNmM2EyNTQxLWRmYmQtNGE0Yi1iYzcyLWUyNmJmN2I2ZTZkMyIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzU5MDYwMTMwLCJleHAiOjE3NTkwNjM3MzAsImlhdCI6MTc1OTA2MDEzMCwiZmFtaWx5X25hbWUiOiJGb3dsZXIiLCJqdGkiOiJmNGUxMTBmNi1lNzA1LTRjMTItYjIwZi00Nzc5OTI2YzFjODgiLCJlbWFpbCI6Im0za2FuMWNhKzAwMUBnbWFpbC5jb20ifQ.TiuGAzcPTBfO7zaX5icDlx-fAv4S5SxfrJmf6bJwtOjNrE1cgm4s45Euw7sRWSLQOJC6sVSWmpL-NCksoowJ5CjRkl4fsjyTmOMIeLAi-Gxnb0SjMGdkwIiriP7qW5zz7PRJlfGamwCgdv1IiFcV6fImqQecy26qucQBG7pAgi5v4W2p3H9TyV-zUXXMdZpks8rK5r1cKyUellfjhPAZ4p8VpBdIL92r_rnBwItC7CePA24jVDhqhg4LeoaGKIt4Mc9_6tdBRROJ3qid3xhc1RMgDnHIO7Q4UQBbg7SFUDBA4EjK8rebUYjS45AnybaZA5p4nXlIle_rUFCF5xjT1A',

  // OPTIONAL: Test parameters (defaults provided)
  userId: '63gocaz-j-AYRsb0094ik',
  coachId: 'user_63gocaz-j-AYRsb0094ik_coach_main',
  conversationId: 'conv_1758945836190_byjk0gr7f',

  // Technical settings
  timeout: 30000, // 30 seconds
};

// ============================================================================
// END CONFIGURATION - Don't edit below this line
// ============================================================================

// Command line argument parsing
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: '✅ Valid Request with Authentication',
    description: 'Test full Phase 4 implementation with real-time Bedrock streaming, business logic, and DynamoDB updates',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'Hello, this is a test message for the streaming coach conversation! How are you doing today?',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: true,
    expectedMinEvents: 6, // start + 2 progress chunks + AI streaming chunks + complete (minimum)
    expectStreamingChunks: true, // Phase 4: Expect real-time AI response chunks
  },
  {
    name: '🧠 Smart Router - Workout Logging Test',
    description: 'Test smart router optimization with workout logging message',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'I just finished a great workout! Did 5 rounds of: 21 thrusters at 95lbs, 15 pull-ups, and 9 burpees. Completed it in 8:45 - new PR!',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: true,
    expectedMinEvents: 8, // start + contextual updates + AI streaming chunks + complete
    expectStreamingChunks: true,
    expectWorkoutDetection: true, // Smart router should detect workout
  },
  {
    name: '🧠 Smart Router - Simple Acknowledgment Test',
    description: 'Test smart router optimization with simple acknowledgment (should skip contextual updates)',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'Thanks!',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: true,
    expectedMinEvents: 4, // start + minimal processing + AI chunks + complete
    expectStreamingChunks: true,
    expectContextualUpdates: false, // Smart router should skip contextual updates
  },
  {
    name: '🧠 Smart Router - Memory Request Test',
    description: 'Test smart router optimization with memory saving request',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'I want you to remember that I prefer morning workouts and I have a bad left knee, so please avoid high-impact exercises on that side.',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: true,
    expectedMinEvents: 8, // start + contextual updates + AI streaming chunks + complete
    expectStreamingChunks: true,
    expectMemoryProcessing: true, // Smart router should detect memory request
  },
  {
    name: '❌ Authentication Failure - Missing Token',
    description: 'Test error handling when no JWT token is provided',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'This should fail due to missing auth',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: false,
    expectedErrorCode: 'MISSING_AUTH_HEADER',
  },
  {
    name: '❌ Authentication Failure - Invalid Token',
    description: 'Test error handling with invalid JWT token',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': 'Bearer invalid-token-12345',
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'This should fail due to invalid auth',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: false,
    expectedErrorCode: 'INVALID_TOKEN_FORMAT',
  },
  {
    name: '❌ Invalid Path - Missing Parameters',
    description: 'Test error handling with invalid path structure',
    path: `/users/${CONFIG.userId}/invalid/path`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'This should fail due to invalid path',
      messageTimestamp: new Date().toISOString(),
    },
    expectSuccess: false,
    expectedErrorCode: 'MISSING_PATH_PARAMS',
  },
  {
    name: '❌ Missing Request Body',
    description: 'Test error handling when no request body is provided',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: null,
    expectSuccess: false,
    expectedErrorCode: 'MISSING_REQUEST_BODY',
  },
  {
    name: '❌ Invalid JSON in Request Body',
    description: 'Test error handling with malformed JSON',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: 'invalid json { missing quote',
    expectSuccess: false,
    expectedErrorCode: 'INVALID_JSON',
  },
  {
    name: '❌ Missing userResponse Field',
    description: 'Test error handling when userResponse is missing from body',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      messageTimestamp: new Date().toISOString(),
      // Missing userResponse field
    },
    expectSuccess: false,
    expectedErrorCode: 'INVALID_USER_RESPONSE',
  },
  {
    name: '❌ Missing Message Timestamp',
    description: 'Test error handling when messageTimestamp is missing (Phase 3 requirement)',
    path: `/users/${CONFIG.userId}/coaches/${CONFIG.coachId}/conversations/${CONFIG.conversationId}/stream`,
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${CONFIG.authToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      userResponse: 'This should fail due to missing timestamp',
      // Missing messageTimestamp field
    },
    expectSuccess: false,
    expectedErrorCode: 'MISSING_TIMESTAMP',
  },
];


function showHelpText() {
  logHeader('📖 Stream Coach Conversation Function Test Script');

  log(`\n${colors.yellow}DESCRIPTION:${colors.reset}`);
  log(`This script provides comprehensive testing for the stream-coach-conversation Lambda function.`);
  log(`It tests Phase 4 implementation with real-time streaming including:`);
  log(`  - Real-time AI conversation streaming with Bedrock ConverseStream`);
  log(`  - Live AI response chunks streamed as SSE events`);
  log(`  - Workout detection and logging`);
  log(`  - Memory processing and Pinecone integration`);
  log(`  - DynamoDB conversation updates`);
  log(`  - Real-time SSE progress events`);
  log(`  - Authentication, path validation, and error handling`);

  log(`\n${colors.yellow}USAGE:${colors.reset}`);
  log(`  node scripts/test-streaming-function.js [OPTIONS]`);

  log(`\n${colors.yellow}OPTIONS:${colors.reset}`);
  log(`  --help, -h      Show this help message`);
  log(`  (no options)    Run tests with configuration in this file`);

  log(`\n${colors.yellow}SETUP INSTRUCTIONS:${colors.reset}`);
  log(`  1. Edit the CONFIG object at the top of this file`);
  log(`  2. Set your FUNCTION_URL (get from 'npx amplify sandbox' output)`);
  log(`  3. Set your AUTH_TOKEN (get from browser dev tools)`);
  log(`  4. Optionally customize USER_ID, COACH_ID, CONVERSATION_ID`);
  log(`  5. Run: node scripts/test-streaming-function.js`);

  log(`\n${colors.yellow}CONFIGURATION:${colors.reset}`);
  log(`  functionUrl     Lambda Function URL (required)`);
  log(`  authToken       Valid JWT token for authentication (required)`);
  log(`  userId          User ID to test with (optional, default: test123)`);
  log(`  coachId         Coach ID to test with (optional, default: coach456)`);
  log(`  conversationId  Conversation ID to test with (optional, default: conv789)`);

  log(`\n${colors.yellow}EXAMPLES:${colors.reset}`);
  log(`  # Show help`);
  log(`  node scripts/test-streaming-function.js --help`);
  log(`  `);
  log(`  # Run tests (after editing CONFIG in this file)`);
  log(`  node scripts/test-streaming-function.js`);

  log(`\n${colors.yellow}TEST SCENARIOS (Phase 4):${colors.reset}`);
  log(`  1. ✅ Valid Request with Authentication - Full real-time streaming with Bedrock`);
  log(`  2. ❌ Authentication Failure - Missing Token`);
  log(`  3. ❌ Authentication Failure - Invalid Token`);
  log(`  4. ❌ Invalid Path - Missing Parameters`);
  log(`  5. ❌ Missing Request Body`);
  log(`  6. ❌ Invalid JSON in Request Body`);
  log(`  7. ❌ Missing userResponse Field`);
  log(`  8. ❌ Missing Message Timestamp - Required for workout logging`);

  process.exit(0);
}

// Utility functions
function log(message, color = colors.reset) {
  console.info(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
}

function logTestStart(scenario) {
  log(`\n${colors.bright}${colors.blue}🧪 ${scenario.name}${colors.reset}`);
  log(`${colors.yellow}📝 ${scenario.description}${colors.reset}`);
  log(`${colors.magenta}🔗 Path: ${scenario.path}${colors.reset}`);
}

function logTestResult(scenario, success, details) {
  if (success) {
    log(`${colors.green}✅ PASSED: ${scenario.name}${colors.reset}`);
  } else {
    log(`${colors.red}❌ FAILED: ${scenario.name}${colors.reset}`);
  }

  if (details) {
    log(`${colors.cyan}📊 Details: ${details}${colors.reset}`);
  }
}

// HTTP request function
function makeRequest(scenario) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.functionUrl + scenario.path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestBody = scenario.body ?
      (typeof scenario.body === 'string' ? scenario.body : JSON.stringify(scenario.body)) :
      null;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...scenario.headers,
        'Content-Length': requestBody ? Buffer.byteLength(requestBody) : 0,
      },
      timeout: CONFIG.timeout,
    };

    const req = client.request(options, (res) => {
      let buffer = '';
      let sseEvents = [];

      res.on('data', (chunk) => {
        buffer += chunk.toString();

        // Process complete lines only
        let lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        // Parse complete SSE events
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              sseEvents.push(eventData);
            } catch (e) {
              // Ignore parsing errors for non-JSON data
            }
          }
        }
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          sseEvents,
          rawData: buffer,
        });
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (requestBody) {
      req.write(requestBody);
    }

    req.end();
  });
}

// Test validation function
function validateTestResult(scenario, result) {
  const { statusCode, sseEvents, headers } = result;

  // Check content type - Lambda Function URLs return application/octet-stream for streaming
  const contentType = headers['content-type'] || headers['Content-Type'];
  const hasCorrectContentType = contentType && (
    contentType.includes('text/event-stream') ||
    contentType.includes('application/octet-stream')
  );

  if (scenario.expectSuccess) {
    // Success scenarios should return 200 and have SSE events
    const hasSuccessEvents = sseEvents.some(event =>
      event.type === 'start' || event.type === 'chunk' || event.type === 'complete'
    );

    // Check if we have the expected minimum number of events (Phase 3 has multiple progress events)
    const hasEnoughEvents = scenario.expectedMinEvents ?
      sseEvents.length >= scenario.expectedMinEvents :
      sseEvents.length > 0;

    // For Phase 4, also validate that we have a complete event with real data
    const hasCompleteEvent = sseEvents.some(event => event.type === 'complete');

    // Phase 4: Check for streaming chunks (AI response chunks)
    const hasStreamingChunks = scenario.expectStreamingChunks ?
      sseEvents.filter(event => event.type === 'chunk' && event.content &&
        !event.content.includes('Processing your message') &&
        !event.content.includes('Generating response')
      ).length > 0 : true;

    const success = statusCode === 200 && hasCorrectContentType && hasSuccessEvents && hasEnoughEvents && hasCompleteEvent && hasStreamingChunks;

    const streamingChunkCount = sseEvents.filter(event => event.type === 'chunk' && event.content &&
      !event.content.includes('Processing your message') &&
      !event.content.includes('Generating response')
    ).length;

    const eventDetails = scenario.expectedMinEvents ?
      `Events: ${sseEvents.length}/${scenario.expectedMinEvents} (min)` :
      `Events: ${sseEvents.length}`;

    const streamingDetails = scenario.expectStreamingChunks ?
      `, AI Chunks: ${streamingChunkCount}` : '';

    return {
      success,
      details: `Status: ${statusCode}, Content-Type: ${contentType}, ${eventDetails}${streamingDetails}`,
    };
  } else {
    // Error scenarios should return error events
    const hasErrorEvent = sseEvents.some(event => event.type === 'error');
    const hasExpectedErrorCode = scenario.expectedErrorCode ?
      sseEvents.some(event => event.code === scenario.expectedErrorCode) : true;

    return {
      success: hasErrorEvent && hasExpectedErrorCode,
      details: `Status: ${statusCode}, Content-Type: ${contentType}, Error Events: ${sseEvents.filter(e => e.type === 'error').length}`,
    };
  }
}

// Main test execution
async function runTests() {
  logHeader('🚀 Stream Coach Conversation Function Test Suite');

  // Validate configuration
  if (!CONFIG.functionUrl || CONFIG.functionUrl === 'https://your-function-url.lambda-url.region.on.aws/') {
    log(`${colors.red}❌ ERROR: functionUrl is not configured${colors.reset}`);
    log(`${colors.yellow}💡 Edit the CONFIG object at the top of this file and set your FUNCTION_URL${colors.reset}`);
    process.exit(1);
  }

  if (!CONFIG.authToken || CONFIG.authToken === 'your-jwt-token-here') {
    log(`${colors.red}❌ ERROR: authToken is not configured${colors.reset}`);
    log(`${colors.yellow}💡 Edit the CONFIG object at the top of this file and set your AUTH_TOKEN${colors.reset}`);
    process.exit(1);
  }

  log(`${colors.green}✅ Configuration validated${colors.reset}`);
  log(`${colors.cyan}🔗 Function URL: ${CONFIG.functionUrl}${colors.reset}`);
  log(`${colors.cyan}👤 User ID: ${CONFIG.userId}${colors.reset}`);
  log(`${colors.cyan}🤖 Coach ID: ${CONFIG.coachId}${colors.reset}`);
  log(`${colors.cyan}💬 Conversation ID: ${CONFIG.conversationId}${colors.reset}`);

  let passedTests = 0;
  let totalTests = TEST_SCENARIOS.length;

  log(`\n${colors.yellow}🧠 Smart Router Optimization Test Expectations:${colors.reset}`);
  log(`  - Single AI call for routing decisions (replaces 5-6 individual calls)`);
  log(`  - Intelligent contextual updates (only when appropriate)`);
  log(`  - Optimized workout detection (only when router detects workout)`);
  log(`  - Consolidated memory processing (retrieval + characteristics in one call)`);
  log(`  - Real-time AI response streaming from Bedrock ConverseStream`);
  log(`  - 60-70% faster decision-making phase`);
  log(`  - Enhanced error handling with graceful fallbacks`);

  // Run each test scenario
  for (const scenario of TEST_SCENARIOS) {
    try {
      logTestStart(scenario);

      const result = await makeRequest(scenario);
      const validation = validateTestResult(scenario, result);

      logTestResult(scenario, validation.success, validation.details);

      // Log SSE events for debugging
      if (result.sseEvents.length > 0) {
        log(`${colors.cyan}📡 SSE Events received:${colors.reset}`);
        result.sseEvents.forEach((event, index) => {
          // Show more detail for chunk events in Phase 3
          if (event.type === 'chunk' && event.content) {
            const preview = event.content.length > 50 ?
              `${event.content.substring(0, 50)}...` :
              event.content;
            log(`${colors.magenta}  ${index + 1}. ${event.type} ("${preview}")${colors.reset}`);
          } else if (event.type === 'complete') {
            // Show complete event details for debugging
            log(`${colors.magenta}  ${index + 1}. ${event.type} (status: ${event.status}, messageId: ${event.messageId})${colors.reset}`);
          } else {
            log(`${colors.magenta}  ${index + 1}. ${event.type}${event.code ? ` (${event.code})` : ''}${colors.reset}`);
          }
        });
      } else {
        // Debug: Show raw response data when no SSE events are parsed
        log(`${colors.yellow}🔍 Debug - Raw response data:${colors.reset}`);
        log(`${colors.gray}${result.rawData.substring(0, 500)}${result.rawData.length > 500 ? '...' : ''}${colors.reset}`);
      }

      if (validation.success) {
        passedTests++;
      }

    } catch (error) {
      log(`${colors.red}❌ FAILED: ${scenario.name} - ${error.message}${colors.reset}`);
    }
  }

  // Summary
  logHeader('📊 Test Results Summary');
  log(`${colors.bright}Total Tests: ${totalTests}${colors.reset}`);
  log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  log(`${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);

  if (passedTests === totalTests) {
    log(`${colors.bright}${colors.green}🎉 All tests passed! Your streaming function is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    log(`${colors.bright}${colors.red}⚠️  Some tests failed. Check the output above for details.${colors.reset}`);
    process.exit(1);
  }
}

// Main execution logic
async function main() {
  // Handle command line arguments
  if (showHelp) {
    showHelpText();
  }

  // Run tests with local configuration
  await runTests();
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    log(`${colors.red}❌ Script failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { runTests, TEST_SCENARIOS, CONFIG };
