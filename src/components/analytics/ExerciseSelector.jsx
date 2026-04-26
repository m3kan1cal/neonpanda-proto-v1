import React, { useState, useEffect, useRef, useMemo } from "react";
import { badgePatterns } from "../../utils/ui/uiPatterns";

// ---------------------------------------------------------------------------
// ExerciseSelector — searchable dropdown for picking an exercise to chart
// ---------------------------------------------------------------------------

export default function ExerciseSelector({
  exercises = [], // [{ exerciseName, displayName, count, lastPerformed, disciplines }]
  isLoading = false,
  selectedExercise = null, // exerciseName string
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filter exercises by query
  const filtered = useMemo(() => {
    if (!query.trim()) return exercises;
    const q = query.toLowerCase();
    return exercises.filter(
      (ex) =>
        (ex.displayName || ex.exerciseName).toLowerCase().includes(q) ||
        ex.exerciseName.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  // Current selection display
  const selectedDisplay = useMemo(() => {
    if (!selectedExercise) return null;
    return exercises.find((ex) => ex.exerciseName === selectedExercise);
  }, [exercises, selectedExercise]);

  const handleSelect = (ex) => {
    onSelect(ex.exerciseName);
    setQuery("");
    setIsOpen(false);
  };

  const handleContainerClick = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      {/* Input container */}
      <div
        className={`relative flex items-center w-full rounded-xl bg-synthwave-bg-primary/30 border transition-all duration-300 cursor-pointer ${
          isOpen
            ? "border-synthwave-neon-cyan bg-synthwave-bg-primary/50"
            : "border-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/40"
        }`}
        onClick={handleContainerClick}
      >
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-synthwave-text-muted shrink-0 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Text area */}
        <div className="flex-1 pl-9 pr-16 py-3 min-h-[44px] flex items-center">
          {isOpen ? (
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises..."
              className="bg-transparent outline-none w-full font-body text-sm text-white placeholder-synthwave-text-muted"
              style={{ boxShadow: "none" }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                  setQuery("");
                }
                if (e.key === "Enter" && filtered.length > 0) {
                  handleSelect(filtered[0]);
                }
              }}
            />
          ) : selectedDisplay ? (
            <span className="font-body text-sm text-white truncate">
              {selectedDisplay.displayName || selectedDisplay.exerciseName}
            </span>
          ) : (
            <span className="font-body text-sm text-synthwave-text-muted">
              {isLoading ? "Loading exercises..." : "Select an exercise..."}
            </span>
          )}
        </div>

        {/* Right controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear button — shown when typing */}
          {isOpen && query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer p-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-synthwave-text-muted shrink-0 transition-transform pointer-events-none ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 shadow-lg backdrop-blur-sm synthwave-scrollbar-cyan">
          {isLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="h-3 w-24 mx-auto bg-synthwave-text-muted/20 animate-pulse rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-4 text-center font-body text-xs text-synthwave-text-muted">
              {query
                ? "No exercises match your search."
                : "No exercises found."}
            </div>
          ) : (
            filtered.map((ex) => {
              const isSelected = ex.exerciseName === selectedExercise;
              return (
                <button
                  key={ex.exerciseName}
                  onClick={() => handleSelect(ex)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-synthwave-neon-pink/10 text-synthwave-neon-pink"
                      : "text-white hover:bg-synthwave-neon-cyan/10"
                  }`}
                >
                  <span className="font-body text-sm truncate">
                    {ex.displayName || ex.exerciseName}
                  </span>
                  <span
                    className={`${badgePatterns.countBase} ${badgePatterns.countCyan} shrink-0 ml-3 !text-[10px] !min-w-[20px] !h-[20px] !px-1`}
                  >
                    {ex.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
