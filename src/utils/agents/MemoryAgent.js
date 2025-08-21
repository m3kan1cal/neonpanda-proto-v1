import { nanoid } from 'nanoid';
import { getMemories, deleteMemory } from '../apis/memoryApi.js';

/**
 * MemoryAgent - Handles the business logic for memory management
 * This class manages memory loading, deletion, and state management
 * while keeping the React component focused on UI concerns.
 */
export class MemoryAgent {
  constructor(userId, onStateChange = null) {
    console.info('MemoryAgent: Constructor called');
    console.info('MemoryAgent: userId:', userId || '(not provided - will be set later)');

    this.userId = userId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== 'function') {
      console.error('MemoryAgent: onStateChange must be a function, got:', typeof this.onStateChange);
      this.onStateChange = null;
    }

    // Default callbacks
    this.onError = () => {};

    // Initialize state
    this.memoryState = {
      allMemories: [],
      isLoadingAllItems: false,
      isLoadingItem: false,
      error: null,
      totalCount: 0
    };

    // Add alias for backward compatibility
    this.state = this.memoryState;

    console.info('MemoryAgent: Constructor complete', userId ? 'with userId' : '(userId will be set later)');
  }

  /**
   * Updates the memory state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.memoryState };

    // Update state
    this.memoryState = {
      ...this.memoryState,
      ...newStateData
    };

    // Update alias for backward compatibility
    this.state = this.memoryState;

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(this.memoryState);
      } catch (error) {
        console.error('MemoryAgent._updateState: Error in state change callback:', error);
      }
    } else if (this.onStateChange !== null) {
      console.warn('MemoryAgent._updateState: Invalid callback type:', typeof this.onStateChange);
    }
  }

  /**
   * Sets the user ID and loads initial data
   */
  async setUserId(userId) {
    console.info('MemoryAgent.setUserId called with:', userId);

    if (!userId) {
      console.error('MemoryAgent.setUserId: userId is required');
      return;
    }

    this.userId = userId;
    console.info('MemoryAgent.setUserId: userId set to:', this.userId);

    // Load initial data
    await this.loadAllMemories();

    console.info('MemoryAgent.setUserId: Initial data loaded');
  }

  /**
   * Loads all memories for the user
   */
  async loadAllMemories(options = {}) {
    if (!this.userId) {
      console.warn('MemoryAgent.loadAllMemories: No userId set');
      return;
    }

    console.info('MemoryAgent.loadAllMemories: Loading all memories for user:', this.userId);

    this._updateState({
      isLoadingAllItems: true,
      error: null
    });

    try {
      const response = await getMemories(this.userId, options);

      console.info('MemoryAgent.loadAllMemories: Loaded memories:', response.memories?.length || 0);

      this._updateState({
        allMemories: response.memories || [],
        totalCount: response.totalCount || 0,
        isLoadingAllItems: false,
        error: null
      });

    } catch (error) {
      console.error('MemoryAgent.loadAllMemories: Error loading memories:', error);

      this._updateState({
        allMemories: [],
        totalCount: 0,
        isLoadingAllItems: false,
        error: error.message || 'Failed to load memories'
      });

      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Deletes a memory
   */
  async deleteMemory(memoryId) {
    if (!this.userId) {
      console.warn('MemoryAgent.deleteMemory: No userId set');
      return false;
    }

    if (!memoryId) {
      console.error('MemoryAgent.deleteMemory: memoryId is required');
      return false;
    }

    console.info('MemoryAgent.deleteMemory: Deleting memory:', memoryId);

    this._updateState({
      isLoadingItem: true,
      error: null
    });

    try {
      await deleteMemory(this.userId, memoryId);

      console.info('MemoryAgent.deleteMemory: Memory deleted successfully:', memoryId);

      // Remove the memory from the current state
      const updatedMemories = this.memoryState.allMemories.filter(
        memory => memory.memoryId !== memoryId
      );

      this._updateState({
        allMemories: updatedMemories,
        totalCount: updatedMemories.length,
        isLoadingItem: false,
        error: null
      });

      return true;

    } catch (error) {
      console.error('MemoryAgent.deleteMemory: Error deleting memory:', error);

      this._updateState({
        isLoadingItem: false,
        error: error.message || 'Failed to delete memory'
      });

      if (this.onError) {
        this.onError(error);
      }

      return false;
    }
  }

  /**
   * Formats memory content for display
   */
  formatMemoryContent(memory, truncate = false) {
    if (!memory || !memory.content) return 'No content';

    const content = memory.content.trim();
    if (!truncate) return content;

    // Truncate to 100 characters for list display
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  /**
   * Formats memory type for display
   */
  formatMemoryType(memoryType) {
    if (!memoryType) return 'Unknown';

    // Capitalize first letter and replace underscores with spaces
    return memoryType.charAt(0).toUpperCase() + memoryType.slice(1).replace(/_/g, ' ');
  }

  /**
   * Formats memory importance for display
   */
  formatMemoryImportance(importance) {
    if (!importance) return 'Unknown';

    return importance.charAt(0).toUpperCase() + importance.slice(1);
  }

  /**
   * Gets importance color class for styling
   */
  getImportanceColorClass(importance) {
    switch (importance) {
      case 'high':
        return 'text-synthwave-neon-pink';
      case 'medium':
        return 'text-synthwave-neon-cyan';
      case 'low':
        return 'text-synthwave-text-secondary';
      default:
        return 'text-synthwave-text-secondary';
    }
  }

  /**
   * Formats memory creation date
   */
  formatMemoryDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  }

  /**
   * Cleanup method
   */
  destroy() {
    console.info('MemoryAgent.destroy: Cleaning up');
    this.onStateChange = null;
    this.onError = null;
    this.userId = null;
    this.memoryState = {
      allMemories: [],
      isLoadingAllItems: false,
      isLoadingItem: false,
      error: null,
      totalCount: 0
    };
  }
}

export default MemoryAgent;
