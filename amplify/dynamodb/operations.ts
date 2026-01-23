/**
 * DynamoDB Operations - Barrel File
 *
 * This file re-exports all DynamoDB operations from their domain-specific modules.
 * All existing imports continue to work:
 *
 *   import { saveMemory, queryMemories } from "../dynamodb/operations";
 *
 * New direct imports also work:
 *
 *   import { saveMemory, queryMemories } from "../dynamodb/memory";
 *
 * Module organization:
 * - core.ts: Generic CRUD operations, client setup, helpers, types
 * - admin.ts: Admin queries (queryAllEntitiesByType, queryAllUsers)
 * - analytics.ts: Weekly and monthly analytics operations
 * - coach-config.ts: Coach configuration operations
 * - coach-conversation.ts: Conversation and summary operations
 * - coach-creator.ts: Coach creator session operations
 * - coach-template.ts: Coach template operations
 * - exercise.ts: Exercise operations and aggregation helpers
 * - memory.ts: User memory operations
 * - program.ts: Training program operations
 * - program-designer.ts: Program designer session operations
 * - shared-program.ts: Shared program operations
 * - subscription.ts: Subscription operations
 * - user-profile.ts: User profile operations
 * - workout.ts: Workout operations
 */

// Core operations, types, and utilities
export * from "./core";

// Admin operations
export * from "./admin";

// Analytics operations
export * from "./analytics";

// Coach config operations
export * from "./coach-config";

// Coach conversation operations
export * from "./coach-conversation";

// Coach creator operations
export * from "./coach-creator";

// Coach template operations
export * from "./coach-template";

// Exercise operations
export * from "./exercise";

// Memory operations
export * from "./memory";

// Program operations
export * from "./program";

// Program designer operations
export * from "./program-designer";

// Shared program operations
export * from "./shared-program";

// Subscription operations
export * from "./subscription";

// User profile operations
export * from "./user-profile";

// Workout operations
export * from "./workout";
