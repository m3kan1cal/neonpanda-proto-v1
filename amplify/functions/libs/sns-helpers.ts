import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize SNS client
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * User registration data for SNS notifications
 */
export interface UserRegistrationData {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  timestamp: string;
  isNewProfile: boolean;
}

/**
 * Publishes a contact form notification to SNS
 */
export async function publishContactFormNotification(formData: any): Promise<void> {
  const topicArn = process.env.CONTACT_FORM_TOPIC_ARN;

  if (!topicArn) {
    console.warn('CONTACT_FORM_TOPIC_ARN environment variable not set, skipping SNS notification');
    return;
  }

  try {
    const message = {
      contactType: formData.contactType,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
      timestamp: formData.timestamp,
      requestId: formData.requestId
    };

    const subject = `New Contact Form Submission - ${formData.contactType.toUpperCase()}`;
    const messageBody = `
New contact form submission received:

Contact Type: ${formData.contactType}
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}

Timestamp: ${formData.timestamp}
Request ID: ${formData.requestId}

---
This notification was sent automatically from the NeonPanda contact form system.
    `.trim();

    const publishCommand = new PublishCommand({
      TopicArn: topicArn,
      Subject: subject,
      Message: messageBody,
      MessageAttributes: {
        contactType: {
          DataType: 'String',
          StringValue: formData.contactType
        },
        email: {
          DataType: 'String',
          StringValue: formData.email
        }
      }
    });

    await snsClient.send(publishCommand);
    console.info('SNS notification sent successfully for contact form submission');

  } catch (error) {
    console.error('Failed to send SNS notification:', error);
    // Don't throw - we don't want SNS failures to break the contact form submission
  }
}

/**
 * Publishes a user registration notification to SNS
 */
export async function publishUserRegistrationNotification(userData: UserRegistrationData): Promise<void> {
  const topicArn = process.env.USER_REGISTRATION_TOPIC_ARN;

  if (!topicArn) {
    console.warn('USER_REGISTRATION_TOPIC_ARN environment variable not set, skipping SNS notification');
    return;
  }

  try {
    const registrationType = userData.isNewProfile ? 'New User' : 'Existing User (Re-linked)';
    const subject = `${registrationType} Registration - ${userData.email}`;

    const messageBody = `
${registrationType} Registration Notification
${'='.repeat(50)}

User Information:
• User ID: ${userData.userId}
• Username: ${userData.username}
• Email: ${userData.email}
• Display Name: ${userData.displayName}
${userData.firstName ? `• First Name: ${userData.firstName}` : ''}
${userData.lastName ? `• Last Name: ${userData.lastName}` : ''}

Registration Details:
• Timestamp: ${userData.timestamp}
• Profile Type: ${userData.isNewProfile ? 'Newly created' : 'Existing profile linked to new Cognito account'}

---
This notification was sent automatically from the NeonPanda user registration system.
    `.trim();

    const publishCommand = new PublishCommand({
      TopicArn: topicArn,
      Subject: subject,
      Message: messageBody,
      MessageAttributes: {
        userId: {
          DataType: 'String',
          StringValue: userData.userId
        },
        email: {
          DataType: 'String',
          StringValue: userData.email
        },
        isNewProfile: {
          DataType: 'String',
          StringValue: userData.isNewProfile.toString()
        }
      }
    });

    await snsClient.send(publishCommand);
    console.info('SNS notification sent successfully for user registration');

  } catch (error) {
    console.error('Failed to send user registration SNS notification:', error);
    // Don't throw - we don't want SNS failures to break user registration
  }
}
