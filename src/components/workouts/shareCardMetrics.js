/**
 * shareCardMetrics.js
 *
 * Derives hero metrics and structured exercise data for the Instagram share card.
 *
 * Exports:
 *   buildShareCardMetrics(workoutData) → Array<{ label, value, unit }>
 *   buildShareCardExercises(workoutData) → Array<{ name, detail }>
 *   buildShareCardRpeIntensity(workoutData) → { rpe, intensity } (0-10)
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  if (!seconds) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return { value: String(totalMinutes), unit: "min" };
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return { value: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`, unit: "" };
}

/**
 * Safely extract a numeric weight value from either a plain number or an
 * object like { value: 205, unit: "lbs" }.
 */
export function resolveWeight(raw) {
  if (raw == null) return { w: 0, unit: "lbs" };
  if (typeof raw === "number") return { w: raw, unit: "lbs" };
  if (typeof raw === "object")
    return { w: raw.value ?? 0, unit: raw.unit || "lbs" };
  return { w: 0, unit: "lbs" };
}

/**
 * Safely extract a numeric reps value from either a plain number or an
 * object like { prescribed: 10, completed: 8 }.
 */
export function resolveReps(raw) {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object") return raw.completed ?? raw.prescribed ?? 0;
  return 0;
}

function extractTopWeight(exercises, setKey = "sets") {
  let topWeight = 0;
  let unit = "lbs";
  let topExerciseName = null;
  for (const exercise of exercises || []) {
    for (const set of exercise[setKey] || []) {
      const { w, unit: u } = resolveWeight(set.weight);
      if (w > topWeight) {
        topWeight = w;
        unit = set.weight_unit || u;
        topExerciseName = exercise.exercise_name || exercise.lift_name || null;
      }
    }
  }
  return topWeight > 0
    ? { value: String(topWeight), unit, exerciseName: topExerciseName }
    : null;
}

function extractTotalVolume(exercises, setKey = "sets") {
  let total = 0;
  let unit = "lbs";
  for (const exercise of exercises || []) {
    for (const set of exercise[setKey] || []) {
      const { w, unit: u } = resolveWeight(set.weight);
      const r = resolveReps(set.reps);
      if (w && r) {
        total += w * r;
        unit = set.weight_unit || u;
      }
    }
  }
  return total > 0
    ? { value: String(Math.round(total).toLocaleString()), unit }
    : null;
}

/**
 * Build a compact detail string for a strength exercise from its sets array.
 * Examples: "4x8 @ 205 lbs", "3x5 @ 315 lbs", "3x10"
 */
function buildStrengthDetail(sets = [], setKey = null) {
  const actualSets = setKey ? sets : sets;
  if (!actualSets || actualSets.length === 0) return "";

  const setCount = actualSets.length;

  // Collect reps and weights
  const repsArr = actualSets.map((s) => resolveReps(s.reps)).filter(Boolean);
  const weightArr = actualSets
    .map((s) => {
      const { w } = resolveWeight(s.weight);
      return w;
    })
    .filter(Boolean);

  if (repsArr.length === 0) return `${setCount} sets`;

  const allRepsSame = repsArr.every((r) => r === repsArr[0]);
  const repsStr = allRepsSame
    ? String(repsArr[0])
    : `${Math.min(...repsArr)}-${Math.max(...repsArr)}`;

  if (weightArr.length === 0) return `${setCount}x${repsStr}`;

  const { unit } = resolveWeight(actualSets.find((s) => s.weight)?.weight);
  const allWeightsSame = weightArr.every((w) => w === weightArr[0]);
  const weightStr = allWeightsSame
    ? String(weightArr[0])
    : `${Math.min(...weightArr)}-${Math.max(...weightArr)}`;

  return `${setCount}x${repsStr} @ ${weightStr} ${unit}`.trim();
}

/**
 * Count total sets across all exercises for the given discipline.
 * Used as a more informative fallback metric than RPE/Intensity (which
 * are already rendered as gradient bars on the share card).
 */
function extractTotalSets(workoutData) {
  if (!workoutData) return null;
  const ds = workoutData.discipline_specific || {};
  const discipline = (workoutData.discipline || "").toLowerCase();
  let sets = 0;

  const countSets = (exercises) => {
    for (const ex of exercises || []) {
      sets += (ex.sets || []).length;
    }
  };

  if (discipline === "bodybuilding") {
    countSets(ds.bodybuilding?.exercises);
  } else if (discipline === "powerlifting") {
    const pl = ds.powerlifting || {};
    const exList =
      pl.exercises || pl.lifts || Object.values(pl).find(Array.isArray) || [];
    countSets(exList);
  } else if (discipline === "olympic_weightlifting") {
    countSets(ds.olympic_weightlifting?.lifts || []);
  } else if (discipline === "functional_bodybuilding") {
    countSets(ds.functional_bodybuilding?.exercises);
  } else if (discipline === "hybrid") {
    for (const phase of ds.hybrid?.phases || []) countSets(phase.exercises);
  } else if (discipline === "calisthenics") {
    countSets(ds.calisthenics?.exercises);
  } else if (discipline === "circuit_training") {
    for (const circuit of ds.circuit_training?.circuits || [])
      countSets(circuit.exercises);
  }

  return sets > 0 ? { value: String(sets), unit: "" } : null;
}

function capitalizeWords(str) {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns up to 4 hero metric objects for the share card.
 */
export function buildShareCardMetrics(workoutData) {
  if (!workoutData) return [];

  const metrics = [];
  const perf = workoutData.performance_metrics || {};
  const ds = workoutData.discipline_specific || {};
  const discipline = (workoutData.discipline || "").toLowerCase();

  // Duration (universal)
  const duration = formatDuration(
    workoutData.duration || workoutData.session_duration,
  );
  if (duration) metrics.push({ label: "Duration", ...duration });

  // Discipline-specific
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
    if (topWeight)
      metrics.push({
        label: topWeight.exerciseName || "Top Weight",
        value: topWeight.value,
        unit: topWeight.unit,
      });
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
    if (topWeight)
      metrics.push({
        label: topWeight.exerciseName || "Top Lift",
        value: topWeight.value,
        unit: topWeight.unit,
      });
    const volume = extractTotalVolume(exercises);
    if (volume) metrics.push({ label: "Volume", ...volume });
  } else if (discipline === "olympic_weightlifting") {
    const oly = ds.olympic_weightlifting || {};
    const topWeight = extractTopWeight(oly.lifts || [], "sets");
    if (topWeight)
      metrics.push({
        label: topWeight.exerciseName || "Top Lift",
        value: topWeight.value,
        unit: topWeight.unit,
      });
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

  // Universal fallbacks — RPE and Intensity are excluded here because they
  // are already rendered as gradient bars below the metrics grid.
  if (metrics.length < 4) {
    const totalSets = extractTotalSets(workoutData);
    if (totalSets) metrics.push({ label: "Sets", ...totalSets });
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
 * Returns RPE and intensity values (0-10) for progress bar rendering.
 */
export function buildShareCardRpeIntensity(workoutData) {
  const perf = workoutData?.performance_metrics || {};
  return {
    rpe: perf.perceived_exertion || 0,
    intensity: perf.intensity || 0,
  };
}

/**
 * Returns up to 6 structured exercise objects for the share card.
 * Each: { name: string, detail: string }
 * The detail is a compact "4x8 @ 205 lbs" or "3.5 mi @ 8:30/mi" string.
 */
export function buildShareCardExercises(workoutData) {
  if (!workoutData) return [];

  const ds = workoutData.discipline_specific || {};
  const discipline = (workoutData.discipline || "").toLowerCase();
  const results = [];
  const seen = new Set();

  const add = (name, detail = "") => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    results.push({ name: capitalizeWords(name), detail });
  };

  if (discipline === "crossfit" || discipline === "functional_fitness") {
    for (const round of ds.crossfit?.rounds || []) {
      for (const ex of round.exercises || []) {
        if (!ex.exercise_name) continue;
        const reps = resolveReps(ex.reps);
        const { w, unit } = resolveWeight(ex.weight);
        let detail = "";
        if (reps && w) detail = `${reps} reps @ ${w} ${unit}`;
        else if (reps) detail = `${reps} reps`;
        else if (ex.distance) detail = `${ex.distance}m`;
        else if (ex.calories) detail = `${ex.calories} cal`;
        add(ex.exercise_name, detail);
      }
    }
  } else if (discipline === "bodybuilding") {
    for (const ex of ds.bodybuilding?.exercises || []) {
      add(ex.exercise_name, buildStrengthDetail(ex.sets));
    }
  } else if (discipline === "powerlifting") {
    const pl = ds.powerlifting || {};
    const exList =
      pl.exercises || pl.lifts || Object.values(pl).find(Array.isArray) || [];
    for (const ex of exList) {
      add(ex.exercise_name || ex.lift_name, buildStrengthDetail(ex.sets));
    }
  } else if (discipline === "olympic_weightlifting") {
    for (const lift of ds.olympic_weightlifting?.lifts || []) {
      add(lift.lift_name, buildStrengthDetail(lift.sets));
    }
  } else if (discipline === "functional_bodybuilding") {
    for (const ex of ds.functional_bodybuilding?.exercises || []) {
      add(ex.exercise_name, buildStrengthDetail(ex.sets));
    }
  } else if (discipline === "hyrox") {
    for (const station of ds.hyrox?.stations || []) {
      let detail = "";
      if (station.reps) detail = `${station.reps} reps`;
      else if (station.distance) detail = `${station.distance}m`;
      if (station.weight) {
        const { w, unit } = resolveWeight(station.weight);
        if (w) detail += ` @ ${w} ${unit}`;
      }
      add(station.station_name, detail);
    }
  } else if (discipline === "hybrid") {
    for (const phase of ds.hybrid?.phases || []) {
      for (const ex of phase.exercises || []) {
        add(ex.exercise_name, buildStrengthDetail(ex.sets));
      }
    }
  } else if (discipline === "calisthenics") {
    for (const ex of ds.calisthenics?.exercises || []) {
      const sets = ex.sets || [];
      const setCount = sets.length;
      const reps = sets[0]?.reps ? resolveReps(sets[0].reps) : 0;
      const detail = reps
        ? `${setCount}x${reps}`
        : setCount > 0
          ? `${setCount} sets`
          : "";
      add(ex.exercise_name, detail);
    }
  } else if (discipline === "circuit_training") {
    for (const circuit of ds.circuit_training?.circuits || []) {
      for (const ex of circuit.exercises || []) {
        add(ex.exercise_name, buildStrengthDetail(ex.sets));
      }
    }
  } else if (discipline === "running") {
    const run = ds.running || {};
    const segments = run.segments || [];
    for (const seg of segments) {
      const name = seg.segment_type
        ? capitalizeWords(seg.segment_type)
        : `Segment ${seg.segment_number}`;
      const detail =
        seg.distance && seg.pace
          ? `${seg.distance} mi @ ${seg.pace}`
          : seg.distance
            ? `${seg.distance} mi`
            : "";
      if (!seen.has(name)) {
        seen.add(name);
        results.push({ name, detail });
      }
    }
  }

  return results;
}
