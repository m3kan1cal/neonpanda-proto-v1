# Image Upload API - cURL Examples

**Feature**: Image Upload for Coach Conversations
**Backend Lambdas**: `generate-upload-urls`, `send-coach-conversation-message`, `stream-coach-conversation`
**S3 Bucket**: `midgard-apps` (branch-aware naming)

---

## Environment Variables

```bash
# Set these variables for your environment
export API_BASE_URL="https://0bvali2kzd.execute-api.us-west-2.amazonaws.com"
export ACCESS_TOKEN="your-jwt-access-token-here"
export USER_ID="your-user-id-here"
export COACH_ID="your-coach-id-here"
export CONVERSATION_ID="your-conversation-id-here"
```

---

## 1. Generate Presigned Upload URLs

**Endpoint**: `POST /users/{userId}/generate-upload-urls`

**Description**: Generates presigned S3 URLs for secure direct client-to-S3 image uploads. URLs expire in 5 minutes.

**Authentication**: Required (JWT Bearer Token)

**Security**: Users can only generate URLs for their own userId.

### cURL Command

```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/generate-upload-urls" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileCount": 2,
    "fileTypes": ["jpg", "png"]
  }'
```

### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileCount` | integer | ✅ | Number of files to upload (1-5) |
| `fileTypes` | string[] | ✅ | Array of file extensions: `jpg`, `png`, `webp`, `gif`, `heic`, `heif` |

### Request Examples

**Single Image**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/generate-upload-urls" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileCount": 1,
    "fileTypes": ["jpg"]
  }'
```

**Multiple Images**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/generate-upload-urls" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileCount": 3,
    "fileTypes": ["jpg", "png", "heic"]
  }'
```

### Response (200 OK)

```json
{
  "uploadUrls": [
    {
      "index": 0,
      "s3Key": "user-uploads/01234567-89ab-cdef-0123-456789abcdef/V1StGXR8_Z5jdHi6B-myT.jpg",
      "uploadUrl": "https://midgard-apps-sandbox-abc123.s3.us-west-2.amazonaws.com/user-uploads/01234567-89ab-cdef-0123-456789abcdef/V1StGXR8_Z5jdHi6B-myT.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=..."
    },
    {
      "index": 1,
      "s3Key": "user-uploads/01234567-89ab-cdef-0123-456789abcdef/3z6tF9nP2Kw8xQm5Y-abc.png",
      "uploadUrl": "https://midgard-apps-sandbox-abc123.s3.us-west-2.amazonaws.com/user-uploads/01234567-89ab-cdef-0123-456789abcdef/3z6tF9nP2Kw8xQm5Y-abc.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=..."
    }
  ],
  "expiresIn": 300
}
```

### Error Responses

**400 Bad Request - Invalid File Count**
```json
{
  "error": "File count must be between 1 and 5"
}
```

**400 Bad Request - File Types Mismatch**
```json
{
  "error": "File types array must match file count"
}
```

**400 Bad Request - Unsupported File Type**
```json
{
  "error": "Unsupported file type: bmp"
}
```

**403 Forbidden - User Mismatch**
```json
{
  "error": "Cannot upload images for other users"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

---

## 2. Upload Image to S3

**Endpoint**: `PUT {presignedUrl}` (from Step 1)

**Description**: Direct upload to S3 using the presigned URL. No authentication header needed - URL is pre-authenticated.

**Authentication**: Not required (presigned URL contains auth)

**Important**: This is a direct S3 upload, NOT to your API Gateway.

### cURL Command

```bash
# Use the uploadUrl from the previous response
export PRESIGNED_URL="https://midgard-apps-sandbox-abc123.s3.us-west-2.amazonaws.com/user-uploads/..."

curl -X PUT "${PRESIGNED_URL}" \
  -H "Content-Type: image/jpeg" \
  -T /path/to/your/image.jpg
```

### Upload Multiple Files

```bash
# Example: Upload 2 images in sequence

# Image 1
curl -X PUT "https://midgard-apps-sandbox-abc123.s3.us-west-2.amazonaws.com/user-uploads/.../image1.jpg?X-Amz-..." \
  -H "Content-Type: image/jpeg" \
  -T /path/to/image1.jpg

# Image 2
curl -X PUT "https://midgard-apps-sandbox-abc123.s3.us-west-2.amazonaws.com/user-uploads/.../image2.png?X-Amz-..." \
  -H "Content-Type: image/png" \
  -T /path/to/image2.png
```

### Content-Type Headers by File Type

| File Type | Content-Type Header |
|-----------|---------------------|
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.webp` | `image/webp` |
| `.gif` | `image/gif` |
| `.heic`, `.heif` | `image/heic` |

### Response (200 OK)

```
(Empty response body)
ETag: "686897696a7c876b7e"
```

### Error Responses

**403 Forbidden - Expired URL**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Request has expired</Message>
</Error>
```

**400 Bad Request - Content Type Mismatch**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>SignatureDoesNotMatch</Code>
  <Message>The request signature we calculated does not match the signature you provided.</Message>
</Error>
```

---

## 3. Send Message with Images (Non-Streaming)

**Endpoint**: `POST /users/{userId}/coaches/{coachId}/conversations/{conversationId}/messages`

**Description**: Send a message with optional image attachments. Images must be uploaded to S3 first (Steps 1-2).

**Authentication**: Required (JWT Bearer Token)

### cURL Command

```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "Check out these progress photos from today'\''s workout!",
    "messageTimestamp": "2025-10-02T12:34:56.789Z",
    "imageS3Keys": [
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/V1StGXR8_Z5jdHi6B-myT.jpg",
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/3z6tF9nP2Kw8xQm5Y-abc.png"
    ]
  }'
```

### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userResponse` | string | ⚠️ | Message text (required if no images) |
| `messageTimestamp` | string (ISO 8601) | ❌ | Message timestamp (auto-generated if not provided) |
| `imageS3Keys` | string[] | ⚠️ | Array of S3 keys from Step 1 (required if no text, max 5) |

### Request Examples

**Text Only (Existing)**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "What should I focus on today?",
    "messageTimestamp": "2025-10-02T12:34:56.789Z"
  }'
```

**Images Only (NEW)**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messageTimestamp": "2025-10-02T12:34:56.789Z",
    "imageS3Keys": [
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/V1StGXR8_Z5jdHi6B-myT.jpg"
    ]
  }'
```

**Text + Images (NEW)**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userResponse": "How'\''s my form looking in these pics?",
    "messageTimestamp": "2025-10-02T12:34:56.789Z",
    "imageS3Keys": [
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/squat1.jpg",
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/squat2.jpg"
    ]
  }'
```

### Response (200 OK)

```json
{
  "conversation": {
    "userId": "01234567-89ab-cdef-0123-456789abcdef",
    "conversationId": "conv_1234567890",
    "coachId": "coach_abc123",
    "title": "Morning Training Check-in",
    "messages": [
      {
        "id": "msg_1696875234567_user",
        "role": "user",
        "content": "Check out these progress photos from today's workout!",
        "timestamp": "2025-10-02T12:34:56.789Z",
        "messageType": "text_with_images",
        "imageS3Keys": [
          "user-uploads/01234567-89ab-cdef-0123-456789abcdef/V1StGXR8_Z5jdHi6B-myT.jpg",
          "user-uploads/01234567-89ab-cdef-0123-456789abcdef/3z6tF9nP2Kw8xQm5Y-abc.png"
        ]
      },
      {
        "id": "msg_1696875238901_assistant",
        "role": "assistant",
        "content": "Great progress! I can see significant improvement in your squat depth...",
        "timestamp": "2025-10-02T12:35:01.234Z",
        "messageType": "text",
        "metadata": {
          "tokens": 245,
          "model": "claude-sonnet-4",
          "processingTime": 3421
        }
      }
    ],
    "metadata": {
      "messageCount": 12,
      "lastMessageAt": "2025-10-02T12:35:01.234Z"
    }
  }
}
```

### Error Responses

**400 Bad Request - No Content**
```json
{
  "error": "Either text or images required"
}
```

**400 Bad Request - Too Many Images**
```json
{
  "error": "Maximum 5 images per message"
}
```

**403 Forbidden - Invalid S3 Key**
```json
{
  "error": "Invalid image key"
}
```

**404 Not Found - Conversation Not Found**
```json
{
  "error": "Conversation not found"
}
```

---

## 4. Send Message with Images (Streaming)

**Endpoint**: `POST /users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream`

**Description**: Send a message with optional images and receive streaming AI response. Uses Lambda Function URL.

**Authentication**: Required (JWT Bearer Token)

**Note**: Response is streamed using Server-Sent Events (SSE).

### cURL Command

```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/stream" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "userResponse": "Can you analyze my deadlift form in these photos?",
    "messageTimestamp": "2025-10-02T12:34:56.789Z",
    "imageS3Keys": [
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/deadlift1.jpg",
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/deadlift2.jpg"
    ]
  }'
```

### Request Body Schema

Same as Step 3 (Send Message).

### Request Examples

**Streaming with Images**
```bash
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/stream" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "userResponse": "Thoughts on my squat depth?",
    "imageS3Keys": [
      "user-uploads/01234567-89ab-cdef-0123-456789abcdef/squat.jpg"
    ]
  }'
```

### Response (200 OK - Streaming)

```
event: update
data: {"delta":"Looking"}

event: update
data: {"delta":" at"}

event: update
data: {"delta":" your"}

event: update
data: {"delta":" squat"}

event: update
data: {"delta":" depth"}

event: update
data: {"delta":","}

event: update
data: {"delta":" I"}

event: update
data: {"delta":" can"}

event: update
data: {"delta":" see"}

...

event: complete
data: {"fullResponse":"Looking at your squat depth, I can see you're hitting parallel nicely...","messageId":"msg_1696875238901_assistant"}
```

### SSE Event Types

| Event | Description | Data Format |
|-------|-------------|-------------|
| `update` | Streaming token chunk | `{"delta": "word"}` |
| `complete` | Stream finished | `{"fullResponse": "...", "messageId": "..."}` |
| `error` | Stream error occurred | `{"error": "Error message"}` |

### Error Responses

Same as Step 3, plus:

**500 Internal Server Error - Streaming Failed**
```
event: error
data: {"error":"Failed to generate streaming response"}
```

---

## Complete End-to-End Example

Here's a complete workflow for uploading and sending images:

```bash
#!/bin/bash

# Step 1: Set environment variables
export API_BASE_URL="https://0bvali2kzd.execute-api.us-west-2.amazonaws.com"
export ACCESS_TOKEN="eyJraWQiOiJabTF..."
export USER_ID="01234567-89ab-cdef-0123-456789abcdef"
export COACH_ID="coach_abc123"
export CONVERSATION_ID="conv_1234567890"

# Step 2: Generate presigned URLs
echo "Step 1: Generating presigned URLs..."
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/users/${USER_ID}/generate-upload-urls" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileCount": 2,
    "fileTypes": ["jpg", "jpg"]
  }')

echo "$RESPONSE" | jq '.'

# Extract URLs and keys
UPLOAD_URL_1=$(echo "$RESPONSE" | jq -r '.uploadUrls[0].uploadUrl')
UPLOAD_URL_2=$(echo "$RESPONSE" | jq -r '.uploadUrls[1].uploadUrl')
S3_KEY_1=$(echo "$RESPONSE" | jq -r '.uploadUrls[0].s3Key')
S3_KEY_2=$(echo "$RESPONSE" | jq -r '.uploadUrls[1].s3Key')

# Step 3: Upload images to S3
echo "Step 2: Uploading images to S3..."
curl -X PUT "$UPLOAD_URL_1" \
  -H "Content-Type: image/jpeg" \
  -T ./image1.jpg

curl -X PUT "$UPLOAD_URL_2" \
  -H "Content-Type: image/jpeg" \
  -T ./image2.jpg

echo "Images uploaded successfully!"

# Step 4: Send message with images
echo "Step 3: Sending message with images..."
curl -X POST "${API_BASE_URL}/users/${USER_ID}/coaches/${COACH_ID}/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"userResponse\": \"Can you analyze these workout photos?\",
    \"messageTimestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
    \"imageS3Keys\": [
      \"$S3_KEY_1\",
      \"$S3_KEY_2\"
    ]
  }" | jq '.'

echo "Message sent successfully!"
```

---

## Postman Collection

### Collection Variables

```json
{
  "apiBaseUrl": "https://0bvali2kzd.execute-api.us-west-2.amazonaws.com",
  "accessToken": "your-jwt-token",
  "userId": "your-user-id",
  "coachId": "your-coach-id",
  "conversationId": "your-conversation-id"
}
```

### Request 1: Generate Upload URLs

```json
{
  "name": "Generate Upload URLs",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"fileCount\": 2,\n  \"fileTypes\": [\"jpg\", \"png\"]\n}"
    },
    "url": {
      "raw": "{{apiBaseUrl}}/users/{{userId}}/generate-upload-urls",
      "host": ["{{apiBaseUrl}}"],
      "path": ["users", "{{userId}}", "generate-upload-urls"]
    }
  },
  "response": []
}
```

### Request 2: Upload to S3

```json
{
  "name": "Upload Image to S3",
  "request": {
    "method": "PUT",
    "header": [
      {
        "key": "Content-Type",
        "value": "image/jpeg"
      }
    ],
    "body": {
      "mode": "file",
      "file": {
        "src": "/path/to/image.jpg"
      }
    },
    "url": {
      "raw": "{{presignedUrl}}",
      "host": ["{{presignedUrl}}"]
    }
  },
  "response": []
}
```

### Request 3: Send Message with Images

```json
{
  "name": "Send Message with Images",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"userResponse\": \"Check out these photos!\",\n  \"messageTimestamp\": \"2025-10-02T12:34:56.789Z\",\n  \"imageS3Keys\": [\n    \"user-uploads/{{userId}}/image1.jpg\",\n    \"user-uploads/{{userId}}/image2.jpg\"\n  ]\n}"
    },
    "url": {
      "raw": "{{apiBaseUrl}}/users/{{userId}}/coaches/{{coachId}}/conversations/{{conversationId}}/messages",
      "host": ["{{apiBaseUrl}}"],
      "path": ["users", "{{userId}}", "coaches", "{{coachId}}", "conversations", "{{conversationId}}", "messages"]
    }
  },
  "response": []
}
```

### Request 4: Stream Message with Images

```json
{
  "name": "Stream Message with Images",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"userResponse\": \"Analyze my form please\",\n  \"imageS3Keys\": [\n    \"user-uploads/{{userId}}/workout.jpg\"\n  ]\n}"
    },
    "url": {
      "raw": "{{apiBaseUrl}}/users/{{userId}}/coaches/{{coachId}}/conversations/{{conversationId}}/stream",
      "host": ["{{apiBaseUrl}}"],
      "path": ["users", "{{userId}}", "coaches", "{{coachId}}", "conversations", "{{conversationId}}", "stream"]
    }
  },
  "response": []
}
```

---

## Notes

1. **Authentication**: All API Gateway endpoints require JWT Bearer token
2. **S3 Upload**: Direct to S3, no auth header needed (presigned URL contains auth)
3. **URL Expiration**: Presigned URLs expire in 5 minutes
4. **User-Scoped**: Users can only upload/access their own images
5. **S3 Key Format**: `user-uploads/{userId}/{nanoid}.{extension}`
6. **Max Images**: 5 images per message
7. **Supported Formats**: JPG, PNG, WebP, GIF, HEIC/HEIF
8. **Claude Sonnet 4**: Backend uses Claude Sonnet 4 for vision analysis
9. **Streaming**: Use `-N` flag in curl for Server-Sent Events

## Related Documentation

- [Postman Authentication Setup](../playbooks/postman-auth-setup.md)
- [Image Upload Implementation Guide](../implementations/IMAGE_UPLOAD_CORRECTED_GUIDE.md)
- [Technical Architecture](../strategy/TECHNICAL_ARCHITECTURE.md)

---

## Testing Checklist

- [ ] Generate presigned URLs (1-5 images)
- [ ] Upload images to S3 using presigned URLs
- [ ] Verify S3 keys are user-scoped
- [ ] Send message with images (non-streaming)
- [ ] Send message with images (streaming)
- [ ] Test with different image formats (JPG, PNG, HEIC)
- [ ] Test error cases (expired URLs, invalid keys, too many images)
- [ ] Verify Claude Sonnet 4 analyzes images correctly
- [ ] Test in both CoachConversations and CoachCreator contexts

