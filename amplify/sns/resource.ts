import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { createBranchAwareResourceName } from '../functions/libs/branch-naming';

export function createContactFormNotificationTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    'contact-form-notifications',
    'SNS Topic'
  );

  // Create SNS topic for contact form notifications
  const contactFormTopic = new sns.Topic(stack, 'ContactFormNotifications', {
    topicName: topicName,
    displayName: `NeonPanda Contact Form Notifications${branchInfo.branchName === 'main' ? '' : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for support
  contactFormTopic.addSubscription(
    new subscriptions.EmailSubscription('support@neonpanda.ai')
  );

  return {
    topic: contactFormTopic,
  };
}
