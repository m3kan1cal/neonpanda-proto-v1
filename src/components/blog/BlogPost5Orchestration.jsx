import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
  buttonPatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost5Orchestration() {
  return (
    <>
      {/* Introduction */}
      <section className="mb-16">
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          Throughout this series, we've explored each component of NeonPanda's
          AI coaching platform: serverless foundations, hybrid data
          architecture, multi-model orchestration, and four specialized agents.
          Now it's time to see how they work together.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          This is the symphony—multiple AI agents coordinating seamlessly to
          deliver coaching that feels remarkably human. Let's explore how it all
          comes together, the safety systems that protect you, and where we're
          headed next.
        </p>
      </section>

      {/* The Four Agents */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Four Agents in Concert
        </h2>
        <p className={`${typographyPatterns.description} mb-8`}>
          Every interaction with your NeonPanda coach potentially involves
          multiple agents working together. Here's how they coordinate:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Smart Request Router */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-pink/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-pink">
                  1
                </span>
              </div>
              <div>
                <h3 className="font-russo text-lg text-synthwave-neon-pink">
                  Smart Request Router
                </h3>
                <p className="text-synthwave-text-muted text-sm font-rajdhani">
                  The Traffic Controller
                </p>
              </div>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Analyzes every message to determine intent, select optimal models,
              and route to appropriate agents. The orchestration layer.
            </p>
          </div>

          {/* Coach Creator Agent */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-cyan">
                  2
                </span>
              </div>
              <div>
                <h3 className="font-russo text-lg text-synthwave-neon-cyan">
                  Coach Creator Agent
                </h3>
                <p className="text-synthwave-text-muted text-sm font-rajdhani">
                  The Personality Architect
                </p>
              </div>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Builds personalized AI coaches through discovery conversations,
              template selection, and prompt generation.
            </p>
          </div>

          {/* Workout Logger Agent */}
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-purple/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-purple">
                  3
                </span>
              </div>
              <div>
                <h3 className="font-russo text-lg text-synthwave-neon-purple">
                  Workout Logger Agent
                </h3>
                <p className="text-synthwave-text-muted text-sm font-rajdhani">
                  The Training Historian
                </p>
              </div>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Extracts structured workout data from natural language, validates,
              and generates analytics and insights.
            </p>
          </div>

          {/* Program Designer Agent */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-pink/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-pink">
                  4
                </span>
              </div>
              <div>
                <h3 className="font-russo text-lg text-synthwave-neon-pink">
                  Program Designer Agent
                </h3>
                <p className="text-synthwave-text-muted text-sm font-rajdhani">
                  The Programming Mastermind
                </p>
              </div>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Creates intelligent multi-week training programs with proper
              periodization across 9 supported disciplines.
            </p>
          </div>
        </div>
      </section>

      {/* A Day in the Life */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          A Day in the Life: Multi-Agent Workflow
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Let's trace how the agents coordinate during a typical coaching
          session:
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="space-y-6">
            {/* Morning Check-in */}
            <div className="border-l-2 border-synthwave-neon-pink pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                7:00 AM — Morning Check-in
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-2">
                User: "Hey coach, what's on the menu today?"
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded p-3 text-sm font-rajdhani text-synthwave-text-secondary">
                <strong className="text-synthwave-neon-cyan">Router:</strong>{" "}
                Detects simple query → Routes to Haiku 4.5 for fast response
                <br />
                <strong className="text-synthwave-neon-pink">
                  Context:
                </strong>{" "}
                Pulls today's workout from active program via DynamoDB
              </div>
            </div>

            {/* Workout Logging */}
            <div className="border-l-2 border-synthwave-neon-cyan pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                8:30 AM — Post-Workout Log
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-2">
                User: "Crushed it. Hit 225x5 on bench, PR! Then 3 rounds of 10
                pull-ups, 20 pushups in 12 mins"
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded p-3 text-sm font-rajdhani text-synthwave-text-secondary">
                <strong className="text-synthwave-neon-cyan">Router:</strong>{" "}
                Detects workout log intent → Activates Workout Logger Agent
                <br />
                <strong className="text-synthwave-neon-purple">
                  Logger:
                </strong>{" "}
                Extracts via Sonnet 4.5 → Validates → Saves to DynamoDB
                <br />
                <strong className="text-synthwave-neon-pink">
                  Async:
                </strong>{" "}
                Fires analytics generation, Pinecone indexing in background
              </div>
            </div>

            {/* Program Question */}
            <div className="border-l-2 border-synthwave-neon-purple pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                12:00 PM — Program Inquiry
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-2">
                User: "I want to build a 8-week program to prep for my first
                powerlifting meet"
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded p-3 text-sm font-rajdhani text-synthwave-text-secondary">
                <strong className="text-synthwave-neon-cyan">Router:</strong>{" "}
                Detects program design intent → Activates Program Designer Agent
                <br />
                <strong className="text-synthwave-neon-pink">
                  Designer:
                </strong>{" "}
                Starts discovery conversation → Retrieves methodology from
                Pinecone
                <br />
                <strong className="text-synthwave-neon-purple">
                  Build:
                </strong>{" "}
                Async Lambda builds program while conversation continues
              </div>
            </div>

            {/* Evening Reflection */}
            <div className="border-l-2 border-synthwave-neon-pink pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                9:00 PM — Evening Reflection
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-2">
                User: "Shoulder felt a bit tweaky during bench. Should I be
                worried?"
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded p-3 text-sm font-rajdhani text-synthwave-text-secondary">
                <strong className="text-synthwave-neon-cyan">Router:</strong>{" "}
                Detects complex query needing context → Routes to Sonnet 4.5
                <br />
                <strong className="text-synthwave-neon-pink">
                  Context:
                </strong>{" "}
                Semantic search retrieves injury history, recent workouts,
                methodology
                <br />
                <strong className="text-synthwave-neon-purple">
                  Response:
                </strong>{" "}
                Personalized advice considering your full training context
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Complete Pattern Suite */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Complete Pattern Suite
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Throughout this series, we've explored six agentic AI patterns that
          power NeonPanda. Here's the complete picture:
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.cyan}>Router</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Router Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Intelligent request routing based on intent analysis
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.pink}>Assembler</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Assembler Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Combining outputs from multiple sources into cohesive results
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.purple}>Tool-Use</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Tool-Use Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                AI deciding when and how to use specialized tools
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.cyan}>Evaluator</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Evaluator-Optimizer
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Quality assessment with iterative refinement
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.pink}>Orchestrator</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Orchestrator Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Central coordinator managing multi-step workflows
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <span className={badgePatterns.purple}>Parallel</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Parallel Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Concurrent execution of independent tasks
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Layer Safety */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Multi-Layer Safety Validation
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Great coaching pushes you appropriately, never recklessly. We've built
          safety into the core architecture, not as an afterthought.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
            The Safety Stack
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-synthwave-neon-pink/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  1
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Exercise Appropriateness
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Is this suitable for your experience level and current
                  capabilities?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-synthwave-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                  2
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Progression Logic
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Does this follow safe advancement principles without jumping
                  too far ahead?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-synthwave-neon-purple/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                  3
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  Methodology Alignment
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Is this grounded in proven training principles from our
                  validated methodology libraries?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-synthwave-neon-pink/20 flex items-center justify-center flex-shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  4
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Tool-Based Blocking
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Validation tools prevent saving incomplete or potentially
                  harmful recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          The result: push hard with confidence, knowing someone's watching your
          back with the expertise of certified coaches and the vigilance of
          intelligent systems.
        </p>
      </section>

      {/* Semantic Memory */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Semantic Memory: Your Coach Remembers
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Powered by Nvidia NV-Embed-V2 embeddings and Pinecone vector search,
          your coach has semantic memory across everything:
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            "Workout History",
            "Training Programs",
            "User Memories",
            "Coach Configurations",
            "Conversation Summaries",
            "Methodology Knowledge",
          ].map((item, idx) => (
            <div
              key={idx}
              className={`${containerPatterns.cardLight} p-4 text-center`}
            >
              <span className="font-rajdhani font-semibold text-synthwave-text-primary text-sm">
                {item}
              </span>
            </div>
          ))}
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Conversation Summaries
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani">
            After significant conversations, we generate AI summaries that
            capture key insights, decisions, and context. These summaries are
            embedded and stored in Pinecone, allowing your coach to recall
            relevant past discussions even months later.
          </p>
        </div>
      </section>

      {/* The Future */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Future of AI Coaching
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          We're just getting started. The architecture we've built is designed
          for evolution—as models improve, your coaching improves automatically.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-russo text-xl text-white mb-4">What's Coming</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                More Disciplines
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Expanding beyond our initial 9 disciplines based on community
                feedback and demand.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Deeper Personalization
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Enhanced learning algorithms that understand your optimal
                training responses.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Wearable Integration
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Connecting recovery data, HRV, and sleep metrics for truly
                adaptive programming.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Community Features
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Shared challenges, workout partners, and community-driven coach
                templates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The NeonPanda Philosophy */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The NeonPanda Philosophy
        </h2>
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <p className="text-xl text-synthwave-text-primary font-rajdhani leading-relaxed mb-4">
            "At NeonPanda, we believe the best technology disappears into the
            background, leaving you free to focus on what matters most:{" "}
            <strong className="text-synthwave-neon-pink">
              crushing your goals, building confidence, and having genuine fun
              with your fitness journey.
            </strong>
            "
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani">
            We're not building AI for AI's sake—we're creating relationships
            that happen to be powered by artificial intelligence. The tech is
            sophisticated, but the experience is simply... coaching.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mb-8">
        <div className={`${containerPatterns.boldGradient} text-center`}>
          <h2 className={`${typographyPatterns.sectionTitle} mb-4`}>
            Ready to Experience the{" "}
            <span className="text-synthwave-neon-pink">Technology</span>?
          </h2>
          <p
            className={`${typographyPatterns.description} mb-8 max-w-2xl mx-auto`}
          >
            You've seen how it works. Now it's time to feel the difference. Sign
            up for NeonPanda and experience AI coaching that feels like magic.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth" className={buttonPatterns.heroCTA}>
              Sign Up
            </Link>
            <Link to="/technology" className={buttonPatterns.secondary}>
              Explore Full Technology
            </Link>
          </div>

          {/* Launch Info */}
          <div className="flex flex-wrap gap-6 justify-center items-center text-sm font-rajdhani text-synthwave-text-secondary mt-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full animate-pulse"></div>
              <span>Public Launch: Q2 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-pulse"></div>
              <span>9 Disciplines Supported</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-purple rounded-full animate-pulse"></div>
              <span>4 Specialized AI Agents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Series Navigation */}
      <section className="mb-8">
        <div className={containerPatterns.cardLight}>
          <div className="p-6">
            <p className="font-rajdhani text-synthwave-text-muted text-sm uppercase tracking-wide mb-4">
              Explore the Full Series
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/blog/the-foundation"
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                    1
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-pink transition-colors">
                  The Foundation
                </span>
              </Link>
              <Link
                to="/blog/your-coach-your-way"
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                    2
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-cyan transition-colors">
                  Your Coach, Your Way
                </span>
              </Link>
              <Link
                to="/blog/every-rep-counts"
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                    3
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-purple transition-colors">
                  Every Rep Counts
                </span>
              </Link>
              <Link
                to="/blog/training-programs-that-think"
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                    4
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-pink transition-colors">
                  Training Programs That Think
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default BlogPost5Orchestration;
