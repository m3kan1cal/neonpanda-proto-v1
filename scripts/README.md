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

### delete-user-dynamodb.js

Completely deletes all DynamoDB records for a user by removing all items with partition key `pk="user#${userId}"`. Useful for resetting a user's data to a clean state.

**Usage:**

```bash
# Dry run to see what would be deleted
node scripts/delete-user-dynamodb.js <userId> --table=MyTable --dry-run

# List record types before deletion
node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --list-types

# Delete all user records (with confirmation)
node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable

# Auto-confirm deletion (skip prompt)
node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --auto-confirm --verbose
```

**Options:**

- `--table=NAME` - DynamoDB table name (required, or set `DYNAMODB_TABLE_NAME` env var)
- `--region=REGION` - AWS region (default: us-west-2)
- `--dry-run` - Show what would be deleted without actually deleting
- `--auto-confirm` - Skip confirmation prompt
- `--verbose` - Show detailed progress and responses
- `--list-types` - List record types before deletion

**Environment variables:**

- `DYNAMODB_TABLE_NAME` - DynamoDB table name (alternative to --table flag)
- AWS credentials must be configured (via AWS CLI, environment variables, or IAM role)

**What it does:**

1. Queries all records for the user (pk="user#${userId}")
2. Groups records by `entityType` to show what will be deleted
3. Optionally lists record types with counts and sample sort keys
4. Displays summary of records to be deleted
5. Asks for confirmation (unless `--auto-confirm` is used)
6. Deletes all records for the user
7. Optionally verifies deletion by querying again

**Safety features:**

- Dry-run mode to preview deletions
- User confirmation prompt with record count
- Groups records by entity type for visibility
- Detailed error reporting
- Progress tracking
- Verification step (with --verbose)

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

### cleanup-test-namespaces.js

Deletes all namespaces from a Pinecone index that match a given prefix. Useful for bulk cleanup of test user data.

**Usage:**

```bash
# Dry run to see what would be deleted
node scripts/cleanup-test-namespaces.js --dry-run

# Delete namespaces with default prefix (user_test_)
node scripts/cleanup-test-namespaces.js

# Delete namespaces with custom prefix
node scripts/cleanup-test-namespaces.js --prefix=user_test_

# Specify custom index
node scripts/cleanup-test-namespaces.js --index=my-index --prefix=test_

# Auto-confirm (skip prompt) with verbose output
node scripts/cleanup-test-namespaces.js --auto-confirm --verbose
```

**Options:**

- `--index=NAME` - Pinecone index name (default: coach-creator-proto-v1-dev)
- `--prefix=PREFIX` - Namespace prefix to filter (default: user*test*)
- `--dry-run` - Show what would be deleted without actually deleting
- `--auto-confirm` - Skip confirmation prompt
- `--verbose` - Show detailed progress and responses

**Environment variables:**

- `PINECONE_API_KEY` - Required for Pinecone operations

**What it does:**

1. Lists all namespaces in the specified Pinecone index
2. Filters namespaces by the given prefix
3. Displays a summary of namespaces to be deleted with vector counts
4. Asks for confirmation (unless `--auto-confirm` is used)
5. Deletes all vectors in each matching namespace

**Safety features:**

- Dry-run mode to preview deletions
- User confirmation prompt with warning
- Detailed error reporting
- Progress tracking

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

### list-namespace-record-types.js

Lists all record types found in a Pinecone namespace, along with counts and sample record IDs for each type. Useful for understanding what data exists before resetting or cleaning a namespace.

**Usage:**

```bash
# List record types with default settings
node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik

# Show more sample IDs per type
node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik --samples=10

# Save results to JSON file
node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik --output=types.json

# Increase query limit for large namespaces
node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik --limit=2000
```

**Options:**

- `--index=NAME` - Pinecone index name (default: coach-creator-proto-v1-dev)
- `--limit=N` - Max records to fetch per query (default: 1000)
- `--samples=N` - Number of sample IDs to show per type (default: 5)
- `--output=FILE` - Save results to JSON file

**Environment variables:**

- `PINECONE_API_KEY` - Required

**What it does:**

1. Queries the namespace using multiple broad semantic searches to get comprehensive coverage
2. Groups records by `recordType` field
3. Displays counts, percentages, and sample IDs for each record type
4. Shows field names present in each record type
5. Optionally saves results to JSON for further analysis

**Note:** This script uses multiple semantic queries to try to capture all record types. For very large namespaces, you may need to increase the `--limit` parameter.

### delete-namespace.js

Completely deletes a Pinecone namespace by removing all records. In Pinecone, deleting all records effectively removes the namespace (empty namespaces don't exist). Useful for resetting a user namespace to a clean state.

**Usage:**

```bash
# Dry run to see what would be deleted
node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --dry-run

# List record types before deletion
node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --list-types

# Delete namespace (with confirmation)
node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik

# Auto-confirm deletion (skip prompt)
node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --auto-confirm --verbose
```

**Options:**

- `--index=NAME` - Pinecone index name (default: coach-creator-proto-v1-dev)
- `--dry-run` - Show what would be deleted without actually deleting
- `--auto-confirm` - Skip confirmation prompt
- `--verbose` - Show detailed progress and responses
- `--list-types` - List record types before deletion

**Environment variables:**

- `PINECONE_API_KEY` - Required

**What it does:**

1. Gets namespace statistics to show what will be deleted
2. Optionally lists record types (if `--list-types` is used)
3. Displays namespace information (record count, record types)
4. Asks for confirmation (unless `--auto-confirm` is used)
5. Deletes all records using `deleteAll()`
6. Verifies namespace is gone by checking stats

**Safety features:**

- Dry-run mode to preview deletion
- User confirmation prompt with record count
- Verification after deletion to ensure namespace is gone
- Detailed error reporting

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
