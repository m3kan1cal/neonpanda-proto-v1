import { CoachCreatorSession, UserContext, Question, SophisticationLevel } from './types';
import { COACH_CREATOR_QUESTIONS, shouldSkipQuestion } from './question-management';


// Factory function to create a new coach creator session with default values
// Generates unique session ID and initializes session state when user starts coach creator flow
export const createCoachCreatorSession = (userId: string): CoachCreatorSession => {
  const sessionId = `coach_creator_${userId}_${Date.now()}`;
  const now = new Date();

  return {
    userId,
    sessionId,
    userContext: {
      sophisticationLevel: 'UNKNOWN',
      responses: {},
      currentQuestion: 1,
      detectedSignals: [],
      sessionId,
      userId,
      startedAt: now,
      lastActivity: now
    },
    questionHistory: [],
    isComplete: false,
    startedAt: now,
    lastActivity: now
  };
};

// Calculate detailed progress information
export const getProgress = (userContext: UserContext) => {
  if (!COACH_CREATOR_QUESTIONS || !Array.isArray(COACH_CREATOR_QUESTIONS)) {
    console.error('COACH_CREATOR_QUESTIONS is not available or not an array');
    return {
      questionsCompleted: 0,
      totalQuestions: 0,
      percentage: 0
    };
  }

  const totalQuestions = COACH_CREATOR_QUESTIONS.filter((q: any) => !shouldSkipQuestion(q, userContext)).length;
  const questionsCompleted = Object.keys(userContext.responses).length;
  const percentage = totalQuestions > 0 ? Math.round((questionsCompleted / totalQuestions) * 100) : 0;

  return {
    questionsCompleted,
    totalQuestions,
    percentage
  };
};

// Generate coach creator session summary for analytics
export const generateCoachCreatorSessionSummary = (session: CoachCreatorSession): string => {
  const responses = session.userContext.responses;
  const sophistication = session.userContext.sophisticationLevel;

  const goals = responses['1'] || 'Not specified';
  const experience = responses['2'] || 'Not specified';
  const injuries = responses['4'] || 'None mentioned';
  const coachingStyle = responses['6'] || 'Not specified';
  const equipment = responses['5'] || 'Not specified';
  const methodology = responses['16'] || 'Not specified';
  const recovery = responses['17'] || 'Not specified';
  const learningStyle = responses['18'] || 'Not specified';

  return `User ${session.userId} completed coach creator as ${sophistication.toLowerCase()} level athlete. ` +
    `Goals: ${goals.slice(0, 100)}... | ` +
    `Experience: ${experience.slice(0, 100)}... | ` +
    `Injuries/Limitations: ${injuries.slice(0, 100)}... | ` +
    `Preferred coaching style: ${coachingStyle.slice(0, 100)}... | ` +
    `Equipment: ${equipment.slice(0, 100)}... | ` +
    `Methodology preferences: ${methodology.slice(0, 100)}... | ` +
    `Recovery approach: ${recovery.slice(0, 100)}... | ` +
    `Learning style: ${learningStyle.slice(0, 100)}... | ` +
    `Session completed with ${session.questionHistory.length} questions answered in ${session.userContext.sophisticationLevel} sophistication path.`;
};

// Store user response in session context, handling follow-up responses
export const storeUserResponse = (
  userContext: UserContext,
  currentQuestion: Question,
  userResponse: string
): UserContext => {
  const questionKey = currentQuestion.id.toString();
  const existingResponse = userContext.responses[questionKey];

  return {
    ...userContext,
    responses: {
      ...userContext.responses,
      [questionKey]: existingResponse
        ? `${existingResponse}\n\n[Follow-up]: ${userResponse}`
        : userResponse
    }
  };
};

// Add question interaction to session history
export const addQuestionHistory = (
  session: CoachCreatorSession,
  currentQuestion: Question,
  userResponse: string,
  aiResponse: string,
  detectedSophistication: string
): void => {
  session.questionHistory.push({
    questionId: currentQuestion.id,
    userResponse,
    aiResponse,
    detectedSophistication,
    timestamp: new Date()
  });
};

// Check if user wants to finish the coach creator process
export const checkUserWantsToFinish = (userResponse: string): boolean => {
  const finishKeywords = [
    'ready', 'create coach', 'done', 'proceed',
    'finished', 'that\'s all', 'let\'s go'
  ];

  const lowerResponse = userResponse.toLowerCase();
  return finishKeywords.some(keyword => lowerResponse.includes(keyword));
};

// Update session context with new data
export const updateSessionContext = (
  userContext: UserContext,
  detectedLevel: SophisticationLevel | null,
  detectedSignals: string[],
  isOnFinalQuestion: boolean
): UserContext => {
  return {
    ...userContext,
    sophisticationLevel: detectedLevel || userContext.sophisticationLevel,
    currentQuestion: isOnFinalQuestion
      ? userContext.currentQuestion
      : userContext.currentQuestion + 1,
    detectedSignals: [...new Set([...userContext.detectedSignals, ...detectedSignals])],
    lastActivity: new Date()
  };
};

// Mark session as complete
export const markSessionComplete = (session: CoachCreatorSession): void => {
  session.isComplete = true;
  session.completedAt = new Date();
};
