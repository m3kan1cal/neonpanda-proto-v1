import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Welcome to NeonPanda!",
    }
  },
  userAttributes: {
    email: { required: true, mutable: true },
    preferredUsername: { required: true, mutable: true },
    'custom:user_id': {
      dataType: 'String',
      mutable: true
    },
    givenName: { required: false, mutable: true },
    familyName: { required: false, mutable: true }
  },
  accountRecovery: 'EMAIL_ONLY',
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
    sms: false  // Disable SMS to avoid costs, TOTP is free
  },
  triggers: {
    postConfirmation
  }
});

// Note: IAM permissions will be added via backend customization
