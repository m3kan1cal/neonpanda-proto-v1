import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Stack } from 'aws-cdk-lib';
import { createBranchAwareResourceName } from '../functions/libs/branch-naming';

export function createContactFormNotificationTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    'contact-form',
    'SNS Topic'
  );

  // Create SNS topic for contact form notifications
  const contactFormTopic = new sns.Topic(stack, 'ContactFormTopic', {
    topicName: topicName,
    displayName: `NeonPanda Contact Form${branchInfo.branchName === 'main' ? '' : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for support
  contactFormTopic.addSubscription(
    new subscriptions.EmailSubscription('support@neonpanda.ai')
  );

  return {
    topic: contactFormTopic,
  };
}

export function createErrorMonitoringTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    'error-monitoring',
    'SNS Topic'
  );

  // Create SNS topic for error monitoring across all Lambda functions
  const errorMonitoringTopic = new sns.Topic(stack, 'ErrorMonitoringTopic', {
    topicName: topicName,
    displayName: `NeonPanda Error Monitoring${branchInfo.branchName === 'main' ? '' : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for developers
  errorMonitoringTopic.addSubscription(
    new subscriptions.EmailSubscription('developers@neonpanda.ai')
  );

  return {
    topic: errorMonitoringTopic,
    topicArn: errorMonitoringTopic.topicArn,
    topicName: topicName,
  };
}
