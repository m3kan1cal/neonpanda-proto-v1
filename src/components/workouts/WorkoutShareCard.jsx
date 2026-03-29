/**
 * WorkoutShareCard.jsx
 *
 * The 1080x1920 (9:16) branded share card captured by html2canvas.
 * Uses only inline styles and web-safe / Google Fonts already loaded in the app.
 *
 * Rendered off-screen (position: absolute, left: -9999px) by ShareWorkoutModal.
 * Exposed via React.forwardRef so the parent can pass a ref to html2canvas.
 */

import React from "react";
import {
  buildShareCardMetrics,
  buildShareCardExercises,
  buildShareCardRpeIntensity,
} from "./shareCardMetrics";

const COLORS = {
  bgPrimary: "#0d0a1a",
  bgSecondary: "#1a0d2e",
  bgTertiary: "#341460",
  bgCard: "#1e1e2e",
  pink: "#ff0080",
  cyan: "#00ffff",
  purple: "#9f00ff",
  textPrimary: "#ffffff",
  textSecondary: "#b4b4b4",
  textMuted: "#555555",
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const MAX_EXERCISES = 6;

// Flat badge matching badgePatterns.workoutDetail
function DisciplineBadge({ discipline }) {
  if (!discipline) return null;
  const label = discipline
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      style={{
        display: "inline-block",
        background: "rgba(13,10,26,0.5)",
        border: `1px solid rgba(0,255,255,0.30)`,
        color: COLORS.cyan,
        padding: "10px 24px",
        borderRadius: "3px",
        fontFamily: "'Barlow', 'Inter', sans-serif",
        fontWeight: 600,
        fontSize: "24px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

// Flat tile matching RecentPRsCard/TopExercisesCard container style
function MetricCell({ label, value, unit }) {
  return (
    <div
      style={{
        background: "rgba(13,10,26,0.4)",
        border: "1px solid rgba(0,255,255,0.15)",
        borderRadius: "4px",
        padding: "36px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow', 'Inter', sans-serif",
          fontWeight: 900,
          fontSize: "68px",
          lineHeight: 1,
          color: COLORS.textPrimary,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: COLORS.textSecondary,
              marginLeft: "6px",
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: "20px",
          color: COLORS.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Gradient progress bar matching ManageWorkouts pattern
function GradientBar({ label, value }) {
  if (!value || value <= 0) return null;
  const pct = Math.min((value / 10) * 100, 100);
  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: "22px",
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'Barlow', 'Inter', sans-serif",
            fontWeight: 700,
            fontSize: "26px",
            color: COLORS.textPrimary,
          }}
        >
          {value}
          <span style={{ fontSize: "18px", color: COLORS.textMuted }}>/10</span>
        </span>
      </div>
      <div
        style={{
          height: "12px",
          background: "rgba(13,10,26,0.6)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "6px",
            background: `linear-gradient(to right, ${COLORS.cyan}, ${COLORS.pink}, ${COLORS.purple})`,
          }}
        />
      </div>
    </div>
  );
}

function PrBadge({ achievements }) {
  if (!achievements || achievements.length === 0) return null;
  const prNames = achievements
    .slice(0, 2)
    .map((pr) => pr.exercise || pr.exercise_name || "PR")
    .join(" · ");
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${COLORS.pink}22, ${COLORS.purple}22)`,
        border: `1px solid ${COLORS.pink}55`,
        borderRadius: "4px",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <span style={{ fontSize: "34px" }}>🏆</span>
      <div>
        <div
          style={{
            fontFamily: "'Barlow', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "24px",
            color: COLORS.pink,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          New PR{achievements.length > 1 ? "s" : ""}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "20px",
            color: COLORS.textSecondary,
            marginTop: "4px",
          }}
        >
          {prNames}
        </div>
      </div>
    </div>
  );
}

const WorkoutShareCard = React.forwardRef(function WorkoutShareCard(
  { workout, coachData },
  ref,
) {
  const workoutData = workout?.workoutData;
  const metrics = buildShareCardMetrics(workoutData);
  const allExercises = buildShareCardExercises(workoutData);
  const { rpe, intensity } = buildShareCardRpeIntensity(workoutData);
  const prAchievements = workoutData?.pr_achievements || [];

  const displayedExercises = allExercises.slice(0, MAX_EXERCISES);
  const hiddenCount = allExercises.length - displayedExercises.length;

  const workoutName =
    workoutData?.workout_name || workout?.workoutName || "Workout Complete";

  const discipline = workoutData?.discipline || "";

  const completedAt = workout?.completedAt
    ? new Date(workout.completedAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const showRpeBars = rpe > 0 || intensity > 0;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        background: `linear-gradient(160deg, ${COLORS.bgPrimary} 0%, ${COLORS.bgSecondary} 40%, ${COLORS.bgTertiary} 100%)`,
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "5px",
          background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.cyan}, ${COLORS.purple})`,
        }}
      />

      {/* Top glow overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "300px",
          background: `linear-gradient(180deg, ${COLORS.cyan}0c 0%, transparent 100%)`,
          borderBottom: `1px solid ${COLORS.cyan}18`,
        }}
      />

      {/* Decorative glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          right: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.purple}28 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "200px",
          left: "-150px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.pink}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Content area — flex column, full height, overflow hidden */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "80px 80px 56px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* ── Header: NeonPanda logo ── */}
        <div style={{ marginBottom: "64px", flexShrink: 0 }}>
          <img
            src="/images/logo-dark-sm.webp"
            alt="NeonPanda"
            style={{ height: "64px", width: "auto" }}
          />
        </div>

        {/* ── Workout name (uppercase, header font, bold) ── */}
        <div style={{ marginBottom: "24px", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "86px",
              lineHeight: 1.05,
              color: COLORS.textPrimary,
              textTransform: "uppercase",
              letterSpacing: "0.01em",
              wordBreak: "break-word",
            }}
          >
            {workoutName}
          </div>
        </div>

        {/* ── Discipline badge + Date row ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "56px",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <DisciplineBadge discipline={discipline} />
          {completedAt && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "22px",
                color: COLORS.textMuted,
                fontWeight: 400,
              }}
            >
              {completedAt}
            </span>
          )}
        </div>

        {/* ── Metrics grid (2×2 flat tiles) ── */}
        {metrics.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "40px",
              flexShrink: 0,
            }}
          >
            {metrics.map((m, i) => (
              <MetricCell
                key={i}
                label={m.label}
                value={m.value}
                unit={m.unit}
              />
            ))}
          </div>
        )}

        {/* ── RPE / Intensity gradient bars ── */}
        {showRpeBars && (
          <div style={{ marginBottom: "36px", flexShrink: 0 }}>
            <GradientBar label="RPE" value={rpe} />
            <GradientBar label="Intensity" value={intensity} />
          </div>
        )}

        {/* ── PR callout ── */}
        {prAchievements.length > 0 && (
          <div style={{ marginBottom: "36px", flexShrink: 0 }}>
            <PrBadge achievements={prAchievements} />
          </div>
        )}

        {/* ── Exercise list — fills remaining space, clips gracefully ── */}
        {displayedExercises.length > 0 && (
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              background: "rgba(13,10,26,0.30)",
              border: "1px solid rgba(0,255,255,0.20)",
              borderRadius: "4px",
              padding: "36px 44px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontFamily: "'Barlow', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "22px",
                color: COLORS.cyan,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "20px",
                flexShrink: 0,
              }}
            >
              Movements
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0px",
                overflow: "hidden",
                flex: 1,
              }}
            >
              {displayedExercises.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "20px",
                    paddingTop: "14px",
                    paddingBottom: "14px",
                    borderBottom:
                      i < displayedExercises.length - 1
                        ? "1px solid rgba(0,255,255,0.08)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Barlow', 'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: "28px",
                      color: COLORS.cyan,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {ex.name}
                  </span>
                  {ex.detail && (
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "24px",
                        color: COLORS.textSecondary,
                        fontWeight: 400,
                      }}
                    >
                      {ex.detail}
                    </span>
                  )}
                </div>
              ))}

              {hiddenCount > 0 && (
                <div
                  style={{
                    paddingTop: "14px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "22px",
                    color: COLORS.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  +{hiddenCount} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Minimal branding watermark ── */}
        <div
          style={{
            flexShrink: 0,
            textAlign: "right",
            paddingTop: "20px",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "22px",
              letterSpacing: "0.04em",
              background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            neonpanda.ai
          </span>
        </div>
      </div>
    </div>
  );
});

export default WorkoutShareCard;
