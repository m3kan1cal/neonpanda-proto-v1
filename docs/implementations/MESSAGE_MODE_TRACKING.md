# Message-Level Mode Tracking - Implementation

## Overview
Added `mode` property to individual message metadata to track which conversation mode (Chat vs. Build) each message was created in. This ensures accurate visual styling even when users switch modes mid-conversation.

---

## Problem Statement

**Before this change:**
- Messages were styled based on the **current conversation mode**
- If a user switched from Chat → Build mid-conversation, ALL previous messages would change to purple "Build Mode" styling
- This was historically inaccurate and confusing

**After this change:**
- Each message stores which mode it was created in
- Messages maintain their original styling regardless of current conversation mode
- Users can switch modes freely without affecting message history

---

## Changes Made

### 1. **Type Definition** (`amplify/functions/libs/coach-conversation/types.ts`)

**Added `mode` to `CoachMessage` metadata:**
```typescript
export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;

  messageType?: 'text' | 'text_with_images' | 'voice';
  imageS3Keys?: string[];

  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
    mode?: ConversationMode; // NEW: Track which mode this message was created in
  };
}
```

---

### 2. **Backend - Stream Handler** (`amplify/functions/stream-coach-conversation/handler.ts`)

**Capture mode when creating AI messages:**

**Extract conversation mode (line 808):**
```typescript
const conversationMode = conversationData.existingConversation.attributes.mode || CONVERSATION_MODES.CHAT;
```

**Store in message metadata (line 886):**
```typescript
const newAiMessage: CoachMessage = {
  id: `msg_${Date.now()}_assistant`,
  role: "assistant",
  content: fullAiResponse,
  timestamp: new Date(),
  metadata: {
    model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY,
    mode: conversationMode, // NEW: Track which mode this message was created in
  },
};
```

---

### 3. **Backend - Message Handler** (`amplify/functions/send-coach-conversation-message/handler.ts`)

**Two locations where AI messages are created:**

**Location 1 - Non-streaming response (lines 107, 282):**
```typescript
// Extract conversation mode
const conversationMode = existingConversation.attributes.mode || 'chat';

// Create AI message with mode
const newAiMessage: CoachMessage = {
  id: `msg_${Date.now()}_assistant`,
  role: "assistant",
  content: aiResponseContent,
  timestamp: new Date(),
  metadata: {
    model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY,
    mode: conversationMode, // NEW
  },
};
```

**Location 2 - Streaming response (lines 510, 517):**
```typescript
// Create final AI message
const conversationMode = existingConversation.attributes.mode || 'chat';
const newAiMessage: CoachMessage = {
  id: `msg_${Date.now()}_assistant`,
  role: "assistant",
  content: fullAiResponse,
  timestamp: new Date(),
  metadata: {
    mode: conversationMode, // NEW
  },
};
```

---

### 4. **Frontend - Visual Styling** (`src/components/CoachConversations.jsx`)

**Changed from conversation-level mode to message-level mode:**

**Build Mode Badge (line 173):**
```jsx
{/* BEFORE: conversationMode === CONVERSATION_MODES.BUILD */}
{/* AFTER: */}
{message.type === "ai" && message.metadata?.mode === CONVERSATION_MODES.BUILD && (
  <div className="flex items-center gap-1.5 px-2 py-0.5 mb-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-full w-fit">
    <span className="text-xs text-synthwave-neon-purple font-rajdhani font-semibold uppercase tracking-wide">
      Build Mode
    </span>
  </div>
)}
```

**Message Bubble Styling (line 191):**
```jsx
{/* BEFORE: message.type === "ai" && conversationMode === CONVERSATION_MODES.BUILD */}
{/* AFTER: */}
message.type === "ai" && message.metadata?.mode === CONVERSATION_MODES.BUILD
  ? "bg-gradient-to-br from-synthwave-neon-purple/5 to-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 text-synthwave-text-primary shadow-lg shadow-synthwave-neon-purple/10 backdrop-blur-sm"
  : containerPatterns.aiChatBubble
```

**Status Dots (lines 217, 222):**
```jsx
{/* BEFORE: conversationMode === CONVERSATION_MODES.BUILD */}
{/* AFTER: */}
<div className={`w-3 h-3 rounded-full ${
  message.metadata?.mode === CONVERSATION_MODES.BUILD
    ? "bg-synthwave-neon-purple"
    : "bg-synthwave-neon-cyan"
}`}></div>
```

**Removed unnecessary React.memo check:**
```jsx
// REMOVED: conversationModeChanged check since messages won't change based on conversation mode
const shouldRerender =
  messageChanged ||
  streamingStateChanged ||
  coachNameChanged ||
  userChanged;
  // conversationModeChanged removed - no longer needed!
```

---

## Behavior Comparison

### **Before (Conversation-Level Mode):**

```
User starts conversation in Chat mode:
  AI: "Let's work on your squat form" [CYAN]

User switches to Build mode:
  AI: "Let's work on your squat form" [NOW PURPLE! ❌ Wrong]
  AI: "What are your training goals?" [PURPLE ✓ Correct]
```

### **After (Message-Level Mode):**

```
User starts conversation in Chat mode:
  AI: "Let's work on your squat form" [CYAN, mode: 'chat']

User switches to Build mode:
  AI: "Let's work on your squat form" [STILL CYAN ✓ Correct - created in chat mode]
  AI: "What are your training goals?" [PURPLE ✓ Correct - created in build mode]
```

---

## Data Flow

### **Message Creation Flow:**

```
1. User sends message to conversation
2. Backend determines current conversation mode
   └─ conversationMode = conversation.attributes.mode || 'chat'
3. AI generates response
4. Backend creates AI message with mode in metadata
   └─ metadata: { mode: conversationMode, model: "..." }
5. Message saved to DynamoDB with mode
6. Frontend receives message
7. Frontend styles message based on message.metadata.mode
   └─ Not based on current conversation mode!
```

---

## Backwards Compatibility

**Existing messages without `mode`:**
- Default to cyan (chat) styling via optional chaining: `message.metadata?.mode`
- No breaking changes for old conversations
- New messages will have mode tracked going forward

**Default behavior:**
```javascript
// If mode is undefined, this evaluates to false
message.metadata?.mode === CONVERSATION_MODES.BUILD  // false

// So messages default to Chat (cyan) styling
```

---

## Benefits

### 1. **Historical Accuracy** ✅
- Messages remember which mode they were created in
- Visual history is preserved accurately
- No retroactive styling changes

### 2. **Mode Switching Freedom** ✅
- Users can switch between Chat and Build modes freely
- Past messages maintain their original context
- No confusion about what the AI was doing

### 3. **Better UX** ✅
- Clear visual distinction between chat coaching vs. program building
- Consistent message appearance regardless of current mode
- Users can easily scan conversation to see when mode changed

### 4. **Data Integrity** ✅
- Mode is part of the message record in DynamoDB
- Can query/analyze messages by mode
- Audit trail of conversation context

---

## Testing Checklist

### Backend Testing:
- [ ] **New conversation in Chat mode**: AI messages have `metadata.mode: 'chat'`
- [ ] **New conversation in Build mode**: AI messages have `metadata.mode: 'build'`
- [ ] **Switch Chat → Build**: New AI messages have `mode: 'build'`
- [ ] **Switch Build → Chat**: New AI messages have `mode: 'chat'`
- [ ] **Stream handler**: Messages include mode
- [ ] **Non-streaming handler**: Messages include mode

### Frontend Testing:
- [ ] **Chat message styling**: Cyan background, no badge
- [ ] **Build message styling**: Purple background, "BUILD MODE" badge
- [ ] **Mode switch**: Old messages keep original styling
- [ ] **New messages**: Use their own mode for styling
- [ ] **Typing indicator**: Uses conversation mode (not message mode)
- [ ] **Old messages**: Messages without mode default to cyan (chat)

### Integration Testing:
- [ ] Create conversation in Chat mode, send 3 messages
- [ ] Toggle to Build mode
- [ ] Verify: Previous 3 messages are still cyan
- [ ] Send new message
- [ ] Verify: New AI response is purple with badge
- [ ] Toggle back to Chat mode
- [ ] Verify: All messages keep their original colors
- [ ] Send another message
- [ ] Verify: New AI response is cyan, no badge
- [ ] Refresh page
- [ ] Verify: All message styling persists correctly

---

## Technical Notes

### **Why not store mode on user messages?**
- User messages don't need mode tracking
- Only AI responses need to indicate their operational context
- User messages are always styled the same (pink)

### **Why use message.metadata?.mode instead of message.mode?**
- Keeps mode with other AI response metadata (model, tokens, etc.)
- Optional chaining provides backwards compatibility
- Consistent with existing metadata structure

### **Why keep conversationMode prop in MessageItem?**
- Still used for typing indicator (which isn't a persisted message yet)
- Could be removed in future refactor if typing uses different logic
- Kept for minimal code changes

---

## Summary

✅ **Each message now tracks which mode it was created in**
✅ **Messages maintain original styling even when conversation mode switches**
✅ **Backend captures mode when creating AI messages (3 locations)**
✅ **Frontend uses `message.metadata?.mode` for styling**
✅ **Backwards compatible with existing messages**
✅ **No linter errors**

**Result**: Users can freely switch between Chat and Build modes without affecting message history. Each message's visual styling accurately reflects the mode it was created in! 🎯

