import { logger } from "./logger";
/**
 * Google Chat webhook utilities
 * Provides functions for sending formatted messages to Google Chat spaces
 */

export interface GoogleChatMessageOptions {
  text?: string;
  cards?: any[];
  thread?: {
    name: string;
  };
}

export interface ErrorLogData {
  functionName: string;
  errorCount: number;
  logGroup: string;
  timestamp: string;
  errors: Array<{
    timestamp: string;
    message: string;
  }>;
}

/**
 * Send a message to Google Chat webhook
 */
export async function sendToGoogleChat(
  message: GoogleChatMessageOptions,
  webhookUrl?: string
): Promise<void> {
  const url = webhookUrl || process.env.GOOGLE_CHAT_ERRORS_WEBHOOK_URL;

  if (!url) {
    logger.warn('GOOGLE_CHAT_ERRORS_WEBHOOK_URL environment variable is not set, skipping Google Chat notification');
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google Chat webhook responded with status ${response.status}: ${errorText}`);
    }

    logger.info('Successfully sent notification to Google Chat');
  } catch (error) {
    logger.error('Failed to send notification to Google Chat:', error);
    // Don't throw error here - we don't want to fail the entire function if Google Chat fails
  }
}

/**
 * Send a simple text message to Google Chat
 */
export async function sendTextMessage(
  text: string,
  webhookUrl?: string
): Promise<void> {
  return sendToGoogleChat({ text }, webhookUrl);
}

/**
 * Send a formatted error alert to Google Chat
 */
export async function sendErrorAlert(
  subject: string,
  errorData: ErrorLogData,
  webhookUrl?: string
): Promise<void> {
  const message = {
    text: `${subject}\n\n` +
          `🔍 *Function:* ${errorData.functionName}\n` +
          `🚨 *Error Count:* ${errorData.errorCount}\n` +
          `📊 *Log Group:* ${errorData.logGroup}\n` +
          `🕒 *Timestamp:* ${errorData.timestamp}\n\n` +
          `*Recent Errors:*\n${errorData.errors.map((error, index) =>
            `${index + 1}. [${error.timestamp}] ${error.message}`
          ).join('\n')}`
  };

  return sendToGoogleChat(message, webhookUrl);
}

/**
 * Send a card-based message to Google Chat (for more complex formatting)
 */
export async function sendCardMessage(
  cards: any[],
  webhookUrl?: string
): Promise<void> {
  return sendToGoogleChat({ cards }, webhookUrl);
}
