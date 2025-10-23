/**
 * Response Processing Utilities
 *
 * This module provides utilities for cleaning and fixing AI-generated responses,
 * particularly for handling JSON parsing issues and markdown formatting.
 */

/**
 * Cleans response to remove markdown formatting and extract JSON
 * Removes code block markers and extracts content between first { and last }
 */
export const cleanResponse = (response: string): string => {
  // More aggressive markdown removal - handle all variations
  let cleaned = response
    .replace(/^```json\s*/gm, '')  // Remove ```json at start of lines
    .replace(/^```\s*/gm, '')       // Remove ``` at start of lines
    .replace(/\s*```$/gm, '')       // Remove ``` at end of lines
    .replace(/```json/g, '')        // Remove any remaining ```json
    .replace(/```/g, '');           // Remove any remaining ```

  // Trim whitespace
  cleaned = cleaned.trim();

  // Log if we detected and cleaned markdown (for monitoring)
  if (cleaned !== response.trim()) {
    console.info("✅ Stripped markdown code fences from AI response", {
      originalLength: response.length,
      cleanedLength: cleaned.length,
      hadMarkdown: true,
      originalStart: response.substring(0, 50),
      cleanedStart: cleaned.substring(0, 50),
    });
  }

  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
};

/**
 * Attempts to fix common JSON parsing issues from AI-generated content
 * @param jsonString - The potentially malformed JSON string
 * @returns Fixed JSON string or throws if unfixable
 */
export function fixMalformedJson(jsonString: string): string {
  try {
    // First, try parsing as-is
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    console.warn("JSON parsing failed, attempting to fix common issues...");

    let fixed = jsonString.trim();

    // Get error position if available for targeted fixes
    let errorPosition = -1;
    if (error instanceof SyntaxError && error.message.includes("position")) {
      const positionMatch = error.message.match(/position (\d+)/);
      if (positionMatch) {
        errorPosition = parseInt(positionMatch[1]);
        console.info("JSON error at position:", errorPosition);
      }
    }

    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Fix unescaped quotes in string values (basic attempt)
    fixed = fixed.replace(/([^\\])"([^",:}\]]*)"([^,:}\]]*")/g, '$1\\"$2\\"$3');

    // More aggressive brace balancing with position-aware fixing
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;

    console.info("Brace count analysis:", {
      openBraces,
      closeBraces,
      difference: closeBraces - openBraces,
    });

    if (openBraces > closeBraces) {
      // Add missing closing braces
      fixed += "}".repeat(openBraces - closeBraces);
      console.info(`Added ${openBraces - closeBraces} missing closing braces`);
    } else if (closeBraces > openBraces) {
      const extraBraces = closeBraces - openBraces;
      console.info(`Need to remove ${extraBraces} extra closing braces`);

      // If we have an error position, try to remove braces near that position first
      if (errorPosition > 0 && errorPosition < fixed.length) {
        // Look for problematic patterns around the error position
        const contextStart = Math.max(0, errorPosition - 100);
        const contextEnd = Math.min(fixed.length, errorPosition + 100);
        const context = fixed.substring(contextStart, contextEnd);

        console.info("Context around error:", {
          position: errorPosition,
          contextBefore: fixed.substring(contextStart, errorPosition),
          contextAfter: fixed.substring(errorPosition, contextEnd),
        });

        // Look for patterns like }}} or }}}} that indicate multiple extra braces
        const multipleCloseBraces = fixed.match(/}{2,}/g);
        if (multipleCloseBraces) {
          console.info(
            "Found multiple consecutive closing braces:",
            multipleCloseBraces
          );
          // Replace multiple consecutive closing braces with single ones
          fixed = fixed.replace(/}{2,}/g, "}");
          console.info("Replaced multiple consecutive closing braces");
        }
      }

      // After pattern-based fixes, check if we still need to remove braces
      const newOpenBraces = (fixed.match(/{/g) || []).length;
      const newCloseBraces = (fixed.match(/}/g) || []).length;
      const remainingExtra = newCloseBraces - newOpenBraces;

      if (remainingExtra > 0) {
        // Remove remaining extra braces from the end
        for (let i = 0; i < remainingExtra; i++) {
          const lastBraceIndex = fixed.lastIndexOf("}");
          if (lastBraceIndex !== -1) {
            fixed =
              fixed.substring(0, lastBraceIndex) +
              fixed.substring(lastBraceIndex + 1);
          }
        }
        console.info(
          `Removed ${remainingExtra} remaining extra closing braces from end`
        );
      } else if (remainingExtra < 0) {
        // We need to add missing closing braces after cleaning up extras
        const missingBraces = Math.abs(remainingExtra);
        fixed += "}".repeat(missingBraces);
        console.info(`Added ${missingBraces} missing closing braces to end`);
      }
    }

    // Try parsing the fixed version
    try {
      JSON.parse(fixed);
      console.info("Successfully fixed malformed JSON");
      return fixed;
    } catch (fixError) {
      console.error(
        "Could not fix malformed JSON after all attempts:",
        fixError
      );
      throw new Error(
        `Unable to fix malformed JSON: ${
          fixError instanceof Error ? fixError.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Convenience function that applies both cleaning and fixing in sequence
 * Useful for processing AI responses that might have both markdown formatting and JSON issues
 */
export const parseJsonWithFallbacks = (response: string): any => {
  const cleanedResponse = cleanResponse(response);
  const fixedResponse = fixMalformedJson(cleanedResponse);
  return JSON.parse(fixedResponse);
};