// Pagination constants for list surfaces that support Load more.
// Used by Manage Workouts, Manage Memories, Manage Coach Conversations,
// Manage Programs (per-status), Manage Shared Programs, and View Reports.

// Initial page size and subsequent Load more increment across all paginated
// Manage list pages. Kept server-side validation compatible (must fit within
// the shared [1, 100] limit range enforced by touched list handlers).
export const LIST_PAGE_SIZE = 25;
