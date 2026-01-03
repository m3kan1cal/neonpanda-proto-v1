/**
 * User Domain Library
 *
 * This library provides functionality for user profile management,
 * user queries, and user-related operations.
 */

export { UserProfile } from "./types";

export {
  validateCriticalTrainingDirective,
  normalizeCriticalTrainingDirective,
  DirectiveValidationResult,
} from "./validation";

export { extractUserName } from "./utils";
