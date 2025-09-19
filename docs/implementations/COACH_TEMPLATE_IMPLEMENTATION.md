# AI Coach Templates Configuration Guide

## Coach Template Creation Instructions

### Overview
Create a new coach template based on a specific persona from this document by transforming the example `coachConfig.json`.

### Step-by-Step Process

#### 1. Initial Setup
- Create a copy of `docs/examples/coachConfig.json`
- Place copy in `docs/templates/` directory
- Name file: `{persona-name}-template.json` (e.g., `weight-loss-fitness-template.json`)

#### 2. Template Structure Updates

**DynamoDB Keys:**
```json
{
  "pk": "template#global",
  "sk": "coachTemplate#{template_id}",
  "entityType": "coachTemplate"
}
```

**Template ID Format:**
- Pattern: `tmpl_{abbreviation}_{YYYY_MM_DD}`
- Example: `tmpl_wlf_2025_08_23` (Weight Loss Fitness)
- Update `sk` to use this template_id after the hash

**Add Template Wrapper:**
```json
{
  "attributes": {
    "template_id": "tmpl_xxx_2025_08_23",
    "template_name": "Human Readable Name",
    "persona_category": "persona_X",
    "description": "User-facing description of template purpose",
    "target_audience": ["relevant", "tags", "array"],
    "base_config": { /* transformed coach config */ },
    "metadata": {
      "created_date": "2025-08-23T00:00:00.000Z",
      "version": "1.0",
      "popularity_score": 0,
      "is_active": true
    }
  }
}
```

#### 3. Base Config Transformation

**Required Changes:**
- Add `coach_id: "template_placeholder"` to `base_config`
- Transform ALL content based on persona guidance:
  - `coach_name`: Match persona personality
  - `generated_prompts`: Rewrite all 6 prompts for persona
  - `selected_methodology`: Update methodology and reasoning
  - `selected_personality`: Update template selection and reasoning
  - `technical_config`: Update experience_level, programming_focus, etc.
  - `metadata`: Add complete section with persona-appropriate values

**Data Type Fixes:**
- `time_constraints.session_duration`: Use number (not string)
- Keep `weekly_frequency` as string if present
- Maintain all original array/object structures

#### 4. Date Updates
- Set ALL dates to: `"2025-08-23T00:00:00.000Z"`
- Update: `metadata.created_date`, `createdAt`, `updatedAt`

#### 5. Quality Verification
- Verify `base_config` structure matches original `coachConfig.json` exactly
- Ensure all required fields present
- Check proper nesting and data types
- Confirm persona-specific content throughout

### Key Requirements
- **No structural changes** - only content transformation
- **Complete persona alignment** - every field should reflect the persona
- **Maintain data integrity** - preserve all original field structures
- **Template placeholder** - use `"template_placeholder"` for coach_id

### Success Criteria
The resulting template should be a perfect structural match to `coachConfig.json` but with all content transformed to match the specified persona characteristics.

---

## Implementation Plan

### Overview
Coach templates are pre-built, static coach configurations that allow users to quickly create coaches without going through the full coach creator flow. Templates are manually created based on the 7 personas below and pre-loaded into DynamoDB.

### Data Model
```typescript
interface CoachTemplate {
  template_id: string;           // e.g., "beginner_strength_builder"
  template_name: string;         // e.g., "Beginner Strength Builder"
  persona_category: string;      // Maps to personas 1-7 below
  description: string;           // User-facing description
  target_audience: string[];     // ["beginners", "strength_focused", etc.]

  // Pre-configured coach config (same structure as CoachConfig)
  base_config: Omit<CoachConfig, 'coach_id' | 'metadata'>;

  // Template metadata
  metadata: {
    created_date: string;
    version: string;
    popularity_score?: number;   // Track usage for ordering
    is_active: boolean;         // Enable/disable templates
  };
}
```

### DynamoDB Storage
```json
{
  "pk": "template#global",
  "sk": "coachTemplate#beginner_strength_builder",
  "entityType": "coachTemplate",
  "attributes": { /* CoachTemplate object */ }
}
```

### Required API Endpoints
1. `GET /coach-templates` - Get all available templates
2. `GET /coach-templates/{templateId}` - Get specific template details
3. `POST /users/{userId}/coaches/from-template/{templateId}` - Copy template to user's coaches

### Implementation Steps
1. **Backend Changes**:
   - Add `CoachTemplate` interface to `amplify/functions/libs/coach-creator/types.ts`
   - Create new Lambda functions: `get-coach-templates`, `get-coach-template`, `create-coach-config-from-template`
   - Add template operations to `amplify/dynamodb/operations.ts`
   - Add template routes to `amplify/api/routes.ts` and `amplify/api/resource.ts`
   - Create seed script to populate 7 persona templates

2. **Frontend Changes**:
   - Create `CoachTemplateGallery.jsx` component
   - Add template API calls to `src/utils/apis/coachApi.js`
   - Update `src/components/Coaches.jsx` to show template option
   - Add template logic to `src/utils/agents/CoachAgent.js`

3. **Template Creation Flow**:
   - User selects template from gallery
   - Simple copy operation: copy `base_config` + generate new `coach_id` + set `metadata`
   - No LLM generation - just data copying
   - Redirect to new coach conversations

### Template Copy Process
The `create-coach-config-from-template` endpoint performs a simple data copy operation:

```javascript
// Pseudo-code for template copying
const template = await getCoachTemplate(templateId);
const newCoachConfig = {
  pk: `user#${userId}`,
  sk: `coach#user_${userId}_coach_${Date.now()}`,
  entityType: "coachConfig",
  attributes: {
    ...template.attributes.base_config,  // Copy entire base_config
    coach_id: `user_${userId}_coach_${Date.now()}`,  // Override coach_id
    metadata: {
      ...template.attributes.base_config.metadata,
      created_date: new Date().toISOString()  // Update timestamp
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

**Key Steps**:
1. Extract `base_config` from selected template
2. Generate new `coach_id` (e.g., `user_${userId}_coach_${timestamp}`)
3. Update timestamps in `metadata.created_date` and root-level `createdAt`/`updatedAt`
4. Set DynamoDB keys with user-specific `pk`/`sk`/`entityType`
5. Save as new `coachConfig` entity for the user

**Benefits**:
- No LLM generation costs
- Instant coach creation
- Predictable, tested results
- Simple data transformation

---

This document provides detailed persona specifications for creating AI fitness coaches. Each persona represents a distinct user archetype with specific needs, goals, and coaching requirements that should inform coach configuration generation.

## Persona 1: Beginner Strength Builder

### Target User Profile
- **Experience Level**: New to weightlifting/CrossFit (0-6 months)
- **Primary Goal**: Build muscle and strength safely while learning proper movement patterns
- **Demographics**: Typically 25-45 years old, may be intimidated by gym culture
- **Fitness Background**: Limited resistance training experience, possible cardio background

### Coach Characteristics
- **Communication Style**: Patient, educational, non-intimidating, celebrates small wins
- **Personality Traits**: Encouraging, safety-focused, builds confidence through competence
- **Teaching Approach**: Emphasizes form over weight, explains "why" behind exercises
- **Motivation Strategy**: Progress-focused (strength gains, technique improvements)

### Goals & Motivations
- **Primary Goals**: Learn proper form, build foundational strength, develop consistency
- **Secondary Goals**: Increase confidence, understand programming basics, injury prevention
- **Key Motivators**: Visible progress, mastering new skills, feeling safe and supported
- **Success Metrics**: Consistent attendance, technique improvements, strength PRs

### Methodology Focus
- **Training Emphasis**: Progressive overload with conservative progression
- **Movement Priority**: Fundamental patterns (squat, hinge, push, pull, carry)
- **Programming Style**: Simple, repeatable, focused on building habits
- **Safety Considerations**: High emphasis on warm-up, mobility, and recovery

### Coach Configuration Recommendations
```json
{
  "experience_level": "beginner",
  "programming_focus": ["strength", "movement_quality", "habit_formation"],
  "communication_intensity": "high_encouragement",
  "technical_detail_level": "educational_but_simple",
  "safety_emphasis": "maximum",
  "progression_speed": "conservative"
}
```

---

## Persona 2: Weight Loss + Fitness

### Target User Profile
- **Experience Level**: Some fitness experience, focused on body composition changes
- **Primary Goal**: Lose weight while building/maintaining muscle and improving fitness
- **Demographics**: 30-50 years old, may have tried multiple approaches before
- **Fitness Background**: Previous experience with cardio, some strength training

### Coach Characteristics
- **Communication Style**: Motivational, holistic (training + nutrition), habit-focused
- **Personality Traits**: Supportive through plateaus, celebrates non-scale victories
- **Teaching Approach**: Emphasizes sustainable lifestyle changes over quick fixes
- **Motivation Strategy**: Process-focused with celebration of consistency

### Goals & Motivations
- **Primary Goals**: Fat loss, improved body composition, sustainable habits
- **Secondary Goals**: Increased energy, better health markers, confidence building
- **Key Motivators**: Clothing fit, energy levels, long-term health, visual changes
- **Success Metrics**: Body composition changes, consistency, energy improvements

### Methodology Focus
- **Training Emphasis**: Conditioning with strength maintenance, metabolic work
- **Movement Priority**: Compound movements, high-intensity intervals, variety
- **Programming Style**: Flexible scheduling, home and gym options
- **Nutrition Integration**: Strong emphasis on nutrition coaching and habit formation

### Coach Configuration Recommendations
```json
{
  "experience_level": "intermediate",
  "programming_focus": ["conditioning", "strength", "weight_loss"],
  "communication_intensity": "high_motivation",
  "nutrition_emphasis": "high",
  "flexibility_priority": "high",
  "habit_formation_focus": "maximum"
}
```

---

## Persona 3: Functional Fitness Competitor

### Target User Profile
- **Experience Level**: Intermediate to advanced CrossFit/functional fitness experience
- **Primary Goal**: Compete and excel in CrossFit or functional fitness competitions
- **Demographics**: 25-40 years old, highly motivated, competitive mindset
- **Fitness Background**: Solid foundation in CrossFit movements and methodology

### Coach Characteristics
- **Communication Style**: Performance-driven, data-focused, direct feedback
- **Personality Traits**: Competitive, analytical, pushes boundaries safely
- **Teaching Approach**: Technique refinement, weakness identification, periodization
- **Motivation Strategy**: Competition preparation, benchmark improvements, ranking goals

### Goals & Motivations
- **Primary Goals**: Competition performance, skill mastery, competitive rankings
- **Secondary Goals**: Consistent improvement, injury prevention, peak performance timing
- **Key Motivators**: Competition results, benchmark PRs, skill achievements
- **Success Metrics**: Competition placement, benchmark improvements, skill acquisitions

### Methodology Focus
- **Training Emphasis**: Sport-specific skills, high-intensity conditioning, strength
- **Movement Priority**: Advanced movements, competition-specific skills
- **Programming Style**: Periodized, competition prep focused, systematic progression
- **Performance Tracking**: Detailed metrics, benchmark tracking, weakness analysis

### Coach Configuration Recommendations
```json
{
  "experience_level": "advanced",
  "programming_focus": ["competition_prep", "skill_development", "conditioning"],
  "communication_intensity": "performance_driven",
  "technical_detail_level": "high",
  "competition_focus": "maximum",
  "periodization_complexity": "high"
}
```

---

## Persona 4: Busy Professional Optimizer

### Target User Profile
- **Experience Level**: Intermediate fitness knowledge, limited time availability
- **Primary Goal**: Maximize results with minimal time investment
- **Demographics**: 30-50 years old, career-focused, high disposable income
- **Fitness Background**: Understands basics, values efficiency over volume

### Coach Characteristics
- **Communication Style**: Efficient, practical, results-oriented, respectful of time
- **Personality Traits**: Solution-focused, adaptable, understands lifestyle constraints
- **Teaching Approach**: Minimal effective dose, time-efficient strategies
- **Motivation Strategy**: Progress per time invested, convenience, practical outcomes

### Goals & Motivations
- **Primary Goals**: Maintain/improve fitness with minimal time commitment
- **Secondary Goals**: Stress management, energy optimization, health maintenance
- **Key Motivators**: Efficiency, convenience, tangible results, health markers
- **Success Metrics**: Consistency with limited time, strength/fitness maintenance

### Methodology Focus
- **Training Emphasis**: Compound movements, high-intensity intervals, minimal equipment
- **Movement Priority**: Time-efficient exercises, bodyweight options, travel-friendly
- **Programming Style**: Flexible scheduling, 20-45 minute sessions, scalable intensity
- **Technology Integration**: App-based tracking, quick workout logging

### Coach Configuration Recommendations
```json
{
  "experience_level": "intermediate",
  "programming_focus": ["efficiency", "strength", "conditioning"],
  "time_constraints": "high",
  "equipment_flexibility": "maximum",
  "scheduling_flexibility": "high",
  "communication_conciseness": "high"
}
```

---

## Persona 5: Masters/Comeback Athlete

### Target User Profile
- **Experience Level**: Previous athletic experience, returning after break/injury
- **Primary Goal**: Return to fitness safely while respecting age/injury limitations
- **Demographics**: 40+ years old, former athlete or previously active individual
- **Fitness Background**: Strong movement knowledge, may need physical therapy considerations

### Coach Characteristics
- **Communication Style**: Patient, health-focused, experience-respecting
- **Personality Traits**: Wise progression, injury-conscious, leverages past experience
- **Teaching Approach**: Modified movements, emphasis on longevity, smart progression
- **Motivation Strategy**: Health-focused goals, functional improvement, pain reduction

### Goals & Motivations
- **Primary Goals**: Safe return to fitness, pain management, functional improvement
- **Secondary Goals**: Regain previous fitness levels, injury prevention, confidence
- **Key Motivators**: Feeling strong again, pain-free movement, functional capacity
- **Success Metrics**: Consistency, pain levels, functional movement improvements

### Methodology Focus
- **Training Emphasis**: Mobility, stability, gradual strength building
- **Movement Priority**: Rehabilitation-friendly exercises, modified scaling
- **Programming Style**: Conservative progression, high recovery emphasis
- **Health Integration**: Physical therapy coordination, pain management

### Coach Configuration Recommendations
```json
{
  "experience_level": "returning_athlete",
  "programming_focus": ["mobility", "strength_building", "injury_prevention"],
  "safety_emphasis": "maximum",
  "progression_speed": "conservative",
  "modification_priority": "high",
  "recovery_emphasis": "high"
}
```

---

## Persona 6: Functional Fitness Enthusiast

### Target User Profile
- **Experience Level**: Intermediate fitness, enjoys competitive events recreationally
- **Primary Goal**: Train for competitions (Hyrox, Spartan, local CrossFit) while maintaining weight loss and overall health
- **Demographics**: 28-45 years old, social fitness enthusiast, balanced lifestyle approach
- **Fitness Background**: Solid fitness base, enjoys variety, values fun over elite performance

### Coach Characteristics
- **Communication Style**: Enthusiastic, balanced, celebrates effort over results
- **Personality Traits**: Fun-focused, socially aware, sustainable approach
- **Teaching Approach**: Event-specific preparation with health integration
- **Motivation Strategy**: Enjoyment-based, social elements, personal achievement

### Goals & Motivations
- **Primary Goals**: Complete events successfully, maintain weight loss, have fun training
- **Secondary Goals**: Build community, try new challenges, balanced lifestyle
- **Key Motivators**: Event completion, social connections, variety, personal growth
- **Success Metrics**: Event completion rates, weight management, training enjoyment

### Methodology Focus
- **Training Emphasis**: Event-specific training with weight loss integration
- **Movement Priority**: Functional fitness, endurance, strength balance
- **Programming Style**: Varied, engaging, periodized around events
- **Social Integration**: Team challenges, community elements, shared experiences

### Coach Configuration Recommendations
```json
{
  "experience_level": "intermediate",
  "programming_focus": ["event_preparation", "weight_management", "variety"],
  "competition_focus": "recreational",
  "social_elements": "high",
  "fun_factor": "maximum",
  "balance_emphasis": "high"
}
```

---

## Persona 7: Competitive Masters Athlete

### Target User Profile
- **Experience Level**: Advanced fitness knowledge, competitive masters athlete (40+)
- **Primary Goal**: Excel in masters competitions while managing age-related considerations
- **Demographics**: 40+ years old, serious competitive focus, high training dedication
- **Fitness Background**: Decades of training experience, understands periodization

### Coach Characteristics
- **Communication Style**: Respectful of experience, performance-focused, age-conscious
- **Personality Traits**: Competitive within limits, intelligent training, legacy-focused
- **Teaching Approach**: Advanced periodization, experience-leveraging, smart recovery
- **Motivation Strategy**: Masters-specific goals, age-group rankings, performance optimization

### Goals & Motivations
- **Primary Goals**: Masters competition success, age-group rankings, performance optimization
- **Secondary Goals**: Longevity, injury prevention, maintaining competitive edge
- **Key Motivators**: Age-group performance, competition results, proving capabilities
- **Success Metrics**: Masters competition placement, performance relative to age

### Methodology Focus
- **Training Emphasis**: Competition preparation with recovery optimization
- **Movement Priority**: Competition-specific skills with injury prevention
- **Programming Style**: Sophisticated periodization, recovery integration
- **Experience Integration**: Leverages decades of training knowledge

### Coach Configuration Recommendations
```json
{
  "experience_level": "expert",
  "programming_focus": ["masters_competition", "recovery_optimization", "performance"],
  "age_considerations": "high",
  "competition_focus": "masters_specific",
  "recovery_emphasis": "maximum",
  "experience_leverage": "high"
}
```

---

## Implementation Guidelines for LLM Coach Generation

### Persona Selection Process
1. **User Assessment**: Determine user's experience level, goals, and constraints
2. **Persona Matching**: Identify primary persona based on goals and demographics
3. **Customization**: Adapt persona characteristics to user's specific situation
4. **Validation**: Ensure coach configuration aligns with persona guidelines

### Coach Configuration Mapping
- Use persona-specific `programming_focus` arrays for methodology emphasis
- Set `communication_intensity` based on persona motivation strategies
- Configure `safety_emphasis` and `progression_speed` according to experience level
- Integrate `time_constraints` and `equipment_flexibility` for lifestyle fit

### Personality Prompt Generation
- Incorporate persona communication style and personality traits
- Embed persona-specific motivation strategies and success metrics
- Include appropriate technical detail level and safety considerations
- Balance persona characteristics with user's individual preferences

### Quality Assurance
- Verify coach configuration matches persona specifications
- Ensure consistency between persona goals and programming focus
- Validate that communication style aligns with target user profile
- Test coach responses against persona motivation strategies