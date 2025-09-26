import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { runAllStreamingTests, testRawStreamingAPI, testStreamingWithManualProcessing, testStreamingApiHelper, testStreamingAgentHelper } from '../utils/debug/streamingDebugTest';

/**
 * Debug test page for streaming functionality
 * This page allows us to test streaming at different layers without UI complexity
 */
export default function StreamingDebugTest() {
  const [searchParams] = useSearchParams();
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [customMessage, setCustomMessage] = useState("Hello, this is a streaming debug test message.");

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
        </div>
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
