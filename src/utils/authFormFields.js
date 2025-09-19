export const customFormFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email or username',
      label: 'Email / Username',
      isRequired: true,
    },
    password: {
      placeholder: 'Enter your password',
      label: 'Password',
      isRequired: true,
    },
  },
  signUp: {
    email: {
      order: 1,
      placeholder: 'Enter your email address',
      isRequired: true,
      label: 'Email *'
    },
    preferred_username: {
      order: 2,
      placeholder: 'Choose a username (e.g., fitness_warrior)',
      isRequired: true,
      label: 'Username *'
    },
    given_name: {
      order: 3,
      placeholder: 'Your first name',
      label: 'First Name'
    },
    family_name: {
      order: 4,
      placeholder: 'Your last name',
      label: 'Last Name'
    },
    password: {
      order: 5,
      placeholder: 'Create a secure password',
      label: 'Password *'
    },
    confirm_password: {
      order: 6,
      placeholder: 'Confirm your password',
      label: 'Confirm Password *'
    }
  },
  confirmSignUp: {
    confirmation_code: {
      placeholder: 'Enter the 6-digit code from your email',
      label: 'Confirmation Code',
      isRequired: true,
    },
  },
  resetPassword: {
    username: {
      placeholder: 'Enter your email address',
      label: 'Email',
      isRequired: true,
    },
  },
  confirmResetPassword: {
    confirmation_code: {
      placeholder: 'Enter the code from your email',
      label: 'Confirmation Code',
      isRequired: true,
    },
    password: {
      placeholder: 'Enter your new password',
      label: 'New Password',
      isRequired: true,
    },
  },
};
