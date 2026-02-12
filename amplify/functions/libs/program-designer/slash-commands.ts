import { logger } from "../logger";
/**
 * Program Design Slash Command Helpers
 *
 * This module provides slash command detection and parsing for program design functionality.
 * Pattern matches workout-creator/detection.ts for consistency.
 */

/**
 * Supported program design slash command
 * Single command for clarity and simplicity
 */
export const PROGRAM_DESIGN_COMMANDS = [
  'design-program',
] as const;

export type ProgramDesignCommand = typeof PROGRAM_DESIGN_COMMANDS[number];

/**
 * Checks if a command string is a program design command
 *
 * @param command - The command to check (without the leading slash)
 * @returns boolean indicating if this is a program design command
 *
 * @example
 * ```typescript
 * isProgramDesignCommand('design-program'); // Returns: true
 * isProgramDesignCommand('log-workout'); // Returns: false
 * ```
 */
export const isProgramDesignCommand = (command?: string): boolean => {
  if (!command) {
    return false;
  }

  const result = PROGRAM_DESIGN_COMMANDS.includes(command as ProgramDesignCommand);

  logger.info('🔍 isProgramDesignCommand: Check result:', {
    command,
    supportedCommands: PROGRAM_DESIGN_COMMANDS,
    isSupported: result
  });

  return result;
};
