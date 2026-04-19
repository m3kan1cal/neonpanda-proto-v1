import { MESSAGE_TYPES } from "../coach-conversation/types";

/**
 * Whether earlier turns in the thread included user images or documents.
 * Used for honest contextual copy (current turn flags are passed separately).
 */
export function getHistoryAttachmentFlags(
  messages: Array<{
    role: string;
    messageType?: string;
    imageS3Keys?: string[];
    documentS3Keys?: string[];
  }>,
): { historyHasUserImages: boolean; historyHasUserDocuments: boolean } {
  let historyHasUserImages = false;
  let historyHasUserDocuments = false;

  for (const m of messages) {
    if (m.role !== "user") {
      continue;
    }
    if (m.imageS3Keys && m.imageS3Keys.length > 0) {
      historyHasUserImages = true;
    }
    if (m.documentS3Keys && m.documentS3Keys.length > 0) {
      historyHasUserDocuments = true;
    } else if (m.messageType === MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS) {
      historyHasUserDocuments = true;
    }
    if (historyHasUserImages && historyHasUserDocuments) {
      break;
    }
  }

  return { historyHasUserImages, historyHasUserDocuments };
}
