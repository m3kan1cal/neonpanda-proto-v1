/**
 * Program Normalization Response Schema
 *
 * JSON Schema for Bedrock Tool Use - defines the structure for
 * AI-powered program normalization responses
 *
 * Pattern: Matches workout-normalization-schema.ts exactly
 */

import { PROGRAM_SCHEMA } from './program-schema';

export const NORMALIZATION_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['isValid', 'normalizedData', 'issues', 'confidence', 'summary'],
  properties: {
    isValid: {
      type: 'boolean',
      description: 'Whether the program data is valid after normalization. Set to TRUE if: (1) no issues found, OR (2) all issues were corrected. Set to FALSE only if critical issues exist that could NOT be corrected.'
    },
    normalizedData: PROGRAM_SCHEMA,
    issues: {
      type: 'array',
      description: 'List of issues found and corrected during normalization',
      items: {
        type: 'object',
        required: ['type', 'severity', 'field', 'description', 'corrected'],
        properties: {
          type: {
            type: 'string',
            enum: ['structure', 'data_quality', 'cross_reference', 'date_logic', 'phase_logic'],
            description: 'Category of the issue'
          },
          severity: {
            type: 'string',
            enum: ['error', 'warning'],
            description: 'Severity level of the issue'
          },
          field: {
            type: 'string',
            description: 'Field path where the issue was found'
          },
          description: {
            type: 'string',
            description: 'Clear description of the issue'
          },
          corrected: {
            type: 'boolean',
            description: 'Whether the issue was corrected'
          }
        }
      }
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence in the normalization result (0-1)'
    },
    summary: {
      type: 'string',
      description: 'Brief summary of normalization results and corrections made'
    }
  }
};


