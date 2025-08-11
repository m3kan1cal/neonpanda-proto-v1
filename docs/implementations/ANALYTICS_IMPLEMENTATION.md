## Weekly Analytics Pipeline Architecture

### Phase 1: Trigger & Data Collection (Sunday 6:00 AM UTC) ✅ COMPLETE

```yaml
1. CloudWatch Event Trigger ✅ IMPLEMENTED
   - Cron expression: "0 6 ? * SUN *" ✅
   - Targets: Lambda function (build-weekly-analytics) ✅
   - Retry policy: 2 retries with exponential backoff ✅

2. Lambda: build-weekly-analytics ✅ IMPLEMENTED
   - Query all active users from DynamoDB (users table) ✅
   - Process users in batches of 50 for efficiency ✅
   - Direct DynamoDB queries (no SQS overhead) ✅
   - Built-in retry logic for failed processing ✅
   - Skip users with < 2 workouts that week 🔄 TODO
```

**Implementation Details:**
- **EventBridge Schedule**: `cron(0 6 ? * 1 *)` in `build-weekly-analytics/resource.ts`
- **GSI-3 User Queries**: `queryAllUsers()` using `entityType='user'` with pagination
- **Batch Processing**: 50 users per batch with `exclusiveStartKey` pagination
- **Error Handling**: Per-user and global try/catch with detailed logging
- **Memory**: 1024MB, 15min timeout for processing all users
- **Missing**: Workout count filtering logic (marked as TODO in handler)

### Phase 2: Data Aggregation (Per User) ✅ COMPLETE

```yaml
4. Fetch Current Week Data ✅ IMPLEMENTED
   - Query DynamoDB (workouts table) ✅
   - Filter: user_id AND date BETWEEN week_start AND week_end ✅
   - Get all workouts in UWS format (already extracted) ✅
   - Include: completed workouts, skipped workouts, modifications ✅

5. Fetch Historical Context ✅ IMPLEMENTED
   - Previous 4 weeks of workout summaries (for trending) ✅
   - Query pattern: user_id AND date BETWEEN (week_start - 28) AND week_end ✅
   - Extract existing AI-generated summaries (no aggregation needed) ✅

6. Fetch Coaching Context ✅ IMPLEMENTED
   - Query DynamoDB (conversations table) ✅
   - Get last 2 weeks of coach-athlete messages ✅
   - Extract: technical cues, feedback, goals discussed ✅
   - Summarize using Claude Haiku (fast/cheap) if > 1000 words 🔄 TODO

7. Fetch User Context ✅ IMPLEMENTED
   - Query DynamoDB (user_memories table) ✅
   - Get: injuries, goals, PRs, equipment access, schedule constraints ✅
   - Include: athlete profile (training age, competition dates) ✅
   - Recent check-ins or subjective feedback ✅

8. Fetch Program Context 🔄 SKIPPED (as requested)
   - Query DynamoDB (programs table)
   - Get current program template/methodology
   - Include: phase, week number, intended stimulus
   - Planned vs completed for adherence metrics
```

**Implementation Details:**
- **Data Fetching Library**: `amplify/functions/libs/analytics/data-fetching.ts`
- **Week Calculations**: `getCurrentWeekRange()`, `getLastNWeeksRange()` for date filtering
- **Parallel Data Fetching**: All user data (workouts, conversations, memories) fetched simultaneously
- **Query → Detail Pattern**: Use simplified list queries then fetch full details for each item
- **Message Filtering**: Coaching conversations filtered to last 2 weeks of messages only
- **Error Isolation**: Individual data fetch failures don't stop overall user processing
- **Comprehensive Logging**: Detailed metrics for workouts, conversations, memories, and historical summaries per user
- **Early Filtering**: Users with < 2 workouts skipped before expensive data aggregation
- **Historical Summaries**: Leverages existing AI-generated workout summaries (4 weeks, ~8KB vs 56KB raw data)
- **Summary Quality Filter**: Only includes historical workouts with substantial summaries (>50 characters)

### Phase 3: LLM Analytics Processing ✅ COMPLETE

```yaml
9. Construct Analytics Prompt ✅ IMPLEMENTED
   - Combine all context into structured prompt ✅
   - Format:
     * Athlete context (AI profile + memories) ✅
     * Current week UWS data ✅
     * Previous weeks summary ✅
     * Coaching conversations summary ✅
     * Program context 🔄 SKIPPED (not built yet)
   - Add system prompt with output format requirements ✅

10. Call Claude via Bedrock ✅ IMPLEMENTED
   - Model: claude-3-5-sonnet-4 (Sonnet 4 with thinking) ✅
   - Max tokens: Default Bedrock limits ✅
   - Temperature: Default (for consistency) ✅
   - Retry logic: Basic error handling with log and continue ✅
   - Fallback: Log error and continue processing other users ✅

11. Process LLM Response ✅ IMPLEMENTED
   - Parse JSON response ✅
   - Validate structure against schema (basic JSON parsing) ✅
   - Handle any parsing errors gracefully ✅
   - Log complete analytics output for prototype ✅
```

**Implementation Details:**
- **Analytics Generation**: `generateAnalytics()` function in `data-fetching.ts`
- **Enhanced Athlete Context**: Combines AI-generated athlete profile with structured user memories
- **Comprehensive Prompt**: Enhanced with athlete context, coaching conversations, historical summaries
- **Claude Thinking Enabled**: Uses same thinking pattern as workout extraction/normalization
- **Error Isolation**: Analytics failures don't stop batch processing
- **Prototype Logging**: Complete JSON analytics output logged for review
- **Integration**: Seamlessly integrated into `processBatch()` workflow

### Phase 4: Storage & Notification

```yaml
12. Store Analytics Results ✅ COMPLETED
   Primary Storage (DynamoDB - existing table): ✅ IMPLEMENTED
   - EntityType: "analytics"
   - Partition Key: user#${user_id}
   - Sort Key: weeklyAnalytics#${week_id} (YYYY-WW)
   - Includes S3 location reference
   - Implementation: saveWeeklyAnalytics() in operations.ts

   Secondary Storage (S3): ✅ IMPLEMENTED
   - Path: analytics/weekly-analytics/
   - Includes metadata and complete analytics JSON
   - Dual storage ensures data availability and queryability

13. Generate Quick Insights 🔮 FUTURE ENHANCEMENT
   - Extract top 3 insights from LLM output
   - Create notification-friendly summary
   - Generate trend indicators (↑↓→)

14. Update User Dashboard Cache 🔮 FUTURE ENHANCEMENT
   - Write to DynamoDB (dashboard_cache)
   - Pre-calculate:
     * Week-over-week changes
     * Achievement badges
     * Progress charts data
   - Set cache expiry: 1 week

15. Send Notifications 🔮 FUTURE ENHANCEMENT
   In-App (Phase 1):
   - Write to DynamoDB (notifications table)
   - Set badge/counter in user session

   Email/Push (Phase 2 - add later):
   - Email (via SES): Template with top insights, link to dashboard
   - Push (via SNS): Title + body with top insight + metric
```

### Phase 5: Frontend Dashboard Display ⚠️ PARTIALLY IMPLEMENTED

```yaml
16. Frontend Data Fetching ⚠️ PARTIAL
   React Dashboard requests:
   - CURRENT (PARTIAL ⚠️):
     * GET /users/{userId}/reports/weekly (list) ✅
     * GET /users/{userId}/reports/weekly/{weekId} (single) ✅
     * Uses pre-computed weekly analytics stored in DynamoDB/S3 ✅
     * dashboard_cache layer ❌
   - FUTURE:
     * GET /api/analytics/current-week ❌
     * Check dashboard_cache first ❌
     * Fall back to analytics_results ❌
     * Return immediately (pre-computed) ❌

17. Dashboard Components ⚠️ PARTIAL
   - CURRENT (PARTIAL ⚠️):
     * Weekly Report Viewer (formatted + raw toggle) ✅
     * AI Insights Panel (human_summary) ✅
     * Data Quality (analysis_confidence, data_completeness) ✅
   - FUTURE:
     * Weekly Summary Card (hero metrics) ❌
     * Volume Chart (daily/weekly trends) ❌
     * Movement Heatmap (frequency/volume by exercise) ❌
     * PR Tracker (new records highlighted) ❌
     * Week-over-week Comparison ❌

18. Interactive Features ❌ NOT IMPLEMENTED
   - FUTURE:
     * Click any metric for detailed breakdown ❌
     * Export to PDF report ❌
     * Share achievements to social ❌
     * Compare to previous weeks ❌
     * Add coach comments/responses ❌
```

**Phase 5 Implementation Details (current)**
- Frontend routing: `/training-grounds/reports/weekly?userId=...&weekId=...`
- Components: `WeeklyReports.jsx`, `WeeklyReportViewer.jsx`
- API util: `src/utils/apis/reportApi.js` (list + single)
- Agent: `src/utils/agents/ReportAgent.js` (state management, loading, errors)
- TrainingGrounds integration: “Reports & Insights” section with recent reports list and navigation

Status summary:
- 16. Frontend Data Fetching: PARTIAL
- 17. Dashboard Components: PARTIAL (basic viewer + insights + data quality)
- 18. Interactive Features: FUTURE

### Phase 6: Error Handling & Monitoring ⚠️ PARTIALLY IMPLEMENTED (~60%)

```yaml
19. Error Handling
   Failed LLM calls:
   - Retry with exponential backoff 🔮 FUTURE ENHANCEMENT
   - Fallback to basic statistical analysis 🔮 FUTURE ENHANCEMENT
   - Notify admin if persistent failures 🔮 FUTURE ENHANCEMENT

   Missing data: ✅ IMPLEMENTED
   - Process with available data ✅ (skip users < 2 workouts, handle missing historical)
   - Flag incompleteness in results ✅ (data quality metadata)
   - Suggest what user should track 🔮 FUTURE ENHANCEMENT

   Invalid responses: ✅ IMPLEMENTED
   - Log to CloudWatch ✅ (console.error logging)
   - Send to DLQ for manual review 🔮 FUTURE ENHANCEMENT
   - Provide generic insights as fallback ✅ (JSON parsing fallbacks, normalization)

20. Monitoring & Alerting 🔮 FUTURE ENHANCEMENT
   CloudWatch Dashboards:
   - Processing success rate
   - Average processing time
   - LLM token usage and costs
   - User engagement with analytics

   Alarms:
   - Failed processing > 5%
   - Processing time > 5 minutes
   - LLM costs > budget threshold
   - No analytics generated for active users
```

### System Architecture Diagram

```
[CloudWatch Event]
    ↓ (Sunday 6am)
[Lambda: weekly-analytics] → [DynamoDB: Workouts]
    ↓                        [DynamoDB: Conversations]
    ↓                        [DynamoDB: Memories]
    ↓
[Construct Prompt]
    ↓
[Amazon Bedrock: Claude Opus]
    ↓
[Parse & Validate]
    ↓
[DynamoDB: Analytics] → [S3: Archive (Phase 2)]
    ↓
[Cache Layer]
    ↓
[Notifications] → [In-App (Phase 1)]
                → [Email/Push (Phase 2)]
    ↓
[React Dashboard]
```

### Cost Optimization Strategies

1. **Batch Processing**: Process users in batches to reduce Lambda cold starts
2. **Caching**: Cache previous weeks' summaries to avoid reprocessing
3. **Tiered Processing**: Use Haiku for summarization, Opus only for final analytics
4. **Smart Querying**: Use DynamoDB query instead of scan, proper indexes
5. **Conditional Analytics**: Skip if user had < 2 workouts that week

### Scaling Considerations

- **Rate Limiting**: Limit concurrent Bedrock calls to avoid throttling
- **Queue Management**: Use SQS batch processing for efficiency
- **Regional Deployment**: Process users in their regional Bedrock endpoint
- **Progressive Rollout**: Start with power users, expand gradually
