import React from "react";
import { Link } from "react-router-dom";
import Callout from "./Callout";

function StepCard({ number, title, children }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-2">
          {title}
        </h3>
        <div className="font-body text-synthwave-text-secondary leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function CreatingACoach() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-synthwave-text-muted font-header">
          <span>Getting Started</span>
          <span className="text-synthwave-neon-pink">/</span>
          <span>Creating a Coach</span>
        </div>
        <h1 className="font-header font-bold text-3xl md:text-4xl text-synthwave-text-primary leading-tight">
          Creating a Coach
        </h1>
        <p className="font-body text-lg text-synthwave-text-secondary leading-relaxed max-w-2xl">
          Your AI coach is the foundation of your NeonPanda experience. Every
          coach is uniquely built around your goals, experience level, schedule,
          and training preferences.
        </p>
      </div>

      {/* Overview */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Overview
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          NeonPanda offers two ways to create an AI fitness coach: a guided
          conversational interview with Vesper (our coach-building assistant),
          or instant creation from a pre-built template. Both produce a fully
          personalized coach that knows your background and adapts to your needs.
        </p>
      </div>

      {/* Two paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg border border-synthwave-neon-pink/20 bg-synthwave-bg-card/50 space-y-3">
          <div className="flex items-center space-x-2">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="font-header font-bold text-synthwave-neon-pink">
              Custom Coach
            </h3>
          </div>
          <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
            A conversational interview that covers your goals, history,
            schedule, injuries, equipment, and coaching style preferences. Takes
            a few minutes and produces a deeply personalized coach.
          </p>
        </div>
        <div className="p-5 rounded-lg border border-synthwave-neon-cyan/20 bg-synthwave-bg-card/50 space-y-3">
          <div className="flex items-center space-x-2">
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
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <h3 className="font-header font-bold text-synthwave-neon-cyan">
              From Template
            </h3>
          </div>
          <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
            Pre-built coach archetypes with specific specializations. Instant
            creation — no interview required. A great way to get started
            immediately.
          </p>
        </div>
      </div>

      {/* Custom coach flow */}
      <div className="space-y-6">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          Creating a Custom Coach
        </h2>

        <div className="space-y-8">
          <StepCard number="1" title="Navigate to Coaches">
            <p>
              From the main navigation, go to the <strong>Coaches</strong> page.
              This is your hub for managing all of your AI coaches.
            </p>
          </StepCard>

          <StepCard number="2" title="Start a new coach">
            <p>
              Click <strong>Create Custom Coach</strong>. This opens a
              conversation with Vesper, our coach-building assistant who will
              guide you through the process.
            </p>
          </StepCard>

          <StepCard number="3" title="Answer Vesper's questions">
            <p>
              Vesper will ask about 10 questions covering the key dimensions of
              your training. There are no multiple-choice menus — just talk
              naturally. Topics include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>Your primary fitness goals</li>
              <li>Training experience and background</li>
              <li>Weekly schedule and time availability</li>
              <li>Injuries or limitations</li>
              <li>Available equipment and training environment</li>
              <li>Movement and exercise preferences</li>
              <li>Preferred coaching style (supportive, technical, analytical)</li>
              <li>How you want to measure success</li>
              <li>Competition goals (optional, experience-dependent)</li>
            </ul>
          </StepCard>

          <StepCard number="4" title="Coach is built">
            <p>
              Once the conversation is complete, your coach configuration is
              assembled in the background. This typically takes a minute or two.
              You can monitor the build status from the Coaches page.
            </p>
          </StepCard>

          <StepCard number="5" title="Start training">
            <p>
              When your coach is ready, select it from the Coaches page to enter
              the <strong>Training Grounds</strong> — your personalized training
              dashboard where you can chat, log workouts, and design programs.
            </p>
          </StepCard>
        </div>
      </div>

      {/* Template coach flow */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Creating from a Template
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          If you want to get started instantly, choose a template from the
          Coaches page. Template coaches come pre-configured with specific
          specializations and coaching personalities. Select a template, and
          your coach is created immediately — no interview needed.
        </p>
        <Callout type="tip">
          Template coaches are a great way to explore NeonPanda quickly. You
          can always create a custom coach later for a more personalized
          experience.
        </Callout>
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-purple uppercase tracking-wide">
          Tips for a Better Coach
        </h2>
        <div className="space-y-3">
          <Callout type="tip">
            <strong>Be specific about your goals.</strong> Instead of "get fit,"
            try "improve my 5K time from 28 to 24 minutes" or "build strength
            for a Hyrox competition." The more detail you provide, the more
            personalized your coach becomes.
          </Callout>
          <Callout type="tip">
            <strong>Mention your schedule constraints.</strong> If you can only
            train 3 days a week or have mornings-only availability, say so.
            Your coach will adapt programming to fit your life.
          </Callout>
          <Callout type="info">
            <strong>Injuries matter.</strong> Be upfront about current or past
            injuries. Your coach will work around limitations and suggest
            alternative movements.
          </Callout>
        </div>
      </div>

      {/* Next steps */}
      <div className="p-6 rounded-lg border border-synthwave-neon-pink/20 bg-synthwave-neon-pink/5 space-y-3">
        <h3 className="font-header font-bold text-synthwave-text-primary">
          What's next?
        </h3>
        <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
          Now that you have a coach, you can{" "}
          <Link
            to="/docs/logging-workouts"
            className="text-synthwave-neon-pink hover:underline font-medium"
          >
            log your first workout
          </Link>{" "}
          or{" "}
          <Link
            to="/docs/coach-conversations"
            className="text-synthwave-neon-cyan hover:underline font-medium"
          >
            start a conversation
          </Link>{" "}
          with your coach for personalized guidance.
        </p>
      </div>
    </div>
  );
}

export default CreatingACoach;
