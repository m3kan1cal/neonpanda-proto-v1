import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { useToast } from '../contexts/ToastContext';
import { CoachConversationAgent } from '../utils/agents/CoachConversationAgent';
import { FloatingMenuManager } from './shared/FloatingMenuManager';
import {
  CloseIcon,
  ChatIconSmall
} from './themes/SynthwaveComponents';

// Icons
const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ConversationIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

function ManageCoachConversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');

  // Authorize that URL userId matches authenticated user
  const { isValidating: isValidatingUserId, isValid: isValidUserId, error: userIdError } = useAuthorizeUser(userId);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const conversationAgentRef = useRef(null);
  const { addToast, success, error, info } = useToast();

  // Conversation state - for specific coach conversations
  const [conversationAgentState, setConversationAgentState] = useState({
    allConversations: [],
    isLoadingAllItems: !!(userId && coachId),   // Start loading if we have both userId and coachId
    isLoadingItem: false,
    error: null,
    totalCount: 0,
    coaches: []  // Store coach data for display
  });

  // Redirect if missing required parameters
  useEffect(() => {
    if (!userId || !coachId) {
      navigate('/training-grounds', { replace: true });
      return;
    }
  }, [userId, coachId, navigate]);

  // Initialize conversation agent and load data for specific coach
  useEffect(() => {
    if (!userId || !coachId) return;

    const loadCoachConversations = async () => {
      try {
        setConversationAgentState(prev => ({ ...prev, isLoadingAllItems: true, error: null }));

        // Get the specific coach details
        const { getCoach } = await import('../utils/apis/coachApi');
        const coachResult = await getCoach(userId, coachId);
        const coach = coachResult.coachConfig;

        if (!coach) {
          setConversationAgentState(prev => ({
            ...prev,
            isLoadingAllItems: false,
            error: 'Coach not found'
          }));
          return;
        }

        // Load conversations for this specific coach
        const { getCoachConversations } = await import('../utils/apis/coachConversationApi');
        const result = await getCoachConversations(userId, coachId);
        const conversations = (result.conversations || []).map(conv => ({
          ...conv,
          coachName: coach.coach_name,
          coachId: coach.coach_id
        }));

        setConversationAgentState(prev => ({
          ...prev,
          isLoadingAllItems: false,
          allConversations: conversations,
          totalCount: conversations.length,
          coaches: [coach]
        }));

      } catch (error) {
        console.error('Error loading conversations:', error);
        setConversationAgentState(prev => ({
          ...prev,
          isLoadingAllItems: false,
          error: 'Failed to load conversations'
        }));
      }
    };

    loadCoachConversations();
  }, [userId, coachId]);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close delete modal when pressing escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showDeleteModal) {
          handleDeleteCancel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteModal]);

  const handleDeleteClick = (conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      // Create a temporary agent for the delete operation
      if (!conversationAgentRef.current) {
        conversationAgentRef.current = new CoachConversationAgent({
          userId,
          onError: (error) => {
            console.error('Agent error:', error);
          }
        });
      }

      const success = await conversationAgentRef.current.deleteCoachConversation(
        userId,
        conversationToDelete.coachId,
        conversationToDelete.conversationId
      );

      if (success) {
        addToast('Conversation deleted successfully', 'success');
        setShowDeleteModal(false);
        setConversationToDelete(null);

        // Refresh the conversation list
        setConversationAgentState(prev => ({
          ...prev,
          allConversations: prev.allConversations.filter(
            conv => conv.conversationId !== conversationToDelete.conversationId
          ),
          totalCount: prev.totalCount - 1
        }));
      } else {
        addToast('Failed to delete conversation', 'error');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      addToast('Failed to delete conversation', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const handleViewConversation = (conversation) => {
    navigate(`/training-grounds/coach-conversations?userId=${userId}&coachId=${conversation.coachId}&conversationId=${conversation.conversationId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  // Render conversation card
  const renderConversationCard = (conversation) => {
    return (
      <div
        key={`${conversation.coachId}-${conversation.conversationId}`}
        data-conversation-card
        className={`${themeClasses.glowCard} group transition-all duration-300 hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-card/70 relative cursor-pointer`}
        onClick={() => handleViewConversation(conversation)}
      >
        {/* Action buttons - appears on hover at top right */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewConversation(conversation);
            }}
            className="text-synthwave-neon-pink hover:text-synthwave-neon-pink/70 transition-colors duration-200"
            title="View conversation"
          >
            <EyeIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(conversation);
            }}
            className="text-synthwave-neon-pink hover:text-synthwave-neon-pink/70 transition-colors duration-200"
            title="Delete conversation"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Conversation content */}
        <div className="pr-16">
          <div className={`${themeClasses.cardText} text-base mb-3 font-medium`}>
            <span className="font-bold text-white">Conversation:</span> {conversation.title || 'Untitled Conversation'}
          </div>

          {/* Conversation metadata */}
          <div className={`flex flex-wrap items-center gap-4 ${themeClasses.cardText} text-sm`}>
            {/* Coach name */}
            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani font-medium flex items-center space-x-1">
              <UserIcon />
              <span>{conversation.coachName || 'Unknown Coach'}</span>
            </div>
            {/* Message count */}
            <div className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani flex items-center space-x-1">
              <MessageIcon />
              <span>{conversation.metadata?.totalMessages || 0} messages</span>
            </div>

            {/* Active status */}
            <div className={`px-2 py-1 rounded text-xs font-rajdhani font-medium ${
              conversation.metadata?.isActive !== false
                ? 'bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan'
                : 'bg-synthwave-text-secondary/20 text-synthwave-text-secondary'
            }`}>
              {conversation.metadata?.isActive !== false ? 'Active' : 'Archived'}
            </div>

            {/* Started date */}
            {conversation.metadata?.startedAt && (
              <div className="flex items-center space-x-1 text-synthwave-text-secondary">
                <ClockIcon />
                <span>Started: {formatDate(conversation.metadata.startedAt)}</span>
              </div>
            )}

            {/* Last activity */}
            <div className="flex items-center space-x-1 text-synthwave-text-secondary">
              <ClockIcon />
              <span>Last: {formatDate(conversation.metadata?.lastActivity || conversation.createdAt)}</span>
            </div>
          </div>

          {/* Tags if available */}
          {((conversation.metadata?.tags && conversation.metadata.tags.length > 0) || (conversation.tags && conversation.tags.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(conversation.metadata?.tags || conversation.tags || []).map((tag, index) => (
                <span
                  key={index}
                  className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderConversationList = () => {
    if (conversationAgentState.error) {
      return (
        <div className="text-center py-12">
          <div className="font-rajdhani text-synthwave-neon-pink text-lg mb-4">
            Error Loading Conversations
          </div>
          <div className="font-rajdhani text-synthwave-text-secondary text-sm mb-6">
            {conversationAgentState.error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className={`${themeClasses.neonButton} text-sm px-6 py-3`}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (conversationAgentState.allConversations.length === 0) {
      return (
        <div className="text-center py-12">
          <NeonBorder color="cyan" className="max-w-md mx-auto p-8">
            <h3 className="font-russo font-bold text-synthwave-neon-cyan text-xl uppercase mb-4">No Conversations Found</h3>
            <p className="font-rajdhani text-synthwave-text-secondary text-base leading-relaxed mb-6">
              You haven't started any conversations yet. Create a coach and start your first conversation to see it here.
            </p>
            <button
              onClick={() => navigate(`/training-grounds?userId=${userId}&coachId=${coachId}`)}
              className={`${themeClasses.neonButton} text-sm px-6 py-3 flex items-center justify-center space-x-2 mx-auto`}
            >
              <ChatIconSmall />
              <span>Start Conversation</span>
            </button>
          </NeonBorder>
        </div>
      );
    }

    // Sort conversations by last activity in descending order (most recent first)
    const sortedConversations = [...conversationAgentState.allConversations].sort((a, b) => {
      const dateA = new Date(a.metadata?.lastActivity || a.createdAt || 0);
      const dateB = new Date(b.metadata?.lastActivity || b.createdAt || 0);
      return dateB - dateA; // Descending order
    });

    return (
      <div className="space-y-4">
        {sortedConversations.map(renderConversationCard)}
      </div>
    );
  };

  // Show loading state
  if (conversationAgentState.isLoadingAllItems) {
    return (
      <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
          <p className="text-synthwave-text-secondary font-rajdhani">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!userId || !coachId) {
    return (
      <div className={`${themeClasses.container} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
            Invalid Access
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary mb-8">
            User ID and Coach ID are required to access conversations.
          </p>
          <button
            onClick={() => navigate('/training-grounds')}
            className={`${themeClasses.neonButton} text-lg px-8 py-3`}
          >
            Return to Training Grounds
          </button>
        </div>
      </div>
    );
  }

  // Show loading while validating userId
  if (isValidatingUserId) {
    return <LoadingScreen message="Loading conversations..." />;
  }

  // Handle userId validation errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own conversations."}
      />
    );
  }

  return (
    <>
      <div className={`${themeClasses.container} min-h-screen pb-8`}>
        <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
              Manage Coach Conversations
            </h1>
            <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
              Review, organize, and manage all your conversations with <span className="font-bold text-synthwave-neon-cyan">{conversationAgentState.coaches[0]?.coach_name || 'your coach'}</span>. Manage history and track your progress.
            </p>
            <div className="flex items-center justify-center space-x-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <div className="flex items-center space-x-1 bg-synthwave-bg-primary/30 px-2 py-1 rounded border border-synthwave-neon-pink/20">
                <span className="text-synthwave-neon-pink">⌘</span>
                <span>K</span>
              </div>
              <span>for Command Palette</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-4xl">
              <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {conversationAgentState.totalCount || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Conversations
                </div>
              </div>
              <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {conversationAgentState.allConversations.filter(c => c.metadata?.isActive !== false).length || 0}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Active Conversations
                </div>
              </div>
              <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {conversationAgentState.allConversations.reduce((total, conv) => total + (conv.metadata?.totalMessages || 0), 0)}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  Total Messages
                </div>
              </div>
              <div className="bg-synthwave-bg-card/30 border-2 border-synthwave-neon-pink/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-russo font-bold text-synthwave-neon-pink mb-1">
                  {(() => {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    return conversationAgentState.allConversations.filter(conv => {
                      const lastActivity = new Date(conv.metadata?.lastActivity || conv.createdAt || 0);
                      return lastActivity >= oneWeekAgo;
                    }).length;
                  })()}
                </div>
                <div className="font-rajdhani text-sm text-synthwave-text-secondary">
                  This Week
                </div>
              </div>
            </div>
          </div>

          {/* Error state */}
          {conversationAgentState.error && (
            <div className="text-center py-12">
              <NeonBorder color="pink" className="max-w-md mx-auto p-6">
                <p className="font-rajdhani text-synthwave-neon-pink text-xl font-bold mb-2">Error Loading Conversations</p>
                <p className="font-rajdhani text-synthwave-text-secondary text-lg">{conversationAgentState.error}</p>
              </NeonBorder>
            </div>
          )}

          {/* Conversation List */}
          {!conversationAgentState.error && (
            <div className="mb-8">
              {renderConversationList()}
            </div>
          )}
        </div>
      </div>

      {/* Floating Menu Manager */}
      <FloatingMenuManager
        userId={userId}
        coachId={coachId}
        currentPage="manage-conversations"
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-synthwave-bg-card border-2 border-synthwave-neon-pink/30 rounded-lg shadow-2xl shadow-synthwave-neon-pink/20 p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-synthwave-neon-pink font-rajdhani text-xl font-bold mb-2">
                Delete Conversation
              </h3>
              <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className={`flex-1 ${themeClasses.cyanButton} text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className={`flex-1 ${themeClasses.neonButton} text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ManageCoachConversations;
