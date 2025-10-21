import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { createBranchAwareResourceName, getBranchInfo } from '../functions/libs/branch-naming';

export function createCoreApi(
  stack: Stack,
  contactFormLambda: lambda.IFunction,
  createCoachCreatorSessionLambda: lambda.IFunction,
  updateCoachCreatorSessionLambda: lambda.IFunction,
  getCoachConfigsLambda: lambda.IFunction,
  getCoachConfigLambda: lambda.IFunction,
  updateCoachConfigLambda: lambda.IFunction,
  getCoachConfigStatusLambda: lambda.IFunction,
  getCoachCreatorSessionLambda: lambda.IFunction,
  getCoachCreatorSessionsLambda: lambda.IFunction,
  deleteCoachCreatorSessionLambda: lambda.IFunction,
  getCoachTemplatesLambda: lambda.IFunction,
  getCoachTemplateLambda: lambda.IFunction,
  createCoachConfigFromTemplateLambda: lambda.IFunction,
  createCoachConfigLambda: lambda.IFunction,
  createCoachConversationLambda: lambda.IFunction,
  getCoachConversationsLambda: lambda.IFunction,
  getCoachConversationLambda: lambda.IFunction,
  updateCoachConversationLambda: lambda.IFunction,
  sendCoachConversationMessageLambda: lambda.IFunction,
  createWorkoutLambda: lambda.IFunction,
  getWorkoutsLambda: lambda.IFunction,
  getWorkoutLambda: lambda.IFunction,
  updateWorkoutLambda: lambda.IFunction,
  deleteWorkoutLambda: lambda.IFunction,
  getWorkoutsCountLambda: lambda.IFunction,
  getCoachConversationsCountLambda: lambda.IFunction,
  getCoachConfigsCountLambda: lambda.IFunction,
  getWeeklyReportsLambda: lambda.IFunction,
  getWeeklyReportLambda: lambda.IFunction,
  getMonthlyReportsLambda: lambda.IFunction,
  getMonthlyReportLambda: lambda.IFunction,
  getMemoriesLambda: lambda.IFunction,
  createMemoryLambda: lambda.IFunction,
  deleteMemoryLambda: lambda.IFunction,
  deleteCoachConversationLambda: lambda.IFunction,
  getUserProfileLambda: lambda.IFunction,
  updateUserProfileLambda: lambda.IFunction,
  checkUserAvailabilityLambda: lambda.IFunction,
  generateUploadUrlsLambda: lambda.IFunction,
  generateDownloadUrlsLambda: lambda.IFunction,
  createTrainingProgramLambda: lambda.IFunction,
  getTrainingProgramLambda: lambda.IFunction,
  getTrainingProgramsLambda: lambda.IFunction,
  updateTrainingProgramLambda: lambda.IFunction,
  logWorkoutTemplateLambda: lambda.IFunction,
  getWorkoutTemplateLambda: lambda.IFunction,
  userPoolAuthorizer: HttpUserPoolAuthorizer
) {
  // Create branch-aware API name using utility
  const { branchInfo, resourceName: apiName } = createBranchAwareResourceName(
    stack,
    'neonpanda-proto-api',
    'API Gateway'
  );

  // Domain configuration - branch-aware
  const baseDomain = 'neonpanda.ai';
  let domainName: string | null = null;
  let useCustomDomain = false;

  if (branchInfo.isSandbox) {
    // Local sandbox development - use default Amplify endpoint (no custom domain)
    domainName = null;
    useCustomDomain = false;
  } else if (branchInfo.branchName === 'main') {
    // Production from main branch
    domainName = `api-prod.${baseDomain}`;
    useCustomDomain = true;
  } else {
    // Non-production branches (develop, feature branches, etc.)
    domainName = `api-dev.${baseDomain}`;
    useCustomDomain = true;
  }

  console.info(`🌐 API Configuration:`, {
    isSandbox: branchInfo.isSandbox,
    branchName: branchInfo.branchName,
    apiName,
    domainName: domainName || 'default-amplify-endpoint',
    useCustomDomain
  });

  // Certificate ARN - only needed for custom domains (not sandboxes)
  let certificate = null;

  if (useCustomDomain) {
    const certificateArn = stack.region === 'us-east-1'
      ? 'arn:aws:acm:us-east-1:061920441871:certificate/09144037-9ab1-4161-8642-20b533aacc64'
      : 'arn:aws:acm:us-west-2:061920441871:certificate/cb16d147-c35e-4406-a259-85e768ae943e';

    // Import the existing certificate
    certificate = certificatemanager.Certificate.fromCertificateArn(
      stack,
      'ApiCertificate',
      certificateArn
    );

    console.info(`📄 SSL Certificate imported for custom domain`);
  }

  // Create HTTP API Gateway v2
  const httpApi = new apigatewayv2.HttpApi(stack, 'ProtoApi', {
    apiName: apiName,
    description: 'Core HTTP API for the application',
    corsPreflight: {
      allowCredentials: false,
      allowHeaders: ['*'],
      allowMethods: [
        apigatewayv2.CorsHttpMethod.GET,
        apigatewayv2.CorsHttpMethod.POST,
        apigatewayv2.CorsHttpMethod.PUT,
        apigatewayv2.CorsHttpMethod.DELETE,
        apigatewayv2.CorsHttpMethod.OPTIONS
      ],
      allowOrigins: ['*']
    }
  });

  // Create Lambda integration for contact form function
  const contactFormIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'ContactFormIntegration',
    contactFormLambda
  );

  // Create Lambda integrations for coach creator functions
  const createCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachCreatorSessionIntegration',
    createCoachCreatorSessionLambda
  );

  const updateCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateCoachCreatorSessionIntegration',
    updateCoachCreatorSessionLambda
  );

  const getCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachCreatorSessionIntegration',
    getCoachCreatorSessionLambda
  );

  const getCoachCreatorSessionsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachCreatorSessionsIntegration',
    getCoachCreatorSessionsLambda
  );

  const deleteCoachCreatorSessionIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'DeleteCoachCreatorSessionIntegration',
    deleteCoachCreatorSessionLambda
  );

  const getCoachConfigsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigsIntegration',
    getCoachConfigsLambda
  );

  const getCoachConfigIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigIntegration',
    getCoachConfigLambda
  );

  const updateCoachConfigIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateCoachConfigIntegration',
    updateCoachConfigLambda
  );

  const getCoachConfigStatusIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigStatusIntegration',
    getCoachConfigStatusLambda
  );

  // Create Lambda integrations for coach template functions
  const getCoachTemplatesIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachTemplatesIntegration',
    getCoachTemplatesLambda
  );

  const getCoachTemplateIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachTemplateIntegration',
    getCoachTemplateLambda
  );

  const createCoachConfigFromTemplateIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachConfigFromTemplateIntegration',
    createCoachConfigFromTemplateLambda
  );

  const createCoachConfigIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachConfigIntegration',
    createCoachConfigLambda
  );

  // Create Lambda integrations for coach conversation functions
  const createCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateCoachConversationIntegration',
    createCoachConversationLambda
  );

  const getCoachConversationsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConversationsIntegration',
    getCoachConversationsLambda
  );

  const getCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConversationIntegration',
    getCoachConversationLambda
  );

  const updateCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateCoachConversationIntegration',
    updateCoachConversationLambda
  );

  const sendCoachConversationMessageIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'SendCoachConversationMessageIntegration',
    sendCoachConversationMessageLambda
  );

  // Create Lambda integrations for workout functions
  const createWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateWorkoutIntegration',
    createWorkoutLambda
  );

  const getWorkoutsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutsIntegration',
    getWorkoutsLambda
  );

  const getWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutIntegration',
    getWorkoutLambda
  );

  const updateWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateWorkoutIntegration',
    updateWorkoutLambda
  );

  const deleteWorkoutIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'DeleteWorkoutIntegration',
    deleteWorkoutLambda
  );

  const getWorkoutsCountIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutsCountIntegration',
    getWorkoutsCountLambda
  );

  const getCoachConversationsCountIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConversationsCountIntegration',
    getCoachConversationsCountLambda
  );

  const getCoachConfigsCountIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetCoachConfigsCountIntegration',
    getCoachConfigsCountLambda
  );

  // Create Lambda integrations for weekly report functions
  const getWeeklyReportsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWeeklyReportsIntegration',
    getWeeklyReportsLambda
  );

  const getWeeklyReportIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWeeklyReportIntegration',
    getWeeklyReportLambda
  );

  // Create Lambda integrations for monthly report functions
  const getMonthlyReportsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetMonthlyReportsIntegration',
    getMonthlyReportsLambda
  );

  const getMonthlyReportIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetMonthlyReportIntegration',
    getMonthlyReportLambda
  );

  // Create Lambda integrations for memory functions
  const getMemoriesIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetMemoriesIntegration',
    getMemoriesLambda
  );

  const createMemoryIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateMemoryIntegration',
    createMemoryLambda
  );

  const deleteMemoryIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'DeleteMemoryIntegration',
    deleteMemoryLambda
  );

  const deleteCoachConversationIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'DeleteCoachConversationIntegration',
    deleteCoachConversationLambda
  );

  // Create Lambda integrations for user profile functions
  const getUserProfileIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetUserProfileIntegration',
    getUserProfileLambda
  );

  const updateUserProfileIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateUserProfileIntegration',
    updateUserProfileLambda
  );

  const generateUploadUrlsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GenerateUploadUrlsIntegration',
    generateUploadUrlsLambda
  );

  const generateDownloadUrlsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GenerateDownloadUrlsIntegration',
    generateDownloadUrlsLambda
  );

  const checkUserAvailabilityIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CheckUserAvailabilityIntegration',
    checkUserAvailabilityLambda
  );

  // Create Lambda integrations for training program functions
  const createTrainingProgramIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'CreateTrainingProgramIntegration',
    createTrainingProgramLambda
  );

  const getTrainingProgramIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetTrainingProgramIntegration',
    getTrainingProgramLambda
  );

  const getTrainingProgramsIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetTrainingProgramsIntegration',
    getTrainingProgramsLambda
  );

  const updateTrainingProgramIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'UpdateTrainingProgramIntegration',
    updateTrainingProgramLambda
  );

  const logWorkoutTemplateIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'LogWorkoutTemplateIntegration',
    logWorkoutTemplateLambda
  );

  const getWorkoutTemplateIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
    'GetWorkoutTemplateIntegration',
    getWorkoutTemplateLambda
  );

  // Create integrations object for route configuration
  const integrations = {
    contactForm: contactFormIntegration,
    createCoachCreatorSession: createCoachCreatorSessionIntegration,
    updateCoachCreatorSession: updateCoachCreatorSessionIntegration,
    getCoachCreatorSession: getCoachCreatorSessionIntegration,
    getCoachCreatorSessions: getCoachCreatorSessionsIntegration,
    deleteCoachCreatorSession: deleteCoachCreatorSessionIntegration,
    getCoachConfigs: getCoachConfigsIntegration,
    getCoachConfig: getCoachConfigIntegration,
    updateCoachConfig: updateCoachConfigIntegration,
    getCoachConfigStatus: getCoachConfigStatusIntegration,
    getCoachTemplates: getCoachTemplatesIntegration,
    getCoachTemplate: getCoachTemplateIntegration,
    createCoachConfigFromTemplate: createCoachConfigFromTemplateIntegration,
    createCoachConfig: createCoachConfigIntegration,
    createCoachConversation: createCoachConversationIntegration,
    getCoachConversations: getCoachConversationsIntegration,
    getCoachConversation: getCoachConversationIntegration,
    updateCoachConversation: updateCoachConversationIntegration,
    sendCoachConversationMessage: sendCoachConversationMessageIntegration,
    createWorkout: createWorkoutIntegration,
    getWorkouts: getWorkoutsIntegration,
    getWorkout: getWorkoutIntegration,
    updateWorkout: updateWorkoutIntegration,
    deleteWorkout: deleteWorkoutIntegration,
    getWorkoutsCount: getWorkoutsCountIntegration,
    getCoachConversationsCount: getCoachConversationsCountIntegration,
    getCoachConfigsCount: getCoachConfigsCountIntegration,
    getWeeklyReports: getWeeklyReportsIntegration,
    getWeeklyReport: getWeeklyReportIntegration,
    getMonthlyReports: getMonthlyReportsIntegration,
    getMonthlyReport: getMonthlyReportIntegration,
    getMemories: getMemoriesIntegration,
    createMemory: createMemoryIntegration,
    deleteMemory: deleteMemoryIntegration,
    deleteCoachConversation: deleteCoachConversationIntegration,
    getUserProfile: getUserProfileIntegration,
    updateUserProfile: updateUserProfileIntegration,
    checkUserAvailability: checkUserAvailabilityIntegration,
    generateUploadUrls: generateUploadUrlsIntegration,
    generateDownloadUrls: generateDownloadUrlsIntegration,
    createTrainingProgram: createTrainingProgramIntegration,
    getTrainingProgram: getTrainingProgramIntegration,
    getTrainingPrograms: getTrainingProgramsIntegration,
    updateTrainingProgram: updateTrainingProgramIntegration,
    logWorkoutTemplate: logWorkoutTemplateIntegration,
    getWorkoutTemplate: getWorkoutTemplateIntegration
  };

  // *******************************************************
  // ROUTE DEFINITIONS
  // *******************************************************

  // Miscellaneous Routes (PUBLIC)
  httpApi.addRoutes({
    path: '/contact',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.contactForm
  });

  // User Availability Check (PUBLIC - for registration)
  httpApi.addRoutes({
    path: '/users/check-availability',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.checkUserAvailability
  });

  // Coach Templates (PUBLIC - as requested by user)
  httpApi.addRoutes({
    path: '/coach-templates',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachTemplates
  });

  httpApi.addRoutes({
    path: '/coach-templates/{templateId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachTemplate
  });

  // Workout Routes (PROTECTED)
  httpApi.addRoutes({
    path: '/users/{userId}/workouts',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkouts,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkout,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateWorkout,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/workouts/{workoutId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteWorkout,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/workouts',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createWorkout,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/workouts/count',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkoutsCount,
    authorizer: userPoolAuthorizer
  });

  // Training Program Routes (PROTECTED)
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createTrainingProgram,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getTrainingPrograms,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs/{programId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getTrainingProgram,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs/{programId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateTrainingProgram,
    authorizer: userPoolAuthorizer
  });

  // Log workout template (convert template to logged workout)
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}/log',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.logWorkoutTemplate,
    authorizer: userPoolAuthorizer
  });

  // Get workout template(s) - supports query params: ?today=true, ?day=N
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs/{programId}/templates',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkoutTemplate,
    authorizer: userPoolAuthorizer
  });

  // Get specific workout template by ID
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWorkoutTemplate,
    authorizer: userPoolAuthorizer
  });

  // Coach Creator Routes
  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachCreatorSession,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachCreatorSessions,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateCoachCreatorSession,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachCreatorSession,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteCoachCreatorSession,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coach-creator-sessions/{sessionId}/config-status',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfigStatus,
    authorizer: userPoolAuthorizer
  });

  // Coach Config Routes
  httpApi.addRoutes({
    path: '/users/{userId}/coaches',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfigs,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfig,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateCoachConfig,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/from-template/{templateId}',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachConfigFromTemplate,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/from-session/{sessionId}',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachConfig,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/count',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConfigsCount,
    authorizer: userPoolAuthorizer
  });

  // Coach Conversation Routes
  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createCoachConversation,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConversations,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConversation,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateCoachConversation,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}/send-message',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.sendCoachConversationMessage,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/count',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getCoachConversationsCount,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteCoachConversation,
    authorizer: userPoolAuthorizer
  });

  // Report Routes
  httpApi.addRoutes({
    path: '/users/{userId}/reports/weekly',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWeeklyReports,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/reports/weekly/{weekId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getWeeklyReport,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/reports/monthly',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getMonthlyReports,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/reports/monthly/{monthId}',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getMonthlyReport,
    authorizer: userPoolAuthorizer
  });

  // Memory Routes
  httpApi.addRoutes({
    path: '/users/{userId}/memories',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getMemories,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/memories',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.createMemory,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/memories/{memoryId}',
    methods: [apigatewayv2.HttpMethod.DELETE],
    integration: integrations.deleteMemory,
    authorizer: userPoolAuthorizer
  });

  // User Profile Routes
  httpApi.addRoutes({
    path: '/users/{userId}/profile',
    methods: [apigatewayv2.HttpMethod.GET],
    integration: integrations.getUserProfile,
    authorizer: userPoolAuthorizer
  });

  httpApi.addRoutes({
    path: '/users/{userId}/profile',
    methods: [apigatewayv2.HttpMethod.PUT],
    integration: integrations.updateUserProfile,
    authorizer: userPoolAuthorizer
  });

  // Image Upload Routes (PROTECTED)
  httpApi.addRoutes({
    path: '/users/{userId}/generate-upload-urls',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.generateUploadUrls,
    authorizer: userPoolAuthorizer // REQUIRED - JWT auth
  });

  // Image Download Routes (PROTECTED)
  httpApi.addRoutes({
    path: '/users/{userId}/generate-download-urls',
    methods: [apigatewayv2.HttpMethod.POST],
    integration: integrations.generateDownloadUrls,
    authorizer: userPoolAuthorizer // REQUIRED - JWT auth
  });

  // Conditionally create custom domain (only for deployed branches, not sandboxes)
  let customDomain = null;

  if (useCustomDomain && domainName && certificate) {
    // Create custom domain name
    customDomain = new apigatewayv2.DomainName(stack, 'ApiCustomDomain', {
      domainName: domainName,
      certificate: certificate,
    });

    // Create API mapping
    new apigatewayv2.ApiMapping(stack, 'ApiMapping', {
      api: httpApi,
      domainName: customDomain,
      stage: httpApi.defaultStage,
    });

    console.info(`✅ Custom domain created: ${domainName}`);
  } else {
    console.info(`ℹ️  Using default Amplify endpoint (no custom domain for sandbox)`);
  }

  // DNS records need to be created manually after deployment
  // The custom domain will provide the target for your DNS records

  return {
    httpApi,
    customDomain,
    domainName: domainName,
    // Export individual integrations for potential reuse
    integrations
  };
}

export const apiGatewayv2 = {
  createCoreApi: createCoreApi,
};
