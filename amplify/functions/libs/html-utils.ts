/**
 * HTML Response Utilities
 *
 * Utilities for creating branded HTML responses for public-facing pages
 * (unsubscribe, email verification, password reset, error pages, etc.)
 */

import { getAppUrl } from './domain-utils';

/**
 * HTML response structure
 */
export interface HtmlResponse {
  statusCode: number;
  headers: {
    'Content-Type': string;
  };
  body: string;
}

/**
 * Create branded HTML response for user-facing pages
 *
 * @param statusCode - HTTP status code
 * @param title - Page title (shown in header and browser tab)
 * @param body - HTML body content
 * @returns Formatted HTML response
 */
export function createHtmlResponse(
  statusCode: number,
  title: string,
  body: string
): HtmlResponse {
  const appUrl = getAppUrl();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - NeonPanda</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin: -40px -40px 30px -40px;
      text-align: center;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    p {
      font-size: 16px;
      margin: 15px 0;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    ${body}
    <div class="footer">
      <p>NeonPanda - Your AI-Powered Training Coach</p>
      <p><a href="${appUrl}">Visit NeonPanda</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: html,
  };
}

/**
 * Create success HTML response with standard success styling
 *
 * @param title - Page title
 * @param message - Success message
 * @param additionalContent - Optional additional HTML content
 * @returns Formatted HTML response
 */
export function createSuccessHtmlResponse(
  title: string,
  message: string,
  additionalContent?: string
): HtmlResponse {
  const body = `
    <p style="color: #10b981; font-weight: 600; font-size: 18px;">✓ ${message}</p>
    ${additionalContent || ''}
  `;
  return createHtmlResponse(200, title, body);
}

/**
 * Create error HTML response with standard error styling
 *
 * @param title - Page title
 * @param message - Error message
 * @param additionalContent - Optional additional HTML content
 * @returns Formatted HTML response
 */
export function createErrorHtmlResponse(
  title: string,
  message: string,
  additionalContent?: string
): HtmlResponse {
  const body = `
    <p style="color: #ef4444; font-weight: 600; font-size: 18px;">✗ ${message}</p>
    ${additionalContent || ''}
  `;
  return createHtmlResponse(500, title, body);
}

/**
 * Create not found HTML response (404)
 *
 * @param title - Page title
 * @param message - Not found message
 * @returns Formatted HTML response
 */
export function createNotFoundHtmlResponse(
  title: string,
  message: string
): HtmlResponse {
  const body = `
    <p style="color: #f59e0b; font-weight: 600; font-size: 18px;">⚠ ${message}</p>
    <p>If you believe this is an error, please contact our support team.</p>
  `;
  return createHtmlResponse(404, title, body);
}

/**
 * Create bad request HTML response (400)
 *
 * @param title - Page title
 * @param message - Error message
 * @returns Formatted HTML response
 */
export function createBadRequestHtmlResponse(
  title: string,
  message: string
): HtmlResponse {
  const body = `
    <p style="color: #f59e0b; font-weight: 600; font-size: 18px;">⚠ ${message}</p>
    <p>Please check the link and try again.</p>
  `;
  return createHtmlResponse(400, title, body);
}

