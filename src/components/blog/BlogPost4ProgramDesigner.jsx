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
      {/* Introduction */}
      <section className="mb-16">
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          Individual workouts build fitness. Structured programs build athletes.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          When you ask your NeonPanda coach for a 12-week powerlifting program,
          you're not getting a template downloaded from the internet. You're
          triggering a sophisticated multi-agent workflow that analyzes your
          goals, designs intelligent periodization, and creates a complete
          roadmap to your objectives.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          This post explores the Program Designer Agent and the agentic AI
          patterns that make intelligent training programs possible.
        </p>
      </section>

      {/* The 8 Disciplines */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Purpose-Built for 8 Disciplines
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Different disciplines require different approaches. A powerlifting
          program looks nothing like a marathon training plan. We've built deep
          methodology knowledge for each supported discipline.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: "CrossFit",
                focus: "GPP, skills, capacity",
                color: "pink",
              },
              {
                name: "Powerlifting",
                focus: "SBD strength, peaking",
                color: "cyan",
              },
              {
                name: "Olympic Weightlifting",
                focus: "Snatch, C&J technique",
                color: "purple",
              },
              {
                name: "Bodybuilding",
                focus: "Hypertrophy, aesthetics",
                color: "pink",
              },
              {
                name: "Running",
                focus: "Endurance, speed work",
                color: "cyan",
              },
              {
                name: "HYROX",
                focus: "Hybrid fitness racing",
                color: "purple",
              },
              {
                name: "Calisthenics",
                focus: "Bodyweight mastery",
                color: "pink",
              },
              {
                name: "Functional Bodybuilding",
                focus: "Movement + muscle",
                color: "cyan",
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
                <p className="text-synthwave-text-muted font-rajdhani text-xs">
                  {discipline.focus}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Methodology Alignment
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Each discipline has its own methodology library stored in Pinecone,
            containing:
          </p>
          <ul className="space-y-2 font-rajdhani text-synthwave-text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-cyan">•</span>
              Proven periodization models and phase structures
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-cyan">•</span>
              Exercise selection principles and movement patterns
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-cyan">•</span>
              Volume and intensity prescription guidelines
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-cyan">•</span>
              Competition peaking and taper protocols
            </li>
          </ul>
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
              Agent Spotlight: Program Designer Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "Your Programming Mastermind"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Program Designer Agent is our most sophisticated agent,
          orchestrating multiple AI calls, parallel processing, and complex
          validation to create training programs that rival professional
          coaches.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
            What It Creates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Multi-Week Structure
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                4-16 week programs with logical phase progression, deload weeks,
                and peak timing.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Daily Workouts
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Complete workout prescriptions with warm-ups, main work,
                accessory movements, and cooldowns.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Progressive Overload
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Intelligent intensity and volume progression based on your
                starting point and goals.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Phase Management
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Hypertrophy, strength, peaking phases organized with appropriate
                transitions.
              </p>
            </div>
          </div>
        </div>

        {/* Orchestrator Pattern */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Orchestrator Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            The Orchestrator Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Orchestrator Pattern is the backbone of program design. A
            central coordinator manages multi-step workflows, delegating to
            specialized sub-agents based on task complexity.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm mb-4">
            <div className="text-synthwave-text-muted mb-2">
              // Orchestrator workflow
            </div>
            <div className="text-synthwave-neon-pink">
              {`1. Analyze user goals + constraints`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`2. Retrieve methodology from Pinecone`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`3. Design phase structure (Opus 4.5)`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`4. Generate weekly templates (parallel)`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`5. Create daily workouts (parallel)`}
            </div>
            <div className="text-synthwave-text-secondary mt-1">
              {`6. Validate + assemble final program`}
            </div>
          </div>
        </div>

        {/* Parallel Pattern */}
        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>Parallel Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            The Parallel Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            When tasks are independent, run them simultaneously. The Program
            Designer uses parallel execution for:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Weekly Template Generation
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                All 12 weeks of a program can be generated concurrently once the
                phase structure is defined.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Workout Validation
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Safety checks, volume calculations, and methodology alignment
                run simultaneously across workouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Design Conversation */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The Design Conversation
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Program design isn't a one-shot prompt—it's a conversation. The
          Program Designer Agent guides you through a discovery process,
          gathering the context it needs to build something truly personalized.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            What The Agent Learns
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  1
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Your Goals
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Competition prep? General strength? Return from injury?
                  Specific PR targets?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                  2
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Your Constraints
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Available equipment, training days per week, session length
                  limits, injury history.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                  3
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  Your Current State
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Current fitness level, recent training history, max lifts or
                  benchmark times.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  4
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Your Preferences
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Favorite exercises, movements to avoid, training style
                  preferences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Deep Dive: Async Program Building */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Async Program Building
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Building a 12-week program with daily workouts is computationally
          intensive. We handle this with async Lambda invocations that don't
          block your conversation.
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            The Build Flow
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-neon-cyan">
              {`User: "Build me a 12-week powerlifting program"`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`→ Sync: Acknowledge + start conversation`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`→ Async: invoke('build-program', { ... })`}
            </div>
            <div className="text-synthwave-text-muted mt-2 italic">
              {`// User continues chatting while program builds`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`→ Stream: Progress updates via Nova Micro`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`→ Complete: Program saved to DynamoDB + S3`}
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Contextual Updates
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani">
            While your program builds, you receive AI-generated contextual
            updates—brief, coach-like progress messages powered by Nova Micro:
            "Laying out your strength phase structure..." or "Building Week 8's
            workouts now..."
          </p>
        </div>
      </section>

      {/* Program Storage */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Where Programs Live
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Programs are too rich for DynamoDB alone. We use our hybrid storage
          strategy:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
              DynamoDB
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Program metadata (name, dates, status)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Current phase and week tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">•</span>
                Workout completion status
              </li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
              S3 + Pinecone
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani text-sm">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Full program specification JSON
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                All workout templates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">•</span>
                Semantic embeddings for search
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          What's Next
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          We've now explored all four specialized agents: the Smart Request
          Router, Coach Creator, Workout Logger, and Program Designer. In the
          final post, we'll see how they work together—the full symphony of
          multi-agent orchestration, safety validation, and the future of AI
          coaching.
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
