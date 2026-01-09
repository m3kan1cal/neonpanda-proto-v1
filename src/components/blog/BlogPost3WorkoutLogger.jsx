import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost3WorkoutLogger() {
  return (
    <>
      {/* Introduction */}
      <section className="mb-16">
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          "Did Fran in 8:45, felt pretty good. Had to break up the thrusters
          more than I wanted but pull-ups were smooth."
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          That's it. That's all you need to tell your NeonPanda coach to log a
          complete workout. No forms to fill out, no exercises to search for, no
          confusing rep scheme fields to navigate. Just natural language, the
          way you'd tell a friend about your session.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          Behind this simple interaction lies sophisticated multi-model AI
          orchestration—multiple AI models working together, each optimized for
          specific tasks. This post explores how we make workout logging
          effortless while generating actionable insights.
        </p>
      </section>

      {/* Multi-Model Orchestration */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Multi-Model AI Orchestration
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Not all AI tasks are created equal. A quick greeting needs a different
          model than analyzing a complex training block. We orchestrate multiple
          models through Amazon Bedrock, selecting the optimal model for each
          task.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Our AI Model Stack
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-synthwave-bg-primary/30 rounded-lg p-4">
              <div className="bg-white rounded-lg p-2 flex-shrink-0">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude"
                  className="w-8 h-8"
                />
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Claude Sonnet 4.5
                </h4>
                <p className="text-synthwave-text-muted text-sm font-rajdhani mb-1">
                  Primary Conversational Engine
                </p>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Complex orchestration, natural coaching conversations, workout
                  extraction from natural language, and nuanced reasoning about
                  training.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-synthwave-bg-primary/30 rounded-lg p-4">
              <div className="bg-white rounded-lg p-2 flex-shrink-0">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude Haiku"
                  className="w-8 h-8"
                />
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Claude Haiku 4.5
                </h4>
                <p className="text-synthwave-text-muted text-sm font-rajdhani mb-1">
                  Fast Response Engine
                </p>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Quick questions, validation checks, simple confirmations.
                  Lightning-fast responses for straightforward interactions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-synthwave-bg-primary/30 rounded-lg p-4">
              <div className="bg-white rounded-lg p-2 flex-shrink-0">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude Opus"
                  className="w-8 h-8"
                />
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  Claude Opus 4.5
                </h4>
                <p className="text-synthwave-text-muted text-sm font-rajdhani mb-1">
                  Deep Reasoning Engine
                </p>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Complex program design, multi-week periodization analysis, and
                  deep methodology application requiring extended reasoning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-synthwave-bg-primary/30 rounded-lg p-4">
              <img
                src="/images/icons/Arch_Amazon-Nova_64.svg"
                alt="Nova"
                className="w-12 h-12 flex-shrink-0"
              />
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Nova Micro & Nova 2 Lite
                </h4>
                <p className="text-synthwave-text-muted text-sm font-rajdhani mb-1">
                  Efficient Processing
                </p>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Intent classification, contextual updates, background
                  processing. Ultra-efficient for high-volume, simpler tasks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-synthwave-bg-primary/30 rounded-lg p-4">
              <div className="bg-synthwave-neon-cyan/20 rounded-lg p-2 flex-shrink-0">
                <span className="font-russo text-synthwave-neon-cyan text-sm">
                  NV
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Nvidia NV-Embed-V2
                </h4>
                <p className="text-synthwave-text-muted text-sm font-rajdhani mb-1">
                  Semantic Embeddings
                </p>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  State-of-the-art vector embeddings for semantic search across
                  workouts, memories, methodologies, and coach configurations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Spotlight: Workout Logger Agent */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple">
            <span className="font-inter font-bold text-xl text-synthwave-neon-purple">
              3
            </span>
          </div>
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-0`}
            >
              Agent Spotlight: Workout Logger Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "Your Training Historian"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Workout Logger Agent is where natural language meets structured
          data. It extracts, validates, and saves workout information from
          however you describe your session—no rigid forms required.
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            What It Understands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                CrossFit
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm italic">
                "Did Fran in 8:45" → Thrusters 95lb, Pull-ups, 21-15-9, time:
                8:45
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Powerlifting
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm italic">
                "Worked up to 315x5 on squats, RPE 8" → Back Squat, 315lb, 5
                reps, RPE 8
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Running
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm italic">
                "Easy 5K, about 25 mins" → Run, 5km, 25:00, easy pace
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Olympic Lifting
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm italic">
                "Snatches felt heavy today, missed 90kg twice" → Snatch, worked
                to 90kg, 2 misses
              </p>
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Discipline Detection
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The agent automatically classifies workouts across 8 supported
            disciplines, applying the appropriate extraction schema for each:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "CrossFit",
              "Powerlifting",
              "Olympic Weightlifting",
              "Bodybuilding",
              "Running",
              "HYROX",
              "Calisthenics",
              "Functional Bodybuilding",
            ].map((discipline, idx) => (
              <span key={idx} className={badgePatterns.cyan}>
                {discipline}
              </span>
            ))}
          </div>
        </div>

        {/* Tool-Use Pattern */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.pink}>Tool-Use Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
            The Tool-Use Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Workout Logger Agent is equipped with specialized tools that the
            AI decides when and how to use:
          </p>
          <div className="space-y-3">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <code className="text-synthwave-neon-pink text-sm">
                extract_workout_data
              </code>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                Parse natural language into structured workout components
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <code className="text-synthwave-neon-cyan text-sm">
                validate_workout
              </code>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                Check for completeness and safety (blocks incomplete data)
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <code className="text-synthwave-neon-purple text-sm">
                save_workout
              </code>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                Persist to DynamoDB with Pinecone indexing for semantic search
              </p>
            </div>
          </div>
        </div>

        {/* Evaluator-Optimizer Pattern */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Evaluator-Optimizer</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            The Evaluator-Optimizer Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Every extracted workout goes through quality assessment. If the AI
            isn't confident in its extraction, it asks clarifying questions
            rather than saving potentially incorrect data.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Evaluator-Optimizer flow
            </div>
            <div className="text-synthwave-neon-cyan">
              {`extraction = extract_workout(userMessage)`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`confidence = evaluate(extraction)`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`if (confidence < threshold) → ask_clarification()`}
            </div>
            <div className="text-synthwave-text-secondary mt-1">
              {`else → validate_and_save(extraction)`}
            </div>
          </div>
        </div>
      </section>

      {/* Multimodal Input */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Beyond Text: Multimodal Input
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Words aren't your only option. Send a photo of your gym's whiteboard,
          and your coach extracts the workout automatically. Screenshot a
          programming post from Instagram, and it becomes a logged session.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-russo text-xl text-white mb-4">
            Image Understanding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Whiteboard Workouts
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Snap a photo of your box's WOD board. The AI reads the workout,
                structures it, and logs it when you're done.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Programming Screenshots
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Found a workout on social media? Screenshot it, send it to your
                coach, and it becomes part of your training log.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics & Insights */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          From Workouts to Insights
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Logging is just the beginning. Every workout feeds into our analytics
          engine, generating weekly and monthly reports that reveal patterns you
          might never notice on your own.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
              Weekly Reports
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Training volume and intensity trends
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Movement pattern distribution
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Recovery indicators and suggestions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Consistency scoring
              </li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
              Monthly Reports
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Strength progression analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                PR tracking and celebrations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Discipline balance assessment
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Personalized recommendations
              </li>
            </ul>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            Fire-and-Forget Analytics
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani">
            Report generation happens asynchronously via Lambda invocations.
            When you complete a workout, we fire off analytics processing
            without blocking your conversation. You chat with your coach while
            insights generate in the background.
          </p>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          What's Next
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Individual workouts are powerful, but structured programs are where
          real transformation happens. In the next post, we'll explore how the
          Program Designer Agent creates intelligent multi-week training
          programs using the Orchestrator and Parallel patterns.
        </p>

        <div className={containerPatterns.cardLight}>
          <div className="p-6">
            <p className="font-rajdhani text-synthwave-text-muted text-sm uppercase tracking-wide mb-2">
              Next in the Series
            </p>
            <Link
              to="/blog/training-programs-that-think"
              className="group flex items-center justify-between"
            >
              <div>
                <h3 className="font-russo text-xl text-synthwave-neon-pink group-hover:text-synthwave-neon-cyan transition-colors">
                  Training Programs That Think
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  The Program Designer Agent & Agentic AI Patterns
                </p>
              </div>
              <svg
                className="w-6 h-6 text-synthwave-neon-pink group-hover:text-synthwave-neon-cyan group-hover:translate-x-1 transition-all"
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

export default BlogPost3WorkoutLogger;
