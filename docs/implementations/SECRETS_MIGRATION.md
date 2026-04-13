# Secrets Migration: Environment Variables → Amplify Secrets

## Overview

Sensitive values previously stored as Amplify Console environment variables have been migrated to Amplify Secrets (backed by AWS SSM Parameter Store). Secrets are referenced in `backend.ts` via the `secret()` helper from `@aws-amplify/backend` and resolved at Lambda runtime — they are **not** available during the `amplify.yml` build phase.

---

## Secrets Now Managed in Amplify Secret Store

These are set via `npx ampx secret set <NAME>` per branch/environment.

| Secret Name                      | Used In                                             | `backend.ts` Reference                             |
| -------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID`               | Cognito Google OAuth                                | `amplify/auth/resource.ts`                         |
| `GOOGLE_CLIENT_SECRET`           | Cognito Google OAuth                                | `amplify/auth/resource.ts`                         |
| `PINECONE_API_KEY`               | All Lambda functions                                | `allFunctions` + `jobsAndScheduledFunctions` loops |
| `STRIPE_SECRET_KEY`              | `createStripePortalSession`, `processStripeWebhook` | Stripe functions loop                              |
| `STRIPE_WEBHOOK_SECRET`          | `processStripeWebhook`                              | Direct assignment                                  |
| `GOOGLE_CHAT_ERRORS_WEBHOOK_URL` | `forwardLogsToSns`                                  | Direct assignment                                  |

---

## Post-Deploy Cleanup Checklist

Once each environment is confirmed deployed and healthy, remove the following from the **Amplify Console → App settings → Environment variables** section:

### Safe to Remove Immediately

- [ ] `STRIPE_SECRET_KEY` — fully covered by `secret("STRIPE_SECRET_KEY")` at Lambda runtime; not referenced in `amplify.yml`
- [ ] `STRIPE_WEBHOOK_SECRET` — fully covered by `secret("STRIPE_WEBHOOK_SECRET")` at Lambda runtime; not referenced in `amplify.yml`
- [ ] `GOOGLE_CHAT_ERRORS_WEBHOOK_URL` — fully covered by `secret("GOOGLE_CHAT_ERRORS_WEBHOOK_URL")` at Lambda runtime; not referenced in `amplify.yml`

### Requires Additional Work Before Removing

- [ ] `PINECONE_API_KEY` — still echoed into `.env` during the build phase in `amplify.yml` (line 15: `echo "PINECONE_API_KEY=$PINECONE_API_KEY" >> .env`). Before removing from Console env vars:
  1. Confirm no tests in `npm test` (Vitest) require live Pinecone access during CI
  2. Remove the `echo "PINECONE_API_KEY=..."` line from `amplify.yml`
  3. Remove `PINECONE_API_KEY` from the Console env vars

---

## Must Stay as Console Environment Variables

These cannot be moved to Amplify Secrets because they are needed **at CDK synthesis / build time**, not Lambda runtime.

| Variable                           | Reason                                                              |
| ---------------------------------- | ------------------------------------------------------------------- |
| `ELECTRICPANDA_PRICE_ID`           | Read via `process.env` during CDK synth in `backend.ts` (line 1487) |
| `EARLYPANDA_PRICE_ID`              | Read via `process.env` during CDK synth in `backend.ts` (line 1491) |
| `DYNAMODB_TABLE_NAME`              | Echoed into `.env` in `amplify.yml` for build/test use              |
| `VITE_USE_LAMBDA_STREAMING`        | Baked into frontend bundle at build time                            |
| `VITE_EARLY_PANDA_PAYMENT_LINK`    | Baked into frontend bundle at build time                            |
| `VITE_ELECTRIC_PANDA_PAYMENT_LINK` | Baked into frontend bundle at build time                            |
| `VITE_STRIPE_PUBLISHABLE_KEY`      | Baked into frontend bundle at build time                            |

---

## Setting Secrets Per Environment

```bash
# Sandbox
export AWS_REGION="us-west-2"
npx ampx sandbox --profile midgard-sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox --profile midgard-sandbox secret set GOOGLE_CLIENT_SECRET
npx ampx sandbox --profile midgard-sandbox secret set PINECONE_API_KEY
npx ampx sandbox --profile midgard-sandbox secret set STRIPE_SECRET_KEY
npx ampx sandbox --profile midgard-sandbox secret set STRIPE_WEBHOOK_SECRET
npx ampx sandbox --profile midgard-sandbox secret set GOOGLE_CHAT_ERRORS_WEBHOOK_URL

# Deployed branches (develop, main) — set via Amplify Console:
# Amplify Console → Hosting → <branch> → Secrets
```

---

## Google Cloud Console — Authorized Redirect URIs

Google OAuth requires the Cognito hosted UI callback URL (not the app URL) in the
**Authorized redirect URIs** list for your OAuth 2.0 client.

Each Amplify branch has its own Cognito User Pool and domain.

| Environment | User Pool ID          | Redirect URI to add in Google Console                                              |
| ----------- | --------------------- | ---------------------------------------------------------------------------------- |
| sandbox     | `us-west-2_sfQvtEAQo` | `https://bd019b77ccb1376fc79e.auth.us-west-2.amazoncognito.com/oauth2/idpresponse` |
| develop     | `us-west-2_2dpTb6ahQ` | `https://976b8cbaf9d69167ce82.auth.us-west-2.amazoncognito.com/oauth2/idpresponse` |
| main        | `us-west-2_EGoob42iU` | Add after main pipeline deploys — domain not yet provisioned                       |

To look up the main domain once deployed:

```bash
AWS_PROFILE=midgard-sandbox AWS_REGION=us-west-2 \
  aws cognito-idp describe-user-pool \
  --user-pool-id us-west-2_EGoob42iU \
  --query 'UserPool.Domain' --output text
```

**Note:** `callbackUrls` in `amplify/auth/resource.ts` (pointing to `localhost`, `dev.neonpanda.ai`, etc.)
are separate — those are where Cognito redirects back to the app after auth. They do **not** go in Google Console.

---

## Status

| Environment | Secrets Deployed | Console Vars Cleaned Up | Google Redirect URI Added    |
| ----------- | ---------------- | ----------------------- | ---------------------------- |
| sandbox     | ✅               | ⬜                      | ⬜                           |
| develop     | ⬜               | ⬜                      | ⬜                           |
| main        | ⬜               | ⬜                      | ⬜ (domain not yet deployed) |
