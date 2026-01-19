// Navigation Context Provider
// Centralizes navigation-related state and logic

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { formatRoute } from "../utils/navigation";
import { getCoach, getCoachesCount } from "../utils/apis/coachApi";
import { getWorkoutsCount } from "../utils/apis/workoutApi";
import { getExercisesCount } from "../utils/apis/exerciseApi";
import { getCoachConversationsCount } from "../utils/apis/coachConversationApi";
import { getMemories } from "../utils/apis/memoryApi";
import { getWeeklyReports } from "../utils/apis/reportApi";
import { getAllPrograms } from "../utils/apis/programApi";
import CoachAgent from "../utils/agents/CoachAgent";

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated, user, signOut } = useAuth();

  // Extract URL parameters
  const userId = searchParams.get("userId");
  const coachId = searchParams.get("coachId");

  // Local state
  const [currentCoachName, setCurrentCoachName] = useState("");
  const [coachData, setCoachData] = useState(null);
  const [coachesCount, setCoachesCount] = useState(0);
  const [exercisesCount, setExercisesCount] = useState(0);
  const [newItemCounts, setNewItemCounts] = useState({
    workouts: 0,
    conversations: 0,
    memories: 0,
    reports: 0,
    programs: 0,
  });
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("neonpanda-sidebar-collapsed");
    return stored === "true";
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteCommand, setCommandPaletteCommand] = useState("");

  // Derived state
  const hasCoachContext = !!(userId && coachId && isAuthenticated);

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    localStorage.setItem(
      "neonpanda-sidebar-collapsed",
      isSidebarCollapsed.toString(),
    );
  }, [isSidebarCollapsed]);

  // Fetch coach data when coachId changes
  useEffect(() => {
    if (!hasCoachContext) {
      setCurrentCoachName("");
      setCoachData(null);
      return;
    }

    const fetchCoachData = async () => {
      try {
        const data = await getCoach(userId, coachId);
        // Store full coach data
        setCoachData({ rawCoach: data, name: data.coachName });
        // Use CoachAgent helper to format coach name (replaces underscores with spaces)
        const coachAgent = new CoachAgent();
        const formattedName = coachAgent.formatCoachName(
          data.coachConfig?.coach_name || data.coachName,
        );
        setCurrentCoachName(formattedName);
      } catch (error) {
        // Silently fail - this is just for nav UI enhancement
        setCoachData(null);
      }
    };

    fetchCoachData();
  }, [coachId, userId, hasCoachContext]);

  // Fetch coaches count when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setCoachesCount(0);
      return;
    }

    const fetchCoachesCount = async () => {
      try {
        const data = await getCoachesCount(userId);
        setCoachesCount(data.totalCount || 0);
      } catch (error) {
        console.warn(
          "NavigationContext: Failed to fetch coaches count:",
          error,
        );
        setCoachesCount(0);
      }
    };

    fetchCoachesCount();
  }, [userId, isAuthenticated]);

  // Fetch exercises count when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setExercisesCount(0);
      return;
    }

    const fetchExercisesCount = async () => {
      try {
        const data = await getExercisesCount(userId);
        setExercisesCount(data.count || 0);
      } catch (error) {
        console.warn(
          "NavigationContext: Failed to fetch exercises count:",
          error,
        );
        setExercisesCount(0);
      }
    };

    fetchExercisesCount();
  }, [userId, isAuthenticated]);

  // Fetch new item counts when coach context changes
  useEffect(() => {
    if (!hasCoachContext) {
      setNewItemCounts({
        workouts: 0,
        conversations: 0,
        memories: 0,
        reports: 0,
        programs: 0,
      });
      return;
    }

    const fetchNewItemCounts = async () => {
      try {
        // Fetch counts using existing APIs
        const [
          workoutsData,
          conversationsData,
          memoriesData,
          reportsData,
          programsData,
        ] = await Promise.all([
          getWorkoutsCount(userId).catch(() => ({ totalCount: 0 })),
          getCoachConversationsCount(userId, coachId).catch(() => ({
            totalCount: 0,
            totalMessages: 0,
          })),
          getMemories(userId).catch((err) => {
            console.warn("NavigationContext: Failed to fetch memories:", err);
            return [];
          }),
          getWeeklyReports(userId, { coachId }).catch((err) => {
            console.warn("NavigationContext: Failed to fetch reports:", err);
            return { items: [] };
          }),
          getAllPrograms(userId, { includeArchived: false }).catch((err) => {
            console.warn(
              "NavigationContext: Failed to fetch training programs:",
              err,
            );
            return { programs: [] };
          }),
        ]);

        // Handle different response formats for memories (array or object with items/memories property)
        let memoriesCount = 0;
        if (Array.isArray(memoriesData)) {
          memoriesCount = memoriesData.length;
        } else if (memoriesData.items) {
          memoriesCount = memoriesData.items.length;
        } else if (memoriesData.memories) {
          memoriesCount = memoriesData.memories.length;
        } else if (memoriesData.totalCount !== undefined) {
          memoriesCount = memoriesData.totalCount;
        }

        // Handle different response formats for reports
        let reportsCount = 0;
        if (Array.isArray(reportsData)) {
          reportsCount = reportsData.length;
        } else if (reportsData.items) {
          reportsCount = reportsData.items.length;
        } else if (reportsData.reports) {
          reportsCount = reportsData.reports.length;
        } else if (reportsData.totalCount !== undefined) {
          reportsCount = reportsData.totalCount;
        }

        // Handle different response formats for programs
        // Note: Backend already filters out archived programs by default
        let programsCount = 0;
        if (Array.isArray(programsData)) {
          programsCount = programsData.length;
        } else if (programsData.programs) {
          programsCount = programsData.programs.length;
        } else if (programsData.totalCount !== undefined) {
          programsCount = programsData.totalCount;
        }

        setNewItemCounts({
          workouts: workoutsData.totalCount || 0,
          conversations: conversationsData.totalCount || 0,
          memories: memoriesCount,
          reports: reportsCount,
          programs: programsCount,
        });
      } catch (error) {
        console.error("NavigationContext: Error fetching item counts:", error);
      }
    };

    fetchNewItemCounts();
  }, [coachId, userId, hasCoachContext]);

  // Helper functions for route generation
  const getHomeRoute = () => {
    if (!isAuthenticated) return "/";
    if (!coachId) return `/coaches?userId=${userId}`;
    return `/training-grounds?userId=${userId}&coachId=${coachId}`;
  };

  const getTrainingRoute = () => {
    if (!hasCoachContext) return "#";
    return `/training-grounds?userId=${userId}&coachId=${coachId}`;
  };

  const getProgressRoute = () => {
    if (!hasCoachContext) return "#";
    return `/progress?userId=${userId}&coachId=${coachId}`;
  };

  const getWorkoutsRoute = () => {
    if (!hasCoachContext) return "#";
    return `/workouts?userId=${userId}&coachId=${coachId}`;
  };

  const getConversationsRoute = () => {
    if (!hasCoachContext) return "#";
    return `/conversations?userId=${userId}&coachId=${coachId}`;
  };

  const getMemoriesRoute = () => {
    if (!hasCoachContext) return "#";
    return `/memories?userId=${userId}&coachId=${coachId}`;
  };

  // Command palette toggle function
  const onCommandPaletteToggle = (command = "") => {
    setCommandPaletteCommand(command);
    setIsCommandPaletteOpen(true);
  };

  // Context value
  const value = {
    // URL params
    userId,
    coachId,

    // Auth state
    isAuthenticated,
    user,
    signOut,

    // Coach context
    currentCoachName,
    coachData,
    hasCoachContext,
    coachesCount,
    exercisesCount,

    // New item counts
    newItemCounts,

    // UI state
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    // Command palette state
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteCommand,
    setCommandPaletteCommand,
    onCommandPaletteToggle,

    // Current location
    currentPath: location.pathname,
    currentSearchParams: searchParams,

    // Route helpers
    getHomeRoute,
    getTrainingRoute,
    getProgressRoute,
    getWorkoutsRoute,
    getConversationsRoute,
    getMemoriesRoute,
    formatRoute,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to access navigation context
 * @returns {Object} Navigation context
 */
export const useNavigationContext = () => {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error(
      "useNavigationContext must be used within NavigationProvider",
    );
  }

  return context;
};
