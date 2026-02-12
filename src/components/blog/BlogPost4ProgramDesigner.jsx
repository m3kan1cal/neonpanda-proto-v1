import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost4ProgramDesigner() {
  return (
    <>
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-rajdhani text-xl text-white leading-relaxed italic">
            "I want to lose some body fat and build muscle at the same time.
            I've been doing CrossFit three days a week for about a year but I
            want more structure. I've got a home gym with a barbell and
            dumbbells, but no rack, and I tweaked my lower back deadlifting last
            month so I'm being careful with that. Oh, and there's a local
            throwdown in April I'd love to not embarrass myself at..."
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          That's not a prompt. That's a real human with real constraints, real
          goals, and a real life asking for something that used to require a
          qualified coach and a $200/month price tag. It takes years of
          education and practical experience for a human to turn those
          constraints into a training program that actually works.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          In the background, our Program Designer Agent is about to orchestrate
          dozens of AI calls across multiple models, query methodology
          databases, pull insights from your workout history and saved memories,
          design intelligent periodization, generate 36+ individual workouts,
          validate everything for safety, and deliver a complete program—while
          you continue chatting with your coach about that upcoming throwdown.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-pink font-semibold">
            This is where agentic AI earns its name.
          </span>{" "}
          Individual workouts build fitness. Structured programs build athletes.
          And building good programs is the hardest thing we do.
        </p>
      </section>

      {/* The Problem */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Problem: Programs Are Hard (Even for Experts)
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's a truth that most fitness apps won't tell you: generating a
          single workout is relatively easy. String together some exercises, add
          sets and reps, call it a day. But generating a{" "}
          <em>multi-week program with intelligent periodization</em>? That's an
          entirely different beast—one that most AI fitness products quietly
          avoid or handle with cookie-cutter templates.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            Why Program Design Is the Boss Fight
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Temporal coherence:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Week 8 has to make sense in the context of Week 1 and Week 12.
                  You can't design training days in isolation—each workout is a
                  thread in a larger tapestry. One bad week can derail the whole
                  program.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Discipline-specific methodology:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  A powerlifting peaking program and a CrossFit Open prep
                  program have almost nothing in common structurally. Different
                  periodization models, different progression schemes, different
                  volume/intensity relationships. You can't fake this with a
                  generic template.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Constraint satisfaction:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Three training days, a tweaked back, limited equipment, a
                  competition deadline, body recomp goals—these constraints
                  interact with each other in ways that simple AI prompting
                  can't handle. A back injury doesn't just remove deadlifts—it
                  changes your entire pulling and loading strategy.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Computational scale:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  A 12-week, 3-day program means 36 individual workouts, each
                  with warm-ups, main work, accessories, and cooldowns. That's
                  potentially hundreds of exercises that all need to fit
                  together. You can't generate this in a single LLM call without
                  the quality falling apart.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Living context:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  A truly intelligent program doesn't exist in a vacuum. It
                  needs to account for your training history, saved memories
                  (that back tweak, your favorite movements), and ongoing goals.
                  The program should feel like it was written by someone who
                  actually knows you—because it was.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          This is why most AI fitness tools either avoid program design entirely
          or produce programs that look reasonable for about two weeks before
          the cracks show. We needed an approach that thinks like a real
          programming coach—designing the macro structure first, then filling in
          the details with discipline-specific expertise, grounded in everything
          we know about you.
        </p>
      </section>

      {/* Purpose-Built for 10 Disciplines */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Speaking Ten Languages: Methodology Intelligence
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Different disciplines don't just have different exercises—they have
          entirely different philosophies about how training should be
          structured over time. A powerlifting coach thinks in blocks and
          percentages. A CrossFit coach thinks in capacity and skill
          development. A running coach thinks in mileage phases and taper
          protocols. And some athletes don't fit neatly into any single
          discipline at all—they just want to get fitter, stronger, and more
          capable. The Program Designer speaks all ten fluently.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            10 Disciplines, 10 Programming Philosophies
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                name: "CrossFit",
                focus: "GPP, skills, metabolic conditioning",
                example: "Conjugate-style with MetCon waves",
                color: "pink",
              },
              {
                name: "Powerlifting",
                focus: "SBD strength, peaking cycles",
                example: "Block periodization to competition",
                color: "cyan",
              },
              {
                name: "Olympic Weightlifting",
                focus: "Snatch, C&J, technique",
                example: "Bulgarian-influenced frequency work",
                color: "purple",
              },
              {
                name: "Bodybuilding",
                focus: "Hypertrophy, aesthetics, balance",
                example: "Progressive overload with deloads",
                color: "pink",
              },
              {
                name: "Running",
                focus: "Endurance, speed work, racing",
                example: "Base → tempo → speed → taper",
                color: "cyan",
              },
              {
                name: "HYROX",
                focus: "Hybrid fitness racing",
                example: "Run/station alternation training",
                color: "purple",
              },
              {
                name: "Calisthenics",
                focus: "Bodyweight mastery, skills",
                example: "Skill progressions with strength",
                color: "pink",
              },
              {
                name: "Functional Bodybuilding",
                focus: "Movement quality + muscle",
                example: "Tempo work with mobility focus",
                color: "cyan",
              },
              {
                name: "Circuit Training",
                focus: "Station-based intervals",
                example: "Periodized intensity waves",
                color: "purple",
              },
              {
                name: "Hybrid",
                focus: "Methodology-agnostic fitness",
                example: "Best of all worlds, your way",
                color: "pink",
              },
            ].map((discipline, idx) => (
              <div
                key={idx}
                className="bg-synthwave-bg-primary/30 rounded-lg p-4"
              >
                <h4
                  className={`font-rajdhani font-semibold ${
                    discipline.color === "pink"
                      ? "text-synthwave-neon-pink"
                      : discipline.color === "cyan"
                        ? "text-synthwave-neon-cyan"
                        : "text-synthwave-neon-purple"
                  } mb-1`}
                >
                  {discipline.name}
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-xs mb-1">
                  {discipline.focus}
                </p>
                <p className="text-synthwave-text-muted font-rajdhani text-xs italic">
                  {discipline.example}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Hybrid Discipline: For the Methodology-Agnostic Athlete
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Not everyone identifies with a single training methodology. You
            might love Olympic lifting on Mondays, do a MetCon on Wednesdays,
            and hit a bodybuilding session on Fridays. The Hybrid discipline was
            built for athletes who don't want to be boxed in—it draws from the
            entire methodology library to create programs that are truly yours,
            blending the best principles from across all disciplines.
          </p>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Methodology Alignment via Pinecone
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Each discipline has its own methodology library stored as semantic
            embeddings in Pinecone. When the Program Designer builds a
            powerlifting program, it retrieves powerlifting-specific
            knowledge—not generic fitness advice. This is the same RAG
            (Retrieval-Augmented Generation) approach from Posts 2 and 3, but
            applied to programming methodology.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Methodology retrieval for program design
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const methodology = await queryPinecone({`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`  query: "12-week body recomp with CrossFit background",`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  filter: { discipline: "hybrid", type: "methodology" },`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`  topK: 10`}
            </div>
            <div className="text-synthwave-neon-cyan">{`});`}</div>
            <div className="text-synthwave-text-muted mt-3">
              // Returns: periodization models, volume guidelines,
            </div>
            <div className="text-synthwave-text-muted">
              // progression protocols, exercise selection principles
            </div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            This means the AI isn't guessing about how to structure your
            program—it's grounding its decisions in established coaching
            methodology. The methodology library includes proven periodization
            models, exercise selection principles, volume/intensity guidelines,
            and competition preparation protocols.
          </p>
        </div>
      </section>

      {/* The Design Conversation */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Design Conversation: Discovery Before Design
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          A good human coach doesn't start writing a program after hearing "I
          want to get fitter." They ask questions. They probe. They figure out
          what "fitter" actually means to you. The Program Designer Agent works
          the same way—through a guided discovery conversation that gathers
          everything it needs before generating a single workout.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          This isn't a form. It's an adaptive interview where each response
          shapes the next question. Mention a competition? The agent asks about
          timeline and events. Mention an injury? It probes for current
          limitations and exercises to avoid. The conversation branches
          naturally based on what matters to you—and it pulls from your existing
          workout history and saved memories to fill in gaps you might not think
          to mention.
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            What The Agent Discovers
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  1
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Goals & Timeline
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Body recomp? PR chasing? Competition prep? General fitness?
                  When do you need to peak—or is this ongoing? The answer
                  fundamentally changes the program structure. A 12-week comp
                  prep looks nothing like a 12-week general fitness block.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                  2
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Constraints & Equipment
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Training days per week, session length limits, available
                  equipment, injury history. These constraints interact—3 days
                  in a home gym with 60-minute sessions requires fundamentally
                  different programming than 5 days in a fully equipped box.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                  3
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  Current Fitness & History
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Current fitness level, recent training volume, benchmark
                  times, years of experience. The agent also pulls from your
                  logged workout history and saved memories (via Pinecone) to
                  understand where you actually are—not just where you think you
                  are. That back tweak you mentioned last month? It's already in
                  context.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  4
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Preferences & Style
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Favorite movements, exercises you hate (we all have them),
                  training style preferences. "I'd rather die than do Bulgarian
                  split squats" is valid feedback that shapes the program.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>AI Philosophy</span>
            <span className={badgePatterns.muted}>True Autonomy</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Tools + Instructions, Not Scripts
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Like our other agents (Posts 2 and 3), the Program Designer doesn't
            follow a rigid conversation script. It has a goal (gather enough
            context to design an excellent program), tools (save discoveries,
            query workout history, retrieve methodology, search memories), and
            the autonomy to decide how to get there. Some users provide
            everything in one message. Others need guided questions. The agent
            adapts.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Program Designer agent configuration
            </div>
            <div className="text-synthwave-neon-purple">
              {`Goal: "Design a complete training program for this user"`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`Tools: [queryWorkoutHistory, retrieveMethodology, searchMemories,`}
            </div>
            <div className="text-synthwave-neon-cyan pl-8">
              {`        saveProgramSpec, generateWorkouts, validateProgram]`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`Instructions: "Discover goals, assess constraints, leverage history,`}
            </div>
            <div className="text-synthwave-neon-pink pl-14">
              {`               design periodization, generate workouts, validate"`}
            </div>
            <div className="text-synthwave-text-secondary mt-2">
              {`→ LLM decides: what to ask, when to build, how to adapt`}
            </div>
          </div>
        </div>
      </section>

      {/* Agent Spotlight: Program Designer Agent */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
            <span className="font-inter font-bold text-xl text-synthwave-neon-pink">
              4
            </span>
          </div>
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-0`}
            >
              Agent Spotlight: The Program Designer Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Programming Mastermind"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Program Designer Agent is our most sophisticated agent—and it's
          not close. While the Workout Logger processes a single message, the
          Program Designer orchestrates an entire multi-step workflow spanning
          dozens of AI calls, parallel processing pipelines, and complex
          validation chains. It draws on your workout history, saved memories,
          and goals to build something that's genuinely custom—not a template
          with your name on it. This is where we deploy two of the most powerful
          agentic AI patterns: the Orchestrator and the Parallel pattern.
        </p>

        {/* What It Creates */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What It Creates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Multi-Phase Structure
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                4-16 week programs with logical phase progression—hypertrophy,
                strength, peaking, deload—each with specific goals and
                appropriate transitions. Not arbitrary week chunks, but
                purposeful blocks.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Complete Daily Workouts
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Every training day gets a full workout prescription: warm-ups,
                main work, accessory movements, conditioning, and cooldowns. Not
                just "do 5x5 squats"—actual coaching-quality sessions.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Intelligent Progression
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Volume and intensity progress logically across weeks based on
                your starting point, your goals, and established methodology.
                Deload weeks are placed where they should be, not where they
                were convenient for the AI.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Phase Management
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Week-by-week tracking of which phase you're in, what the focus
                is, and when transitions happen. Your coach knows exactly where
                you are in the program at all times.
              </p>
            </div>
          </div>
        </div>

        {/* The Orchestrator Pattern */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Orchestrator Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Orchestrator Pattern: Conducting the Symphony
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            You can't build a multi-week program in a single LLM call. The
            context window would overflow, the quality would degrade, and the
            temporal coherence would fall apart. Instead, we use the
            Orchestrator Pattern: a central coordinator that breaks the complex
            task into manageable sub-tasks, delegates to specialized processing
            steps, and assembles the results into a coherent whole.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            Think of it like a head coach who designs the season plan, then
            delegates position-specific training to assistant coaches, then
            reviews everything to make sure it fits together.
          </p>

          {/* Visual Flow Diagram */}
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-6 mb-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Step 1 */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  1. Analyze Goals + Constraints
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Parse user requirements, memories, and history into design
                  parameters
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Step 2 */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  2. Retrieve Methodology from Pinecone
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Discipline-specific periodization models and guidelines
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Step 3 - Design Phase Structure - PARALLEL */}
              <div className="w-full max-w-lg">
                <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg px-6 py-3 text-center mb-3">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-purple">
                    3. Design Phase Structure (Claude Sonnet)
                  </span>
                  <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                    Macro-level periodization → then generate each phase in
                    parallel
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/40 rounded-lg p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-purple text-xs font-semibold">
                      Phase 1
                    </span>
                    <p className="text-synthwave-text-muted text-xs">
                      Accumulation
                    </p>
                  </div>
                  <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/40 rounded-lg p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-purple text-xs font-semibold">
                      Phase 2
                    </span>
                    <p className="text-synthwave-text-muted text-xs">
                      Intensification
                    </p>
                  </div>
                  <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/40 rounded-lg p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-purple text-xs font-semibold">
                      Phase 3
                    </span>
                    <p className="text-synthwave-text-muted text-xs">Peaking</p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Step 4 - Parallel Weekly Templates */}
              <div className="w-full max-w-lg">
                <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center mb-3">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                    4. Generate Weekly Templates (Parallel)
                  </span>
                  <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                    All weeks generated concurrently within phase constraints
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((week) => (
                    <div
                      key={week}
                      className={`${
                        week <= 4
                          ? "bg-synthwave-neon-pink/10 border-synthwave-neon-pink/30"
                          : week <= 8
                            ? "bg-synthwave-neon-cyan/10 border-synthwave-neon-cyan/30"
                            : "bg-synthwave-neon-purple/10 border-synthwave-neon-purple/30"
                      } border rounded p-1.5 text-center`}
                    >
                      <span
                        className={`font-rajdhani text-xs font-semibold ${
                          week <= 4
                            ? "text-synthwave-neon-pink"
                            : week <= 8
                              ? "text-synthwave-neon-cyan"
                              : "text-synthwave-neon-purple"
                        }`}
                      >
                        W{week}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Step 5 - Parallel Daily Workouts */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  5. Create Daily Workouts (Parallel)
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  36+ individual workouts generated with full prescriptions
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Step 6 */}
              <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  6. Validate + Assemble Final Program
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Safety checks, volume validation, coherence review
                </p>
              </div>

              {/* Arrow to storage */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Storage */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-md">
                <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg p-3 text-center">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-pink text-sm">
                    DynamoDB
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    Metadata + tracking
                  </p>
                </div>
                <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg p-3 text-center">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-cyan text-sm">
                    S3
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    Full program JSON
                  </p>
                </div>
                <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg p-3 text-center">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-purple text-sm">
                    Pinecone
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    Semantic embedding
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Parallel Pattern */}
        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>Parallel Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            The Parallel Pattern: Speed Through Independence
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Here's a key insight: once the phase structure is defined,
            individual weeks within a phase are largely independent. Week 3 of a
            hypertrophy block doesn't need to wait for Week 2 to finish
            generating. They share the same phase parameters—volume targets,
            intensity ranges, exercise pools—so they can be generated
            simultaneously.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            This is the Parallel Pattern: identify independent sub-tasks, run
            them concurrently, and merge the results. For a 12-week program,
            this can reduce generation time from minutes to seconds.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Weekly Template Generation
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                All weeks within a phase generated concurrently. A 4-week
                hypertrophy block spawns 4 parallel AI calls, each receiving the
                same phase context but producing unique weekly programming.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Daily Workout Creation
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Within each week, individual training days can also be generated
                in parallel. Monday's squat session and Wednesday's MetCon share
                weekly volume targets but are independent in their exercise
                selection.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Validation Passes
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Safety checks, volume calculations, and methodology alignment
                run simultaneously across all workouts. One validator checks
                weekly volume totals while another verifies exercise variety.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Summary Generation
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                AI-generated program summary, phase descriptions, and Pinecone
                embeddings all happen concurrently after the program is
                assembled. Persistence doesn't block the user.
              </p>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Orchestrator + Parallel in Code
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Simplified program generation flow
            </div>
            <div className="text-synthwave-neon-pink">
              {`const buildProgram = async (designSpec) => {`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4 mt-2">
              {`// Step 1: Retrieve discipline methodology (sequential)`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const methodology = await retrieveMethodology(designSpec.discipline);`}
            </div>
            <div className="text-synthwave-neon-purple pl-4 mt-2">
              {`// Step 2: Design phase structure (sequential - needs methodology)`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const phases = await designPhaseStructure({`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`goals: designSpec.goals,`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`duration: designSpec.weeks,`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`methodology, memories: designSpec.userMemories`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">{`});`}</div>
            <div className="text-synthwave-neon-pink pl-4 mt-2">
              {`// Step 3: Generate all weeks in PARALLEL`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const weeks = await Promise.all(`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`phases.flatMap(phase =>`}
            </div>
            <div className="text-synthwave-text-secondary pl-12">
              {`phase.weekNumbers.map(weekNum =>`}
            </div>
            <div className="text-synthwave-neon-cyan pl-16">
              {`generateWeek({ weekNum, phase, methodology, designSpec })`}
            </div>
            <div className="text-synthwave-text-secondary pl-12">{`)`}</div>
            <div className="text-synthwave-text-secondary pl-8">{`)`}</div>
            <div className="text-synthwave-text-secondary pl-4">{`);`}</div>
            <div className="text-synthwave-neon-purple pl-4 mt-2">
              {`// Step 4: Validate and assemble (sequential - needs all weeks)`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const validated = await validateProgram(weeks, designSpec);`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4 mt-2">
              {`// Step 5: Persist in PARALLEL`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`await Promise.all([`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`saveToDynamo(validated.metadata),`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`saveToS3(validated.fullSpec),`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`indexInPinecone(validated.summary)`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">{`]);`}</div>
            <div className="text-synthwave-neon-pink">{`};`}</div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            Notice the pattern: sequential steps where order matters
            (methodology → phases → validation), parallel execution where tasks
            are independent (week generation, persistence). This is the
            Orchestrator deciding which parts need to be serial and which can
            run concurrently.
          </p>
        </div>
      </section>

      {/* Async Program Building */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Async Building: Don't Make Users Wait
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Even with parallel generation, building a 12-week program takes time.
          We're making dozens of AI calls, validating hundreds of exercises, and
          assembling a complex data structure. Making a user stare at a spinner
          for 30 seconds is terrible UX. So we don't.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            The Async Build Flow
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Program generation happens via async Lambda invocation—the same
            pattern from Post 1. The user's conversation continues uninterrupted
            while the heavy lifting happens in the background.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-neon-cyan">
              {`User: "Build me a 12-week program for the throwdown"`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`→ Sync: "I'm on it. Designing your program now..."`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`→ Async: invokeAsyncLambda('build-program', { designSpec })`}
            </div>
            <div className="text-synthwave-text-muted mt-2 italic">
              {`// User continues chatting with their coach`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`→ Stream: "Mapping out your conditioning base phase..."`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`→ Stream: "Building Week 4's strength day..."`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`→ Stream: "Adding deload week before your peak..."`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`→ Complete: Program saved to DynamoDB + S3 + Pinecone`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`→ Notify: "Your 12-week program is ready. Let's review it."`}
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Contextual Updates: Your Coach Narrates the Build
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            While your program builds in the background, you receive
            AI-generated contextual updates—brief, coach-like progress messages
            powered by Amazon Nova 2 Lite. These aren't generic "Loading..."
            messages. They're personality-aware updates that match your coach's
            communication style:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                The Drill Sergeant
              </h4>
              <p className="text-synthwave-text-muted font-rajdhani text-sm italic">
                "Laying out your strength phase. This is where it gets real."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                The Sports Scientist
              </h4>
              <p className="text-synthwave-text-muted font-rajdhani text-sm italic">
                "Calibrating volume progression across your accumulation
                blocks..."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                The Hype Coach
              </h4>
              <p className="text-synthwave-text-muted font-rajdhani text-sm italic">
                "Building Week 8—this is where PRs are going to happen."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                The Mentor
              </h4>
              <p className="text-synthwave-text-muted font-rajdhani text-sm italic">
                "Designing your deload week. Recovery is where adaptation
                happens."
              </p>
            </div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            These updates are generated at ultra-low latency (~100ms) by Nova 2
            Lite, making the build process feel interactive rather than like
            waiting for a download. Your coach is working and keeping you in the
            loop.
          </p>
        </div>
      </section>

      {/* Multi-Model Orchestration */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Multi-Model Orchestration: The Right Brain for the Job
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Program design isn't a single-model task. Different steps require
          different capabilities—and different cost profiles. We orchestrate
          four models through Amazon Bedrock, each handling the step they're
          best suited for.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-lg p-2">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude"
                  className="w-8 h-8"
                />
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Claude Sonnet 4.5
              </h3>
            </div>
            <p className="text-synthwave-neon-purple font-rajdhani font-semibold mb-2">
              The Architect
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Handles the high-stakes decisions: phase structure design,
              periodization logic, exercise prescription, and the design
              conversation itself. When the quality of reasoning directly
              impacts program quality, Sonnet does the thinking.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Phase structure and periodization design</li>
              <li>• Complex constraint satisfaction</li>
              <li>• Exercise selection and progression logic</li>
              <li>• Design conversation and discovery</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-lg p-2">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude Haiku"
                  className="w-8 h-8"
                />
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Claude Haiku 4.5
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              The Speed Worker
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Handles the volume work: individual workout generation within
              established phase parameters, validation checks, and quick
              conversational responses during the design process.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Individual workout generation</li>
              <li>• Warm-up and cooldown prescriptions</li>
              <li>• Quick validation passes</li>
              <li>• Fast conversational responses</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Nova_64.svg"
                alt="Nova"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                Amazon Nova 2 Lite
              </h3>
            </div>
            <p className="text-synthwave-neon-pink font-rajdhani font-semibold mb-2">
              The Narrator
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Generates those real-time contextual updates during the build
              process. Ultra-fast, personality-aware progress messages that keep
              users engaged.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Build progress updates (~100ms)</li>
              <li>• Coach-personality-aware messaging</li>
              <li>• Ephemeral UX feedback</li>
              <li>• Status notifications</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-synthwave-neon-cyan/20 rounded-lg p-2">
                <span className="font-russo text-synthwave-neon-cyan text-lg">
                  NV
                </span>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Nvidia NV-Embed-V2
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              The Indexer
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Generates semantic embeddings for the completed program, enabling
              your coach to reference your program in future conversations via
              natural language queries.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Program summary embeddings</li>
              <li>• Methodology retrieval vectors</li>
              <li>• Cross-program similarity search</li>
              <li>• Natural language program queries</li>
            </ul>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Why Not Use Sonnet for Everything?
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            We could. The quality would be marginally better in some areas. But
            using Sonnet for every individual workout generation in a 36-workout
            program would be slow and expensive. Haiku handles workout
            generation within established phase parameters nearly as well as
            Sonnet—at a fraction of the cost and latency. The key insight:
            Sonnet designs the strategy, Haiku executes the tactics.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Model selection in program generation
            </div>
            <div className="text-synthwave-neon-purple">
              {`Sonnet 4.5  → Phase design, periodization, constraint solving`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`Haiku 4.5   → Individual workout generation (36× calls)`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`Nova 2 Lite → Contextual updates (12-15× calls)`}
            </div>
            <div className="text-synthwave-text-secondary mt-1">
              {`NV-Embed    → Program embedding (1× call)`}
            </div>
            <div className="text-synthwave-text-muted mt-3">
              {`// Result: Sonnet quality where it matters, Haiku speed everywhere else`}
            </div>
          </div>
        </div>
      </section>

      {/* Program Storage */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Where Programs Live: The Hybrid Storage Strategy
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          A complete 12-week program with daily workouts is a complex data
          structure—far too rich for DynamoDB alone, and far too frequently
          accessed for S3 alone. We use the same hybrid storage strategy from
          Post 2, but with program-specific optimizations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-DynamoDB_64.svg"
                alt="DynamoDB"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                DynamoDB
              </h3>
            </div>
            <p className="text-synthwave-neon-pink font-rajdhani font-semibold mb-2">
              Hot State & Tracking
            </p>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Program metadata (name, dates, status)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Current phase and week tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Workout completion status
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Today's workout quick-access
              </li>
            </ul>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs mt-4">
              <span className="text-synthwave-neon-pink">~5ms</span>
              <span className="text-synthwave-text-muted">
                {" "}
                "What's my workout today?"
              </span>
            </div>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Simple-Storage-Service_64.svg"
                alt="S3"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Amazon S3
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              Full Program Specification
            </p>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Complete program JSON (all weeks/workouts)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Phase definitions and transitions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Full exercise prescriptions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Design rationale and methodology notes
              </li>
            </ul>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs mt-4">
              <span className="text-synthwave-neon-cyan">~100ms</span>
              <span className="text-synthwave-text-muted">
                {" "}
                full program retrieval
              </span>
            </div>
          </div>

          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-lg p-1.5">
                <img
                  src="/images/icons/pinecone-logo.svg"
                  alt="Pinecone"
                  className="w-9 h-9"
                />
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Pinecone
              </h3>
            </div>
            <p className="text-synthwave-neon-purple font-rajdhani font-semibold mb-2">
              Semantic Intelligence
            </p>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                Program summary embeddings
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                Phase and workout-level vectors
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                Natural language program queries
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                Cross-program pattern matching
              </li>
            </ul>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs mt-4">
              <span className="text-synthwave-neon-purple">meaning-based</span>
              <span className="text-synthwave-text-muted"> retrieval</span>
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Smart Data Access Patterns
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The key optimization: most program interactions only need today's
            workout. We don't fetch a 36-workout program from S3 every time
            someone asks "What should I do today?" DynamoDB serves the current
            state instantly. S3 only gets involved when someone browses the full
            program or when the coach needs to reason about upcoming phases.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Access pattern optimization
            </div>
            <div className="text-synthwave-neon-cyan">
              {`"What's my workout today?"     → DynamoDB only (~5ms)`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`"Show me this week's schedule"  → DynamoDB only (~5ms)`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`"Browse the full program"       → S3 fetch (~100ms)`}
            </div>
            <div className="text-synthwave-text-secondary mt-1">
              {`"How does Week 10 compare?"     → Pinecone + S3 (~150ms)`}
            </div>
          </div>
        </div>
      </section>

      {/* Programs That Evolve */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Programs That Evolve: Living, Breathing Training Plans
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          A program isn't a PDF you download and forget about. Once your program
          is active, it becomes a living part of your coaching relationship.
          Every workout you log feeds back into the system—your coach knows
          where you are in the program, how you're progressing, and when
          something needs to change.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            How Programs Guide Your Entire Experience
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Contextual coaching:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  When you chat with your coach, they know you're in Week 6 of
                  your program, in the intensification phase, and that
                  yesterday's squat session felt heavy. The program context
                  enriches every conversation—your coach doesn't just know your
                  training plan, they know where you are in it.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Adaptive insights:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  If your logged workouts show you're consistently exceeding the
                  prescribed weights, your coach can suggest adjusting future
                  weeks upward. If you're missing sessions, the program adapts
                  the conversation to address it. Your training data and program
                  design work together.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Memory integration:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Your saved memories—injuries, preferences, past program
                  outcomes—feed directly into future program designs. Finished a
                  12-week program and ready for the next one? The designer knows
                  what worked, what didn't, and where you ended up. Your next
                  program picks up where the last one left off.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Completion tracking:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Your Training Grounds dashboard shows exactly where you are:
                  today's workout, this week's schedule, overall progress
                  through phases. No guessing about what's next—just open the
                  app and train.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Shareable Programs */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Share the Gains: Shareable Training Programs
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Great programs shouldn't exist in a vacuum. Built a 12-week program
          that you're loving? Share it with your training partners, your gym
          community, or anyone who might benefit from the same structured
          approach. NeonPanda programs are now shareable—one click generates a
          public link that lets other athletes preview and adopt your program.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            How Sharing Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                One-Click Sharing
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Generate a shareable link from any active or completed program.
                Recipients see the full program structure—phases, weekly
                layouts, workout previews—without needing an account.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Adopt & Personalize
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                When someone adopts a shared program, it becomes theirs—tracked
                independently, integrated with their coach, enriched with their
                own training context. Same structure, personalized execution.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Train Together
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Share a program with your training partner or gym crew so
                everyone follows the same plan. Each person tracks their own
                progress while working through the same structured approach.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Community Building
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Coaches and experienced athletes can share their programs with
                their communities. Built a solid beginner program? Share it with
                the newcomers at your box.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Why This Changes the Game
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Program Designer Agent isn't just automating what a human coach
          does—it's doing things that would be impractical for a human coach. No
          human writes 36 fully detailed workouts from scratch for every client.
          They use templates and adjust. Our agent generates every workout
          fresh, tailored to your specific constraints, grounded in your history
          and memories, with methodology-aligned periodization—and then the
          program evolves with you as you train.
        </p>
        <p className={`${typographyPatterns.description} mb-8`}>
          <span className="text-synthwave-neon-pink font-semibold">
            The result: truly custom, intelligent programs that rival premium
            coaching, delivered in minutes, adapted to your life, and shareable
            with your community.
          </span>
        </p>

        <div className={containerPatterns.boldGradient}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            The Numbers Behind the Magic
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            When someone asks for a 12-week, 3-day program, here's what the
            Program Designer Agent actually produces:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                36+
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Individual Workouts
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                60+
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                AI Calls Orchestrated
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
                10
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Disciplines Supported
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                4
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                AI Models Orchestrated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try It CTA */}
      <section className="mb-16">
        <div className={`${containerPatterns.mediumGlassCyan}`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            Ready to Stop Googling "12-Week Program"?
          </h3>
          <p className={`${typographyPatterns.description} mb-4`}>
            If you've ever tried to follow a generic program downloaded from the
            internet—only to realize by Week 3 that it doesn't fit your
            schedule, your equipment, or your goals—the Program Designer was
            built for you. Tell your coach what you need, and get a program
            designed around your actual life, grounded in your training history,
            and shareable with your crew.
          </p>
          <p className={typographyPatterns.description}>
            <span className="text-synthwave-neon-cyan font-semibold">
              Your first coach is free.
            </span>{" "}
            Build a personalized AI coach, describe your goals, and experience
            what happens when program design is actually personalized.
          </p>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          What's Next: The Symphony
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          We've now explored all four specialized agents: the Smart Request
          Router, Coach Creator, Workout Logger, and Program Designer. Each is
          powerful on its own—but the real magic happens when they work
          together. In the final post, we'll see the full symphony of
          multi-agent orchestration, cross-agent context sharing, multi-layer
          safety validation, and the future of AI coaching.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Spoiler: when you log a workout that's part of an active program, the
          Workout Logger, Program Designer, and Coach Creator agents all
          coordinate—updating program progress, adjusting future coaching based
          on performance, and delivering feedback in your coach's unique voice.
          Four agents, one seamless experience.
        </p>

        <div className={containerPatterns.cardLight}>
          <div className="p-6">
            <p className="font-rajdhani text-synthwave-text-muted text-sm uppercase tracking-wide mb-2">
              Final Post in the Series
            </p>
            <Link
              to="/blog/the-symphony"
              className="group flex items-center justify-between"
            >
              <div>
                <h3 className="font-russo text-xl text-synthwave-neon-cyan group-hover:text-synthwave-neon-pink transition-colors">
                  The Symphony
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  Multi-Agent Orchestration & The Future of AI Coaching
                </p>
              </div>
              <svg
                className="w-6 h-6 text-synthwave-neon-cyan group-hover:text-synthwave-neon-pink group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default BlogPost4ProgramDesigner;
