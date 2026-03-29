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

const LABEL_VALUE_STYLE = {
  label: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "22px",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  value: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: "22px",
    color: COLORS.textSecondary,
  },
  separator: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "22px",
    color: COLORS.textMuted,
    margin: "0 16px",
  },
};

// Flat tile matching RecentPRsCard/TopExercisesCard container style
function MetricCell({ label, value, unit }) {
  return (
    <div
      style={{
        background: "rgba(13,10,26,0.4)",
        border: "1px solid rgba(0,255,255,0.15)",
        borderRadius: "8px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 16px rgba(0,255,255,0.06)",
        padding: "24px 28px 36px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
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
          textAlign: "center",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Gradient progress bar — value and /10 are the same font size (22px)
function GradientBar({ label, value }) {
  if (!value || value <= 0) return null;
  const pct = Math.min((value / 10) * 100, 100);
  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
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
            display: "inline-flex",
            alignItems: "center",
            gap: "1px",
          }}
        >
          <span
            style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "22px",
              lineHeight: 1,
              color: COLORS.textPrimary,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "22px",
              lineHeight: 1,
              color: COLORS.textMuted,
            }}
          >
            /10
          </span>
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
  const coachName = coachData?.name?.split(/\s+/)[0] || null;

  const summaryRaw = workout?.summary || workoutData?.summary || "";
  const summary = summaryRaw.replace(/\*\*/g, "").replace(/\*/g, "");

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

      {/* Top glow overlay — no borderBottom (was causing the cyan line) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "300px",
          background: `linear-gradient(180deg, ${COLORS.cyan}0c 0%, transparent 100%)`,
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

      {/* Content area — normal block flow, no overflow clipping */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "80px 80px 56px",
          boxSizing: "border-box",
        }}
      >
        {/* ── Header: NeonPanda logo ── */}
        <div style={{ marginBottom: "12px" }}>
          <img
            src="/images/logo-dark-sm.webp"
            alt="NeonPanda"
            style={{ height: "64px", width: "auto" }}
          />
        </div>

        {/* ── Workout name ── */}
        <div
          style={{
            fontFamily: "'Barlow', 'Inter', sans-serif",
            fontWeight: 700,
            fontSize: "64px",
            lineHeight: 1.3,
            color: COLORS.textPrimary,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
            marginBottom: "12px",
          }}
        >
          {workoutName}
        </div>

        {/* ── Date — directly under workout name ── */}
        {completedAt && (
          <div style={{ marginBottom: "44px" }}>
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
          </div>
        )}

        {/* ── Metrics grid (2×2 flat tiles) ── */}
        {metrics.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "28px",
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

        {/* ── Discipline + Coach labels — below the metrics grid ── */}
        {(discipline || coachName) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "32px",
              flexWrap: "wrap",
            }}
          >
            {discipline && (
              <>
                <span style={LABEL_VALUE_STYLE.label}>Discipline:</span>
                <span style={{ ...LABEL_VALUE_STYLE.value, marginLeft: "8px" }}>
                  {discipline
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </>
            )}
            {discipline && coachName && (
              <span style={LABEL_VALUE_STYLE.separator}>·</span>
            )}
            {coachName && (
              <>
                <span style={LABEL_VALUE_STYLE.label}>Coach:</span>
                <span style={{ ...LABEL_VALUE_STYLE.value, marginLeft: "8px" }}>
                  {coachName}
                </span>
              </>
            )}
          </div>
        )}

        {/* ── AI Breakdown / Summary ── */}
        {summary && (
          <div
            style={{
              marginBottom: "32px",
              padding: "4px 0 24px 24px",
              borderLeft: `4px solid ${COLORS.cyan}`,
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: "24px",
                lineHeight: 1.5,
                color: COLORS.textSecondary,
                fontStyle: "italic",
              }}
            >
              "{summary}"
            </div>
          </div>
        )}

        {/* ── RPE / Intensity gradient bars ── */}
        {showRpeBars && (
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginBottom: "8px",
            }}
          >
            <div style={{ flex: 1 }}>
              <GradientBar label="RPE" value={rpe} />
            </div>
            <div style={{ flex: 1 }}>
              <GradientBar label="Intensity" value={intensity} />
            </div>
          </div>
        )}

        {/* ── PR callout ── */}
        {prAchievements.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <PrBadge achievements={prAchievements} />
          </div>
        )}

        {/* ── Movements header — outside the container, styled like GradientBar label ── */}
        {displayedExercises.length > 0 && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: "22px",
              color: COLORS.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            Movements
          </div>
        )}

        {/* ── Exercise list — normal block, sizes to content ── */}
        {displayedExercises.length > 0 && (
          <div
            style={{
              background: "rgba(13,10,26,0.30)",
              border: "1px solid rgba(0,255,255,0.20)",
              borderRadius: "8px",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.5), 0 0 16px rgba(0,255,255,0.06)",
              padding: "16px 44px 28px",
            }}
          >
            <div>
              {displayedExercises.map((ex, i) =>
                ex.isRoundHeader ? (
                  <div
                    key={i}
                    style={{
                      paddingTop: i === 0 ? "0px" : "16px",
                      paddingBottom: "8px",
                      fontFamily: "'Barlow', 'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: "26px",
                      color: COLORS.cyan,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {ex.name}
                  </div>
                ) : (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "20px",
                      paddingTop: "12px",
                      paddingBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Barlow', 'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "26px",
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
                          fontSize: "26px",
                          color: COLORS.textSecondary,
                          fontWeight: 400,
                        }}
                      >
                        {ex.detail}
                      </span>
                    )}
                  </div>
                ),
              )}

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
      </div>
    </div>
  );
});

export default WorkoutShareCard;
