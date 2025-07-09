# Code Organization

This document explains the organization of key code components in the CoachForge platform, including the coach-creator library and API routes structure.

---

## Coach Creator Library Organization

### Problem Solved

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

### Coach Creator Library
- **Adding new question types**: Update `config.ts`
- **Adding new coach personalities**: Update `config.ts`
- **Changing API providers**: Update `api-helpers.ts`
- **Modifying question flow**: Update `question-management.ts`
- **Adding safety rules**: Update `config.ts` and `coach-generation.ts`
- **Adding new data extraction**: Update `data-extraction.ts`

### API Routes
- **Adding new API endpoints**: Update `routes.ts` and `resource.ts`
- **Modifying existing routes**: Update specific route functions in `routes.ts`
- **Adding new feature areas**: Create new route group functions in `routes.ts`
- **Changing API infrastructure**: Update `resource.ts` (domains, CORS, etc.)
- **Adding middleware or authentication**: Update both `resource.ts` and `routes.ts`
- **API versioning**: Consider creating versioned route functions

This organization follows standard software engineering practices and makes the codebase much more maintainable and scalable.

---

## API Routes Organization

### Problem Solved

The original `amplify/api/resource.ts` file had:
- **Mixed Responsibilities**: Single 268-line file handling both infrastructure setup and route definitions
- **Poor Maintainability**: Route definitions scattered throughout integration code
- **Scalability Issues**: Adding new routes required navigating complex infrastructure code
- **Code Bloat**: 80+ lines of repetitive route definitions making the file hard to read

### New API Structure

The API layer is now organized with clear separation of concerns:

```
amplify/api/
├── resource.ts     # Infrastructure setup (API Gateway, integrations, domains)
└── routes.ts       # Route definitions organized by feature area
```

### API Routes Organization (`routes.ts`)

#### 1. **RouteIntegrations Interface**
- Type-safe mapping of all Lambda integrations
- Ensures correct integration binding
- Provides IntelliSense support for route configuration

#### 2. **Feature-Based Route Functions**
```typescript
// Miscellaneous routes (hello, contact)
addMiscRoutes(httpApi, integrations)

// Coach creation workflow
addCoachCreatorRoutes(httpApi, integrations)

// Coach configuration management
addCoachConfigRoutes(httpApi, integrations)

// Coach conversation functionality
addCoachConversationRoutes(httpApi, integrations)
```

#### 3. **Route Categories**

**Miscellaneous Routes:**
- `GET /hello` - Health check endpoint
- `POST /contact` - Contact form submission

**Coach Creator Routes:**
- `POST /users/{userId}/coach-creator-sessions` - Start creation session
- `PUT /users/{userId}/coach-creator-sessions/{sessionId}` - Update session
- `GET /users/{userId}/coach-creator-sessions/{sessionId}` - Get session
- `GET /users/{userId}/coach-creator-sessions/{sessionId}/config-status` - Check generation status

**Coach Config Routes:**
- `GET /users/{userId}/coaches` - List user's coaches
- `GET /users/{userId}/coaches/{coachId}` - Get specific coach config

**Coach Conversation Routes:**
- `POST /users/{userId}/coaches/{coachId}/conversations` - Create conversation
- `GET /users/{userId}/coaches/{coachId}/conversations` - List conversations
- `GET /users/{userId}/coaches/{coachId}/conversations/{conversationId}` - Get conversation
- `PUT /users/{userId}/coaches/{coachId}/conversations/{conversationId}` - Update conversation

### Infrastructure Setup (`resource.ts`)

The infrastructure file now focuses on:
- API Gateway configuration
- Lambda integrations setup
- Custom domain configuration
- Certificate management
- CORS configuration

### Benefits of API Organization

#### 1. **Clear Separation of Concerns**
- Infrastructure code separated from route definitions
- Routes grouped by business functionality
- Type safety through interface definitions

#### 2. **Improved Maintainability**
- Easy to locate routes for specific features
- Simple to add new route groups
- Clear dependency structure

#### 3. **Better Scalability**
- New features can add their own route groups
- Route functions can be individually tested
- Flexible organization for growing API surface

#### 4. **Enhanced Developer Experience**
- Reduced file size: `resource.ts` shrunk from 268 to 176 lines
- Better IntelliSense support
- Clear route organization for API documentation

### Migration Benefits

- **No Breaking Changes**: All existing routes continue to work
- **Backward Compatible**: Existing Lambda integrations unchanged
- **Performance**: No runtime impact, pure organizational improvement
- **Future Ready**: Easy to add versioning, middleware, or additional route groups

### Adding New Routes

To add new API endpoints:

1. **Add Lambda integration** in `resource.ts`:
```typescript
const newFeatureIntegration = new HttpLambdaIntegration(
  'NewFeatureIntegration',
  newFeatureLambda
);
```

2. **Update RouteIntegrations interface** in `routes.ts`:
```typescript
export interface RouteIntegrations {
  // ... existing integrations
  newFeature: apigatewayv2_integrations.HttpLambdaIntegration;
}
```

3. **Create route function** in `routes.ts`:
```typescript
export function addNewFeatureRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  httpApi.addRoutes({
    path: '/new-feature',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.newFeature
  });
}
```

4. **Update addAllRoutes()** to include the new route group.

This organization ensures the API layer remains maintainable and scalable as the platform grows.