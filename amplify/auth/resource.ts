import { defineAuth, secret } from "@aws-amplify/backend";
import { postConfirmation } from "../functions/post-confirmation/resource";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Welcome to NeonPanda!",
    },
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email", "profile", "openid"],
        attributeMapping: {
          email: "email",
          givenName: "given_name",
          familyName: "family_name",
          // Maps Google email to preferred_username as a temporary value;
          // post-confirmation handler generates a real username from email prefix
          preferredUsername: "email",
        },
      },
      callbackUrls: [
        "http://localhost:5173/auth",
        "https://dev.neonpanda.ai/auth",
        "https://neonpanda.ai/auth",
      ],
      logoutUrls: [
        "http://localhost:5173/",
        "https://dev.neonpanda.ai/",
        "https://neonpanda.ai/",
      ],
    },
  },
  userAttributes: {
    email: { required: true, mutable: true },
    preferredUsername: { required: true, mutable: true },
    "custom:user_id": {
      dataType: "String",
      mutable: true,
    },
    givenName: { required: false, mutable: true },
    familyName: { required: false, mutable: true },
  },
  accountRecovery: "EMAIL_ONLY",
  multifactor: {
    mode: "OPTIONAL",
    totp: true,
    sms: false,
  },
  triggers: {
    postConfirmation,
  },
});

// Note: IAM permissions will be added via backend customization
