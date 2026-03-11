# The Coach Creator's Assembler Pattern

Building a custom AI coach isn't simple. You need to orchestrate personality, methodology, scientific principles, and implementation details. We solved this with the **Assembler Pattern**.

When you design a coach, the Coach Creator Agent runs an 8-step pipeline:

**Step 1: Load Requirements** → Validate user inputs (goals, discipline, coaching style, constraints).

**Step 2: Select Personality Template** → Choose from curated personality archetypes (Mentor, Drill Sergeant, Scientist, Cheerleader, etc.). These are prompt templates optimized for different coaching vibes.

**Step 3: Select Methodology** → Map discipline + goals to a training methodology (Conjugate Method, Linear Periodization, Block Periodization, German Volume Training, etc.).

**Step 4: Generate Prompts** → AI synthesizes methodology + personality into a detailed system prompt for the coach.

**Step 5: Assemble Config** → Build the coach configuration object with all parameters, constraints, and metadata.

**Step 6: Validate** → Tool-use with an evaluator pattern. Does this coach make sense? Will it actually work? Validation agents check for logical consistency, methodology alignment, and practical feasibility.

**Step 7: Normalize** → Standardize config format, remove redundancies, optimize for inference performance.

**Step 8: Save** → Persist the coach to the database.

The magic is in the **tool-use orchestration**. Each step is a specialized tool that the Claude Agent calls in sequence. The router intelligently decides which tool to call and when, handling branching and error recovery.

This is why NeonPanda coaches feel like they were built *for you* — because they were. Not templated. Not generic. Assembled.

Deep dive coming in the next blog post.

#AI #MultiAgent #ToolUse #SystemDesign #FitnessTech #NeonPanda #Agentic #SoftwareArchitecture