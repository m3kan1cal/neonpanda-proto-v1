/**
 * TypeScript Type Definitions for Build Workout V2 Testing
 *
 * Centralized type definitions for test configuration, validation,
 * and result structures used across the testing suite.
 */

/**
 * Command line options for the test script
 */
export interface TestOptions {
  functionName: string;
  testNames: string[];
  outputFile: string | null;
  verbose: boolean;
  region: string;
}

/**
 * Individual validation check result
 */
export interface ValidationCheck {
  name: string;
  expected: any;
  actual: any;
  passed: boolean;
}

/**
 * Test validation summary
 */
export interface TestValidation {
  testName: string;
  passed: boolean;
  checks: ValidationCheck[];
}

/**
 * CloudWatch logs data structure
 */
export interface LogsData {
  toolCalls: string[];
  iterations: number;
  errors: string[];
  warnings: string[];
  agentResponse: string | null;
  fullLogs: string[];
  error?: string;
}

/**
 * Lambda invocation response structure
 */
export interface LambdaResponse {
  statusCode: number;
  body: {
    success: boolean;
    workoutId?: string;
    discipline?: string;
    workoutName?: string;
    confidence?: number;
    completeness?: number;
    skipped?: boolean;
    reason?: string;
    blockingFlags?: string[];
    [key: string]: any;
  };
  duration: number;
  requestId?: string;
}

/**
 * Workout validation expectations for DynamoDB checks
 */
export interface WorkoutValidationExpectations {
  shouldExist: boolean;
  requiredFields?: string[];
  fieldValues?: Record<string, any>;
  validatePerformanceMetrics?: boolean;
  disciplineSpecificPath?: string;
  minExerciseCount?: number;
  minRoundCount?: number;
  customValidations?: Array<{
    name: string;
    path: string;
    validator: (value: any) => boolean;
  }>;
}

/**
 * Test expectations structure
 */
export interface TestExpectations {
  success?: boolean;
  skipped?: boolean;
  shouldHave?: string[];
  discipline?: string;
  workoutName?: string;
  minConfidence?: number;
  blockingFlags?: string[];
  toolsUsed?: string[];
  shouldNotUseTool?: string;
  workoutValidation?: WorkoutValidationExpectations;
}

/**
 * Lambda payload structure for test invocation
 */
export interface TestPayload {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  coachConfig: any;
  isSlashCommand?: boolean;
  slashCommand?: string;
  messageTimestamp: string;
  userTimezone: string;
  completedAt?: string;
  imageS3Keys?: string[];
  templateContext?: any;
}

/**
 * Complete test case definition
 */
export interface TestCase {
  description: string;
  payload: TestPayload;
  expected: TestExpectations;
}

/**
 * Test execution result
 */
export interface TestResult {
  testName: string;
  description: string;
  result: any;
  duration: number;
  logs: Partial<LogsData>;
  validation: TestValidation;
  workoutData?: any;
  error?: string;
}
