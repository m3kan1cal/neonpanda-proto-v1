import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { runAllStreamingTests, testRawStreamingAPI, testStreamingWithManualProcessing, testStreamingApiHelper, testStreamingAgentHelper } from '../utils/debug/streamingDebugTest';
import { testLambdaStreamingConnection, checkLambdaStreamingHealth } from '../utils/apis/streamingLambdaApi';
import { logger } from "../utils/logger";

/**
 * Debug test page for streaming functionality
 * This page allows us to test streaming at different layers without UI complexity
 */
export default function StreamingDebugTest() {
  const [searchParams] = useSearchParams();
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [customMessage, setCustomMessage] = useState("Hello, this is a streaming debug test message.");
  const [streamingEvents, setStreamingEvents] = useState([]);

  // Get URL parameters
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const conversationId = searchParams.get('conversationId');

  const runTest = async (testFunction, testName) => {
    if (!userId || !coachId || !conversationId) {
      alert('Missing required parameters: userId, coachId, conversationId');
      return;
    }

    setIsRunning(true);
    setTestResults(prev => ({ ...prev, [testName]: 'Running...' }));

    try {
      const result = await testFunction(userId, coachId, conversationId, customMessage);
      setTestResults(prev => ({ ...prev, [testName]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [testName]: { success: false, error: error.message } }));
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTests = async () => {
    if (!userId || !coachId || !conversationId) {
      alert('Missing required parameters: userId, coachId, conversationId');
      return;
    }

    setIsRunning(true);
    setTestResults({});

    try {
      const results = await runAllStreamingTests(userId, coachId, conversationId);
      setTestResults(results);
    } catch (error) {
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults(null);
    setStreamingEvents([]);
  };

  // Real-time streaming test with visual feedback
  const testRealTimeStreaming = async () => {
    if (!userId || !coachId || !conversationId) {
      alert('Missing required parameters: userId, coachId, conversationId');
      return;
    }

    setIsRunning(true);
    setStreamingEvents([]);
    setTestResults(prev => ({ ...prev, realTimeTest: 'Running real-time streaming test...' }));

    try {
      const { streamCoachConversationLambda } = await import('../utils/apis/streamingLambdaApi');

      const startTime = Date.now();
      let eventCount = 0;

      const stream = streamCoachConversationLambda(userId, coachId, conversationId, customMessage);

      for await (const event of stream) {
        eventCount++;
        const timestamp = Date.now();
        const timeSinceStart = timestamp - startTime;

        const eventData = {
          id: eventCount,
          type: event.type,
          content: event.content || '[no content]',
          timestamp: new Date(timestamp).toISOString(),
          timeSinceStart: timeSinceStart + 'ms',
          receivedAt: timestamp
        };

        // Add event to the live display
        setStreamingEvents(prev => [...prev, eventData]);

        // Log with precise timing
        logger.info(`🕐 Real-time event #${eventCount} [+${timeSinceStart}ms]:`, {
          type: event.type,
          content: event.content?.substring(0, 30) + (event.content?.length > 30 ? '...' : ''),
          timeSinceStart: timeSinceStart + 'ms'
        });
      }

      setTestResults(prev => ({
        ...prev,
        realTimeTest: {
          success: true,
          eventCount,
          totalTime: Date.now() - startTime + 'ms',
          averageDelay: Math.round((Date.now() - startTime) / eventCount) + 'ms per event'
        }
      }));

    } catch (error) {
      setTestResults(prev => ({ ...prev, realTimeTest: { success: false, error: error.message } }));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🧪 Streaming Debug Test Suite</h1>

      <div style={{
        background: '#f0f0f0',
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px'
      }}>
        <h3>Parameters</h3>
        <p><strong>User ID:</strong> {userId || 'MISSING'}</p>
        <p><strong>Coach ID:</strong> {coachId || 'MISSING'}</p>
        <p><strong>Conversation ID:</strong> {conversationId || 'MISSING'}</p>

        <div style={{ marginTop: '10px' }}>
          <label>
            <strong>Test Message:</strong><br/>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                marginTop: '5px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>
      </div>

      {(!userId || !coachId || !conversationId) && (
        <div style={{
          background: '#ffebee',
          padding: '15px',
          borderRadius: '8px',
          color: '#d32f2f',
          marginBottom: '20px'
        }}>
          <strong>⚠️ Missing Parameters</strong><br/>
          Add these to your URL: ?userId=YOUR_USER_ID&coachId=YOUR_COACH_ID&conversationId=YOUR_CONVERSATION_ID
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Individual Tests</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => runTest(testRawStreamingAPI, 'rawAPI')}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test Raw API
          </button>

          <button
            onClick={() => runTest(testStreamingWithManualProcessing, 'manualProcessing')}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test Manual Processing
          </button>

          <button
            onClick={() => runTest(testStreamingApiHelper, 'apiHelper')}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test API Helper
          </button>

          <button
            onClick={() => runTest(testStreamingAgentHelper, 'agentHelper')}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#e91e63',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test Agent Helper
          </button>

          <button
            onClick={() => runTest(testLambdaStreamingConnection, 'lambdaStreaming')}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#673ab7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Test Lambda Function URL
          </button>

          <button
            onClick={testRealTimeStreaming}
            disabled={isRunning}
            style={{
              padding: '10px 15px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            🕐 Real-Time Streaming Test
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Health Check</h3>
        <button
          onClick={async () => {
            setIsRunning(true);
            try {
              const health = await checkLambdaStreamingHealth();
              setTestResults(prev => ({ ...prev, healthCheck: health }));
            } catch (error) {
              setTestResults(prev => ({ ...prev, healthCheck: { error: error.message } }));
            } finally {
              setIsRunning(false);
            }
          }}
          disabled={isRunning}
          style={{
            padding: '10px 15px',
            background: '#607d8b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          Check Lambda Streaming Health
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Run All Tests</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            style={{
              padding: '15px 25px',
              background: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isRunning ? 'Running Tests...' : '🚀 Run All Tests'}
          </button>

          <button
            onClick={clearResults}
            disabled={isRunning}
            style={{
              padding: '15px 25px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Clear Results
          </button>
        </div>
      </div>

      {streamingEvents.length > 0 && (
        <div style={{
          background: '#e8f5e8',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #4caf50',
          marginBottom: '20px'
        }}>
          <h3>🕐 Live Streaming Events (Real-Time)</h3>
          <div style={{
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {streamingEvents.map((event, index) => (
              <div key={event.id} style={{
                padding: '5px 0',
                borderBottom: index < streamingEvents.length - 1 ? '1px solid #eee' : 'none',
                color: event.type === 'start' ? '#2196f3' :
                      event.type === 'chunk' ? '#ff9800' :
                      event.type === 'complete' ? '#4caf50' : '#f44336'
              }}>
                <strong>#{event.id} [{event.timeSinceStart}]</strong> {event.type}: {event.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults && (
        <div style={{
          background: '#f9f9f9',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3>Test Results</h3>
          <pre style={{
            background: '#fff',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '600px',
            fontSize: '12px',
            whiteSpace: 'pre-wrap'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#e3f2fd',
        borderRadius: '8px'
      }}>
        <h4>How to Use This Test Suite:</h4>
        <ol>
          <li>Navigate to a conversation page and copy the URL parameters</li>
          <li>Add them to this page: ?userId=...&coachId=...&conversationId=...</li>
          <li>Start with "Test Raw API" to see if streaming chunks are being received</li>
          <li>Check the browser console for detailed logs</li>
          <li>If raw API works, test the other layers to isolate the issue</li>
        </ol>
      </div>
    </div>
  );
}
