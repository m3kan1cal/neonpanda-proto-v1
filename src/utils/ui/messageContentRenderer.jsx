import { MarkdownRenderer } from "../../components/shared/MarkdownRenderer";
import ImageWithPresignedUrl from "../../components/shared/ImageWithPresignedUrl";
import DocumentThumbnail from "../../components/shared/DocumentThumbnail";
import {
  getMessageDisplayContent,
  isMessageStreaming,
} from "./streamingUiHelper.jsx";

/**
 * Builds a `renderMessageContent(message, options)` function bound to a given
 * `userId` and `agentState`. Used by the three streaming-conversation surfaces
 * (CoachConversations, CoachCreator, ProgramDesigner) which all rendered the
 * same three-mode logic inline before — keeping it here is the single source
 * of truth so a future fix doesn't have to be made three times.
 *
 * Returned function supports three modes via `options`:
 *   - default (no options): full render — attachments + text. Used for user
 *     messages where the bubble is one piece.
 *   - `{ attachmentsOnly: true }`: render only the attachments row (or null
 *     when there are none). Used by AI branches above the interleaved
 *     MessageContentWithToolCalls body, since segment-mode skips attachments.
 *   - `{ textOverride, isLastText }`: render only the given text slice (no
 *     attachments). Used by MessageContentWithToolCalls to render individual
 *     text segments interleaved with tool-call blocks. The `isLastText` flag
 *     scopes the streaming-cursor decoration to the final segment so earlier
 *     segments (already complete) don't blink.
 *
 * @param {string} userId - User ID for presigned image/document URLs
 * @param {Object} agentState - Agent state used by streaming-content helpers
 */
export function createMessageContentRenderer(userId, agentState) {
  return function renderMessageContent(message, options = {}) {
    const {
      textOverride,
      isLastText = true,
      attachmentsOnly = false,
    } = options;

    if (attachmentsOnly) {
      const hasImages =
        message.imageS3Keys && message.imageS3Keys.length > 0;
      const hasDocuments =
        message.documentS3Keys && message.documentS3Keys.length > 0;
      if (!hasImages && !hasDocuments) return null;
      return (
        <div className="flex flex-wrap gap-2 mb-2">
          {message.imageS3Keys?.map((s3Key, index) => (
            <ImageWithPresignedUrl
              key={index}
              s3Key={s3Key}
              userId={userId}
              index={index}
            />
          ))}
          {message.documentS3Keys?.map((s3Key, index) => (
            <DocumentThumbnail key={index} s3Key={s3Key} userId={userId} />
          ))}
        </div>
      );
    }

    const isSegment = textOverride !== undefined;
    const displayContent = isSegment
      ? textOverride
      : getMessageDisplayContent(message, agentState);
    const streaming = isMessageStreaming(message, agentState);

    return (
      <>
        {/* Attachments — only in full-render mode. Segment-mode skips them
            (segments are pure text); the AI branch renders attachments once
            above the interleaved body via { attachmentsOnly: true }. */}
        {!isSegment &&
          ((message.imageS3Keys && message.imageS3Keys.length > 0) ||
            (message.documentS3Keys && message.documentS3Keys.length > 0)) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.imageS3Keys?.map((s3Key, index) => (
                <ImageWithPresignedUrl
                  key={index}
                  s3Key={s3Key}
                  userId={userId}
                  index={index}
                />
              ))}
              {message.documentS3Keys?.map((s3Key, index) => (
                <DocumentThumbnail key={index} s3Key={s3Key} userId={userId} />
              ))}
            </div>
          )}

        {displayContent &&
          (message.type === "ai" ? (
            // AI messages use full markdown parsing with streaming cursor.
            // Only the LAST text segment gets the streaming cursor, so a
            // pre-tool-call segment doesn't keep blinking after the agent
            // has moved on to a tool call and subsequent text.
            <MarkdownRenderer
              content={displayContent}
              className={
                streaming && isLastText && displayContent
                  ? "streaming-cursor"
                  : ""
              }
            />
          ) : (
            // User messages: simple line break rendering
            displayContent.split("\n").map((line, index, array) => (
              <span key={index}>
                {line}
                {index < array.length - 1 && <br />}
              </span>
            ))
          ))}
      </>
    );
  };
}
