import { nanoid } from "nanoid";
import {
  getMemories,
  deleteMemory,
  createMemory,
  updateMemory,
} from "../apis/memoryApi.js";
import { logger } from "../logger";

/**
 * MemoryAgent - Handles the business logic for memory management
 * This class manages memory loading, deletion, and state management
 * while keeping the React component focused on UI concerns.
 */
export class MemoryAgent {
  constructor(userId, onStateChange = null) {
    this.userId = userId;
    this.onStateChange = onStateChange;

    // Validate callback
    if (this.onStateChange && typeof this.onStateChange !== "function") {
      logger.error(
        "MemoryAgent: onStateChange must be a function, got:",
        typeof this.onStateChange,
      );
      this.onStateChange = null;
    }

    // Default callbacks
    this.onError = () => {};

    // Initialize state
    this.memoryState = {
      allMemories: [],
      isLoadingAllItems: false,
      isLoadingMoreAllItems: false,
      isLoadingItem: false,
      error: null,
      totalCount: 0,
      allMemoriesOffset: 0,
      allMemoriesFilters: null,
    };

    // Add alias for backward compatibility
    this.state = this.memoryState;
  }

  /**
   * Updates the memory state and triggers callback
   */
  _updateState(newStateData) {
    const oldState = { ...this.memoryState };

    // Update state
    this.memoryState = {
      ...this.memoryState,
      ...newStateData,
    };

    // Update alias for backward compatibility
    this.state = this.memoryState;

    // Call state change callback if available
    if (this.onStateChange && typeof this.onStateChange === "function") {
      try {
        this.onStateChange(this.memoryState);
      } catch (error) {
        logger.error(
          "MemoryAgent._updateState: Error in state change callback:",
          error,
        );
      }
    } else if (this.onStateChange !== null) {
      logger.warn(
        "MemoryAgent._updateState: Invalid callback type:",
        typeof this.onStateChange,
      );
    }
  }

  /**
   * Sets the user ID and loads initial data
   */
  async setUserId(userId) {
    if (!userId) {
      logger.error("MemoryAgent.setUserId: userId is required");
      return;
    }

    this.userId = userId;

    // Load initial data
    await this.loadAllMemories();
  }

  /**
   * Loads the first page of memories for the user. When `options.limit` is
   * omitted the endpoint returns every matching row, preserving the legacy
   * non-paginated callers; when provided this becomes page 0 for the Load
   * more flow.
   */
  async loadAllMemories(options = {}) {
    if (!this.userId) {
      logger.warn("MemoryAgent.loadAllMemories: No userId set");
      return;
    }

    this._updateState({
      isLoadingAllItems: true,
      error: null,
      allMemoriesFilters: options,
    });

    try {
      const response = await getMemories(this.userId, {
        ...options,
        offset: 0,
      });
      const items = response.memories || [];
      const totalCount =
        typeof response.totalCount === "number"
          ? response.totalCount
          : typeof response.count === "number"
            ? response.count
            : items.length;

      this._updateState({
        allMemories: items,
        allMemoriesOffset: items.length,
        totalCount,
        isLoadingAllItems: false,
        error: null,
      });
    } catch (error) {
      logger.error(
        "MemoryAgent.loadAllMemories: Error loading memories:",
        error,
      );

      this._updateState({
        allMemories: [],
        allMemoriesOffset: 0,
        totalCount: 0,
        isLoadingAllItems: false,
        error: error.message || "Failed to load memories",
      });

      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Fetches the next page of memories and appends them to the existing list.
   * On failure, leaves allMemories, offset, and totalCount untouched so a
   * retry re-requests the same page.
   */
  async loadMoreMemories(pageSize) {
    if (!this.userId) return;
    if (this.memoryState.isLoadingMoreAllItems) return;

    const offset = this.memoryState.allMemoriesOffset;
    const total = this.memoryState.totalCount;
    if (offset >= total) return;

    const filters = this.memoryState.allMemoriesFilters || {};
    const limit =
      typeof pageSize === "number" && pageSize > 0
        ? pageSize
        : filters.limit || 25;

    this._updateState({ isLoadingMoreAllItems: true });

    try {
      const response = await getMemories(this.userId, {
        ...filters,
        limit,
        offset,
      });
      const items = response.memories || [];
      const totalCount =
        typeof response.totalCount === "number"
          ? response.totalCount
          : typeof response.count === "number"
            ? response.count
            : total;

      const existingIds = new Set(
        this.memoryState.allMemories.map((m) => m.memoryId),
      );
      const merged = [...this.memoryState.allMemories];
      for (const item of items) {
        if (!existingIds.has(item.memoryId)) {
          merged.push(item);
          existingIds.add(item.memoryId);
        }
      }

      this._updateState({
        allMemories: merged,
        allMemoriesOffset: merged.length,
        totalCount,
        isLoadingMoreAllItems: false,
      });

      return items;
    } catch (error) {
      logger.error("MemoryAgent.loadMoreMemories: error:", error);
      this._updateState({ isLoadingMoreAllItems: false });
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * Creates a new memory
   */
  async createMemory(content, options = {}) {
    if (!this.userId) {
      logger.warn("MemoryAgent.createMemory: No userId set");
      return false;
    }

    if (!content || !content.trim()) {
      logger.error("MemoryAgent.createMemory: content is required");
      return false;
    }

    logger.info("MemoryAgent.createMemory: Creating memory:", {
      content,
      options,
    });

    this._updateState({
      isLoadingItem: true,
      error: null,
    });

    try {
      const memoryData = {
        content: content.trim(),
        coachId: options.coachId || null,
        // AI will determine memoryType and importance automatically
      };

      const result = await createMemory(this.userId, memoryData);

      logger.info(
        "MemoryAgent.createMemory: Memory created successfully:",
        result,
      );

      // Add the new memory to the current state. Optimistic patch bumps
      // totalCount by 1 and advances the paginated offset so subsequent Load
      // more calls request the correct slice even when we haven't loaded the
      // whole list yet.
      const newMemory = result.memory || result;
      const updatedMemories = [newMemory, ...this.memoryState.allMemories];

      this._updateState({
        allMemories: updatedMemories,
        allMemoriesOffset: (this.memoryState.allMemoriesOffset || 0) + 1,
        totalCount: (this.memoryState.totalCount || 0) + 1,
        isLoadingItem: false,
        error: null,
      });

      return result;
    } catch (error) {
      logger.error("MemoryAgent.createMemory: Error creating memory:", error);

      this._updateState({
        isLoadingItem: false,
        error: error.message || "Failed to create memory",
      });

      return false;
    }
  }

  /**
   * Deletes a memory
   */
  async deleteMemory(memoryId) {
    if (!this.userId) {
      logger.warn("MemoryAgent.deleteMemory: No userId set");
      return false;
    }

    if (!memoryId) {
      logger.error("MemoryAgent.deleteMemory: memoryId is required");
      return false;
    }

    logger.info("MemoryAgent.deleteMemory: Deleting memory:", memoryId);

    this._updateState({
      isLoadingItem: true,
      error: null,
    });

    try {
      await deleteMemory(this.userId, memoryId);

      logger.info(
        "MemoryAgent.deleteMemory: Memory deleted successfully:",
        memoryId,
      );

      // Remove the memory from the current state. Optimistic patch
      // decrements totalCount and offset when the deleted item was part of
      // the currently-loaded page so hasMore stays correct for Load more.
      const wasLoaded = this.memoryState.allMemories.some(
        (memory) => memory.memoryId === memoryId,
      );
      const updatedMemories = this.memoryState.allMemories.filter(
        (memory) => memory.memoryId !== memoryId,
      );

      this._updateState({
        allMemories: updatedMemories,
        allMemoriesOffset: wasLoaded
          ? Math.max(0, (this.memoryState.allMemoriesOffset || 0) - 1)
          : this.memoryState.allMemoriesOffset || 0,
        totalCount: Math.max(0, (this.memoryState.totalCount || 0) - 1),
        isLoadingItem: false,
        error: null,
      });

      return true;
    } catch (error) {
      logger.error("MemoryAgent.deleteMemory: Error deleting memory:", error);

      this._updateState({
        isLoadingItem: false,
        error: error.message || "Failed to delete memory",
      });

      if (this.onError) {
        this.onError(error);
      }

      return false;
    }
  }

  /**
   * Updates a memory's editable fields
   */
  async updateMemory(memoryId, updateData) {
    if (!this.userId) {
      logger.warn("MemoryAgent.updateMemory: No userId set");
      return false;
    }

    if (!memoryId) {
      logger.error("MemoryAgent.updateMemory: memoryId is required");
      return false;
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      logger.error("MemoryAgent.updateMemory: updateData is required");
      return false;
    }

    logger.info("MemoryAgent.updateMemory: Updating memory:", {
      memoryId,
      updateFields: Object.keys(updateData),
    });

    this._updateState({
      isLoadingItem: true,
      error: null,
    });

    try {
      const result = await updateMemory(this.userId, memoryId, updateData);

      logger.info(
        "MemoryAgent.updateMemory: Memory updated successfully:",
        result,
      );

      // Update the memory in local state
      const updatedMemory = result.memory || { ...updateData, memoryId };
      const updatedMemories = this.memoryState.allMemories.map((memory) =>
        memory.memoryId === memoryId ? { ...memory, ...updatedMemory } : memory,
      );

      this._updateState({
        allMemories: updatedMemories,
        isLoadingItem: false,
        error: null,
      });

      return result;
    } catch (error) {
      logger.error("MemoryAgent.updateMemory: Error updating memory:", error);

      this._updateState({
        isLoadingItem: false,
        error: error.message || "Failed to update memory",
      });

      return false;
    }
  }

  /**
   * Formats memory content for display
   */
  formatMemoryContent(memory, truncate = false) {
    if (!memory || !memory.content) return "No content";

    const content = memory.content.trim();
    if (!truncate) return content;

    // Truncate to 100 characters for list display
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  }

  /**
   * Formats memory type for display
   */
  formatMemoryType(memoryType) {
    if (!memoryType) return "Unknown";

    // Capitalize first letter and replace underscores with spaces
    return (
      memoryType.charAt(0).toUpperCase() +
      memoryType.slice(1).replace(/_/g, " ")
    );
  }

  /**
   * Formats memory importance for display
   */
  formatMemoryImportance(importance) {
    if (!importance) return "Unknown";

    return importance.charAt(0).toUpperCase() + importance.slice(1);
  }

  /**
   * Gets importance color class for styling
   */
  getImportanceColorClass(importance) {
    switch (importance) {
      case "high":
        return "text-synthwave-neon-pink";
      case "medium":
        return "text-synthwave-neon-cyan";
      case "low":
        return "text-synthwave-text-secondary";
      default:
        return "text-synthwave-text-secondary";
    }
  }

  /**
   * Formats memory creation date
   */
  formatMemoryDate(dateString) {
    if (!dateString) return "Created Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Created just now";
    } else if (diffInHours < 24) {
      return `Created ${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return "Created yesterday";
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `Created ${diffInDays}d ago`;
      } else {
        return `Created ${date.toLocaleDateString()}`;
      }
    }
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.onStateChange = null;
    this.onError = null;
    this.userId = null;
    this.memoryState = {
      allMemories: [],
      isLoadingAllItems: false,
      isLoadingMoreAllItems: false,
      isLoadingItem: false,
      error: null,
      totalCount: 0,
      allMemoriesOffset: 0,
      allMemoriesFilters: null,
    };
  }
}

export default MemoryAgent;
