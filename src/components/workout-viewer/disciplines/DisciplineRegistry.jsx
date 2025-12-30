import { CrossFitSection } from "./CrossFitSection";
import { PowerliftingSection } from "./PowerliftingSection";
import { BodybuildingSection } from "./BodybuildingSection";
import { HyroxSection } from "./HyroxSection";
import { OlympicWeightliftingSection } from "./OlympicWeightliftingSection";
import { FunctionalBodybuildingSection } from "./FunctionalBodybuildingSection";
import { CalisthenicsSection } from "./CalisthenicsSection";
import { RunningSection } from "./RunningSection";
// HybridSection removed - use CrossFit for mixed-modality workouts

/**
 * Registry of discipline-specific workout viewer components
 *
 * Each discipline has its own component for displaying workout data.
 * Components follow a consistent pattern but render discipline-specific fields.
 *
 * Usage:
 *   const DisciplineComponent = getDisciplineComponent(workout.discipline);
 *   if (DisciplineComponent) {
 *     return <DisciplineComponent data={workoutData.discipline_specific[discipline]} ... />;
 *   }
 */
export const DISCIPLINE_COMPONENTS = {
  crossfit: CrossFitSection,
  powerlifting: PowerliftingSection,
  bodybuilding: BodybuildingSection,
  hyrox: HyroxSection,
  olympic_weightlifting: OlympicWeightliftingSection,
  functional_bodybuilding: FunctionalBodybuildingSection,
  calisthenics: CalisthenicsSection,
  running: RunningSection,
  // Legacy discipline mappings - use CrossFit component for these
  hybrid: CrossFitSection,
  functional_fitness: CrossFitSection,
};

/**
 * Get the discipline-specific component for rendering workout data
 *
 * @param {string} discipline - The workout discipline (e.g., "crossfit", "powerlifting")
 * @returns {React.Component|null} The component for this discipline, or null if not found
 */
export const getDisciplineComponent = (discipline) => {
  return DISCIPLINE_COMPONENTS[discipline] || null;
};

/**
 * Get all supported discipline names
 *
 * @returns {string[]} Array of supported discipline names
 */
export const getSupportedDisciplines = () => {
  return Object.keys(DISCIPLINE_COMPONENTS);
};

/**
 * Check if a discipline is supported
 *
 * @param {string} discipline - The discipline to check
 * @returns {boolean} True if the discipline has a component
 */
export const isDisciplineSupported = (discipline) => {
  return discipline in DISCIPLINE_COMPONENTS;
};
