import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize SNS client
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
