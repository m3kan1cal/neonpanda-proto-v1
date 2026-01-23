# React Patterns - Frontend Development Standards

This document defines reference patterns for React development in NeonPanda. These patterns ensure consistency, prevent common bugs, and follow React 18+ best practices.

---

## 1. Async Operations in useEffect with AbortController

### The Problem

React 18 Strict Mode double-mounts components in development to help identify side effects. Without proper handling, this causes:

- **Duplicate API calls** - Two requests sent simultaneously
- **Race conditions** - Responses arriving out of order
- **Memory leaks** - State updates on unmounted components
- **Duplicate records** - Backend receives concurrent identical requests

### The Wrong Approach (Common Mistakes)

#### Mistake 1: Not passing signal to fetch

```jsx
// ❌ WRONG: AbortController only prevents state updates, not the actual request
useEffect(() => {
  const abortController = new AbortController();

  const fetchData = async () => {
    const result = await apiCall(); // Request still sent!

    if (!abortController.signal.aborted) {
      setData(result); // Only state update is guarded
    }
  };

  fetchData();
  return () => abortController.abort();
}, []);
```

#### Mistake 2: Using a ref to track "in flight" status

```jsx
// ❌ WRONG: Workaround that doesn't follow React patterns
const requestInFlightRef = useRef(false);

useEffect(() => {
  if (requestInFlightRef.current) return; // Hacky guard
  requestInFlightRef.current = true;

  apiCall().then(setData);
}, []);
```

### The Correct Pattern

Pass the `AbortSignal` to the fetch call so the **actual HTTP request** is cancelled on cleanup.

#### Step 1: API Function accepts signal

```javascript
// src/utils/apis/exampleApi.js

/**
 * @param {string} userId
 * @param {Object} options
 * @param {AbortSignal} options.signal - AbortSignal to cancel the request
 */
export async function fetchSomething(userId, { signal } = {}) {
  const url = `${getApiUrl("")}/users/${userId}/something`;

  try {
    const response = await authenticatedFetch(url, {
      method: "GET",
      signal, // Pass signal to fetch
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Don't log AbortErrors - these are expected during cleanup
    if (error.name !== "AbortError") {
      console.error("fetchSomething: Exception:", error);
    }
    throw error;
  }
}
```

#### Step 2: Component passes signal from AbortController

```jsx
// src/components/ExampleComponent.jsx
import React, { useState, useEffect } from "react";
import { fetchSomething } from "../utils/apis/exampleApi";

function ExampleComponent({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Pass signal to cancel request if component unmounts
        const result = await fetchSomething(userId, {
          signal: abortController.signal,
        });

        // Request completed - update state
        setData(result);
      } catch (err) {
        // Ignore AbortErrors - expected when component unmounts
        if (err.name === "AbortError") {
          return;
        }

        console.error("Failed to load data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        // Only update loading if not aborted
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup: abort the request if component unmounts
    return () => {
      abortController.abort();
    };
  }, [userId]); // Re-run if userId changes

  // ... render
}
```

### How It Works in React Strict Mode

**Timeline:**

1. **First mount**: `fetch #1` starts with `signal #1`
2. **First unmount** (Strict Mode): `abort()` called → `fetch #1` cancelled with AbortError
3. **Second mount**: `fetch #2` starts with `signal #2` → completes successfully

Result: Only **one** successful request, no duplicates.

### Reference Implementation

See `src/components/shared-programs/ShareProgramModal.jsx` for a complete working example.

### Key Points

1. **Always pass signal to fetch** - The signal must reach the actual `fetch()` call
2. **Handle AbortError gracefully** - Don't log or show errors for expected aborts
3. **Check signal.aborted in finally** - Prevent state updates after abort
4. **Make signal optional** - Use `{ signal } = {}` so callers can omit it for non-effect calls (like button clicks)

---

## 2. User-Initiated Actions (No AbortController Needed)

For actions triggered by user interaction (button clicks, form submissions), you typically don't need AbortController because:

- The action is intentional, not a side effect
- There's no cleanup concern from unmounting

```jsx
// ✅ Button click handlers don't need AbortController
const handleRetry = async () => {
  setLoading(true);
  try {
    const result = await apiCall(userId, data);
    setResult(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Dependency Array Best Practices

### Include all dependencies

```jsx
// ✅ Correct: userId is in deps
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

### Use useCallback for stable references

```jsx
// ✅ Stable callback reference
const fetchData = useCallback(async () => {
  // ...
}, [userId]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

---

## 4. Loading States Pattern

Consistent loading state management across components:

```jsx
const [loading, setLoading] = useState(true); // Start true for initial load
const [error, setError] = useState(null);
const [data, setData] = useState(null);

// Render order: Loading → Error → Empty → Content
if (loading) return <LoadingScreen />;
if (error) return <ErrorDisplay error={error} onRetry={handleRetry} />;
if (!data || data.length === 0) return <EmptyState />;
return <Content data={data} />;
```

---

## Future Patterns

Add new patterns here as they are established:

- Form validation patterns
- Modal management
- Context usage guidelines
- Custom hook patterns
