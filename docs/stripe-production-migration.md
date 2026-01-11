# Stripe Production Migration Guide

Complete guide for migrating NeonPanda's Stripe integration from test mode to production mode.

**Estimated Time**: 2-3 hours (including Stripe approval wait time)
**Difficulty**: Moderate
**Risk**: Low (can rollback quickly)

---

## 🎯 Current Progress

**Status**: Phase 1 - Stripe Dashboard Setup (60% complete)

**Completed**:

- ✅ Business verification approved
- ✅ Switched to Live mode
- ✅ Products created (EarlyPanda & ElectricPanda)
- ✅ Payment links configured

**Next**: Retrieve API keys and configure webhooks (Steps 1.4-1.5)

---

## Table of Contents

1. [Quick Checklist](#quick-checklist)
2. [Values to Collect](#values-to-collect)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Testing Procedures](#testing-procedures)
6. [Rollback Instructions](#rollback-instructions)
7. [Security Guidelines](#security-guidelines)
8. [Reference](#reference)

---

## Quick Checklist

Use this condensed checklist as you work through the migration:

### Before You Start

- [x] Complete Stripe business verification
- [x] Wait for Stripe approval
- [x] Ensure production environment is stable

### In Stripe Dashboard (Live Mode)

- [x] Create "EarlyPanda" product ($0/month) → Get `price_xxxxx`
- [x] Create "ElectricPanda" product ($20/month) → Get `price_xxxxx`
- [x] Create Payment Link for ElectricPanda → Get `https://buy.stripe.com/xxxxx`
  - Set redirect: `https://neonpanda.ai/welcome?session_id={CHECKOUT_SESSION_ID}`
- [x] Get Secret Key from API Keys → Get `sk_live_xxxxx`
- [x] Create Webhook endpoint: `https://api-prod.neonpanda.ai/stripe/webhook`
  - Events: `customer.subscription.*`, `checkout.session.completed`, `invoice.payment_*`
  - Get webhook secret → Get `whsec_xxxxx`

### In AWS Amplify Console

- [x] Navigate to production branch environment variables
- [x] Set `STRIPE_SECRET_KEY` = live secret key
- [x] Set `STRIPE_WEBHOOK_SECRET` = webhook secret
- [x] Set `ELECTRICPANDA_PRICE_ID` = ElectricPanda price ID
- [x] Set `EARLYPANDA_PRICE_ID` = EarlyPanda price ID
- [x] Set `VITE_ELECTRIC_PANDA_PAYMENT_LINK` = payment link URL
- [x] Save and deploy

### Testing (Test Mode First) **← YOU ARE HERE**

- [ ] Wait for deployment to complete (check Amplify Console)
- [ ] Test webhook with "Send test webhook" in Stripe
- [ ] Test full signup flow with test card `4242 4242 4242 4242`
- [ ] Verify subscription status updates
- [ ] Test customer portal (manage subscription)

### Testing (Live Mode - Real Money!)

- [ ] Switch to live mode
- [ ] Test with real credit card (small amount)
- [ ] Verify payment processes
- [ ] Verify subscription activates
- [ ] Test customer portal
- [ ] Refund test payment

### Go Live

- [ ] Monitor first 10-20 real subscriptions
- [ ] Check webhook logs in CloudWatch
- [ ] Verify DynamoDB subscription records
- [ ] Announce to users

---

## Values to Collect

As you work through Stripe Dashboard, record these values in a secure location (password manager, NOT in git):

### Environment Variables Template

```bash
# Collect these values during migration:
STRIPE_SECRET_KEY_PROD=sk_live_
STRIPE_WEBHOOK_SECRET_PROD=whsec_
ELECTRICPANDA_PRICE_ID_PROD=price_
EARLYPANDA_PRICE_ID_PROD=price_
VITE_ELECTRIC_PANDA_PAYMENT_LINK_PROD=https://buy.stripe.com/
```

### Values Mapping Reference

| Environment Variable               | Source in Stripe                                    |
| ---------------------------------- | --------------------------------------------------- |
| `STRIPE_SECRET_KEY`                | Developers → API Keys → Secret Key (live mode)      |
| `STRIPE_WEBHOOK_SECRET`            | Developers → Webhooks → [endpoint] → Signing Secret |
| `ELECTRICPANDA_PRICE_ID`           | Products → ElectricPanda → Price ID                 |
| `EARLYPANDA_PRICE_ID`              | Products → EarlyPanda → Price ID                    |
| `VITE_ELECTRIC_PANDA_PAYMENT_LINK` | Payment Links → ElectricPanda → Link URL            |

---

## Prerequisites

- [ ] Access to Stripe Dashboard (https://dashboard.stripe.com)
- [ ] Access to AWS Amplify Console
- [ ] Admin access to the NeonPanda production environment
- [ ] Completed business verification in Stripe (required for live mode)

---

## Step-by-Step Migration

## Phase 1: Stripe Dashboard Preparation

### Step 1.1: Complete Stripe Business Verification ✅ COMPLETED

- [x] Log into Stripe Dashboard
- [x] Navigate to **Settings → Business settings → Public details**
- [x] Ensure all required business information is complete:
  - Business legal name
  - Business address
  - Business phone number
  - Tax ID (EIN)
  - Bank account information (for payouts)
- [x] Complete any outstanding verification requests from Stripe
- [x] Wait for Stripe approval (usually 1-3 business days)

### Step 1.2: Create Production Products & Prices ✅ COMPLETED

Navigate to **Products** in Stripe Dashboard (live mode):

#### EarlyPanda Product (Free Tier) ✅

- [x] Click **"Add Product"**
- [x] Set name: `EarlyPanda`
- [x] Set description: `Free tier access to NeonPanda with all current features`
- [x] Create price:
  - Type: `Recurring`
  - Price: `$0.00`
  - Billing period: `Monthly`
- [x] Click **"Save product"**
- [x] **Copy the Price ID** (format: `price_xxxxx`)
  - Save as: `EARLYPANDA_PRICE_ID_PROD`

#### ElectricPanda Product (Paid Tier) ✅

- [x] Click **"Add Product"**
- [x] Set name: `ElectricPanda`
- [x] Set description: `Premium access to NeonPanda with founding member benefits`
- [x] Create price:
  - Type: `Recurring`
  - Price: `$20.00 USD`
  - Billing period: `Monthly`
- [x] Click **"Save product"**
- [x] **Copy the Price ID** (format: `price_xxxxx`)
  - Save as: `ELECTRICPANDA_PRICE_ID_PROD`

### Step 1.3: Create Production Payment Links ✅ COMPLETED

Navigate to **Payment Links** in Stripe Dashboard (live mode):

#### ElectricPanda Payment Link ✅

- [x] Click **"New"** (or copied from sandbox)
- [x] Select the ElectricPanda product created above
- [x] Configure settings:
  - Allow promotion codes: `Yes` (optional)
  - Collect billing address: `Yes` (recommended)
  - Collect shipping address: `No`
  - After payment, redirect customers to: `https://neonpanda.ai/welcome?session_id={CHECKOUT_SESSION_ID}`
  - Allow customers to update their quantity: `No`
- [x] Click **"Create link"**
- [x] **Copy the Payment Link URL** (format: `https://buy.stripe.com/xxxxx`)
  - Save as: `VITE_ELECTRIC_PANDA_PAYMENT_LINK_PROD`

**Note**: Payment links successfully copied from sandbox to live mode.

### Step 1.4: Retrieve Production API Keys **← NEXT STEP**

- [ ] Navigate to **Developers → API keys** in Stripe Dashboard
- [ ] Ensure you are in **Live mode** (toggle in top-right)
- [ ] **Copy the Publishable key** (format: `pk_live_xxxxx`)
  - Save as: `STRIPE_PUBLISHABLE_KEY_PROD` (Note: Not currently used in backend, but keep for reference)
- [ ] Click **"Reveal test key token"** for Secret key
- [ ] **Copy the Secret key** (format: `sk_live_xxxxx`)
  - Save as: `STRIPE_SECRET_KEY_PROD`
  - ⚠️ **CRITICAL**: Treat this like a password - never commit to git

**Action Required**: Copy these keys to a secure location (password manager) before proceeding.

### Step 1.5: Configure Production Webhooks

Navigate to **Developers → Webhooks** in Stripe Dashboard (live mode):

#### Production Webhook

- [ ] Click **"Add endpoint"**
- [ ] Endpoint URL: `https://api-prod.neonpanda.ai/stripe/webhook`
- [ ] Description: `NeonPanda Production Webhook`
- [ ] Select events to listen to:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Click **"Add endpoint"**
- [ ] Click on the newly created endpoint
- [ ] Click **"Reveal"** under Signing secret
- [ ] **Copy the webhook signing secret** (format: `whsec_xxxxx`)
  - Save as: `STRIPE_WEBHOOK_SECRET_PROD`

---

## Phase 2: Environment Variable Configuration

### Step 2.1: Update AWS Amplify Console Environment Variables

#### For Production Branch

- [ ] Log into AWS Amplify Console
- [ ] Navigate to your NeonPanda app
- [ ] Select the **production** branch (likely `main` or `prod`)
- [ ] Click **Environment variables** in left sidebar
- [ ] Add/Update the following variables:

| Variable Name                      | Value                          | Source                        |
| ---------------------------------- | ------------------------------ | ----------------------------- |
| `STRIPE_SECRET_KEY`                | `sk_live_xxxxx`                | From Step 1.4                 |
| `STRIPE_WEBHOOK_SECRET`            | `whsec_xxxxx`                  | From Step 1.5                 |
| `ELECTRICPANDA_PRICE_ID`           | `price_xxxxx`                  | From Step 1.2 (ElectricPanda) |
| `EARLYPANDA_PRICE_ID`              | `price_xxxxx`                  | From Step 1.2 (EarlyPanda)    |
| `VITE_ELECTRIC_PANDA_PAYMENT_LINK` | `https://buy.stripe.com/xxxxx` | From Step 1.3                 |

- [ ] Click **"Save"** after adding all variables

### Step 2.2: Update Local Development Environment (Optional)

If you want to test production keys locally (not recommended for regular development):

- [ ] Create `.env.local.prod` file (add to `.gitignore`)
- [ ] Add the same variables as above
- [ ] Never commit this file to version control

---

## Phase 3: Code Verification

### Step 3.1: Verify Backend Configuration

No code changes needed, but verify these files are correct:

- [ ] Review `amplify/backend.ts` (lines 905-928)
  - Confirms environment variables are passed to Lambda functions
- [ ] Review `amplify/functions/process-stripe-webhook/handler.ts`
  - Confirms Stripe SDK initialization uses `process.env.STRIPE_SECRET_KEY`
- [ ] Review `amplify/functions/create-stripe-portal-session/handler.ts`
  - Confirms Stripe SDK initialization uses `process.env.STRIPE_SECRET_KEY`
- [ ] Review `amplify/functions/libs/subscription/stripe-helpers.ts`
  - Confirms price ID mapping uses environment variables

### Step 3.2: Verify Frontend Configuration

No code changes needed, but verify:

- [ ] Review `src/utils/apis/subscriptionApi.js` (line 74)
  - Confirms payment link uses `import.meta.env.VITE_ELECTRIC_PANDA_PAYMENT_LINK`

---

## Testing Procedures

## Phase 4: Deployment & Testing

### Step 4.1: Deploy to Production

- [ ] Commit any final changes (if any) to your production branch
- [ ] Push to trigger Amplify deployment
- [ ] Monitor deployment in Amplify Console
- [ ] Wait for deployment to complete successfully

### Step 4.2: Test Webhook Endpoint

- [ ] Navigate to Stripe Dashboard → Developers → Webhooks
- [ ] Click on your production webhook endpoint
- [ ] Click **"Send test webhook"**
- [ ] Select `customer.subscription.created` event
- [ ] Click **"Send test webhook"**
- [ ] Verify response status is `200 OK`
- [ ] Check CloudWatch logs for successful processing

### Step 4.3: Test Complete User Flow (Test Mode First)

⚠️ **Important**: Before testing with real money, do a final test in test mode:

- [ ] Temporarily switch Stripe back to test mode in dashboard
- [ ] Navigate to your production app at `https://neonpanda.ai`
- [ ] Create a new test account or log in with test account
- [ ] Navigate to Settings → Subscription
- [ ] Click **"Upgrade to ElectricPanda"**
- [ ] Use test card: `4242 4242 4242 4242` (any future expiry, any CVC)
- [ ] Complete checkout
- [ ] Verify redirect to welcome page
- [ ] Verify subscription status updates correctly
- [ ] Verify webhook events appear in Stripe Dashboard
- [ ] Test subscription management (cancel, reactivate)

### Step 4.4: Test Live Payment Flow

⚠️ **Use a real payment method - you will be charged!**

- [ ] Switch Stripe to live mode in dashboard (all webhooks and keys should be production)
- [ ] Navigate to `https://neonpanda.ai`
- [ ] Create a new account with a real email
- [ ] Navigate to Settings → Subscription
- [ ] Click **"Upgrade to ElectricPanda"**
- [ ] Use a real credit card (recommend using a card you control for testing)
- [ ] Complete checkout
- [ ] Verify redirect to welcome page
- [ ] Verify subscription status updates to "ElectricPanda"
- [ ] Check Stripe Dashboard for successful payment
- [ ] Verify webhook events processed correctly
- [ ] Test Customer Portal:
  - [ ] Navigate to Settings → Manage Subscription
  - [ ] Verify portal opens correctly
  - [ ] Test updating payment method
  - [ ] Test canceling subscription (then reactivate)

### Step 4.5: Refund Test Payment

- [ ] Navigate to Stripe Dashboard → Payments
- [ ] Find your test payment
- [ ] Click **"Refund"**
- [ ] Refund the full amount
- [ ] Verify webhook processes cancellation correctly

---

## Phase 5: Monitoring & Rollout

### Step 5.1: Set Up Monitoring

- [ ] Configure Stripe email notifications:
  - Navigate to Settings → Notifications
  - Enable alerts for failed payments, disputes, etc.
- [ ] Set up CloudWatch alarms for webhook failures
- [ ] Monitor SNS alerts (already configured via `publishStripeAlertNotification`)

### Step 5.2: Update Documentation

- [ ] Update `NOTES_MLF.md` with production values
  - ⚠️ **Only store non-sensitive info** (Product IDs, webhook URLs)
  - ⚠️ **Never commit secret keys or webhook secrets**
- [ ] Document rollback procedure (see below)
- [ ] Update team documentation with production Stripe access

#### Recommended NOTES_MLF.md Entry

After migration, add this to your notes (with actual values):

```markdown
## Stripe Production Configuration

### Products & Pricing

- EarlyPanda (Free Tier)
  - Product: prod_xxxxx
  - Price: price_xxxxx ($0/month)

- ElectricPanda (Paid Tier)
  - Product: prod_xxxxx
  - Price: price_xxxxx ($20/month)
  - Payment Link: https://buy.stripe.com/xxxxx

### Webhook Endpoints

- Production: https://api-prod.neonpanda.ai/stripe/webhook
- Develop: https://api-dev.neonpanda.ai/stripe/webhook
- Sandbox: https://0bvali2kzd.execute-api.us-west-2.amazonaws.com/stripe/webhook

### Environment Variables (AWS Amplify Console)

All sensitive keys stored in AWS Amplify Console environment variables:

- STRIPE_SECRET_KEY (production: sk_live_xxxxx)
- STRIPE_WEBHOOK_SECRET (production: whsec_xxxxx)
- ELECTRICPANDA_PRICE_ID (production: price_xxxxx)
- EARLYPANDA_PRICE_ID (production: price_xxxxx)
- VITE_ELECTRIC_PANDA_PAYMENT_LINK (production: https://buy.stripe.com/xxxxx)

**Migration Completed**: [DATE]
**Migration Guide**: docs/stripe-production-migration.md
```

### Step 5.3: Gradual Rollout (Recommended)

- [ ] Announce to existing beta users that paid subscriptions are now available
- [ ] Monitor first 10-20 subscriptions closely
- [ ] Check for any webhook processing errors
- [ ] Verify all subscription states are correct in DynamoDB

---

## Rollback Instructions

## Phase 6: Rollback Procedure (If Needed)

If issues arise, quickly rollback:

### Quick Rollback Steps

- [ ] Navigate to AWS Amplify Console
- [ ] Select production branch
- [ ] Click **Environment variables**
- [ ] Replace production Stripe keys with test keys:
  - `STRIPE_SECRET_KEY` → test key (sk*test*...)
  - `STRIPE_WEBHOOK_SECRET` → test webhook secret
  - `ELECTRICPANDA_PRICE_ID` → test price ID
  - `EARLYPANDA_PRICE_ID` → test price ID
  - `VITE_ELECTRIC_PANDA_PAYMENT_LINK` → test payment link
- [ ] Save and redeploy
- [ ] In Stripe Dashboard, pause live webhook endpoint (don't delete)
- [ ] Communicate issue to any affected users

---

## Security Guidelines

### Security Checklist

- [ ] All production Stripe keys stored in AWS Amplify Console only
- [ ] No Stripe secret keys committed to git repository
- [ ] `.env.local` and `.env.local.prod` in `.gitignore`
- [ ] Webhook endpoint uses HTTPS only
- [ ] Webhook signature verification enabled (already in code)
- [ ] Production webhook secret different from test
- [ ] API Gateway logs redact sensitive headers
- [ ] CloudWatch logs don't expose secret keys

### Safe to Commit (Public/Non-Sensitive)

These values can be stored in `NOTES_MLF.md` or documentation:

- ✅ Publishable keys (pk_live_xxxxx)
- ✅ Product IDs (prod_xxxxx)
- ✅ Price IDs (price_xxxxx)
- ✅ Payment Link URLs (https://buy.stripe.com/xxxxx)
- ✅ Webhook endpoint URLs

### NEVER Commit (Secret/Sensitive)

These values must ONLY be stored in AWS Amplify Console:

- ❌ Secret keys (sk_live_xxxxx)
- ❌ Webhook signing secrets (whsec_xxxxx)
- ❌ Any credentials or tokens

### Secure Storage Options

#### For Temporary Storage During Migration

Use a password manager (1Password, LastPass, Bitwarden):

- Create secure note: "NeonPanda - Stripe Production Keys"
- Store all secret keys there during migration
- Share with team members securely (via password manager sharing)

#### For Long-Term Storage

- AWS Amplify Console Environment Variables (primary)
- AWS Secrets Manager (optional backup)
- Team password manager (for emergency access)

#### NEVER Store In

- ❌ Git repository (any branch)
- ❌ Slack messages
- ❌ Email
- ❌ Unencrypted files
- ❌ Google Docs/Notion
- ❌ Code comments

### Verify Safe Commits

Before committing any Stripe-related changes:

```bash
# Check for secret keys in staged files
git diff --cached | grep -i "sk_live_"
git diff --cached | grep -i "whsec_"
git diff --cached | grep -i "secret"

# If any matches found, DO NOT COMMIT
```

Add to `.gitignore` if not already present:

```
.env.local
.env.local.prod
.env.*.local
**/*.secret.*
**/secrets/**
```

### Team Access Control

Document who should have access to production Stripe:

- [ ] Owner: [Name] (full access)
- [ ] Tech Lead: [Name] (full access)
- [ ] Finance: [Name] (reporting only)
- [ ] Support: [Name] (customer portal only)

Stripe Dashboard → Settings → Team to manage access levels.

---

## Reference

### Support & Resources

#### Stripe Dashboard Links

- Live mode dashboard: https://dashboard.stripe.com
- API keys: https://dashboard.stripe.com/apikeys
- Webhooks: https://dashboard.stripe.com/webhooks
- Products: https://dashboard.stripe.com/products
- Payment links: https://dashboard.stripe.com/payment-links

#### Stripe Documentation

- API reference: https://docs.stripe.com/api
- Webhooks guide: https://docs.stripe.com/webhooks
- Testing guide: https://docs.stripe.com/testing
- Payment Links: https://docs.stripe.com/payment-links

#### Internal Resources

- Backend config: `amplify/backend.ts`
- Webhook handler: `amplify/functions/process-stripe-webhook/handler.ts`
- Frontend API: `src/utils/apis/subscriptionApi.js`
- Price mapping: `amplify/functions/libs/subscription/stripe-helpers.ts`

### Environment Variables Reference

#### Backend (Lambda Functions)

Set in AWS Amplify Console:

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
ELECTRICPANDA_PRICE_ID=price_xxxxx
EARLYPANDA_PRICE_ID=price_xxxxx
```

#### Frontend (Vite Build)

Set in AWS Amplify Console (prefixed with VITE\_):

```bash
VITE_ELECTRIC_PANDA_PAYMENT_LINK=https://buy.stripe.com/xxxxx
```

#### Where They're Used

- `STRIPE_SECRET_KEY`: Stripe API authentication (webhooks, portal sessions)
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `ELECTRICPANDA_PRICE_ID`: Map Stripe price → "electric" tier
- `EARLYPANDA_PRICE_ID`: Map Stripe price → "free" tier
- `VITE_ELECTRIC_PANDA_PAYMENT_LINK`: Frontend payment link redirect

### Current Test Configuration

For reference, your test mode configuration should follow this pattern (actual values stored in NOTES_MLF.md):

```
Test Publishable: pk_test_xxxxx (safe to commit)
Test Secret: sk_test_xxxxx (NEVER commit - store in NOTES_MLF.md only)
Test Webhook Secret: whsec_xxxxx (NEVER commit - store in NOTES_MLF.md only)
Test EarlyPanda Price: price_xxxxx
Test ElectricPanda Price: price_xxxxx
Test Payment Link: https://buy.stripe.com/test_xxxxx
```

### Price Validation

After creating production products, verify the price mapping logic in:
`amplify/functions/libs/subscription/stripe-helpers.ts`

The `mapStripePriceToTier()` function should correctly map:

- Production ElectricPanda price → "electric" tier
- Production EarlyPanda price → "free" tier

---

**Last Updated**: January 10, 2026
**Migration Status**: Phase 4 - Testing & Verification

**Completed**:

- ✅ Phase 1: Stripe Dashboard Setup (100%)
- ✅ Phase 2: AWS Amplify Configuration (100%)
- ✅ Phase 3: Code Verification (no changes needed)
- ⏳ Phase 4: Testing (IN PROGRESS)

**Critical Next Steps** (MUST complete before going live):

1. ⏳ Wait for AWS Amplify deployment to complete
2. 🧪 Test webhook endpoint (Step 4.2)
3. 🧪 Test full flow in test mode (Step 4.3)
4. 🧪 Test with real payment and refund (Step 4.4)

**DO NOT go live until all testing passes!**
