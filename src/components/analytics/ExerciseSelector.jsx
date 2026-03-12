import React, { useState, useEffect, useRef, useMemo } from "react";
import { inputPatterns } from "../../utils/ui/uiPatterns";

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

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      {/* Selected display / search input */}
      <div
        className={`${inputPatterns.standard} flex items-center gap-2 cursor-pointer !py-2 !min-h-[40px]`}
        onClick={() => setIsOpen(true)}
      >
        {isOpen ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises..."
            className="bg-transparent outline-none w-full font-body text-sm text-white placeholder-synthwave-text-muted"
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsOpen(false);
              if (e.key === "Enter" && filtered.length > 0) {
                handleSelect(filtered[0]);
              }
            }}
          />
        ) : selectedDisplay ? (
          <div className="flex items-center justify-between w-full">
            <span className="font-body text-sm text-white font-medium truncate">
              {selectedDisplay.displayName || selectedDisplay.exerciseName}
            </span>
            <span className="font-body text-xs text-synthwave-text-muted shrink-0 ml-2">
              {selectedDisplay.count} sessions
            </span>
          </div>
        ) : (
          <span className="font-body text-sm text-synthwave-text-muted">
            {isLoading ? "Loading exercises..." : "Select an exercise..."}
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-synthwave-text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 shadow-lg backdrop-blur-sm synthwave-scrollbar">
          {isLoading ? (
            <div className="px-4 py-6 text-center">
              <div className="h-3 w-24 mx-auto bg-synthwave-text-muted/20 animate-pulse rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-4 text-center font-body text-xs text-synthwave-text-muted">
              {query ? "No exercises match your search." : "No exercises found."}
            </div>
          ) : (
            filtered.map((ex) => {
              const isSelected = ex.exerciseName === selectedExercise;
              return (
                <button
                  key={ex.exerciseName}
                  onClick={() => handleSelect(ex)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors duration-150 ${
                    isSelected
                      ? "bg-synthwave-neon-pink/10 text-synthwave-neon-pink"
                      : "text-white hover:bg-synthwave-neon-cyan/10"
                  }`}
                >
                  <span className="font-body text-sm font-medium truncate">
                    {ex.displayName || ex.exerciseName}
                  </span>
                  <span className="font-body text-[10px] text-synthwave-text-muted shrink-0 ml-3">
                    {ex.count}x
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
