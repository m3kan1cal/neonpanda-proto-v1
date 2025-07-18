# Universal Multi-Discipline Workout Schema
## Complete Documentation and AI Extraction Guide

### Version 2.0 | Created for Custom Fitness AI Agents Platform

---

## Table of Contents

1. [Philosophy & Design Principles](#philosophy--design-principles)
2. [Schema Overview](#schema-overview)
3. [Core Universal Fields](#core-universal-fields)
4. [Discipline-Specific Structures](#discipline-specific-structures)
5. [Analytics & Metadata](#analytics--metadata)
6. [AI Extraction Guidelines](#ai-extraction-guidelines)
7. [Implementation Strategy](#implementation-strategy)
8. [Extension Guide](#extension-guide)
9. [Complete Schema Reference](#complete-schema-reference)

---

## Philosophy & Design Principles

### Core Design Philosophy

This schema is built around the principle that **fitness data should be captured through natural conversation**, then intelligently extracted into structured formats that enable sophisticated analytics, progress tracking, and AI coaching. The design balances three critical requirements:

1. **Universal Consistency**: Core fields work across all fitness disciplines
2. **Discipline Flexibility**: Specialized tracking for methodology-specific needs
3. **AI-First Architecture**: Optimized for natural language extraction and processing

### Key Design Principles

#### 1. **Conversation-Centric Data Collection**
- Users describe workouts naturally: *"I did Fran in 8:57 with 95lb thrusters"*
- AI extracts structured data while preserving conversational context
- No forced form-filling or rigid input requirements

#### 2. **Layered Information Architecture**
```
Universal Core (all workouts)
├── Performance Metrics (cross-discipline)
├── Discipline-Specific Data (methodology-aware)
└── Analytics Metadata (extraction quality, confidence)
```

#### 3. **Analytics-Driven Structure**
- Every field designed to support trend analysis and progress tracking
- Time-series optimization for performance prediction
- Cross-training analysis capabilities built-in

#### 4. **Extensible by Design**
- New disciplines can be added without breaking existing data
- Methodology-specific extensions encouraged
- Forward-compatible versioning system

#### 5. **Safety Integration**
- Rich data supports sophisticated safety validation
- Injury tracking and prevention capabilities
- Overtraining detection through multiple data points

---

## Schema Overview

### High-Level Structure

```json
{
  // Universal fields present in every workout
  "workout_id": "unique_identifier",
  "user_id": "user_reference",
  "date": "YYYY-MM-DD",
  "discipline": "crossfit|powerlifting|bodybuilding|...",

  // Cross-discipline performance metrics
  "performance_metrics": { ... },

  // Discipline-specific workout data
  "discipline_specific": {
    "{discipline_name}": { ... }
  },

  // Progress tracking
  "pr_achievements": [ ... ],

  // User feedback and subjective metrics
  "subjective_feedback": { ... },

  // AI coach integration
  "coach_notes": { ... },

  // Analytics and extraction metadata
  "metadata": { ... }
}
```

### Supported Disciplines

- **CrossFit**: Metcons, strength, gymnastics, benchmarks
- **Powerlifting**: Competition lifts, max effort, dynamic effort
- **Bodybuilding**: Muscle-focused training, volume tracking, physique development
- **HIIT**: Interval protocols, circuit training, cardio conditioning
- **Running**: Distance, tempo, intervals, race training
- **Swimming**: Pool and open water, stroke technique, endurance
- **Cycling**: Road, mountain, indoor, power-based training
- **Yoga**: Flexibility, mindfulness, pose progression
- **Martial Arts**: Skill development, sparring, conditioning
- **Climbing**: Route difficulty, technique, strength training
- **Hybrid**: Multi-discipline training sessions

---

## Core Universal Fields

### Identification & Context

```json
{
  "workout_id": "user123_20250703_001",
  "user_id": "user123",
  "date": "2025-07-03",
  "discipline": "crossfit",
  "methodology": "comptrain",
  "workout_name": "Fran",
  "workout_type": "metcon",
  "duration": 45,
  "location": "gym",
  "coach_id": "user123_coach_main",
  "conversation_id": "conv_456"
}
```

#### Field Documentation

**workout_id** `string`
- **Purpose**: Unique identifier for analytics and referencing
- **Format**: `user{user_id}_{YYYYMMDD}_{session_number}`
- **Analytics Use**: Primary key for all workout-related queries
- **AI Extraction**: Auto-generated, not extracted from user input

**discipline** `enum`
- **Purpose**: High-level categorization for discipline-specific processing
- **Values**: `crossfit`, `powerlifting`, `bodybuilding`, `hiit`, `running`, `swimming`, `cycling`, `yoga`, `martial_arts`, `climbing`, `hybrid`
- **Analytics Use**: Training balance analysis, coach specialization
- **AI Extraction**: Inferred from workout content and user context

**methodology** `string`
- **Purpose**: Links to specific training systems for methodology-aware coaching
- **Examples**: `comptrain`, `westside_conjugate`, `push_pull_legs`, `tabata`, `couch_to_5k`
- **Analytics Use**: Methodology effectiveness analysis
- **AI Extraction**: Inferred from exercise selection, rep schemes, terminology used

**workout_type** `enum`
- **Purpose**: Training type categorization for periodization analysis
- **Values**: `strength`, `cardio`, `flexibility`, `skill`, `competition`, `recovery`, `hybrid`
- **Analytics Use**: Training distribution balance
- **AI Extraction**: Determined from intensity, duration, and exercise selection

### Performance Metrics (Universal)

```json
{
  "performance_metrics": {
    "intensity": 8,
    "perceived_exertion": 9,
    "heart_rate": {
      "avg": 165,
      "max": 185,
      "zones": {
        "zone_1": 45,
        "zone_2": 120,
        "zone_3": 245,
        "zone_4": 127,
        "zone_5": 0
      }
    },
    "calories_burned": 245,
    "mood_pre": 7,
    "mood_post": 8,
    "energy_level_pre": 6,
    "energy_level_post": 4
  }
}
```

#### Field Documentation

**intensity** `integer [1-10]`
- **Purpose**: Cross-discipline intensity comparison and periodization
- **Analytics Use**: Training load distribution, recovery planning
- **AI Extraction**: Inferred from user language: "brutal workout" = 9, "easy session" = 4

**perceived_exertion** `integer [1-10]`
- **Purpose**: Subjective load monitoring, overtraining prevention
- **Analytics Use**: RPE trend analysis, fatigue detection
- **AI Extraction**: Direct extraction: "felt like a 7" or inferred from descriptive language

**heart_rate** `object`
- **Purpose**: Cardiovascular fitness tracking, training zone optimization
- **Analytics Use**: Fitness progression, zone distribution analysis
- **AI Extraction**: From wearable data or user-reported averages

---

## Discipline-Specific Structures

### CrossFit Schema

CrossFit workouts require flexible structure to handle diverse workout formats while maintaining consistency for benchmark tracking.

#### Design Philosophy
- **Workout Format Recognition**: Automatically categorize AMRAP, EMOM, For Time, etc.
- **Scaling Awareness**: Track RX vs. scaled to monitor progression
- **Round-Based Structure**: Support complex rep schemes and exercise combinations
- **Benchmark Integration**: Named workouts (Fran, Murph) with historical comparison

```json
{
  "discipline_specific": {
    "crossfit": {
      "workout_format": "for_time",
      "time_cap": 900,
      "rx_status": "rx",
      "rounds": [
        {
          "round_number": 1,
          "rep_scheme": "21-15-9",
          "exercises": [
            {
              "exercise_name": "thruster",
              "movement_type": "barbell",
              "weight": {
                "value": 95,
                "unit": "lbs",
                "percentage_1rm": 65,
                "rx_weight": 95,
                "scaled_weight": null
              },
              "reps": {
                "prescribed": 21,
                "completed": 21,
                "broken_sets": [10, 6, 5],
                "rest_between_sets": [15, 20]
              },
              "distance": null,
              "calories": null,
              "time": null,
              "form_notes": "Good depth, need to work on front rack position"
            },
            {
              "exercise_name": "pull_up",
              "movement_type": "gymnastics",
              "variation": "chest_to_bar",
              "assistance": "none",
              "reps": {
                "prescribed": 21,
                "completed": 21,
                "broken_sets": [8, 7, 6],
                "rest_between_sets": [25, 30]
              },
              "form_notes": "Good kipping rhythm, maintained strict form"
            }
          ]
        }
      ],
      "performance_data": {
        "total_time": 537,
        "rounds_completed": 3,
        "total_reps": 126,
        "round_times": [195, 148, 194],
        "score": {
          "value": 537,
          "type": "time",
          "unit": "seconds"
        }
      }
    }
  }
}
```

#### AI Extraction Patterns for CrossFit

**Workout Identification**
```
Input: "I did Fran today"
Processing: Lookup known benchmark workout
Output: workout_name: "Fran", rounds: [standard Fran structure]

Input: "21-15-9 thrusters and pull-ups for time"
Processing: Recognize rep scheme and format
Output: workout_format: "for_time", rep_scheme: "21-15-9"
```

**Weight and Scaling Detection**
```
Input: "used 95lb thrusters, which is RX for me"
Processing: Extract weight and RX status
Output: weight: {value: 95, unit: "lbs"}, rx_status: "rx"

Input: "scaled to 65 pounds instead of 95"
Processing: Identify scaling modification
Output: weight: {value: 65, unit: "lbs", rx_weight: 95}, rx_status: "scaled"
```

**Rep Breakdown Analysis**
```
Input: "broke the 21 thrusters into 10, 6, and 5"
Processing: Extract fatigue pattern
Output: broken_sets: [10, 6, 5], rest_between_sets: [estimated based on pattern]
```

### Powerlifting Schema

Powerlifting requires precise tracking of attempts, percentages, and periodization phases.

#### Design Philosophy
- **Competition Simulation**: Track opener/second/third attempt structure
- **Percentage-Based Programming**: Link to 1RM for intelligent progression
- **Methodology Awareness**: Support Westside, 5/3/1, Linear Periodization
- **Equipment Tracking**: Raw vs. equipped lifting distinctions

```json
{
  "discipline_specific": {
    "powerlifting": {
      "session_type": "max_effort",
      "competition_prep": true,
      "exercises": [
        {
          "exercise_name": "competition_squat",
          "movement_category": "main_lift",
          "equipment": ["belt", "sleeves"],
          "competition_commands": true,
          "attempts": {
            "opener": 405,
            "second_attempt": 425,
            "third_attempt": 445,
            "successful_attempts": [405, 425],
            "missed_attempts": [445],
            "miss_reasons": ["depth_command"]
          },
          "sets": [
            {
              "set_type": "opener",
              "weight": 405,
              "reps": 1,
              "rpe": 8,
              "rest_time": 300,
              "percentage_1rm": 85,
              "bar_speed": "moderate",
              "competition_commands": true
            }
          ]
        }
      ]
    }
  }
}
```

#### AI Extraction Patterns for Powerlifting

**Attempt Structure Recognition**
```
Input: "hit my opener at 405, made my second at 425, missed my third at 445"
Processing: Parse competition attempt structure
Output: opener: 405, second_attempt: 425, third_attempt: 445,
        successful_attempts: [405, 425], missed_attempts: [445]
```

**RPE and Percentage Integration**
```
Input: "did 5 reps at 315, felt like RPE 7, which is about 85%"
Processing: Extract multiple intensity measures
Output: weight: 315, reps: 5, rpe: 7, percentage_1rm: 85
```

**Equipment and Setup Detection**
```
Input: "squatted with belt and sleeves, used competition commands"
Processing: Identify equipment and competition simulation
Output: equipment: ["belt", "sleeves"], competition_commands: true
```

### Bodybuilding Schema

Bodybuilding requires muscle-centric tracking with emphasis on volume, intensity techniques, and subjective feedback.

#### Design Philosophy
- **Muscle Group Focus**: Primary and secondary muscle targeting
- **Volume Accumulation**: Sets per muscle group tracking
- **Intensity Techniques**: Drop sets, supersets, rest-pause tracking
- **Subjective Metrics**: Mind-muscle connection, pump quality

```json
{
  "discipline_specific": {
    "bodybuilding": {
      "training_split": "push",
      "muscle_groups_primary": ["chest", "shoulders", "triceps"],
      "muscle_groups_secondary": ["core"],
      "volume_landmarks": {
        "chest": 16,
        "shoulders": 12,
        "triceps": 10
      },
      "exercises": [
        {
          "exercise_name": "incline_barbell_press",
          "movement_category": "compound",
          "muscle_emphasis": "upper_chest",
          "sets": [
            {
              "weight": 185,
              "reps": 12,
              "rpe": 7,
              "rest_time": 90,
              "tempo": "3-1-1-1",
              "range_of_motion": "full",
              "mind_muscle_connection": 8,
              "pump_rating": 6,
              "intensity_techniques": {
                "drop_set": {
                  "weight": 135,
                  "reps": 8
                }
              }
            }
          ]
        }
      ]
    }
  }
}
```

#### AI Extraction Patterns for Bodybuilding

**Muscle Group Identification**
```
Input: "did chest and shoulders today"
Processing: Map to training split and muscle groups
Output: training_split: "push", muscle_groups_primary: ["chest", "shoulders"]
```

**Intensity Technique Recognition**
```
Input: "did a drop set from 60 to 40 pounds for 8 more reps"
Processing: Identify and structure intensity technique
Output: intensity_techniques: {drop_set: {weight: 40, reps: 8}}
```

**Subjective Metric Extraction**
```
Input: "really felt it in my chest today, pump was incredible"
Processing: Extract qualitative feedback as numeric ratings
Output: mind_muscle_connection: 9, pump_rating: 9
```

### HIIT Schema

HIIT requires interval-specific tracking with fatigue and recovery analysis.

```json
{
  "discipline_specific": {
    "hiit": {
      "protocol": "tabata",
      "work_duration": 20,
      "rest_duration": 10,
      "total_rounds": 8,
      "exercises": [
        {
          "exercise_name": "burpee",
          "interval_scores": [18, 16, 15, 14, 13, 12, 11, 10],
          "total_reps": 109,
          "fatigue_dropoff": 44.4,
          "form_maintenance": 7
        }
      ]
    }
  }
}
```

### Running Schema

Running requires segment-based tracking for pace analysis and training type classification.

```json
{
  "discipline_specific": {
    "running": {
      "run_type": "tempo",
      "total_distance": 5.2,
      "total_time": 2280,
      "average_pace": "7:18",
      "elevation_gain": 245,
      "surface": "road",
      "weather": "clear_65f",
      "segments": [
        {
          "segment_number": 1,
          "distance": 1.0,
          "time": 480,
          "pace": "8:00",
          "heart_rate_avg": 145,
          "effort_level": "easy",
          "terrain": "flat"
        }
      ]
    }
  }
}
```

---

## Analytics & Metadata

### PR Achievement Tracking

Universal PR system that adapts to discipline-specific achievement types:

```json
{
  "pr_achievements": [
    {
      "exercise": "fran",
      "discipline": "crossfit",
      "pr_type": "workout_time",
      "previous_best": 612,
      "new_best": 537,
      "improvement": 75,
      "improvement_percentage": 12.25,
      "date_previous": "2025-05-15",
      "significance": "major",
      "context": "first time under 9 minutes"
    }
  ]
}
```

#### Discipline-Specific PR Types

- **CrossFit**: workout_time, weight_lifted, reps_completed, rounds_completed
- **Powerlifting**: 1rm, competition_total, wilks_score, volume_pr
- **Bodybuilding**: rep_max, volume_pr, time_under_tension, mind_muscle_connection
- **HIIT**: interval_scores, total_reps, recovery_time, consistency
- **Running**: distance_pr, pace_pr, time_pr, negative_split
- **Swimming**: time_pr, stroke_count, technique_rating, endurance

### Subjective Feedback Structure

Comprehensive user-reported metrics for holistic training analysis:

```json
{
  "subjective_feedback": {
    "enjoyment": 8,
    "difficulty": 7,
    "form_quality": 8,
    "motivation": 9,
    "confidence": 7,
    "mental_state": "focused",
    "pacing_strategy": "negative_split",
    "nutrition_pre_workout": "banana_30min_before",
    "hydration_level": "good",
    "sleep_quality_previous": 7,
    "stress_level": 3,
    "soreness_pre": {
      "overall": 2,
      "legs": 3,
      "arms": 1,
      "back": 2
    },
    "soreness_post": {
      "overall": 6,
      "legs": 8,
      "arms": 7,
      "back": 4
    },
    "notes": "Felt strong today, weather was perfect for running"
  }
}
```

### Coach Integration Structure

AI coach interaction tracking for continuous improvement:

```json
{
  "coach_notes": {
    "programming_intent": "Test aerobic power and muscular endurance",
    "coaching_cues_given": [
      "Keep chest up during thrusters",
      "Maintain kipping rhythm on pull-ups"
    ],
    "areas_for_improvement": [
      "Pacing strategy - went out too fast",
      "Transition efficiency between exercises"
    ],
    "positive_observations": [
      "Maintained good form under fatigue",
      "Mental toughness in final round"
    ],
    "next_session_focus": "Work on pacing and transition speed",
    "adaptation_recommendations": [
      "Reduce initial intensity by 10%",
      "Practice transitions in warm-up"
    ],
    "safety_flags": [],
    "motivation_strategy": "Celebrate consistency over intensity"
  }
}
```

### Analytics Metadata

Extraction quality and processing information:

```json
{
  "metadata": {
    "logged_via": "conversation",
    "logging_time": 12,
    "data_confidence": 0.95,
    "ai_extracted": true,
    "user_verified": true,
    "version": "1.0",
    "schema_version": "2.0",
    "data_completeness": 0.87,
    "extraction_method": "claude_conversation_analysis",
    "validation_flags": ["missing_heart_rate", "estimated_calories"],
    "extraction_notes": "User provided detailed breakdown, high confidence"
  }
}
```

---

## AI Extraction Guidelines

### Core Extraction Principles

#### 1. **Context-Aware Processing**
AI should consider user's discipline, experience level, and historical patterns when interpreting workout descriptions.

```python
def extract_workout_data(user_input, user_context):
    # Consider user's primary discipline
    discipline = infer_discipline(user_input, user_context.primary_disciplines)

    # Adjust extraction based on user experience
    extraction_depth = determine_depth(user_context.experience_level)

    # Apply discipline-specific extraction patterns
    structured_data = apply_discipline_extraction(user_input, discipline)

    return structured_data
```

#### 2. **Progressive Enhancement**
Start with basic extraction and enhance with follow-up questions:

```
Initial: "I did Fran today"
Basic Extraction: {workout_name: "Fran", discipline: "crossfit"}

Follow-up: "What was your time?"
Enhanced: {workout_name: "Fran", total_time: 537}

Follow-up: "What weight did you use for thrusters?"
Complete: {workout_name: "Fran", total_time: 537, thruster_weight: 95}
```

#### 3. **Confidence Scoring**
Assign confidence levels to extracted data:

- **High Confidence (0.9+)**: Explicit numbers, clear terminology
- **Medium Confidence (0.7-0.9)**: Inferred from context, typical patterns
- **Low Confidence (0.5-0.7)**: Ambiguous language, requires verification

### Language Pattern Recognition

#### Time Expressions
```
"took me 8 minutes and 57 seconds" → total_time: 537
"finished in under 9 minutes" → total_time: <540, confidence: 0.7
"around 8 and a half minutes" → total_time: 510, confidence: 0.8
"my usual Fran time" → requires historical lookup
```

#### Weight Expressions
```
"used 95 pound thrusters" → weight: {value: 95, unit: "lbs"}
"went heavier than usual" → requires historical comparison
"RX weight" → lookup standard weights for exercise
"about 85% of my max" → percentage_1rm: 85
```

#### Rep and Set Patterns
```
"broke the 21 into 10, 6, and 5" → broken_sets: [10, 6, 5]
"did 5 sets of 8" → 5 sets, 8 reps each
"went to failure on the last set" → failure_achieved: true
"had 3 reps left in the tank" → rpe: ~7
"max pull-ups - got 15" → prescribed: "max", completed: 15
"to failure" → prescribed: "max", completed: [actual number achieved]
"AMRAP strict pull-ups" → prescribed: "max", completed: [actual reps]
```

#### Workout Score Patterns
```
"Fran in 8:57" → score: {value: 537, type: "time", unit: "seconds"}
"finished in 12 minutes 34 seconds" → score: {value: 754, type: "time", unit: "seconds"}
"got 12 rounds" → score: {value: 12, type: "rounds"}
"12 rounds plus 5 reps" → score: {value: "12+5", type: "rounds"}
"completed 347 total reps" → score: {value: 347, type: "reps"}
"max deadlift was 315 pounds" → score: {value: 315, type: "weight", unit: "lbs"}
"ran 5.2 miles total" → score: {value: 5.2, type: "distance", unit: "miles"}
```

#### Subjective Quality Indicators
```
"form felt really good" → form_quality: 8
"struggled with technique" → form_quality: 4
"absolutely crushed it" → overall_performance: 9
"feeling sore already" → immediate_fatigue: high
```

#### Comparative Statements
```
"faster than last time" → requires_previous_workout_lookup: true
"new PR" → pr_achievement: true
"worst Fran time ever" → performance_context: "poor"
"back to my normal pace" → performance_context: "typical"
```

### Discipline-Specific Extraction Patterns

#### CrossFit Terminology
```
"did it RX" → rx_status: "rx"
"scaled the weight" → rx_status: "scaled"
"time capped" → completed: false, reason: "time_cap"
"got no-repped" → form_issue: true
"kipping pull-ups" → variation: "kipping"
"strict handstand push-ups" → variation: "strict"
```

#### Powerlifting Terminology
```
"hit my opener" → attempt_type: "opener", successful: true
"missed my third" → attempt_type: "third_attempt", successful: false
"felt like RPE 8" → rpe: 8
"85% for a triple" → percentage_1rm: 85, reps: 3
"raw squat" → equipment: "raw"
"with wraps" → equipment: ["wraps"]
```

#### Bodybuilding Terminology
```
"chest day" → muscle_groups_primary: ["chest"]
"did a drop set" → intensity_techniques: "drop_set"
"went to failure" → failure_achieved: true
"really felt the pump" → pump_rating: 8+
"mind-muscle connection was on point" → mind_muscle_connection: 8+
```

#### Running Terminology
```
"tempo run" → run_type: "tempo"
"negative split" → pacing_strategy: "negative_split"
"felt easy" → effort_level: "easy"
"around 7-minute pace" → pace: "7:00"
"uphill the whole way" → terrain: "uphill"
```

### Error Handling and Validation

#### Common Extraction Errors
1. **Unit Confusion**: "95 kilos" vs "95 pounds"
2. **Time Format Ambiguity**: "8:57" could be 8m57s or 8h57m
3. **Exercise Name Variations**: "thrusters" vs "front squat to press"
4. **Scaling Context**: "light weight" without reference point

#### Validation Strategies
```python
def validate_extraction(extracted_data, user_context):
    errors = []

    # Sanity check times
    if extracted_data.get('total_time', 0) > 7200:  # >2 hours
        errors.append("duration_too_long")

    # Validate weights against user history
    if extracted_data.get('weight', 0) > user_context.max_recorded_weight * 1.5:
        errors.append("weight_unusually_high")

    # Check for required fields by discipline
    required_fields = get_required_fields(extracted_data['discipline'])
    missing_fields = [f for f in required_fields if f not in extracted_data]

    return errors, missing_fields
```

### Follow-Up Question Generation

AI should generate intelligent follow-up questions to complete extraction:

#### Based on Missing Data
```python
def generate_follow_ups(extracted_data, confidence_scores):
    questions = []

    if 'total_time' not in extracted_data and extracted_data['discipline'] == 'crossfit':
        questions.append("What was your time for that workout?")

    if confidence_scores.get('weight', 0) < 0.7:
        questions.append("What weight did you use for [exercise]?")

    if 'form_quality' not in extracted_data:
        questions.append("How did your form feel today?")

    return questions
```

#### Based on Inconsistencies
```
If time seems unusually fast: "That's a great time! Is that a new PR for you?"
If weight seems high: "That's heavy! How did the movement feel?"
If workout seems incomplete: "Did you finish all the rounds?"
```

### Extraction Workflow

#### Step 1: Initial Analysis
```python
def initial_extraction(user_input, user_context):
    # Identify discipline and workout type
    discipline = infer_discipline(user_input, user_context)
    workout_type = classify_workout_type(user_input, discipline)

    # Extract universal fields
    universal_data = extract_universal_fields(user_input)

    # Apply discipline-specific extraction
    specific_data = extract_discipline_specific(user_input, discipline)

    return merge_extraction_data(universal_data, specific_data)
```

#### Step 2: Confidence Assessment
```python
def assess_confidence(extracted_data, user_input):
    confidence_scores = {}

    for field, value in extracted_data.items():
        confidence = calculate_field_confidence(field, value, user_input)
        confidence_scores[field] = confidence

    return confidence_scores
```

#### Step 3: Validation and Enhancement
```python
def validate_and_enhance(extracted_data, confidence_scores, user_context):
    # Validate against user history and common sense
    errors = validate_extraction(extracted_data, user_context)

    # Generate follow-up questions for low confidence fields
    follow_ups = generate_follow_ups(extracted_data, confidence_scores)

    # Enhance with historical context where appropriate
    enhanced_data = enhance_with_history(extracted_data, user_context)

    return enhanced_data, follow_ups, errors
```

---

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-6)
**Goal**: Establish core extraction for primary discipline (CrossFit)

#### Technical Implementation
1. **Schema Database Setup**
   - Implement universal fields in DynamoDB
   - Create CrossFit-specific discipline structure
   - Establish analytics metadata tracking

2. **Basic AI Extraction**
   - Named workout recognition (Fran, Murph, etc.)
   - Time and weight extraction
   - Basic rep scheme parsing

3. **Validation Pipeline**
   - Sanity checking for extracted values
   - User confirmation workflow
   - Confidence scoring implementation

#### Success Metrics
- 90%+ accuracy on named CrossFit workouts
- User verification rate <20%
- Complete extraction for 80% of workout logs

### Phase 2: Enhancement (Weeks 7-12)
**Goal**: Advanced CrossFit extraction and second discipline (Powerlifting)

#### Technical Implementation
1. **Advanced CrossFit Features**
   - Complex workout parsing (chippers, ladders)
   - Scaling detection and tracking
   - PR identification and comparison

2. **Powerlifting Integration**
   - Attempt structure extraction
   - RPE and percentage tracking
   - Equipment and setup recognition

3. **Cross-Discipline Analytics**
   - Training balance analysis
   - Progress tracking across disciplines
   - Interference effect monitoring

#### Success Metrics
- Support for 95% of common workout formats
- Powerlifting extraction accuracy >85%
- User retention through multi-discipline support

### Phase 3: Expansion (Weeks 13-24)
**Goal**: Additional disciplines and advanced analytics

#### Technical Implementation
1. **Bodybuilding and HIIT Support**
   - Muscle group tracking
   - Volume accumulation
   - Interval protocol recognition

2. **Endurance Sports Integration**
   - Running pace and segment tracking
   - Swimming stroke and technique analysis
   - Cycling power and route data

3. **Advanced Analytics Platform**
   - Predictive performance modeling
   - Injury risk assessment
   - Periodization optimization

#### Success Metrics
- 5+ disciplines fully supported
- Advanced analytics feature adoption >60%
- User engagement increase through insights

### Phase 4: Intelligence (Weeks 25+)
**Goal**: AI-driven insights and optimization

#### Technical Implementation
1. **Predictive Analytics**
   - Performance trajectory modeling
   - Optimal training load recommendations
   - Plateau prediction and intervention

2. **Automated Coaching**
   - Workout modification suggestions
   - Recovery recommendations
   - Goal progression planning

3. **Community Features**
   - Benchmark comparisons
   - Training partner matching
   - Challenge and competition integration

---

## Extension Guide

### Adding New Disciplines

#### Step 1: Define Discipline Requirements
```markdown
## New Discipline: Rock Climbing

### Core Characteristics
- Route-based progression (grades: 5.6, 5.7, etc.)
- Technique-focused with strength component
- Indoor vs. outdoor variations
- Multiple climbing styles (sport, trad, bouldering)

### Key Metrics to Track
- Route grade and completion
- Attempt count to completion
- Technique quality
- Fear/confidence levels
- Equipment used
```

#### Step 2: Design Discipline Schema
```json
{
  "discipline_specific": {
    "climbing": {
      "climbing_type": "sport|trad|bouldering|top_rope",
      "location": "indoor|outdoor",
      "routes": [
        {
          "route_name": "string",
          "grade": "5.6|5.7|V1|V2|etc",
          "attempts": "integer",
          "completed": "boolean",
          "style": "onsight|flash|redpoint|top_rope",
          "technique_quality": "integer[1-10]",
          "fear_level": "integer[1-10]",
          "equipment": ["quickdraws", "helmet", "etc"]
        }
      ]
    }
  }
}
```

#### Step 3: Define Extraction Patterns
```python
CLIMBING_PATTERNS = {
    "grade_extraction": r"5\.\d+[a-d]?|V\d+",
    "completion_terms": ["sent", "completed", "topped out", "fell"],
    "attempt_patterns": ["first try", "took 3 attempts", "after several goes"],
    "fear_indicators": ["scary", "intimidating", "felt comfortable", "confident"]
}
```

#### Step 4: Implement PR Types
```python
CLIMBING_PR_TYPES = [
    "hardest_grade_sent",
    "onsight_grade",
    "flash_grade",
    "route_speed",
    "session_volume"
]
```

### Adding Methodology Support

#### Example: Adding 5/3/1 Powerlifting Methodology
```json
{
  "methodology_specific": {
    "531": {
      "week_type": "5s|3s|1s|deload",
      "cycle_number": "integer",
      "main_lift_percentage": "number",
      "joker_sets": "boolean",
      "assistance_template": "BBB|FSL|SSL|etc",
      "training_max": "number"
    }
  }
}
```

### Extending Analytics Capabilities

#### Custom Metric Addition
```python
def add_custom_metric(discipline, metric_name, calculation_function):
    """
    Add discipline-specific analytics metric

    Args:
        discipline: Target discipline
        metric_name: Name of the new metric
        calculation_function: Function to calculate metric from workout data
    """
    DISCIPLINE_METRICS[discipline][metric_name] = calculation_function
```

#### Cross-Discipline Analysis
```python
def analyze_cross_training_effects(user_workouts):
    """
    Analyze how different disciplines affect each other

    Returns:
        interference_effects: How cardio affects strength, etc.
        synergy_opportunities: Complementary training combinations
        periodization_suggestions: Optimal training distribution
    """
    pass
```

---

## Complete Schema Reference

### Universal Workout Schema v2.0

```json
{
  "workout_id": "user123_20250703_001",
  "user_id": "user123",
  "date": "2025-07-03",
  "discipline": "crossfit",
  "methodology": "comptrain",
  "workout_name": "Fran",
  "workout_type": "metcon",
  "duration": 45,
  "location": "gym",
  "coach_id": "user123_coach_main",
  "conversation_id": "conv_456",

  "performance_metrics": {
    "intensity": 8,
    "perceived_exertion": 9,
    "heart_rate": {
      "avg": 165,
      "max": 185,
      "zones": {
        "zone_1": 45,
        "zone_2": 120,
        "zone_3": 245,
        "zone_4": 127,
        "zone_5": 0
      }
    },
    "calories_burned": 245,
    "mood_pre": 7,
    "mood_post": 8,
    "energy_level_pre": 6,
    "energy_level_post": 4
  },

  "discipline_specific": {
    "crossfit": {
      "workout_format": "for_time",
      "time_cap": 900,
      "rx_status": "rx",
      "rounds": [
        {
          "round_number": 1,
          "rep_scheme": "21-15-9",
          "exercises": [
            {
              "exercise_name": "thruster",
              "movement_type": "barbell",
              "weight": {
                "value": 95,
                "unit": "lbs",
                "percentage_1rm": 65,
                "rx_weight": 95,
                "scaled_weight": null
              },
              "reps": {
                "prescribed": 21,
                "completed": 21,
                "broken_sets": [10, 6, 5],
                "rest_between_sets": [15, 20]
              },
              "distance": null,
              "calories": null,
              "time": null,
              "form_notes": "Good depth, need to work on front rack position"
            },
            {
              "exercise_name": "pull_up",
              "movement_type": "gymnastics",
              "variation": "chest_to_bar",
              "assistance": "none",
              "reps": {
                "prescribed": 21,
                "completed": 21,
                "broken_sets": [8, 7, 6],
                "rest_between_sets": [25, 30]
              },
              "form_notes": "Good kipping rhythm, maintained strict form"
            }
          ]
        }
      ],
      "performance_data": {
        "total_time": 537,
        "rounds_completed": 3,
        "total_reps": 126,
        "round_times": [195, 148, 194],
        "score": {
          "value": 537,
          "type": "time",
          "unit": "seconds"
        }
      }
    }
  },

  "pr_achievements": [
    {
      "exercise": "fran",
      "discipline": "crossfit",
      "pr_type": "workout_time",
      "previous_best": 612,
      "new_best": 537,
      "improvement": 75,
      "improvement_percentage": 12.25,
      "date_previous": "2025-05-15",
      "significance": "major",
      "context": "first time under 9 minutes"
    }
  ],

  "subjective_feedback": {
    "enjoyment": 8,
    "difficulty": 7,
    "form_quality": 8,
    "motivation": 9,
    "confidence": 7,
    "mental_state": "focused",
    "pacing_strategy": "went_out_too_fast",
    "nutrition_pre_workout": "banana_30min_before",
    "hydration_level": "good",
    "sleep_quality_previous": 7,
    "stress_level": 3,
    "soreness_pre": {
      "overall": 2,
      "legs": 3,
      "arms": 1,
      "back": 2
    },
    "soreness_post": {
      "overall": 6,
      "legs": 8,
      "arms": 7,
      "back": 4
    },
    "notes": "Felt strong today, great workout to start the week"
  },

  "environmental_factors": {
    "temperature": 72,
    "humidity": 45,
    "altitude": 5280,
    "equipment_condition": "good",
    "gym_crowding": "moderate"
  },

  "recovery_metrics": {
    "hrv_morning": 42,
    "resting_heart_rate": 58,
    "sleep_hours": 7.5,
    "stress_level": 4,
    "readiness_score": 7
  },

  "coach_notes": {
    "programming_intent": "Test aerobic power and muscular endurance",
    "coaching_cues_given": [
      "Keep chest up during thrusters",
      "Maintain kipping rhythm on pull-ups",
      "Breathe during transitions"
    ],
    "areas_for_improvement": [
      "Pacing strategy - went out too fast",
      "Transition efficiency between exercises"
    ],
    "positive_observations": [
      "Maintained good form under fatigue",
      "Mental toughness in final round"
    ],
    "next_session_focus": "Work on pacing and transition speed",
    "adaptation_recommendations": [
      "Reduce initial intensity by 10%",
      "Practice transitions in warm-up"
    ],
    "safety_flags": [],
    "motivation_strategy": "Celebrate consistency over intensity"
  },

  "metadata": {
    "logged_via": "conversation",
    "logging_time": 12,
    "data_confidence": 0.95,
    "ai_extracted": true,
    "user_verified": true,
    "version": "1.0",
    "schema_version": "2.0",
    "data_completeness": 0.87,
    "extraction_method": "claude_conversation_analysis",
    "validation_flags": ["missing_heart_rate", "estimated_calories"],
    "extraction_notes": "User provided detailed breakdown, high confidence"
  }
}
```

---

## Conclusion

This Universal Multi-Discipline Workout Schema provides the foundation for sophisticated AI-powered fitness coaching that can understand, track, and optimize training across any fitness discipline. The combination of universal consistency and discipline-specific flexibility enables:

- **Rich Analytics**: Comprehensive progress tracking and trend analysis
- **Intelligent Coaching**: Context-aware AI coaches that understand methodology and individual needs
- **Seamless User Experience**: Natural conversation-based logging without rigid forms
- **Scalable Growth**: Easy expansion to new disciplines and training methodologies

The schema's conversation-first design philosophy ensures that users can naturally describe their workouts while the AI extracts structured data that enables sophisticated analysis, personalized coaching, and long-term progress optimization.

---

*Schema Version 2.0 | Documentation Last Updated: July 2025*
