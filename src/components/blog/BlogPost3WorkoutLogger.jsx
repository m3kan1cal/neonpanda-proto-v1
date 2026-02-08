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
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-rajdhani text-xl text-white leading-relaxed italic">
            "Did Fran in 8:45. Had to break up the thrusters 12-9 on the round
            of 21 but pull-ups were unbroken. Felt like death but somehow still
            standing. Pretty sure I saw my ancestors waving at me around rep
            40..."
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          That's it. That's all you need to tell your NeonPanda coach to log a
          complete workout. No forms to fill out, no exercises to search and
          select, no confusing rep scheme builders, no remembering whether you
          should enter kilos or pounds. Just natural language, the way you'd
          tell a friend about your session.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          In the background, that casual message just triggered a sophisticated
          AI pipeline: workout detection, intent classification, multi-turn
          extraction, structured data generation, validation, persistence, and
          semantic indexing—all in about 2 seconds.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-purple font-semibold">
            This is the Workout Logger Agent.
          </span>{" "}
          And it's smarter than it looks. This post dives into how we built an
          AI that speaks fluent fitness across ten disciplines, understands the
          difference between "Fran" and "Grace," and knows that "felt heavy"
          means something different to a powerlifter than a runner.
        </p>
      </section>

      {/* The Problem: Logging Sucks */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Problem: Workout Logging Is a Chore
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Let's be honest: most workout logging apps are designed by software
          engineers who've never done a metcon in their life. They're built
          around database schemas, not around how athletes actually think and
          talk about their training.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            The Old Way (Painful)
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Search, scroll, select:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Find "Thruster" in a list of 500 exercises. Select it. Enter
                  weight. Enter reps. Enter sets. Repeat for every movement.
                  Give up after the third exercise because the gym's WiFi is
                  terrible.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Schema mismatch:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  The app wants sets × reps × weight. You did an AMRAP. Now
                  what? Most apps just... don't support the way CrossFitters,
                  runners, or circuit trainers actually train.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Lost context:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "Felt heavy but moved fast" contains valuable training signal.
                  Traditional apps throw it away. Your future self won't
                  remember why that 315 squat felt different than last week's
                  315.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Benchmark blindness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  You know what Fran is. Your coach knows what Fran is. The app
                  doesn't. You have to rebuild the workout from scratch every
                  time, even though Fran has been Fran since 2003.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          We needed a fundamentally different approach—one that speaks the
          language of athletes, understands training context, and makes logging
          so effortless that you actually{" "}
          <span className="text-synthwave-neon-pink font-semibold">want</span>{" "}
          to do it. What if logging a workout was as easy as texting a friend?
        </p>
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
              Agent Spotlight: The Workout Logger Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Multilingual Training Historian"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Workout Logger Agent is where natural language meets structured
          data extraction at scale. It doesn't just parse workout
          descriptions—it <em>understands</em> them. It knows the difference
          between a CrossFit "For Time" workout and a powerlifting "Work up to"
          session, and it extracts fundamentally different data structures from
          each.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>Tool-Use Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            The Tool-Use Pattern: AI with Capabilities
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Workout Logger Agent isn't a single prompt—it's an AI equipped
            with specialized tools that it decides when and how to use. Like
            giving a craftsman access to a workshop full of precision
            instruments, we give the agent tools for specific tasks and let it
            orchestrate the extraction.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Agent tools for workout extraction
            </div>
            <div className="text-synthwave-neon-purple">
              {`Tools available to Workout Logger Agent:`}
            </div>
            <div className="text-synthwave-neon-pink mt-2 pl-4">
              {`• extract_workout_data    → Parse natural language`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`• classify_discipline     → Identify training methodology`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`• lookup_benchmark        → Recognize named workouts`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`• validate_extraction     → Check completeness/safety`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`• normalize_workout_data  → Fix and standardize data`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`• save_workout            → Persist to DynamoDB + Pinecone`}
            </div>
            <div className="text-synthwave-text-secondary mt-3">
              {`→ LLM autonomously decides: which tools, in what order, with what data`}
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          This is the key insight: instead of hardcoding extraction logic, we
          give the AI agent the tools and let it reason about how to use them.
          The same agent handles "Did Fran in 8:45" and "5×5 back squat at 315,
          RPE 8, last set was a grinder" by choosing different tool combinations
          for each.
        </p>
      </section>

      {/* Discipline Intelligence */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Speaking Nine Languages: Discipline Intelligence
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's the thing about fitness: there is no universal workout format.
          A CrossFit metcon, a powerlifting session, and a running workout have
          almost nothing in common structurally. Trying to force them all into
          the same schema is why most fitness apps feel broken for anyone who
          isn't doing basic gym-bro bodybuilding.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          The Workout Logger Agent doesn't just detect disciplines—it switches
          extraction schemas based on what it finds. Different data structures
          for different training methodologies.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* CrossFit */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-pink"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                CrossFit
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "Did Fran in 8:45, broke up thrusters 12-9 on the 21s"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-pink">
                {`benchmark: "Fran"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`workoutType: "For Time"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`time: "8:45"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`repScheme: "21-15-9"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`breakStrategy: { round1Thrusters: "12-9" }`}
              </div>
            </div>
          </div>

          {/* Powerlifting */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-cyan"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Powerlifting
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "Worked up to 405x1 on deadlift, RPE 9.5, hitched a bit"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-cyan">
                {`exercise: "Deadlift"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`weight: { value: 405, unit: "lb" }`}
              </div>
              <div className="text-synthwave-text-secondary">{`reps: 1`}</div>
              <div className="text-synthwave-text-secondary">{`rpe: 9.5`}</div>
              <div className="text-synthwave-text-secondary">
                {`technicalNotes: "slight hitch"`}
              </div>
            </div>
          </div>

          {/* Olympic Weightlifting */}
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  <path
                    strokeLinecap="round"
                    strokeWidth={2}
                    d="M12 2v3M12 19v3M2 12h3M19 12h3"
                  />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Olympic Weightlifting
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "Snatches felt heavy, missed 90kg twice, made it on third"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-purple">
                {`exercise: "Snatch"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`weight: { value: 90, unit: "kg" }`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`attempts: [{ result: "miss" }, { result: "miss" }, { result: "make" }]`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`perceivedDifficulty: "heavy"`}
              </div>
            </div>
          </div>

          {/* Running */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-pink"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                Running
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "Easy 10k this morning, about 52 mins, felt smooth"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-pink">
                {`distance: { value: 10, unit: "km" }`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`duration: "52:00"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`pace: "5:12/km"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`intensity: "easy"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`feel: "smooth"`}
              </div>
            </div>
          </div>

          {/* HYROX */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                  />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                HYROX
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "HYROX sim, 1:28:45, sled push destroyed me"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-cyan">
                {`workoutType: "HYROX Simulation"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`totalTime: "1:28:45"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`limitingStation: "Sled Push"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`runSplits: [...8 segments...]`}
              </div>
            </div>
          </div>

          {/* Circuit Training */}
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-synthwave-neon-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Circuit Training
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "F45 Hollywood class, 45 mins, tons of lunges today"
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-neon-purple">
                {`classFormat: "F45"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`className: "Hollywood"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`duration: "45:00"`}
              </div>
              <div className="text-synthwave-text-secondary">
                {`emphasis: ["lunges", "lower body"]`}
              </div>
            </div>
          </div>
        </div>

        {/* Full Discipline Support */}
        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            10 Disciplines, One Agent
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Workout Logger Agent automatically detects and applies the
            appropriate extraction schema for each discipline:
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
              "Circuit Training",
            ].map((discipline, idx) => (
              <span key={idx} className={badgePatterns.cyan}>
                {discipline}
              </span>
            ))}
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            Each discipline has its own extraction schema, terminology mapping,
            and benchmark database. A "PR" means something different in
            powerlifting vs running vs CrossFit—and the agent knows the
            difference.
          </p>
        </div>
      </section>

      {/* The Extraction Pipeline */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Inside the Extraction Pipeline
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Let's follow a workout from natural language to structured data.
          Here's what actually happens when you tell your coach "Did Fran in
          8:45":
        </p>

        {/* Visual Flow Diagram */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-6">
            Extraction Flow Architecture
          </h3>

          <div className="bg-synthwave-bg-primary/30 rounded-lg p-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Step 1: Message Received */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  1. Message Received
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  "Did Fran in 8:45, broke up thrusters last round"
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Step 2: Router Detection */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  2. Smart Router Detection
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Intent: workout_logging | Dispatch: WorkoutLoggerAgent
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Step 3: Discipline Classification */}
              <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  3. Discipline Classification
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  "Fran" → CrossFit benchmark | Load CrossFit schema
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Step 4: Structured Extraction */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  4. Structured Extraction (Claude Sonnet)
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Tool use: extract_workout_data with CrossFit schema
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Step 5: Normalization & Validation */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  5. Normalization & Validation
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Data cleanup | Completeness check | Benchmark expansion
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Step 6: Persistence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md">
                <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg p-3 text-center">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-purple text-sm">
                    6a. DynamoDB
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    Structured workout record
                  </p>
                </div>
                <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg p-3 text-center">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-pink text-sm">
                    6b. Pinecone
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    Semantic embedding for search
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            The Extraction in Code
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Simplified extraction flow
            </div>
            <div className="text-synthwave-neon-pink">
              {`const extractWorkout = async (message, userContext) => {`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4 mt-2">
              {`// 1. Classify discipline from content`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const discipline = await classifyDiscipline(message);`}
            </div>
            <div className="text-synthwave-neon-purple pl-4 mt-2">
              {`// 2. Load discipline-specific schema`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const schema = getDisciplineSchema(discipline);`}
            </div>
            <div className="text-synthwave-neon-pink pl-4 mt-2">
              {`// 3. Extract with Claude Sonnet + tool use`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const extraction = await callBedrockWithTools({`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`model: "claude-sonnet-4-5",`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`tools: [extractWorkoutTool(schema)],`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`context: { discipline, userContext }`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">{`});`}</div>
            <div className="text-synthwave-neon-cyan pl-4 mt-2">
              {`// 4. Normalize and validate`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const normalized = await normalizeWorkoutData(extraction);`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const validated = await validateAndEnrich(normalized);`}
            </div>
            <div className="text-synthwave-neon-purple pl-4 mt-2">
              {`// 5. Persist to DynamoDB + Pinecone`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`await Promise.all([`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`saveWorkoutToDynamo(validated),`}
            </div>
            <div className="text-synthwave-text-secondary pl-8">
              {`indexWorkoutInPinecone(validated)`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">{`]);`}</div>
            <div className="text-synthwave-neon-pink">{`};`}</div>
          </div>
        </div>
      </section>

      {/* Multi-Model Orchestration */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Multi-Model Orchestration: Right Model, Right Job
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Not all AI tasks are created equal. A simple "got it, logging that
          now" response doesn't need the same model that extracts complex
          powerlifting periodization data. We orchestrate multiple models
          through Amazon Bedrock, selecting the optimal model for each task
          based on complexity, speed requirements, and cost.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Claude Sonnet */}
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
              Complex Extraction Engine
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              The heavy lifter. Handles nuanced workout extraction,
              multi-exercise sessions, ambiguous descriptions, and complex
              periodization analysis.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Structured data extraction via tool use</li>
              <li>• Benchmark recognition and expansion</li>
              <li>• Context-aware interpretation</li>
              <li>• Multi-turn clarification when needed</li>
            </ul>
          </div>

          {/* Claude Haiku */}
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
              Fast Response Engine
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              The speedster. Handles quick confirmations, simple clarification
              questions, and validation checks where speed matters more than
              deep reasoning.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• "Got it, logging that now" responses</li>
              <li>• Simple yes/no clarifications</li>
              <li>• Quick validation feedback</li>
              <li>• Sub-second response times</li>
            </ul>
          </div>

          {/* Nova 2 Lite */}
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
              Contextual Updates
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              The hype machine. Generates real-time contextual updates that keep
              users engaged during longer extraction processes.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• "Crunching those numbers..." messages</li>
              <li>• Progress feedback during extraction</li>
              <li>• Coach-personality-aware updates</li>
              <li>• Ultra-low latency (~100ms)</li>
            </ul>
          </div>

          {/* Nvidia Embeddings */}
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
              Semantic Embeddings
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              The memory keeper. Generates vector embeddings that enable
              semantic search across your entire workout history.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• State-of-the-art embedding quality</li>
              <li>• Workout similarity search</li>
              <li>• Cross-discipline pattern matching</li>
              <li>• Natural language workout queries</li>
            </ul>
          </div>
        </div>

        {/* Model Selection Logic */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Intelligent Model Selection
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Model selection based on task complexity
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const selectModel = (task) => {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4 mt-1">
              {`if (task.requiresStructuredExtraction) → Sonnet 4.5`}
            </div>
            <div className="text-synthwave-neon-purple pl-4 mt-1">
              {`if (task.isSimpleConfirmation) → Haiku 4.5`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4 mt-1">
              {`if (task.isContextualUpdate) → Nova 2 Lite`}
            </div>
            <div className="text-synthwave-neon-pink pl-4 mt-1">
              {`if (task.needsEmbedding) → NV-Embed-V2`}
            </div>
            <div className="text-synthwave-neon-cyan">{`};`}</div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            This multi-model approach means you get Sonnet-quality extraction
            without paying Sonnet prices for every message. The result: better
            quality AND lower costs.
          </p>
        </div>
      </section>

      {/* Evaluator-Optimizer Pattern */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Evaluator-Optimizer Pattern: Never Save Bad Data
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's a dirty secret about AI extraction: sometimes it gets things
          wrong. "315" could be pounds or kilos. "5x5" could be 5 sets of 5 reps
          or a 5-minute workout done 5 times. Ambiguity is everywhere.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Traditional systems would either guess (often wrong) or ask for
          clarification on everything (annoying). We use the Evaluator-Optimizer
          pattern: the AI evaluates its own confidence and only asks for
          clarification when it actually needs it.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>Evaluator-Optimizer</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            Confidence-Based Flow Control
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Every extraction includes a confidence score. If confidence drops
            below threshold, the agent asks targeted questions. If confidence is
            high, it proceeds immediately—no unnecessary friction.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Evaluator-Optimizer in action
            </div>
            <div className="text-synthwave-neon-purple">
              {`const extraction = await extractWorkout(message);`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`if (extraction.confidence >= 0.9) {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`// High confidence → save immediately`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`await saveWorkout(extraction);`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`return "Got it! Logged your Fran at 8:45. Solid work!";`}
            </div>
            <div className="text-synthwave-neon-cyan">{`}`}</div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`if (extraction.confidence >= 0.7) {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`// Medium confidence → confirm key details`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`return "Quick check: was that 95lb or 95kg on thrusters?";`}
            </div>
            <div className="text-synthwave-neon-cyan">{`}`}</div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`if (extraction.confidence < 0.7) {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`// Low confidence → ask for more context`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`return "I want to make sure I capture this right—"`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`       + "can you tell me more about the workout format?";`}
            </div>
            <div className="text-synthwave-neon-cyan">{`}`}</div>
          </div>
        </div>

        {/* Normalization */}
        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Normalizer: Fixing What's Broken
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            When confidence dips below threshold, we don't just ask questions—we
            also run the extraction through our normalization pipeline. The
            normalizer fixes common issues automatically before the data ever
            hits storage:
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm mb-4">
            <div className="text-synthwave-text-muted mb-2">
              // Normalization catches and fixes
            </div>
            <div className="text-synthwave-neon-cyan">
              {`normalize_workout_data({`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`weight: "135lbs"     → { value: 135, unit: "lb" }`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`time: "8 minutes"    → "8:00"`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`reps: "twenty one"   → 21`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`exercise: "DL"       → "Deadlift"`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`benchmark: "fran"    → "Fran" (canonical name)`}
            </div>
            <div className="text-synthwave-neon-cyan">{`});`}</div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
            This means even messy input—abbreviations, inconsistent formatting,
            mixed units—gets cleaned up before storage. Your data stays
            consistent even when your post-workout brain isn't.
          </p>
        </div>

        {/* Confidence Factors */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What Affects Confidence?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Benchmark recognition:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "Fran" is unambiguous → high confidence. "That workout I saw
                  on Instagram" is not → needs clarification.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Unit ambiguity:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "315 squat" from a US user → probably pounds. From a European
                  user → need to check. Context matters.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Completeness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "Did some squats today" is incomplete. "Back squat 5×5 @ 225"
                  is complete. Missing data triggers clarification.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Historical context:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  If you always log in kg, we assume kg. If you suddenly say
                  "315" we might ask—that's heavy in kg.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Multimodal Input */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Beyond Text: Multimodal Workout Logging
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Words aren't your only option. The Workout Logger Agent has eyes—and
          it can read whiteboards, screenshots, and programming posts just like
          you can. Maybe better, actually. It doesn't get distracted by the gym
          music.
        </p>

        {/* Whiteboard Feature Callout */}
        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>Fan Favorite</span>
            <span className={badgePatterns.muted}>Zero Typing Required</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-purple mb-4">
            Snap the Whiteboard, Skip the Typing
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Walk into your gym, see the workout on the whiteboard, snap a photo,
            and attach it to your message. That's it. The Workout Logger Agent
            reads the coach's handwriting, extracts the workout structure,
            identifies the format (AMRAP, For Time, EMOM, etc.), and creates a
            complete workout record.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            After you finish, just tell your coach your results:{" "}
            <span className="text-synthwave-neon-purple italic">
              "Finished in 12:34, scaled the muscle-ups to pull-ups"
            </span>
            . The agent merges your results with the extracted workout
            structure—complete log, zero manual entry.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Whiteboard workflow
            </div>
            <div className="text-synthwave-neon-purple">
              {`1. [📸 Attach whiteboard photo]`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`2. "Here's today's WOD"`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`   → Agent extracts: movements, weights, rep scheme, format`}
            </div>
            <div className="text-synthwave-neon-purple mt-2">
              {`3. "Done! 14:22, unbroken on the thrusters"`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`   → Complete workout logged with time and notes`}
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            Image Understanding Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Whiteboard Workouts
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Snap a photo of your box's WOD board. The AI reads the workout,
                understands the format, and structures it automatically. Walk
                in, snap, train, done.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Programming Screenshots
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Found a workout on social media? Screenshot it, send it to your
                coach. The agent extracts the workout and asks for your results
                when you're done.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Handwritten Notes
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                That workout you scribbled in your notebook? Photograph it.
                Claude's vision capabilities handle handwriting surprisingly
                well.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                App Screenshots
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Switching from another app? Screenshot your old workout logs and
                we'll import the data. Migration doesn't have to be painful.
              </p>
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Vision + Text = Complete Picture
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The real power comes from combining image understanding with
            conversational context. Send a whiteboard photo with "Did this
            today, took me 12:34" and the agent combines visual extraction with
            your reported time for a complete log.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Multimodal extraction flow
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const extractFromImageAndText = async (image, text) => {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4 mt-1">
              {`// 1. Vision: Extract workout structure from image`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const imageExtraction = await extractFromImage(image);`}
            </div>
            <div className="text-synthwave-neon-purple pl-4 mt-2">
              {`// 2. Text: Extract results and context`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`const textExtraction = await extractFromText(text);`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4 mt-2">
              {`// 3. Merge: Combine workout + results`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`return mergeExtractions(imageExtraction, textExtraction);`}
            </div>
            <div className="text-synthwave-neon-cyan">{`};`}</div>
          </div>
        </div>
      </section>

      {/* From Workouts to Insights */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          From Workouts to Insights: The Analytics Engine
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Logging is just the beginning. Every workout you log feeds into our
          analytics engine, generating insights that reveal patterns you might
          never notice on your own. And because we store workouts semantically
          in Pinecone, your coach can actually query your history intelligently.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Reports */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
              Weekly Reports (Automated)
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Training volume and intensity trends
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Movement pattern distribution
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Recovery indicators and suggestions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Consistency scoring and streaks
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                Personalized coach observations
              </li>
            </ul>
          </div>

          {/* Monthly Reports */}
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
              Monthly Reports (Automated)
            </h3>
            <ul className="space-y-2 text-synthwave-text-secondary font-rajdhani">
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Strength progression analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                PR tracking and celebrations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Discipline balance assessment
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Month-over-month comparisons
              </li>
              <li className="flex items-center gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                Recommendations for next month
              </li>
            </ul>
          </div>
        </div>

        {/* Semantic Search */}
        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            Semantic Workout Search
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Because workouts are indexed in Pinecone as semantic embeddings,
            your coach can query your history in natural language:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <p className="text-synthwave-neon-purple font-rajdhani text-sm font-semibold mb-1">
                "When did I last do Fran?"
              </p>
              <p className="text-synthwave-text-muted font-rajdhani text-xs">
                → Finds your most recent Fran attempt with time and context
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <p className="text-synthwave-neon-purple font-rajdhani text-sm font-semibold mb-1">
                "Show me heavy squat sessions"
              </p>
              <p className="text-synthwave-text-muted font-rajdhani text-xs">
                → Retrieves high-intensity squat workouts by semantic similarity
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <p className="text-synthwave-neon-purple font-rajdhani text-sm font-semibold mb-1">
                "Workouts where I felt great"
              </p>
              <p className="text-synthwave-text-muted font-rajdhani text-xs">
                → Finds sessions with positive sentiment in notes
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3">
              <p className="text-synthwave-neon-purple font-rajdhani text-sm font-semibold mb-1">
                "Compare my Cindy to last month"
              </p>
              <p className="text-synthwave-text-muted font-rajdhani text-xs">
                → Retrieves and compares benchmark attempts over time
              </p>
            </div>
          </div>
        </div>

        {/* Fire and Forget */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Fire-and-Forget Analytics Processing
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Report generation happens asynchronously via Lambda invocations.
            When you complete a workout, we fire off analytics processing
            without blocking your conversation. You chat with your coach while
            insights generate in the background.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Async analytics pipeline
            </div>
            <div className="text-synthwave-neon-cyan">
              {`await saveWorkout(workout);  // Immediate`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`// Fire and forget - don't await`}
            </div>
            <div className="text-synthwave-text-secondary">
              {`invokeAsyncLambda("process-workout-analytics", { workout });`}
            </div>
            <div className="text-synthwave-neon-purple mt-2">
              {`// User continues conversation immediately`}
            </div>
            <div className="text-synthwave-text-secondary">
              {`return streamCoachResponse("Great session! Let's talk about...");`}
            </div>
          </div>
        </div>
      </section>

      {/* Why This Matters */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Why This Changes Everything
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Workout Logger Agent isn't just about convenience—it's about
          creating a training history that's actually useful. Think about every
          workout you've ever done. Now imagine if you could ask questions about
          that entire history in plain English. That's what becomes possible
          when workouts are structured, searchable, and semantically indexed.
        </p>
        <p className={`${typographyPatterns.description} mb-8`}>
          <span className="text-synthwave-neon-pink font-semibold">
            Your training data finally works for you, not against you.
          </span>
        </p>

        <div className={containerPatterns.boldGradient}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            The Compound Effect of Good Data
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            Every workout you log makes your coach smarter. Over time, the
            system learns your patterns, recognizes your strengths and
            weaknesses, and provides increasingly personalized guidance. Month
            one, your coach knows your name. Month six, your coach knows that
            you PR on Thursdays after rest days and struggle with overhead work
            when you're stressed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                ~2s
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Average Log Time
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                9
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Disciplines Supported
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
                100+
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Benchmark Workouts
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                ∞
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Semantic Queries
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try It */}
      <section className="mb-16">
        <div className={`${containerPatterns.mediumGlassCyan}`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            Ready to Stop Fighting Your Fitness App?
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            If you've ever abandoned a workout log because the app made you
            click through 47 screens, NeonPanda was built for you. Log workouts
            the way you actually think about them—in plain English, with photos,
            however makes sense in the moment.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani">
            <span className="text-synthwave-neon-cyan font-semibold">
              Your first coach is free.
            </span>{" "}
            Build a personalized AI coach, log your first workout, and
            experience what happens when your training app actually understands
            fitness.
          </p>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          What's Next: Training Programs That Think
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Individual workouts are powerful, but structured programs are where
          real transformation happens. In the next post, we'll explore the
          Program Designer Agent—the AI that creates intelligent multi-week
          training programs using the Orchestrator and Parallel patterns.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Spoiler: designing a 12-week powerlifting peaking program involves
          orchestrating multiple specialized sub-agents, each handling different
          aspects of periodization, exercise selection, and progression. It's
          where agentic AI gets really interesting.
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
                  The Program Designer Agent & Orchestrator Pattern
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
