import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { PathParameters } from './types';
import {
  STREAMING_ROUTE_PATTERNS,
  AVAILABLE_STREAMING_PATTERNS,
  detectPatternFromUrl,
  getRequiredParams
} from './route-patterns';

/**
 * Path Parameter Extraction Utilities for Lambda Function URLs
 * Better approach that matches API Gateway patterns and supports multiple route formats
 */

/**
 * Extracts path parameters from Lambda Function URL rawPath
 * Supports multiple route patterns and provides better error handling
 */
export function extractPathParameters(rawPath: string, routePattern?: string): PathParameters {
  if (!rawPath) {
    console.warn('⚠️ Empty rawPath provided to extractPathParameters');
    return {};
  }

  // Clean and split the path
  const cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
  const pathParts = cleanPath.split('/').filter(part => part.length > 0);

  console.info('🔍 Extracting path parameters:', {
    rawPath,
    pathParts,
    length: pathParts.length,
    routePattern
  });

  // If no route pattern specified, try to auto-detect the route type
  if (!routePattern) {
    return autoDetectPathParameters(pathParts);
  }

  // Parse based on specific route pattern
  return parsePathByPattern(pathParts, routePattern);
}

/**
 * Extracts parameters from path parts using a detected pattern
 */
function extractParamsFromDetectedPattern(pathParts: string[], pattern: string): PathParameters {
  const params: PathParameters = {};
  const patternParts = pattern.split('/');

  if (pathParts.length !== patternParts.length) {
    return params;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    // If this is a parameter (starts with {)
    if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
      const paramName = patternPart.slice(1, -1); // Remove { and }
      params[paramName] = pathPart;
    }
  }

  return params;
}

/**
 * Auto-detects the route type and extracts parameters
 * Handles the most common patterns in the application
 */
function autoDetectPathParameters(pathParts: string[]): PathParameters {
  const params: PathParameters = {};

  // Try to detect the pattern automatically
  const detectedPattern = detectPatternFromUrl(pathParts.join('/'));

  if (detectedPattern) {
    // Extract parameters based on the detected pattern
    const extractedParams = extractParamsFromDetectedPattern(pathParts, detectedPattern);

    if (Object.keys(extractedParams).length > 0) {
      console.info('✅ Auto-detected streaming route:', {
        pattern: detectedPattern,
        params: extractedParams
      });
      return extractedParams;
    }
  }

  console.warn('⚠️ Unknown path pattern, extracting what we can:', {
    pathParts,
    availablePatterns: AVAILABLE_STREAMING_PATTERNS
  });

  // Fallback: try to extract userId if it exists in a users/* pattern
  if (pathParts.length >= 2 && pathParts[0] === 'users') {
    params.userId = pathParts[1];
  }

  return params;
}

/**
 * Parses path parameters based on a specific route pattern
 * Future enhancement for more complex routing needs
 */
function parsePathByPattern(pathParts: string[], pattern: string): PathParameters {
  const params: PathParameters = {};
  const patternParts = pattern.split('/').filter(part => part.length > 0);

  if (pathParts.length !== patternParts.length) {
    console.warn('⚠️ Path length mismatch:', {
      expected: patternParts.length,
      actual: pathParts.length,
      pattern,
      path: pathParts.join('/')
    });
    return params;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    // Check if this is a parameter (starts with {)
    if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
      const paramName = patternPart.slice(1, -1); // Remove { and }
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      // Fixed path segment doesn't match
      console.warn('⚠️ Path segment mismatch:', {
        expected: patternPart,
        actual: pathPart,
        position: i
      });
      return {};
    }
  }

  return params;
}


/**
 * Validates that required path parameters are present
 * Can auto-detect required parameters based on route pattern
 */
export function validateRequiredPathParams(
  pathParams: PathParameters,
  required?: readonly string[],
  routePattern?: string
): { isValid: boolean; missing: string[] } {
  // Auto-detect required parameters if route pattern provided
  let requiredParams = required;
  if (!requiredParams && routePattern) {
    requiredParams = getRequiredParams(routePattern);
  }

  if (!requiredParams || requiredParams.length === 0) {
    return { isValid: true, missing: [] };
  }

  const missing = requiredParams.filter(param => !pathParams[param]);

  return {
    isValid: missing.length === 0,
    missing
  };
}
