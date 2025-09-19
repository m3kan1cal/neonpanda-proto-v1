# Workout Normalization Implementation

## Overview

This document outlines the implementation plan for adding AI-powered normalization to the workout extraction pipeline to ensure consistent Universal Workout Schema compliance.

**Note:** Originally called "validation," but renamed to "normalization" as this system transforms data to correct structure rather than just pass/fail validation.

## Problem Statement

Current workout extraction occasionally produces inconsistent schema structures:
- `coach_notes` misplaced at root level instead of `discipline_specific`
- `discipline_specific` incorrectly nested under `performance_metrics`
- Inconsistent data completeness and confidence scores
- Schema violations that break WorkoutViewer.jsx compatibility

## Solution Approach

Use AI-powered normalization with Claude to identify and fix structural issues automatically, providing better data quality without extensive rule maintenance.

---

## Phase 1: Core AI Normalization Setup ✅ COMPLETED

### Step 1: Create Normalization Prompt Template ✅ COMPLETED
- ✅ Designed Claude prompt for schema normalization
- ✅ Included complete Universal Workout Schema v2.0 reference
- ✅ Specified normalization criteria and expected output format
- ✅ Added explicit instructions for data transformation

**Deliverable:** Normalization prompt template with schema compliance rules
**Location:** `amplify/functions/libs/workout/normalization.ts` - `buildNormalizationPrompt()`

### Step 2: Add Normalization Function ✅ COMPLETED
- ✅ Created `normalizeWorkout()` function in workout libs
- ✅ Takes extracted workout data as input
- ✅ Calls Claude with normalization prompt
- ✅ Returns normalized data + normalization report
- ✅ Includes robust JSON parsing with fallback cleaning

**Location:** `amplify/functions/libs/workout/normalization.ts`

### Step 3: Define Normalization Response Schema ✅ COMPLETED
- ✅ Structure for AI normalization response
- ✅ Include: `isValid`, `normalizedData`, `issues`, `confidence`, `summary`
- ✅ Handle both "no issues" and "corrections made" scenarios

**Interface:**
```typescript
interface NormalizationResult {
  isValid: boolean;
  normalizedData: UniversalWorkoutSchema;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: 'ai' | 'skipped';
}
```

### Step 4: Integrate into Extraction Pipeline ✅ COMPLETED
- ✅ Added normalization call after extraction and confidence calculation
- ✅ Integrated into `build-workout/handler.ts` before saving to DynamoDB
- ✅ Updated logging to track normalization results
- ✅ Added smart routing based on confidence levels

**Integration Point:** Integrated with confidence-based routing in `build-workout/handler.ts`

---

## Phase 2: Smart Routing & Performance ✅ COMPLETED

### Step 5: Add Confidence-Based Routing ✅ COMPLETED
- ✅ Skip AI normalization for high-confidence extractions (>0.9) with no structural issues
- ✅ Always normalize low-confidence extractions (<0.7)
- ✅ Conditionally normalize medium confidence (0.7-0.9) based on structural issues
- ✅ Added `shouldNormalizeWorkout()` function with intelligent routing

**Logic:**
```
if (confidence < 0.7) → AI normalization required
if (confidence > 0.9 AND no structural issues) → Skip normalization
if (0.7 ≤ confidence ≤ 0.9) → Normalize if structural issues detected
```

### Step 6: Add Normalization Metadata ✅ COMPLETED
- ✅ Track normalization method used (`normalized` flag in validation_flags)
- ✅ Store normalization confidence score in result
- ✅ Add normalization summary to extractionMetadata
- ✅ Integrated with existing metadata structure

**Implementation:** Uses existing `validation_flags` array and adds `normalized` flag when normalization is applied

### Step 7: Error Handling & Fallbacks ✅ COMPLETED
- ✅ Handle AI normalization failures gracefully
- ✅ Fallback to original data if normalization fails
- ✅ Comprehensive error logging and recovery
- ✅ Progressive JSON parsing with cleaning/fixing fallbacks

**Fallback Strategy:**
1. ✅ Try AI normalization with robust JSON parsing
2. ✅ If JSON parse fails → Clean response and try `fixMalformedJson`
3. ✅ If normalization fails → Log error, use original data
4. ✅ Add error details to issues array
5. ✅ Continue with extraction pipeline

---

## Phase 3: Monitoring & Quality Control ⚠️ PARTIAL

### Step 8: Add Normalization Logging ✅ COMPLETED
- ✅ Log normalization decisions and outcomes with detailed context
- ✅ Track normalization performance metrics (confidence, issues found, corrections made)
- ✅ Comprehensive error logging with response samples

**Metrics to Track:**
- ✅ Normalization success rate (logged in console)
- ✅ Common issue types (tracked in issues array)
- ✅ Performance impact (confidence before/after)
- 🔄 User satisfaction with corrections (TODO)

### Step 9: Create Normalization Dashboard 🔄 TODO
- View normalization success rates
- Identify common normalization issues
- Track improvement in data quality over time

**Dashboard Sections:**
- Normalization metrics overview
- Common issues breakdown
- Data quality trends
- Failed normalization queue

### Step 10: Add Manual Review Triggers 🔄 TODO
- Flag workouts that fail normalization repeatedly
- Allow manual override of normalization decisions
- Create review queue for problematic extractions

**Review Triggers:**
- Normalization confidence < 0.5
- Multiple normalization attempts failed
- User reports data issues
- Schema violations detected

---

## Phase 4: Batch Processing & Cleanup 🔄 TODO

### Step 11: Create Batch Normalization Function 🔄 TODO
- Process existing "bad" workouts
- Run normalization on historical data
- Update workouts with corrected data

**Target:** ~1,000 existing workouts with data quality issues

### Step 12: Add Normalization Status Tracking 🔄 TODO
- Mark workouts as `normalized`, `needs_review`, `normalization_failed`
- Track normalization version for schema migrations
- Enable re-normalization of specific workout sets

**Status Workflow:**
```
new → extracting → normalizing → normalized/needs_review/failed
```

---

## Phase 5: Advanced Features 🔄 TODO

### Step 13: Add Learning Feedback Loop 🔄 TODO
- Track user corrections to AI normalizations
- Improve normalization prompts based on patterns
- Add common issue templates to normalization logic

**Learning Mechanism:**
- User edits normalized workout → Store correction pattern
- Aggregate patterns → Update normalization prompts
- A/B test prompt improvements

### Step 14: Performance Optimization 🔄 TODO
- Cache normalization results for similar workouts
- Batch similar workouts for efficient processing
- Add async normalization for non-critical paths

**Optimization Strategies:**
- Hash workout structure for caching
- Group similar workouts for batch processing
- Async normalization queue for background processing

### Step 15: User-Facing Features 🔄 TODO
- Allow users to request re-normalization
- Show normalization confidence in UI
- Provide normalization explanations for transparency

**UI Integration:**
- Normalization badge in WorkoutViewer
- Re-normalize button for users
- Normalization explanation tooltip

---

## Key Integration Points

| Component | Integration | Status |
|-----------|------------|---------|
| `build-workout/handler.ts` | ✅ Add normalization call after extraction | COMPLETED |
| `workout/normalization.ts` | ✅ Create AI normalization function | COMPLETED |
| `workout/types.ts` | ✅ Add normalization metadata interfaces | COMPLETED |
| `schemas/universal-workout-schema.ts` | ✅ Shared schema for extraction & normalization | COMPLETED |
| `response-utils.ts` | ✅ Centralized JSON cleaning utilities | COMPLETED |
| `dynamodb/operations.ts` | 🔄 Update save operations for normalization data | TODO |
| `WorkoutViewer.jsx` | 🔄 Display normalization status/confidence | TODO |

---

## Success Metrics

### Data Quality Metrics
- **Schema Violations:** Reduce by 90%
- **Data Completeness:** Increase average from 0.7 to 0.85+
- **Confidence Scores:** Increase average from 0.75 to 0.9+

### User Experience Metrics
- **WorkoutViewer Compatibility:** 95%+ workouts display correctly
- **Manual Corrections:** Reduce by 80%
- **User Satisfaction:** Positive feedback on data accuracy

### Performance Metrics
- **Normalization Time:** <2 seconds average
- **API Cost Impact:** <20% increase in Claude usage
- **Pipeline Reliability:** 99.5%+ success rate

---

## Implementation Timeline

### ✅ Week 1: Foundation COMPLETED
- ✅ Steps 1-4 (Core AI normalization setup)
- ✅ Basic integration and testing
- ✅ Shared schema architecture

### ✅ Week 2: Intelligence COMPLETED
- ✅ Steps 5-7 (Smart routing and performance)
- ✅ Error handling and fallbacks
- ✅ Robust JSON parsing strategy

### 🔄 Week 3: Monitoring PARTIAL
- ✅ Step 8 (Normalization logging)
- 🔄 Steps 9-10 (Dashboard and review systems) - TODO

### 🔄 Week 4: Optimization TODO
- 🔄 Steps 11-12 (Batch processing)
- 🔄 Historical data cleanup

### 🔄 Week 5: Advanced Features TODO
- 🔄 Steps 13-15 (Learning and user features)
- 🔄 Performance optimization

---

## Risk Mitigation

### Technical Risks
- ✅ **AI Normalization Failures:** Robust fallback to original data
- ✅ **Performance Impact:** Confidence-based routing reduces calls
- 🔄 **Cost Increases:** Monitor and optimize API usage

### Data Risks
- ✅ **Over-Correction:** Preserve original data alongside corrections
- 🔄 **False Positives:** Manual review queue for edge cases
- 🔄 **Schema Changes:** Version tracking for normalization compatibility

### User Experience Risks
- 🔄 **Slower Extraction:** Async normalization for non-critical paths
- 🔄 **User Confusion:** Clear normalization status indicators
- ✅ **Data Loss:** Comprehensive backup and rollback capabilities

---

## Next Steps

### Immediate Priorities (Phase 3 completion)
1. 🔄 **Create normalization dashboard** for monitoring success rates and common issues
2. 🔄 **Add manual review triggers** for failed normalization cases
3. 🔄 **Monitor real-world performance** and adjust confidence thresholds as needed

### Medium-term Goals (Phase 4)
4. 🔄 **Implement batch normalization** for historical "bad" workouts
5. 🔄 **Add normalization status tracking** to database schema
6. 🔄 **Create UI indicators** in WorkoutViewer for normalization status

### Long-term Vision (Phase 5)
7. 🔄 **Build learning feedback loop** from user corrections
8. 🔄 **Performance optimization** with caching and async processing
9. 🔄 **User-facing normalization features** and transparency tools

---

## Major Accomplishments ✅

- **Complete core normalization system** with AI-powered data transformation
- **Intelligent routing** based on confidence and structural analysis
- **Robust error handling** with progressive JSON parsing fallbacks
- **Shared schema architecture** eliminating duplication between extraction and normalization
- **Comprehensive logging** for monitoring and debugging

---

*Last Updated: 2025-01-14*
*Status: Phase 1-2 Complete, Core System Operational*
