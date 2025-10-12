import { SophisticationLevel } from "./types";
import { Question } from "./types";

// Extract gender preference from user response (Question 0)
export const extractGenderPreference = (
  responses: Record<string, string>
): 'male' | 'female' | 'neutral' => {
  const genderResponse = (responses['0'] || '').toLowerCase().trim();

  // Male preference indicators
  const maleIndicators = [
    'male',
    'man',
    'guy',
    'dude',
    'bro',
    'masculine',
    'he',
    'him',
    'his',
    'gentleman',
    'gentlemen',
    'sir',
    'boy',
  ];

  // Female preference indicators
  const femaleIndicators = [
    'female',
    'woman',
    'lady',
    'girl',
    'gal',
    'chick',
    'feminine',
    'she',
    'her',
    'miss',
    "ma'am",
    'maam',
    'sis',
    'sister',
  ];

  // Neutral/no preference indicators
  const neutralIndicators = [
    'no preference',
    'neutral',
    "doesn't matter",
    "does not matter",
    "don't care",
    "do not care",
    "dont care",
    'either',
    'either way',
    'whatever',
    'any',
    'both',
    "it doesn't matter",
    "doesn't bother me",
    "no pref",
    'non-binary',
    'nonbinary',
    'non binary',
    'they',
    'them',
    'their',
    'agender',
  ];

  // Check for neutral indicators first (most explicit)
  if (neutralIndicators.some(indicator => genderResponse.includes(indicator))) {
    return 'neutral';
  }

  // Check for female indicators
  // Must check before male to catch "female" before "male" substring match
  const hasFemaleIndicator = femaleIndicators.some(indicator =>
    genderResponse.includes(indicator)
  );

  // Check for male indicators
  // Make sure it's not "female" being detected as "male"
  const hasMaleIndicator = maleIndicators.some(indicator =>
    genderResponse.includes(indicator)
  ) && !genderResponse.includes('female'); // Exclude "female" containing "male"

  // Return based on what was detected
  if (hasFemaleIndicator && !hasMaleIndicator) {
    return 'female';
  }

  if (hasMaleIndicator && !hasFemaleIndicator) {
    return 'male';
  }

  // If both detected or neither detected, default to neutral
  return 'neutral';
};

// Extract methodology preferences from user responses
// Note: Explicit methodology question was removed in streamlined version
// Now inferring from goals, movement focus, and competition goals
export const extractMethodologyPreferences = (
  responses: Record<string, string>
) => {
  const methodologyPrefs = {
    primary: "" as string,
    focus: [] as string[],
    experience: [] as string[],
    preferences: [] as string[],
  };

  // Infer from goals_and_timeline (question 1)
  const goalsResponse = responses["1"] || "";
  const goalsLower = goalsResponse.toLowerCase();

  // Check for methodology mentions in goals
  if (goalsLower.includes("comptrain")) {
    methodologyPrefs.primary = "comptrain_strength";
    methodologyPrefs.experience.push("comptrain");
  }
  if (goalsLower.includes("mayhem")) {
    methodologyPrefs.primary = "mayhem_conditioning";
    methodologyPrefs.experience.push("mayhem");
  }
  if (goalsLower.includes("hwpo")) {
    methodologyPrefs.primary = "hwpo_training";
    methodologyPrefs.experience.push("hwpo");
  }
  if (goalsLower.includes("invictus")) {
    methodologyPrefs.primary = "invictus_fitness";
    methodologyPrefs.experience.push("invictus");
  }
  if (goalsLower.includes("misfit")) {
    methodologyPrefs.primary = "misfit_athletics";
    methodologyPrefs.experience.push("misfit");
  }

  // Infer focus from movement_focus_and_love (question 7)
  const movementResponse = responses["7"] || "";
  const movementLower = movementResponse.toLowerCase();

  if (
    movementLower.includes("olympic") ||
    movementLower.includes("snatch") ||
    movementLower.includes("clean")
  ) {
    methodologyPrefs.focus.push("olympic_lifting");
  }
  if (
    movementLower.includes("gymnastics") ||
    movementLower.includes("muscle-up") ||
    movementLower.includes("handstand")
  ) {
    methodologyPrefs.focus.push("gymnastics");
  }
  if (movementLower.includes("strength") || movementLower.includes("heavy")) {
    methodologyPrefs.focus.push("strength");
  }
  if (
    movementLower.includes("conditioning") ||
    movementLower.includes("cardio") ||
    movementLower.includes("engine")
  ) {
    methodologyPrefs.focus.push("conditioning");
  }

  // Infer from competition goals (question 10)
  const competitionResponse = responses["10"] || "";
  if (competitionResponse.toLowerCase().includes("compete")) {
    methodologyPrefs.focus.push("competition_prep");
  }

  return methodologyPrefs;
};

// Extract training frequency from responses
// Updated to question 4: training_frequency_and_time
export const extractTrainingFrequency = (
  responses: Record<string, string>
): number => {
  const frequencyResponse = responses["4"] || "";
  const freqLower = frequencyResponse.toLowerCase();

  // Look for numbers or words indicating frequency
  if (freqLower.includes("2") || freqLower.includes("two")) return 2;
  if (freqLower.includes("3") || freqLower.includes("three")) return 3;
  if (freqLower.includes("4") || freqLower.includes("four")) return 4;
  if (freqLower.includes("5") || freqLower.includes("five")) return 5;
  if (freqLower.includes("6") || freqLower.includes("six")) return 6;
  if (
    freqLower.includes("7") ||
    freqLower.includes("seven") ||
    freqLower.includes("daily")
  )
    return 7;

  return 4; // Default to 4 days per week
};

// Extract specializations from responses
// Updated question IDs: 1 (goals), 7 (movement focus), 10 (competition)
export const extractSpecializations = (
  responses: Record<string, string>
): string[] => {
  const specializations = [];

  const goalsResponse = responses["1"] || "";
  const goalsLower = goalsResponse.toLowerCase();

  const movementResponse = responses["7"] || "";
  const movementLower = movementResponse.toLowerCase();

  const competitionResponse = responses["10"] || "";
  const compLower = competitionResponse.toLowerCase();

  // Olympic lifting
  if (
    goalsLower.includes("olympic") ||
    movementLower.includes("olympic") ||
    movementLower.includes("snatch") ||
    movementLower.includes("clean and jerk")
  ) {
    specializations.push("olympic_lifting");
  }

  // Powerlifting
  if (
    goalsLower.includes("powerlifting") ||
    movementLower.includes("powerlifting") ||
    (movementLower.includes("squat") &&
      movementLower.includes("deadlift") &&
      movementLower.includes("bench"))
  ) {
    specializations.push("powerlifting");
  }

  // Gymnastics
  if (
    goalsLower.includes("gymnastics") ||
    movementLower.includes("gymnastics") ||
    movementLower.includes("muscle-up") ||
    movementLower.includes("handstand")
  ) {
    specializations.push("gymnastics");
  }

  // Endurance
  if (
    goalsLower.includes("endurance") ||
    movementLower.includes("endurance") ||
    movementLower.includes("running") ||
    movementLower.includes("cardio")
  ) {
    specializations.push("endurance");
  }

  // Masters competition
  if (compLower.includes("masters")) {
    specializations.push("masters_competition");
  }

  return specializations;
};

// Extract goal timeline from responses
// Updated question IDs: 1 (goals_and_timeline), 10 (competition_goals)
export const extractGoalTimeline = (
  responses: Record<string, string>
): string => {
  const goalsResponse = responses["1"] || "";
  const goalsLower = goalsResponse.toLowerCase();

  const competitionResponse = responses["10"] || "";
  const compLower = competitionResponse.toLowerCase();

  // Look for timeline indicators
  if (goalsLower.includes("3 month") || compLower.includes("3 month")) {
    return "3_months";
  }
  if (goalsLower.includes("6 month") || compLower.includes("6 month")) {
    return "6_months";
  }
  if (
    goalsLower.includes("year") ||
    goalsLower.includes("12 month") ||
    compLower.includes("year") ||
    compLower.includes("12 month")
  ) {
    return "1_year";
  }

  // Short-term indicators
  if (
    goalsLower.includes("soon") ||
    goalsLower.includes("quickly") ||
    goalsLower.includes("asap")
  ) {
    return "3_months";
  }

  // Long-term indicators
  if (
    goalsLower.includes("eventually") ||
    goalsLower.includes("long term") ||
    goalsLower.includes("long-term")
  ) {
    return "1_year";
  }

  return "6_months"; // Default timeline
};

// Extract intensity preference from responses
// Updated question IDs: 7 (movement_focus_and_love), 8 (coaching_style_and_motivation)
// Note: lifestyle_factors question was removed, so can't check stress levels
export const extractIntensityPreference = (
  responses: Record<string, string>
): string => {
  const movementResponse = responses["7"] || "";
  const movementLower = movementResponse.toLowerCase();

  const coachingResponse = responses["8"] || "";
  const coachingLower = coachingResponse.toLowerCase();

  // High intensity indicators
  if (
    coachingLower.includes("push") ||
    coachingLower.includes("challenging") ||
    coachingLower.includes("hard") ||
    movementLower.includes("intense") ||
    movementLower.includes("high intensity")
  ) {
    return "high";
  }

  // Low intensity indicators
  if (
    coachingLower.includes("patient") ||
    coachingLower.includes("gentle") ||
    coachingLower.includes("easy") ||
    movementLower.includes("moderate")
  ) {
    return "low";
  }

  return "moderate"; // Default to moderate intensity
};

// Enhanced safety profile extraction
// Updated to new question structure
export const extractSafetyProfile = (responses: Record<string, string>) => {
  const safetyProfile = {
    experienceLevel: "BEGINNER" as SophisticationLevel,
    age: null as number | null,
    ageGroup: "" as string,
    injuries: [] as string[],
    contraindications: [] as string[],
    modifications: [] as string[],
    equipment: [] as string[],
    recoveryNeeds: [] as string[],
    riskFactors: [] as string[],
    timeConstraints: {} as Record<string, any>,
    environmentalFactors: [] as string[],
    movementPreferences: [] as string[],
    movementAvoidances: [] as string[],
  };

  // Extract age from age_and_life_stage (question 2)
  const ageResponse = responses["2"] || "";
  const ageMatch = ageResponse.match(/\d+/);
  if (ageMatch) {
    safetyProfile.age = parseInt(ageMatch[0]);

    // Set age group
    if (safetyProfile.age < 30) {
      safetyProfile.ageGroup = "under_30";
    } else if (safetyProfile.age < 40) {
      safetyProfile.ageGroup = "30_39";
    } else if (safetyProfile.age < 50) {
      safetyProfile.ageGroup = "40_49";
      safetyProfile.recoveryNeeds.push("masters_recovery");
      safetyProfile.riskFactors.push("age_related_recovery");
    } else if (safetyProfile.age < 60) {
      safetyProfile.ageGroup = "50_59";
      safetyProfile.recoveryNeeds.push(
        "masters_recovery",
        "joint_health_priority"
      );
      safetyProfile.riskFactors.push(
        "age_related_recovery",
        "hormonal_changes"
      );
    } else {
      safetyProfile.ageGroup = "60_plus";
      safetyProfile.recoveryNeeds.push(
        "masters_recovery",
        "joint_health_priority",
        "longevity_focus"
      );
      safetyProfile.riskFactors.push(
        "age_related_recovery",
        "increased_injury_risk"
      );
    }
  }

  // Extract experience level from experience_level (question 3)
  const experienceResponse = responses["3"] || "";
  const expLower = experienceResponse.toLowerCase();

  if (
    expLower.includes("advanced") ||
    expLower.includes("years") ||
    expLower.includes("competed")
  ) {
    safetyProfile.experienceLevel = "ADVANCED";
  } else if (
    expLower.includes("intermediate") ||
    expLower.includes("year") ||
    expLower.includes("pretty consistent") ||
    expLower.includes("familiar")
  ) {
    safetyProfile.experienceLevel = "INTERMEDIATE";
  } else {
    safetyProfile.experienceLevel = "BEGINNER";
    safetyProfile.riskFactors.push("novice_athlete");
  }

  // Enhanced injury analysis from injuries_and_limitations (question 5)
  const injuryResponse = responses["5"] || "";
  const injuryLower = injuryResponse.toLowerCase();

  // Knee injuries
  if (injuryLower.includes("knee")) {
    safetyProfile.injuries.push("knee_issues");
    safetyProfile.contraindications.push(
      "box_jumps",
      "high_impact_plyometrics",
      "deep_pistol_squats"
    );
    safetyProfile.modifications.push(
      "step_ups_instead_of_jumps",
      "controlled_squatting",
      "knee_friendly_lunges"
    );
    safetyProfile.riskFactors.push("knee_injury_history");
  }

  // Shoulder injuries
  if (injuryLower.includes("shoulder")) {
    safetyProfile.injuries.push("shoulder_issues");
    safetyProfile.contraindications.push(
      "overhead_pressing",
      "heavy_pulling",
      "kipping_movements"
    );
    safetyProfile.modifications.push(
      "limited_overhead_range",
      "band_assistance",
      "strict_movements_only"
    );
    safetyProfile.riskFactors.push("shoulder_injury_history");
  }

  // Back injuries
  if (
    injuryLower.includes("back") ||
    injuryLower.includes("spine") ||
    injuryLower.includes("lower back")
  ) {
    safetyProfile.injuries.push("back_issues");
    safetyProfile.contraindications.push(
      "heavy_deadlifts",
      "loaded_flexion",
      "overhead_squats"
    );
    safetyProfile.modifications.push(
      "elevated_deadlifts",
      "neutral_spine_emphasis",
      "core_stability_focus"
    );
    safetyProfile.riskFactors.push("back_injury_history");
  }

  // Wrist/elbow injuries
  if (injuryLower.includes("wrist") || injuryLower.includes("elbow")) {
    safetyProfile.injuries.push("upper_extremity_issues");
    safetyProfile.contraindications.push(
      "heavy_pressing",
      "gymnastics_skills",
      "barbell_cycling"
    );
    safetyProfile.modifications.push(
      "dumbbell_alternatives",
      "neutral_grip_options",
      "reduced_gripping_time"
    );
    safetyProfile.riskFactors.push("upper_extremity_injury_history");
  }

  // Hip injuries
  if (injuryLower.includes("hip")) {
    safetyProfile.injuries.push("hip_issues");
    safetyProfile.contraindications.push("deep_squats", "pistol_squats");
    safetyProfile.modifications.push("box_squats", "limited_range_work");
    safetyProfile.riskFactors.push("hip_injury_history");
  }

  // Ankle injuries
  if (injuryLower.includes("ankle")) {
    safetyProfile.injuries.push("ankle_issues");
    safetyProfile.contraindications.push(
      "box_jumps",
      "running",
      "double_unders"
    );
    safetyProfile.modifications.push(
      "low_impact_alternatives",
      "ankle_stability_work"
    );
    safetyProfile.riskFactors.push("ankle_injury_history");
  }

  // Equipment analysis from equipment_and_environment (question 6)
  const equipmentResponse = responses["6"] || "";
  const equipmentLower = equipmentResponse.toLowerCase();

  if (equipmentLower.includes("barbell"))
    safetyProfile.equipment.push("barbell");
  if (equipmentLower.includes("dumbbell"))
    safetyProfile.equipment.push("dumbbells");
  if (equipmentLower.includes("kettlebell"))
    safetyProfile.equipment.push("kettlebells");
  if (equipmentLower.includes("pull"))
    safetyProfile.equipment.push("pull_up_bar");
  if (equipmentLower.includes("rings")) safetyProfile.equipment.push("rings");
  if (equipmentLower.includes("rower")) safetyProfile.equipment.push("rower");
  if (equipmentLower.includes("bike") || equipmentLower.includes("assault"))
    safetyProfile.equipment.push("assault_bike");
  if (equipmentLower.includes("ski erg"))
    safetyProfile.equipment.push("ski_erg");

  // Environment factors
  if (equipmentLower.includes("home") || equipmentLower.includes("garage")) {
    safetyProfile.equipment.push("home_gym");
    safetyProfile.environmentalFactors.push("unsupervised_training");
    safetyProfile.riskFactors.push(
      "limited_equipment",
      "no_coaching_supervision"
    );
  }
  if (
    equipmentLower.includes("crossfit") ||
    equipmentLower.includes("affiliate") ||
    equipmentLower.includes("box")
  ) {
    safetyProfile.environmentalFactors.push("coached_environment");
  }
  if (
    equipmentLower.includes("limited") ||
    equipmentLower.includes("basic") ||
    equipmentLower.includes("minimal")
  ) {
    safetyProfile.riskFactors.push("limited_equipment");
  }

  // Time constraints from training_frequency_and_time (question 4)
  const timeResponse = responses["4"] || "";
  const timeLower = timeResponse.toLowerCase();

  if (timeLower.includes("30")) {
    safetyProfile.timeConstraints = {
      session_length: 30,
      intensity_focus: "high",
      warmup_time: "limited",
    };
    safetyProfile.riskFactors.push("insufficient_warmup_time");
  } else if (timeLower.includes("45")) {
    safetyProfile.timeConstraints = {
      session_length: 45,
      intensity_focus: "moderate",
      warmup_time: "adequate",
    };
  } else if (timeLower.includes("60") || timeLower.includes("hour")) {
    safetyProfile.timeConstraints = {
      session_length: 60,
      intensity_focus: "moderate",
      warmup_time: "adequate",
    };
  } else if (timeLower.includes("90")) {
    safetyProfile.timeConstraints = {
      session_length: 90,
      intensity_focus: "moderate",
      warmup_time: "extended",
    };
  }

  // Movement preferences and avoidances from movement_focus_and_love (question 7)
  const movementResponse = responses["7"] || "";
  const movementLower = movementResponse.toLowerCase();

  // Things they love/want to focus on
  if (
    movementLower.includes("olympic") ||
    movementLower.includes("snatch") ||
    movementLower.includes("clean")
  ) {
    safetyProfile.movementPreferences.push("olympic_lifting");
  }
  if (
    movementLower.includes("gymnastics") ||
    movementLower.includes("muscle-up") ||
    movementLower.includes("handstand")
  ) {
    safetyProfile.movementPreferences.push("gymnastics");
  }
  if (movementLower.includes("lifting") || movementLower.includes("strength")) {
    safetyProfile.movementPreferences.push("strength_training");
  }
  if (
    movementLower.includes("running") &&
    !movementLower.includes("hate running")
  ) {
    safetyProfile.movementPreferences.push("running");
  }

  // Things they want to avoid/minimize
  if (
    movementLower.includes("hate running") ||
    movementLower.includes("avoid running") ||
    movementLower.includes("skip running") ||
    movementLower.includes("no running")
  ) {
    safetyProfile.movementAvoidances.push("running");
  }
  if (
    movementLower.includes("hate cardio") ||
    movementLower.includes("avoid cardio")
  ) {
    safetyProfile.movementAvoidances.push("cardio");
  }
  if (
    movementLower.includes("overhead") &&
    (movementLower.includes("avoid") || movementLower.includes("difficult"))
  ) {
    safetyProfile.movementAvoidances.push("overhead_movements");
  }

  return safetyProfile;
};

// Extract sophistication signals from user response against a specific question
export const extractSophisticationSignals = (
  userResponse: string,
  question: Question
): string[] => {
  const detectedSignals: string[] = [];

  if (question.sophisticationSignals) {
    const userResponseLower = userResponse.toLowerCase();

    // Check signals for all sophistication levels
    Object.entries(question.sophisticationSignals).forEach(
      ([level, signals]) => {
        signals.forEach((signal: string) => {
          if (userResponseLower.includes(signal.toLowerCase())) {
            detectedSignals.push(signal);
          }
        });
      }
    );
  }

  return detectedSignals;
};
