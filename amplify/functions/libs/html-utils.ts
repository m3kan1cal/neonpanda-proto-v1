/**
 * HTML Response Utilities
 *
 * Utilities for creating branded HTML responses for public-facing pages
 * (unsubscribe, email verification, password reset, error pages, etc.)
 */

import { getAppUrl } from "./domain-utils";

/**
 * HTML response structure
 */
export interface HtmlResponse {
  statusCode: number;
  headers: {
    "Content-Type": string;
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
  body: string,
): HtmlResponse {
  const appUrl = getAppUrl();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - NeonPanda</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      font-size: 16px;
    }
    p {
      font-size: 16px;
      margin: 15px 0;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f9f9f9;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .logo-header {
      background-color: #0a0a0a;
      padding: 10px;
      margin: -30px -30px 30px -30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .logo-header img {
      max-width: 400px;
      height: auto;
    }
    h1 {
      color: #ff6ec7;
      font-size: 28px;
      margin-bottom: 10px;
      margin-top: 0;
    }
    a {
      color: #00ffff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 10px 0;
    }
    .footer a {
      color: #00ffff;
      text-decoration: none;
    }
    .highlight {
      background-color: #f0f9ff;
      border-left: 4px solid #00ffff;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .feature-box {
      background-color: #fff5f8;
      border-left: 4px solid #FF10F0;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="logo-header">
        <img src="https://neonpanda.ai/images/logo-dark-sm.webp" alt="NeonPanda Logo">
      </div>
      <h1>${title}</h1>
      ${body}
      <div class="footer">
        <p><strong>NeonPanda</strong> – Where electric intelligence meets approachable excellence.</p>
        <p>Questions? Reach out anytime.</p>
        <p style="margin-top: 15px;">
          <a href="${appUrl}" style="margin-right: 15px;">Visit NeonPanda</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
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
  additionalContent?: string,
): HtmlResponse {
  const body = `
    <p style="font-size: 18px; margin-bottom: 20px;">${message}</p>
    ${additionalContent || ""}
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
  additionalContent?: string,
): HtmlResponse {
  const body = `
    <p style="font-size: 18px; margin-bottom: 20px;">${message}</p>
    ${additionalContent || ""}
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
  message: string,
): HtmlResponse {
  const body = `
    <p style="color: #f59e0b; font-weight: 600; font-size: 18px; margin-bottom: 20px;">⚠ ${message}</p>
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
  message: string,
): HtmlResponse {
  const body = `
    <p style="font-size: 18px; margin-bottom: 20px;">${message}</p>
  `;
  return createHtmlResponse(400, title, body);
}
