/**
 * shareCardMetrics.js
 *
 * Derives the best 4 hero metrics to display on the Instagram share card
 * based on the workout's discipline and available data.
 *
 * Returns: Array<{ label: string, value: string, unit: string }>
 */

/**
 * Format duration from seconds to a human-readable string.
 */
function formatDuration(seconds) {
  if (!seconds) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return { value: String(totalMinutes), unit: "min" };
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return { value: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`, unit: "" };
}

/**
 * Find the top weight lifted across all exercises for strength disciplines.
 */
function extractTopWeight(exercises, setKey = "sets") {
  let topWeight = 0;
  let unit = "lbs";
  for (const exercise of exercises || []) {
    for (const set of exercise[setKey] || []) {
      const w = set.weight || set.weight?.value;
      if (w && w > topWeight) {
        topWeight = w;
        unit = set.weight_unit || set.weight?.unit || "lbs";
      }
    }
  }
  return topWeight > 0 ? { value: String(topWeight), unit } : null;
}

/**
 * Sum total volume (weight × reps) across all sets for strength disciplines.
 */
function extractTotalVolume(exercises, setKey = "sets") {
  let total = 0;
  let unit = "lbs";
  for (const exercise of exercises || []) {
    for (const set of exercise[setKey] || []) {
      const w = set.weight || set.weight?.value;
      const r = set.reps || set.reps?.completed;
      if (w && r) {
        total += w * r;
        unit = set.weight_unit || set.weight?.unit || "lbs";
      }
    }
  }
  return total > 0
    ? { value: String(Math.round(total).toLocaleString()), unit }
    : null;
}

/**
 * Returns an array of up to 4 metric objects for the share card.
 * Each object: { label: string, value: string, unit: string }
 */
export function buildShareCardMetrics(workoutData) {
  if (!workoutData) return [];

  const metrics = [];
  const perf = workoutData.performance_metrics || {};
  const ds = workoutData.discipline_specific || {};
  const discipline = (workoutData.discipline || "").toLowerCase();

  // --- Duration (universal) ---
  const duration = formatDuration(
    workoutData.duration || workoutData.session_duration,
  );
  if (duration) {
    metrics.push({ label: "Duration", ...duration });
  }

  // --- Discipline-specific metrics ---
  if (discipline === "crossfit" || discipline === "functional_fitness") {
    const cf = ds.crossfit || {};
    const pd = cf.performance_data || {};
    if (pd.rounds_completed) {
      metrics.push({
        label: "Rounds",
        value: String(pd.rounds_completed),
        unit: "",
      });
    }
    if (pd.total_reps) {
      metrics.push({
        label: "Total Reps",
        value: String(pd.total_reps),
        unit: "",
      });
    }
    if (pd.total_time) {
      const mins = Math.floor(pd.total_time / 60);
      const secs = pd.total_time % 60;
      metrics.push({
        label: "Time",
        value:
          secs > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${mins}`,
        unit: "min",
      });
    }
    if (cf.rx_status) {
      metrics.push({
        label: "Status",
        value: cf.rx_status.toUpperCase(),
        unit: "",
      });
    }
  } else if (discipline === "running") {
    const run = ds.running || {};
    if (run.total_distance) {
      metrics.push({
        label: "Distance",
        value: String(run.total_distance),
        unit: run.distance_unit || "mi",
      });
    }
    if (run.average_pace) {
      metrics.push({ label: "Avg Pace", value: run.average_pace, unit: "/mi" });
    }
    if (run.elevation_gain) {
      metrics.push({
        label: "Elevation",
        value: String(run.elevation_gain),
        unit: "ft",
      });
    }
  } else if (discipline === "bodybuilding") {
    const bb = ds.bodybuilding || {};
    const topWeight = extractTopWeight(bb.exercises);
    if (topWeight) metrics.push({ label: "Top Weight", ...topWeight });
    const volume = extractTotalVolume(bb.exercises);
    if (volume) metrics.push({ label: "Volume", ...volume });
    if ((bb.exercises || []).length) {
      metrics.push({
        label: "Exercises",
        value: String(bb.exercises.length),
        unit: "",
      });
    }
  } else if (discipline === "powerlifting") {
    const pl = ds.powerlifting || {};
    const exercises =
      pl.exercises ||
      pl.lifts ||
      Object.values(pl).filter(Array.isArray)[0] ||
      [];
    const topWeight = extractTopWeight(exercises);
    if (topWeight) metrics.push({ label: "Top Lift", ...topWeight });
    const volume = extractTotalVolume(exercises);
    if (volume) metrics.push({ label: "Volume", ...volume });
  } else if (discipline === "olympic_weightlifting") {
    const oly = ds.olympic_weightlifting || {};
    const topWeight = extractTopWeight(oly.lifts || [], "sets");
    if (topWeight) metrics.push({ label: "Top Lift", ...topWeight });
  } else if (discipline === "hyrox") {
    const hyrox = ds.hyrox || {};
    if (hyrox.total_time) {
      const mins = Math.floor(hyrox.total_time / 60);
      const secs = hyrox.total_time % 60;
      metrics.push({
        label: "Finish Time",
        value: `${mins}:${String(secs).padStart(2, "0")}`,
        unit: "",
      });
    }
    if ((hyrox.stations || []).length) {
      metrics.push({
        label: "Stations",
        value: String(hyrox.stations.length),
        unit: "",
      });
    }
  } else if (discipline === "functional_bodybuilding") {
    const fbb = ds.functional_bodybuilding || {};
    const volume = extractTotalVolume(fbb.exercises);
    if (volume) metrics.push({ label: "Volume", ...volume });
    if ((fbb.exercises || []).length) {
      metrics.push({
        label: "Exercises",
        value: String(fbb.exercises.length),
        unit: "",
      });
    }
  } else if (discipline === "hybrid") {
    const hybrid = ds.hybrid || {};
    if ((hybrid.phases || []).length) {
      metrics.push({
        label: "Phases",
        value: String(hybrid.phases.length),
        unit: "",
      });
    }
  }

  // --- Universal performance metrics (fill remaining slots) ---
  if (metrics.length < 4 && perf.intensity) {
    metrics.push({
      label: "Intensity",
      value: String(perf.intensity),
      unit: "/10",
    });
  }
  if (metrics.length < 4 && perf.perceived_exertion) {
    metrics.push({
      label: "RPE",
      value: String(perf.perceived_exertion),
      unit: "/10",
    });
  }
  if (metrics.length < 4 && perf.calories_burned) {
    metrics.push({
      label: "Calories",
      value: String(perf.calories_burned),
      unit: "kcal",
    });
  }
  if (metrics.length < 4 && perf.heart_rate?.avg) {
    metrics.push({
      label: "Avg HR",
      value: String(perf.heart_rate.avg),
      unit: "bpm",
    });
  }

  return metrics.slice(0, 4);
}

/**
 * Extracts exercise names for the share card exercise list.
 * Returns up to 6 exercise name strings.
 */
export function buildShareCardExercises(workoutData) {
  if (!workoutData) return [];

  const ds = workoutData.discipline_specific || {};
  const discipline = (workoutData.discipline || "").toLowerCase();
  const names = new Set();

  const addName = (name) => {
    if (name && names.size < 6) names.add(name);
  };

  if (discipline === "crossfit" || discipline === "functional_fitness") {
    for (const round of ds.crossfit?.rounds || []) {
      for (const ex of round.exercises || []) {
        addName(ex.exercise_name);
      }
    }
  } else if (discipline === "bodybuilding") {
    for (const ex of ds.bodybuilding?.exercises || []) {
      addName(ex.exercise_name);
    }
  } else if (discipline === "powerlifting") {
    const pl = ds.powerlifting || {};
    const exList =
      pl.exercises || pl.lifts || Object.values(pl).find(Array.isArray) || [];
    for (const ex of exList) {
      addName(ex.exercise_name || ex.lift_name);
    }
  } else if (discipline === "olympic_weightlifting") {
    for (const lift of ds.olympic_weightlifting?.lifts || []) {
      addName(lift.lift_name);
    }
  } else if (discipline === "functional_bodybuilding") {
    for (const ex of ds.functional_bodybuilding?.exercises || []) {
      addName(ex.exercise_name);
    }
  } else if (discipline === "hyrox") {
    for (const station of ds.hyrox?.stations || []) {
      addName(station.station_name);
    }
  } else if (discipline === "hybrid") {
    for (const phase of ds.hybrid?.phases || []) {
      for (const ex of phase.exercises || []) {
        addName(ex.exercise_name);
      }
    }
  } else if (discipline === "calisthenics") {
    for (const ex of ds.calisthenics?.exercises || []) {
      addName(ex.exercise_name);
    }
  } else if (discipline === "circuit_training") {
    for (const circuit of ds.circuit_training?.circuits || []) {
      for (const ex of circuit.exercises || []) {
        addName(ex.exercise_name);
      }
    }
  }

  return Array.from(names);
}
