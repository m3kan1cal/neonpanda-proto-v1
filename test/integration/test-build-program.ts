#!/usr/bin/env tsx

/**
 * Build Program Testing Script (Agent-Based)
 *
 * ⚠️ ARCHITECTURE CLARIFICATION ⚠️
 * =================================
 * The build-program Lambda is NOT INTERACTIVE. It does not ask questions
 * during execution. Here's how it works:
 *
 * CONVERSATION PHASE (Separate from Lambda):
 * 1. User ←→ Coach conversation in "program designer" mode
 * 2. Coach asks questions and builds a complete todoList
 * 3. Once todoList is complete, coach invokes build-program
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
 * - Six diverse pre-defined test scenarios covering different use cases
 *
 * Build Program Testing Script
 *
 * Tests the build-program Lambda (agent-based) with various payloads.
 * Validates that the ProgramDesigner agent correctly uses tools to design programs.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * ============================
 * The build-program agent is FIRE-AND-FORGET (non-interactive):
 * 1. It receives a COMPLETE todoList (from prior program designer conversation)
 * 2. It runs to completion using internal tools (load, generate, validate, save)
 * 3. It does NOT ask the user questions during execution
 * 4. Tool execution order is determined by Claude based on the system prompt
 *
 * This test:
 * - Provides complete todoList payloads (simulating what the conversation would create)
 * - Invokes the Lambda and validates the result
 * - Checks DynamoDB/S3 for saved data
 * - Tests six diverse program scenarios (strength, hypertrophy, powerlifting, etc.)
 *
 * Features:
 *   - Lambda invocation and response validation
 *   - DynamoDB program metadata validation
 *   - S3 workout template validation
 *   - Phase structure and continuity validation
 *   - Workout distribution and frequency validation
 *   - Six diverse pre-defined test scenarios
 *
 * Usage:
 *   tsx test/integration/test-build-program.ts [options]
 *
 * Options:
 *   --function=NAME     Lambda function name (default: build-program)
 *   --test=NAME         Run specific test (default: all)
 *   --output=DIR        Save results to directory (creates timestamped files)
 *   --verbose           Show detailed logging
 *   --region=REGION     AWS region (default: us-west-2)
 *
 * Examples:
 *   tsx test/integration/test-build-program.ts
 *   tsx test/integration/test-build-program.ts --test=simple-4week --verbose
 *   tsx test/integration/test-build-program.ts --output=test/fixtures/results --verbose
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import Ajv from "ajv";
import * as fs from "fs";
import * as path from "path";
import { PROGRAM_SCHEMA } from "../../amplify/functions/libs/schemas/program-schema";

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

// General sanity bounds for ALL programs (not test-specific)
const SANITY_BOUNDS = {
  MIN_PHASES: 1,
  MAX_PHASES: 10,
  MIN_WORKOUTS: 1,
  MAX_WORKOUTS: 200,
  MIN_DAYS: 1,
  MAX_DAYS: 365,
  MIN_FREQUENCY: 1,
  MAX_FREQUENCY: 7,
};

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_FUNCTION =
  "amplify-neonpandaprotov1--buildprogramlambda205E00-1arOjN3G11Sh";
const LOG_WAIT_TIME = 30000; // Wait 30s for logs (program generation takes time)
const DYNAMODB_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "NeonPandaProtoV1-DataTable-Sandbox";
const S3_BUCKET_NAME = process.env.APPS_BUCKET_NAME;

// Test user and coach IDs
const TEST_USER_ID = "63gocaz-j-AYRsb0094ik";
const TEST_COACH_ID = "user_63gocaz-j-AYRsb0094ik_coach_1756078034317";

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
        "User is an intermediate lifter with 2 years of consistent training experience. Primary goal is to build foundational strength in the big four lifts: back squat, bench press, deadlift, and push press. Currently working demanding job with limited sleep (6 hours) and high stress levels, so recovery is a concern. Has access to basic home gym setup with barbell, squat rack, and adjustable bench. Trains after work around 6pm, typically 45-60 minute sessions. Recent maxes: squat 225x5, bench 185x5, deadlift 275x5, push press 115x5. Wants to establish new 1RM baselines by end of program. Enjoys CrossFit-style conditioning finishers but strength is primary focus. Has some shoulder mobility restrictions and tight upper back from desk work. Prefers training 4 days per week (Mon/Tue/Thu/Fri) with weekends for active recovery.",
    },
    expectations: {
      shouldSucceed: true,
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
        "User is 48-year-old masters CrossFit athlete preparing for local competition. Has 3 years CrossFit experience and decades of general fitness background. Goals are to PR five core lifts (bench press, deadlift, back squat, push press, cleans) while building work capacity for mixed-modal events. Currently coming back from 2-month break and needs to rebuild systematically. Has full functional fitness gym access including barbell, rack, dumbbells, rower, box, assault bike, rings, and all standard CrossFit equipment. Trains 5 days per week, typically 60-75 minute sessions, prefers morning workouts. Recovery is crucial at this age - needs built-in recovery protocols and smart programming. Wants structured block periodization moving from technical work (65-75%) through strength-endurance phase (75-85%), then competition-specific intensification (85-90%), finishing with PR testing week. Prefers combining strength and metabolic conditioning within same sessions rather than pure strength days. Recent performance: 1RM back squat 315, deadlift 385, bench 245, push press 165, power clean 205. No current injuries but mindful of masters athlete recovery needs.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "beginner-hypertrophy",
    description: "Beginner 6-week hypertrophy program",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test3`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: { value: "Build muscle and learn proper form" },
        programDuration: { value: "6 weeks" },
        trainingFrequency: { value: 3 },
        equipmentAccess: {
          value: ["dumbbells", "bench", "cables", "machines"],
        },
        experienceLevel: { value: "beginner" },
        programFocus: { value: "muscle building" },
      },
      conversationContext:
        "User is 28-year-old male, completely new to structured training. Has gym membership for 3 months but been doing random workouts without progression. Primary goal is to build visible muscle mass and learn proper lifting technique. Works office job, sits most of day, wants to improve posture and overall physique. Can commit to 3 days per week (Mon/Wed/Fri), each session 45-60 minutes. Has access to commercial gym with full dumbbell set, adjustable benches, cable machines, leg press, lat pulldown, and basic machines. Prefers machines and dumbbells over barbells initially due to confidence with form. No prior injuries but some lower back tightness from sitting. Wants to focus on major muscle groups (chest, back, legs, shoulders, arms) with emphasis on hypertrophy rep ranges. Open to learning but needs clear instruction on form and technique. Previous athletic background: high school sports 10 years ago, but been sedentary since college. Starting stats: 6'0\", 175 lbs, relatively lean but minimal muscle mass. Nutrition is decent but not tracking macros yet.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "powerlifting-prep",
    description: "12-week powerlifting competition prep",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test4`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: {
          value:
            "Peak for powerlifting competition - squat, bench, deadlift maxes",
        },
        programDuration: { value: "12 weeks" },
        trainingFrequency: { value: 4 },
        equipmentAccess: { value: ["barbell", "rack", "bench", "plates"] },
        experienceLevel: { value: "advanced" },
        programFocus: { value: "powerlifting peaking" },
      },
      conversationContext:
        "User is 35-year-old competitive powerlifter with 5 years focused powerlifting training. Registered for USAPL meet on March 15th (12 weeks out). Current best gym lifts: squat 455 lbs, bench 315 lbs, deadlift 545 lbs (total ~1315 lbs). Goal is to hit 1350+ total at meet. Trains at powerlifting-specific gym with calibrated plates, competition bars, monolift, specialized equipment. Prefers 4-day split (squat/bench/deadlift focus days plus auxiliary day). Needs classic powerlifting periodization: accumulation phase (weeks 1-4) at 70-80% building work capacity, intensification phase (weeks 5-8) at 80-90% with reduced volume, realization phase (weeks 9-10) at 90-95% competition simulation, taper (weeks 11-12) with openers and peak for meet day. Responds well to variations like pause squats, competition bench with pauses, deficit deadlifts for building strength. Uses RPE and percentage-based programming. Previous meet experience shows needs extra bench volume and better deadlift lockout strength. Weak points: depth on squats under heavy load, sticking point on bench 2-3 inches off chest, deadlift lockout at knees. Nutrition and recovery are dialed in with coach support. No current injuries but mindful of lower back fatigue management.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "short-deload",
    description: "2-week deload/recovery program",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test5`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: {
          value:
            "Active recovery and movement quality after hard training block",
        },
        programDuration: { value: "2 weeks" },
        trainingFrequency: { value: 3 },
        equipmentAccess: { value: ["bodyweight", "bands", "foam roller"] },
        experienceLevel: { value: "intermediate" },
        programFocus: { value: "recovery and mobility" },
      },
      conversationContext:
        "User is intermediate athlete (5 years training experience) coming off brutal 16-week strength program and feeling completely beat up. Accumulated fatigue showing in joints (elbows, knees feel achy), sleep quality declining, motivation low, minor nagging pains in shoulders and hips. Needs structured active recovery period before starting next training block. Primary goals: reduce systemic fatigue, improve movement quality, address mobility restrictions, maintain fitness base without adding stress. Has minimal equipment at home: yoga mat, resistance bands, foam roller, lacrosse ball. Can do bodyweight movements, walks, light stretching. Wants 3 short sessions per week (30-40 minutes max) focusing on: mobility work for hips/shoulders/thoracic spine, low-intensity movement patterns, blood flow work, maybe some light bodyweight circuits. No heavy loading, no PR attempts, no metcons. Previous issues: tight hip flexors from sitting, limited shoulder external rotation, some lower back stiffness. After this deload will begin new hypertrophy block so wants to exit feeling refreshed and moving well. Open to yoga-style flows, animal movements, tempo work, and corrective exercises.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "functional-busy-pro",
    description: "6-week functional fitness for busy professional",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test6`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: {
          value:
            "Stay fit and healthy with minimal time commitment, improve energy",
        },
        programDuration: { value: "6 weeks" },
        trainingFrequency: { value: 3 },
        equipmentAccess: {
          value: ["dumbbells", "kettlebell", "pull-up bar", "jump rope"],
        },
        experienceLevel: { value: "intermediate" },
        programFocus: { value: "time-efficient functional fitness" },
        sessionDuration: { value: "30-45 minutes" },
      },
      conversationContext:
        "User is 42-year-old tech executive working 60+ hour weeks with frequent travel. Used to be very fit (played college sports, was gym regular) but last 5 years fitness has declined with career demands. Now experiencing low energy, gained 20 lbs, feels out of shape, wants to get back on track without massive time commitment. Has home gym in garage: adjustable dumbbells (5-50 lbs), 35 lb kettlebell, doorway pull-up bar, jump rope, yoga mat. Can realistically commit to 3 workouts per week, needs sessions to be 30-45 minutes max including warmup. Prefers early morning training (5:30am) before work emails start. Goals: lose fat, build functional strength, improve energy levels and mental clarity, reduce stress, feel athletic again. Not trying to be competitive athlete, just wants to be fit, healthy, and feel good. Intermediate experience level - understands basic movements and training but needs structured plan. Responds well to circuit-style training, supersets, and time-efficient programming. Likes full-body movements that give maximum return on time investment: goblet squats, push-ups, rows, kettlebell swings, pull-ups, loaded carries, jump rope intervals. Needs variety to stay engaged. Travel frequently so some workouts might need to be bodyweight-only hotel options. No injuries but some stiffness from desk work and stress. Values programming that supports longevity and sustainable fitness rather than maximal intensity.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "hyrox-competition-prep",
    description: "10-week Hyrox competition preparation",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test7`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: {
          value:
            "Prepare for Hyrox competition - improve running endurance and station performance",
        },
        programDuration: { value: "10 weeks" },
        trainingFrequency: { value: 5 },
        equipmentAccess: {
          value: [
            "rower",
            "ski erg",
            "sled",
            "dumbbells",
            "sandbag",
            "wall ball",
            "treadmill",
          ],
        },
        experienceLevel: { value: "intermediate" },
        programFocus: { value: "Hyrox race preparation" },
      },
      conversationContext:
        "User is 32-year-old CrossFit athlete transitioning to Hyrox competition format. Has solid CrossFit foundation with 3 years experience but limited running volume and no Hyrox-specific training. Registered for Hyrox race in 10 weeks and wants structured prep program. Current fitness: comfortable with all 8 Hyrox stations but needs to improve running endurance and transition efficiency. Can run 5K in ~24 minutes but struggles maintaining pace with fatigue from stations. Hyrox format is 8x 1km runs with stations between: ski erg 1000m, sled push 50m, sled pull 50m, burpee broad jumps 80m, rowing 1000m, farmers carry 200m (2x16kg kettlebells), sandbag lunges 100m (10kg bag), wall balls 100 reps (6kg ball). Has access to full CrossFit gym with all needed equipment including rower, ski erg, sled track, dumbbells, sandbags, wall balls, and treadmills. Can train 5 days per week, mixing running sessions, station-specific work, and full race simulations. Needs progressive program building from base endurance and station technique (weeks 1-3), through higher intensity intervals and combined running/stations (weeks 4-7), into race-pace simulations (weeks 8-9), with taper week before competition (week 10). Key focuses: improve aerobic base for sustained running, develop station efficiency and speed, practice transitions, build mental toughness for 60-75 minute race effort. Weak areas: running economy degrades badly under fatigue, sled push technique needs work, wall ball pacing. Previous athletic background includes high school soccer and recent CrossFit training. No current injuries but needs to manage training load carefully to avoid overuse from increased running volume.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  {
    name: "body-recomposition",
    description: "12-week body recomposition program",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_test`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_test8`,
      sessionId: `session_${Date.now()}_test`,
      todoList: {
        trainingGoals: {
          value:
            "Lose body fat while building/maintaining muscle - improve body composition and strength",
        },
        programDuration: { value: "12 weeks" },
        trainingFrequency: { value: 4 },
        equipmentAccess: {
          value: [
            "barbell",
            "rack",
            "dumbbells",
            "bench",
            "cables",
            "machines",
          ],
        },
        experienceLevel: { value: "intermediate" },
        programFocus: { value: "body recomposition and physique" },
      },
      conversationContext:
        "User is 29-year-old male with 18 months consistent training experience, now ready to dial in physique goals. Current stats: 5'11\", 190 lbs, approximately 20% body fat. Has built decent strength base (squat 275x5, bench 225x3, deadlift 315x5) but wants to get leaner while maintaining or building strength. Goal: reach ~12-15% body fat while improving muscle definition and keeping strength levels. Has commercial gym membership with full equipment access: barbells, power racks, dumbbells up to 120 lbs, adjustable benches, cable machines, leg press, hack squat, various machines for isolation work. Nutrition is dialed in with coach: eating in slight calorie deficit (~300 cal below maintenance), high protein (~1g per lb bodyweight), tracking macros consistently. Can train 4 days per week, 60-75 minute sessions. Prefers upper/lower split or push/pull/legs format. Programming needs: progressive overload on main lifts to maintain strength, sufficient volume for muscle retention/growth (8-12 rep ranges), strategic use of isolation exercises for muscle development, some metabolic conditioning to support fat loss without compromising recovery. Responds well to: compound movements first (squats, deadlifts, bench, rows, overhead press), then accessory work targeting specific muscle groups (arms, shoulders, back thickness, leg development). Wants emphasis on areas that will improve physique: broader shoulders, defined arms, V-taper back, leg development, visible abs. Phase 1 (weeks 1-4): establish baseline in deficit, moderate volume. Phase 2 (weeks 5-8): increase training density, add conditioning finishers. Phase 3 (weeks 9-12): peak muscle definition work, maintain strength, final fat loss push. No injuries, good movement quality, understands progressive overload principles. Sleep is solid (7-8 hours), stress is manageable, recovery protocols include adequate protein, hydration, and weekly deep tissue massage.",
    },
    expectations: {
      shouldSucceed: true,
    },
  },
  // Error handling test cases
  {
    name: "error-missing-coach-id",
    description: "Should fail gracefully with missing coachId",
    payload: {
      userId: TEST_USER_ID,
      // coachId intentionally missing
      conversationId: `conv_${Date.now()}_error1`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_error1`,
      sessionId: `session_${Date.now()}_error1`,
      todoList: {
        trainingGoals: { value: "Build strength" },
        programDuration: { value: "4 weeks" },
        trainingFrequency: { value: 4 },
      },
    },
    expectations: {
      shouldSucceed: false,
      expectedErrorPattern: "coachId",
    },
  },
  {
    name: "error-missing-user-id",
    description: "Should fail gracefully with missing userId",
    payload: {
      // userId intentionally missing
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_error2`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_error2`,
      sessionId: `session_${Date.now()}_error2`,
      todoList: {
        trainingGoals: { value: "Build strength" },
        programDuration: { value: "4 weeks" },
        trainingFrequency: { value: 4 },
      },
    },
    expectations: {
      shouldSucceed: false,
      expectedErrorPattern: "userId",
    },
  },
  {
    name: "error-invalid-duration",
    description: "Should fail with non-numeric program duration",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_error3`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_error3`,
      sessionId: `session_${Date.now()}_error3`,
      todoList: {
        trainingGoals: { value: "Build strength" },
        programDuration: { value: { invalid: "object" } }, // Invalid: not a number or string
        trainingFrequency: { value: 4 },
      },
    },
    expectations: {
      shouldSucceed: false,
      expectedErrorPattern: "duration|required|invalid",
    },
  },
  {
    name: "error-invalid-frequency",
    description: "Should fail with non-numeric training frequency",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_error4`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_error4`,
      sessionId: `session_${Date.now()}_error4`,
      todoList: {
        trainingGoals: { value: "Build strength" },
        programDuration: { value: "4 weeks" },
        trainingFrequency: { value: "ten times" }, // Invalid: not a number
      },
    },
    expectations: {
      shouldSucceed: false,
      expectedErrorPattern: "frequency|required|invalid",
    },
  },
  {
    name: "error-empty-todolist",
    description: "Should fail with empty/missing todoList",
    payload: {
      userId: TEST_USER_ID,
      coachId: TEST_COACH_ID,
      conversationId: `conv_${Date.now()}_error5`,
      programId: `program_${TEST_USER_ID}_${Date.now()}_error5`,
      sessionId: `session_${Date.now()}_error5`,
      todoList: {}, // Empty todoList
    },
    expectations: {
      shouldSucceed: false,
      expectedErrorPattern: "todoList|required|missing",
    },
  },
];

/**
 * Main test execution
 */
async function runTests() {
  console.info("🏋️ Build Program Integration Tests");
  console.info("===================================\n");

  // Parse command line arguments
  const verbose = process.argv.includes("--verbose");
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
        });
      }

      // Save individual test result to file if --output flag provided
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

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const individualData = {
            timestamp: new Date().toISOString(),
            testName: testCase.name,
            description: testCase.description,
            passed: result.passed,
            validations: result.validations,
            failures: result.failures,
            response: result.response,
            parsedBody:
              typeof result.response?.body === "string"
                ? JSON.parse(result.response.body)
                : result.response?.body,
            config: {
              region: DEFAULT_REGION,
              function: DEFAULT_FUNCTION,
              dynamoTable: DYNAMODB_TABLE_NAME,
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

  // Save summary results to file if --output flag provided
  if (outputDir) {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const summaryFile = path.join(outputDir, `${timestamp}_summary.json`);

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
        results: results.map((r) => ({
          testName: r.testName,
          passed: r.passed,
          failures: r.failures,
        })),
        config: {
          region: DEFAULT_REGION,
          function: DEFAULT_FUNCTION,
          dynamoTable: DYNAMODB_TABLE_NAME,
        },
        note: "Individual test results saved in separate files with format: YYYY-MM-DD_test-name_result.json",
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
  console.info(`   Invoking Lambda...`);
  const invokeCommand = new InvokeCommand({
    FunctionName: DEFAULT_FUNCTION,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(testCase.payload),
  });

  const response = await lambdaClient.send(invokeCommand);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  // Parse the body if it's a string (Lambda returns body as JSON string)
  const body =
    typeof payload.body === "string" ? JSON.parse(payload.body) : payload.body;

  if (verbose) {
    console.info(`   Lambda full response:`, JSON.stringify(payload, null, 2));
  } else {
    console.info(`   Lambda response:`, {
      success: body?.success,
      programId: body?.programId,
      phaseCount: body?.phaseCount,
      totalWorkoutTemplates: body?.totalWorkoutTemplates,
      generationMethod: body?.generationMethod,
    });
  }

  // Wait for logs
  console.info(`   Waiting for logs...`);
  await new Promise((resolve) => setTimeout(resolve, LOG_WAIT_TIME));

  // 2. Validate response
  const validations: ValidationResult[] = [];

  if (testCase.expectations.shouldSucceed) {
    validations.push({
      name: "Response success",
      passed: body?.success === true,
    });

    validations.push({
      name: "Has program ID",
      passed: !!body?.programId,
    });

    validations.push({
      name: "Has program name",
      passed: !!body?.programName,
    });

    // Sanity checks with reasonable bounds (not test-specific)
    validations.push({
      name: `Phase count (${SANITY_BOUNDS.MIN_PHASES}-${SANITY_BOUNDS.MAX_PHASES})`,
      passed:
        typeof body?.phaseCount === "number" &&
        body.phaseCount >= SANITY_BOUNDS.MIN_PHASES &&
        body.phaseCount <= SANITY_BOUNDS.MAX_PHASES,
    });

    validations.push({
      name: `Workout count (${SANITY_BOUNDS.MIN_WORKOUTS}-${SANITY_BOUNDS.MAX_WORKOUTS})`,
      passed:
        typeof body?.totalWorkoutTemplates === "number" &&
        body.totalWorkoutTemplates >= SANITY_BOUNDS.MIN_WORKOUTS &&
        body.totalWorkoutTemplates <= SANITY_BOUNDS.MAX_WORKOUTS,
    });

    // Validate agent-specific fields
    validations.push({
      name: "Has unique training days",
      passed: typeof body?.uniqueTrainingDays === "number",
    });

    validations.push({
      name: "Generation method is agent_v2",
      passed: body?.generationMethod === "agent_v2",
    });

    // Additional Lambda response validations with sanity bounds
    validations.push({
      name: `Total days (${SANITY_BOUNDS.MIN_DAYS}-${SANITY_BOUNDS.MAX_DAYS})`,
      passed:
        typeof body?.totalDays === "number" &&
        body.totalDays >= SANITY_BOUNDS.MIN_DAYS &&
        body.totalDays <= SANITY_BOUNDS.MAX_DAYS,
    });

    validations.push({
      name: "Has averageSessionsPerDay",
      passed: !!body?.averageSessionsPerDay,
    });

    validations.push({
      name: `Training frequency (${SANITY_BOUNDS.MIN_FREQUENCY}-${SANITY_BOUNDS.MAX_FREQUENCY})`,
      passed:
        typeof body?.trainingFrequency === "number" &&
        body.trainingFrequency >= SANITY_BOUNDS.MIN_FREQUENCY &&
        body.trainingFrequency <= SANITY_BOUNDS.MAX_FREQUENCY,
    });

    validations.push({
      name: "Has summary",
      passed: typeof body?.summary === "string" && body.summary.length > 0,
    });

    validations.push({
      name: "Has pineconeStored flag",
      passed: typeof body?.pineconeStored === "boolean",
    });

    validations.push({
      name: "Has pineconeRecordId",
      passed: typeof body?.pineconeRecordId === "string",
    });

    validations.push({
      name: "Has normalizationApplied flag",
      passed: typeof body?.normalizationApplied === "boolean",
    });

    // Note: Pruning may affect workout/day counts if frequency exceeded by >20%
    // This is expected behavior - agent optimizes to match requested frequency
    validations.push({
      name: "Has pruningApplied flag (if present)",
      passed:
        body?.pruningApplied === undefined ||
        typeof body?.pruningApplied === "boolean",
    });

    // 3. Fetch from DynamoDB
    if (body?.programId) {
      try {
        const getCommand = new GetCommand({
          TableName: DYNAMODB_TABLE_NAME,
          Key: {
            pk: `user#${testCase.payload.userId}`,
            sk: `program#${body.programId}`,
          },
        });

        const dbResult = await dynamoClient.send(getCommand);

        validations.push({
          name: "Saved to DynamoDB",
          passed: !!dbResult.Item,
        });

        if (dbResult.Item) {
          // DynamoDB items have an 'attributes' wrapper
          const attrs = dbResult.Item.attributes || dbResult.Item;

          // Validate against program schema
          const ajv = new Ajv({ allErrors: true });
          const validateProgram = ajv.compile(PROGRAM_SCHEMA);
          const schemaValid = validateProgram(attrs);

          validations.push({
            name: "DynamoDB: Matches program schema",
            passed: schemaValid,
          });

          if (!schemaValid && verbose) {
            console.info(
              "   📋 Schema validation errors:",
              JSON.stringify(validateProgram.errors, null, 2),
            );
          }

          validations.push({
            name: "DynamoDB: Has S3 detail key",
            passed: !!attrs.s3DetailKey,
          });

          // Add phase continuity validation
          if (Array.isArray(attrs.phases) && attrs.phases.length > 0) {
            validatePhaseContinuity(attrs.phases, attrs.totalDays, validations);
          }

          // Add S3 content validation
          if (attrs.s3DetailKey) {
            await validateS3Content(attrs.s3DetailKey, attrs, validations);
          }

          validations.push({
            name: `DynamoDB: Phase count (${SANITY_BOUNDS.MIN_PHASES}-${SANITY_BOUNDS.MAX_PHASES})`,
            passed:
              Array.isArray(attrs.phases) &&
              attrs.phases.length >= SANITY_BOUNDS.MIN_PHASES &&
              attrs.phases.length <= SANITY_BOUNDS.MAX_PHASES,
          });

          validations.push({
            name: `DynamoDB: Total days (${SANITY_BOUNDS.MIN_DAYS}-${SANITY_BOUNDS.MAX_DAYS})`,
            passed:
              typeof attrs.totalDays === "number" &&
              attrs.totalDays >= SANITY_BOUNDS.MIN_DAYS &&
              attrs.totalDays <= SANITY_BOUNDS.MAX_DAYS,
          });

          validations.push({
            name: "DynamoDB: Has status",
            passed: !!attrs.status,
          });

          validations.push({
            name: "DynamoDB: Has name",
            passed: typeof attrs.name === "string" && attrs.name.length > 0,
          });

          validations.push({
            name: "DynamoDB: Has description",
            passed:
              typeof attrs.description === "string" &&
              attrs.description.length > 0,
          });

          validations.push({
            name: "DynamoDB: Has startDate",
            passed:
              typeof attrs.startDate === "string" && attrs.startDate.length > 0,
          });

          validations.push({
            name: "DynamoDB: Has endDate",
            passed:
              typeof attrs.endDate === "string" && attrs.endDate.length > 0,
          });

          validations.push({
            name: `DynamoDB: Training frequency (${SANITY_BOUNDS.MIN_FREQUENCY}-${SANITY_BOUNDS.MAX_FREQUENCY})`,
            passed:
              typeof attrs.trainingFrequency === "number" &&
              attrs.trainingFrequency >= SANITY_BOUNDS.MIN_FREQUENCY &&
              attrs.trainingFrequency <= SANITY_BOUNDS.MAX_FREQUENCY,
          });

          validations.push({
            name: "DynamoDB: Has trainingGoals",
            passed: Array.isArray(attrs.trainingGoals),
          });

          validations.push({
            name: "DynamoDB: Has equipmentConstraints",
            passed: Array.isArray(attrs.equipmentConstraints),
          });

          validations.push({
            name: "DynamoDB: Has currentDay",
            passed:
              typeof attrs.currentDay === "number" && attrs.currentDay > 0,
          });

          validations.push({
            name: "DynamoDB: Has completedWorkouts",
            passed:
              typeof attrs.completedWorkouts === "number" &&
              attrs.completedWorkouts >= 0,
          });

          validations.push({
            name: "DynamoDB: Has adherenceRate",
            passed:
              typeof attrs.adherenceRate === "number" &&
              attrs.adherenceRate >= 0,
          });

          validations.push({
            name: "DynamoDB: Has coachIds array",
            passed: Array.isArray(attrs.coachIds) && attrs.coachIds.length > 0,
          });

          validations.push({
            name: "DynamoDB: Has coachNames array",
            passed:
              Array.isArray(attrs.coachNames) && attrs.coachNames.length > 0,
          });
        }
      } catch (dbError) {
        console.info(`   ⚠️  DynamoDB fetch failed: ${dbError.message}`);
      }
    }
  } else {
    // Error case validations
    // Handle multiple error formats:
    // - Agent errors: {success: false, reason: "..."} with 200 status
    // - Early validation errors: {error: "..."} with 400 status
    // - HTTP errors: statusCode >= 400
    validations.push({
      name: "Response indicates failure",
      passed:
        body?.success === false ||
        !!body?.error ||
        !!payload.errorMessage ||
        payload.statusCode >= 400,
    });

    if (testCase.expectations.expectedErrorPattern) {
      const errorText = JSON.stringify(payload).toLowerCase();
      const pattern = new RegExp(
        testCase.expectations.expectedErrorPattern,
        "i",
      );

      validations.push({
        name: `Error message matches pattern: ${testCase.expectations.expectedErrorPattern}`,
        passed: pattern.test(errorText),
      });
    }

    // Should NOT save to DynamoDB on error
    if (body?.programId && testCase.payload.userId) {
      try {
        const getCommand = new GetCommand({
          TableName: DYNAMODB_TABLE_NAME,
          Key: {
            pk: `user#${testCase.payload.userId}`,
            sk: `program#${body.programId}`,
          },
        });
        const dbResult = await dynamoClient.send(getCommand);

        validations.push({
          name: "Does NOT save invalid program to DynamoDB",
          passed: !dbResult.Item,
        });
      } catch (dbError) {
        // Expected: program not found
        validations.push({
          name: "Does NOT save invalid program to DynamoDB",
          passed: true,
        });
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

/**
 * Validate S3 content for program workout templates
 */
async function validateS3Content(
  s3Key: string,
  attrs: any,
  validations: ValidationResult[],
) {
  if (!S3_BUCKET_NAME) {
    validations.push({
      name: "S3: Bucket name configured",
      passed: false,
    });
    console.info("   ⚠️  S3_BUCKET_NAME not configured");
    return;
  }

  const s3Client = new S3Client({ region: DEFAULT_REGION });

  try {
    const s3Command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const s3Result = await s3Client.send(s3Command);
    const s3Body = await s3Result.Body?.transformToString();
    const s3Data = JSON.parse(s3Body || "{}");

    validations.push({
      name: "S3: File retrieved successfully",
      passed: !!s3Data,
    });

    validations.push({
      name: "S3: Has workoutTemplates array",
      passed: Array.isArray(s3Data.workoutTemplates),
    });

    if (s3Data.workoutTemplates) {
      validations.push({
        name: "S3: Has workout templates",
        passed: s3Data.workoutTemplates.length > 0,
      });

      // Validate all templates have required fields
      const allTemplatesValid = s3Data.workoutTemplates.every(
        (t: any) =>
          t.templateId &&
          t.groupId &&
          t.dayNumber &&
          t.name &&
          t.description &&
          t.scoringType &&
          t.estimatedDuration !== undefined,
      );

      validations.push({
        name: "S3: All templates have required fields",
        passed: allTemplatesValid,
      });

      // Group by day to validate distribution
      const templatesByDay: Record<number, any[]> = {};
      s3Data.workoutTemplates.forEach((t: any) => {
        if (!templatesByDay[t.dayNumber]) {
          templatesByDay[t.dayNumber] = [];
        }
        templatesByDay[t.dayNumber].push(t);
      });

      const trainingDays = Object.keys(templatesByDay).length;
      const expectedDays = Math.floor(
        (attrs.totalDays / 7) * attrs.trainingFrequency,
      );
      const variance =
        expectedDays > 0
          ? Math.abs(trainingDays - expectedDays) / expectedDays
          : 0;

      validations.push({
        name: "S3: Training days match frequency (±30%)",
        passed: variance <= 0.3,
      });

      // Validate phase-workout alignment
      const phaseIds = new Set(attrs.phases.map((p: any) => p.phaseId));
      const invalidPhaseRefs = s3Data.workoutTemplates.filter(
        (t: any) => t.phaseId && !phaseIds.has(t.phaseId),
      );

      validations.push({
        name: "S3: All workouts have valid phaseId references",
        passed: invalidPhaseRefs.length === 0,
      });

      // Validate workout days within phase ranges
      const invalidDayNumbers = s3Data.workoutTemplates.filter((t: any) => {
        const phase = attrs.phases.find((p: any) => p.phaseId === t.phaseId);
        return (
          phase && (t.dayNumber < phase.startDay || t.dayNumber > phase.endDay)
        );
      });

      validations.push({
        name: "S3: Workout days within phase ranges",
        passed: invalidDayNumbers.length === 0,
      });
    }
  } catch (s3Error: any) {
    validations.push({
      name: "S3: File retrieved successfully",
      passed: false,
    });
    console.info(`   ⚠️  S3 fetch failed: ${s3Error.message}`);
  }
}

/**
 * Validate phase continuity (no gaps or overlaps)
 */
function validatePhaseContinuity(
  phases: any[],
  totalDays: number,
  validations: ValidationResult[],
) {
  if (!phases || phases.length === 0) return;

  // First phase starts on day 1
  validations.push({
    name: "Phase: First phase starts on day 1",
    passed: phases[0].startDay === 1,
  });

  // Last phase ends on totalDays
  validations.push({
    name: "Phase: Last phase ends on totalDays",
    passed: phases[phases.length - 1].endDay === totalDays,
  });

  // Check for gaps or overlaps
  if (phases.length > 1) {
    let hasGaps = false;
    let hasOverlaps = false;

    for (let i = 0; i < phases.length - 1; i++) {
      const currentPhase = phases[i];
      const nextPhase = phases[i + 1];

      // Gap: next phase starts more than 1 day after current ends
      if (nextPhase.startDay > currentPhase.endDay + 1) {
        hasGaps = true;
      }

      // Overlap: next phase starts before current ends
      if (nextPhase.startDay <= currentPhase.endDay) {
        hasOverlaps = true;
      }
    }

    validations.push({
      name: "Phase: No gaps between phases",
      passed: !hasGaps,
    });

    validations.push({
      name: "Phase: No overlaps between phases",
      passed: !hasOverlaps,
    });
  }

  // Each phase has correct duration calculation
  const allDurationsCorrect = phases.every(
    (phase: any) => phase.durationDays === phase.endDay - phase.startDay + 1,
  );

  validations.push({
    name: "Phase: All durations calculated correctly",
    passed: allDurationsCorrect,
  });
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
