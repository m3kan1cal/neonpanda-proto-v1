import { callBedrockApi, MODEL_IDS } from "../api-helpers";
import { DISCIPLINE_DETECTION_SCHEMA } from "../schemas/discipline-detection-schema";

export interface DisciplineDetectionResult {
  discipline: string;
  confidence: number;
  method: "ai_detection";
  reasoning: string;
}

const DISCIPLINE_DETECTION_PROMPT = `
You are a fitness discipline classification expert. Analyze this workout description and determine the primary training discipline.

## DISCIPLINES

**crossfit**: Functional fitness, mixed modality with AMRAPs, EMOMs, "For Time" workouts, benchmark WODs (Fran, Murph, Grace), mixed modalities (gymnastics + weightlifting + monostructural cardio), RX/scaled, time domains

**powerlifting**: Squat/bench/deadlift focus, percentage-based programming (70% 1RM), RPE tracking (rate of perceived exertion), competition lift attempts (opener/second/third), low rep ranges (1-5), accessory work, equipment mentions (belt, wraps, sleeves)

**bodybuilding**: Split training (Push/Pull/Legs, Upper/Lower, Bro Split), hypertrophy focus (8-12 rep range), tempo work (3-1-1-0), time under tension, isolation exercises, supersets/drop sets/rest-pause, volume focus, "the pump"

**olympic_weightlifting**: Snatch, clean & jerk, competition attempts, percentage of 1RM, technique work, positional work, complexes (snatch + overhead squat), accessory pulls, jerk variations

**functional_bodybuilding**: EMOM with quality/tempo focus, movement pattern emphasis, Marcus Filly/Persist style, hypertrophy + gymnastics hybrid, controlled tempo, moderate rep ranges with quality

**calisthenics**: Bodyweight skill development, pull-ups/push-ups/dips, handstand progressions, planche/front lever/muscle-up, hold times, progression levels (tuck/advanced tuck/straddle/full), gymnastics strength

**hyrox**: 8 stations + 9 runs (1km each), specific exercises (SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls), race simulation, division tracking (Open/Pro/Doubles)

**running**: Distance runs (5k, 10k, half marathon, marathon), pace work, intervals, tempo runs, splits tracking, easy/long/speed runs, race training

## CLASSIFICATION RULES

**IMPORTANT**: If the workout is mixed-modality or unclear, classify as "crossfit" (the functional fitness discipline that encompasses mixed training).

### Priority Rules (Most Important)
1. **Format/Structure trumps exercise selection**: "EMOM 10: bench press" = CrossFit (not powerlifting)
2. **Programming context is authoritative**: CompTrain/Mayhem = CrossFit, Westside = Powerlifting
3. **Named WODs are definitive**: "Did Fran" = CrossFit (even if modified)
4. **Race-specific training**: "Hyrox race" or "marathon training" = discipline-specific

### Multi-Phase Workout Rules
- **Strength + Metcon**: Identify which is the MAIN workout vs warmup/accessory
  - "Strength work: squats 3x5, then 12-min AMRAP..." = CrossFit (metcon is primary)
  - "5x5 squats at 80%, then accessory work" = Powerlifting (strength is primary)
- **Equal emphasis on multiple disciplines**: Classify as "crossfit" (functional fitness methodology)
- **Warmup doesn't determine discipline**: "Warmed up with a 400m run, then did Fran" = CrossFit

### Edge Case Handling
- **Tempo notation (3-1-1-0)**: Bodybuilding or Functional Bodybuilding (check for EMOM/quality focus)
- **EMOM with powerlifting movements**: CrossFit (format determines discipline)
- **Mixed cardio + strength**: Running if cardio dominates, CrossFit if balanced
- **Gymnastics movements in strength workout**: CrossFit if part of metcon, Calisthenics if skill-focused

### Programming Context Clues
**CrossFit Programs**: CompTrain, Mayhem, Invictus, PRVN, Linchpin, WOD
**Powerlifting Programs**: Westside, Conjugate, Sheiko, 5/3/1, Cube Method
**Bodybuilding**: Renaissance Periodization, John Meadows, Gamma Bomb
**Functional Bodybuilding**: Marcus Filly, Persist, Awaken Training
**Running**: Hansons, Daniels, Pfitzinger, McMillan

### Confidence Scoring
- **0.9-1.0**: Clear single-discipline indicators (named WOD, explicit program name, race-specific, unambiguous format)
- **0.7-0.9**: Strong indicators with minor ambiguity (EMOM with non-standard movements, tempo work without split mention)
- **0.5-0.7**: Mixed signals, multi-phase without clear primary, could be 2+ disciplines
- **0.4-0.5**: Very unclear, lean toward crossfit (default for mixed/unclear)

## EXAMPLES

**CrossFit:**
- "Did Fran in 8:23 RX" → crossfit, 1.0
- "21-15-9 thrusters and pull-ups" → crossfit, 1.0
- "AMRAP 15: 10 burpees, 15 KB swings, 20 air squats - got 7 rounds" → crossfit, 0.95
- "Strength: squats 3x5, then 12-min AMRAP of rowing/burpees" → crossfit, 0.85 (metcon is primary)

**Powerlifting:**
- "Squat 5x5 at 80% (335lbs), felt solid with belt" → powerlifting, 0.95
- "Deadlift: 135x5, 225x3, 315x1, 365x1 (opener), 405x1 (PR!)" → powerlifting, 1.0
- "Bench press 3x8 at RPE 7, then close-grip 3x10" → powerlifting, 0.9

**Bodybuilding:**
- "Push day: bench 4x8, incline DB press 3x12, cable flies 3x15, felt the pump!" → bodybuilding, 1.0
- "Tempo squats 3-1-3-1, 4 sets of 6 reps at 225lbs" → bodybuilding, 0.9
- "Leg day: squats, leg press, leg curls, leg extensions - all 4x10" → bodybuilding, 0.95

**Functional Bodybuilding:**
- "EMOM 10: 8 DB rows with 3-1-1-0 tempo, focus on quality" → functional_bodybuilding, 0.95
- "Marcus Filly Persist workout: quality-focused gymnastics + tempo work" → functional_bodybuilding, 1.0

**Olympic Weightlifting:**
- "Snatch: 3x3 at 70%, then snatch pulls 4x4" → olympic_weightlifting, 0.95
- "Clean & jerk complex: 5 sets (1 clean + 2 jerks)" → olympic_weightlifting, 1.0

**Calisthenics:**
- "Handstand progressions: wall holds, then freestanding attempts, 8 sets total" → calisthenics, 0.95
- "Pull-up ladder: 1-2-3-4-5-4-3-2-1, focusing on strict form" → calisthenics, 0.9

**Hyrox:**
- "Hyrox simulation: 8 stations + 9 runs, finished in 1:34:22" → hyrox, 1.0
- "Hyrox training: SkiErg 1000m, Sled Push 50m" → hyrox, 0.9

**Running:**
- "10k tempo run: 7:30/mile pace, splits: 7:28, 7:32, 7:29..." → running, 1.0
- "Easy 5 mile run, felt good" → running, 0.95

Use the classify_discipline tool to return your analysis.`;

export async function detectDiscipline(
  userMessage: string,
  imageS3Keys?: string[],
): Promise<DisciplineDetectionResult> {
  try {
    console.info("🎯 Detecting workout discipline with AI:", {
      messageLength: userMessage.length,
      messagePreview: userMessage.substring(0, 100),
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
    });

    // Use tool-based detection with schema enforcement (established pattern)
    const result = await callBedrockApi(
      DISCIPLINE_DETECTION_PROMPT,
      `Analyze this workout and classify its discipline:\n\n"${userMessage}"`,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
      {
        tools: {
          name: "classify_discipline",
          description:
            "Classify the workout discipline based on structure and terminology",
          inputSchema: DISCIPLINE_DETECTION_SCHEMA,
        },
        expectedToolName: "classify_discipline",
      },
    );

    // Extract tool result (follows established pattern)
    if (typeof result === "object" && "toolName" in result) {
      const disciplineData = result.input;

      console.info("✅ Discipline detected:", {
        discipline: disciplineData.discipline,
        confidence: disciplineData.confidence,
        reasoning: disciplineData.reasoning,
      });

      return {
        discipline: disciplineData.discipline,
        confidence: disciplineData.confidence,
        method: "ai_detection",
        reasoning: disciplineData.reasoning,
      };
    }

    // Fallback if tool wasn't used (shouldn't happen with schema enforcement)
    throw new Error("AI did not use classification tool");
  } catch (error) {
    console.error(
      "❌ AI discipline detection failed, defaulting to crossfit:",
      error,
    );
    return {
      discipline: "crossfit",
      confidence: 0.5,
      method: "ai_detection",
      reasoning: "Detection failed, defaulting to crossfit discipline",
    };
  }
}
