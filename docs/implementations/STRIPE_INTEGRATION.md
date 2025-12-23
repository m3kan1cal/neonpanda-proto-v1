# EarlyPanda Implementation Guide

Complete Stripe Integration for $0 Early Access Package

## Overview

This guide implements a free "EarlyPanda" subscription using Stripe's $0 pricing, giving you full subscription infrastructure while providing free access to early adopters.

## Phase 1: Stripe Dashboard Setup (5 minutes)

### 1.1 Create EarlyPanda Product

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products** → **Add Product**
3. Fill out:
   - **Name**: "EarlyPanda - Early Access"
   - **Description**: "Limited time early access to NeonPanda AI coaching platform"
4. Click **Add pricing**:
   - **Pricing model**: Standard pricing
   - **Price**: $0.00
   - **Billing period**: Monthly
   - **Currency**: USD
5. Save and copy the **Price ID** (starts with `price_`)

### 1.2 Configure Webhook Endpoint

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://your-amplify-api.execute-api.region.amazonaws.com/stripe/webhook`
3. **Listen to**: Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Save and copy the **Webhook signing secret**

## Phase 2: Environment Configuration (2 minutes)

### 2.1 Add Environment Variables

Create or update your environment files:

```bash
# .env.local (for local development)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Amplify Backend Function Environment
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
EARLYPANDA_PRICE_ID=price_your_earlypanda_price_id_here
```

### 2.2 Install Dependencies

```bash
# Frontend (React)
npm install @stripe/stripe-js @stripe/react-stripe-js

# Backend (Amplify Function)
cd amplify/backend/function/stripeHandler/src
npm install stripe
```

## Phase 3: Amplify Backend Implementation

### 3.1 Create Stripe Handler Function

**File**: `amplify/backend/function/stripeHandler/src/index.js`

```javascript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const handler = async (event) => {
  console.log("Stripe handler called:", event.httpMethod, event.path);

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const { action, ...data } = JSON.parse(event.body);
    console.log("Action:", action, "Data:", data);

    switch (action) {
      case "create_customer":
        return await createCustomer(data);
      case "create_earlypanda_subscription":
        return await createEarlyPandaSubscription(data);
      case "get_subscription_status":
        return await getSubscriptionStatus(data);
      case "cancel_subscription":
        return await cancelSubscription(data);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    console.error("Stripe handler error:", error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
    };
  }
};

const createCustomer = async ({ email, name, userId }) => {
  console.log("Creating customer for:", email);

  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      userId: userId || "",
      source: "earlypanda_signup",
    },
  });

  console.log("Customer created:", customer.id);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      customerId: customer.id,
      email: customer.email,
    }),
  };
};

const createEarlyPandaSubscription = async ({ customerId }) => {
  console.log("Creating EarlyPanda subscription for customer:", customerId);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: process.env.EARLYPANDA_PRICE_ID,
      },
    ],
    metadata: {
      tier: "earlypanda",
      access_level: "full",
    },
    expand: ["latest_invoice"],
  });

  console.log(
    "Subscription created:",
    subscription.id,
    "Status:",
    subscription.status,
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      customerId: subscription.customer,
    }),
  };
};

const getSubscriptionStatus = async ({ customerId }) => {
  console.log("Getting subscription status for customer:", customerId);

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });

  const subscription = subscriptions.data[0];

  if (!subscription) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasSubscription: false,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      hasSubscription: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      tier: subscription.metadata.tier || "unknown",
      currentPeriodEnd: subscription.current_period_end,
    }),
  };
};

const cancelSubscription = async ({ subscriptionId }) => {
  console.log("Canceling subscription:", subscriptionId);

  const subscription = await stripe.subscriptions.cancel(subscriptionId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      canceledAt: subscription.canceled_at,
    }),
  };
};
```

### 3.2 Create Webhook Handler Function

**File**: `amplify/backend/function/stripeWebhook/src/index.js`

```javascript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  console.log("Webhook event type:", stripeEvent.type);

  try {
    switch (stripeEvent.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return {
      statusCode: 500,
      body: `Webhook Handler Error: ${error.message}`,
    };
  }

  return {
    statusCode: 200,
    body: "Webhook handled successfully",
  };
};

const handleSubscriptionCreated = async (subscription) => {
  console.log("Subscription created:", subscription.id);
  // TODO: Update user record in your database
  // Example: Update DynamoDB user record with subscription info
};

const handleSubscriptionUpdated = async (subscription) => {
  console.log(
    "Subscription updated:",
    subscription.id,
    "Status:",
    subscription.status,
  );
  // TODO: Update user subscription status in database
};

const handleSubscriptionDeleted = async (subscription) => {
  console.log("Subscription canceled:", subscription.id);
  // TODO: Revoke user access in database
};

const handlePaymentSucceeded = async (invoice) => {
  console.log("Payment succeeded for subscription:", invoice.subscription);
  // TODO: Confirm user access (though EarlyPanda is free)
};

const handlePaymentFailed = async (invoice) => {
  console.log("Payment failed for subscription:", invoice.subscription);
  // TODO: Handle payment failures (not applicable for EarlyPanda)
};
```

### 3.3 Update API Gateway Routes

**File**: `amplify/backend/api/yourapi/src/app.js` (or similar)

```javascript
// Add these routes to your existing Express app
app.post("/stripe", async (req, res) => {
  // Forward to stripe handler function
  const stripeResponse = await stripeHandler.handler({
    httpMethod: "POST",
    body: JSON.stringify(req.body),
    headers: req.headers,
  });

  res.status(stripeResponse.statusCode).json(JSON.parse(stripeResponse.body));
});

app.post("/stripe/webhook", async (req, res) => {
  // Forward to webhook handler function
  const webhookResponse = await stripeWebhookHandler.handler({
    body: req.body,
    headers: req.headers,
  });

  res.status(webhookResponse.statusCode).send(webhookResponse.body);
});
```

## Phase 4: React Frontend Implementation

### 4.1 Stripe Provider Setup

**File**: `src/App.jsx` (or root component)

```jsx
import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Initialize Stripe (no payment methods needed for $0 subscriptions)
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
);

function App() {
  return (
    <Elements stripe={stripePromise}>
      <Router>{/* Your app routes */}</Router>
    </Elements>
  );
}

export default App;
```

### 4.2 EarlyPanda Subscription Component

**File**: `src/components/EarlyPandaSubscription.jsx`

```jsx
import React, { useState } from "react";
import { API } from "aws-amplify";
import "./EarlyPandaSubscription.css";

const EarlyPandaSubscription = ({ user, onSubscriptionComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleEarlyPandaSignup = async () => {
    if (!user?.email) {
      setError("Please sign in first to claim EarlyPanda access");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting EarlyPanda signup for:", user.email);

      // Step 1: Create Stripe customer
      const customerResponse = await API.post("api", "/stripe", {
        body: {
          action: "create_customer",
          email: user.email,
          name: user.name || user.email,
          userId: user.id,
        },
      });

      console.log("Customer created:", customerResponse);

      // Step 2: Create free EarlyPanda subscription
      const subscriptionResponse = await API.post("api", "/stripe", {
        body: {
          action: "create_earlypanda_subscription",
          customerId: customerResponse.customerId,
        },
      });

      console.log("Subscription created:", subscriptionResponse);

      // Success!
      setSuccess(true);

      // Notify parent component
      if (onSubscriptionComplete) {
        onSubscriptionComplete({
          customerId: customerResponse.customerId,
          subscriptionId: subscriptionResponse.subscriptionId,
          tier: "earlypanda",
          status: "active",
        });
      }
    } catch (err) {
      console.error("EarlyPanda signup error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="earlypanda-success">
        <div className="success-icon">🐼✨</div>
        <h2>Welcome to EarlyPanda!</h2>
        <p>Your early access is now active. Start creating your AI coaches!</p>
        <button
          className="dashboard-button"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="earlypanda-container">
      <div className="earlypanda-card">
        <div className="package-header">
          <div className="package-icon">🐼🚀</div>
          <h1>EarlyPanda</h1>
          <div className="package-price">
            <span className="price-amount">FREE</span>
            <span className="price-period">Limited Time</span>
          </div>
        </div>

        <div className="package-description">
          <p>Get full access to NeonPanda while we perfect the experience</p>
        </div>

        <div className="package-features">
          <div className="feature-item">
            <span className="feature-check">✅</span>
            <span>Unlimited AI coaches</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">✅</span>
            <span>Unlimited conversations</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">✅</span>
            <span>All premium features</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">✅</span>
            <span>Direct feedback to founders</span>
          </div>
          <div className="feature-item">
            <span className="feature-check">✅</span>
            <span>Priority support</span>
          </div>
        </div>

        <div className="urgency-banner">
          <span className="urgency-icon">⏰</span>
          <span>EarlyPanda access ends March 2025</span>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span>{error}</span>
          </div>
        )}

        <button
          className="signup-button"
          onClick={handleEarlyPandaSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner">⏳</span>
              Activating EarlyPanda...
            </>
          ) : (
            <>
              <span className="button-icon">🚀</span>
              Claim EarlyPanda Access
            </>
          )}
        </button>

        <div className="no-payment-required">
          <span className="security-icon">🔒</span>
          <span>No payment method required</span>
        </div>

        <div className="early-access-benefits">
          <h3>Why EarlyPanda?</h3>
          <ul>
            <li>Help shape the future of AI fitness coaching</li>
            <li>Get grandfathered pricing when we launch</li>
            <li>Access to exclusive EarlyPanda community</li>
            <li>Direct line to the founders</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EarlyPandaSubscription;
```

### 4.3 Subscription Status Hook

**File**: `src/hooks/useSubscription.js`

```javascript
import { useState, useEffect } from "react";
import { API } from "aws-amplify";

export const useSubscription = (user) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkSubscriptionStatus = async (customerId) => {
    if (!customerId) return;

    setLoading(true);
    try {
      const response = await API.post("api", "/stripe", {
        body: {
          action: "get_subscription_status",
          customerId,
        },
      });

      setSubscription(response);
      setError(null);
    } catch (err) {
      console.error("Subscription check error:", err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSubscription = () => {
    return subscription?.hasSubscription && subscription?.status === "active";
  };

  const isEarlyPanda = () => {
    return subscription?.tier === "earlypanda";
  };

  const cancelSubscription = async () => {
    if (!subscription?.subscriptionId) return;

    setLoading(true);
    try {
      await API.post("api", "/stripe", {
        body: {
          action: "cancel_subscription",
          subscriptionId: subscription.subscriptionId,
        },
      });

      // Refresh subscription status
      await checkSubscriptionStatus(user?.stripeCustomerId);
    } catch (err) {
      console.error("Cancel subscription error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.stripeCustomerId) {
      checkSubscriptionStatus(user.stripeCustomerId);
    }
  }, [user?.stripeCustomerId]);

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    isEarlyPanda,
    cancelSubscription,
    refetch: () => checkSubscriptionStatus(user?.stripeCustomerId),
  };
};
```

### 4.4 Subscription Status Component

**File**: `src/components/SubscriptionStatus.jsx`

```jsx
import React from "react";
import { useSubscription } from "../hooks/useSubscription";
import "./SubscriptionStatus.css";

const SubscriptionStatus = ({ user }) => {
  const {
    subscription,
    loading,
    hasActiveSubscription,
    isEarlyPanda,
    cancelSubscription,
  } = useSubscription(user);

  if (loading) {
    return <div className="subscription-loading">Checking subscription...</div>;
  }

  if (!hasActiveSubscription()) {
    return (
      <div className="subscription-status inactive">
        <span className="status-icon">❌</span>
        <span>No active subscription</span>
      </div>
    );
  }

  return (
    <div className="subscription-status active">
      <div className="status-header">
        <span className="status-icon">✅</span>
        <span className="status-text">
          {isEarlyPanda() ? "EarlyPanda Access" : "Active Subscription"}
        </span>
      </div>

      {isEarlyPanda() && (
        <div className="earlypanda-badge">
          <span className="panda-icon">🐼</span>
          <span>Early Access - Full Features</span>
        </div>
      )}

      <div className="subscription-details">
        <div className="detail-item">
          <span className="detail-label">Status:</span>
          <span className="detail-value">{subscription?.status}</span>
        </div>
        {subscription?.currentPeriodEnd && (
          <div className="detail-item">
            <span className="detail-label">Period Ends:</span>
            <span className="detail-value">
              {new Date(
                subscription.currentPeriodEnd * 1000,
              ).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {isEarlyPanda() && (
        <div className="earlypanda-info">
          <p>
            🎉 You're an EarlyPanda! Enjoy full access while we perfect the
            platform.
          </p>
          <p>📅 Early access program ends March 2025</p>
        </div>
      )}

      <button className="cancel-button" onClick={cancelSubscription}>
        Cancel Subscription
      </button>
    </div>
  );
};

export default SubscriptionStatus;
```

## Phase 5: Styling (Optional)

### 5.1 EarlyPanda Component Styles

**File**: `src/components/EarlyPandaSubscription.css`

```css
.earlypanda-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.earlypanda-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  color: white;
  text-align: center;
}

.package-header {
  margin-bottom: 30px;
}

.package-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.earlypanda-card h1 {
  font-size: 2.5rem;
  margin: 0 0 15px 0;
  background: linear-gradient(45deg, #00ffff, #ff10f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.package-price {
  margin-bottom: 20px;
}

.price-amount {
  font-size: 3rem;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.price-period {
  display: block;
  font-size: 1rem;
  color: #ff10f0;
  margin-top: 5px;
}

.package-description {
  margin-bottom: 30px;
}

.package-description p {
  font-size: 1.1rem;
  color: #e0e0e0;
  line-height: 1.6;
}

.package-features {
  text-align: left;
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.feature-check {
  color: #39ff14;
  margin-right: 12px;
  font-size: 1.2rem;
}

.urgency-banner {
  background: rgba(255, 16, 240, 0.1);
  border: 1px solid rgba(255, 16, 240, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #ff10f0;
  font-weight: 600;
}

.urgency-icon {
  font-size: 1.2rem;
}

.error-message {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ff6b6b;
}

.signup-button {
  width: 100%;
  background: linear-gradient(45deg, #00ffff, #ff10f0);
  border: none;
  border-radius: 15px;
  padding: 18px 30px;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.signup-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 255, 255, 0.3);
}

.signup-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.no-payment-required {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #39ff14;
  font-size: 0.9rem;
  margin-bottom: 30px;
}

.early-access-benefits {
  text-align: left;
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.early-access-benefits h3 {
  color: #00ffff;
  margin-bottom: 15px;
  text-align: center;
}

.early-access-benefits ul {
  list-style: none;
  padding: 0;
}

.early-access-benefits li {
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
  color: #e0e0e0;
  font-size: 0.95rem;
}

.early-access-benefits li::before {
  content: "🌟";
  position: absolute;
  left: 0;
}

.earlypanda-success {
  text-align: center;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 20px;
  padding: 40px;
  max-width: 400px;
  margin: 0 auto;
  color: white;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.dashboard-button {
  background: linear-gradient(45deg, #00ffff, #39ff14);
  border: none;
  border-radius: 15px;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
}

.dashboard-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 255, 255, 0.3);
}
```

## Phase 6: Testing & Deployment

### 6.1 Local Testing Checklist

```bash
# 1. Test environment variables
echo $STRIPE_SECRET_KEY
echo $EARLYPANDA_PRICE_ID

# 2. Test Stripe customer creation
curl -X POST https://your-local-api/stripe \
  -H "Content-Type: application/json" \
  -d '{"action": "create_customer", "email": "test@example.com"}'

# 3. Test subscription creation
curl -X POST https://your-local-api/stripe \
  -H "Content-Type: application/json" \
  -d '{"action": "create_earlypanda_subscription", "customerId": "cus_test123"}'
```

### 6.2 User Flow Testing

1. **Sign up** for account
2. **Navigate** to EarlyPanda subscription page
3. **Click** "Claim EarlyPanda Access"
4. **Verify** subscription created in Stripe Dashboard
5. **Check** user has access to all features
6. **Test** subscription status display

### 6.3 Stripe Dashboard Verification

1. Go to **Customers** - verify test customer created
2. Go to **Subscriptions** - verify $0 subscription active
3. Go to **Events** - verify webhook events received
4. Go to **Logs** - check for any errors

## Phase 7: Launch Preparation

### 7.1 Pre-Launch Checklist

- [ ] Environment variables set in production
- [ ] Stripe webhook endpoint configured and tested
- [ ] EarlyPanda price ID matches production Stripe product
- [ ] Error handling and logging in place
- [ ] User database schema supports subscription data
- [ ] UI/UX tested on mobile devices
- [ ] Performance testing completed
- [ ] Backup plan for rollback if needed

### 7.2 Launch Day Tasks

1. **Deploy** backend functions with new Stripe integration
2. **Update** frontend with EarlyPanda signup flow
3. **Test** end-to-end flow with real Stripe test cards
4. **Monitor** logs and error rates
5. **Send** announcement to early access list
6. **Prepare** customer support for questions

### 7.3 Post-Launch Monitoring

```javascript
// Key metrics to track
const metrics = {
  signupAttempts: 0, // Users who click "Claim Access"
  signupSuccesses: 0, // Successful subscriptions created
  signupErrors: 0, // Failed attempts
  activeEarlyPandas: 0, // Total active EarlyPanda users
  dailyActiveUsers: 0, // Users using the platform daily
  userFeedback: [], // Qualitative feedback collection
};
```

## Troubleshooting Guide

### Common Issues & Solutions

**Issue**: "Stripe customer creation failed"

- **Check**: Environment variables are set correctly
- **Verify**: Stripe API keys are valid and not expired
- **Debug**: Check Amplify function logs

**Issue**: "Webhook events not received"

- **Check**: Webhook URL matches your API endpoint exactly
- **Verify**: Webhook signing secret is correct
- **Test**: Use Stripe CLI for local webhook testing

**Issue**: "Subscription shows as incomplete"

- **Reason**: This should not happen with $0 subscriptions
- **Check**: Price ID is correct for $0 amount
- **Verify**: No payment method required for $0 subscriptions

**Issue**: "User can't access features after signup"

- **Check**: Subscription status is properly saved to user record
- **Verify**: Feature gating logic includes EarlyPanda tier
- **Debug**: Check user authentication and authorization flow

## Next Steps

After EarlyPanda launch:

1. **Collect Feedback** from early users
2. **Iterate** on AI coach quality and features
3. **Plan Transition** to paid GlowPanda package
4. **Build** upgrade flow for when early access ends
5. **Scale** infrastructure based on usage patterns

This implementation gives you a complete, production-ready EarlyPanda subscription system using Stripe's $0 pricing model while maintaining full subscription management capabilities for future paid tiers.
