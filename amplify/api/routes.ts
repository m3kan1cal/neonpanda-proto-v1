import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface RouteIntegrations {
  helloWorld: apigatewayv2_integrations.HttpLambdaIntegration;
  contactForm: apigatewayv2_integrations.HttpLambdaIntegration;
  createCoachCreatorSession: apigatewayv2_integrations.HttpLambdaIntegration;
  updateCoachCreatorSession: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachCreatorSession: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachConfigs: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachConfig: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachConfigStatus: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachTemplates: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachTemplate: apigatewayv2_integrations.HttpLambdaIntegration;
  createCoachConfigFromTemplate: apigatewayv2_integrations.HttpLambdaIntegration;
  createCoachConversation: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachConversations: apigatewayv2_integrations.HttpLambdaIntegration;
  getCoachConversation: apigatewayv2_integrations.HttpLambdaIntegration;
  updateCoachConversation: apigatewayv2_integrations.HttpLambdaIntegration;
  sendCoachConversationMessage: apigatewayv2_integrations.HttpLambdaIntegration;
  getWorkouts: apigatewayv2_integrations.HttpLambdaIntegration;
  getWorkout: apigatewayv2_integrations.HttpLambdaIntegration;
  updateWorkout: apigatewayv2_integrations.HttpLambdaIntegration;
  deleteWorkout: apigatewayv2_integrations.HttpLambdaIntegration;
  getWorkoutsCount: apigatewayv2_integrations.HttpLambdaIntegration;
  getConversationsCount: apigatewayv2_integrations.HttpLambdaIntegration;
  deleteCoachConversation: apigatewayv2_integrations.HttpLambdaIntegration;
  getWeeklyReports: apigatewayv2_integrations.HttpLambdaIntegration;
  getWeeklyReport: apigatewayv2_integrations.HttpLambdaIntegration;
  getMemories: apigatewayv2_integrations.HttpLambdaIntegration;
  deleteMemory: apigatewayv2_integrations.HttpLambdaIntegration;
}

/**
 * Add miscellaneous routes to the HTTP API
 */
export function addMiscRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Miscellaneous Routes
  // *******************************************************

  // Hello world endpoint
  httpApi.addRoutes({
    path: '/hello',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.helloWorld
  });

  // Contact form endpoint
  httpApi.addRoutes({
    path: '/contact',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.contactForm
  });
}

/**
 * Add coach creator agent routes to the HTTP API
 */
export function addCoachCreatorRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Coach Creator Agent Routes
  // *******************************************************

  // Start coach creator session
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachCreatorSession
  });

  // Update coach creator session (submit response)
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateCoachCreatorSession
  });

  // Get coach creator session
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachCreatorSession
  });

  // Get coach config generation status
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}/config-status',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfigStatus
  });
}

/**
 * Add coach config routes to the HTTP API
 */
export function addCoachConfigRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Coach Config Routes
  // *******************************************************

  // Get all coach configs for a user
  httpApi.addRoutes({
    path: '/users/{userId}/coaches',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfigs
  });

  // Get specific coach config
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfig
  });
}

/**
 * Add coach template routes to the HTTP API
 */
export function addCoachTemplateRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Coach Template Routes
  // *******************************************************

  // Get all available coach templates
  httpApi.addRoutes({
    path: '/coach-templates',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachTemplates
  });

  // Get specific coach template
  httpApi.addRoutes({
    path: '/coach-templates/{templateId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachTemplate
  });

  // Create coach config from template
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/from-template/{templateId}',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachConfigFromTemplate
  });
}

/**
 * Add coach conversation routes to the HTTP API
 */
export function addCoachConversationRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Coach Conversation Routes
  // *******************************************************

  // Create new conversation
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachConversation
  });

  // Get all conversations for user + coach
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConversations
  });

  // Get specific conversation
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConversation
  });

  // Update conversation metadata (title, tags, isActive)
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateCoachConversation
  });

  // Send message to conversation (send message + get AI response)
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}/send-message',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.sendCoachConversationMessage
  });

  // Get conversations count for user + coach
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/count',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getConversationsCount
  });

  // Delete conversation
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteCoachConversation
  });
}

/**
 * Add workout routes to the HTTP API
 */
export function addWorkoutRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Workout Session Routes
  // *******************************************************

  // Get all workout sessions for a user
  httpApi.addRoutes({
    path: '/users/{userId}/workouts',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkouts
  });

  // Get specific workout session
  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkout
  });

  // Update workout session
  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateWorkout
  });

  // Delete workout session
  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteWorkout
  });

  // Get workout sessions count for a user
  httpApi.addRoutes({
    path: '/users/{userId}/workouts/count',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkoutsCount
  });
}

/**
 * Add report routes to the HTTP API
 */
export function addReportRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Weekly Reports Routes
  // *******************************************************

  // Get all weekly reports for a user
  httpApi.addRoutes({
    path: '/users/{userId}/reports/weekly',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWeeklyReports
  });

  // Get specific weekly report
  httpApi.addRoutes({
    path: '/users/{userId}/reports/weekly/{weekId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWeeklyReport
  });
}

/**
 * Add memory routes to the HTTP API
 */
export function addMemoryRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  // *******************************************************
  // Memory Routes
  // *******************************************************

  // Get all memories for a user
  httpApi.addRoutes({
    path: '/users/{userId}/memories',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getMemories
  });

  // Delete specific memory
  httpApi.addRoutes({
    path: '/users/{userId}/memories/{memoryId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteMemory
  });
}

/**
 * Add all routes to the HTTP API
 */
export function addAllRoutes(
  httpApi: apigatewayv2.HttpApi,
  integrations: RouteIntegrations
): void {
  addMiscRoutes(httpApi, integrations);
  addCoachCreatorRoutes(httpApi, integrations);
  addCoachConfigRoutes(httpApi, integrations);
  addCoachTemplateRoutes(httpApi, integrations);
  addCoachConversationRoutes(httpApi, integrations);
  addWorkoutRoutes(httpApi, integrations);
  addReportRoutes(httpApi, integrations);
  addMemoryRoutes(httpApi, integrations);
}
