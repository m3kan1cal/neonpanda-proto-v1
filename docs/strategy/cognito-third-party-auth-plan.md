# Cognito Third-Party Authentication Integration Plan

## Executive Summary

This document analyzes the impact and implementation strategy for adding third-party identity provider (IdP) authentication to the NeonPanda Cognito-based auth system. The current system uses email/password-only authentication via AWS Cognito User Pool with Amplify Gen 2. Adding federated login (e.g., "Sign in with Google") is well-supported by Cognito and Amplify, but requires coordinated changes across infrastructure, backend triggers, and frontend components.

**Risk Level: Medium** — The integration path is well-documented and supported natively by Cognito/Amplify, but there are important edge cases around account linking, the post-confirmation trigger, and required user attributes that need careful handling.

---

## Current Architecture Snapshot

| Layer | Technology | Key Files |
|-------|-----------|-----------|
| Auth Infrastructure | Amplify Gen 2 + Cognito User Pool | `amplify/auth/resource.ts` |
| CDK Customization | cfnUserPool / cfnUserPoolClient overrides | `amplify/backend.ts:1254-1314` |
| Post-Confirmation Trigger | Lambda (nanoid user_id generation, DynamoDB profile) | `amplify/functions/post-confirmation/handler.ts` |
| API Authorization | HttpUserPoolAuthorizer (API Gateway v2) | `amplify/api/resource.ts`, `amplify/backend.ts` |
| JWT Middleware | Custom withAuth / withStreamingAuth | `amplify/functions/libs/auth/middleware.ts` |
| Frontend Auth | React Context + Amplify v6 SDK | `src/auth/contexts/AuthContext.jsx` |
| Auth UI | Custom forms (Login, Register, Verify, Reset) | `src/auth/components/` |

### What Currently Exists
- Email/password login with SRP auth flow
- Email verification via 6-digit code
- Optional TOTP MFA
- `custom:user_id` generated in post-confirmation Lambda trigger
- `preferredUsername` required at signup
- All API routes validate `custom:user_id` from JWT claims
- Advanced security (Cognito Plus tier) enabled

### What Does NOT Exist
- No federated identity providers configured
- No OAuth2/OIDC callback URLs
- No social login buttons in the UI
- No account linking logic
- No Identity Pool (only User Pool)

---

## Recommended Providers (Immediate Integration)

### 1. Google (Gmail) — **Highest Priority**

**Why:** Largest OAuth provider by market share. Nearly every user has a Google account. Most requested social login option for fitness/consumer apps. Well-documented Cognito integration.

**Cognito Support:** Native first-class support as a social identity provider (not generic OIDC — Cognito has a dedicated Google integration path).

### 2. Apple — **Second Priority**

**Why:** Required by Apple App Store policy if you offer any third-party social login. Even if NeonPanda is web-only today, adding Apple now prevents a blocker if you ship a mobile app. Apple users expect "Sign in with Apple" on iOS/macOS. Good for privacy-conscious fitness users.

**Cognito Support:** Native first-class support as a social identity provider.

### Why NOT Facebook, GitHub, etc.?
- **Facebook/Meta:** Declining user trust, complex API approval process, less relevant for fitness audience.
- **GitHub:** Developer-oriented, not relevant for fitness consumer audience.
- **SAML/Enterprise:** Overkill for a consumer fitness app at this stage.

---

## Impact Analysis

### 1. Infrastructure Changes (`amplify/auth/resource.ts`)

**What changes:** Add `external` providers to the `loginWith` configuration.

```typescript
// CURRENT
loginWith: {
  email: { verificationEmailStyle: "CODE", ... }
}

// PROPOSED
loginWith: {
  email: { verificationEmailStyle: "CODE", ... },
  externalProviders: {
    google: {
      clientId: secret('GOOGLE_CLIENT_ID'),
      clientSecret: secret('GOOGLE_CLIENT_SECRET'),
      scopes: ['email', 'profile', 'openid'],
      attributeMapping: {
        email: 'email',
        givenName: 'given_name',
        familyName: 'family_name',
        preferredUsername: 'email',  // See: Attribute Mapping Concerns
      }
    },
    apple: {
      clientId: secret('APPLE_CLIENT_ID'),
      teamId: secret('APPLE_TEAM_ID'),
      keyId: secret('APPLE_KEY_ID'),
      privateKey: secret('APPLE_PRIVATE_KEY'),
      scopes: ['email', 'name'],
      attributeMapping: {
        email: 'email',
        givenName: 'firstName',
        familyName: 'lastName',
        preferredUsername: 'email',
      }
    },
    callbackUrls: [
      'http://localhost:5173/',          // Local dev
      'https://dev.neonpanda.ai/',       // Dev
      'https://www.neonpanda.ai/',       // Production
    ],
    logoutUrls: [
      'http://localhost:5173/',
      'https://dev.neonpanda.ai/',
      'https://www.neonpanda.ai/',
    ],
    domainPrefix: 'neonpanda-auth',  // Creates: neonpanda-auth.auth.<region>.amazoncognito.com
  }
}
```

**Risk:** LOW — This is additive configuration. Existing email/password flow is unchanged.

**Side Effect:** Enabling `externalProviders` requires Cognito to create a **Hosted UI domain** (the `domainPrefix`). This is the OAuth2 endpoint that handles the redirect flow. You don't have to use the Hosted UI visually — Amplify's `signInWithRedirect()` uses it behind the scenes.

---

### 2. Post-Confirmation Trigger (`amplify/functions/post-confirmation/handler.ts`)

**This is the highest-risk area.**

**The Problem:** The current trigger fires on `PostConfirmation_ConfirmSignUp` — which is when a user verifies their email. For federated users (Google/Apple), the flow is different:

- Federated users are **automatically confirmed** by Cognito (no email verification step).
- The trigger source will be `PostConfirmation_ConfirmSignUp` for the first federated login too, but the `event.request.userAttributes` will have different shapes.
- Federated usernames look like `google_123456789` or `SignInWithApple_000.111.222` instead of an email.
- `preferred_username` may not be set (Google/Apple don't map to this by default).
- `email_verified` may be `true` from the IdP but the email comes from the IdP claim, not Cognito verification.

**What Must Change:**

```typescript
// In post-confirmation handler, detect federated vs native users:
const isFederatedUser = event.userName.includes('Google_') ||
                        event.userName.includes('SignInWithApple_') ||
                        event.triggerSource === 'PostConfirmation_ConfirmSignUp' &&
                        !event.request.userAttributes.preferred_username;

// For federated users:
// 1. preferred_username won't exist → fall back to email prefix or display name
// 2. given_name/family_name come from IdP claims (may be empty for Apple after first login)
// 3. Still need to generate custom:user_id via nanoid
// 4. Still need to create DynamoDB profile
// 5. Need account linking check: does a profile already exist for this email?
```

**Account Linking Concern:** If a user first registers with email/password as `jane@gmail.com`, then later clicks "Sign in with Google" using the same Gmail, Cognito creates a **separate user**. The existing handler already checks `getUserProfileByEmail(email)` and links to the existing profile — this logic works in our favor but needs to be validated for the federated flow.

**Risk:** MEDIUM — The handler works today but makes assumptions about attribute availability that won't hold for federated users. Needs defensive coding and testing.

---

### 3. CDK/Backend Customizations (`amplify/backend.ts`)

**What changes:**
- OAuth callback/logout URLs are configured in `auth/resource.ts`, but if you need to customize them per branch (sandbox vs prod), you may need CDK overrides on the `cfnUserPoolClient`.
- The `cfnUserPoolClient.explicitAuthFlows` already handles branch-aware configuration — this pattern extends naturally.
- No changes needed to the `HttpUserPoolAuthorizer` — it validates JWT tokens regardless of how the user authenticated (email or federated). The Cognito User Pool issues the same JWT format for all users.

**Risk:** LOW — API Gateway authorization is unaffected. JWTs from federated users contain the same claims structure.

---

### 4. JWT Middleware (`amplify/functions/libs/auth/middleware.ts`)

**What changes:** Likely nothing. The middleware extracts `custom:user_id` from JWT claims. As long as the post-confirmation trigger sets this attribute for federated users (which it will), the middleware works as-is.

**One concern:** The `withStreamingAuth` function manually decodes JWT tokens from the Authorization header. Federated user tokens will have `identities` claim (array of linked IdPs) that doesn't exist for email/password users. This is informational only — no code change needed unless you want to log/use it.

**Risk:** LOW — No changes expected.

---

### 5. Frontend Auth Context (`src/auth/contexts/AuthContext.jsx`)

**What changes:**

New Amplify method needed: `signInWithRedirect({ provider: 'Google' })` or `signInWithRedirect({ provider: 'Apple' })`.

```javascript
// NEW: Add to AuthContext
import { signInWithRedirect } from 'aws-amplify/auth';

const handleFederatedSignIn = async (provider) => {
  try {
    setAuthError(null);
    await signInWithRedirect({ provider });
    // This triggers a full-page redirect to Google/Apple → Cognito → back to app
    // On return, checkAuthState() picks up the session automatically
  } catch (error) {
    setAuthError(error.message);
    throw error;
  }
};
```

**Key behavior change:** Federated sign-in uses a **redirect flow** (not in-page like email/password). The user leaves the app, authenticates with Google/Apple, and returns via the callback URL. On return, `Amplify.configure()` + `getCurrentUser()` picks up the session.

**The `handleConfirmSignUp` retry logic (lines 188-255):** This was built to handle the race condition between Cognito confirmation and the post-confirmation trigger setting `custom:user_id`. Federated users skip email confirmation entirely, so this code path won't fire for them. The initial `checkAuthState()` on app mount (line 34-45) handles federated session restoration.

**Risk:** LOW-MEDIUM — The redirect flow is well-supported by Amplify, but requires handling the post-redirect state (loading spinner while session is resolved, handling errors from failed OAuth grants, etc.).

---

### 6. Frontend UI Components (`src/auth/components/`)

**What changes:**

- `LoginForm.jsx` — Add "Sign in with Google" and "Sign in with Apple" buttons above/below the email form, with a divider ("or continue with email").
- `RegisterForm.jsx` — Add the same social buttons. Federated sign-in **is** registration for new users (Cognito auto-creates the user).
- `AuthRouter.jsx` — May need to handle the OAuth redirect callback state (user returning from Google/Apple).
- `VerifyEmailForm.jsx` — No changes (federated users skip this).
- New component: `SocialLoginButtons.jsx` — Shared component with Google/Apple styled buttons.

**Risk:** LOW — Purely additive UI changes. Existing forms remain functional.

---

### 7. User Availability Check (`amplify/functions/check-user-availability/handler.ts`)

**What changes:** Currently checks if email/username is taken via `ListUsers`. Federated users will appear in the user pool with usernames like `Google_123456789`. The email filter still works (Cognito indexes email regardless of auth method). Username checks may need awareness that federated users might not have `preferred_username` set.

**Risk:** LOW — Minor defensive coding.

---

### 8. Profile Update & Cognito Sync (`amplify/functions/libs/user/cognito.ts`)

**What changes:** The `syncProfileToCognito` function uses `AdminUpdateUserAttributes` to push profile changes back to Cognito. For federated users, some attributes may be read-only (mapped from the IdP). Attempting to update IdP-mapped attributes will fail silently or throw.

**Mitigation:** Check if user is federated before syncing mapped attributes, or wrap in try/catch (which it already does — best-effort pattern).

**Risk:** LOW — Existing error handling covers this.

---

## Pre-Requisites (External Setup)

### Google OAuth Credentials
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Google Identity" API
3. Create OAuth 2.0 Client ID (Web application type)
4. Set authorized redirect URI to: `https://neonpanda-auth.auth.<region>.amazoncognito.com/oauth2/idpresponse`
5. Store Client ID and Client Secret as Amplify secrets

### Apple Sign-In Credentials
1. Enroll in [Apple Developer Program](https://developer.apple.com/) ($99/year)
2. Create an App ID with "Sign in with Apple" capability
3. Create a Services ID (this is the `clientId`)
4. Create a private key for Sign in with Apple
5. Store Team ID, Key ID, Client ID, and Private Key as Amplify secrets

---

## Implementation Phases

### Phase 1: Infrastructure & Backend (Lower Risk)
1. Register Google OAuth app and obtain credentials
2. Store secrets in Amplify: `npx ampx sandbox secret set GOOGLE_CLIENT_ID`, etc.
3. Update `amplify/auth/resource.ts` with Google external provider config
4. Update `amplify/functions/post-confirmation/handler.ts` to handle federated users:
   - Detect federated user via `event.userName` prefix
   - Handle missing `preferred_username` (fall back to email prefix)
   - Handle potentially missing `given_name`/`family_name` (Apple only sends on first auth)
   - Validate account linking logic works for federated users
5. Deploy to sandbox and test the OAuth flow end-to-end with Postman/curl

### Phase 2: Frontend Integration
6. Add `signInWithRedirect` to `AuthContext.jsx`
7. Create `SocialLoginButtons.jsx` component
8. Update `LoginForm.jsx` and `RegisterForm.jsx` with social login buttons
9. Handle OAuth redirect callback state (loading, errors)
10. Test full flow: Google button → redirect → callback → session → dashboard

### Phase 3: Apple Sign-In
11. Register Apple Developer account and configure Sign in with Apple
12. Add Apple provider to `amplify/auth/resource.ts`
13. Test Apple flow (requires HTTPS, so must test in deployed environment)

### Phase 4: Account Linking & Edge Cases
14. Test: Email user signs in with Google (same email) — verify profile linking
15. Test: Google user tries email registration (same email) — handle gracefully
16. Test: MFA interaction with federated users (federated users bypass MFA)
17. Add UI to Settings page showing linked identity providers
18. Consider: Allow users to link/unlink providers from Settings

---

## What Does NOT Need to Change

| Component | Why It's Safe |
|-----------|--------------|
| API Gateway HttpUserPoolAuthorizer | Validates Cognito JWTs regardless of auth method |
| JWT middleware (`withAuth`) | Extracts `custom:user_id` — works for all users |
| DynamoDB schema | No schema changes — profile structure is the same |
| Stripe integration | Uses `custom:user_id`, not auth method |
| S3 upload/download | Uses `custom:user_id` for key prefixes |
| SNS notifications | Profile data is the same regardless of auth method |
| All protected API endpoints | Authorization is based on `custom:user_id`, not auth method |

---

## Risk Summary

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Post-confirmation trigger fails for federated users | HIGH | MEDIUM | Defensive attribute handling, thorough testing |
| Account linking creates duplicate profiles | MEDIUM | LOW | Existing email check logic covers this; needs validation |
| Apple requires HTTPS for testing | LOW | HIGH | Test in deployed sandbox, not localhost |
| Users confused by multiple auth methods | LOW | LOW | Clear UI with "or" divider between methods |
| MFA bypass for federated users | LOW | LOW | Cognito handles this correctly — federated users trust the IdP |
| Cognito Plus tier cost increase | LOW | LOW | No per-federation cost; pricing is per-MAU |
| OAuth redirect breaks on mobile browsers | MEDIUM | LOW | Test across browsers; Amplify handles redirect well |

---

## Cost Impact

- **Google OAuth:** Free (Google does not charge for OAuth)
- **Apple Sign-In:** Requires Apple Developer account ($99/year) — you may already have this
- **Cognito:** No additional per-user cost for federated users. You're already on the Plus tier. Pricing is per monthly active user regardless of auth method.
- **Amplify Secrets:** $0.40/secret/month for storing OAuth credentials (~$2-3/month for all secrets)

---

## Open Questions for Discussion

1. **Username for federated users:** When a user signs in with Google, they won't pick a `preferredUsername`. Should we auto-generate one from their email prefix (e.g., `jane` from `jane@gmail.com`) or prompt them to choose one after first login?

2. **Callback URLs:** What are the exact production, dev, and local URLs? The plan assumes `www.neonpanda.ai`, `dev.neonpanda.ai`, and `localhost:5173`.

3. **Apple Developer Account:** Do you already have an Apple Developer enrollment, or is that a new cost/step?

4. **Account linking UI:** Should users be able to link/unlink providers from Settings, or is this a future enhancement?

5. **Mobile app plans:** If a mobile app is planned, Apple Sign-In becomes mandatory on Day 1 per App Store policy. This affects priority.
