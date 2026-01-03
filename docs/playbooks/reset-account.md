# Reset user account to clean state

## Pinecone & DynamoDB strategy to clean things up

X For all Pinecone user namespaces, delete all user summaries
X conversation_summary, coach_creator_summary, program_designer_summary

X Then for all my own Pinecone and DynamoDB user namespaces, delete all of the following:
X user memories (pinecone & dynamodb)
X conversation summaries (pinecone & dynamodb)
X conversations (dynamodb)
X workout summaries (pinecone & dynamodb)
X analytics (dynamodb)

## Delete all user bad or retired record types, start fresh

```zsh
# Delete user summaries from Pinecone for all users.
export PINECONE_API_KEY="pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC"

# Array of user IDs (without 'user_' prefix)
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  "8aRtnBukPk0nY4VjKM-K5"
  "wcf5CfcUlHx1ZfJpvUvmg"
  "86xOMTDvtExnCT1HYXDv0"
  "tBR_TSqimEKTKEdCq7jiz"
  "X9xxW8FFwRG_A3OHPZo9d"
  "WXRSal4O823o0zgfysMB5"
  "y7DbO-vudIqo_lfu7s8f4"
  "Ag3kacNYlJahVlIZdbQ63"
  "G49cJHe9dTzTSA8KwDiZ-"
  "G7WXT8-eIkTHPXB9h2wK-"
  "BG4CpWE5rawk--Rt8TAV8"
  "phXokwvMMIj6bm3q9CrF2"
  "NgnIkgtqlTEpy-IKlmCRd"
  "pPimYZqNQ1G3RR-TFUDg5"
)

# Iterate through each user ID
for USER_ID in "${USER_IDS[@]}"; do
  echo "Processing user_${USER_ID}..."
  node ./scripts/delete-namespace.js user_${USER_ID} --list-types \
    --include-types=training_program_summary,program_summary --verbose
  echo "---"
done
```

## Delete all user summaries to clean out duplicates, start fresh

```zsh
# Delete user summaries from Pinecone for all users.
export PINECONE_API_KEY="pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC"

# Array of user IDs (without 'user_' prefix)
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  "8aRtnBukPk0nY4VjKM-K5"
  "wcf5CfcUlHx1ZfJpvUvmg"
  "86xOMTDvtExnCT1HYXDv0"
  "tBR_TSqimEKTKEdCq7jiz"
  "X9xxW8FFwRG_A3OHPZo9d"
  "WXRSal4O823o0zgfysMB5"
  "y7DbO-vudIqo_lfu7s8f4"
  "Ag3kacNYlJahVlIZdbQ63"
  "G49cJHe9dTzTSA8KwDiZ-"
  "G7WXT8-eIkTHPXB9h2wK-"
  "BG4CpWE5rawk--Rt8TAV8"
  "phXokwvMMIj6bm3q9CrF2"
  "NgnIkgtqlTEpy-IKlmCRd"
  "pPimYZqNQ1G3RR-TFUDg5"
)

# Iterate through each user ID
for USER_ID in "${USER_IDS[@]}"; do
  echo "Processing user_${USER_ID}..."
  node ./scripts/delete-namespace.js user_${USER_ID} --list-types \
    --include-types=conversation_summary,coach_creator_summary,program_designer_summary --verbose
  echo "---"
done
```

## Delete user memories

```zsh
# My own user namespaces or IDs.
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  "8aRtnBukPk0nY4VjKM-K5"
  "wcf5CfcUlHx1ZfJpvUvmg"
)

# Set environment variables
export PINECONE_API_KEY="pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC"
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAMES=(
  "NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"
  "NeonPanda-ProtoApi-AllItems-V2-develop"
  "NeonPanda-ProtoApi-AllItems-V2"
)
export AWS_PROFILE="midgard-sandbox"

# Iterate through each user ID (outer loop)
for USER_ID in "${USER_IDS[@]}"; do
  echo "========================================="
  echo "Processing user: ${USER_ID}"
  echo "========================================="

  # Delete user memories from Pinecone (once per user, not per table)
  node ./scripts/delete-namespace.js user_${USER_ID} \
    --include-types=user_memory --verbose

  # Iterate through each table name (inner loop)
  for TABLE_NAME in "${DYNAMODB_TABLE_NAMES[@]}"; do
    echo "Processing table: ${TABLE_NAME}"

    # Delete user memories from DynamoDB (with table name)
    node ./scripts/delete-user-dynamodb.js "${USER_ID}" \
      --table="${TABLE_NAME}" \
      --include-types=userMemory --verbose

    echo "---"
  done
done
```

## Delete user conversations and conversation summaries

```zsh
# My own user namespaces or IDs.
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  "8aRtnBukPk0nY4VjKM-K5"
  "wcf5CfcUlHx1ZfJpvUvmg"
)

# Set environment variables
export PINECONE_API_KEY="pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC"
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAMES=(
  "NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"
  "NeonPanda-ProtoApi-AllItems-V2-develop"
  "NeonPanda-ProtoApi-AllItems-V2"
)
export AWS_PROFILE="midgard-sandbox"

# Iterate through each user ID
for USER_ID in "${USER_IDS[@]}"; do
  echo "Processing user_${USER_ID}..."

  # Delete conversation summaries from Pinecone
  node ./scripts/delete-namespace.js user_${USER_ID} \
    --include-types=conversation_summary --verbose

  # Iterate through each DynamoDB table
  for TABLE_NAME in "${DYNAMODB_TABLE_NAMES[@]}"; do
    echo "  Processing table: ${TABLE_NAME}..."

    # Delete conversation summaries and coach conversations from DynamoDB
    node ./scripts/delete-user-dynamodb.js "${USER_ID}" --table="${TABLE_NAME}" \
      --include-types=conversationSummary,coachConversation --verbose
  done

  echo "---"
done
```

## Delete user workouts and workout summaries

```zsh
# My own user namespaces or IDs.
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  # "8aRtnBukPk0nY4VjKM-K5" Keep this one, is actively using
  "wcf5CfcUlHx1ZfJpvUvmg"
)

# Set environment variables
export PINECONE_API_KEY="pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC"
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAMES=(
  "NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"
  "NeonPanda-ProtoApi-AllItems-V2-develop"
  "NeonPanda-ProtoApi-AllItems-V2"
)
export AWS_PROFILE="midgard-sandbox"

# Iterate through each user ID
for USER_ID in "${USER_IDS[@]}"; do
  echo "Processing user_${USER_ID}..."

  # Delete workout summaries from Pinecone
  node ./scripts/delete-namespace.js user_${USER_ID} \
    --include-types=workout_summary --verbose

  # Iterate through each DynamoDB table
  for TABLE_NAME in "${DYNAMODB_TABLE_NAMES[@]}"; do
    echo "  Processing table: ${TABLE_NAME}..."

    # Delete workouts from DynamoDB
    node ./scripts/delete-user-dynamodb.js "${USER_ID}" --table="${TABLE_NAME}" \
      --include-types=workout --verbose
  done

  echo "---"
done
```

## Delete user analytics

```zsh
# My own user namespaces or IDs.
USER_IDS=(
  "BDTzRYzoSKji5zZbNESv6"
  "63gocaz-j-AYRsb0094ik"
  "8aRtnBukPk0nY4VjKM-K5"
  "wcf5CfcUlHx1ZfJpvUvmg"
)

# Set environment variables
export AWS_REGION="us-west-2"
export DYNAMODB_TABLE_NAMES=(
  "NeonPanda-ProtoApi-AllItems-V2-sandbox-abb89311"
  "NeonPanda-ProtoApi-AllItems-V2-develop"
  "NeonPanda-ProtoApi-AllItems-V2"
)
export AWS_PROFILE="midgard-sandbox"

# Iterate through each user ID
for USER_ID in "${USER_IDS[@]}"; do
  echo "Processing user_${USER_ID}..."

  # Iterate through each DynamoDB table
  for TABLE_NAME in "${DYNAMODB_TABLE_NAMES[@]}"; do
    echo "  Processing table: ${TABLE_NAME}..."

    # Delete analytics from DynamoDB
    node ./scripts/delete-user-dynamodb.js "${USER_ID}" --table="${TABLE_NAME}" \
      --include-types=analytics --verbose
  done

  echo "---"
done
```
