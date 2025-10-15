# Monthly Analytics Implementation Plan

## Overview
Implement monthly analytics reporting feature that mirrors the existing weekly analytics system. Monthly reports will aggregate training data from the 1st to the last day of each calendar month.

## Current Date Context
- Today: October 14, 2025
- Current implementation: Weekly analytics (ISO-8601 week-based, Monday-Sunday)

## Key Differences: Weekly vs Monthly

| Aspect | Weekly Analytics | Monthly Analytics |
|--------|-----------------|-------------------|
| **Time Period** | Monday - Sunday (ISO-8601) | 1st - Last day of month |
| **ID Format** | `YYYY-WW` (e.g., `2025-W42`) | `YYYY-MM` (e.g., `2025-10`) |
| **DynamoDB Sort Key** | `weeklyAnalytics#YYYY-WW` | `monthlyAnalytics#YYYY-MM` |
| **EventBridge Trigger** | Sunday 9:00 AM UTC | 1st of month 9:00 AM UTC |
| **API Endpoints** | `/users/{userId}/reports/weekly` | `/users/{userId}/reports/monthly` |
| **Minimum Threshold** | 2 workouts per week | TBD: 4-8 workouts per month? |

## Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Create Lambda Function: build-monthly-analytics
**Location**: `amplify/functions/build-monthly-analytics/`

**Files to create**:
- `handler.ts` - Main Lambda handler triggered by EventBridge
- `resource.ts` - CDK resource definition with EventBridge cron rule

**Handler.ts Structure**:
```typescript
import { processAllUsersInBatchesMonthly, MonthlyAnalyticsEvent } from "../libs/analytics";

export const handler = async (event: MonthlyAnalyticsEvent) => {
  // Process all users in batches (same pattern as weekly)
  const totalProcessedUsers = await processAllUsersInBatchesMonthly(50);
  return success response
};
```

**Resource.ts Structure**:
```typescript
export const buildMonthlyAnalytics = defineFunction({
  name: "build-monthly-analytics",
  entry: "./handler.ts",
  timeoutSeconds: 900,  // 15 minutes
  memoryMB: 1024,
});

export function createMonthlyAnalyticsSchedule(stack, lambdaFunction) {
  // EventBridge rule: 1st of month at 9:00 AM UTC
  schedule: events.Schedule.cron({
    minute: "0",
    hour: "9",
    day: "1",  // First day of month
  })
}
```

**Environment Variables** (same as weekly):
- `DYNAMODB_TABLE_NAME`
- `COGNITO_USER_POOL_ID`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `OPENAI_API_KEY`
- `ANALYTICS_BUCKET_NAME`

**Permissions** (same as weekly):
- DynamoDB: Query, PutItem, UpdateItem
- Cognito: ListUsers, AdminGetUser
- Pinecone: Query vectors
- OpenAI: Generate completions
- S3: PutObject (for storing analytics JSON)

---

#### 1.2 Create Lambda Function: get-monthly-reports
**Location**: `amplify/functions/get-monthly-reports/`

**Files to create**:
- `handler.ts` - Query handler with filtering
- `resource.ts` - Function definition

**Handler.ts Structure**:
```typescript
export const handler = withAuth(async (event) => {
  const userId = event.user.userId;
  const options = parseQueryParams(event.queryStringParameters);
  // fromDate, toDate, limit, offset, sortBy, sortOrder

  const analytics = await queryMonthlyAnalytics(userId, options);

  return createOkResponse({
    reports: analytics,
    count: analytics.length,
    userId
  });
});
```

**Query Parameters**:
- `fromDate` - Filter months starting from this date (ISO format)
- `toDate` - Filter months up to this date (ISO format)
- `limit` - Max reports to return (1-100)
- `offset` - Pagination offset
- `sortBy` - `monthStart` | `monthEnd` | `workoutCount`
- `sortOrder` - `asc` | `desc`

---

#### 1.3 Create Lambda Function: get-monthly-report
**Location**: `amplify/functions/get-monthly-report/`

**Files to create**:
- `handler.ts` - Single report fetch by monthId
- `resource.ts` - Function definition

**Handler.ts Structure**:
```typescript
export const handler = withAuth(async (event) => {
  const userId = event.user.userId;
  const monthId = event.pathParameters?.monthId; // e.g., "2025-10"

  const analytics = await getMonthlyAnalytics(userId, monthId);

  if (!analytics) {
    return createErrorResponse(404, 'Monthly report not found');
  }

  return createOkResponse(analytics);
});
```

---

### Phase 2: Analytics Library Updates

#### 2.1 Update Types (amplify/functions/libs/analytics/types.ts)

**Add new types**:
```typescript
export interface MonthlyAnalyticsEvent {
  source: string;
  detail: any;
}

export interface UserMonthlyData {
  userId: string;
  monthRange: {
    monthStart: Date;  // 1st of month at 00:00:00
    monthEnd: Date;    // Last day of month at 23:59:59
  };
  workouts: {
    completed: DynamoDBItem<Workout>[];
    count: number;
  };
  coaching: {
    conversations: DynamoDBItem<CoachConversation>[];
    totalMessages: number;
  };
  userContext: {
    memories: UserMemory[];
    memoryCount: number;
  };
  historical: {
    workoutSummaries: HistoricalWorkoutSummary[];
    summaryCount: number;
  };
}

export interface MonthlyAnalytics {
  userId: string;
  monthId: string;        // Format: YYYY-MM (e.g., "2025-10")
  monthStart: string;     // ISO date string (first day)
  monthEnd: string;       // ISO date string (last day)
  analyticsData: any;     // Complete analytics JSON
  s3Location: string;
  metadata: {
    workoutCount: number;
    conversationCount: number;
    memoryCount: number;
    historicalSummaryCount: number;
    analyticsLength: number;
    hasAthleteProfile: boolean;
    hasDualOutput: boolean;
    humanSummaryLength: number;
    normalizationApplied?: boolean;
    analysisConfidence: string;
    dataCompleteness: number;
  };
}
```

---

#### 2.2 Add Date Utilities (amplify/functions/libs/analytics/date-utils.ts)

**Add new functions**:
```typescript
export function getCurrentMonthRange(): { monthStart: Date; monthEnd: Date } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

export function getLastNMonthsRange(months: number): { monthStart: Date; monthEnd: Date } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { monthStart, monthEnd };
}

export function getMonthDescription(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function generateMonthId(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}
```

---

#### 2.3 Add Batch Processing (amplify/functions/libs/analytics/batch-processing.ts)

**Add new function**:
```typescript
export const processAllUsersInBatchesMonthly = async (
  batchSize: number = 50
): Promise<number> => {
  let totalProcessedUsers = 0;
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  do {
    batchNumber++;
    const result = await queryAllUsers(batchSize, lastEvaluatedKey);

    if (result.users.length > 0) {
      const processedInBatch = await processMonthlyBatch(result.users, batchNumber);
      totalProcessedUsers += processedInBatch;
    }

    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  return totalProcessedUsers;
};

const processMonthlyBatch = async (
  users: DynamoDBItem<UserProfile>[],
  batchNumber: number
): Promise<number> => {
  // Similar to processBatch but:
  // - Use getCurrentMonthRange() for date boundaries
  // - Generate monthId instead of weekId
  // - Check minimum threshold (e.g., 4 workouts/month)
  // - Call saveMonthlyAnalytics instead of saveWeeklyAnalytics
  // - Use "monthly-analytics" as S3 type
};
```

**Questions for Clarification**:
1. What should be the minimum workout threshold for monthly reports? (Weekly is 2, monthly could be 4, 6, or 8?)
2. Should we process the current month or only completed months? (Weekly processes current week)

---

#### 2.4 Add Data Fetching (amplify/functions/libs/analytics/data-fetching.ts)

**Add new function**:
```typescript
export async function fetchUserMonthlyData(
  user: DynamoDBItem<UserProfile>
): Promise<UserMonthlyData> {
  const monthRange = getCurrentMonthRange();

  // Fetch workouts for current month
  const workouts = await fetchWorkoutsInRange(
    user.attributes.userId,
    monthRange.monthStart,
    monthRange.monthEnd
  );

  // Fetch coaching conversations for current month
  const conversations = await fetchConversationsInRange(
    user.attributes.userId,
    monthRange.monthStart,
    monthRange.monthEnd
  );

  // Fetch user context (memories, profile)
  const userContext = await fetchUserContext(user.attributes.userId);

  // Fetch historical data (last 3 months for context)
  const historical = await fetchHistoricalWorkoutRange(
    user.attributes.userId,
    3 // months
  );

  return {
    userId: user.attributes.userId,
    monthRange,
    workouts: {
      completed: workouts,
      count: workouts.length
    },
    coaching: {
      conversations,
      totalMessages: conversations.reduce((sum, c) => sum + c.attributes.messages.length, 0)
    },
    userContext,
    historical
  };
}
```

---

### Phase 3: DynamoDB Operations

#### 3.1 Update operations.ts (amplify/dynamodb/operations.ts)

**Add new functions**:
```typescript
export async function saveMonthlyAnalytics(
  monthlyAnalytics: MonthlyAnalytics
): Promise<void> {
  const item = createDynamoDBItem<MonthlyAnalytics>(
    "analytics",
    `user#${monthlyAnalytics.userId}`,
    `monthlyAnalytics#${monthlyAnalytics.monthId}`,
    monthlyAnalytics,
    Date.now()
  );

  await saveToDynamoDB(item);

  console.info('Saved monthly analytics:', {
    userId: monthlyAnalytics.userId,
    monthId: monthlyAnalytics.monthId,
    monthRange: `${monthlyAnalytics.monthStart} to ${monthlyAnalytics.monthEnd}`,
    workoutCount: monthlyAnalytics.metadata.workoutCount,
    s3Location: monthlyAnalytics.s3Location
  });
}

export async function queryMonthlyAnalytics(
  userId: string,
  options: {
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<DynamoDBItem<MonthlyAnalytics>[]> {
  const allAnalytics = await queryFromDynamoDB<MonthlyAnalytics>(
    `user#${userId}`,
    "monthlyAnalytics#",
    100
  );

  // Apply filtering and sorting (same logic as weekly)
  // ...

  return filtered;
}

export async function getMonthlyAnalytics(
  userId: string,
  monthId: string
): Promise<DynamoDBItem<MonthlyAnalytics> | null> {
  return await getFromDynamoDB<MonthlyAnalytics>(
    `user#${userId}`,
    `monthlyAnalytics#${monthId}`
  );
}
```

**DynamoDB Key Structure**:
- Partition Key: `user#<userId>`
- Sort Key: `monthlyAnalytics#<YYYY-MM>`
- GSI: Same as weekly (if needed)

---

### Phase 4: Backend Registration

#### 4.1 Update backend.ts (amplify/backend.ts)

**Import monthly functions**:
```typescript
import {
  buildMonthlyAnalytics,
  createMonthlyAnalyticsSchedule,
} from "./functions/build-monthly-analytics/resource";
import { getMonthlyReports } from "./functions/get-monthly-reports/resource";
import { getMonthlyReport } from "./functions/get-monthly-report/resource";
```

**Register in backend**:
```typescript
const backend = defineBackend({
  // ... existing
  buildMonthlyAnalytics,
  getMonthlyReports,
  getMonthlyReport,
});
```

**Attach permissions** (replicate weekly pattern):
```typescript
// DynamoDB access
sharedPolicies.attachDynamoDBFullAccess(backend.buildMonthlyAnalytics.resources.lambda);
sharedPolicies.attachDynamoDBFullAccess(backend.getMonthlyReports.resources.lambda);
sharedPolicies.attachDynamoDBFullAccess(backend.getMonthlyReport.resources.lambda);

// Cognito access (for build-monthly-analytics)
sharedPolicies.attachCognitoReadAccess(backend.buildMonthlyAnalytics.resources.lambda);

// Pinecone access (for build-monthly-analytics)
sharedPolicies.attachPineconeAccess(backend.buildMonthlyAnalytics.resources.lambda);

// OpenAI access (for build-monthly-analytics)
sharedPolicies.attachOpenAIAccess(backend.buildMonthlyAnalytics.resources.lambda);

// S3 analytics access (for build-monthly-analytics)
sharedPolicies.attachS3AnalyticsAccess(backend.buildMonthlyAnalytics.resources.lambda);
```

**Create EventBridge schedule**:
```typescript
// Create EventBridge schedule for monthly analytics (1st of month at 9am UTC)
const monthlyAnalyticsSchedule = createMonthlyAnalyticsSchedule(
  backend.buildMonthlyAnalytics.stack,
  backend.buildMonthlyAnalytics.resources.lambda
);

console.info('✅ Monthly analytics scheduled (1st of month at 9am UTC)');
```

---

### Phase 5: API Configuration

#### 5.1 Update api/resource.ts (amplify/api/resource.ts)

**Add Lambda integrations**:
```typescript
const getMonthlyReportsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
  'GetMonthlyReportsIntegration',
  getMonthlyReportsLambda
);

const getMonthlyReportIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
  'GetMonthlyReportIntegration',
  getMonthlyReportLambda
);
```

**Add routes**:
```typescript
{
  path: '/users/{userId}/reports/monthly',
  methods: ['GET'],
  integration: integrations.getMonthlyReports,
  authScopes: ['user/reports.read']
},
{
  path: '/users/{userId}/reports/monthly/{monthId}',
  methods: ['GET'],
  integration: integrations.getMonthlyReport,
  authScopes: ['user/reports.read']
}
```

**API Endpoints**:
- `GET /users/{userId}/reports/monthly` - List monthly reports with filtering
- `GET /users/{userId}/reports/monthly/{monthId}` - Get specific monthly report (e.g., `2025-10`)

---

### Phase 6: Frontend Implementation

#### 6.1 Update reportApi.js (src/utils/apis/reportApi.js)

**Add new functions**:
```javascript
// List monthly reports for a user
export const getMonthlyReports = async (userId, options = {}) => {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const url = `${getApiUrl('')}/users/${userId}/reports/monthly${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await authenticatedFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
};

// Get a specific monthly report by monthId
export const getMonthlyReport = async (userId, monthId) => {
  const url = `${getApiUrl('')}/users/${userId}/reports/monthly/${monthId}`;
  const response = await authenticatedFetch(url, { method: 'GET' });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Monthly report not found');
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

export default {
  getWeeklyReports,
  getWeeklyReport,
  getMonthlyReports,
  getMonthlyReport,
};
```

---

#### 6.2 Update ReportAgent.js (src/utils/agents/ReportAgent.js)

**Add state properties**:
```javascript
this.state = {
  // Weekly reports
  allReports: [],
  currentReport: null,

  // Monthly reports
  allMonthlyReports: [],
  currentMonthlyReport: null,

  // Shared state
  isLoadingAllItems: false,
  isLoadingItem: false,
  error: null,
  totalCount: 0
};
```

**Add methods**:
```javascript
async loadAllMonthlyReports(options = {}) {
  this.setState({ isLoadingAllItems: true, error: null });

  try {
    const result = await getMonthlyReports(this.userId, {
      sortBy: options.sortBy || 'monthStart',
      sortOrder: options.sortOrder || 'desc',
      limit: options.limit || 100
    });

    this.setState({
      allMonthlyReports: result.reports || [],
      isLoadingAllItems: false,
      totalCount: result.count || 0
    });
  } catch (error) {
    this.handleError(error);
  }
}

async loadMonthlyReport(monthId) {
  this.setState({ isLoadingItem: true, error: null });

  try {
    const result = await getMonthlyReport(this.userId, monthId);
    this.setState({
      currentMonthlyReport: result,
      isLoadingItem: false
    });
  } catch (error) {
    this.handleError(error);
  }
}

getMonthlyReportTitle(report) {
  if (!report) return 'Monthly Report';

  const monthId = report.monthId;
  const workoutCount = report.metadata?.workoutCount;

  if (monthId) {
    const [year, month] = monthId.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (workoutCount !== undefined) {
      return `${monthName} (${workoutCount} workouts)`;
    }
    return monthName;
  }

  return 'Monthly Report';
}
```

---

#### 6.3 Update ViewReports.jsx (src/components/ViewReports.jsx)

**Add state for view toggle**:
```javascript
const [reportView, setReportView] = useState('weekly'); // 'weekly' | 'monthly'
```

**Add toggle UI** (below header, above QuickStats):
```jsx
{/* Report Type Toggle */}
<div className="flex items-center justify-center gap-3 mb-4">
  <button
    onClick={() => setReportView('weekly')}
    className={`px-6 py-2 rounded-lg font-rajdhani font-bold transition-all ${
      reportView === 'weekly'
        ? 'bg-synthwave-neon-pink text-white'
        : 'bg-synthwave-bg-card text-synthwave-text-muted hover:text-white'
    }`}
  >
    Weekly Reports
  </button>
  <button
    onClick={() => setReportView('monthly')}
    className={`px-6 py-2 rounded-lg font-rajdhani font-bold transition-all ${
      reportView === 'monthly'
        ? 'bg-synthwave-neon-cyan text-white'
        : 'bg-synthwave-bg-card text-synthwave-text-muted hover:text-white'
    }`}
  >
    Monthly Reports
  </button>
</div>
```

**Update QuickStats** (show both weekly and monthly counts):
```jsx
<QuickStats
  stats={[
    {
      icon: StackIcon,
      value: reportView === 'weekly'
        ? reportAgentState.allReports.length
        : reportAgentState.allMonthlyReports.length,
      tooltip: {
        title: reportView === 'weekly' ? 'Total Weekly Reports' : 'Total Monthly Reports',
        description: reportView === 'weekly'
          ? 'All weekly analytics reports from your training'
          : 'All monthly analytics reports from your training'
      },
      color: 'pink',
      // ...
    },
    // Add conditional stats based on reportView
  ]}
/>
```

**Render appropriate cards**:
```jsx
{reportView === 'weekly' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
    {reportAgentState.allReports.map(renderWeeklyReportCard)}
  </div>
)}

{reportView === 'monthly' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
    {reportAgentState.allMonthlyReports.map(renderMonthlyReportCard)}
  </div>
)}
```

**Create renderMonthlyReportCard** (similar to renderReportCard but with monthly formatting):
```javascript
const renderMonthlyReportCard = (report) => {
  const monthName = getMonthName(report.monthId); // "October 2025"
  const workoutCount = report.metadata?.workoutCount || 0;
  const isCurrentMonth = isCurrentMonthReport(report.monthId);

  // Similar structure to weekly card but:
  // - Show "Monthly Report: October 2025" as title
  // - Navigate to /training-grounds/reports/monthly?monthId=2025-10
  // - Adjust date range display (Oct 1 - Oct 31)
};
```

**Helper functions**:
```javascript
const getMonthName = (monthId) => {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const isCurrentMonthReport = (monthId) => {
  const now = new Date();
  const currentMonthId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  return monthId === currentMonthId;
};
```

---

### Phase 7: Exports and Index Updates

#### 7.1 Update analytics index (amplify/functions/libs/analytics/index.ts)

**Add exports**:
```typescript
export {
  processAllUsersInBatchesMonthly,
  processMonthlyBatch
} from "./batch-processing";

export {
  MonthlyAnalyticsEvent,
  MonthlyAnalytics,
  UserMonthlyData,
} from "./types";

export {
  getCurrentMonthRange,
  getLastNMonthsRange,
  generateMonthId,
  getMonthDescription,
} from "./date-utils";

export {
  fetchUserMonthlyData,
} from "./data-fetching";
```

---

## Questions for Clarification

1. **Minimum Workout Threshold**: What should be the minimum number of workouts required for monthly report generation?
   - Weekly = 2 workouts minimum
   - Suggested monthly = 4, 6, or 8 workouts?
   - Should this be configurable?

2. **Current Month Processing**: Should we generate reports for the current (incomplete) month or only completed months?
   - Weekly processes current week (even if incomplete)
   - Monthly could wait until month is complete, or process current month like weekly

3. **Historical Context Range**: For monthly analytics, how many months of historical data should we include?
   - Weekly uses 8 weeks of historical context
   - Suggested monthly = 3 or 6 months?

4. **EventBridge Timing**: Confirm 1st of month at 9:00 AM UTC is acceptable
   - This allows capturing all workouts from previous month
   - Matches weekly pattern (Sunday at 9:00 AM UTC)

5. **UI Display Priority**: Should the ViewReports page default to weekly or monthly view?
   - Or remember user's last selection?
   - Or show both in tabs?

6. **Report Navigation**: Should we create a separate page for monthly report detail view?
   - Weekly has `/training-grounds/reports/weekly?weekId=X`
   - Monthly could be `/training-grounds/reports/monthly?monthId=X`
   - Or reuse the same page with different rendering?

---

## Testing Strategy

1. **Unit Tests**:
   - Date utility functions (getCurrentMonthRange, generateMonthId)
   - DynamoDB operations (save, query, get)
   - Batch processing logic

2. **Integration Tests**:
   - Lambda handlers with mock events
   - API endpoints with authentication
   - EventBridge trigger simulation

3. **Manual Testing**:
   - Deploy to dev environment
   - Manually trigger Lambda via AWS Console
   - Verify DynamoDB entries
   - Verify S3 storage
   - Test UI navigation and display

4. **Edge Cases**:
   - User with no workouts in month
   - User with exactly minimum threshold
   - Month boundaries (28, 29, 30, 31 days)
   - Leap years
   - Year transitions (December → January)

---

## Deployment Checklist

- [ ] Create all Lambda function folders and files
- [ ] Update analytics library types and utilities
- [ ] Update DynamoDB operations
- [ ] Register functions in backend.ts
- [ ] Add API routes in api/resource.ts
- [ ] Create frontend API functions
- [ ] Update ReportAgent
- [ ] Update ViewReports component
- [ ] Test locally with Amplify sandbox
- [ ] Deploy to dev environment
- [ ] Manual testing in dev
- [ ] Deploy to production

---

## Rollback Plan

If issues arise during deployment:

1. **Backend Issues**:
   - Comment out monthly functions from backend.ts
   - Remove monthly API routes
   - Redeploy without monthly features

2. **Frontend Issues**:
   - Feature flag to hide monthly toggle
   - Revert ViewReports.jsx to weekly-only view

3. **Data Issues**:
   - Monthly analytics stored separately from weekly (no conflicts)
   - Can safely delete monthlyAnalytics# items from DynamoDB

---

## Success Criteria

- [ ] Monthly analytics Lambda runs successfully on 1st of each month
- [ ] Monthly reports are generated and stored in DynamoDB
- [ ] Monthly reports appear in ViewReports UI with toggle
- [ ] API endpoints return correct monthly data with filtering
- [ ] Monthly report cards display properly with month names
- [ ] No performance degradation on weekly analytics
- [ ] No conflicts between weekly and monthly data storage

---

## Timeline Estimate

- **Phase 1-3** (Backend): 4-6 hours
- **Phase 4-5** (Registration & API): 1-2 hours
- **Phase 6** (Frontend): 3-4 hours
- **Phase 7** (Exports): 30 minutes
- **Testing**: 2-3 hours
- **Total**: 10-15 hours

---

## Notes

- Keep monthly implementation as close to weekly as possible for consistency
- Use same AI prompt patterns for generating analytics
- Reuse existing helper functions where applicable
- Consider adding a "Report Type" filter to FloatingMenuManager for quick switching
- May want to add a "Generate Monthly Report Now" button for testing (admin only)
