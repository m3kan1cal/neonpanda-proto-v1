import React from "react";
import { Link } from "react-router-dom";

function Callout({ type = "info", children }) {
  const styles = {
    info: "border-synthwave-neon-cyan/30 bg-synthwave-neon-cyan/5 text-synthwave-neon-cyan",
    tip: "border-synthwave-neon-green/30 bg-synthwave-neon-green/5 text-synthwave-neon-green",
    warning: "border-synthwave-neon-orange/30 bg-synthwave-neon-orange/5 text-synthwave-neon-orange",
  };
  const icons = {
    info: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    tip: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    ),
  };

  return (
    <div className={`flex items-start space-x-3 p-4 rounded-lg border ${styles[type]}`}>
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icons[type]}
      </svg>
      <div className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <div className="rounded-lg border border-synthwave-neon-cyan/15 bg-synthwave-bg-primary/80 p-4 font-ai text-sm text-synthwave-neon-cyan leading-relaxed overflow-x-auto">
      {children}
    </div>
  );
}

function LoggingWorkouts() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-synthwave-text-muted font-header">
          <span>Core Features</span>
          <span className="text-synthwave-neon-pink">/</span>
          <span>Logging Workouts</span>
        </div>
        <h1 className="font-header font-bold text-3xl md:text-4xl text-synthwave-text-primary leading-tight">
          Logging Workouts
        </h1>
        <p className="font-body text-lg text-synthwave-text-secondary leading-relaxed max-w-2xl">
          NeonPanda uses AI to turn natural language descriptions of your
          training into structured, queryable workout data. Just describe what
          you did, and the platform handles the rest.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          How It Works
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Workout logging in NeonPanda is powered by a multi-model AI pipeline.
          You describe your workout in everyday language, and the system
          extracts exercises, sets, reps, weights, durations, and performance
          metrics automatically. Your coach remembers everything and uses it
          to personalize future guidance.
        </p>
      </div>

      {/* Quick log flow */}
      <div className="space-y-6">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          Quick Log via Command Palette
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          The fastest way to log a workout is through the command palette. This
          is available from anywhere in the app.
        </p>

        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                Open the command palette
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                Press{" "}
                <kbd className="px-2 py-0.5 rounded bg-synthwave-bg-card border border-synthwave-neon-cyan/20 text-synthwave-neon-cyan font-ai text-xs">
                  Cmd+K
                </kbd>{" "}
                (Mac) or{" "}
                <kbd className="px-2 py-0.5 rounded bg-synthwave-bg-card border border-synthwave-neon-cyan/20 text-synthwave-neon-cyan font-ai text-xs">
                  Ctrl+K
                </kbd>{" "}
                (Windows/Linux), or tap the <strong>Log Workout</strong> button
                on your Training Grounds dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                Describe your workout
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                Type a natural language description of what you did. Be as
                brief or detailed as you like.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                AI processes in the background
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                After you submit, the AI extracts structured data from your
                description. This happens asynchronously — you can continue
                using the app while it processes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Example Inputs
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Here are some examples of how you can describe workouts. NeonPanda
          understands a wide range of formats and disciplines.
        </p>

        <div className="space-y-3">
          <div>
            <p className="font-body text-xs text-synthwave-text-muted uppercase tracking-wide mb-1">
              CrossFit / Functional Fitness
            </p>
            <CodeBlock>
              Did Fran today — 21-15-9 thrusters (95lb) and pull-ups. Finished
              in 8:45. Felt strong on the thrusters but grip started going on
              the last set of pull-ups.
            </CodeBlock>
          </div>

          <div>
            <p className="font-body text-xs text-synthwave-text-muted uppercase tracking-wide mb-1">
              Strength Training
            </p>
            <CodeBlock>
              Back squat day. Worked up to 315x3, then 3x5 at 275. Added
              Romanian deadlifts 3x8 at 225 and leg press 4x12.
            </CodeBlock>
          </div>

          <div>
            <p className="font-body text-xs text-synthwave-text-muted uppercase tracking-wide mb-1">
              Running / Cardio
            </p>
            <CodeBlock>
              Morning run — 5 miles in 42 minutes. Easy pace, felt smooth. Heart
              rate stayed around 145.
            </CodeBlock>
          </div>

          <div>
            <p className="font-body text-xs text-synthwave-text-muted uppercase tracking-wide mb-1">
              Quick Log
            </p>
            <CodeBlock>
              30 min yoga session, focused on hip openers and hamstrings
            </CodeBlock>
          </div>
        </div>
      </div>

      {/* In-chat logging */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          Logging via Coach Conversation
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          You can also log workouts directly within a{" "}
          <Link
            to="/docs/coach-conversations"
            className="text-synthwave-neon-cyan hover:underline"
          >
            coach conversation
          </Link>{" "}
          using the <code className="px-1.5 py-0.5 rounded bg-synthwave-bg-card border border-synthwave-neon-cyan/15 text-synthwave-neon-cyan font-ai text-sm">/log-workout</code>{" "}
          slash command. Type the command followed by your workout description,
          and the AI will process it in context with your coach's knowledge of
          your training history.
        </p>
        <Callout type="tip">
          Logging through a conversation lets your coach provide immediate
          feedback, track trends, and offer suggestions based on what you just
          did.
        </Callout>
      </div>

      {/* What gets captured */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-purple uppercase tracking-wide">
          What Gets Captured
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          The AI automatically extracts and structures the following from your
          workout description:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Discipline", desc: "Strength, cardio, CrossFit, yoga, etc." },
            { label: "Exercises", desc: "Individual movements with sets, reps, and weight" },
            { label: "Duration", desc: "Total workout time and rest periods" },
            { label: "Performance", desc: "Completion times, heart rate, perceived effort" },
            { label: "PRs", desc: "Personal records are automatically detected and tracked" },
            { label: "Summary", desc: "AI-generated summary for quick reference" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-md border border-synthwave-neon-cyan/10 bg-synthwave-bg-card/30"
            >
              <p className="font-header font-bold text-sm text-synthwave-neon-cyan">
                {item.label}
              </p>
              <p className="font-body text-xs text-synthwave-text-muted mt-0.5">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Program logging */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Program-Based Logging
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          If you're following a training program, you can log workouts directly
          from the program view. Navigate to your program's daily workout and
          use the log action — the system automatically links your log to the
          correct program day and template, tracking adherence and progression.
        </p>
      </div>

      {/* Viewing history */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          Viewing Your Workout History
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          All logged workouts appear on your Training Grounds dashboard with
          recent entries, workout counts, active streaks, and PR highlights.
          Click any workout to see the full structured detail view with
          exercises, metrics, and AI-generated insights.
        </p>
        <Callout type="info">
          Your workout history is used by your coach to provide personalized
          recommendations, track progress over time, and generate weekly
          training reports.
        </Callout>
      </div>

      {/* Next steps */}
      <div className="p-6 rounded-lg border border-synthwave-neon-pink/20 bg-synthwave-neon-pink/5 space-y-3">
        <h3 className="font-header font-bold text-synthwave-text-primary">
          What's next?
        </h3>
        <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
          Now that you know how to log workouts, learn how to{" "}
          <Link
            to="/docs/coach-conversations"
            className="text-synthwave-neon-cyan hover:underline font-medium"
          >
            start a conversation with your coach
          </Link>{" "}
          to get personalized feedback and training guidance.
        </p>
      </div>
    </div>
  );
}

export default LoggingWorkouts;
