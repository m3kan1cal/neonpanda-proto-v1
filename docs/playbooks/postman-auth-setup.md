# Postman Authentication Setup for NeonPanda API

## Overview
Your API uses AWS Cognito User Pool authentication with JWT tokens. All protected routes require a valid JWT token in the Authorization header.

This guide shows you how to set up **automated authentication** in Postman using the USER_PASSWORD_AUTH flow.

## Automated Authentication Setup

### Step 1: Confirm Authentication Flow is Enabled
The USER_PASSWORD_AUTH flow has already been enabled in your `amplify/backend.ts` file:

```typescript
// Configure User Pool Client with additional auth flows for API testing
cfnUserPoolClient.explicitAuthFlows = [
  "ALLOW_USER_SRP_AUTH",      // Current default (what your React app uses)
  "ALLOW_CUSTOM_AUTH",        // For custom auth flows
  "ALLOW_REFRESH_TOKEN_AUTH", // For token refresh
  "ALLOW_USER_PASSWORD_AUTH", // For simple Postman automation
  "ALLOW_ADMIN_USER_PASSWORD_AUTH" // For AWS CLI (bonus)
];
```

### Step 2: Create Postman Environment Variables
Create a new Postman environment with these variables:
```
FOR SANDBOX
cognitoClientId: 6sa6v9korvpdr8f9pl0arttth0
cognitoRegion: us-west-2
username: m3kan1ca+001@gmail.com
password: SpartanRai213$
apiBaseUrl: https://0bvali2kzd.execute-api.us-west-2.amazonaws.com
accessToken: (leave empty - auto-populated)
idToken: (leave empty - auto-populated)
userId: (leave empty - auto-populated)
tokenExpiry: (leave empty - auto-populated)
```

### Step 3: Add Collection Pre-request Script
In your Postman collection settings, add this pre-request script:
```javascript
// Collection-level pre-request script for automatic Cognito authentication
const username = pm.environment.get("username");
const password = pm.environment.get("password");
const clientId = pm.environment.get("cognitoClientId");
const region = pm.environment.get("cognitoRegion");

// Check if token is still valid
const accessToken = pm.environment.get("accessToken");
const tokenExpiry = pm.environment.get("tokenExpiry");

if (accessToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    console.info("✅ Using existing valid token");
    return;
}

console.info("🔄 Token expired or missing - authenticating with Cognito...");

// Authenticate with Cognito
const authRequest = {
    url: `https://cognito-idp.${region}.amazonaws.com/`,
    method: 'POST',
    header: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
    },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            "AuthFlow": "USER_PASSWORD_AUTH",
            "ClientId": clientId,
            "AuthParameters": {
                "USERNAME": username,
                "PASSWORD": password
            }
        })
    }
};

pm.sendRequest(authRequest, (err, response) => {
    if (err || response.code !== 200) {
        console.error("❌ Authentication failed:", err || response.json());
        return;
    }

    const result = response.json();
    if (result.AuthenticationResult) {
        const accessToken = result.AuthenticationResult.AccessToken;
        const idToken = result.AuthenticationResult.IdToken;
        const expiresIn = result.AuthenticationResult.ExpiresIn * 1000;

        // Store tokens
        pm.environment.set("accessToken", accessToken);
        pm.environment.set("idToken", idToken);
        pm.environment.set("tokenExpiry", (Date.now() + expiresIn).toString());

        // Extract User ID from ID token
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const userId = payload['custom:user_id'] || payload.sub;
        pm.environment.set("userId", userId);

        console.info("✅ Authentication successful!");
        console.info("🆔 User ID:", userId);
        console.info("⏰ Token expires in:", Math.round(expiresIn/1000/60), "minutes");
    } else if (result.ChallengeName) {
        console.error("❌ Authentication challenge required:", result.ChallengeName);
    } else {
        console.error("❌ Unexpected response:", result);
    }
});
```

### Step 4: Set Collection Authorization
In your collection settings, set:
- **Type**: Bearer Token
- **Token**: `{{accessToken}}`

**Note:** Both `{{accessToken}}` and `{{idToken}}` are available:
- **`accessToken`**: Use for API authorization (recommended for most endpoints)
- **`idToken`**: Contains user claims/profile info, also works for authorization

## How It Works

Every API request in your collection will now:
1. **Check if token is valid** - Uses cached token if still active
2. **Auto-authenticate if needed** - Fetches new token when expired
3. **Store both tokens** - Sets `accessToken` and `idToken` automatically
4. **Extract user information** - Sets `userId` from token automatically
5. **Add authorization header** - Uses fresh token for API calls

**✅ Zero manual intervention needed after initial setup!**

## Test Your Setup

Create requests using these patterns:
- `GET {{apiBaseUrl}}/users/{{userId}}/workouts`
- `GET {{apiBaseUrl}}/users/{{userId}}/coaches`
- `POST {{apiBaseUrl}}/users/{{userId}}/coaches/{coachId}/conversations`
- `GET {{apiBaseUrl}}/users/{{userId}}/memories`

**All requests automatically inherit the Bearer token authentication!**

### Using ID Token Manually
If you need to use the `idToken` in a specific request instead of the collection-level `accessToken`:
- **Header**: `Authorization: Bearer {{idToken}}`
- **Or in request body**: `"token": "{{idToken}}"`

## Troubleshooting

- **403/401 errors**: Check username/password in environment variables
- **No userId**: Verify the user has a `custom:user_id` attribute
- **Token issues**: Check Postman Console for authentication logs
- **Missing idToken**: Verify both `accessToken` and `idToken` are set in environment
- **Deploy changes**: Run `npx ampx deploy` after enabling auth flows
