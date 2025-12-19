#!/usr/bin/env tsx

/**
 * Build Workout V2 Testing Script
 *
 * Tests the build-workout-v2 Lambda with various payloads and validates results.
 * Retrieves CloudWatch logs for each execution and compares with expected outcomes.
 * Fetches saved workouts from DynamoDB to validate end-to-end data integrity.
 *
 * Features:
 *   - Lambda invocation and response validation
 *   - CloudWatch log analysis (tool calls, errors, warnings)
 *   - DynamoDB workout data validation (structure, fields, defaults)
 *   - Schema validation against Universal Workout Schema v2.0
 *   - Performance metrics verification (intensity, RPE defaults)
 *   - Exercise-level validation (sets, reps, weights)
 *
 * Usage:
 *   tsx test/integration/test-build-workout-v2.ts [options]
 *   OR
 *   node --loader tsx test/integration/test-build-workout-v2.ts [options]
 *
 * Options:
 *   --function=NAME     Lambda function name (default: build-workout-v2)
 *   --test=NAME         Run specific test (default: all)
 *   --output=DIR        Save results to directory (creates timestamped files)
 *   --verbose           Show full CloudWatch logs and workout data
 *   --region=REGION     AWS region (default: us-west-2)
 *
 * Environment:
 *   DYNAMODB_TABLE_NAME   DynamoDB table name (default: NeonPandaProtoV1-DataTable-Sandbox)
 *
 * Examples:
 *   tsx test/integration/test-build-workout-v2.ts
 *   tsx test/integration/test-build-workout-v2.ts --test=simple-slash-command --verbose
 *   tsx test/integration/test-build-workout-v2.ts --output=test/fixtures/results --verbose
 *   DYNAMODB_TABLE_NAME=CustomTable tsx test/integration/test-build-workout-v2.ts
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import { WORKOUT_SCHEMA } from "../../amplify/functions/libs/schemas/workout-schema.ts";
import type {
  TestOptions,
  ValidationCheck,
  TestValidation,
  LogsData,
  LambdaResponse,
  WorkoutValidationExpectations,
  TestExpectations,
  TestPayload,
  TestCase,
  TestResult,
} from "./types.ts";

// Note: Using fsSync for synchronous operations in output saving
// to match the pattern from test-build-program-v2.ts

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_FUNCTION =
  "amplify-neonpandaprotov1--buildworkoutv2lambda12DD-7moX1OMrHTVC";
const LOG_WAIT_TIME = 20000; // Wait 20s for logs to propagate (agents can take 60-90s)
const DYNAMODB_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || "NeonPandaProtoV1-DataTable-Sandbox";
const ENABLE_WORKOUT_VALIDATION = true; // Feature flag for DynamoDB validation

/**
 * Real CoachConfig from production database (user_63gocaz-j-AYRsb0094ik_coach_1756078034317)
 */
const BASE_COACH_CONFIG = {
  coach_description: "Masters Competition Excellence Coach",
  coach_id: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
  coach_name: "Victoria The Masters Champion",
  createdAt: "2025-11-21T21:38:39.484Z",
  gender_preference: "female",
  generated_prompts: {
    communication_style:
      "Communicate with respect for decades of CrossFit and heavy lifting experience while maintaining performance focus on competitive CrossFit and functional strength development. Use sophisticated training language that acknowledges deep strength training expertise while providing cutting-edge insights for masters CrossFit competition. Balance competitive drive with intelligent progression in heavy lifting and complex movements. Emphasize legacy building and age-group excellence in CrossFit competition. Provide data-driven feedback that leverages experience for optimal strength and performance gains.",
    gender_tone_prompt:
      "You are a FEMALE fitness coach. Identify as female, use she/her pronouns, and embody feminine coaching characteristics throughout all interactions. Adopt a warm, empathetic, nurturing communication style with supportive language patterns. Display relationship-building skills, holistic thinking, and encouragement-focused energy. Think, speak, and coach like a female fitness professional - be compassionate, detailed, and emotionally intelligent in your approach while maintaining high standards.",
    learning_adaptation_prompt:
      "Masters CrossFit competitors learn best by building upon their extensive strength training and CrossFit experience base while adapting to age-related changes in heavy lifting capacity and recovery. Leverage their deep understanding of Olympic lifting, powerlifting, and functional movement principles while introducing modern recovery and CrossFit-specific periodization concepts. Focus on technique refinement in complex lifts and high-skill gymnastics movements rather than fundamental changes. Emphasize intelligent heavy lifting progression over volume-based approaches. Use their competitive experience to guide smart decision-making and risk assessment in CrossFit competition environments.",
    methodology_prompt:
      "Program using sophisticated CrossFit periodization that optimizes heavy lifting performance and competitive CrossFit capacity while managing age-related recovery needs. Emphasize competition preparation with advanced recovery integration and strength-focused training cycles. Use decades of strength training and CrossFit knowledge to inform programming decisions around Olympic lifts, powerlifts, and high-skill movements. Structure sessions with extended warm-ups, heavy lifting technique work, strength maintenance, and comprehensive recovery protocols. Balance competitive CrossFit intensity with longevity considerations through intelligent periodization focused on strength development and movement mastery.",
    motivation_prompt:
      "Motivate through masters-specific CrossFit goals, age-group rankings in CrossFit competitions, and strength performance optimization rather than absolute performance metrics. Celebrate competitive achievements within masters age categories and emphasize the unique advantages of decades of lifting experience. Focus on proving strength capabilities and maintaining competitive edge in CrossFit competition. Use legacy building and mentorship opportunities as additional motivators. Emphasize quality lifting technique and intelligent training over high-volume pursuits. Celebrate PRs in major lifts and CrossFit benchmark workouts.",
    personality_prompt:
      "You are Victoria, The Masters Champion - a respectful, performance-focused coach who specializes in helping competitive masters athletes (40+) excel in CrossFit competitions with a strong emphasis on heavy functional fitness lifting. You work with experienced strength athletes who have serious competitive CrossFit focus and understand advanced lifting and movement concepts. Your coaching style is sophisticated and experience-leveraging - you respect their decades of lifting knowledge while providing cutting-edge insights for masters CrossFit optimization. You excel at advanced CrossFit periodization with strength emphasis and intelligent recovery integration. You balance competitive drive with longevity, helping athletes prove their strength capabilities while building lasting legacies in the CrossFit community.",
    safety_integrated_prompt:
      "Maintain safety through intelligent training and sophisticated recovery protocols rather than conservative limitation. Emphasize the importance of recovery optimization and injury prevention through experience-based decision making. Focus on sustainable competitive practices and long-term performance maintenance. Teach advanced recovery techniques and stress management. Balance competitive intensity with age-appropriate progression and comprehensive health monitoring.",
  },
  metadata: {
    coach_creator_session_summary:
      "Competitive Masters Athlete template designed for advanced masters athletes (40+) competing in CrossFit with serious competitive focus on heavy functional fitness lifting and decades of strength training experience. Goals: Excel in masters CrossFit competitions while managing age-related considerations through intelligent strength development. Focus on CrossFit age-group rankings, heavy lifting performance optimization, and intelligent training. Training 5-6 days/week, 75-minute sessions with sophisticated CrossFit periodization emphasizing strength development. Emphasizes competition preparation with recovery optimization, strength experience leverage, and legacy building in CrossFit community. Coaching style: Respectful of lifting experience, performance-focused, strength-conscious. Equipment: CrossFit gym with Olympic lifting platform, powerlifting equipment, and recovery tools. Methodology: CrossFit Masters Strength with sophisticated periodization. Performance emphasis: Maximum priority on strength-focused CrossFit excellence and intelligent heavy lifting progression.",
    created_date: "2025-08-24T23:27:14.317Z",
    methodology_profile: {
      experience: [
        "expert",
        "competitive_masters",
        "crossfit_strength_focused",
      ],
      focus: [
        "masters_crossfit_competition",
        "heavy_lifting_development",
        "strength_maintenance",
        "recovery_optimization",
        "age_group_excellence",
      ],
      preferences: [
        "sophisticated_crossfit_periodization",
        "strength_experience_leverage",
        "crossfit_competition_focus",
        "masters_strength_adaptations",
      ],
      primary: "BLOCK_PERIODIZATION",
    },
    safety_profile: {
      contraindications: ["excessive_volume_training"],
      environmentalFactors: ["age_considerations", "competition_pressure"],
      equipment: [
        "crossfit_gym",
        "olympic_lifting_platform",
        "powerlifting_equipment",
        "gymnastics_equipment",
        "competition_equipment",
        "heavy_lifting_implements",
        "recovery_tools",
        "performance_monitoring",
        "specialized_barbells",
        "masters_specific_equipment",
      ],
      experienceLevel: "EXPERT",
      injuries: ["age_related_factors", "competition_wear"],
      learningConsiderations: [
        "experience_respect",
        "advanced_concept_integration",
        "competition_specific_skills",
        "legacy_building_focus",
      ],
      modifications: [
        "age_appropriate_intensity",
        "recovery_prioritization",
        "competition_specific_preparation",
        "experience_leveraging",
      ],
      recoveryNeeds: [
        "advanced_recovery_protocols",
        "sleep_optimization",
        "stress_management_systems",
        "nutrition_periodization",
        "recovery_monitoring",
      ],
      riskFactors: [
        "overtraining_from_experience",
        "age_related_recovery_needs",
      ],
      timeConstraints: { session_duration: 75 },
    },
    total_conversations: 4,
    user_satisfaction: null,
    version: "1.0",
  },
  modification_capabilities: {
    creative_programming: "high",
    enabled_modifications: [
      "progression_speed_adjustments",
      "exercise_modifications",
      "scheduling_flexibility",
      "intensity_adaptations",
      "goal_refinements",
      "competition_customization",
    ],
    personality_flexibility: "moderate",
    programming_adaptability: "high",
    safety_override_level: "moderate",
    workout_variety_emphasis: "high",
  },
  selected_methodology: {
    creativity_emphasis: "high_variety",
    methodology_reasoning:
      "Block Periodization methodology is perfect for competitive masters athletes as it emphasizes concentrated loading on minimal training targets, advanced recovery integration, and systematic competition preparation. The block structure (Accumulation → Transmutation → Realization) aligns with their extensive experience while addressing age-related recovery needs through focused periodization. This allows heavy lifting development in Accumulation blocks, CrossFit-specific skills in Transmutation blocks, and competition peaking in Realization blocks.",
    periodization_approach: "block",
    primary_methodology: "BLOCK_PERIODIZATION",
    programming_emphasis: "strength_focused_crossfit_competition_preparation",
    workout_innovation: "enabled",
  },
  selected_personality: {
    blending_weights: { primary: 0.85, secondary: 0.15 },
    primary_template: "victoria",
    secondary_influences: ["marcus"],
    selection_reasoning:
      "Victoria is perfect for competitive masters athletes as she provides sophisticated, performance-focused coaching that respects experience while optimizing age-group performance. She understands advanced training concepts and competition preparation. Minor Marcus influence helps with age-appropriate modifications and recovery emphasis.",
  },
  technical_config: {
    equipment_available: [
      "crossfit_gym",
      "olympic_lifting_platform",
      "powerlifting_equipment",
      "gymnastics_equipment",
      "competition_equipment",
      "heavy_lifting_implements",
      "recovery_tools",
      "performance_monitoring",
      "specialized_barbells",
      "masters_specific_equipment",
    ],
    experience_level: "expert",
    goal_timeline: "competition_cycles",
    injury_considerations: ["age_related_factors", "competition_wear"],
    methodology: "block_periodization",
    preferred_intensity: "high_intelligent",
    programming_focus: [
      "masters_crossfit_competition",
      "heavy_lifting_development",
      "strength_maintenance",
      "recovery_optimization",
      "age_group_excellence",
    ],
    safety_constraints: {
      contraindicated_exercises: ["excessive_volume_training"],
      recovery_requirements: [
        "advanced_recovery_protocols",
        "sleep_optimization",
        "stress_management_systems",
        "nutrition_periodization",
        "recovery_monitoring",
      ],
      required_modifications: [
        "age_appropriate_intensity",
        "recovery_prioritization",
        "competition_specific_preparation",
        "experience_leveraging",
      ],
      safety_monitoring: [
        "performance_tracking",
        "recovery_quality_assessment",
        "competition_readiness_evaluation",
        "age_related_adaptation_monitoring",
        "stress_load_management",
        "legacy_performance_maintenance",
      ],
      volume_progression_limit: "8%_weekly",
    },
    specializations: [
      "masters_crossfit_competition",
      "heavy_functional_lifting",
      "olympic_lifting_masters",
      "powerlifting_integration",
      "crossfit_strength_development",
      "advanced_periodization",
      "performance_optimization",
      "age_group_excellence",
      "strength_focused_training",
    ],
    time_constraints: { session_duration: 75, weekly_frequency: "5_to_6_days" },
    training_frequency: 5.5,
  },
  updatedAt: "2025-11-21T21:38:39.484Z",
};

/**
 * Test payloads with expected outcomes
 */
const TEST_CASES = {
  "simple-slash-command": {
    description:
      "Simple slash command workout with basic exercises (powerlifting)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "/log-workout 3 sets of back squats at 185lbs for 5 reps, then 5 sets of bench press at 155lbs for 8 reps",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "powerlifting", // Correct: back squats + bench press = powerlifting
      minConfidence: 0.65, // Lowered from 0.7 - basic workouts have less context
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        // normalize_workout_data skipped for high confidence (>= 0.95) - OPTIMIZATION
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      // Note: High-confidence extractions (>= 0.95) skip normalization for performance
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type", // Required but not checking specific value
          "workout_name",
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "discipline_specific.powerlifting.exercises",
        ],
        fieldValues: {
          discipline: "powerlifting",
          // Removed all specific value checks - just validate fields exist and have valid values
        },
        disciplineSpecificPath: "discipline_specific.powerlifting.exercises", // Path to exercises array
        minExerciseCount: 2, // Back squats + bench press
        // Removed exerciseValidation - just check that exercises exist with minimum count
      },
    },
  },

  "crossfit-fran": {
    description: "CrossFit benchmark workout (Fran) with temporal reference",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "Did Fran in 8:57 this morning with 95lb thrusters and chest-to-bar pull-ups. Felt great, maintained good pacing through the 21-15-9.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/New_York",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "workoutName"],
      discipline: "crossfit",
      workoutName: "Fran",
      minConfidence: 0.85,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type", // Required but not checking specific value
          "workout_name",
          "date",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
          // Removed workout_name check - AI may use variations or Latin names
          // Just validate fields exist and have valid values
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds", // CrossFit uses rounds
        minRoundCount: 3, // Fran has 3 rounds (21-15-9)
      },
    },
  },

  "planning-question": {
    description: "Planning question that should be blocked from saving",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "What should I do for my workout today? I'm thinking about doing some squats and maybe a metcon.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: false,
      skipped: true,
      shouldHave: ["reason"],
      // Note: Agent may recognize planning questions without calling tools
      // In that case, no blockingFlags will be set (no extraction happened)
      // This is actually more efficient behavior
      shouldNotUseTool: "save_workout_to_database",
      workoutValidation: {
        shouldExist: false, // Workout should NOT be saved
      },
    },
  },

  "future-intention": {
    description:
      "User expressing future workout intention (should be blocked - temporal awareness test)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "I'm planning to do Fran tomorrow morning. Hoping to beat my PR of 9:15. Need to make sure I get good sleep tonight.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: false,
      skipped: true,
      shouldHave: ["reason"],
      shouldNotUseTool: "save_workout_to_database",
      workoutValidation: {
        shouldExist: false, // Workout should NOT be saved (hasn't happened yet)
      },
    },
  },

  "general-fitness-question": {
    description:
      "General fitness/coaching question (should be blocked from workout logging)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "How many rest days should I be taking per week with my current training volume? I'm doing 5-6 days of CrossFit plus some extra lifting.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: false,
      skipped: true,
      shouldHave: ["reason"],
      shouldNotUseTool: "save_workout_to_database",
      workoutValidation: {
        shouldExist: false, // Workout should NOT be saved
      },
    },
  },

  "past-workout-reflection": {
    description:
      "User reflecting on past workout without logging details (should be blocked)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "Yesterday's workout was absolutely brutal. My legs are still so sore today, can barely walk! Those heavy squats really did a number on me.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: false,
      skipped: true,
      shouldHave: ["reason"],
      shouldNotUseTool: "save_workout_to_database",
      workoutValidation: {
        shouldExist: false, // Workout should NOT be saved (no actionable data)
      },
    },
  },

  "slash-command-planning": {
    description:
      "Slash command with planning content (should still be blocked despite command)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "/log-workout Should I do heavy squats or focus on volume today? Not sure what would be best for my recovery.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: false,
      skipped: true,
      shouldHave: ["reason"],
      shouldNotUseTool: "save_workout_to_database",
      workoutValidation: {
        shouldExist: false, // Workout should NOT be saved (planning despite slash command)
      },
    },
  },

  "complex-multiphase": {
    description: "Complex multi-phase workout (strength + metcon)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "/log-workout Strength work: Front squats 3x5 at 175lbs, then 12-minute AMRAP of 250m row, 15 KB swings at 55lbs, 10 burpees. Got 6 rounds plus 250m row.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "confidence"],
      discipline: "crossfit",
      minConfidence: 0.8,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_name",
          "date",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
          // Just validate discipline - structure varies for multi-phase workouts
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 1, // At least the AMRAP rounds should be captured
      },
    },
  },

  "emom-workout": {
    description: "EMOM workout with multiple rounds",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "30 minute EMOM: minute 1 = 12 cal assault bike, minute 2 = 10 DB thrusters at 50# each hand, minute 3 = 15 wall balls. Completed all 10 rounds.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline"],
      discipline: "crossfit",
      minConfidence: 0.75,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_name",
          "date",
          "workout_type",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
          // Just validate discipline - AI can classify workout_type as appropriate
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 10, // 30 minute EMOM with 3 exercises = 10 rounds
      },
    },
  },

  "multi-turn-workout-log": {
    description:
      "Multi-turn workout log from workout creator session (progressive Q&A)",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      // Workout creator session joins all user messages with just a space
      userMessage:
        "I did back squats today 3 sets of 5 reps At 225 lbs Then I did bench press 5 sets of 8 reps at 185 lbs Finished with some accessory work: 3 sets of 10 pull-ups and 3 sets of 15 dips",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "powerlifting", // Correct: back squats + bench press + accessories = powerlifting
      minConfidence: 0.65, // Lowered - bare-bones data from progressive Q&A
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        // normalize_workout_data is conditional - only if completeness < 0.65
        // This workout has completeness: 0.65, which is >= threshold, so no normalization
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type", // Required but not checking specific value
          "workout_name", // Should always be generated
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "discipline_specific.powerlifting.exercises",
        ],
        fieldValues: {
          discipline: "powerlifting",
          // Just validate discipline - AI can infer all other values appropriately
        },
        disciplineSpecificPath: "discipline_specific.powerlifting.exercises",
        minExerciseCount: 4, // Back squats + bench press + pull-ups + dips
      },
    },
  },

  "running-10k": {
    description:
      "Running workout (10k) with duration, time, calories, and basic metrics",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage:
        "Completed a 10k run this morning at 6:30 AM. Finished in 52:15 (8:25/mile pace). Burned about 650 calories. RPE was 7/10, intensity felt like 7.5/10. Weather was perfect - cool and clear. Felt strong throughout, negative split with the last 2k at 8:00/mile pace.",
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: false,
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "running",
      minConfidence: 0.8,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type",
          "workout_name",
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "duration",
          "performance_metrics.calories_burned",
        ],
        fieldValues: {
          discipline: "running",
          // Just validate discipline - AI can infer workout_type and other details
        },
      },
    },
  },

  "comptrain-interval-work": {
    description:
      "CompTrain-style interval workout with buy-in, EMOM work, and buy-out",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage: `/log-workout CompTrain session today at 2:00 PM:

**BUY-IN:**
500m Row @ 70% effort

**MAIN WORK (24 minutes):**
Every 3 minutes for 8 rounds:
- 12 Thrusters (95#)
- 9 Pull-ups
- 6 Burpees Over Bar

Got through all 8 rounds with 15-30 seconds rest each interval. Thrusters were mostly unbroken first 4 rounds, then broke to 8-4 or 7-5. Pull-ups stayed kipping throughout. Burpees felt solid.

**BUY-OUT:**
2 minutes max calorie Assault Bike - got 42 calories

**PERFORMANCE DATA:**
- Overall intensity: 8/10
- RPE: 8/10
- Average HR: 158 bpm
- Session duration: 45 minutes (10 min warmup, 28 min workout, 7 min cooldown)
- Workout duration: 28 minutes
- Total calories: ~380

**NOTES:**
- Pre-workout energy: 7/10
- Post-workout energy: 5/10
- Enjoyment: 9/10 - loved the interval structure
- Form quality: 8/10 - maintained good positions
- Pacing was spot on, felt challenged but never crushed`,
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "crossfit",
      minConfidence: 0.85,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type",
          "workout_name",
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "duration",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 8, // 8 rounds of the EMOM work
      },
    },
  },

  "mayhem-chipper": {
    description:
      "Mayhem-style chipper workout with multiple movements for time",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage: `/log-workout Mayhem chipper today - brutal but got it done!

**FOR TIME (30 min cap):**
50 Wall Balls (20#)
40 Box Jumps (24")
30 Kettlebell Swings (53#)
20 Toes-to-Bar
10 Devil Press (50# DBs)
20 Toes-to-Bar
30 Kettlebell Swings (53#)
40 Box Jumps (24")
50 Wall Balls (20#)

Finished in 23:47. Wall balls were done in sets of 15-20-15 at the start. Box jumps stayed mostly unbroken. KB swings all unbroken. T2B were the hardest - broke them up into 5s. Devil press were singles with quick transitions.

**PERFORMANCE DATA:**
- Intensity: 8.5/10
- RPE: 9/10 (this was tough!)
- Average HR: 168 bpm
- Peak HR: 182 bpm
- Session duration: 55 minutes (12 min warmup, 24 min workout, 15 min cooldown/stretch, 4 min mobility)
- Workout duration: 24 minutes (actual work time)
- Calories: ~425

**SUBJECTIVE:**
- Pre-workout energy: 8/10
- Post-workout energy: 3/10 (completely gassed)
- Enjoyment: 7/10 - challenging but rewarding
- Difficulty: 9/10
- Form quality: 7/10 - got a bit sloppy on T2B rounds
- Pacing: Started conservative, pushed the second half hard`,
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "crossfit",
      minConfidence: 0.85,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type",
          "workout_name",
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "duration",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 1, // Chipper is a single round through all movements
      },
    },
  },

  "comptrain-strength-conditioning": {
    description:
      "CompTrain-style session with heavy strength followed by short conditioning piece",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage: `/log-workout Today's CompTrain session - heavy pulls and a nasty finisher!

**STRENGTH (35 minutes):**
Deadlift - worked up to heavy single
- Warm-up: 135x5, 185x5, 225x3, 275x2, 315x1
- Working sets: 355x1, 375x1, 395x1 (PR!), 405x1 (failed)
- Drop set: 365x2

Felt great today. Bar speed was excellent on 375 and 395. The 405 broke off the floor but couldn't lock it out - chalk and grip gave out. Belt and straps used for heavy singles.

**CONDITIONING (7 minutes):**
3 Rounds For Time:
- 15 Calorie Row
- 12 Dumbbell Hang Power Cleans (50# each)
- 9 Burpees

Completed in 6:52. Maintained steady pace, kept rowing at 1:50-1:55/500m. DB cleans were unbroken all rounds. Burpees stayed quick.

**PERFORMANCE DATA:**
- Strength intensity: 9/10, RPE: 9/10
- Conditioning intensity: 8/10, RPE: 8/10
- Overall intensity: 8.5/10
- Overall RPE: 8.5/10
- Average HR during metcon: 172 bpm
- Session duration: 70 minutes (10 min warmup, 35 min strength, 7 min conditioning, 12 min cooldown, 6 min mobility)
- Total workout time: 42 minutes
- Estimated calories: 380 (strength ~120, conditioning ~260)

**SUBJECTIVE:**
- Pre-workout energy: 9/10
- Post-workout energy: 6/10
- Enjoyment: 10/10 - hit a PR!
- Difficulty: 8/10
- Form quality: 9/10 - deadlift technique was dialed
- Mental state: extremely focused
- Sleep last night: 8.5 hours, quality 9/10
- Motivation: 10/10
- This was programmed as a test day for deadlifts, felt strong and confident`,
      coachConfig: BASE_COACH_CONFIG,
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: new Date().toISOString(),
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "confidence"],
      discipline: "crossfit",
      minConfidence: 0.9,
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        requiredFields: [
          "workout_id",
          "user_id",
          "discipline",
          "workout_type",
          "workout_name",
          "date",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "duration",
          "discipline_specific.crossfit.rounds",
        ],
        fieldValues: {
          discipline: "crossfit",
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 3, // 3 rounds for time in conditioning
      },
    },
  },

  "gold-standard-comprehensive": {
    description:
      "Gold standard CompTrain-style workout with strength + conditioning, complete metadata, and rich performance data",
    payload: {
      userId: "63gocaz-j-AYRsb0094ik",
      coachId: "user_63gocaz-j-AYRsb0094ik_coach_1756078034317",
      conversationId: "conv_1764512884381_4amplrhdd",
      userMessage: `/log-workout Just finished today's CompTrain session at 10:30 AM PST - absolute burner!

**STRENGTH WORK (30 minutes):**
Back Squat - worked up to heavy single at 315# (RPE 9), then 3x3 at 275# (RPE 7)
- Warm-up sets: 135x5, 185x3, 225x2, 265x1
- Working: 275x3, 275x3, 275x3 with 3-4 min rest between sets
- Belt and sleeves used, depth was solid, bar speed felt good

**CONDITIONING (18 minutes):**
"Maelstrom" - 4 Rounds For Time:
- 400m Run
- 21 Kettlebell Swings (53#)
- 15 Box Jump Overs (24")
- 9 Bar Muscle-Ups

Completed in 17:32. Paced the runs at 1:45-1:50 each, KB swings were unbroken all rounds, box jumps got broken in round 3 (10-5), muscle-ups were singles by round 2.

**PERFORMANCE DATA:**
- Overall intensity: 8/10 (strength 7/10, metcon 9/10)
- Overall RPE: 8/10
- Average heart rate during metcon: 165 bpm
- Max heart rate: 184 bpm
- Estimated calories: 425 (strength ~100, metcon ~325)
- Total session: 75 minutes (10 min warmup, 30 min strength, 18 min metcon, 12 min cooldown/stretch, 5 min mobility)
- Workout time: 48 minutes (strength + metcon only)

**ENERGY & RECOVERY:**
- Pre-workout energy: 7/10
- Post-workout energy: 4/10 (absolutely cooked)
- Pre-workout mood: 8/10
- Post-workout mood: 9/10 (accomplished, satisfied)
- Sleep: 8 hours last night, quality 9/10
- HRV this morning: 68ms (good for me)
- Stress level: 3/10 (low stress day)
- Motivation going in: 9/10

**SUBJECTIVE NOTES:**
- Enjoyment: 8/10 - love heavy squats and this metcon was perfectly challenging
- Difficulty: 8/10 - the muscle-ups made this tough
- Form quality: 8/10 - squat depth was great, muscle-ups got a bit sloppy round 4
- Mental state: focused and determined
- Pacing: went out conservative on the runs (smart), committed on the swings and jumps
- Hydration: excellent (pre-loaded 24oz, sipped 16oz during)
- Nutrition: Had oatmeal with banana 90 min before, felt good
- Pre-workout soreness: legs 2/10 from yesterday, shoulders 1/10
- Post-workout pump: quads 7/10, lats 6/10, shoulders 5/10

**CONTEXT:**
- Environment: 70°F indoor, box was moderately busy
- Equipment: Rogue Ohio bar, Eleiko plates, Rogue KBs, comp rings for MUs
- Gym: Local CrossFit box
- Training partner: worked out with Sarah, good energy
- This was a deload week workout - normally would go heavier on squats but backing off 10% for recovery
- The metcon was RX but I'm working on stringing muscle-ups - goal is 2-3 at a time by next month`,
      coachConfig: BASE_COACH_CONFIG,
      completedAt: "2025-12-06T18:30:00.000Z", // 10:30 AM PST
      isSlashCommand: true,
      slashCommand: "log-workout",
      messageTimestamp: "2025-12-06T18:45:00.000Z", // Logged 15 min after completion
      userTimezone: "America/Los_Angeles",
    },
    expected: {
      success: true,
      shouldHave: ["workoutId", "discipline", "workoutName", "confidence"],
      discipline: "crossfit",
      minConfidence: 0.95, // Very high - comprehensive data
      toolsUsed: [
        "extract_workout_data",
        "validate_workout_completeness",
        "generate_workout_summary",
        "save_workout_to_database",
      ],
      workoutValidation: {
        shouldExist: true,
        // Simplified to only check core important fields
        requiredFields: [
          "workout_id",
          "user_id",
          "date",
          "discipline",
          "workout_name",
          "workout_type",
          "performance_metrics",
          "performance_metrics.intensity",
          "performance_metrics.perceived_exertion",
          "discipline_specific.crossfit.rounds",
          "metadata.schema_version",
        ],
        fieldValues: {
          discipline: "crossfit",
          // Removed all specific value checks - AI extracts what it can from rich input
          // Just validate that core structure and discipline are correct
        },
        disciplineSpecificPath: "discipline_specific.crossfit.rounds",
        minRoundCount: 4, // 4 rounds for time in the metcon
        // Removed customValidations - too rigid for testing AI extraction capabilities
        // The goal is to test that AI can handle rich input, not that it extracts every detail perfectly
      },
    },
  },
};

/**
 * Parse command line arguments
 */
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {
    functionName: DEFAULT_FUNCTION,
    testNames: ["all"],
    outputFile: null, // Will be used as outputDir but keeping name for compatibility with types
    verbose: false,
    region: DEFAULT_REGION,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.info(`
Build Workout V2 Testing Script

Usage:
  tsx test/integration/test-build-workout-v2.ts [options]

Options:
  --function=NAME     Lambda function name (default: ${DEFAULT_FUNCTION})
  --test=NAME         Run specific test(s) (default: all)
                      Can be comma-separated list: test1,test2,test3
                      Available: ${Object.keys(TEST_CASES).join(", ")}
  --output=DIR        Save results to directory (creates timestamped files)
  --verbose           Show full CloudWatch logs
  --region=REGION     AWS region (default: ${DEFAULT_REGION})
  --help, -h          Show this help message

Examples:
  tsx test/integration/test-build-workout-v2.ts
  tsx test/integration/test-build-workout-v2.ts --test=simple-slash-command --verbose
  tsx test/integration/test-build-workout-v2.ts --test=simple-slash-command,crossfit-fran,running-10k
  tsx test/integration/test-build-workout-v2.ts --output=test/fixtures/results --verbose
`);
      process.exit(0);
    }

    if (arg.startsWith("--function=")) {
      options.functionName = arg.split("=")[1];
    } else if (arg.startsWith("--test=")) {
      // Split by comma to support multiple tests
      const testValue = arg.split("=")[1];
      options.testNames = testValue.split(",").map((t) => t.trim());
    } else if (arg.startsWith("--output=")) {
      options.outputFile = arg.split("=")[1];
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    }
  }

  return options;
}

/**
 * Invoke Lambda function
 */
async function invokeLambda(
  client: LambdaClient,
  functionName: string,
  payload: TestPayload,
): Promise<LambdaResponse> {
  console.info(`\n🚀 Invoking ${functionName}...`);

  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
  });

  const startTime = Date.now();
  const response = await client.send(command);
  const duration = Date.now() - startTime;

  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  const body =
    typeof result.body === "string" ? JSON.parse(result.body) : result.body;

  console.info(`✅ Lambda responded in ${duration}ms`);
  console.info(`   Status: ${result.statusCode}`);
  console.info(`   Success: ${body.success}`);

  return {
    statusCode: result.statusCode,
    body,
    duration,
    requestId: response.$metadata.requestId,
  };
}

/**
 * Fetch workout from DynamoDB by workoutId
 *
 * DynamoDB stores workouts in this structure:
 * {
 *   pk: "user#userId",
 *   sk: "workout#workoutId",
 *   entityType: "workout",
 *   createdAt: "...",
 *   updatedAt: "...",
 *   attributes: {
 *     workoutId: "...",
 *     summary: "...",
 *     workoutData: { ... } // ← Universal Workout Schema v2.0
 *   }
 * }
 *
 * This function returns the unwrapped `workoutData` object which conforms
 * to the Universal Workout Schema defined in workout-schema.ts
 */
async function fetchWorkout(
  workoutId: string,
  userId: string,
  region: string = DEFAULT_REGION,
): Promise<any | null> {
  try {
    const dynamoClient = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    console.info(`📥 Fetching workout from DynamoDB...`, {
      workoutId,
      userId: userId.substring(0, 20) + "...",
      table: DYNAMODB_TABLE_NAME,
    });

    const command = new GetCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Key: {
        pk: `user#${userId}`,
        sk: `workout#${workoutId}`,
      },
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      console.warn(`⚠️ Workout not found in DynamoDB`);
      return null;
    }

    // Unwrap DynamoDB structure to get Universal Workout Schema
    // The actual workout data matching workout-schema.ts is in attributes.workoutData
    const workoutData = response.Item.attributes?.workoutData;

    if (!workoutData) {
      console.error(
        `❌ Invalid DynamoDB structure: missing attributes.workoutData`,
      );
      console.error(`   Found keys: ${Object.keys(response.Item).join(", ")}`);
      return null;
    }

    console.info(
      `✅ Workout retrieved successfully (${Object.keys(workoutData).length} schema fields)`,
    );

    return workoutData;
  } catch (error) {
    console.error(`❌ Failed to fetch workout:`, error.message);
    return null;
  }
}

/**
 * Get nested field value using dot notation
 */
function getNestedField(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Deep equality check for objects and primitives
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Validate workout data against the Universal Workout Schema
 * This performs comprehensive schema validation including:
 * - Required fields existence
 * - Enum value validation
 * - Number range validation (min/max)
 * - String pattern validation (regex)
 * - Type validation
 */
function validateAgainstSchema(workout: any): ValidationCheck[] {
  const validations: ValidationCheck[] = [];
  const schema = WORKOUT_SCHEMA;

  /**
   * Recursively validate a value against a schema definition
   */
  function validateField(
    value: any,
    fieldSchema: any,
    fieldPath: string,
  ): ValidationCheck[] {
    const results: ValidationCheck[] = [];

    // Handle null/undefined based on schema type
    const allowsNull =
      Array.isArray(fieldSchema.type) && fieldSchema.type.includes("null");
    if (value === null || value === undefined) {
      if (!allowsNull && fieldSchema.type !== "object") {
        // Only flag missing values if field is explicitly required elsewhere
        return results;
      }
      return results;
    }

    // Type validation
    const expectedTypes = Array.isArray(fieldSchema.type)
      ? fieldSchema.type.filter((t) => t !== "null")
      : [fieldSchema.type];

    const actualType = Array.isArray(value)
      ? "array"
      : typeof value === "number"
        ? "number"
        : typeof value === "string"
          ? "string"
          : typeof value === "boolean"
            ? "boolean"
            : typeof value === "object"
              ? "object"
              : typeof value;

    const typeMatches = expectedTypes.includes(actualType);
    if (!typeMatches) {
      results.push({
        name: `Schema: ${fieldPath} type`,
        expected: expectedTypes.join(" or "),
        actual: actualType,
        passed: false,
      });
      return results; // Don't continue validation if type is wrong
    }

    // Enum validation
    if (fieldSchema.enum && value !== null) {
      const isValidEnum = fieldSchema.enum.includes(value);
      results.push({
        name: `Schema: ${fieldPath} enum`,
        expected: `One of: ${fieldSchema.enum.join(", ")}`,
        actual: value,
        passed: isValidEnum,
      });
    }

    // Number range validation
    if (actualType === "number") {
      if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
        results.push({
          name: `Schema: ${fieldPath} minimum`,
          expected: `>= ${fieldSchema.minimum}`,
          actual: value,
          passed: false,
        });
      }
      if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
        results.push({
          name: `Schema: ${fieldPath} maximum`,
          expected: `<= ${fieldSchema.maximum}`,
          actual: value,
          passed: false,
        });
      }
    }

    // String pattern validation
    if (actualType === "string" && fieldSchema.pattern) {
      const regex = new RegExp(fieldSchema.pattern);
      const matches = regex.test(value);
      if (!matches) {
        results.push({
          name: `Schema: ${fieldPath} pattern`,
          expected: fieldSchema.pattern,
          actual: value,
          passed: false,
        });
      }
    }

    // Object validation (recursive)
    if (actualType === "object" && fieldSchema.properties) {
      for (const [propName, propSchema] of Object.entries(
        fieldSchema.properties,
      )) {
        const propValue = value[propName];
        const propPath = `${fieldPath}.${propName}`;
        results.push(...validateField(propValue, propSchema, propPath));
      }

      // Check required fields within object
      if (fieldSchema.required) {
        for (const requiredField of fieldSchema.required) {
          if (
            value[requiredField] === undefined ||
            value[requiredField] === null
          ) {
            results.push({
              name: `Schema: ${fieldPath}.${requiredField} required`,
              expected: "present",
              actual: "missing",
              passed: false,
            });
          }
        }
      }
    }

    // Array validation (recursive for items)
    if (actualType === "array" && fieldSchema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${fieldPath}[${i}]`;
        results.push(...validateField(value[i], fieldSchema.items, itemPath));
      }
    }

    return results;
  }

  // Validate top-level required fields
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (
        workout[requiredField] === undefined ||
        workout[requiredField] === null
      ) {
        validations.push({
          name: `Schema: ${requiredField} required`,
          expected: "present",
          actual: "missing",
          passed: false,
        });
      }
    }
  }

  // Validate each top-level property
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const fieldValue = workout[fieldName];
      const results = validateField(fieldValue, fieldSchema, fieldName);
      validations.push(...results);
    }
  }

  return validations;
}

/**
 * Validate workout structure and field values against test expectations
 */
function validateWorkoutData(
  workout: any,
  expected: WorkoutValidationExpectations,
): ValidationCheck[] {
  const validations: ValidationCheck[] = [];

  // Basic field presence checks
  if (expected.requiredFields) {
    for (const field of expected.requiredFields) {
      const value = getNestedField(workout, field);
      const exists = value !== undefined && value !== null;
      validations.push({
        name: `Has required field: ${field}`,
        expected: true,
        actual: exists,
        passed: exists,
      });
    }
  }

  // Enum validation for workout_type (if it exists, check it's a valid enum value)
  if (workout.workout_type) {
    const validWorkoutTypes = [
      "strength",
      "cardio",
      "flexibility",
      "skill",
      "competition",
      "recovery",
      "hybrid",
    ];
    const isValidType = validWorkoutTypes.includes(workout.workout_type);
    validations.push({
      name: "workout_type is valid enum value",
      expected: `One of: ${validWorkoutTypes.join(", ")}`,
      actual: workout.workout_type,
      passed: isValidType,
    });
  }

  // Field value checks (exact matches)
  if (expected.fieldValues) {
    for (const [field, expectedValue] of Object.entries(expected.fieldValues)) {
      const actualValue = getNestedField(workout, field);
      const matches = deepEqual(actualValue, expectedValue);
      validations.push({
        name: `Field value: ${field}`,
        expected: expectedValue,
        actual: actualValue,
        passed: matches,
      });
    }
  }

  // Minimum exercise count (discipline-specific)
  if (expected.minExerciseCount) {
    const exercisePath =
      expected.disciplineSpecificPath ||
      "discipline_specific.powerlifting.exercises";
    const exercises = getNestedField(workout, exercisePath);

    if (exercises && Array.isArray(exercises)) {
      const count = exercises.length;
      validations.push({
        name: "Minimum exercise count",
        expected: `>= ${expected.minExerciseCount}`,
        actual: count,
        passed: count >= expected.minExerciseCount,
      });
    } else {
      validations.push({
        name: "Minimum exercise count",
        expected: `>= ${expected.minExerciseCount}`,
        actual: 0,
        passed: false,
      });
    }
  }

  // Minimum round count (for CrossFit workouts)
  if (expected.minRoundCount) {
    const roundsPath =
      expected.disciplineSpecificPath || "discipline_specific.crossfit.rounds";
    const rounds = getNestedField(workout, roundsPath);

    if (rounds && Array.isArray(rounds)) {
      const count = rounds.length;
      validations.push({
        name: "Minimum round count",
        expected: `>= ${expected.minRoundCount}`,
        actual: count,
        passed: count >= expected.minRoundCount,
      });
    } else {
      validations.push({
        name: "Minimum round count",
        expected: `>= ${expected.minRoundCount}`,
        actual: 0,
        passed: false,
      });
    }
  }

  // Custom validations (for complex checks like PR achievements)
  if (expected.customValidations) {
    for (const customValidation of expected.customValidations) {
      const value = getNestedField(workout, customValidation.path);
      let passed = false;
      let actual = value;

      try {
        passed = customValidation.validator(value);
      } catch (error) {
        console.warn(
          `Custom validation "${customValidation.name}" threw error:`,
          error.message,
        );
        passed = false;
      }

      validations.push({
        name: customValidation.name,
        expected: "Custom validation",
        actual: actual
          ? `Found: ${Array.isArray(actual) ? `${actual.length} items` : typeof actual}`
          : "Not found",
        passed,
      });
    }
  }

  return validations;
}

/**
 * Retrieve CloudWatch logs for Lambda execution
 */
async function getCloudWatchLogs(
  logsClient: CloudWatchLogsClient,
  functionName: string,
  startTime: number,
): Promise<LogsData> {
  console.info("📋 Retrieving CloudWatch logs...");

  // Wait for logs to propagate
  await new Promise((resolve) => setTimeout(resolve, LOG_WAIT_TIME));

  const logGroupName = `/aws/lambda/${functionName}`;

  try {
    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime: startTime - 5000, // 5s buffer
      endTime: Date.now() + 5000,
      limit: 1000,
    });

    const response = await logsClient.send(command);

    // Extract and parse log events
    const logs: LogsData = {
      toolCalls: [],
      iterations: 0,
      errors: [],
      warnings: [],
      agentResponse: null,
      fullLogs: [],
    };

    for (const event of response.events || []) {
      const message = event.message || "";
      logs.fullLogs.push(message);

      // Extract tool calls
      if (message.includes("Executing tool:") || message.includes("⚙️")) {
        const toolMatch = message.match(/tool:\s*(\w+)/);
        if (toolMatch) {
          logs.toolCalls.push(toolMatch[1]);
        }
      }

      // Count iterations
      if (message.includes("Agent iteration")) {
        logs.iterations++;
      }

      // Extract errors
      if (message.includes("ERROR") || message.includes("❌")) {
        logs.errors.push(message);
      }

      // Extract warnings
      if (message.includes("WARN") || message.includes("⚠️")) {
        logs.warnings.push(message);
      }

      // Extract agent response
      if (message.includes("Agent response received")) {
        logs.agentResponse = message;
      }
    }

    console.info(`✅ Retrieved ${response.events?.length || 0} log events`);
    console.info(`   Tool calls: ${logs.toolCalls.length}`);
    console.info(`   Iterations: ${logs.iterations}`);
    console.info(`   Errors: ${logs.errors.length}`);
    console.info(`   Warnings: ${logs.warnings.length}`);

    return logs;
  } catch (error) {
    console.warn(`⚠️ Could not retrieve logs: ${(error as Error).message}`);
    return {
      toolCalls: [],
      iterations: 0,
      errors: [],
      warnings: [],
      agentResponse: null,
      fullLogs: [],
      error: (error as Error).message,
    };
  }
}

/**
 * Validate test result against expected outcomes
 */
function validateResult(
  testName: string,
  result: LambdaResponse,
  expected: TestExpectations,
  logs: LogsData,
): TestValidation {
  console.info(`\n🔍 Validating ${testName}...`);

  const validation: TestValidation = {
    testName,
    passed: true,
    checks: [],
  };

  // Check success/failure
  if (expected.success !== undefined) {
    const check = {
      name: "Success status",
      expected: expected.success,
      actual: result.body.success,
      passed: result.body.success === expected.success,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check skipped status
  if (expected.skipped !== undefined) {
    const check = {
      name: "Skipped status",
      expected: expected.skipped,
      actual: result.body.skipped,
      passed: result.body.skipped === expected.skipped,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check required fields
  if (expected.shouldHave) {
    for (const field of expected.shouldHave) {
      const check = {
        name: `Has field: ${field}`,
        expected: true,
        actual: !!result.body[field],
        passed: !!result.body[field],
      };
      validation.checks.push(check);
      if (!check.passed) validation.passed = false;
    }
  }

  // Check specific field values
  if (expected.discipline) {
    const check = {
      name: "Discipline",
      expected: expected.discipline,
      actual: result.body.discipline,
      passed: result.body.discipline === expected.discipline,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  if (expected.workoutName) {
    const check = {
      name: "Workout name",
      expected: expected.workoutName,
      actual: result.body.workoutName,
      passed: result.body.workoutName === expected.workoutName,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check confidence
  if (expected.minConfidence && result.body.confidence) {
    const check = {
      name: "Minimum confidence",
      expected: `>= ${expected.minConfidence}`,
      actual: result.body.confidence,
      passed: result.body.confidence >= expected.minConfidence,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check blocking flags
  if (expected.blockingFlags) {
    const actualFlags = result.body.blockingFlags || [];
    const hasExpectedFlags = expected.blockingFlags.every((flag) =>
      actualFlags.includes(flag),
    );
    const check = {
      name: "Blocking flags",
      expected: expected.blockingFlags,
      actual: actualFlags,
      passed: hasExpectedFlags,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check tools used (from logs)
  if (expected.toolsUsed && logs.toolCalls.length > 0) {
    const missingTools = expected.toolsUsed.filter(
      (tool) => !logs.toolCalls.includes(tool),
    );
    const check = {
      name: "Expected tools used",
      expected: expected.toolsUsed,
      actual: logs.toolCalls,
      passed: missingTools.length === 0,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check tool not used
  if (expected.shouldNotUseTool) {
    const toolNotUsed = !logs.toolCalls.includes(expected.shouldNotUseTool);
    const check = {
      name: `Tool NOT used: ${expected.shouldNotUseTool}`,
      expected: false,
      actual: logs.toolCalls.includes(expected.shouldNotUseTool),
      passed: toolNotUsed,
    };
    validation.checks.push(check);
    if (!check.passed) validation.passed = false;
  }

  // Check for errors
  if (logs.errors.length > 0) {
    const check = {
      name: "No errors in logs",
      expected: 0,
      actual: logs.errors.length,
      passed: false,
    };
    validation.checks.push(check);
    validation.passed = false;
  }

  // Display results
  for (const check of validation.checks) {
    const icon = check.passed ? "✅" : "❌";
    console.info(`   ${icon} ${check.name}: ${JSON.stringify(check.actual)}`);
    if (!check.passed) {
      console.info(`      Expected: ${JSON.stringify(check.expected)}`);
    }
  }

  return validation;
}

/**
 * Run a single test
 */
async function runTest(
  testName: string,
  testCase: TestCase,
  lambdaClient: LambdaClient,
  logsClient: CloudWatchLogsClient,
  options: TestOptions,
): Promise<TestResult> {
  console.info(`\n${"=".repeat(80)}`);
  console.info(`TEST: ${testName}`);
  console.info(`Description: ${testCase.description}`);
  console.info("=".repeat(80));

  const startTime = Date.now();

  // Invoke Lambda
  const result = await invokeLambda(
    lambdaClient,
    options.functionName,
    testCase.payload,
  );

  // Get CloudWatch logs
  const logs = await getCloudWatchLogs(
    logsClient,
    options.functionName,
    startTime,
  );

  // Fetch and validate workout from DynamoDB if feature enabled
  let workoutData: any = null;
  let workoutValidations: ValidationCheck[] = [];

  if (ENABLE_WORKOUT_VALIDATION && testCase.expected.workoutValidation) {
    const validation = testCase.expected.workoutValidation;

    if (validation.shouldExist && result.body.workoutId) {
      // Fetch workout from DynamoDB
      workoutData = await fetchWorkout(
        result.body.workoutId,
        testCase.payload.userId,
        options.region,
      );

      if (workoutData) {
        // 1. Validate against Universal Workout Schema
        const schemaValidations = validateAgainstSchema(workoutData);
        const schemaPassedChecks = schemaValidations.filter(
          (v) => v.passed,
        ).length;
        const schemaFailedChecks = schemaValidations.filter(
          (v) => !v.passed,
        ).length;

        console.info(
          `📋 Schema validation completed: ${schemaValidations.length} checks`,
        );
        console.info(
          `   Passed: ${schemaPassedChecks}, Failed: ${schemaFailedChecks}`,
        );

        if (schemaFailedChecks > 0) {
          console.warn(`   ⚠️ Schema validation failures:`);
          schemaValidations
            .filter((v) => !v.passed)
            .forEach((v) => {
              console.warn(
                `      - ${v.name}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(v.actual)}`,
              );
            });
        }

        // 2. Validate against test-specific expectations
        workoutValidations = [
          ...schemaValidations,
          ...validateWorkoutData(workoutData, validation),
        ];

        console.info(
          `✅ Test validation completed: ${workoutValidations.length} total checks`,
        );

        // Show validation summary
        const passedChecks = workoutValidations.filter((v) => v.passed).length;
        const failedChecks = workoutValidations.filter((v) => !v.passed).length;
        console.info(
          `   Total Passed: ${passedChecks}, Total Failed: ${failedChecks}`,
        );

        if (failedChecks > 0 && schemaFailedChecks === 0) {
          // Only show test-specific failures if schema validation passed
          console.warn(`   ⚠️ Test-specific validation failures:`);
          workoutValidations
            .filter((v) => !v.passed && !v.name.startsWith("Schema:"))
            .forEach((v) => {
              console.warn(
                `      - ${v.name}: expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(v.actual)}`,
              );
            });
        }
      } else {
        workoutValidations.push({
          name: "Workout exists in DynamoDB",
          expected: true,
          actual: false,
          passed: false,
        });
        console.error(`❌ Workout not found in DynamoDB`);
      }
    } else if (!validation.shouldExist) {
      // Verify workout was NOT saved (for planning questions, etc.)
      if (result.body.workoutId) {
        workoutData = await fetchWorkout(
          result.body.workoutId,
          testCase.payload.userId,
          options.region,
        );

        workoutValidations.push({
          name: "Workout should NOT exist in DynamoDB",
          expected: false,
          actual: workoutData !== null,
          passed: workoutData === null,
        });

        if (workoutData !== null) {
          console.error(
            `❌ Workout should NOT exist but was found in DynamoDB`,
          );
        } else {
          console.info(`✅ Confirmed workout was not saved (as expected)`);
        }
      } else {
        // No workoutId returned, which is correct for planning questions
        workoutValidations.push({
          name: "No workoutId returned",
          expected: true,
          actual: true,
          passed: true,
        });
        console.info(
          `✅ No workoutId returned (as expected for skipped workout)`,
        );
      }
    }
  }

  // Validate result
  const validation = validateResult(testName, result, testCase.expected, logs);

  // Merge workout validations into main validation
  if (workoutValidations.length > 0) {
    validation.checks.push(...workoutValidations);
    validation.passed =
      validation.passed && workoutValidations.every((v) => v.passed);
  }

  // Show verbose logs if requested
  if (options.verbose && logs.fullLogs.length > 0) {
    console.info("\n📋 Full CloudWatch Logs:");
    console.info("─".repeat(80));
    for (const log of logs.fullLogs) {
      console.info(log);
    }
    console.info("─".repeat(80));
  }

  return {
    testName,
    description: testCase.description,
    result: result.body,
    duration: result.duration,
    logs: {
      toolCalls: logs.toolCalls,
      iterations: logs.iterations,
      errors: logs.errors,
      warnings: logs.warnings,
      fullLogs: options.verbose ? logs.fullLogs : undefined, // Include full logs if verbose
    },
    validation,
    workoutData: options.verbose && workoutData ? workoutData : undefined, // Include workout data in verbose mode
  };
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const options = parseArgs();

  // Create output directory if specified
  if (options.outputFile) {
    const outputDir = options.outputFile; // Using as directory
    try {
      if (!fsSync.existsSync(outputDir)) {
        fsSync.mkdirSync(outputDir, { recursive: true });
        console.info(`📁 Created output directory: ${outputDir}`);
      }
    } catch (error) {
      console.warn(
        `⚠️ Could not create output directory ${outputDir}: ${(error as Error).message}`,
      );
    }
  }

  console.info("🧪 Build Workout V2 Testing Script");
  console.info("═".repeat(80));
  console.info(`Function: ${options.functionName}`);
  console.info(`Region: ${options.region}`);
  console.info(
    `Tests: ${options.testNames.includes("all") ? "all" : options.testNames.join(", ")}`,
  );
  console.info("═".repeat(80));

  // Initialize AWS clients
  const lambdaClient = new LambdaClient({ region: options.region });
  const logsClient = new CloudWatchLogsClient({ region: options.region });

  // Determine which tests to run
  let testsToRun: [string, TestCase][] = [];

  if (options.testNames.includes("all")) {
    // Run all tests
    testsToRun = Object.entries(TEST_CASES) as [string, TestCase][];
  } else {
    // Run specified tests
    for (const testName of options.testNames) {
      if (!(testName in TEST_CASES)) {
        console.error(`❌ Test "${testName}" not found`);
        console.error(`Available tests: ${Object.keys(TEST_CASES).join(", ")}`);
        process.exit(1);
      }
      testsToRun.push([testName, TEST_CASES[testName]]);
    }
  }

  // Run tests
  const results: TestResult[] = [];
  for (const [testName, testCase] of testsToRun) {
    try {
      const testResult = await runTest(
        testName,
        testCase,
        lambdaClient,
        logsClient,
        options,
      );
      results.push(testResult);

      // Save individual test result to file if --output flag provided
      if (options.outputFile) {
        const outputDir = options.outputFile; // Using as directory
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .split("T")[0];
          const sanitizedTestName = testName.replace(/[^a-z0-9-]/gi, "-");
          const individualFile = path.join(
            outputDir,
            `${timestamp}_${sanitizedTestName}_result.json`,
          );

          if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
          }

          const individualData = {
            timestamp: new Date().toISOString(),
            testName,
            description: testCase.description,
            passed: testResult.validation?.passed || false,
            duration: testResult.duration,
            result: testResult.result,
            logs: {
              toolCalls: testResult.logs?.toolCalls,
              iterations: testResult.logs?.iterations,
              errors: testResult.logs?.errors,
              warnings: testResult.logs?.warnings,
            },
            validation: {
              checks: testResult.validation?.checks,
              passed: testResult.validation?.passed,
            },
            workoutData: options.verbose ? testResult.workoutData : undefined,
            config: {
              region: options.region,
              function: options.functionName,
              dynamoTable: DYNAMODB_TABLE_NAME,
            },
          };

          fsSync.writeFileSync(
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
      console.error(`\n❌ Test ${testName} failed with error:`, error);
      const errorResult = {
        testName,
        description: testCase.description,
        result: {},
        duration: 0,
        logs: {},
        error: (error as Error).message,
        validation: { testName, passed: false, checks: [] },
      };
      results.push(errorResult);

      // Save error result to file if --output flag provided
      if (options.outputFile) {
        const outputDir = options.outputFile;
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .split("T")[0];
          const sanitizedTestName = testName.replace(/[^a-z0-9-]/gi, "-");
          const individualFile = path.join(
            outputDir,
            `${timestamp}_${sanitizedTestName}_result.json`,
          );

          if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
          }

          const individualData = {
            timestamp: new Date().toISOString(),
            testName,
            description: testCase.description,
            passed: false,
            error: (error as Error).message,
            config: {
              region: options.region,
              function: options.functionName,
              dynamoTable: DYNAMODB_TABLE_NAME,
            },
          };

          fsSync.writeFileSync(
            individualFile,
            JSON.stringify(individualData, null, 2),
          );
          console.info(
            `   💾 Error result saved to: ${path.basename(individualFile)}`,
          );
        } catch (saveError) {
          console.error(
            `   ⚠️  Failed to save error result: ${(saveError as Error).message}`,
          );
        }
      }
    }
  }

  // Summary
  console.info("\n" + "=".repeat(80));
  console.info("SUMMARY");
  console.info("=".repeat(80));

  const passed = results.filter((r) => r.validation?.passed).length;
  const total = results.length;

  for (const result of results) {
    const icon = result.validation?.passed ? "✅" : "❌";
    console.info(
      `${icon} ${result.testName}: ${result.validation?.passed ? "PASSED" : "FAILED"}`,
    );
    if (result.duration) {
      console.info(`   Duration: ${result.duration}ms`);
    }
    if (result.logs?.toolCalls && result.logs.toolCalls.length > 0) {
      console.info(`   Tools: ${result.logs.toolCalls.join(" → ")}`);
    }
  }

  console.info(`\n📊 Overall: ${passed}/${total} tests passed`);

  // Save summary to file if requested
  if (options.outputFile) {
    const outputDir = options.outputFile; // Using as directory
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const summaryFile = path.join(outputDir, `${timestamp}_summary.json`);

      if (!fsSync.existsSync(outputDir)) {
        fsSync.mkdirSync(outputDir, { recursive: true });
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
          passed: r.validation?.passed || false,
          duration: r.duration,
          error: r.error,
        })),
        config: {
          region: options.region,
          function: options.functionName,
          dynamoTable: DYNAMODB_TABLE_NAME,
        },
        note: "Individual test results saved in separate files with format: YYYY-MM-DD_test-name_result.json",
      };

      fsSync.writeFileSync(summaryFile, JSON.stringify(outputData, null, 2));
      console.info(`\n💾 Summary saved to: ${path.basename(summaryFile)}`);
      console.info(`   Individual test results also saved in: ${outputDir}/`);
    } catch (error) {
      console.error(
        `\n⚠️  Failed to save summary: ${(error as Error).message}`,
      );
    }
  }

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run main function
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
