import { SophisticationLevel } from './types';
import { Question } from './types';

// Extract methodology preferences from user responses
export const extractMethodologyPreferences = (responses: Record<string, string>) => {
  const methodologyPrefs = {
    primary: '' as string,
    focus: [] as string[],
    experience: [] as string[],
    preferences: [] as string[]
  };

  // From methodology_preferences question (16)
  const methodologyResponse = responses['16'] || '';
  if (methodologyResponse.toLowerCase().includes('comptrain')) {
    methodologyPrefs.primary = 'comptrain_strength';
    methodologyPrefs.experience.push('comptrain');
  }
  if (methodologyResponse.toLowerCase().includes('mayhem')) {
    methodologyPrefs.primary = 'mayhem_conditioning';
    methodologyPrefs.experience.push('mayhem');
  }
  if (methodologyResponse.toLowerCase().includes('hwpo')) {
    methodologyPrefs.primary = 'hwpo_training';
    methodologyPrefs.experience.push('hwpo');
  }
  if (methodologyResponse.toLowerCase().includes('invictus')) {
    methodologyPrefs.primary = 'invictus_fitness';
    methodologyPrefs.experience.push('invictus');
  }
  if (methodologyResponse.toLowerCase().includes('misfit')) {
    methodologyPrefs.primary = 'misfit_athletics';
    methodologyPrefs.experience.push('misfit');
  }
  if (methodologyResponse.toLowerCase().includes('functional bodybuilding')) {
    methodologyPrefs.primary = 'functional_bodybuilding';
    methodologyPrefs.experience.push('functional_bodybuilding');
  }
  if (methodologyResponse.toLowerCase().includes('opex')) {
    methodologyPrefs.primary = 'opex_fitness';
    methodologyPrefs.experience.push('opex');
  }
  if (methodologyResponse.toLowerCase().includes('linchpin')) {
    methodologyPrefs.primary = 'crossfit_linchpin';
    methodologyPrefs.experience.push('linchpin');
  }
  if (methodologyResponse.toLowerCase().includes('prvn')) {
    methodologyPrefs.primary = 'prvn_fitness';
    methodologyPrefs.experience.push('prvn');
  }

  // From programming_philosophy question (7)
  const programmingResponse = responses['7'] || '';
  if (programmingResponse.toLowerCase().includes('volume')) {
    methodologyPrefs.focus.push('volume_emphasis');
  }
  if (programmingResponse.toLowerCase().includes('intensity')) {
    methodologyPrefs.focus.push('intensity_emphasis');
  }
  if (programmingResponse.toLowerCase().includes('conjugate')) {
    methodologyPrefs.preferences.push('conjugate_method');
  }

  // From goal_discovery question (1)
  const goalsResponse = responses['1'] || '';
  if (goalsResponse.toLowerCase().includes('strength')) {
    methodologyPrefs.focus.push('strength');
  }
  if (goalsResponse.toLowerCase().includes('conditioning') || goalsResponse.toLowerCase().includes('cardio')) {
    methodologyPrefs.focus.push('conditioning');
  }
  if (goalsResponse.toLowerCase().includes('compete')) {
    methodologyPrefs.focus.push('competition_prep');
  }

  return methodologyPrefs;
};

// Extract training frequency from responses
export const extractTrainingFrequency = (responses: Record<string, string>): number => {
  const frequencyResponse = responses['3'] || '';

  if (frequencyResponse.includes('2') || frequencyResponse.includes('two')) return 2;
  if (frequencyResponse.includes('3') || frequencyResponse.includes('three')) return 3;
  if (frequencyResponse.includes('4') || frequencyResponse.includes('four')) return 4;
  if (frequencyResponse.includes('5') || frequencyResponse.includes('five')) return 5;
  if (frequencyResponse.includes('6') || frequencyResponse.includes('six')) return 6;
  if (frequencyResponse.includes('7') || frequencyResponse.includes('seven') || frequencyResponse.includes('daily')) return 7;

  return 4; // Default to 4 days per week
};

// Extract specializations from responses
export const extractSpecializations = (responses: Record<string, string>): string[] => {
  const specializations = [];

  const goalsResponse = responses['1'] || '';
  const strengthWeaknessResponse = responses['10'] || '';
  const competitionResponse = responses['13'] || '';

  if (goalsResponse.toLowerCase().includes('olympic') || strengthWeaknessResponse.toLowerCase().includes('olympic')) {
    specializations.push('olympic_lifting');
  }
  if (goalsResponse.toLowerCase().includes('powerlifting') || strengthWeaknessResponse.toLowerCase().includes('powerlifting')) {
    specializations.push('powerlifting');
  }
  if (goalsResponse.toLowerCase().includes('gymnastics') || strengthWeaknessResponse.toLowerCase().includes('gymnastics')) {
    specializations.push('gymnastics');
  }
  if (goalsResponse.toLowerCase().includes('endurance') || strengthWeaknessResponse.toLowerCase().includes('endurance')) {
    specializations.push('endurance');
  }
  if (competitionResponse.toLowerCase().includes('masters')) {
    specializations.push('masters_competition');
  }

  return specializations;
};

// Extract goal timeline from responses
export const extractGoalTimeline = (responses: Record<string, string>): string => {
  const goalsResponse = responses['1'] || '';
  const competitionResponse = responses['13'] || '';

  if (goalsResponse.toLowerCase().includes('3 month') || competitionResponse.toLowerCase().includes('3 month')) {
    return '3_months';
  }
  if (goalsResponse.toLowerCase().includes('6 month') || competitionResponse.toLowerCase().includes('6 month')) {
    return '6_months';
  }
  if (goalsResponse.toLowerCase().includes('year') || competitionResponse.toLowerCase().includes('year')) {
    return '1_year';
  }

  return '6_months'; // Default timeline
};

// Extract intensity preference from responses
export const extractIntensityPreference = (responses: Record<string, string>): string => {
  const programmingResponse = responses['7'] || '';
  const motivationResponse = responses['8'] || '';
  const lifestyleResponse = responses['11'] || '';

  if (programmingResponse.toLowerCase().includes('high intensity') || motivationResponse.toLowerCase().includes('push')) {
    return 'high';
  }
  if (lifestyleResponse.toLowerCase().includes('stress') || lifestyleResponse.toLowerCase().includes('busy')) {
    return 'low';
  }

  return 'moderate'; // Default to moderate intensity
};

// Enhanced safety profile extraction
export const extractSafetyProfile = (responses: Record<string, string>) => {
  const safetyProfile = {
    experienceLevel: 'BEGINNER' as SophisticationLevel,
    injuries: [] as string[],
    contraindications: [] as string[],
    modifications: [] as string[],
    equipment: [] as string[],
    recoveryNeeds: [] as string[],
    riskFactors: [] as string[],
    timeConstraints: {} as Record<string, any>,
    environmentalFactors: [] as string[],
    learningConsiderations: [] as string[]
  };

  // From experience_assessment (question 2)
  const experienceResponse = responses['2'] || '';
  if (experienceResponse.toLowerCase().includes('advanced') || experienceResponse.toLowerCase().includes('years')) {
    safetyProfile.experienceLevel = 'ADVANCED';
  } else if (experienceResponse.toLowerCase().includes('intermediate') || experienceResponse.toLowerCase().includes('year')) {
    safetyProfile.experienceLevel = 'INTERMEDIATE';
  }

  // Enhanced injury analysis from injury_limitations (question 4)
  const injuryResponse = responses['4'] || '';

  // Knee injuries
  if (injuryResponse.toLowerCase().includes('knee')) {
    safetyProfile.injuries.push('knee_issues');
    safetyProfile.contraindications.push('box_jumps', 'high_impact_plyometrics', 'deep_pistol_squats');
    safetyProfile.modifications.push('step_ups_instead_of_jumps', 'controlled_squatting', 'knee_friendly_lunges');
  }

  // Shoulder injuries
  if (injuryResponse.toLowerCase().includes('shoulder')) {
    safetyProfile.injuries.push('shoulder_issues');
    safetyProfile.contraindications.push('overhead_pressing', 'heavy_pulling', 'kipping_movements');
    safetyProfile.modifications.push('limited_overhead_range', 'band_assistance', 'strict_movements_only');
  }

  // Back injuries
  if (injuryResponse.toLowerCase().includes('back') || injuryResponse.toLowerCase().includes('spine')) {
    safetyProfile.injuries.push('back_issues');
    safetyProfile.contraindications.push('heavy_deadlifts', 'loaded_flexion', 'overhead_squats');
    safetyProfile.modifications.push('elevated_deadlifts', 'neutral_spine_emphasis', 'core_stability_focus');
  }

  // Wrist/elbow injuries
  if (injuryResponse.toLowerCase().includes('wrist') || injuryResponse.toLowerCase().includes('elbow')) {
    safetyProfile.injuries.push('upper_extremity_issues');
    safetyProfile.contraindications.push('heavy_pressing', 'gymnastics_skills', 'barbell_cycling');
    safetyProfile.modifications.push('dumbbell_alternatives', 'neutral_grip_options', 'reduced_gripping_time');
  }

  // Equipment analysis from equipment_environment (question 5)
  const equipmentResponse = responses['5'] || '';
  if (equipmentResponse.toLowerCase().includes('barbell')) safetyProfile.equipment.push('barbell');
  if (equipmentResponse.toLowerCase().includes('dumbbell')) safetyProfile.equipment.push('dumbbells');
  if (equipmentResponse.toLowerCase().includes('kettlebell')) safetyProfile.equipment.push('kettlebells');
  if (equipmentResponse.toLowerCase().includes('pull')) safetyProfile.equipment.push('pull_up_bar');
  if (equipmentResponse.toLowerCase().includes('rings')) safetyProfile.equipment.push('rings');
  if (equipmentResponse.toLowerCase().includes('home')) {
    safetyProfile.equipment.push('home_gym');
    safetyProfile.riskFactors.push('limited_equipment');
    safetyProfile.environmentalFactors.push('unsupervised_training');
  }

  // Time constraints from time_constraints (question 9)
  const timeResponse = responses['9'] || '';
  if (timeResponse.includes('30')) {
    safetyProfile.timeConstraints = { session_length: 30, intensity_focus: 'high', warmup_time: 'limited' };
    safetyProfile.riskFactors.push('insufficient_warmup_time');
  } else if (timeResponse.includes('45')) {
    safetyProfile.timeConstraints = { session_length: 45, intensity_focus: 'moderate', warmup_time: 'adequate' };
  } else if (timeResponse.includes('60')) {
    safetyProfile.timeConstraints = { session_length: 60, intensity_focus: 'moderate', warmup_time: 'adequate' };
  }

  // Lifestyle factors from lifestyle_factors (question 11)
  const lifestyleResponse = responses['11'] || '';
  if (lifestyleResponse.toLowerCase().includes('stress') || lifestyleResponse.toLowerCase().includes('busy')) {
    safetyProfile.recoveryNeeds.push('stress_management', 'flexible_scheduling');
    safetyProfile.riskFactors.push('high_life_stress');
  }
  if (lifestyleResponse.toLowerCase().includes('sleep') || lifestyleResponse.toLowerCase().includes('tired')) {
    safetyProfile.recoveryNeeds.push('sleep_optimization', 'fatigue_monitoring');
    safetyProfile.riskFactors.push('sleep_deprivation');
  }
  if (lifestyleResponse.toLowerCase().includes('travel')) {
    safetyProfile.recoveryNeeds.push('travel_adaptations');
    safetyProfile.environmentalFactors.push('inconsistent_training_environment');
  }

  // Recovery preferences from recovery_preferences (question 17)
  const recoveryResponse = responses['17'] || '';
  if (recoveryResponse.toLowerCase().includes('track') || recoveryResponse.toLowerCase().includes('hrv')) {
    safetyProfile.recoveryNeeds.push('data_driven_recovery');
  }
  if (recoveryResponse.toLowerCase().includes('stretch') || recoveryResponse.toLowerCase().includes('mobility')) {
    safetyProfile.recoveryNeeds.push('mobility_emphasis');
  }

  // Learning style considerations from learning_style (question 18)
  const learningResponse = responses['18'] || '';
  if (learningResponse.toLowerCase().includes('visual')) {
    safetyProfile.learningConsiderations.push('visual_demonstrations_required');
  }
  if (learningResponse.toLowerCase().includes('hands') || learningResponse.toLowerCase().includes('try')) {
    safetyProfile.learningConsiderations.push('hands_on_practice_needed');
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
    Object.entries(question.sophisticationSignals).forEach(([level, signals]) => {
      signals.forEach((signal: string) => {
        if (userResponseLower.includes(signal.toLowerCase())) {
          detectedSignals.push(signal);
        }
      });
    });
  }

  return detectedSignals;
};
