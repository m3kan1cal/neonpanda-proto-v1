# Coach Creator Code Organization

This document explains the refactored organization of the coach-creator library files.

## Problem Solved

The original `config-management.ts` and `question-management.ts` files had:
- **Circular dependencies**: config-management imported from question-management, and vice versa
- **Mixed concerns**: Single files handling multiple responsibilities
- **Large file sizes**: 1400+ line files that were hard to navigate
- **Unclear dependencies**: Everything imported from config-management created bottlenecks

## New File Structure

### 1. `types.ts` - Type Definitions
- All TypeScript interfaces and type definitions
- No business logic, just pure type declarations
- Imported by all other files that need type definitions

**Key Types:**
- `SophisticationLevel`
- `UserContext`
- `Question`
- `CoachCreatorSession`
- `CoachPersonalityTemplate`
- `MethodologyTemplate`

### 2. `config.ts` - Static Configuration Data
- Question definitions (`COACH_CREATOR_QUESTIONS`)
- Coach personality templates (`COACH_PERSONALITY_TEMPLATES`)
- Methodology templates (`METHODOLOGY_TEMPLATES`)
- Safety rules (`SAFETY_RULES`)
- Static configuration constants

**Purpose:** Pure data with no business logic

### 3. `question-management.ts` - Question Flow Logic
- Question prompt building (`buildQuestionPrompt`)
- Question navigation (`getCurrentQuestion`, `getNextQuestion`)
- Question skip logic (`shouldSkipQuestion`)
- Sophistication level detection helpers
- AI response processing (`extractSophisticationLevel`, `cleanResponse`)

**Purpose:** Handle the conversational flow and question sequencing

### 4. `coach-generation.ts` - Final Coach Creation
- Coach configuration generation (`generateCoachConfig`)
- Safety validation (`validateCoachConfigSafety`)
- Personality coherence checking (`validatePersonalityCoherence`)
- Pinecone integration for analytics

**Purpose:** Complex business logic for creating the final AI coach

### 5. `session-management.ts` - Session State Management
- Session creation and updates
- Progress calculation
- Session summary generation

**Purpose:** Handle session lifecycle and state

### 6. `data-extraction.ts` - Response Processing
- Extract user preferences from responses
- Safety profile extraction
- Methodology preference detection

**Purpose:** Parse and structure user responses

## Dependency Flow

```
types.ts (no dependencies)
   ↓
config.ts (imports: types)
   ↓
question-management.ts (imports: types, config, api-helpers)
   ↓
coach-generation.ts (imports: types, config, api-helpers, data-extraction, session-management)
   ↓
session-management.ts (imports: types)
   ↓
data-extraction.ts (imports: types)
```

## Benefits

### 1. **No Circular Dependencies**
- Clear, unidirectional dependency flow
- Easier to understand and maintain
- Better for tree-shaking and bundling

### 2. **Single Responsibility Principle**
- Each file has one clear purpose
- Easier to test individual components
- Clearer code ownership

### 3. **Better Modularity**
- Can import only what you need
- Easier to mock dependencies in tests
- More flexible for future refactoring

### 4. **Maintainability**
- Smaller, focused files (200-400 lines each)
- Clear separation of concerns
- Easier to onboard new developers

### 5. **Backward Compatibility**
- Existing imports continue to work
- Gradual migration possible
- No breaking changes

## Migration Guide

### Recommended Import Patterns
```typescript
// Import types from types.ts
import { Question, UserContext, SophisticationLevel } from './types';

// Import configuration from config.ts
import { COACH_CREATOR_QUESTIONS, COACH_PERSONALITY_TEMPLATES } from './config';

// Import API functions from api-helpers.ts
import { callClaudeAPI } from '../api-helpers';

// Import business logic from specific files
import { generateCoachConfig } from './coach-generation';
import { buildQuestionPrompt } from './question-management';
```

## Future Improvements

1. **Test Isolation**: Each file can now be unit tested independently
2. **Performance**: Tree-shaking can eliminate unused code
3. **Developer Experience**: Clearer import paths and smaller files
4. **Extensibility**: Easy to add new personality types or methodologies

## Files to Update When...

- **Adding new question types**: Update `config.ts`
- **Adding new coach personalities**: Update `config.ts`
- **Changing API providers**: Update `api-helpers.ts`
- **Modifying question flow**: Update `question-management.ts`
- **Adding safety rules**: Update `config.ts` and `coach-generation.ts`
- **Adding new data extraction**: Update `data-extraction.ts`

This organization follows standard software engineering practices and makes the codebase much more maintainable and scalable.