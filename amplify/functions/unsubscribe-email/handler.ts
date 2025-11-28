import { updateUserProfileByEmail } from '../../dynamodb/operations';
import { buildSettingsLink } from '../libs/email-utils';
import {
  createHtmlResponse,
  createNotFoundHtmlResponse,
  createBadRequestHtmlResponse,
  createErrorHtmlResponse
} from '../libs/html-utils';

/**
 * Handler for email notification unsubscribe requests
 * Accessible via GET /unsubscribe?email=user@example.com&type=coach-checkins
 *
 * This is a public endpoint (no auth required) for email unsubscribe compliance
 */
export const handler = async (event: any) => {
  console.info('Processing unsubscribe request');

  // Extract query parameters
  const email = event.queryStringParameters?.email;
  const notificationType = event.queryStringParameters?.type;

  // Validate required parameters
  if (!email) {
    return createBadRequestHtmlResponse('Bad Request', 'Email address is required');
  }

  if (!notificationType) {
    return createBadRequestHtmlResponse('Bad Request', 'Notification type is required');
  }

  // Validate notification type
  const validTypes = ['coach-checkins', 'weekly', 'monthly', 'program', 'features', 'all'];
  if (!validTypes.includes(notificationType)) {
    return createBadRequestHtmlResponse(
      'Bad Request',
      `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
    );
  }

  try {
    // Determine which preferences to update based on type
    const updates: any = {
      preferences: {
        emailNotifications: {},
      },
    };

    if (notificationType === 'all') {
      // Unsubscribe from all notifications
      updates.preferences.emailNotifications = {
        coachCheckIns: false,
        weeklyReports: false,
        monthlyReports: false,
        programUpdates: false,
        featureAnnouncements: false,
      };
    } else {
      // Unsubscribe from specific type
      let preferenceKey: string;
      if (notificationType === 'coach-checkins') {
        preferenceKey = 'coachCheckIns';
      } else if (notificationType === 'weekly') {
        preferenceKey = 'weeklyReports';
      } else if (notificationType === 'monthly') {
        preferenceKey = 'monthlyReports';
      } else if (notificationType === 'program') {
        preferenceKey = 'programUpdates';
      } else if (notificationType === 'features') {
        preferenceKey = 'featureAnnouncements';
      } else {
        preferenceKey = 'programUpdates'; // fallback
      }

      updates.preferences.emailNotifications[preferenceKey] = false;
    }

    // Update user profile by email
    await updateUserProfileByEmail(email, updates);

    console.info(`Successfully unsubscribed ${email} from ${notificationType} notifications`);

    return createHtmlResponse(
      200,
      'Unsubscribed Successfully',
      `
        <p>You have been successfully unsubscribed from ${getNotificationDisplayName(notificationType)} notifications.</p>
        <p>We're sorry to see you go, but we respect your preferences.</p>
        <p>You can update your notification preferences anytime by logging into your <a href="${buildSettingsLink()}" style="color: #667eea; text-decoration: none;">account settings</a>.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 14px; color: #666;">If you change your mind, you can re-enable notifications in your account settings at any time.</p>
        </div>
      `
    );
  } catch (error: any) {
    console.error('Error processing unsubscribe request:', error);

    // Handle case where user not found
    if (error.message?.includes('not found')) {
      return createNotFoundHtmlResponse(
        'User Not Found',
        "We couldn't find an account associated with this email address."
      );
    }

    return createErrorHtmlResponse(
      'Error Processing Request',
      'We encountered an error while processing your unsubscribe request.',
      '<p>Please try again later or contact our support team if the problem persists.</p>'
    );
  }
};

/**
 * Get user-friendly display name for notification type
 */
function getNotificationDisplayName(type: string): string {
  switch (type) {
    case 'coach-checkins':
      return 'coach check-in and reminder';
    case 'weekly':
      return 'weekly report';
    case 'monthly':
      return 'monthly report';
    case 'program':
      return 'training program update';
    case 'features':
      return 'feature announcement';
    case 'all':
      return 'all';
    default:
      return type;
  }
}
