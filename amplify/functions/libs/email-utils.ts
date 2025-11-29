/**
 * Email Utilities
 *
 * Centralized email sending functionality using Amazon SES.
 * Provides reusable utilities for all email notification types:
 * - Coach check-ins / inactivity reminders
 * - Weekly progress reports
 * - Monthly progress reports
 * - Training program updates
 * - Feature announcements
 */

import { SESClient, SendEmailCommand, SendEmailCommandOutput } from '@aws-sdk/client-ses';
import { getAppUrl, getApiUrl } from './domain-utils';

// Shared SES client instance
// Reused across all email sending functions to avoid creating multiple clients
const sesClient = new SESClient({});

/**
 * Email sending options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  from?: string; // Optional, defaults to NeonPanda no-reply
}

/**
 * Email sending result with metadata
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  requestId?: string;
  error?: {
    message: string;
    name: string;
    stack?: string;
  };
}

/**
 * Default sender email address
 */
const DEFAULT_FROM_EMAIL = 'NeonPanda <no-reply@neonpanda.ai>';

/**
 * Send an email via Amazon SES
 *
 * @param options - Email sending options
 * @returns SendEmailResult with success status and metadata
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, htmlBody, textBody, from = DEFAULT_FROM_EMAIL } = options;

  // Convert single email to array for consistent handling
  const toAddresses = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const result: SendEmailCommandOutput = await sesClient.send(command);

    console.info('✅ Email sent successfully', {
      to: toAddresses,
      subject,
      messageId: result.MessageId,
      requestId: result.$metadata.requestId,
    });

    return {
      success: true,
      messageId: result.MessageId,
      requestId: result.$metadata.requestId,
    };
  } catch (error) {
    console.error('❌ Failed to send email:', {
      to: toAddresses,
      subject,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

/**
 * Build unsubscribe link for email footer
 *
 * Uses branch-aware API domain:
 * - Production (main): https://api-prod.neonpanda.ai/unsubscribe
 * - Development: https://api-dev.neonpanda.ai/unsubscribe
 * - Sandbox: Uses API_ENDPOINT env var
 *
 * @param email - User's email address
 * @param notificationType - Type of notification to unsubscribe from
 * @returns Full unsubscribe URL
 */
export function buildUnsubscribeLink(email: string, notificationType: string): string {
  const apiUrl = getApiUrl();
  return `${apiUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=${notificationType}`;
}

/**
 * Build settings link for email footer
 *
 * Uses branch-aware app domain:
 * - Production (main): https://neonpanda.ai/settings?userId={userId}
 * - Development: https://dev.neonpanda.ai/settings?userId={userId}
 *
 * @param userId - Optional user ID to pre-populate settings page
 * @returns Full settings URL
 */
export function buildSettingsLink(userId?: string): string {
  const appUrl = getAppUrl();
  if (userId) {
    return `${appUrl}/settings?userId=${encodeURIComponent(userId)}`;
  }
  return `${appUrl}/settings`;
}

/**
 * Build standard email footer HTML
 *
 * @param email - User's email address
 * @param notificationType - Type of notification for unsubscribe link
 * @param userId - Optional user ID for settings link
 * @returns HTML footer string
 */
export function buildEmailFooterHtml(email: string, notificationType: string, userId?: string): string {
  const appUrl = getAppUrl();
  return `
      <div class="footer">
        <p><strong>NeonPanda</strong> – Where electric intelligence meets approachable excellence.</p>
        <p style="margin-top: 15px;">
          <a href="${appUrl}" style="color: #00ffff; text-decoration: none; margin-right: 15px;">Visit NeonPanda</a>
          <a href="${buildSettingsLink(userId)}" style="color: #00ffff; text-decoration: none; margin-right: 15px;">Update Preferences</a>
          <a href="${buildUnsubscribeLink(email, notificationType)}" style="color: #00ffff; text-decoration: none;">Unsubscribe</a>
        </p>
      </div>`;
}

/**
 * Build standard email footer plain text
 *
 * @param email - User's email address
 * @param notificationType - Type of notification for unsubscribe link
 * @param userId - Optional user ID for settings link
 * @returns Plain text footer string
 */
export function buildEmailFooterText(email: string, notificationType: string, userId?: string): string {
  const appUrl = getAppUrl();
  return `

NeonPanda – Where electric intelligence meets approachable excellence.
Visit NeonPanda: ${appUrl}
Update Preferences: ${buildSettingsLink(userId)}
Unsubscribe: ${buildUnsubscribeLink(email, notificationType)}`;
}

/**
 * Export SES client for direct access if needed
 * (Most code should use sendEmail() instead)
 */
export { sesClient };

/**
 * Re-export domain utilities for convenience
 * (Can also be imported directly from domain-utils)
 */
export { getAppUrl, getApiUrl } from './domain-utils';
