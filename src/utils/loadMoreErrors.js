// Shared helpers for Load more error handling on paginated Manage list pages.
//
// The contract is documented in the Load more plan:
//   - Show a toast via ToastContext so the user knows the request failed.
//   - DO NOT advance offset, mutate items, or touch totalCount on failure.
//   - Keep the Load more button enabled so the user can retry with one click.
//
// Consumers should call this from their catch block AFTER the optimistic state
// has been reset (e.g. turn off isLoadingMore) but BEFORE re-throwing so the
// surrounding flow can short-circuit if needed.

const DEFAULT_LOAD_MORE_ERROR_MESSAGE =
  "Failed to load more. Tap Load more to retry.";

export const notifyLoadMoreError = (toast, error, message) => {
  // We intentionally log the raw error so debugging is still possible while
  // keeping the UI message consistent across surfaces.
  console.error("Load more failed:", error);

  if (toast && typeof toast.error === "function") {
    toast.error(message || DEFAULT_LOAD_MORE_ERROR_MESSAGE);
  }
};

export { DEFAULT_LOAD_MORE_ERROR_MESSAGE };
