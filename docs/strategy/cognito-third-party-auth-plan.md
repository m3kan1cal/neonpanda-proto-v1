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

## Scope: Google Auth Only (Phase 1)

### Google (Gmail) — **Immediate Priority**

**Why:** Largest OAuth provider by market share. Nearly every user has a Google account. Most requested social login option for fitness/consumer apps. Well-documented Cognito integration.

**Cognito Support:** Native first-class support as a social identity provider (not generic OIDC — Cognito has a dedicated Google integration path).

### Future Consideration: Apple
Apple Sign-In is required by App Store policy if any third-party social login is offered. If/when NeonPanda ships a mobile app, Apple becomes mandatory. Deferred for now to reduce scope.

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

// PROPOSED (Google only)
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
        preferredUsername: 'email',  // Auto-generate username from email; user can change later
      }
    },
    // Callback URLs derived from existing domain-utils.ts (amplify/functions/libs/domain-utils.ts)
    callbackUrls: [
      'http://localhost:5173/',          // Sandbox / local dev (isSandbox() || NODE_ENV=development)
      'https://dev.neonpanda.ai/',       // Non-production branches (develop, feature branches)
      'https://neonpanda.ai/',           // Production (main branch)
    ],
    logoutUrls: [
      'http://localhost:5173/',
      'https://dev.neonpanda.ai/',
      'https://neonpanda.ai/',
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
const isFederatedUser = event.userName.startsWith('Google_') ||
                        event.userName.startsWith('google_');

// For federated users:
// 1. preferred_username won't exist → auto-generate from email prefix
//    e.g., "jane@gmail.com" → "jane", with random suffix if taken ("jane_x8k2")
// 2. given_name/family_name come from Google claims (usually populated)
// 3. Still need to generate custom:user_id via nanoid
// 4. Still need to create DynamoDB profile
// 5. Account linking check: does a profile already exist for this email?
//    (existing getUserProfileByEmail logic handles this)
```

**Username Auto-Generation Strategy:**
- Extract email prefix: `email.split('@')[0]`
- Check availability via `getUserProfileByUsername()`
- If taken, append random 4-char suffix: `jane_x8k2`
- Store as both Cognito `preferred_username` and DynamoDB `username`
- User can change later via Settings (see: Username Mutability section below)

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

- `LoginForm.jsx` — Add "Sign in with Google" button above/below the email form, with a divider ("or continue with email").
- `RegisterForm.jsx` — Add the same Google button. Federated sign-in **is** registration for new users (Cognito auto-creates the user).
- `AuthRouter.jsx` — May need to handle the OAuth redirect callback state (user returning from Google).
- `VerifyEmailForm.jsx` — No changes (federated users skip this).
- New component: `SocialLoginButtons.jsx` — Shared component with Google styled button (extensible for future providers).

**Risk:** LOW — Purely additive UI changes. Existing forms remain functional.

---

### 7. Settings Page — Password & Identity Provider Display (`src/components/Settings.jsx`)

**What changes:** The Settings page must adapt to federated users who authenticated via Google and have no Cognito password.

**Password Section (Lines 1091-1162):**
The "Account Security" section currently shows password change fields (current password, new password, confirm). For Google-only users, this section must be **hidden or replaced**:

- **Google-only users** (no linked email/password identity): Hide the password change form entirely. Show a message like "You signed in with Google. Password management is handled by your Google account."
- **Email/password users** (no linked Google): Show the existing password change form as-is.
- **Linked users** (both email/password AND Google): Show the password change form (they have a Cognito password to change).

**Sign-In Methods Section (New):**
Add a "Sign-In Methods" section in Settings showing the user's linked authentication methods with full management capability. This follows the standard pattern used by Strava, Peloton, MyFitnessPal, Notion, and other major platforms.

```
Sign-In Methods
─────────────────────────────────────────────────────────────
✓ Google          jane@gmail.com        [Disconnect]
✓ Email/Password  jane@gmail.com        [Change Password]
─────────────────────────────────────────────────────────────
                                        [+ Link Google Account]
```

**Capabilities:**
- **Display** linked sign-in methods (read from Cognito `identities` claim)
- **Disconnect** a provider (calls `AdminDisableProviderForUser` via new backend endpoint)
- **Link** a new provider (initiates `signInWithRedirect` from Settings page — Cognito auto-links when the same email matches)
- **Set up email/password** for Google-only users (allows them to create a Cognito password as a fallback sign-in method)

**Safety Check — Cannot Disconnect Last Method:**
If a user has only one sign-in method (e.g., Google-only), the "Disconnect" button must be disabled or hidden. Attempting to disconnect the last method would lock the user out. The UI should show a tooltip/message: "You must have at least one sign-in method. Set up email/password before disconnecting Google."

**How to detect auth method:** Cognito federated users have an `identities` attribute (JSON array) in their user attributes. This can be fetched via `fetchUserAttributes()` in `AuthContext.jsx`. The `identities` attribute contains objects like `{ providerName: "Google", providerType: "Google", ... }`. If `identities` is absent or empty, the user is email/password only.

```javascript
// In AuthContext.jsx — expose auth provider info
const attributes = await fetchUserAttributes();
const identities = attributes.identities ? JSON.parse(attributes.identities) : [];
const linkedProviders = identities.map(id => id.providerName); // e.g., ['Google']
const hasGoogle = linkedProviders.includes('Google');
const hasPassword = /* user has a Cognito password (status !== EXTERNAL_PROVIDER) */;
const canDisconnectGoogle = hasGoogle && hasPassword; // At least one other method exists
const canDisconnectPassword = hasPassword && hasGoogle; // At least one other method exists
```

**Risk:** LOW-MEDIUM — Conditional rendering + backend API call for disconnect. The `AdminDisableProviderForUser` Cognito API is straightforward, but the "last method" safety check is critical to get right.

---

### 8. Password Reset Flow — Federated User Handling

**What changes:** The forgot/reset password flow (`ForgotPasswordForm.jsx`, `ResetPasswordForm.jsx`) needs to handle the case where a federated user tries to reset a password they don't have.

**The Problem:** If a Google-only user enters their email in the "Forgot Password" form, Cognito will either:
- Fail silently (no email sent — no password to reset)
- Return an error depending on how the user was created

**What Must Change:**

1. **`ForgotPasswordForm.jsx`** — After the user submits their email, if the reset fails with a federated-user-related error, show a helpful message: "This email is linked to a Google account. Please sign in with Google instead." with a button to redirect to Google sign-in.

2. **`AuthContext.jsx` (`handleResetPassword`)** — Catch the specific Cognito error for federated users and surface it as a recognizable error type so the UI can respond appropriately.

3. **Alternative approach (simpler):** Before calling `resetPassword()`, check if the email belongs to a federated-only user by calling the existing `check-user-availability` endpoint. However, this leaks information about which emails are registered, so the error-handling approach is preferred.

**Risk:** LOW — Graceful error handling. The worst case without this change is a confusing "no reset email received" experience for Google users.

---

### 9. User Availability Check (`amplify/functions/check-user-availability/handler.ts`)

**What changes:** Currently checks if email/username is taken via `ListUsers`. Federated users will appear in the user pool with usernames like `Google_123456789`. The email filter still works (Cognito indexes email regardless of auth method). Username checks may need awareness that federated users might not have `preferred_username` set.

**Risk:** LOW — Minor defensive coding.

---

### 10. Account Link/Unlink Backend API (New Endpoint)

**What changes:** A new API endpoint is needed to allow users to disconnect a linked identity provider from their account. Cognito provides native APIs for this, but they require admin-level credentials (not client-side callable).

**New endpoint: `POST /api/user/identity-providers`**

```typescript
// Action: disconnect — removes a linked federated identity
// Uses: AdminDisableProviderForUser (Cognito API)
{
  action: 'disconnect',
  provider: 'Google',  // The provider to disconnect
}

// Action: list — returns the user's linked providers (alternative to client-side fetch)
// Uses: AdminGetUser (Cognito API) → reads identities attribute
{
  action: 'list',
}
```

**Cognito APIs used:**
- **`AdminDisableProviderForUser`** — Unlinks a federated identity from a user pool account. After unlinking, the user can no longer sign in via that provider for this account. Requires `ProviderName` (e.g., "Google") and `ProviderAttributeValue` (the user's ID from that provider).
- **`AdminLinkProviderForUser`** — Links a federated identity to an existing user pool account. Used during the post-confirmation trigger for auto-linking (same email). Could also be exposed for manual linking, but the simpler approach is to let Cognito handle linking automatically when the user signs in with Google from the Settings page.

**Safety check (server-side):** Before disconnecting a provider, the endpoint must verify the user has at least one other sign-in method. This is the **server-side enforcement** of the "cannot disconnect last method" rule — the frontend guard is a UX convenience, but the backend must be the source of truth.

```typescript
// Before disconnecting:
// 1. Fetch user from Cognito (AdminGetUser)
// 2. Check identities array length + whether user has a Cognito password (UserStatus !== EXTERNAL_PROVIDER)
// 3. If this is the last method, return 400: "Cannot disconnect your only sign-in method"
```

**Risk:** MEDIUM — New API endpoint with admin-level Cognito calls. The `AdminDisableProviderForUser` call is straightforward, but the "last method" check requires careful logic to cover all states (Google-only, password-only, both).

---

### 11. Profile Update & Cognito Sync (`amplify/functions/libs/user/cognito.ts`)

**What changes:** The `syncProfileToCognito` function uses `AdminUpdateUserAttributes` to push profile changes back to Cognito. For federated users, some attributes may be read-only (mapped from the IdP). Attempting to update IdP-mapped attributes will fail silently or throw.

**Mitigation:** Check if user is federated before syncing mapped attributes, or wrap in try/catch (which it already does — best-effort pattern).

**Risk:** LOW — Existing error handling covers this.

---

## User Profile Type Changes

The `UserProfile` interface (`amplify/functions/libs/user/types.ts`) currently has no field for auth provider information. Since we're now building full link/unlink management in Settings, we need to surface this data.

**Approach: Derive from Cognito at runtime (no schema change)**
- **Frontend:** Use `fetchUserAttributes()` in `AuthContext.jsx` to read the `identities` attribute. Expose `linkedProviders`, `hasGoogle`, `hasPassword`, and derived flags like `canDisconnectGoogle`.
- **Backend (identity-providers endpoint):** Use `AdminGetUser` to read the user's `identities` attribute and `UserStatus` to determine sign-in methods. This is the source of truth for the "last method" safety check.
- **No DynamoDB schema change needed.** Cognito is the single source of truth for linked identities. Storing a copy in DynamoDB would create drift risk, especially with link/unlink operations.

**Note:** The `identities` claim is also present in the user's **ID token** (JWT), which means the frontend can read it without an extra API call on every page load. It only needs a fresh `fetchUserAttributes()` call after a link/unlink operation to refresh the state.

---

## Username Mutability (Enabling Username Changes)

### Current State

The `preferred_username` attribute in Cognito is already configured as **mutable** (`amplify/auth/resource.ts:17`). The immutability is enforced only at the **application layer** in the API handler:

```typescript
// amplify/functions/update-user-profile/handler.ts:22-24
if (updates.email || updates.username) {
  return createErrorResponse(400, 'Email and username cannot be changed');
}
```

Critically, the DynamoDB layer (`amplify/dynamodb/user-profile.ts:209-211`) **already handles GSI key updates** when the profile is saved:

```typescript
// Lines 209-211 — GSI keys are recalculated on every save
gsi1pk: `email#${updatedProfile.email}`,
gsi2pk: `username#${updatedProfile.username}`,
```

This means the data layer supports username changes today — we just need to unlock it at the API layer.

### What Changes

1. **`update-user-profile/handler.ts`** — Allow `username` updates (keep `email` immutable):
   - Remove `username` from the immutable fields check
   - Add username validation: length, allowed characters, no profanity
   - Check availability via `getUserProfileByUsername()` before accepting
   - Sync to Cognito `preferred_username` via `AdminUpdateUserAttributes`

2. **`Settings.jsx`** — Make the username field editable:
   - Currently displays as read-only (line 1017-1019)
   - Add inline editing with availability check (debounced API call to `check-user-availability`)
   - Show validation feedback (taken, too short, invalid characters)

3. **`check-user-availability/handler.ts`** — Already supports `?type=username&value=<value>`, no changes needed.

### Risk

**LOW** — The DynamoDB layer already recalculates GSI keys on save. Cognito `preferred_username` is already mutable. The only change is removing the app-level guard and adding proper validation.

**Edge case:** If two users race to claim the same username, DynamoDB's `PutItem` with the GSI won't enforce uniqueness natively (GSIs are eventually consistent and allow duplicates). Mitigation: Use a `ConditionExpression` or check-then-write with optimistic locking pattern. However, this is a rare edge case and can be addressed as a follow-up.

---

## Pre-Requisites (External Setup)

### Google OAuth Credentials
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Google Identity" API
3. Create OAuth 2.0 Client ID (Web application type)
4. Set authorized redirect URI to: `https://neonpanda-auth.auth.<region>.amazoncognito.com/oauth2/idpresponse`
5. Store Client ID and Client Secret as Amplify secrets

---

## Implementation Phases

### Phase 1: Infrastructure & Backend
1. Register Google OAuth app in Google Cloud Console and obtain credentials
2. Store secrets in Amplify: `npx ampx sandbox secret set GOOGLE_CLIENT_ID`, etc.
3. Update `amplify/auth/resource.ts` with Google external provider config and callback URLs
4. Update `amplify/functions/post-confirmation/handler.ts` to handle federated users:
   - Detect federated user via `event.userName` prefix (`Google_` / `google_`)
   - Auto-generate `preferred_username` from email prefix (with availability check + random suffix fallback)
   - Handle potentially missing `given_name`/`family_name` gracefully
   - Validate existing account linking logic works for federated users (same email)
5. Deploy to sandbox and test the OAuth flow end-to-end

### Phase 2: Frontend Integration — Auth Flow
6. Add `signInWithRedirect` to `AuthContext.jsx`
7. Expose `identities` / `linkedProviders` / `hasPassword` from `fetchUserAttributes()` in AuthContext
8. Create `SocialLoginButtons.jsx` component (Google button, extensible for future providers)
9. Update `LoginForm.jsx` and `RegisterForm.jsx` with Google sign-in button + "or" divider
10. Handle OAuth redirect callback state (loading spinner, error handling)
11. Test full flow: Google button → redirect → callback → session → dashboard

### Phase 3: Settings — Sign-In Methods & Password Management
12. Build "Sign-In Methods" section in `Settings.jsx`:
    - Display linked providers (Google, Email/Password) with status indicators
    - "Disconnect" button for each linked provider (calls new backend endpoint)
    - "Link Google Account" button for email-only users (initiates `signInWithRedirect`)
    - "Set Up Email/Password" option for Google-only users
13. Implement "cannot disconnect last sign-in method" safety check:
    - Frontend: disable Disconnect button when only one method is linked, show tooltip explaining why
    - Backend: server-side enforcement in the identity-providers API endpoint (return 400 if last method)
14. Create new API endpoint `POST /api/user/identity-providers`:
    - `action: 'disconnect'` — calls `AdminDisableProviderForUser` (with last-method guard)
    - `action: 'list'` — returns linked providers (fallback if client-side fetch is insufficient)
15. Update password section visibility:
    - Hidden for Google-only users (show "Managed by Google" message instead)
    - Visible for email/password users (existing behavior)
    - Visible for linked users with a Cognito password (both methods)
16. Update `ForgotPasswordForm.jsx` — handle federated user error gracefully:
    - Catch Cognito error for Google-only users attempting password reset
    - Show "This email uses Google sign-in" message with redirect button

### Phase 4: Username Mutability
17. Update `update-user-profile/handler.ts` — remove `username` from immutable fields guard
18. Add username validation (3-30 chars, alphanumeric + underscores, availability check)
19. Sync username changes to Cognito `preferred_username` via `AdminUpdateUserAttributes`
20. Update `Settings.jsx` — make username field editable with inline availability check
21. Test: change username, verify GSI-2 updates, verify old username is freed up

### Phase 5: Integration Testing & Edge Cases
22. Test: Email user signs in with Google (same email) — verify auto-linking works
23. Test: Google user tries email registration (same email) — handle gracefully
24. Test: Disconnect Google from Settings (with email/password as fallback) — verify sign-in still works
25. Test: Attempt to disconnect last sign-in method — verify frontend + backend both block it
26. Test: Google-only user sets up email/password, then disconnects Google — verify full flow
27. Test: Google-only user attempts password reset — verify graceful redirect to Google sign-in
28. Test: MFA interaction with federated users (federated users bypass Cognito MFA)
29. Test: Username auto-generation collision handling
30. Test: Username change from Settings with availability check

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
| User disconnects last sign-in method and gets locked out | HIGH | LOW | Frontend disables button + backend returns 400 (dual enforcement) |
| Account linking creates duplicate profiles | MEDIUM | LOW | Existing email check logic covers this; needs validation |
| Google user tries password reset (no password exists) | MEDIUM | MEDIUM | Catch Cognito error, show "Sign in with Google" message |
| AdminDisableProviderForUser fails or partially completes | MEDIUM | LOW | Wrap in error handling, refresh identities from Cognito after call |
| Username collision during auto-generation | LOW | LOW | Check availability + random suffix fallback |
| Username change race condition (two users claim same) | LOW | LOW | Rare; mitigate with conditional write or follow-up |
| Settings page shows password form to Google-only user | LOW | MEDIUM | Derive auth method from Cognito `identities` attribute |
| Users confused by multiple auth methods | LOW | LOW | Clear UI with "or" divider between methods |
| MFA bypass for federated users | LOW | LOW | Cognito handles this correctly — federated users trust the IdP |
| Cognito Plus tier cost increase | LOW | LOW | No per-federation cost; pricing is per-MAU |
| OAuth redirect breaks on mobile browsers | MEDIUM | LOW | Test across browsers; Amplify handles redirect well |

---

## Cost Impact

- **Google OAuth:** Free (Google does not charge for OAuth)
- **Cognito:** No additional per-user cost for federated users. Already on Plus tier. Pricing is per monthly active user regardless of auth method.
- **Amplify Secrets:** $0.40/secret/month for storing OAuth credentials (~$0.80/month for Google client ID + secret)

---

## Decisions Made

1. **Scope:** Google only for now. Apple deferred until mobile app plans materialize.
2. **Username for federated users:** Auto-generate from email prefix (e.g., `jane` from `jane@gmail.com`). If taken, append random suffix (`jane_x8k2`). User can change later in Settings.
3. **Username mutability:** Enable username changes for all users (not just federated). Cognito `preferred_username` is already mutable; DynamoDB GSI updates are already handled by the data layer. Only the API handler guard needs to be relaxed.
4. **Username validation rules:** 3-30 characters, alphanumeric + underscores only (`/^[a-zA-Z0-9_]{3,30}$/`).
5. **Callback URLs:** Confirmed from existing `amplify/functions/libs/domain-utils.ts`: `http://localhost:5173` (sandbox), `https://dev.neonpanda.ai` (non-prod branches), `https://neonpanda.ai` (production/main).
6. **Settings page — complete Sign-In Methods management:** Ship a full "Sign-In Methods" section in Settings (Phase 3). Users can view linked providers, disconnect a provider, link Google, and set up email/password. This follows the universal pattern used by Strava, Peloton, MyFitnessPal, Notion, and other major platforms. Users expect a complete experience here.
7. **Password section visibility:** Conditionally show/hide password change section based on auth method. Derive auth method from Cognito `identities` attribute at runtime (no UserProfile schema change).
8. **Password reset for Google users:** Handle gracefully in ForgotPasswordForm — catch Cognito error and redirect to Google sign-in instead.
9. **Cannot disconnect last sign-in method:** Dual enforcement — frontend disables the Disconnect button with tooltip explanation, backend returns 400 as the source-of-truth safety net. Users must set up an alternative method before disconnecting their only one.

## Remaining Open Questions

None — all decisions have been made. Ready for implementation.
