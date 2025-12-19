/**
 * Program Designer Library
 *
 * This library provides functionality for creating training programs through
 * conversational AI-guided sessions in coach conversations.
 */

export {
  PROGRAM_DESIGN_COMMANDS,
  isProgramDesignCommand,
  type ProgramDesignCommand,
} from "./slash-commands";

export {
  ProgramDesignerSession,
  ProgramDesignerTodoList,
  REQUIRED_PROGRAM_FIELDS,
} from "./types";

export {
  loadSessionData,
  markSessionComplete,
  saveSessionAndTriggerProgramGeneration,
  checkProgramGenerationIdempotency,
  createProgramGenerationLock,
  createProgramGenerationFailure,
} from "./session-management";

export {
  createEmptyProgramTodoList,
  getRequiredPendingItems,
  getTodoProgress,
  isSessionComplete,
  getPendingItems,
} from "./todo-list-utils";

export { extractAndUpdateTodoList } from "./todo-extraction";

export {
  generateNextQuestion,
  generateNextQuestionStream,
  generateCompletionMessage,
} from "./question-generator";

export { handleTodoListConversation } from "./conversation-handler";

export {
  startProgramDesignCollection,
  handleProgramDesignerFlow,
} from "./handler-helpers";
