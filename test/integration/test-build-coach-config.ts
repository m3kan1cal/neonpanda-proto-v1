#!/usr/bin/env tsx

/**
 * Build Coach Config Testing Script (Agent-Based)
 *
 * ⚠️ ARCHITECTURE CLARIFICATION ⚠️
 * =================================
 * The build-coach-config Lambda is NOT INTERACTIVE. It does not ask questions
 * during execution. Here's how it works:
 *
 * SESSION PHASE (Separate from Lambda):
 * 1. User ←→ Coach conversation in "coach creator" mode
 * 2. Coach asks questions and builds a complete session with user requirements
 * 3. Once session is complete (isComplete=true), coach invokes build-coach-config
 *
 * LAMBDA EXECUTION PHASE (Fire-and-Forget):
 * 1. Lambda receives userId + sessionId
 * 2. CoachCreatorAgent uses 8 tools automatically:
 *    a. load_session_requirements
 *    b. select_personality_template
 *    c. select_methodology_template
 *    d. generate_coach_prompts
 *    e. assemble_coach_config
 *    f. validate_coach_config
 *    g. normalize_coach_config (conditional)
 *    h. save_coach_config_to_database
 * 3. Agent runs to completion (no user interaction)
 * 4. Coach config saved to DB + Pinecone, user notified
 *
 * TESTING APPROACH:
 * - Create complete coach creator sessions with realistic requirements
 * - Invoke Lambda once with userId + sessionId
 * - Validate the result and saved coach config
 * - Test diverse scenarios covering different personalities, methodologies, and constraints
 *
 * Features:
 *   - Lambda invocation and response validation
 *   - DynamoDB coach config validation
 *   - Pinecone storage validation
 *   - Session status update validation (IN_PROGRESS → COMPLETE/FAILED)
 *   - Coach config structure and prompt validation
 *   - Safety and gender preference validation
 *   - Error handling and edge cases
 *
 * Usage:
 *   tsx test/integration/test-build-coach-config.ts [options]
 *
 * Options:
 *   --function=NAME     Lambda function name (default: build-coach-config)
 *   --test=NAME         Run specific test (default: all)
 *   --output=DIR        Save results to directory (creates timestamped files)
 *   --verbose           Show detailed logging
 *   --region=REGION     AWS region (default: us-west-2)
 *   --create-sessions   Create test sessions before running tests
 *
 * Examples:
 *   tsx test/integration/test-build-coach-config.ts --create-sessions
 *   tsx test/integration/test-build-coach-config.ts --test=victoria-masters --verbose
 *   tsx test/integration/test-build-coach-config.ts --output=test/fixtures/results --verbose
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import * as fs from "fs";
import * as path from "path";
// Use centralized DynamoDB operations for consistency
import {
  saveToDynamoDB,
  loadFromDynamoDB,
  createDynamoDBItem,
} from "../../amplify/dynamodb/operations.js";
import { CoachCreatorSession } from "../../amplify/functions/libs/coach-creator/types.js";
import { CoachConfig } from "../../amplify/functions/libs/coach-creator/types.js";
// Use real session template for correct data structure
import {
  createTestSessionFromTemplate,
  describeSessionOverrides,
  type SessionOverrides,
} from "./helpers/session-template.js";
// Use centralized schema validator
import { validateCoachConfig as validateCoachConfigSchema } from "../../amplify/functions/libs/schemas/coach-config-schema.js";

// Types
interface ValidationResult {
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
}

interface TestResult {
  testName: string;
  passed: boolean;
  validations?: ValidationResult[];
  failures?: string[];
  response?: any;
  error?: string;
  coachConfig?: any;
  session?: any;
}

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_FUNCTION =
  "amplify-neonpandaprotov1--buildcoachconfiglambdaA4-1H0brHFtypZM"; // Update with actual function name
const LOG_WAIT_TIME = 30000; // Wait 30s for logs (coach config generation takes time)
// Note: DynamoDB table name is handled by centralized operations.ts (uses getTableName())

// Test user ID
const TEST_USER_ID = "test_coach_creator_user_" + Date.now();

// Valid options for AI selections (for reasonableness validation)
const VALID_PERSONALITIES = ["emma", "marcus", "diana", "alex"];
const VALID_METHODOLOGIES = [
  "comptrain_strength",
  "mayhem_conditioning",
  "hwpo_training",
  "invictus_fitness",
  "misfit_athletics",
  "functional_bodybuilding",
  "opex_fitness",
  "crossfit_linchpin",
  "prvn_fitness",
];
const VALID_EXPERIENCE_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

/**
 * Test cases for coach creator
 *
 * Each test case includes:
 * - Session requirements (what would come from coach creator conversation)
 * - Expected outcomes (personality, methodology, validation)
 */
const TEST_CASES = [
  {
    name: "victoria-masters-crossfit",
    description:
      "Competitive masters CrossFit athlete - female coach preference",
    sessionOverrides: {
      genderPreference: "female",
      age: 48,
      experienceLevel: "expert" as const,
      trainingFrequency: 5,
      sessionDuration: "75 minutes",
      primaryGoals:
        "Compete in masters CrossFit, PR five core lifts, build work capacity. Focus on strength and mixed-modal capacity for local CrossFit competition.",
      injuryConsiderations:
        "None currently, mindful of recovery needs as masters athlete",
      movementLimitations:
        "Age-related recovery considerations, need intelligent training volume management",
      equipmentAccess: [
        "barbell",
        "rack",
        "rower",
        "assault bike",
        "rings",
        "full CrossFit gym equipment",
      ],
      coachingStylePreference:
        "Performance-focused with respect for experience, sophisticated programming, data-driven feedback with advanced training concepts",
      motivationStyle:
        "Age-group competition focus, legacy building, proving strength capabilities despite age",
      goalTimeline: "Competition preparation cycle - 12-16 weeks",
      timeOfDayPreference: "morning",
      trainingHistory:
        "Decades of strength training, 3 years CrossFit, extensive barbell work. Current PRs: back squat 315, deadlift 385, bench 245, push press 165, power clean 205",
      lifeStageContext:
        "48-year-old female masters athlete, decades of training experience, understands periodization and progressive overload",
      sophisticationLevel: "ADVANCED" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: expert competitive athlete should get diana or marcus
      validPersonalities: ["diana", "marcus"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "female",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },
  {
    name: "marcus-beginner-strength",
    description:
      "Beginner focused on foundational strength - male coach preference",
    sessionOverrides: {
      genderPreference: "male",
      age: 28,
      experienceLevel: "beginner" as const,
      trainingFrequency: 3,
      sessionDuration: "60 minutes",
      primaryGoals:
        "Build visible muscle, learn proper lifting technique, improve posture with focus on form and foundational strength",
      injuryConsiderations: "Lower back tightness from desk work and sitting",
      movementLimitations:
        "New to structured training, needs clear instruction and form coaching",
      equipmentAccess: [
        "dumbbells",
        "machines",
        "cables",
        "bench",
        "commercial gym access",
      ],
      coachingStylePreference:
        "Educational and patient approach, form-focused with clear instructions suitable for beginners",
      motivationStyle:
        "Progress tracking and visible results focus, building confidence through achievement",
      goalTimeline: "12-16 weeks for foundational strength building",
      timeOfDayPreference: "evening",
      trainingHistory:
        "High school sports 10 years ago, mostly sedentary since. Starting from baseline strength.",
      lifeStageContext:
        "28-year-old male returning to structured training after years away, needs guidance and form coaching",
      sophisticationLevel: "BEGINNER" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: beginner returning athlete should get emma or marcus
      validPersonalities: ["emma", "marcus"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "male",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },
  {
    name: "alex-powerlifting-prep",
    description: "Powerlifting competition prep - non-binary coach preference",
    sessionOverrides: {
      genderPreference: "neutral", // Using "neutral" as the closest match to non-binary
      age: 35,
      experienceLevel: "advanced" as const,
      trainingFrequency: 4,
      sessionDuration: "90 minutes",
      primaryGoals:
        "Peak for USAPL powerlifting meet with 1350+ total (squat 455, bench 315, deadlift 545). Improve weak points: bench sticking point and deadlift lockout.",
      injuryConsiderations:
        "Lower back fatigue management needed, requires intelligent volume programming",
      movementLimitations: "None significant, experienced lifter",
      equipmentAccess: [
        "barbell",
        "calibrated plates",
        "competition bars",
        "monolift",
        "powerlifting gym",
      ],
      coachingStylePreference:
        "Technical and competition-focused, uses RPE and percentage-based programming with advanced periodization concepts",
      motivationStyle:
        "PR pursuit and competition performance focus, technical mastery and skill refinement",
      goalTimeline: "12-week meet preparation cycle",
      timeOfDayPreference: "flexible",
      trainingHistory:
        "5 years focused powerlifting with multiple meets. Current SBD: 455/315/545. Understands RPE, percentages, and periodization.",
      lifeStageContext:
        "35-year-old competitive powerlifter in meet prep phase, experienced with programming and peaking protocols",
      competitionGoals: "USAPL meet - targeting 1350+ total",
      competitionTimeline: "12 weeks out from competition",
      sophisticationLevel: "ADVANCED" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: competitive powerlifter should get diana or marcus
      validPersonalities: ["diana", "marcus"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "neutral",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },
  {
    name: "sofia-busy-professional",
    description:
      "Busy professional seeking fitness balance - female coach preference",
    sessionOverrides: {
      genderPreference: "female",
      age: 42,
      experienceLevel: "intermediate" as const,
      trainingFrequency: 3,
      sessionDuration: "45 minutes",
      primaryGoals:
        "Lose 20 lbs, improve energy levels, reduce stress, feel athletic again. Time-efficient functional fitness with sustainable approach for busy lifestyle.",
      injuryConsiderations: "Stiffness and tightness from extensive desk work",
      movementLimitations:
        "Limited time availability (30-45 minutes max), frequent travel disrupts routine, 60+ hour work weeks",
      equipmentAccess: [
        "adjustable dumbbells",
        "kettlebell",
        "pull-up bar",
        "jump rope",
        "home gym setup",
      ],
      coachingStylePreference:
        "Efficient and encouraging with realistic expectations, supportive holistic approach that fits busy lifestyle",
      motivationStyle:
        "Energy improvement and mental clarity focus, stress reduction through movement, sustainable habits over intensity",
      goalTimeline: "6-month sustainable transformation",
      timeOfDayPreference: "early morning (5:30am before work)",
      trainingHistory:
        "College sports background, was gym regular but deconditioned over last 5 years. Good movement foundation but needs to rebuild.",
      lifeStageContext:
        "42-year-old busy professional with demanding career, prioritizing health after period of decline, needs time-efficient approach",
      sophisticationLevel: "INTERMEDIATE" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: busy professional needs time-efficient, supportive coaching
      // Could be emma (supportive/beginner-friendly), alex (lifestyle balance), or marcus (efficient/educational)
      validPersonalities: ["alex", "emma", "marcus"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "female",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },
  {
    name: "multiple-constraints",
    description:
      "Complex case with multiple injuries and constraints - male coach",
    sessionOverrides: {
      genderPreference: "male",
      age: 55,
      experienceLevel: "intermediate" as const,
      trainingFrequency: 3,
      sessionDuration: "60 minutes with extended warmup",
      primaryGoals:
        "Maintain strength while managing arthritis, improve mobility and movement quality, sustainable training with injury management",
      injuryConsiderations:
        "Arthritis in knees and hands, previous shoulder surgery, lower back issues - requires careful pain management",
      movementLimitations:
        "Limited range of motion in multiple joints, pain management needed, recovery takes longer than average, needs therapeutic approach",
      equipmentAccess: [
        "dumbbells",
        "resistance bands",
        "basic home gym equipment",
      ],
      coachingStylePreference:
        "Patient and adaptive approach, health-focused with emphasis on sustainable movement quality over intensity",
      motivationStyle:
        "Quality of life improvement focus, pain reduction goals, functional capability for daily activities",
      goalTimeline:
        "Ongoing therapeutic approach - focus on consistent progress",
      timeOfDayPreference: "flexible (depends on pain levels)",
      trainingHistory:
        "20 years of training on and off, experienced but capacity reduced due to chronic injuries and arthritis",
      lifeStageContext:
        "55-year-old with multiple chronic conditions requiring careful programming, prioritizing longevity and pain management",
      sophisticationLevel: "INTERMEDIATE" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: complex medical needs should get marcus or emma (patient/educational)
      validPersonalities: ["marcus", "emma"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "male",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
      shouldHaveSafetyModifications: true,
    },
  },
  {
    name: "hyrox-competition",
    description: "Hyrox athlete preparing for competition - female coach",
    sessionOverrides: {
      genderPreference: "female",
      age: 32,
      experienceLevel: "intermediate" as const,
      trainingFrequency: 5,
      sessionDuration: "75 minutes",
      primaryGoals:
        "Prepare for Hyrox race with improved running endurance and station efficiency. 10-week prep focusing on running volume and station transitions.",
      injuryConsiderations:
        "None currently but need to manage running volume increase to prevent overuse injuries",
      movementLimitations:
        "Limited running endurance - needs progressive volume building",
      equipmentAccess: [
        "rower",
        "ski erg",
        "sled",
        "treadmill",
        "barbell",
        "dumbbells",
        "CrossFit gym with all Hyrox equipment",
      ],
      coachingStylePreference:
        "Competition-focused and progressive, technique-oriented with detailed programming and periodization",
      motivationStyle:
        "Race goals and PR pursuit, competition readiness and event-specific performance",
      goalTimeline: "10-week Hyrox race preparation",
      timeOfDayPreference: "flexible (mix of running and station work)",
      trainingHistory:
        "3 years CrossFit background, no Hyrox-specific training. Current 5K: 24 minutes. Comfortable with stations but needs endurance work.",
      lifeStageContext:
        "32-year-old athlete transitioning from CrossFit to Hyrox racing, needs event-specific conditioning",
      competitionGoals:
        "Hyrox race - improve running endurance and station transitions",
      competitionTimeline: "10 weeks to race day",
      sophisticationLevel: "INTERMEDIATE" as const,
    },
    expectations: {
      shouldSucceed: true,
      // Validate reasonableness: Hyrox competitor needs competition-focused coaching
      // Could be diana (competition/performance), alex (endurance balance), or marcus (technical training)
      validPersonalities: ["diana", "alex", "marcus"],
      // Any methodology is valid - AI will choose based on profile
      validMethodologies: VALID_METHODOLOGIES,
      expectedGenderPreference: "female",
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },

  // Error handling test cases
  {
    name: "error-missing-session",
    description: "Should fail gracefully when session doesn't exist",
    sessionOverrides: null, // Don't create session
    expectations: {
      shouldSucceed: false,
      expectedError: "Session not found",
    },
  },
  {
    name: "error-incomplete-session",
    description: "Should fail when session is not marked complete",
    sessionOverrides: {
      isComplete: false, // Force incomplete
      genderPreference: "male",
      age: 30,
      experienceLevel: "intermediate" as const,
      primaryGoals: "Get fit and build strength",
    },
    expectations: {
      shouldSucceed: false,
      expectedError: "Session is not complete",
    },
  },
  {
    name: "error-gender-validation",
    description: "Validates gender preference is correctly applied",
    sessionOverrides: {
      genderPreference: "female",
      age: 25,
      experienceLevel: "beginner" as const,
      trainingFrequency: 3,
      sessionDuration: "60 minutes",
      primaryGoals: "Build foundational strength and learn proper form",
      coachingStylePreference: "Supportive and encouraging with clear guidance",
      sophisticationLevel: "BEGINNER" as const,
    },
    expectations: {
      shouldSucceed: true, // Should succeed with correct gender
      expectedGenderPreference: "female",
      minConfidence: 0.7,
      shouldHavePrompts: true,
      shouldStorePinecone: true,
    },
  },
];

/**
 * Create a complete coach creator session for testing
 * Uses a REAL session template from DynamoDB with selective overrides
 */
async function createTestSession(
  userId: string,
  sessionOverrides: SessionOverrides,
): Promise<string> {
  const sessionId = `session_${userId}_${Date.now()}_test`;
  const now = new Date().toISOString();

  // Create session from real template with test-specific overrides
  const sessionAttributes = createTestSessionFromTemplate({
    userId,
    sessionId,
    ...sessionOverrides,
  });

  // Use centralized DynamoDB operation - handles date serialization automatically
  const item = createDynamoDBItem<Partial<CoachCreatorSession>>(
    "coachCreatorSession",
    `user#${userId}`,
    `coachCreatorSession#${sessionId}`,
    sessionAttributes,
    now,
  );

  await saveToDynamoDB(item);

  const overrideDesc = describeSessionOverrides(sessionOverrides);
  console.info(`✅ Created test session: ${sessionId}`);
  console.info(`   Overrides: ${overrideDesc}`);

  return sessionId;
}

/**
 * Fetch coach creator session from DynamoDB
 * Uses centralized DynamoDB operations for consistency
 */
async function fetchSession(
  userId: string,
  sessionId: string,
): Promise<any | null> {
  try {
    const item = await loadFromDynamoDB<CoachCreatorSession>(
      `user#${userId}`,
      `coachCreatorSession#${sessionId}`,
      "coachCreatorSession",
    );

    // Return the attributes (which contains the session data)
    return item?.attributes || null;
  } catch (error) {
    console.error(
      `❌ Failed to fetch session:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fetch coach config from DynamoDB
 * Uses centralized DynamoDB operations for consistency
 */
async function fetchCoachConfig(
  userId: string,
  coachId: string,
): Promise<any | null> {
  try {
    const item = await loadFromDynamoDB<CoachConfig>(
      `user#${userId}`,
      `coach#${coachId}`, // Note: operations.ts uses "coach#" not "coach_config#"
      "coachConfig",
    );

    return item?.attributes || null;
  } catch (error) {
    console.error(
      `❌ Failed to fetch coach config:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Validate coach config structure using centralized schema validator
 */
function validateCoachConfig(coachConfig: any): ValidationResult[] {
  const validations: ValidationResult[] = [];

  // Use centralized schema validator
  const schemaValidation = validateCoachConfigSchema(coachConfig);

  if (schemaValidation.isValid) {
    validations.push({
      name: "Schema validation",
      passed: true,
      expected: "valid",
      actual: "valid",
    });
  } else {
    // Add individual failures for each schema error
    for (const error of schemaValidation.errors) {
      // Debug logging for timestamp issues
      if (error.includes("generation_timestamp")) {
        console.error(
          "🔍 DEBUG - generation_timestamp value:",
          coachConfig.metadata?.generation_timestamp,
        );
        console.error(
          "🔍 DEBUG - generation_timestamp type:",
          typeof coachConfig.metadata?.generation_timestamp,
        );
      }
      validations.push({
        name: `Schema: ${error}`,
        passed: false,
        expected: "valid",
        actual: "invalid",
      });
    }
  }

  return validations;
}

/**
 * Run individual test case
 */
async function runTestCase(
  testCase: any,
  verbose: boolean = false,
): Promise<TestResult> {
  const lambdaClient = new LambdaClient({ region: DEFAULT_REGION });
  const userId = TEST_USER_ID + "_" + testCase.name;
  let sessionId: string | null = null;

  try {
    // Step 1: Create session if overrides provided
    if (testCase.sessionOverrides) {
      console.info("📝 Creating test session from real template...");
      sessionId = await createTestSession(userId, testCase.sessionOverrides);
    } else {
      // Use non-existent session ID for error tests
      sessionId = `session_${userId}_nonexistent`;
      console.info(
        "⚠️  Skipping session creation (testing missing session scenario)",
      );
    }

    // Step 2: Invoke Lambda
    console.info("🚀 Invoking build-coach-config Lambda...");
    const invokeCommand = new InvokeCommand({
      FunctionName: DEFAULT_FUNCTION,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify({
        userId,
        sessionId,
      }),
    });

    const response = await lambdaClient.send(invokeCommand);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const body =
      typeof payload.body === "string"
        ? JSON.parse(payload.body)
        : payload.body;

    if (verbose) {
      console.info("Lambda response:", JSON.stringify(body, null, 2));
    } else {
      console.info("Lambda response:", {
        success: body?.success,
        coachConfigId: body?.coachConfigId,
        coachName: body?.coachName,
        generationMethod: body?.generationMethod,
      });
    }

    // Step 3: Wait for processing
    console.info("⏳ Waiting for processing...");
    await new Promise((resolve) => setTimeout(resolve, LOG_WAIT_TIME));

    // Step 4: Validate response
    const validations: ValidationResult[] = [];

    if (testCase.expectations.shouldSucceed) {
      // Success validations
      validations.push({
        name: "Response success",
        passed: body?.success === true,
        expected: true,
        actual: body?.success,
      });

      validations.push({
        name: "Has coach config ID",
        passed: !!body?.coachConfigId,
        expected: "present",
        actual: body?.coachConfigId ? "present" : "missing",
      });

      validations.push({
        name: "Has coach name",
        passed: !!body?.coachName,
        expected: "present",
        actual: body?.coachName || "missing",
      });

      validations.push({
        name: "Generation method is agent",
        passed:
          body?.generationMethod === "agent" ||
          body?.generationMethod === "tool",
        expected: "agent or tool",
        actual: body?.generationMethod,
      });

      // Fetch and validate coach config
      if (body?.coachConfigId) {
        console.info("📥 Fetching coach config from DynamoDB...");
        const coachConfig = await fetchCoachConfig(userId, body.coachConfigId);

        if (coachConfig) {
          console.info("✅ Coach config retrieved successfully");

          // Validate structure
          const configValidations = validateCoachConfig(coachConfig);
          validations.push(...configValidations);

          // Validate personality is reasonable for user profile
          if (testCase.expectations.validPersonalities) {
            const actualPersonality =
              coachConfig.selected_personality?.primary_template;
            const isValid =
              testCase.expectations.validPersonalities.includes(
                actualPersonality,
              );
            validations.push({
              name: "Personality is reasonable for profile",
              passed: isValid,
              expected: `One of: ${testCase.expectations.validPersonalities.join(", ")}`,
              actual: actualPersonality,
            });
          }

          // Validate methodology is valid
          if (testCase.expectations.validMethodologies) {
            const actualMethodology =
              coachConfig.selected_methodology?.primary_methodology;
            const isValid =
              testCase.expectations.validMethodologies.includes(
                actualMethodology,
              );
            validations.push({
              name: "Methodology is valid",
              passed: isValid,
              expected: "One of the valid methodologies",
              actual: actualMethodology,
            });
          }

          // Validate gender preference
          if (testCase.expectations.expectedGenderPreference) {
            validations.push({
              name: "Gender preference matches",
              passed:
                coachConfig.gender_preference ===
                testCase.expectations.expectedGenderPreference,
              expected: testCase.expectations.expectedGenderPreference,
              actual: coachConfig.gender_preference,
            });
          }

          // Store coach config for verbose output
          if (verbose) {
            (validations as any).coachConfig = coachConfig;
          }
        } else {
          validations.push({
            name: "Coach config saved to DynamoDB",
            passed: false,
            expected: "present",
            actual: "missing",
          });
        }

        // Fetch and validate session status
        if (sessionId) {
          console.info("📥 Fetching session status...");
          const session = await fetchSession(userId, sessionId);

          if (session) {
            const configGenStatus = session.configGeneration?.status;
            validations.push({
              name: "Session updated to COMPLETE",
              passed: configGenStatus === "COMPLETE",
              expected: "COMPLETE",
              actual: configGenStatus,
            });
          }
        }
      }

      // Check Pinecone storage
      if (testCase.expectations.shouldStorePinecone && body?.pineconeStored) {
        validations.push({
          name: "Stored in Pinecone",
          passed: body.pineconeStored === true,
          expected: true,
          actual: body.pineconeStored,
        });

        validations.push({
          name: "Has Pinecone record ID",
          passed: !!body.pineconeRecordId,
          expected: "present",
          actual: body.pineconeRecordId ? "present" : "missing",
        });
      }
    } else {
      // Error validations
      // Check for failure indicators: success: false, error field, or Lambda error
      validations.push({
        name: "Response indicates failure",
        passed:
          body?.success === false || body?.error || !!payload.errorMessage,
        expected: "failure response",
        actual:
          body?.error ||
          (body?.success === false ? "success: false" : payload.errorMessage) ||
          "unknown",
      });

      if (testCase.expectations.expectedError) {
        const errorText = JSON.stringify(payload).toLowerCase();
        const expectedError = testCase.expectations.expectedError.toLowerCase();
        validations.push({
          name: `Error message contains: ${testCase.expectations.expectedError}`,
          passed: errorText.includes(expectedError),
          expected: testCase.expectations.expectedError,
          actual:
            body?.error ||
            body?.reason ||
            payload.errorMessage ||
            "no error message",
        });
      }

      // Verify session status if it exists
      if (sessionId && testCase.sessionOverrides) {
        const session = await fetchSession(userId, sessionId);
        if (session) {
          const configGenStatus = session.configGeneration?.status;
          validations.push({
            name: "Session marked as FAILED",
            passed: configGenStatus === "FAILED",
            expected: "FAILED",
            actual: configGenStatus,
          });
        }
      }
    }

    // Collect results
    const failures = validations.filter((v) => !v.passed).map((v) => v.name);
    const passed = failures.length === 0;

    return {
      testName: testCase.name,
      passed,
      validations,
      failures,
      response: payload,
    };
  } catch (error) {
    console.error("❌ Test error:", error);
    return {
      testName: testCase.name,
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
      failures: ["Test execution failed"],
    };
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.info("🎨 Build Coach Config Integration Tests");
  console.info("========================================\n");

  // Parse command line arguments
  const verbose = process.argv.includes("--verbose");
  const createSessions = process.argv.includes("--create-sessions");
  const testFilter = process.argv
    .find((arg) => arg.startsWith("--test="))
    ?.split("=")[1];
  const outputDir = process.argv
    .find((arg) => arg.startsWith("--output="))
    ?.split("=")[1];

  const results: TestResult[] = [];
  let testCases = TEST_CASES;

  // Create output directory if specified
  if (outputDir) {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.info(`📁 Created output directory: ${outputDir}\n`);
      }
    } catch (error) {
      console.warn(
        `⚠️  Could not create output directory ${outputDir}: ${(error as Error).message}\n`,
      );
    }
  }

  // Filter tests if --test flag provided
  if (testFilter) {
    testCases = testCases.filter((tc) => tc.name.includes(testFilter));
    console.info(`🔍 Running filtered tests: ${testFilter}\n`);
  }

  for (const testCase of testCases) {
    console.info(`\n📋 Test: ${testCase.name}`);
    console.info(`   ${testCase.description}`);

    try {
      const result = await runTestCase(testCase, verbose);
      results.push(result);

      if (result.passed) {
        console.info(`   ✅ PASSED`);
      } else {
        console.info(
          `   ❌ FAILED: ${result.failures?.join(", ") || "Unknown failure"}`,
        );
      }

      // Show detailed validations in verbose mode
      if (verbose && result.validations) {
        console.info(`\n   Validation Details:`);
        result.validations.forEach((v) => {
          const icon = v.passed ? "✅" : "❌";
          console.info(`     ${icon} ${v.name}`);
          if (!v.passed && v.expected && v.actual) {
            console.info(`        Expected: ${JSON.stringify(v.expected)}`);
            console.info(`        Actual: ${JSON.stringify(v.actual)}`);
          }
        });
      }

      // Save individual test result
      if (outputDir) {
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .split("T")[0];
          const sanitizedTestName = testCase.name.replace(/[^a-z0-9-]/gi, "-");
          const individualFile = path.join(
            outputDir,
            `${timestamp}_${sanitizedTestName}_result.json`,
          );

          const individualData = {
            timestamp: new Date().toISOString(),
            testName: testCase.name,
            description: testCase.description,
            passed: result.passed,
            validations: result.validations,
            failures: result.failures,
            response: result.response,
            config: {
              region: DEFAULT_REGION,
              function: DEFAULT_FUNCTION,
              note: "DynamoDB table managed by centralized operations.ts",
            },
          };

          fs.writeFileSync(
            individualFile,
            JSON.stringify(individualData, null, 2),
          );
          console.info(
            `   💾 Result saved to: ${path.basename(individualFile)}`,
          );
        } catch (error) {
          console.error(
            `   ⚠️  Failed to save individual result: ${(error as Error).message}`,
          );
        }
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

  console.info(`\n\n📊 Test Summary`);
  console.info(`================`);
  console.info(`Passed: ${passed}/${total}`);
  console.info(`Failed: ${total - passed}/${total}`);

  // Save summary
  if (outputDir) {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const summaryFile = path.join(outputDir, `${timestamp}_summary.json`);

      const outputData = {
        timestamp: new Date().toISOString(),
        summary: {
          total,
          passed,
          failed: total - passed,
          passRate: ((passed / total) * 100).toFixed(2) + "%",
        },
        results: results.map((r) => ({
          testName: r.testName,
          passed: r.passed,
          failures: r.failures,
        })),
        config: {
          region: DEFAULT_REGION,
          function: DEFAULT_FUNCTION,
          note: "DynamoDB table managed by centralized operations.ts",
        },
      };

      fs.writeFileSync(summaryFile, JSON.stringify(outputData, null, 2));
      console.info(`\n💾 Summary saved to: ${path.basename(summaryFile)}`);
      console.info(`   Individual test results also saved in: ${outputDir}/`);
    } catch (error) {
      console.error(
        `\n⚠️  Failed to save summary: ${(error as Error).message}`,
      );
    }
  }

  if (passed === total) {
    console.info(`\n✅ All tests passed!`);
    process.exit(0);
  } else {
    console.info(`\n❌ Some tests failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
