import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { Stack } from "aws-cdk-lib";
import { createBranchAwareResourceName } from "../functions/libs/branch-naming";

export function createContactFormNotificationTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    "contact-form",
    "SNS Topic",
  );

  // Create SNS topic for contact form notifications
  const contactFormTopic = new sns.Topic(stack, "ContactFormTopic", {
    topicName: topicName,
    displayName: `NeonPanda Contact Form${branchInfo.branchName === "main" ? "" : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for support
  contactFormTopic.addSubscription(
    new subscriptions.EmailSubscription("support@neonpanda.ai"),
  );

  return {
    topic: contactFormTopic,
    topicArn: contactFormTopic.topicArn,
    topicName: topicName,
  };
}

export function createErrorMonitoringTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    "error-monitoring",
    "SNS Topic",
  );

  // Create SNS topic for error monitoring across all Lambda functions
  const errorMonitoringTopic = new sns.Topic(stack, "ErrorMonitoringTopic", {
    topicName: topicName,
    displayName: `NeonPanda Error Monitoring${branchInfo.branchName === "main" ? "" : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for developers
  errorMonitoringTopic.addSubscription(
    new subscriptions.EmailSubscription("developers@neonpanda.ai"),
  );

  return {
    topic: errorMonitoringTopic,
    topicArn: errorMonitoringTopic.topicArn,
    topicName: topicName,
  };
}

export function createUserRegistrationTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    "user-registration",
    "SNS Topic",
  );

  // Create SNS topic for user registration notifications
  const userRegistrationTopic = new sns.Topic(stack, "UserRegistrationTopic", {
    topicName: topicName,
    displayName: `NeonPanda User Registration${branchInfo.branchName === "main" ? "" : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for support team
  userRegistrationTopic.addSubscription(
    new subscriptions.EmailSubscription("support@neonpanda.ai"),
  );

  return {
    topic: userRegistrationTopic,
    topicArn: userRegistrationTopic.topicArn,
    topicName: topicName,
  };
}

export function createStripeAlertsTopic(stack: Stack) {
  // Create branch-aware topic name using utility
  const { branchInfo, resourceName: topicName } = createBranchAwareResourceName(
    stack,
    "stripe-alerts",
    "SNS Topic",
  );

  // Create SNS topic for Stripe subscription alerts
  const stripeAlertsTopic = new sns.Topic(stack, "StripeAlertsTopic", {
    topicName: topicName,
    displayName: `NeonPanda Stripe Alerts${branchInfo.branchName === "main" ? "" : ` (${branchInfo.branchName})`}`,
  });

  // Add email subscription for business owner
  stripeAlertsTopic.addSubscription(
    new subscriptions.EmailSubscription("businessadmins@neonpanda.ai"),
  );

  return {
    topic: stripeAlertsTopic,
    topicArn: stripeAlertsTopic.topicArn,
    topicName: topicName,
  };
}
