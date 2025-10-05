# Stream Coach Creator - Quick Reference Card

> **All questions answered - ready to implement**

## 📋 Configuration Summary

| What | Value |
|------|-------|
| **Pinecone Namespace** | `methodology` (singular) |
| **Pinecone Function** | `queryPineconeContext()` from `api-helpers.ts` |
| **Memory Detection** | `analyzeMemoryNeeds()` from `libs/memory/detection` |
| **Memory Query** | `queryMemories(userId, null, ...)` - null = ALL coaches |
| **Context Limits** | 2000 chars each (methodologies + memories) |
| **Memory Saving** | ❌ NO (retrieval only in V2) |
| **Testing** | Sequential: non-streaming first, then streaming |
| **Environment Vars** | ✅ Already configured in `api-helpers.ts` |

---

## 🔧 Key Code Snippets

### Pinecone Query (Methodologies)

```typescript
import { queryPineconeContext } from '../libs/api-helpers';

const pineconeResults = await queryPineconeContext(
  userId,
  searchQuery,
  {
    topK: 5,
    includeMethodology: true,          // ← Only methodologies
    includeWorkouts: false,
    includeCoachCreator: false,
    includeConversationSummaries: false,
    enableReranking: true
  }
);

const pineconeContext = pineconeResults.matches
  .map(match => match.content || '')
  .filter(text => text.length > 0)
  .join('\n\n')
  .substring(0, 2000); // Limit to 2000 chars
```

---

### Smart Memory Detection + Retrieval

```typescript
import { analyzeMemoryNeeds } from '../libs/memory/detection';
import { queryMemories } from '../libs/coach-conversation/memory-processing';

// STEP 1: Detect if memory needed (lightweight AI call)
const memoryAnalysis = await analyzeMemoryNeeds(
  userResponse,
  messageContext,
  'Coach Creator'
);

// STEP 2: Only query if needed
let memoryContext = '';
if (memoryAnalysis.needsRetrieval) {
  const memoryResults = await queryMemories(
    userId,
    null,           // ← null = query ALL coaches
    userResponse,
    messageContext
  );

  if (memoryResults.memories && memoryResults.memories.length > 0) {
    memoryContext = memoryResults.memories
      .map(mem => `- ${mem.memoryText || mem.content}`)
      .filter(text => text.length > 2)
      .join('\n')
      .substring(0, 2000); // Limit to 2000 chars
  }
}
```

---

### Backend Outputs Configuration

```typescript
// In amplify/backend.ts

backend.addOutput({
  custom: {
    coachCreatorSessionStreamingApi: {
      functionUrl: streamCoachCreatorSessionUrl.url,
      region: backend.streamCoachCreatorSession.stack.region,
    }
  }
});
```

**Result in `amplify_outputs.json`**:
```json
{
  "custom": {
    "coachCreatorSessionStreamingApi": {
      "functionUrl": "https://yyy.lambda-url.us-west-2.on.aws/",
      "region": "us-west-2"
    }
  }
}
```

---

### Frontend API Config

```javascript
// src/utils/apis/apiConfig.js
import outputs from '../../../amplify_outputs.json';

export const STREAMING_CONFIG = {
  COACH_CREATOR_SESSION: outputs.custom?.coachCreatorSessionStreamingApi || null,
};

export const getStreamingUrl = (path) => {
  if (path.includes('coach-creator-sessions')) {
    const config = STREAMING_CONFIG.COACH_CREATOR_SESSION;
    return `${config.functionUrl}${path}`;
  }
};
```

---

## 📁 Files to Update

### Backend

| File | Action | Effort |
|------|--------|--------|
| `update-coach-creator-session/handler.ts` | Add Pinecone + memory context | 3-4h |
| `libs/coach-creator/question-management.ts` | Update `buildQuestionPrompt()` signature | 1-2h |
| `stream-coach-creator-session/handler.ts` | Create new streaming handler | 5-7h |
| `stream-coach-creator-session/resource.ts` | Create resource config | 30m |
| `backend.ts` | Add Lambda URL + outputs | 2-3h |

### Frontend

| File | Action | Effort |
|------|--------|--------|
| `apis/apiConfig.js` | Import outputs + configure URL | 1h |
| `apis/streamingLambdaApi.js` | Add `streamCoachCreatorSessionLambda()` | 1h |
| `apis/coachCreatorApi.js` | Update stream function | 30m |

**Total: 27-38 hours**

---

## ✅ Implementation Order

1. **Non-streaming first** (3-4h)
   - Add contexts to existing handler
   - Test thoroughly
   - Validate Pinecone + memory work

2. **Streaming handler** (5-7h)
   - Copy pattern from coach conversation
   - Simplify (remove smart router, contextual updates)
   - Add contexts

3. **Backend config** (2-3h)
   - Lambda Function URL
   - Backend outputs
   - Environment variables

4. **Frontend** (2-3h)
   - API config
   - Lambda streaming function
   - Update coach creator API

5. **Testing** (9-12h)
   - Backend unit tests
   - Integration tests
   - Context quality tests

---

## 🧪 Testing Priorities

### Must Test
- [ ] Pinecone methodology queries work
- [ ] Memory detection (analyzeMemoryNeeds) works
- [ ] Memory retrieval when needed
- [ ] Contexts improve response quality
- [ ] Graceful degradation if contexts fail
- [ ] Lambda URL in amplify_outputs.json
- [ ] Frontend reads URL correctly
- [ ] Streaming works end-to-end

### Nice to Test
- [ ] Performance with/without contexts
- [ ] Token usage comparison
- [ ] Reranking effectiveness
- [ ] Browser compatibility

---

## 🚨 Common Pitfalls to Avoid

1. ❌ **Don't** use `queryPinecone()` - use `queryPineconeContext()` instead
2. ❌ **Don't** query `methodologies` namespace - it's `methodology` (singular)
3. ❌ **Don't** scope memory queries to specific coach - pass `null` for all coaches
4. ❌ **Don't** forget to limit context size to 2000 chars each
5. ❌ **Don't** save memories in coach creator - retrieval only!
6. ❌ **Don't** skip memory detection - use `analyzeMemoryNeeds()` first
7. ❌ **Don't** use `stack.addOutput()` - use `backend.addOutput()` with structured format

---

## 📚 Documentation Files

**Primary (use these)**:
1. ✅ **STREAM_COACH_CREATOR_IMPLEMENTATION_GUIDE.md** - Full guide with all Q&A answers
2. ✅ **STREAM_COACH_CREATOR_QUICK_REFERENCE.md** - This file (quick lookup)
3. ✅ **STREAM_COACH_CREATOR_V2_SUMMARY.md** - Overview of V2 changes

**Supporting**:
4. **STREAM_COACH_CREATOR_CODE_COMPARISON.md** - Code patterns (still relevant)
5. **STREAM_COACH_CREATOR_ARCHITECTURE.md** - Architecture diagrams (still relevant)

---

## 💡 Key Insights

1. **Smart Memory Detection** - Uses lightweight AI (Haiku/Nova) to decide if memory query is needed, saving unnecessary Pinecone calls

2. **Namespace is Singular** - `methodology` not `methodologies` (easy to miss!)

3. **All Coaches Scope** - Memories query across ALL coaches, not scoped to specific coach (pass `null`)

4. **Structured Outputs** - Backend outputs use `{ functionUrl, region }` structure, not just URL string

5. **Context Size Matters** - 2000 chars each prevents token limit issues while providing enough context

6. **Non-Blocking Contexts** - Both Pinecone and memory queries wrapped in try-catch, never fail the request

7. **Sequential Testing** - Non-streaming first validates context integration before adding streaming complexity

---

## 🎯 Success Metrics

**Technical**:
- First token latency < 1.5s (with contexts)
- Pinecone query < 200ms
- Memory query < 200ms (when needed)
- Context retrieval success > 80%

**User Experience**:
- AI references methodologies appropriately
- AI references user memories when relevant
- Questions feel more personalized
- No delay noticeable from context queries

**Quality**:
- Contexts optional (works without them)
- All three fallback tiers work
- Browser compatibility verified
- Tests pass

---

**Ready to implement!** 🚀

Start with: `STREAM_COACH_CREATOR_IMPLEMENTATION_GUIDE.md`

