/**
 * WorkoutShareCard.jsx
 *
 * The 1080x1920 (9:16) branded share card captured by html2canvas.
 * Uses only inline styles and web-safe / Google Fonts that are already
 * loaded in the app, so html2canvas can render them reliably.
 *
 * Rendered off-screen (position: absolute, left: -9999px) by ShareWorkoutModal.
 * Exposed via React.forwardRef so the parent can pass a ref to html2canvas.
 */

import React from "react";
import {
  buildShareCardMetrics,
  buildShareCardExercises,
} from "./shareCardMetrics";

// Colors matching the existing synthwave palette from index.css
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
  textMuted: "#666666",
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function DisciplineBadge({ discipline }) {
  if (!discipline) return null;
  const label = discipline
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      style={{
        display: "inline-block",
        background: `linear-gradient(135deg, ${COLORS.pink}22, ${COLORS.cyan}22)`,
        border: `1.5px solid ${COLORS.cyan}66`,
        color: COLORS.cyan,
        padding: "10px 28px",
        borderRadius: "40px",
        fontFamily: "'Barlow', 'Inter', sans-serif",
        fontWeight: 700,
        fontSize: "26px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function MetricCell({ label, value, unit }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard}ee, ${COLORS.bgSecondary}dd)`,
        border: `1px solid ${COLORS.pink}33`,
        borderRadius: "20px",
        padding: "40px 30px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow', 'Inter', sans-serif",
          fontWeight: 900,
          fontSize: "72px",
          lineHeight: 1,
          color: COLORS.textPrimary,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: "30px",
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
          fontSize: "22px",
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

function PrBadge({ achievements }) {
  if (!achievements || achievements.length === 0) return null;
  const prNames = achievements
    .slice(0, 2)
    .map((pr) => pr.exercise || pr.exercise_name || "PR")
    .join(" · ");
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${COLORS.pink}33, ${COLORS.purple}33)`,
        border: `1.5px solid ${COLORS.pink}88`,
        borderRadius: "16px",
        padding: "20px 36px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <span style={{ fontSize: "36px" }}>🏆</span>
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
  const exercises = buildShareCardExercises(workoutData);
  const prAchievements = workoutData?.pr_achievements || [];

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

  const coachName = coachData?.name || (workout?.coachNames || [])[0] || null;

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
      {/* Decorative neon grid lines (top) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "320px",
          background: `linear-gradient(180deg, ${COLORS.cyan}10 0%, transparent 100%)`,
          borderBottom: `1px solid ${COLORS.cyan}20`,
        }}
      />

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

      {/* Decorative glow blobs */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          right: "-200px",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.purple}30 0%, transparent 70%)`,
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
          background: `radial-gradient(circle, ${COLORS.pink}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Content area */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "80px 80px 60px",
          boxSizing: "border-box",
        }}
      >
        {/* ── Header: NeonPanda wordmark ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "72px",
          }}
        >
          {/* Panda icon mark */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "14px",
              background: `linear-gradient(135deg, ${COLORS.pink}, ${COLORS.purple})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "34px",
              flexShrink: 0,
            }}
          >
            🐼
          </div>
          <div
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 900,
              fontSize: "38px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: `linear-gradient(90deg, ${COLORS.textPrimary}, ${COLORS.textSecondary})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            NeonPanda
          </div>
        </div>

        {/* ── Workout name ── */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 900,
              fontSize: "88px",
              lineHeight: 1.0,
              color: COLORS.textPrimary,
              letterSpacing: "-0.02em",
              wordBreak: "break-word",
            }}
          >
            {workoutName}
          </div>
        </div>

        {/* ── Discipline + Date row ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "64px",
            flexWrap: "wrap",
          }}
        >
          <DisciplineBadge discipline={discipline} />
          {completedAt && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "24px",
                color: COLORS.textMuted,
                fontWeight: 400,
              }}
            >
              {completedAt}
            </span>
          )}
        </div>

        {/* ── Metrics grid (2×2) ── */}
        {metrics.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "48px",
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

        {/* ── PR callout ── */}
        {prAchievements.length > 0 && (
          <div style={{ marginBottom: "48px" }}>
            <PrBadge achievements={prAchievements} />
          </div>
        )}

        {/* ── Exercise list ── */}
        {exercises.length > 0 && (
          <div
            style={{
              background: `${COLORS.bgCard}99`,
              border: `1px solid ${COLORS.cyan}22`,
              borderRadius: "20px",
              padding: "36px 44px",
              marginBottom: "auto",
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
                marginBottom: "24px",
              }}
            >
              Movements
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {exercises.map((name, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: i % 2 === 0 ? COLORS.pink : COLORS.cyan,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "26px",
                      color: COLORS.textSecondary,
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Footer ── */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.cyan}22`,
            paddingTop: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            {coachName && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "22px",
                  color: COLORS.textMuted,
                }}
              >
                Coached by{" "}
                <span style={{ color: COLORS.textSecondary, fontWeight: 600 }}>
                  {coachName}
                </span>
              </div>
            )}
          </div>
          <div
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: "26px",
              letterSpacing: "0.04em",
              background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            neonpanda.ai
          </div>
        </div>
      </div>
    </div>
  );
});

export default WorkoutShareCard;
