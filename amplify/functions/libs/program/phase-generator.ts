/**
 * Program Phase Generator
 *
 * This module handles parallel generation of program phases using Bedrock toolConfig.
 * It breaks down large program generation into smaller, concurrent AI calls to stay within Lambda timeout.
 *
 * Pattern: Follows build-workout toolConfig approach
 * Critical: Parallel execution required for MVP (15-min Lambda timeout)
 */

import { callBedrockApi, MODEL_IDS } from '../api-helpers';
import { parseJsonWithFallbacks } from '../response-utils';
import { getCondensedSchema } from '../object-utils';
import {
  PHASE_SCHEMA,
  PHASE_STRUCTURE_SCHEMA,
} from '../schemas/program-schema';
import type { ProgramPhase, WorkoutTemplate } from './types';
import type { CoachConfig } from '../coach-creator/types';
import type { UserProfile } from '../user/types';
import { buildCoachPersonalityPrompt } from '../coach-config/personality-utils';
import type { ProgramCreatorTodoList } from '../program-creator/types';

/**
 * Phase structure without workouts (for initial breakdown)
 */
interface PhaseStructure {
  phaseId: string;
  name: string;
  description: string;
  startDay: number;
  endDay: number;
  durationDays: number;
  focusAreas: string[];
}

/**
 * Phase with workouts (for parallel generation)
 */
interface PhaseWithWorkouts extends PhaseStructure {
  workouts: WorkoutTemplate[];
}

/**
 * Context for phase generation
 */
interface PhaseGenerationContext {
  userId: string;
  programId: string;
  todoList: ProgramCreatorTodoList;
  coachConfig: CoachConfig;
  userProfile: UserProfile | null;
  conversationContext: string;
  pineconeContext: string;
  totalDays: number;
  trainingFrequency: number;
}

/**
 * Generate high-level phase structure (without workouts)
 * This determines how to break the program into logical phases
 *
 * Tool name: generate_phase_structure
 */
export async function generatePhaseStructure(
  context: PhaseGenerationContext
): Promise<PhaseStructure[]> {
  console.info('🎯 Generating phase structure:', {
    totalDays: context.totalDays,
    trainingFrequency: context.trainingFrequency,
    userId: context.userId,
    programId: context.programId,
  });

  const { todoList, coachConfig, userProfile, conversationContext, pineconeContext } = context;

  // Build coach personality prompt
  const coachPersonalityPrompt = buildCoachPersonalityPrompt(
    coachConfig,
    userProfile,
    {
      includeDetailedPersonality: true,
      includeMethodologyDetails: true,
      includeMotivation: false,
      includeSafety: true,
      includeCriticalDirective: true,
      context: 'GENERATING PROGRAM PHASE STRUCTURE',
    }
  );

  const memoryContext = pineconeContext || 'No specific user context found.';

  const prompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Break down this program into optimal phases based on the user's goals and requirements.

## USER REQUIREMENTS FROM TODO LIST:
${JSON.stringify(todoList, null, 2)}

## CONVERSATION CONTEXT:
${conversationContext}

## USER MEMORIES & RELEVANT CONTEXT:
${memoryContext}

## PROGRAM PARAMETERS:
- Total Duration: ${context.totalDays} days
- Training Frequency: ${context.trainingFrequency} days per week
- Total Workouts: ~${Math.floor((context.totalDays / 7) * context.trainingFrequency)} workouts

## PHASE BREAKDOWN GUIDELINES:

### Optimal Phase Count:
- 4-8 week programs: 2-3 phases
- 8-12 week programs: 3-4 phases
- 12+ week programs: 4-5 phases
- Maximum: 5 phases (for parallel processing efficiency)

### Phase Design Principles:
1. **Progressive Overload**: Each phase builds on the previous
2. **Logical Periodization**: Start with foundation/base building, progress to specific work
3. **Adaptation Cycles**: 3-4 weeks minimum per phase for adaptation
4. **Deload Integration**: Consider recovery weeks in longer phases
5. **Goal Alignment**: Phase focus areas must align with overall program goals

### Phase Naming:
- Use descriptive, motivating names (e.g., "Phase 1: Foundation Building", "Phase 2: Strength Development")
- Avoid generic names like "Phase 1", "Part A"

### Equipment Context:
${todoList.equipmentAccess?.value ? `Available Equipment: ${JSON.stringify(todoList.equipmentAccess.value)}` : 'Equipment constraints not specified'}
${todoList.equipmentAccess?.imageRefs ? `Equipment images provided: ${todoList.equipmentAccess.imageRefs.length} image(s)` : ''}

### Injury/Limitation Context:
${todoList.injuryConsiderations?.value || 'No injury considerations specified'}
${todoList.injuryConsiderations?.imageRefs ? `Injury documentation images: ${todoList.injuryConsiderations.imageRefs.length} image(s)` : ''}

## CRITICAL REQUIREMENTS:
- Phases MUST be consecutive (no gaps, no overlaps)
- Phase 1 MUST start on day 1
- Last phase MUST end on day ${context.totalDays}
- Each phase must have at least ${Math.floor(context.trainingFrequency * 2)} workouts (2 weeks minimum)
- Focus areas must be specific and actionable

Generate the phase structure using the tool.`;

  try {
    // PRIMARY: Tool-based generation
    console.info('🎯 Attempting tool-based phase structure generation');

    const result = await callBedrockApi(
      prompt,
      'phase_structure_generation',
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      {
        enableThinking: true,
        tools: {
          name: 'generate_phase_structure',
          description: 'Generate program phase breakdown with logical periodization',
          inputSchema: PHASE_STRUCTURE_SCHEMA,
        },
        expectedToolName: 'generate_phase_structure',
      }
    );

    if (typeof result === 'object' && result !== null && 'phases' in result) {
      console.info('✅ Tool-based phase structure generation succeeded:', {
        phaseCount: (result as any).phases.length,
        phases: (result as any).phases.map((p: any) => ({
          name: p.name,
          startDay: p.startDay,
          endDay: p.endDay,
          durationDays: p.durationDays,
        })),
      });

      return (result as any).phases;
    } else {
      throw new Error('Tool did not return valid phase structure');
    }
  } catch (toolError) {
    console.error('❌ Tool-based phase structure generation failed:', toolError);

    // FALLBACK: Text-based generation with parsing
    console.info('⚠️ Falling back to text-based phase structure generation');

    const fallbackPrompt = `${prompt}

Return ONLY valid JSON matching this structure (no markdown, no explanation):
${JSON.stringify(getCondensedSchema(PHASE_STRUCTURE_SCHEMA), null, 2)}`;

    const fallbackResult = await callBedrockApi(
      fallbackPrompt,
      'phase_structure_generation_fallback',
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      { prefillResponse: '{' }
    ) as string;

    const parsed = parseJsonWithFallbacks(fallbackResult);

    if (parsed && parsed.phases && Array.isArray(parsed.phases)) {
      console.info('✅ Fallback phase structure generation succeeded:', {
        phaseCount: parsed.phases.length,
      });
      return parsed.phases;
    } else {
      throw new Error('Failed to generate phase structure via fallback');
    }
  }
}

/**
 * Generate workouts for a single phase using toolConfig
 * This is called in parallel for each phase
 *
 * Tool name: generate_program_phase
 */
export async function generateSinglePhaseWorkouts(
  phase: PhaseStructure,
  context: PhaseGenerationContext,
  allPhases: PhaseStructure[]
): Promise<PhaseWithWorkouts> {
  console.info('🏋️ Generating workouts for phase:', {
    phaseName: phase.name,
    startDay: phase.startDay,
    endDay: phase.endDay,
    durationDays: phase.durationDays,
  });

  const { todoList, coachConfig, userProfile, conversationContext, pineconeContext } = context;

  // Build coach personality prompt
  const coachPersonalityPrompt = buildCoachPersonalityPrompt(
    coachConfig,
    userProfile,
    {
      includeDetailedPersonality: true,
      includeMethodologyDetails: true,
      includeMotivation: false,
      includeSafety: true,
      includeCriticalDirective: true,
      context: `GENERATING WORKOUTS FOR ${phase.name.toUpperCase()}`,
    }
  );

  const memoryContext = pineconeContext || 'No specific user context found.';

  // Calculate expected workout count
  const expectedWorkouts = Math.floor((phase.durationDays / 7) * context.trainingFrequency);

  // Build phase context (where this phase fits in the program)
  const phaseContext = allPhases.map((p, idx) => ({
    order: idx + 1,
    name: p.name,
    startDay: p.startDay,
    endDay: p.endDay,
    focusAreas: p.focusAreas,
    isCurrent: p.phaseId === phase.phaseId,
  }));

  const prompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Generate detailed workout templates for this program phase.

## CURRENT PHASE:
${JSON.stringify(phase, null, 2)}

## PHASE CONTEXT (Full Program):
${JSON.stringify(phaseContext, null, 2)}

This is ${allPhases.findIndex(p => p.phaseId === phase.phaseId) === 0 ? 'the FIRST phase' :
           allPhases.findIndex(p => p.phaseId === phase.phaseId) === allPhases.length - 1 ? 'the FINAL phase' :
           `phase ${allPhases.findIndex(p => p.phaseId === phase.phaseId) + 1} of ${allPhases.length}`} in the program.

## USER REQUIREMENTS FROM TODO LIST:
${JSON.stringify(todoList, null, 2)}

## CONVERSATION CONTEXT:
${conversationContext}

## USER MEMORIES & RELEVANT CONTEXT:
${memoryContext}

## WORKOUT GENERATION REQUIREMENTS:

### Workout Count & Distribution:
- Generate approximately ${expectedWorkouts} workouts for this ${phase.durationDays}-day phase
- Training Frequency: ${context.trainingFrequency} days per week
- Distribute workouts evenly across the phase duration
- Account for rest days based on training frequency

### Workout Template Structure (CRITICAL):
Each workout must follow the segmented, implicitly grouped structure:

**Simple Training Days (1 template):**
- Single template with unique groupId
- Example: "Strength Day" or "Conditioning Session"

**Complex Training Days (2-5 templates with SAME groupId):**
- Multiple templates sharing the same groupId (links them to the same day)
- Each template is independently trackable
- Examples:
  * "Strength Block" + "Accessory Work" + "Core Finisher"
  * "Olympic Lifting" + "Conditioning"
  * "Upper Body Strength" + "Metcon"

### Template ID Patterns:
- templateId: "template_\${context.userId}_\${phase.phaseId}_\${unique}"
- groupId: "group_\${context.userId}_\${phase.phaseId}_day\${dayNumber}"
- Templates for same day MUST share the exact same groupId

### Workout Description (Natural Language):
- Write as a coach would prescribe it
- Be specific with sets, reps, weights/percentages, rest periods
- Include scaling options when appropriate
- Example: "5 rounds for time: 21 thrusters (95/65), 21 pull-ups, 400m run. Scale: reduce reps to 15-12-9-6-3"

### Equipment Context:
${todoList.equipmentAccess?.value ? `Available Equipment: ${JSON.stringify(todoList.equipmentAccess.value)}` : 'Use standard gym equipment'}
${todoList.equipmentAccess?.imageRefs ? `
User provided ${todoList.equipmentAccess.imageRefs.length} image(s) showing their equipment/space.
Context extracted: ${todoList.equipmentAccess.value}
Design workouts that work with this equipment.` : ''}

### Injury/Safety Context:
${todoList.injuryConsiderations?.value ? `
CRITICAL SAFETY CONSIDERATIONS:
${todoList.injuryConsiderations.value}

${todoList.injuryConsiderations.imageRefs ? `User provided ${todoList.injuryConsiderations.imageRefs.length} image(s) documenting injuries/limitations.` : ''}

Modify exercises and loading to accommodate these constraints.` : 'No specific injury considerations.'}

### Progression Within Phase:
- Early phase: Lower intensity, focus on movement quality and adaptation
- Mid phase: Build volume and intensity progressively
- Late phase: Peak complexity/intensity before next phase (or taper if final phase)

### Focus Areas for This Phase:
${phase.focusAreas.map(area => `- ${area}`).join('\n')}

Generate the complete phase with all workouts using the tool.`;

  try {
    // PRIMARY: Tool-based generation
    console.info('🎯 Attempting tool-based phase workout generation');

    const result = await callBedrockApi(
      prompt,
      `phase_${phase.phaseId}_generation`,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      {
        enableThinking: true,
        tools: {
          name: 'generate_program_phase',
          description: 'Generate complete program phase with all workout templates',
          inputSchema: PHASE_SCHEMA,
        },
        expectedToolName: 'generate_program_phase',
      }
    );

    if (typeof result === 'object' && result !== null && 'workouts' in result) {
      // Merge the phase structure with the generated workouts
      const phaseWithWorkouts: PhaseWithWorkouts = {
        ...phase,
        ...(result as any),
      };
      console.info('✅ Tool-based phase workout generation succeeded:', {
        phaseName: phase.name,
        workoutCount: phaseWithWorkouts.workouts.length,
        daysCovered: new Set(phaseWithWorkouts.workouts.map(w => w.dayNumber)).size,
      });

      return phaseWithWorkouts;
    } else {
      throw new Error('Tool did not return valid phase with workouts');
    }
  } catch (toolError) {
    console.error('❌ Tool-based phase workout generation failed:', toolError);

    // FALLBACK: Text-based generation with parsing
    console.info('⚠️ Falling back to text-based phase workout generation');

    const fallbackPrompt = `${prompt}

Return ONLY valid JSON matching this structure (no markdown, no explanation):
${JSON.stringify(getCondensedSchema(PHASE_SCHEMA), null, 2)}`;

    const fallbackResult = await callBedrockApi(
      fallbackPrompt,
      `phase_${phase.phaseId}_generation_fallback`,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      { prefillResponse: '{' }
    ) as string;

    const parsed = parseJsonWithFallbacks(fallbackResult);

    if (parsed && parsed.workouts && Array.isArray(parsed.workouts)) {
      console.info('✅ Fallback phase workout generation succeeded:', {
        phaseName: phase.name,
        workoutCount: parsed.workouts.length,
      });
      return parsed as PhaseWithWorkouts;
    } else {
      throw new Error(`Failed to generate workouts for phase ${phase.name} via fallback`);
    }
  }
}

/**
 * Generate all phases in parallel using Promise.all()
 * This is CRITICAL for MVP to stay within 15-minute Lambda timeout
 */
export async function generateAllPhasesParallel(
  phases: PhaseStructure[],
  context: PhaseGenerationContext
): Promise<PhaseWithWorkouts[]> {
  console.info('🚀 Starting parallel phase generation:', {
    phaseCount: phases.length,
    totalDays: context.totalDays,
    estimatedWorkouts: Math.floor((context.totalDays / 7) * context.trainingFrequency),
  });

  const startTime = Date.now();

  try {
    // Execute all phase generations in parallel
    const phasePromises = phases.map(phase =>
      generateSinglePhaseWorkouts(phase, context, phases)
    );

    const generatedPhases = await Promise.all(phasePromises);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.info('✅ Parallel phase generation complete:', {
      phaseCount: generatedPhases.length,
      totalWorkouts: generatedPhases.reduce((sum, p) => sum + p.workouts.length, 0),
      elapsedSeconds: elapsed,
      phases: generatedPhases.map(p => ({
        name: p.name,
        workoutCount: p.workouts.length,
        dayRange: `${p.startDay}-${p.endDay}`,
      })),
    });

    return generatedPhases;
  } catch (error) {
    console.error('❌ Parallel phase generation failed:', error);
    throw new Error(`Failed to generate phases: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Assemble complete program from generated phases
 * Combines phases, validates structure, and prepares for storage
 */
export function assembleProgram(
  phases: PhaseWithWorkouts[],
  context: PhaseGenerationContext
): {
  phases: ProgramPhase[];
  workoutTemplates: WorkoutTemplate[];
  totalWorkouts: number;
} {
  console.info('🔧 Assembling complete program from phases:', {
    phaseCount: phases.length,
  });

  // Sort phases by startDay to ensure correct order
  const sortedPhases = [...phases].sort((a, b) => a.startDay - b.startDay);

  // Validate phase continuity
  for (let i = 0; i < sortedPhases.length; i++) {
    const phase = sortedPhases[i];

    if (i === 0 && phase.startDay !== 1) {
      console.warn('⚠️ First phase does not start on day 1:', phase);
    }

    if (i > 0) {
      const prevPhase = sortedPhases[i - 1];
      if (phase.startDay !== prevPhase.endDay + 1) {
        console.warn('⚠️ Phase gap detected:', {
          prevPhase: prevPhase.name,
          prevEnd: prevPhase.endDay,
          currentPhase: phase.name,
          currentStart: phase.startDay,
          gap: phase.startDay - prevPhase.endDay - 1,
        });
      }
    }
  }

  // Extract phase metadata (without workouts)
  const programPhases: ProgramPhase[] = sortedPhases.map(phase => ({
    phaseId: phase.phaseId,
    name: phase.name,
    description: phase.description,
    startDay: phase.startDay,
    endDay: phase.endDay,
    durationDays: phase.durationDays,
    focusAreas: phase.focusAreas,
  }));

  // Collect all workouts across all phases
  const allWorkouts: WorkoutTemplate[] = [];
  for (const phase of sortedPhases) {
    for (const workout of phase.workouts) {
      // Ensure phaseId is set
      const workoutWithPhase: WorkoutTemplate = {
        ...workout,
        phaseId: phase.phaseId,
      };
      allWorkouts.push(workoutWithPhase);
    }
  }

  // Sort workouts by dayNumber, then by templateId for consistency
  allWorkouts.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) {
      return a.dayNumber - b.dayNumber;
    }
    return a.templateId.localeCompare(b.templateId);
  });

  console.info('✅ Program assembly complete:', {
    phaseCount: programPhases.length,
    totalWorkouts: allWorkouts.length,
    daysCovered: new Set(allWorkouts.map(w => w.dayNumber)).size,
    programDuration: context.totalDays,
  });

  return {
    phases: programPhases,
    workoutTemplates: allWorkouts,
    totalWorkouts: allWorkouts.length,
  };
}

