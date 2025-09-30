# User Profile API - cURL Examples

**Frontend API Module**: `src/utils/apis/userProfileApi.js`
**Backend Lambdas**: `get-user-profile`, `update-user-profile`

## Environment Variables
```bash
# Set these variables for your environment
export API_BASE_URL="https://0bvali2kzd.execute-api.us-west-2.amazonaws.com"
export ACCESS_TOKEN="your-jwt-access-token-here"
export USER_ID="your-user-id-here"
```

## 1. Get User Profile

**Endpoint**: `GET /users/{userId}/profile`

**Description**: Retrieves the user's profile data from DynamoDB.

**Authentication**: Required (JWT Bearer Token)

### cURL Command

```bash
curl -X GET "${API_BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

### Response (200 OK)

```json
{
  "profile": {
    "userId": "01234567-89ab-cdef-0123-456789abcdef",
    "email": "user@example.com",
    "username": "username123",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "John Doe",
    "nickname": "JD",
    "avatar": {
      "url": "",
      "s3Key": ""
    },
    "preferences": {
      "timezone": "America/Los_Angeles"
    },
    "subscription": {},
    "demographics": {},
    "fitness": {},
    "metadata": {
      "isActive": true
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T14:45:00Z"
  }
}
```

### Error Responses

**404 Not Found**
```json
{
  "error": "User profile not found"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

---

## 2. Update User Profile

**Endpoint**: `PUT /users/{userId}/profile`

**Description**: Updates the user's profile data in DynamoDB and syncs to Cognito.

**Authentication**: Required (JWT Bearer Token)

**Note**: `email` and `username` are immutable and cannot be changed.

### cURL Command

```bash
curl -X PUT "${API_BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "displayName": "Jane Smith",
    "nickname": "JS"
  }'
```

### Update with Preferences

```bash
curl -X PUT "${API_BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "timezone": "America/New_York"
    }
  }'
```

### Update Multiple Fields

```bash
curl -X PUT "${API_BASE_URL}/users/${USER_ID}/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "displayName": "Jane Smith",
    "nickname": "Janey",
    "preferences": {
      "timezone": "Europe/London"
    }
  }'
```

### Request Body Schema

| Field | Type | Required | Editable | Description |
|-------|------|----------|----------|-------------|
| `email` | string | ❌ | ❌ | Email address (immutable GSI key) |
| `username` | string | ❌ | ❌ | Username (immutable GSI key) |
| `firstName` | string | ❌ | ✅ | User's first name (synced to Cognito) |
| `lastName` | string | ❌ | ✅ | User's last name (synced to Cognito) |
| `displayName` | string | ❌ | ✅ | Display name shown to other users |
| `nickname` | string | ❌ | ✅ | Nickname or preferred name (synced to Cognito) |
| `preferences` | object | ❌ | ✅ | User preferences object |
| `preferences.timezone` | string | ❌ | ✅ | Timezone (e.g., "America/Los_Angeles") |

### Response (200 OK)

```json
{
  "profile": {
    "userId": "01234567-89ab-cdef-0123-456789abcdef",
    "email": "user@example.com",
    "username": "username123",
    "firstName": "Jane",
    "lastName": "Smith",
    "displayName": "Jane Smith",
    "nickname": "JS",
    "avatar": {
      "url": "",
      "s3Key": ""
    },
    "preferences": {
      "timezone": "America/New_York"
    },
    "subscription": {},
    "demographics": {},
    "fitness": {},
    "metadata": {
      "isActive": true
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T15:20:00Z"
  }
}
```

### Error Responses

**400 Bad Request - Invalid JSON**
```json
{
  "error": "Invalid JSON in request body"
}
```

**400 Bad Request - Immutable Field**
```json
{
  "error": "Email and username cannot be changed"
}
```

**400 Bad Request - User ID Change**
```json
{
  "error": "User ID cannot be changed"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to update user profile"
}
```

---

## Postman Import Examples

### Get User Profile
```json
{
  "name": "Get User Profile",
  "request": {
    "method": "GET",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}",
        "type": "text"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{apiBaseUrl}}/users/{{userId}}/profile",
      "host": ["{{apiBaseUrl}}"],
      "path": ["users", "{{userId}}", "profile"]
    }
  }
}
```

### Update User Profile
```json
{
  "name": "Update User Profile",
  "request": {
    "method": "PUT",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}",
        "type": "text"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"firstName\": \"Jane\",\n  \"lastName\": \"Smith\",\n  \"displayName\": \"Jane Smith\",\n  \"nickname\": \"JS\",\n  \"preferences\": {\n    \"timezone\": \"America/New_York\"\n  }\n}"
    },
    "url": {
      "raw": "{{apiBaseUrl}}/users/{{userId}}/profile",
      "host": ["{{apiBaseUrl}}"],
      "path": ["users", "{{userId}}", "profile"]
    }
  }
}
```

---

## Notes

1. **Authentication**: Both endpoints require a valid JWT token from AWS Cognito
2. **User ID**: Must match the authenticated user (enforced by backend middleware)
3. **Cognito Sync**: `firstName`, `lastName`, and `nickname` are automatically synced to Cognito User Pool
4. **DynamoDB as Source of Truth**: Profile data is primarily stored in DynamoDB
5. **Immutable Fields**: `email` and `username` are GSI keys and cannot be modified
6. **Partial Updates**: You only need to send fields you want to update

## Related Documentation

- [Postman Authentication Setup](../playbooks/postman-auth-setup.md)
- [User Profile Strategy](../strategy/USER_MEMORY_STRATEGY.md)
- [Database Design](../strategy/DB_DESIGN.md)
