/**
 * Response Processing Utilities
 *
 * This module provides utilities for cleaning and fixing AI-generated responses,
 * particularly for handling JSON parsing issues and markdown formatting.
 */

/**
 * Converts a string to Title Case (first letter of each word capitalized)
 * Handles multi-word strings with spaces
 *
 * @example
 * toTitleCase("barbell") => "Barbell"
 * toTitleCase("squat rack") => "Squat Rack"
 * toTitleCase("pull-up bar") => "Pull-Up Bar"
 */
export function toTitleCase(str: string): string {
  if (!str) return str;

  return str
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join("-"),
    )
    .join(" ");
}

/**
 * Cleans response to remove markdown formatting and extract JSON
 * Removes code block markers and extracts content between:
 * - first { and last } for objects
 * - first [ and last ] for arrays
 */
export const cleanResponse = (response: string): string => {
  // More aggressive markdown removal - handle all variations
  let cleaned = response
    .replace(/^```json\s*/gm, "") // Remove ```json at start of lines
    .replace(/^```\s*/gm, "") // Remove ``` at start of lines
    .replace(/\s*```$/gm, "") // Remove ``` at end of lines
    .replace(/```json/g, "") // Remove any remaining ```json
    .replace(/```/g, ""); // Remove any remaining ```

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

  // Detect if this is an array or object based on the first non-whitespace character
  const firstNonWhitespace = cleaned.replace(/^\s+/, "")[0];

  if (firstNonWhitespace === "[") {
    // Handle JSON arrays - extract from first [ to last ]
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");

    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      const extracted = cleaned.substring(firstBracket, lastBracket + 1);

      if (extracted !== cleaned) {
        console.info("✅ Extracted JSON array, removed surrounding text", {
          originalLength: cleaned.length,
          extractedLength: extracted.length,
          removedPrefix: firstBracket > 0,
          removedSuffix: lastBracket < cleaned.length - 1,
        });
      }

      cleaned = extracted;
    }
  } else if (firstNonWhitespace === "{") {
    // Handle JSON objects - extract from first { to last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);

      if (extracted !== cleaned) {
        console.info("✅ Extracted JSON object, removed surrounding text", {
          originalLength: cleaned.length,
          extractedLength: extracted.length,
          removedPrefix: firstBrace > 0,
          removedSuffix: lastBrace < cleaned.length - 1,
        });
      }

      cleaned = extracted;
    }
  }

  return cleaned;
};

/**
 * Strips any non-JSON text from the start and end of a string,
 * leaving only the core JSON object or array. More aggressive than cleanResponse.
 * @param response - The raw string response from the AI
 * @returns The extracted JSON string, or the original string if no JSON is found
 */
export const stripNonJson = (response: string): string => {
  const cleaned = response.trim();

  // Find the first character of a JSON object or array
  const firstBracket = cleaned.indexOf("[");
  const firstBrace = cleaned.indexOf("{");
  let startIndex = -1;

  if (firstBracket !== -1 && firstBrace !== -1) {
    startIndex = Math.min(firstBracket, firstBrace);
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  } else {
    startIndex = firstBrace;
  }

  if (startIndex === -1) {
    // No JSON found, return the original (likely an error message)
    return cleaned;
  }

  // Find the last character of a JSON object or array
  const lastBracket = cleaned.lastIndexOf("]");
  const lastBrace = cleaned.lastIndexOf("}");
  const endIndex = Math.max(lastBracket, lastBrace);

  if (endIndex === -1 || endIndex < startIndex) {
    // Unmatched start or invalid range, return original
    return cleaned;
  }

  const extracted = cleaned.substring(startIndex, endIndex + 1);

  if (extracted !== cleaned) {
    console.info("✅ Stripped non-JSON text from response", {
      originalLength: cleaned.length,
      extractedLength: extracted.length,
      removedPrefix: startIndex > 0,
      removedSuffix: endIndex < cleaned.length - 1,
    });
  }

  return extracted;
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
    console.warn("JSON parsing failed, attempting to fix common issues..");

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

    // More aggressive brace/bracket balancing with position-aware fixing
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    console.info("Brace/Bracket count analysis:", {
      openBraces,
      closeBraces,
      braceDifference: closeBraces - openBraces,
      openBrackets,
      closeBrackets,
      bracketDifference: closeBrackets - openBrackets,
    });

    // Fix bracket imbalance (for arrays)
    if (openBrackets > closeBrackets) {
      fixed += "]".repeat(openBrackets - closeBrackets);
      console.info(
        `Added ${openBrackets - closeBrackets} missing closing brackets`,
      );
    }

    // Fix brace imbalance (for objects)
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
            multipleCloseBraces,
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
          `Removed ${remainingExtra} remaining extra closing braces from end`,
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
        fixError,
      );
      throw new Error(
        `Unable to fix malformed JSON: ${
          fixError instanceof Error ? fixError.message : "Unknown error"
        }`,
      );
    }
  }
}

/**
 * Generates all possible prefixes of a string (for partial trigger matching)
 * @example generatePrefixes("[HELLO]") => ["[HELLO", "[HELL", "[HEL", "[HE", "[H", "["]
 */
function generatePrefixes(str: string): string[] {
  const prefixes: string[] = [];
  // Generate from longest to shortest (excluding the complete string itself)
  for (let i = str.length - 1; i > 0; i--) {
    prefixes.push(str.substring(0, i));
  }
  return prefixes;
}

/**
 * Removes [GENERATE_PROGRAM] and other tool invocation triggers from streaming content
 * Handles triggers that may be split across chunk boundaries
 *
 * @param chunk - The streaming chunk to clean
 * @param buffer - Accumulated partial trigger from previous chunks (for stateful use)
 * @returns Object with cleanedContent, wasTriggerRemoved flag, and updated buffer
 */
export function removeTriggerFromStream(
  chunk: string,
  buffer: string = "",
): { cleanedContent: string; wasTriggerRemoved: boolean; buffer: string } {
  // Combine buffer with new chunk
  const combined = buffer + chunk;

  // List of trigger strings to remove (tools, markers, etc.)
  const triggerStrings = [
    "[GENERATE_PROGRAM]",
    "[GENERATE]",
    "[BUILD_TRAINING_PROGRAM]",
    "[BUILD_WORKOUT]",
    "[SAVE_MEMORY]",
  ];

  // Check if we have a complete trigger in the combined text
  let cleanedContent = combined;
  let wasTriggerRemoved = false;

  for (const trigger of triggerStrings) {
    if (cleanedContent.includes(trigger)) {
      cleanedContent = cleanedContent.replace(
        new RegExp(trigger.replace(/[[\]]/g, "\\$&"), "gi"),
        "",
      );
      wasTriggerRemoved = true;
    }
  }

  // Generate all possible partial triggers from our trigger strings
  const possiblePartials = triggerStrings.flatMap((trigger) =>
    generatePrefixes(trigger),
  );
  // Sort by length (longest first) to match the most specific partial first
  possiblePartials.sort((a, b) => b.length - a.length);

  // Check if the end of cleanedContent matches a partial trigger
  let newBuffer = "";
  for (const partial of possiblePartials) {
    if (cleanedContent.endsWith(partial)) {
      // Hold this partial in the buffer for the next chunk
      newBuffer = partial;
      cleanedContent = cleanedContent.slice(0, -partial.length);
      console.info(`🔄 Buffering partial trigger: "${partial}"`);
      break;
    }
  }

  if (wasTriggerRemoved) {
    console.info("✂️ Removed tool invocation trigger from streaming chunk");
  }

  return {
    cleanedContent,
    wasTriggerRemoved,
    buffer: newBuffer,
  };
}

/**
 * Detects and fixes double-encoded JSON strings
 * Sometimes the AI returns JSON as a string (e.g., "{\"key\":\"value\"}") instead of an actual object
 * This happens when the AI wraps the JSON in quotes or doesn't use the tool properly
 */
function fixDoubleEncodedJson(jsonString: string): string {
  const trimmed = jsonString.trim();

  // Check if the entire string is a JSON-encoded string (starts and ends with quotes)
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      // Try to parse the outer quotes away
      const parsed = JSON.parse(trimmed);

      // If the result is a string that looks like JSON, we had double-encoding
      if (
        typeof parsed === "string" &&
        (parsed.startsWith("{") || parsed.startsWith("["))
      ) {
        console.warn(
          "⚠️ Fixed double-encoded JSON - AI returned JSON wrapped in quotes",
        );
        return parsed; // Return the inner JSON string
      }
    } catch (e) {
      // If parsing fails, just return original
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Recursively fixes double-encoded properties within an already-parsed object
 * This handles cases where the AI properly returns an object, but some properties are stringified JSON
 *
 * Use this AFTER JSON.parse() to fix property-level double-encoding
 */
export function fixDoubleEncodedProperties(data: any): any {
  // If data is a string that looks like JSON, parse it
  if (
    typeof data === "string" &&
    (data.startsWith("{") || data.startsWith("["))
  ) {
    try {
      const parsed = JSON.parse(data);
      console.warn(
        "⚠️ Fixed double-encoded property - value was JSON string instead of object",
      );
      return fixDoubleEncodedProperties(parsed); // Recursively check the parsed result
    } catch (e) {
      // If parsing fails, return as-is
      return data;
    }
  }

  // If data is an object, recursively check all properties
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const fixed: any = {};
    let hadDoubleEncoding = false;

    for (const [key, value] of Object.entries(data)) {
      const fixedValue = fixDoubleEncodedProperties(value);
      fixed[key] = fixedValue;
      if (fixedValue !== value) {
        hadDoubleEncoding = true;
      }
    }

    if (hadDoubleEncoding) {
      console.warn("⚠️ Fixed double-encoded properties in object");
    }

    return fixed;
  }

  // If data is an array, recursively check all elements
  if (Array.isArray(data)) {
    return data.map((item) => fixDoubleEncodedProperties(item));
  }

  return data;
}

/**
 * Convenience function that applies both cleaning and fixing in sequence
 * Useful for processing AI responses that might have both markdown formatting and JSON issues
 *
 * Pipeline:
 * 1. stripNonJson - removes non-JSON text from start/end
 * 2. cleanResponse - removes markdown formatting
 * 3. fixMalformedJson - fixes common JSON issues (trailing commas, unbalanced braces)
 * 4. fixDoubleEncodedJson - unwraps double-encoded JSON strings
 * 5. JSON.parse - final parse
 * 6. fixDoubleEncodedProperties - fixes property-level double-encoding (after parse)
 */
export const parseJsonWithFallbacks = (response: string): any => {
  const strippedResponse = stripNonJson(response);
  const cleanedResponse = cleanResponse(strippedResponse);
  const fixedResponse = fixMalformedJson(cleanedResponse);
  const unquotedResponse = fixDoubleEncodedJson(fixedResponse);
  const parsed = JSON.parse(unquotedResponse);
  return fixDoubleEncodedProperties(parsed);
};
