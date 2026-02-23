import {
  updateUserProfileByEmail,
  getUserProfileByEmail,
} from "../../dynamodb/operations";
import { buildSettingsLink } from "../libs/email-utils";
import { logger } from "../libs/logger";
import {
  createHtmlResponse,
  createNotFoundHtmlResponse,
  createBadRequestHtmlResponse,
  createErrorHtmlResponse,
} from "../libs/html-utils";

/**
 * Handler for email notification unsubscribe requests
 * Accessible via GET /unsubscribe?email=user@example.com&type=coach-checkins
 *
 * This is a public endpoint (no auth required) for email unsubscribe compliance
 */
export const handler = async (event: any) => {
  logger.info("Processing unsubscribe request");

  // Extract query parameters
  const email = event.queryStringParameters?.email;
  const notificationType = event.queryStringParameters?.type;

  // Validate required parameters
  if (!email) {
    return createBadRequestHtmlResponse(
      "Missing Email Address",
      "Looks like the unsubscribe link is incomplete – no email address included. If you clicked this from an email, the link might be broken. Reach out to us and we'll help you update your preferences manually.",
    );
  }

  if (!notificationType) {
    return createBadRequestHtmlResponse(
      "Missing Notification Type",
      "This unsubscribe link is missing some info. Not sure which emails you want to stop receiving? Reach out to us or log into your account settings to customize your notifications.",
    );
  }

  // Validate notification type
  const validTypes = [
    "coach-checkins",
    "weekly",
    "monthly",
    "program",
    "program-adherence",
    "features",
    "all",
  ];
  if (!validTypes.includes(notificationType)) {
    return createBadRequestHtmlResponse(
      "Invalid Link",
      "This unsubscribe link looks a bit off – the notification type isn't recognized. Head to your account settings to manage your email preferences, or reach out if you need help.",
    );
  }

  try {
    // Get user profile to retrieve userId
    const userProfile = await getUserProfileByEmail(email);
    const userId = userProfile?.userId;

    // Determine which preferences to update based on type
    const updates: any = {
      preferences: {
        emailNotifications: {},
      },
    };

    if (notificationType === "all") {
      // Unsubscribe from all notifications
      updates.preferences.emailNotifications = {
        coachCheckIns: false,
        weeklyReports: false,
        monthlyReports: false,
        programUpdates: false,
        featureAnnouncements: false,
        programAdherence: false,
      };
    } else {
      // Unsubscribe from specific type
      let preferenceKey: string;
      if (notificationType === "coach-checkins") {
        preferenceKey = "coachCheckIns";
      } else if (notificationType === "weekly") {
        preferenceKey = "weeklyReports";
      } else if (notificationType === "monthly") {
        preferenceKey = "monthlyReports";
      } else if (notificationType === "program") {
        preferenceKey = "programUpdates";
      } else if (notificationType === "program-adherence") {
        preferenceKey = "programAdherence";
      } else if (notificationType === "features") {
        preferenceKey = "featureAnnouncements";
      } else {
        preferenceKey = "programUpdates"; // fallback
      }

      updates.preferences.emailNotifications[preferenceKey] = false;
    }

    // Update user profile by email
    await updateUserProfileByEmail(email, updates);

    logger.info(
      `Successfully unsubscribed ${email} from ${notificationType} notifications`,
    );

    return createHtmlResponse(
      200,
      "We'll Miss You",
      `
        <p>You've been successfully unsubscribed from ${getNotificationDisplayName(notificationType)} notifications.</p>

        <p>We get it – inboxes get crowded, priorities shift, or maybe these emails just weren't landing right for you. No hard feelings. We're here to support your journey however works best for you.</p>

        <p>If you ever want to adjust what you hear from us (without going all-in again), you can fine-tune your notification preferences in your <a href="${buildSettingsLink(userId)}">account settings</a>. Pick what matters, silence what doesn't.</p>

        <div class="feature-box">
          <p style="margin: 0; color: #1a1a1a;"><strong style="color: #FF10F0;">Changed your mind?</strong> We'd love to have you back. You can re-enable any notifications in your account settings whenever you're ready. Your coach will be here.</p>
        </div>

        <p>Keep training hard, and remember – we're still in your corner, even if we're a little quieter now. 💪</p>
      `,
    );
  } catch (error: any) {
    logger.error("Error processing unsubscribe request:", error);

    // Handle case where user not found
    if (error.message?.includes("not found")) {
      return createNotFoundHtmlResponse(
        "Hmm, We Can't Find That Account",
        "We searched high and low, but couldn't find an account with that email address. Double-check the email link or reach out to us if you think something's off.",
      );
    }

    return createErrorHtmlResponse(
      "Oops, Something Went Wrong",
      "We hit a snag trying to process your unsubscribe request. Not your fault – we're on it.",
      "<p>Give it another shot in a few minutes, or reach out to us directly if it keeps happening. We'll get you sorted.</p>",
    );
  }
};

/**
 * Get user-friendly display name for notification type
 */
function getNotificationDisplayName(type: string): string {
  switch (type) {
    case "coach-checkins":
      return "coach check-in and reminder";
    case "weekly":
      return "weekly report";
    case "monthly":
      return "monthly report";
    case "program":
      return "training program update";
    case "program-adherence":
      return "program adherence reminder";
    case "features":
      return "feature announcement";
    case "all":
      return "all";
    default:
      return type;
  }
}
