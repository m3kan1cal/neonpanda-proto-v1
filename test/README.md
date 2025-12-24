# Testing

This directory contains integration tests for the NeonPanda Proto V1 application.

## Directory Structure

```
test/
├── integration/          # Integration tests (Lambda, DynamoDB, S3, Bedrock)
│   └── test-build-workout.ts
├── fixtures/            # Test data, expected outputs, and test results
│   └── test-workouts-20251206/
└── unit/               # Unit tests (future)
```

## Integration Tests

### Build Workout V2 Test Suite

Comprehensive testing for the `build-workout` Lambda function.

**Features:**

- Lambda invocation and response validation
- CloudWatch log analysis (tool calls, errors, warnings)
- DynamoDB workout data validation (structure, fields, defaults)
- Performance metrics verification (intensity, RPE defaults)
- Exercise-level validation (sets, reps, weights)

**Usage:**

```bash
# Run all tests
AWS_PROFILE=midgard-sandbox tsx test/integration/test-build-workout.ts

# Run specific tests
AWS_PROFILE=midgard-sandbox tsx test/integration/test-build-workout.ts \
  --test=simple-slash-command,crossfit-fran

# Run with verbose output (includes full logs and workout data)
AWS_PROFILE=midgard-sandbox tsx test/integration/test-build-workout.ts \
  --verbose

# Save results to file
AWS_PROFILE=midgard-sandbox tsx test/integration/test-build-workout.ts \
  --output=test/fixtures/test-workouts-20251206/results.json \
  --verbose
```

**Environment Variables:**

```bash
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAME="NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"
export AWS_PROFILE="midgard-sandbox"
```

**Available Tests:**

- `simple-slash-command` - Basic powerlifting workout
- `crossfit-fran` - CrossFit benchmark workout
- `planning-question` - Should be blocked from saving
- `complex-multiphase` - Strength + metcon workout
- `emom-workout` - EMOM structure validation

## Fixtures

Test fixtures include:

- Expected test outputs
- Historical test results
- Sample workout data
- Test payloads

## Running Tests

### Prerequisites

1. AWS credentials configured (IAM permissions for Lambda, CloudWatch, DynamoDB)
2. Node.js 18+ installed
3. AWS SDK dependencies installed

### Quick Start

```bash
# Set up environment
export AWS_PROFILE="midgard-sandbox"
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAME="NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"

# Run all tests with full validation
tsx test/integration/test-build-workout.ts \
  --output=test/fixtures/test-workouts-$(date +%Y%m%d)/results.json \
  --verbose
```

## DynamoDB Structure

Workouts are stored in DynamoDB with this structure:

```javascript
{
  pk: "user#userId",
  sk: "workout#workoutId",
  entityType: "workout",
  createdAt: "2025-12-06T...",
  updatedAt: "2025-12-06T...",
  attributes: {
    workoutId: "workout_...",
    summary: "Workout summary...",
    completedAt: "2025-12-06T...",
    workoutData: {
      // ← Universal Workout Schema v2.0 (matches workout-schema.ts)
      workout_id: "workout_...",
      user_id: "63gocaz-j-AYRsb0094ik",
      date: "2025-12-06",
      discipline: "powerlifting" | "crossfit" | ...,
      workout_type: "strength" | "cardio" | ...,
      workout_name: "Fortis Fundamentum",
      performance_metrics: {
        intensity: 5,
        perceived_exertion: 5
      },
      discipline_specific: {
        powerlifting: {
          session_type: "repetition_method",
          exercises: [...]  // ← Powerlifting exercises here
        },
        crossfit: {
          workout_format: "for_time",
          rounds: [...]     // ← CrossFit rounds with exercises
        }
      },
      metadata: { ... }
    }
  }
}
```

The test script automatically unwraps `attributes.workoutData` so validations can be written against the Universal Workout Schema directly.

## Test Development

### Adding New Tests

1. Edit `test/integration/test-build-workout.ts`
2. Add test case to `TEST_CASES` object
3. Define `expected` validation rules
4. Add `workoutValidation` for DynamoDB checks (using schema paths)
5. Run test to verify

### Discipline-Specific Paths

Different disciplines store exercises in different locations:

- **Powerlifting**: `discipline_specific.powerlifting.exercises`
- **CrossFit**: `discipline_specific.crossfit.rounds` (each round has exercises)
- **Running**: `discipline_specific.running.segments`
- **HIIT**: `discipline_specific.hiit.intervals`

### Test Case Structure

```javascript
"test-name": {
  description: "Test description",
  payload: {
    userId: "...",
    coachId: "...",
    userMessage: "...",
    // ... other Lambda payload fields
  },
  expected: {
    success: true,
    shouldHave: ["workoutId", "discipline"],
    discipline: "powerlifting",
    minConfidence: 0.75,
    toolsUsed: [...],
    workoutValidation: {
      shouldExist: true,
      requiredFields: [
        "workout_id",
        "user_id",
        "discipline",
        "date",
        "performance_metrics.intensity",
        "discipline_specific.powerlifting.exercises" // Discipline-specific path
      ],
      fieldValues: {
        discipline: "powerlifting",
        workout_type: "strength"
      },
      validatePerformanceMetrics: true, // Check defaults (intensity=5, RPE=5)
      disciplineSpecificPath: "discipline_specific.powerlifting.exercises",
      minExerciseCount: 2,
      exerciseValidation: {
        0: {
          "exercise_name": "Back Squat",
          "sets.length": 3
        }
      }
    }
  }
}
```

**For CrossFit workouts** (rounds-based structure):

```javascript
workoutValidation: {
  shouldExist: true,
  requiredFields: [
    "workout_id",
    "discipline",
    "discipline_specific.crossfit.rounds"
  ],
  fieldValues: {
    discipline: "crossfit",
    workout_type: "strength"
  },
  disciplineSpecificPath: "discipline_specific.crossfit.rounds",
  minRoundCount: 3 // For 21-15-9 rep scheme
}
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Integration Tests
  env:
    AWS_REGION: us-west-2
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    DYNAMODB_TABLE_NAME: ${{ secrets.DYNAMODB_TABLE_NAME }}
  run: |
    tsx test/integration/test-build-workout.ts --output=test-results.json
```

## Troubleshooting

### Workout Not Found in DynamoDB

- Check Lambda executed successfully
- Verify DynamoDB table name is correct
- Ensure AWS credentials have read permissions
- Check if workout was actually saved (look for `save_workout_to_database` tool call)

### Permission Errors

- Verify IAM role has required permissions:
  - `lambda:InvokeFunction`
  - `logs:FilterLogEvents`
  - `dynamodb:GetItem`

### Test Failures

- Check CloudWatch logs for Lambda errors
- Verify test expectations match current behavior
- Review workout validation rules
- Check if schema has changed

## Future Enhancements

Planned additions:

- Unit tests for individual functions
- Pinecone vector search validation
- S3 workout file validation
- Program builder tests
- Coach conversation tests
- Performance benchmarking
