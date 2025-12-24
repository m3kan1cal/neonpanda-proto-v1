# Scripts

Utility scripts for managing and maintaining the NeonPanda application.

## Cleanup Scripts

### cleanup-test-workouts.js

Cleans up test workout data from the system by querying workouts from the past N weeks and deleting them.

**Authentication:**
This script invokes Lambda functions directly (bypassing API Gateway). The `get-workouts` and `delete-workout` handlers use `allowInternalCalls: true` in their `withAuth` middleware, enabling production-safe internal calls for admin operations.

**Usage:**

```bash
# Basic usage - dry run first to see what would be deleted
node scripts/cleanup-test-workouts.js <userId> --dry-run

# Delete workouts from the past 2 weeks (default)
node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik

# Delete workouts from the past 1 week
node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --weeks=1

# Auto-confirm deletion (skip prompt)
node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --auto-confirm

# Verbose mode (show detailed progress)
node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --verbose

# Specify Lambda function names explicitly
node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik \
  --get-workouts=amplify-neonpandaprotov1--getworkouts-abc123 \
  --delete-workout=amplify-neonpandaprotov1--deleteworkout-def456
```

**Options:**

- `--weeks=N` - Number of weeks to look back (default: 2)
- `--dry-run` - Show what would be deleted without actually deleting
- `--auto-confirm` - Skip confirmation prompt
- `--region=REGION` - AWS region (default: us-west-2)
- `--function-prefix=PREFIX` - Lambda function name prefix for auto-discovery
- `--get-workouts=NAME` - Full Lambda function name for get-workouts
- `--delete-workout=NAME` - Full Lambda function name for delete-workout
- `--verbose` - Show detailed progress and responses

**What it does:**

1. Queries all workouts for the specified user from the past N weeks
2. Displays a summary of workouts to be deleted
3. Asks for confirmation (unless `--auto-confirm` is used)
4. Deletes each workout using the delete-workout Lambda
5. Cleans up both DynamoDB and Pinecone data

**Safety features:**

- Dry-run mode to preview deletions
- User confirmation prompt
- Detailed error reporting
- Progress tracking

### cleanup-duplicate-memories.js

Finds and removes duplicate memory records in Pinecone where the same memory_id has multiple records.

**Usage:**

```bash
# Dry run to see what would be deleted
node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik --dry-run

# Actually delete duplicates
node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik

# Auto-confirm (skip prompt)
node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik --auto-confirm
```

**Environment variables:**

- `PINECONE_API_KEY` - Required for Pinecone operations

## Data Management Scripts

### seed-coach-templates.js

Seeds the database with predefined coach templates for different training styles and experience levels.

**Usage:**

```bash
node scripts/seed-coach-templates.js
```

### upsert-methodologies.js

Upserts training methodology documents into Pinecone for coach configuration and program design.

**Usage:**

```bash
node scripts/upsert-methodologies.js
```

**Environment variables:**

- `PINECONE_API_KEY` - Required for Pinecone operations

## Pinecone Management Scripts

### inspect-pinecone-namespace.js

Inspects and analyzes a Pinecone namespace, showing statistics and sample records.

**Usage:**

```bash
node scripts/inspect-pinecone-namespace.js <namespace>
```

**Environment variables:**

- `PINECONE_API_KEY` - Required

### migrate-pinecone-ids.js

Migrates Pinecone record IDs to a new format.

**Usage:**

```bash
node scripts/migrate-pinecone-ids.js
```

**Environment variables:**

- `PINECONE_API_KEY` - Required

### copy-pinecone-namespace.js

Copies records from one Pinecone namespace to another.

**Usage:**

```bash
node scripts/copy-pinecone-namespace.js <source-namespace> <target-namespace>
```

**Environment variables:**

- `PINECONE_API_KEY` - Required

## Common Patterns

All scripts follow these patterns:

1. **Help flag**: Use `--help` or `-h` to see usage information
2. **Dry run**: Most destructive operations support `--dry-run` for safety
3. **Confirmation prompts**: Destructive operations ask for confirmation unless `--auto-confirm` is used
4. **Error handling**: Scripts exit with code 0 on success, 1 on failure
5. **Verbose output**: Clear progress indicators and summary statistics
6. **AWS SDK**: Scripts use the latest AWS SDK v3 for Lambda and DynamoDB operations

## AWS Authentication

Scripts that interact with AWS services (Lambda, DynamoDB) require:

- AWS credentials configured via AWS CLI or environment variables
- Appropriate IAM permissions for the operations being performed
- Access to the correct AWS region (default: us-west-2)

**Setup AWS credentials:**

```bash
aws configure
# or
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-west-2
```

## Troubleshooting

**Lambda function not found:**

- Use `--function-prefix` to match your deployment's function naming
- Or specify exact function names with `--get-workouts` and `--delete-workout`
- Check AWS Console → Lambda to find exact function names

**Authentication errors:**

- Ensure AWS credentials are configured
- Check IAM permissions for lambda:InvokeFunction
- Verify you're using the correct region

**Pinecone errors:**

- Set `PINECONE_API_KEY` environment variable
- Verify the API key has access to the specified index
- Check that the namespace exists

## Development

When adding new scripts:

1. Follow the existing patterns for argument parsing and help text
2. Add `--dry-run` and `--auto-confirm` options for destructive operations
3. Use clear progress indicators and summary statistics
4. Add comprehensive error handling
5. Document the script in this README
6. Make the script executable: `chmod +x scripts/your-script.js`
