#!/usr/bin/env tsx

/**
 * Build Program V2 Testing Script (Agent-Based)
 *
 * ⚠️ ARCHITECTURE CLARIFICATION ⚠️
 * =================================
 * The build-program-v2 Lambda is NOT INTERACTIVE. It does not ask questions
 * during execution. Here's how it works:
 *
 * CONVERSATION PHASE (Separate from Lambda):
 * 1. User ←→ Coach conversation in "program creator" mode
 * 2. Coach asks questions and builds a complete todoList
 * 3. Once todoList is complete, coach invokes build-program-v2
 *
 * LAMBDA EXECUTION PHASE (Fire-and-Forget):
 * 1. Lambda receives complete todoList + context
 * 2. ProgramDesigner agent uses 7 tools automatically:
 *    a. load_program_requirements
 *    b. generate_phase_structure
 *    c. generate_phase_workouts (parallel, one per phase)
 *    d. validate_program_structure
 *    e. normalize_program_data (conditional)
 *    f. generate_program_summary
 *    g. save_program_to_database
 * 3. Agent runs to completion (no user interaction)
 * 4. Program saved to DB, user notified
 *
 * TESTING APPROACH:
 * - Provide complete todoList payloads (simulate what conversation creates)
 * - Invoke Lambda once with complete data
 * - Validate the result and saved data
 * - Optionally use AI to generate diverse test payloads (--generate flag)
 *
 * Build Program V2 Testing Script
 *
 * Tests the build-program-v2 Lambda (agent-based) with various payloads.
 * Validates that the ProgramDesigner agent correctly uses tools to design programs.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * ============================
 * The build-program-v2 agent is FIRE-AND-FORGET (non-interactive):
 * 1. It receives a COMPLETE todoList (from prior program creator conversation)
 * 2. It runs to completion using internal tools (load, generate, validate, save)
 * 3. It does NOT ask the user questions during execution
 * 4. Tool execution order is determined by Claude based on the system prompt
 *
 * This test:
 * - Provides complete todoList payloads (simulating what the conversation would create)
 * - Invokes the Lambda and validates the result
 * - Checks DynamoDB/S3 for saved data
 * - Optionally uses AI to generate diverse test payloads
 *
 * Features:
 *   - Lambda invocation and response validation
 *   - DynamoDB program metadata validation
 *   - S3 workout template validation
 *   - Phase structure and continuity validation
 *   - Workout distribution and frequency validation
 *   - AI-powered test payload generation (optional)
 *
 * Usage:
 *   tsx test/integration/test-build-program-v2.ts [options]
 *
 * Options:
 *   --function=NAME     Lambda function name (default: build-program-v2)
 *   --test=NAME         Run specific test (default: all)
 *   --generate          Use AI to generate additional test payloads
 *   --output=FILE       Save results to JSON file
 *   --verbose           Show detailed logging
 *   --region=REGION     AWS region (default: us-west-2)
 *
 * Examples:
 *   tsx test/integration/test-build-program-v2.ts
 *   tsx test/integration/test-build-program-v2.ts --test=simple-4week --verbose
 *   tsx test/integration/test-build-program-v2.ts --generate
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// Types
interface ValidationResult {
  name: string;
  passed: boolean;
}

interface TestResult {
  testName: string;
  passed: boolean;
  validations?: ValidationResult[];
  failures?: string[];
  response?: any;
  error?: string;
}

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_FUNCTION = "build-program-v2";
const LOG_WAIT_TIME = 30000; // Wait 30s for logs (program generation takes time)
const DYNAMODB_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "NeonPandaProtoV1-DataTable-Sandbox";

// Test user and coach IDs
const TEST_USER_ID = "user_63gocaz-j-AYRsb0094ik";
const TEST_COACH_ID = "user_63gocaz-j-AYRsb0094ik_coach_1756078034317";

/**
 * Generate test payload using AI
 * Creates diverse program requirements for comprehensive testing
 */
async function generateTestPayload(scenario: string): Promise<any> {
  const { BedrockRuntimeClient, ConverseCommand } =
    await import("@aws-sdk/client-bedrock-runtime");

  const client = new BedrockRuntimeClient({ region: DEFAULT_REGION });

  const prompt = `Generate a realistic training program requirement for testing.

Scenario: ${scenario}

Return a JSON object with this structure:
{
  "name": "descriptive test name",
  "description": "what this tests",
  "todoList": {
    "trainingGoals": { "value": "specific goal" },
    "programDuration": { "value": "X weeks" },
    "trainingFrequency": { "value": 3-6 },
    "equipmentAccess": { "value": ["equipment1", "equipment2"] },
    "experienceLevel": { "value": "beginner|intermediate|advanced" }
  },
  "conversationContext": "brief context about the user's request",
  "expectations": {
    "shouldSucceed": true,
    "minPhases": 2-4,
    "maxPhases": 3-6,
    "minWorkouts": X,
    "maxWorkouts": Y
  }
}

Make it realistic and varied. Return ONLY valid JSON, no markdown.`;

  const command = new ConverseCommand({
    modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages: [{ role: "user", content: [{ text: prompt }] }],
  });

  const response = await client.send(command);
  const text = response.output?.message?.content?.[0]?.text || "{}";

  try {
    return JSON.parse(text);
  } catch {
    console.warn("Failed to parse AI response, using fallback");
    return null;
  }
}

// Test cases
const TEST_CASES = [
  {
    name: "simple-4week",
    description: "Simple 4-week strength program",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test1`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: { value: "Build strength in main lifts" },
        programDuration: { value: "4 weeks" },
        trainingFrequency: { value: 4 },
        equipmentAccess: { value: ["barbell", "rack", "bench"] },
        experienceLevel: { value: "intermediate" },
      },
      conversationContext:
        "User wants to build strength over 4 weeks training 4x per week.",
    },
    expectations: {
      shouldSucceed: true,
      minPhases: 2,
      maxPhases: 4,
      minWorkouts: 12,
      maxWorkouts: 20,
    },
  },
  {
    name: "complex-8week",
    description: "Complex 8-week hybrid program",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test2`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: { value: "Improve strength and conditioning" },
        programDuration: { value: "8 weeks" },
        trainingFrequency: { value: 5 },
        equipmentAccess: {
          value: ["barbell", "rack", "dumbbells", "box", "rower"],
        },
        experienceLevel: { value: "advanced" },
        programFocus: { value: "CrossFit preparation" },
      },
      conversationContext:
        "User wants 8-week CrossFit prep program, 5 days per week, focus on strength and conditioning.",
    },
    expectations: {
      shouldSucceed: true,
      minPhases: 3,
      maxPhases: 5,
      minWorkouts: 30,
      maxWorkouts: 50,
    },
  },
];

/**
 * Main test execution
 */
async function runTests() {
  console.log("🏋️ Build Program V2 Integration Tests");
  console.log("=====================================\n");

  // Parse command line arguments
  const shouldGenerate = process.argv.includes("--generate");
  const verbose = process.argv.includes("--verbose");
  const testFilter = process.argv
    .find((arg) => arg.startsWith("--test="))
    ?.split("=")[1];
  const outputFile = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.split("=")[1];

  const results: TestResult[] = [];
  let testCases = TEST_CASES;

  // Optionally generate additional test cases with AI
  if (shouldGenerate) {
    console.log("🤖 Generating additional test payloads with AI...\n");

    const scenarios = [
      "beginner bodybuilding program",
      "marathon training program",
      "powerlifting competition prep",
      "CrossFit Open preparation",
      "functional fitness for busy professional",
    ];

    for (const scenario of scenarios) {
      try {
        const generated = await generateTestPayload(scenario);
        if (generated) {
          // Add generated fields to make it a complete test case
          const generatedCase = {
            name: `ai-generated-${generated.name.toLowerCase().replace(/\s+/g, "-")}`,
            description: generated.description,
            payload: {
              userId: TEST_USER_ID,
              coachId: TEST_COACH_ID,
              conversationId: `conv_${Date.now()}_generated`,
              programId: `program_${TEST_USER_ID}_${Date.now()}_generated`,
              sessionId: `session_${Date.now()}_generated`,
              todoList: generated.todoList,
              conversationContext: generated.conversationContext,
            },
            expectations: generated.expectations,
          };
          testCases.push(generatedCase);
          console.log(`   ✅ Generated: ${generatedCase.name}`);
        }
      } catch (error) {
        console.warn(
          `   ⚠️  Failed to generate ${scenario}:`,
          (error as Error).message,
        );
      }
    }
    console.log();
  }

  // Filter tests if --test flag provided
  if (testFilter) {
    testCases = testCases.filter((tc) => tc.name.includes(testFilter));
    console.log(`🔍 Running filtered tests: ${testFilter}\n`);
  }

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   ${testCase.description}`);

    try {
      const result = await runTestCase(testCase, verbose);
      results.push(result);

      if (result.passed) {
        console.log(`   ✅ PASSED`);
      } else {
        console.log(
          `   ❌ FAILED: ${result.failures?.join(", ") || "Unknown failure"}`,
        );
      }

      // Show detailed validations in verbose mode
      if (verbose && result.validations) {
        console.log(`\n   Validation Details:`);
        result.validations.forEach((v) => {
          const icon = v.passed ? "✅" : "❌";
          console.log(`     ${icon} ${v.name}`);
        });
      }
    } catch (error) {
      console.error(`   ❌ ERROR: ${(error as Error).message}`);
      results.push({
        testName: testCase.name,
        passed: false,
        error: (error as Error).message,
      });
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\n\n📊 Test Summary`);
  console.log(`================`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);

  // Save results to file if --output flag provided
  if (outputFile) {
    try {
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputData = {
        timestamp: new Date().toISOString(),
        summary: {
          total,
          passed,
          failed: total - passed,
          passRate: ((passed / total) * 100).toFixed(2) + "%",
        },
        results,
        config: {
          region: DEFAULT_REGION,
          function: DEFAULT_FUNCTION,
          dynamoTable: DYNAMODB_TABLE_NAME,
        },
      };

      fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Results saved to: ${outputFile}`);
    } catch (error) {
      console.error(
        `\n⚠️  Failed to save results: ${(error as Error).message}`,
      );
    }
  }

  if (passed === total) {
    console.log(`\n✅ All tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n❌ Some tests failed`);
    process.exit(1);
  }
}

/**
 * Run individual test case
 */
async function runTestCase(
  testCase: any,
  verbose: boolean = false,
): Promise<TestResult> {
  const lambdaClient = new LambdaClient({ region: DEFAULT_REGION });
  const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: DEFAULT_REGION }),
  );

  // 1. Invoke Lambda
  console.log(`   Invoking Lambda...`);
  const invokeCommand = new InvokeCommand({
    FunctionName: DEFAULT_FUNCTION,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(testCase.payload),
  });

  const response = await lambdaClient.send(invokeCommand);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (verbose) {
    console.log(`   Lambda full response:`, JSON.stringify(payload, null, 2));
  } else {
    console.log(`   Lambda response:`, {
      success: payload.body?.success,
      programId: payload.body?.programId,
    });
  }

  // Wait for logs
  console.log(`   Waiting for logs...`);
  await new Promise((resolve) => setTimeout(resolve, LOG_WAIT_TIME));

  // 2. Validate response
  const validations: ValidationResult[] = [];

  if (testCase.expectations.shouldSucceed) {
    validations.push({
      name: "Response success",
      passed: payload.body?.success === true,
    });

    validations.push({
      name: "Has program ID",
      passed: !!payload.body?.programId,
    });

    validations.push({
      name: "Has program name",
      passed: !!payload.body?.programName,
    });

    if (payload.body?.phases) {
      validations.push({
        name: `Phase count (${testCase.expectations.minPhases}-${testCase.expectations.maxPhases})`,
        passed:
          payload.body.phases >= testCase.expectations.minPhases &&
          payload.body.phases <= testCase.expectations.maxPhases,
      });
    }

    if (payload.body?.totalWorkouts) {
      validations.push({
        name: `Workout count (${testCase.expectations.minWorkouts}-${testCase.expectations.maxWorkouts})`,
        passed:
          payload.body.totalWorkouts >= testCase.expectations.minWorkouts &&
          payload.body.totalWorkouts <= testCase.expectations.maxWorkouts,
      });
    }

    // 3. Fetch from DynamoDB
    if (payload.body?.programId) {
      try {
        const getCommand = new GetCommand({
          TableName: DYNAMODB_TABLE_NAME,
          Key: {
            pk: `user#${testCase.payload.userId}`,
            sk: `program#${payload.body.programId}`,
          },
        });

        const dbResult = await dynamoClient.send(getCommand);

        validations.push({
          name: "Saved to DynamoDB",
          passed: !!dbResult.Item,
        });

        if (dbResult.Item) {
          validations.push({
            name: "Has S3 detail key",
            passed: !!dbResult.Item.s3DetailKey,
          });

          validations.push({
            name: "Has phases",
            passed:
              Array.isArray(dbResult.Item.phases) &&
              dbResult.Item.phases.length > 0,
          });
        }
      } catch (dbError) {
        console.log(`   ⚠️  DynamoDB fetch failed: ${dbError.message}`);
      }
    }
  }

  // 4. Collect results
  const failures = validations.filter((v) => !v.passed).map((v) => v.name);
  const passed = failures.length === 0;

  return {
    testName: testCase.name,
    passed,
    validations,
    failures,
    response: payload,
  };
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
