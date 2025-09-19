import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

export function createContactFormNotificationTopic(stack: Stack) {
  // Create SNS topic for contact form notifications
  const contactFormTopic = new sns.Topic(stack, 'ContactFormNotifications', {
    topicName: 'contact-form-notifications',
    displayName: 'NeonPanda Contact Form Notifications',
  });

  // Add email subscription for support
  contactFormTopic.addSubscription(
    new subscriptions.EmailSubscription('support@neonpanda.ai')
  );

  return {
    topic: contactFormTopic,
  };
}
