import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost2CoachCreator() {
  return (
    <>
      {/* Introduction */}
      <section className="mb-16">
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          Every great coaching relationship starts with connection. The best
          coaches understand not just what you want to achieve, but how you want
          to get there—your preferred communication style, what motivates you,
          and the discipline-specific expertise you need.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          At NeonPanda, we believe your AI coach should feel genuinely personal,
          not cookie-cutter. This post explores how our hybrid data architecture
          and Coach Creator Agent work together to build coaches that truly
          understand you.
        </p>
      </section>

      {/* The Hybrid Data Architecture */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The Hybrid Data Architecture
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Building personalized AI coaches requires storing and retrieving vast
          amounts of context efficiently. We designed a hybrid approach that
          uses the right storage for each data type.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* DynamoDB */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-DynamoDB_64.svg"
                alt="DynamoDB"
                className="w-10 h-10"
              />
              <h3 className="font-russo text-lg text-synthwave-neon-cyan">
                DynamoDB
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              Real-Time Data
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Coach configurations, active sessions, user preferences. Data
              accessed on every request with single-digit millisecond latency.
            </p>
          </div>

          {/* S3 */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Simple-Storage-Service_64.svg"
                alt="S3"
                className="w-10 h-10"
              />
              <h3 className="font-russo text-lg text-synthwave-neon-pink">
                Amazon S3
              </h3>
            </div>
            <p className="text-synthwave-neon-pink font-rajdhani font-semibold mb-2">
              Archival Storage
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Full conversation transcripts, detailed program specifications,
              workout analysis reports. Rich context retrieved when needed.
            </p>
          </div>

          {/* Pinecone */}
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-lg p-1">
                <img
                  src="/images/icons/pinecone-logo.svg"
                  alt="Pinecone"
                  className="w-8 h-8"
                />
              </div>
              <h3 className="font-russo text-lg text-synthwave-neon-purple">
                Pinecone
              </h3>
            </div>
            <p className="text-synthwave-neon-purple font-rajdhani font-semibold mb-2">
              Semantic Search
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              Vector embeddings of workouts, memories, methodologies. Find
              relevant context by meaning, not just keywords.
            </p>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            The 90% Storage Cost Reduction
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            By moving infrequently accessed data like full conversation
            transcripts to S3 while keeping hot data in DynamoDB, we achieved a
            90% reduction in storage costs—savings we pass on to users through
            accessible pricing.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Data flow pattern
            </div>
            <div className="text-synthwave-neon-pink">
              {`DynamoDB → Active coaching sessions (real-time)`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`S3 → Conversation archives (retrieved on demand)`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`Pinecone → Semantic context (meaning-based retrieval)`}
            </div>
          </div>
        </div>
      </section>

      {/* Coach Templates */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Coach Templates: Ready-Made Excellence
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Not everyone wants to build a coach from scratch. Our library of
          pre-built coach templates lets you start training immediately with
          proven coaching styles across all 8 supported disciplines.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-russo text-xl text-white mb-4">
            Template Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div
                key={idx}
                className="bg-synthwave-bg-primary/30 rounded-lg p-3 text-center"
              >
                <span className="font-rajdhani font-semibold text-synthwave-text-primary text-sm">
                  {discipline}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className={typographyPatterns.description}>
          Each template includes discipline-specific methodology knowledge,
          proven coaching personality prompts, and appropriate communication
          styles. Select a template, customize what you want, and start
          training.
        </p>
      </section>

      {/* Agent Spotlight: Coach Creator Agent */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
            <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">
              2
            </span>
          </div>
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-0`}
            >
              Agent Spotlight: Coach Creator Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "Your Personality Architect"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Coach Creator Agent doesn't just fill out a form—it orchestrates a
          sophisticated multi-tool workflow that discovers who you are and
          builds a coach that matches.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            The Creation Workflow
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
                  Discovery Conversation
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Adaptive questions that feel like coffee chats with a
                  perceptive friend. Understanding your goals, training style,
                  and what motivates you.
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
                  Template Selection
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  AI analyzes your responses to select the optimal personality
                  and methodology templates from our curated library.
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
                  Prompt Generation
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Using planner models (Sonnet 4.5), the agent generates custom
                  personality prompts that capture your unique coaching
                  preferences.
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
                  Configuration Assembly
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  All components merge into a complete coach configuration,
                  stored in DynamoDB for instant access on every interaction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assembler Pattern */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.pink}>Assembler Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
            The Assembler Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Assembler Pattern combines outputs from multiple sources into
            cohesive results. The Coach Creator Agent uses this pattern to
            merge:
          </p>
          <ul className="space-y-2 font-rajdhani text-synthwave-text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-pink">•</span>
              User preferences from the discovery conversation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-pink">•</span>
              Personality traits from selected templates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-pink">•</span>
              Methodology knowledge from discipline databases
            </li>
            <li className="flex items-center gap-2">
              <span className="text-synthwave-neon-pink">•</span>
              Generated personality prompts from AI synthesis
            </li>
          </ul>
          <div className="mt-4 bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Assembler pattern in action
            </div>
            <div className="text-synthwave-neon-pink">
              {`const coachConfig = assemble({`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`personality: generatedPrompt,`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`methodology: disciplineKnowledge,`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`preferences: userDiscovery,`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`template: selectedBase`}
            </div>
            <div className="text-synthwave-neon-pink">{`});`}</div>
          </div>
        </div>
      </section>

      {/* Smart Prompt Assembly */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Smart Prompt Assembly
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Every time you message your coach, we don't just send your message to
          an AI—we construct an intelligent prompt on-the-fly that includes only
          the context required for that specific request.
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            Context Assembly
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Always Included
              </h4>
              <ul className="text-synthwave-text-secondary font-rajdhani text-sm space-y-1">
                <li>• Coach personality prompt</li>
                <li>• User timezone & preferences</li>
                <li>• Current conversation context</li>
              </ul>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Dynamically Retrieved
              </h4>
              <ul className="text-synthwave-text-secondary font-rajdhani text-sm space-y-1">
                <li>• Relevant memories (via Pinecone)</li>
                <li>• Recent workouts (if discussing progress)</li>
                <li>• Methodology knowledge (if giving advice)</li>
              </ul>
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          This approach minimizes token usage while maximizing accuracy. Your
          coach always has the context it needs, without wasting resources on
          irrelevant information.
        </p>
      </section>

      {/* The Coach Personality System */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The Coach Personality System
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Your coach's personality isn't a simple setting—it's a sophisticated
          system of prompts that guide how the AI communicates, motivates, and
          adapts to your needs.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-4">
            Personality Components
          </h3>
          <div className="space-y-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Communication Style
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                How your coach speaks—direct and no-nonsense, warm and
                encouraging, technical and analytical, or playfully motivating.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Expertise Focus
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Discipline-specific knowledge and terminology. A CrossFit coach
                talks EMOMs and AMRAPs; a powerlifter discusses RPE and
                periodization blocks.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Motivation Approach
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                What pushes you forward—celebrating small wins, focusing on
                long-term goals, competitive benchmarking, or community
                connection.
              </p>
            </div>
          </div>
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
          With your personalized coach created, it's time to start training. In
          the next post, we'll explore how the Workout Logger Agent turns your
          natural language descriptions into structured data—and how multi-model
          AI orchestration powers every interaction.
        </p>

        <div className={containerPatterns.cardLight}>
          <div className="p-6">
            <p className="font-rajdhani text-synthwave-text-muted text-sm uppercase tracking-wide mb-2">
              Next in the Series
            </p>
            <Link
              to="/blog/every-rep-counts"
              className="group flex items-center justify-between"
            >
              <div>
                <h3 className="font-russo text-xl text-synthwave-neon-purple group-hover:text-synthwave-neon-pink transition-colors">
                  Every Rep Counts
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  The Workout Logger Agent & Multi-Model Orchestration
                </p>
              </div>
              <svg
                className="w-6 h-6 text-synthwave-neon-purple group-hover:text-synthwave-neon-pink group-hover:translate-x-1 transition-all"
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

export default BlogPost2CoachCreator;
