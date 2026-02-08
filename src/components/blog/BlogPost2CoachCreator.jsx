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
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-rajdhani text-xl text-white leading-relaxed italic">
            "Meet Alex—they want a coach who speaks in metrics and periodization
            blocks. Sarah prefers encouragement and celebration of small wins.
            Marcus needs someone who understands competition prep. Three users,
            three completely different coaching styles, all powered by the same
            platform..."
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          The dirty secret of AI coaching? Most platforms give everyone the same
          coach with a different name. Change the avatar, tweak a prompt or
          two—but under the hood, it's cookie-cutter responses for everyone.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          We decided that was unacceptable. A real coaching relationship isn't
          just about expertise—it's about understanding how someone thinks,
          learns, and stays motivated. It's the difference between "Do 3 sets of
          10" and knowing that Marcus responds better to "Let's crush this
          hypertrophy block before we peak for Nationals."
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-cyan font-semibold">
            This is the story of how we built coaches that actually feel
            personal.
          </span>{" "}
          Spoiler: it involves three different storage systems, a vector
          database, and an AI that interviews you better than most humans.
        </p>
      </section>

      {/* The Problem: Generic AI */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Problem: Generic AI Is Boring (and Bad)
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's what happens when you build AI coaching the "easy" way: you
          write a system prompt that says "You are a helpful fitness coach,"
          throw in some exercise knowledge, and call it a day. The result?
          Responses that feel like they came from a fitness chatbot, not a coach
          who knows you.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            What Generic Coaching Looks Like
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Same voice for everyone:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Whether you're a competitive athlete or a busy parent trying
                  to stay active, you get the same peppy, generic encouragement.
                  It's like being coached by a motivational poster.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  No memory of what matters:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Tell the AI about your shoulder injury on Monday, and by
                  Wednesday it's programming overhead pressing. Context gets
                  lost in the void.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Wrong methodology for your goals:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  You're training for CrossFit, but the AI keeps suggesting
                  bodybuilding splits. It doesn't know the difference because
                  nobody taught it to care.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          We needed a fundamentally different approach—one that stores rich
          context about each user and coach configuration, retrieves it
          intelligently, and assembles it into coaching that feels genuinely
          personal.
        </p>
      </section>

      {/* The Hybrid Data Architecture */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The Hybrid Data Architecture: Three Systems, One Goal
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Building personalized AI coaching revealed an interesting data
          problem: different types of information have radically different
          access patterns. Some data needs to be available in milliseconds on
          every request. Other data might be accessed once a week. And some
          data—the really valuable stuff—needs to be searchable by meaning, not
          just keywords.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Trying to solve all three problems with one database? That's how you
          end up with either slow responses or bankruptcy-inducing storage
          costs. We went hybrid instead.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* DynamoDB */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-DynamoDB_64.svg"
                alt="DynamoDB"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                DynamoDB
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              Real-Time State
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-4">
              Coach configurations, active sessions, user preferences. This is
              the hot data—accessed on literally every request.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <span className="text-synthwave-neon-cyan">~5ms</span>
              <span className="text-synthwave-text-muted"> read latency</span>
            </div>
          </div>

          {/* S3 */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Simple-Storage-Service_64.svg"
                alt="S3"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                Amazon S3
              </h3>
            </div>
            <p className="text-synthwave-neon-pink font-rajdhani font-semibold mb-2">
              Archival Storage
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-4">
              Full conversation transcripts, detailed program specs, workout
              analysis reports. Rich context retrieved when needed.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <span className="text-synthwave-neon-pink">90%</span>
              <span className="text-synthwave-text-muted"> cost reduction</span>
            </div>
          </div>

          {/* Pinecone */}
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
              Semantic Search
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-4">
              Vector embeddings of workouts, memories, methodology knowledge.
              Find context by meaning, not just keywords.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <span className="text-synthwave-neon-purple">meaning-based</span>
              <span className="text-synthwave-text-muted"> retrieval</span>
            </div>
          </div>
        </div>

        {/* Data Flow Diagram */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            How Data Flows Through the System
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-3">
              // Every coach interaction
            </div>
            <div className="text-synthwave-neon-cyan">
              {`1. DynamoDB → fetch coachConfig, userPrefs, activeSession`}
            </div>
            <div className="text-synthwave-neon-purple mt-2">
              {`2. Pinecone → semantic search for relevant memories/workouts`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`3. S3 → (if needed) retrieve full transcripts or program specs`}
            </div>
            <div className="text-synthwave-text-secondary mt-3">
              {`4. Assemble context → send to Claude → stream response`}
            </div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            The magic is in step 2—Pinecone finds relevant context even when
            users don't use the exact right words. "That shoulder thing"
            retrieves the memory about rotator cuff tendinitis because the
            meanings are similar.
          </p>
        </div>

        <div className={containerPatterns.boldGradient}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            The Cost Efficiency Win
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            By moving rarely-accessed data to S3 (conversation archives, old
            workout details), we achieved a 90% reduction in storage costs
            compared to keeping everything in DynamoDB. That's savings we pass
            on through accessible pricing—not profit margin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                DynamoDB
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Hot data only (~10KB/user)
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                S3
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Archives (~5MB/user/month)
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
                Pinecone
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Semantic index (~500 vectors/user)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coach Templates */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Coach Templates: Standing on the Shoulders of Experts
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Not everyone wants to spend 30 minutes describing their perfect coach.
          (Though for those who do—we've got you covered. More on that in a
          moment.) Our template library lets you start training immediately with
          coaching styles based on real methodology expertise.
        </p>

        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            10 Disciplines, Countless Coaching Styles
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { name: "CrossFit", detail: "MetCon mastery" },
              { name: "Powerlifting", detail: "Strength periodization" },
              { name: "Olympic Weightlifting", detail: "Technical precision" },
              { name: "Bodybuilding", detail: "Hypertrophy focus" },
              { name: "Running", detail: "Endurance programming" },
              { name: "HYROX", detail: "Hybrid competition" },
              { name: "Calisthenics", detail: "Skill progressions" },
              { name: "Functional Bodybuilding", detail: "Best of both" },
              {
                name: "Circuit Training",
                detail: "F45, Orange Theory, boot camps, community classes",
              },
            ].map((discipline, idx) => (
              <div
                key={idx}
                className="bg-synthwave-bg-primary/40 rounded-lg p-3 text-center border border-synthwave-neon-cyan/20"
              >
                <span className="font-rajdhani font-semibold text-synthwave-text-primary text-sm block">
                  {discipline.name}
                </span>
                <span className="font-rajdhani text-synthwave-text-muted text-xs">
                  {discipline.detail}
                </span>
              </div>
            ))}
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani">
            Each template includes discipline-specific terminology,
            periodization knowledge, and appropriate communication styles. A
            CrossFit coach knows what "Fran" means. A powerlifting coach
            understands RPE scales and peaking protocols.
          </p>
        </div>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            Personality Templates: More Than Communication Style
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                The Drill Sergeant
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Direct, no-nonsense, accountability-focused. "Did you do your
                accessory work? Good. If not, that's the priority before we add
                volume."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                The Sports Scientist
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Data-driven, analytical, explains the "why." "Your volume is
                trending up 12% while intensity holds—classic accumulation
                pattern."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                The Hype Coach
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Energetic, celebratory, motivational. "That PR was coming—I
                could see it in your training logs. You're built different."
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                The Mentor
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Patient, educational, growth-focused. "Let's talk about why that
                lift didn't feel right and what we can adjust for next time."
              </p>
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          Templates are starting points, not limitations. Every template can be
          customized, combined, or completely reimagined through our Coach
          Creator Agent.
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
              Agent Spotlight: The Coach Creator Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Personality Architect"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          Here's where it gets interesting. The Coach Creator Agent isn't a
          form—it's a sophisticated AI interviewer that discovers who you are
          and builds a coach configuration that actually matches. Think of it as
          a personality assessment meets coaching consultation, powered by
          Claude Sonnet 4.5.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Assembler Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Assembler Pattern in Action
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Assembler Pattern combines outputs from multiple sources into
            cohesive results. Unlike the Router Pattern (which directs traffic),
            the Assembler synthesizes—taking inputs from different places and
            merging them into something greater than the sum of its parts.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Coach Creator assembles from multiple sources
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const coachConfig = await assembleCoach({`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`  userDiscovery,      // From Creator conversation`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  selectedTemplate,   // Base personality/methodology`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`  customizations,     // User modifications`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`  generatedPrompt     // AI-synthesized personality`}
            </div>
            <div className="text-synthwave-neon-cyan">{`});`}</div>
          </div>
        </div>

        {/* The Discovery Flow */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.pink}>Discovery Flow</span>
            <span className={badgePatterns.muted}>Multi-Step Process</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Discovery Workflow
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            The Coach Creator doesn't just ask questions—it conducts an adaptive
            interview where each response shapes the next question. The
            conversation feels natural, like chatting with a perceptive friend
            about what you're looking for in a coach. Behind every exchange, the
            AI is building a model of your preferences that will shape every
            future interaction.
          </p>

          {/* Visual Flow */}
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Step 1 */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  1. Discovery Conversation
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Adaptive questions about goals, style, and motivation
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
                  2. Pattern Recognition
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  AI analyzes responses to identify coaching preferences
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Step 3 */}
              <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  3. Template Selection + Customization
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Match to optimal base template, apply personalization
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Step 4 */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  4. Personality Prompt Generation
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Sonnet 4.5 synthesizes a unique coaching personality
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What Makes It Special */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What Makes the Coach Creator Actually Smart
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Adaptive questioning:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  If you mention competition, it asks about timeline and
                  experience. If you mention injury history, it probes for
                  current limitations. The conversation branches based on what
                  matters to you.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Implicit preference detection:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  How you describe past coaches reveals preferences you might
                  not articulate directly. "My old coach was too soft" means you
                  want accountability. "They overwhelmed me with data" means you
                  prefer simple guidance.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Cross-discipline awareness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Training for a powerlifting meet but also doing CrossFit? The
                  Creator understands hybrid athletes and builds coaches that
                  can navigate multiple methodologies intelligently.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Tool-use for precision:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  The Creator uses Bedrock's native tool-use capability to
                  extract structured data from conversations—ensuring nothing
                  gets lost in translation.
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* True AI Agents Philosophy */}
        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.purple}>AI Philosophy</span>
            <span className={badgePatterns.muted}>True Autonomy</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-4">
            Our Philosophy: Tools + Instructions, Not Scripts
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Here's what sets the Coach Creator apart from typical AI
            implementations: we don't script every possible conversation path.
            Instead, we provide the LLM with{" "}
            <span className="text-synthwave-neon-purple font-semibold">
              tools and instructions
            </span>
            , then trust it to make intelligent decisions to achieve its
            goal—creating a truly personal coach for you.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            This is what we mean by{" "}
            <span className="text-synthwave-neon-cyan font-semibold">
              true AI agents with LLM autonomy
            </span>
            . The Creator has access to tools for saving memories, updating
            coach configurations, querying templates, and generating personality
            prompts. It decides when to use each tool, what questions to ask,
            and how to adapt based on your responses—all in service of the
            singular goal of building a coach that genuinely fits you.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Agent receives goal + tools, makes autonomous decisions
            </div>
            <div className="text-synthwave-neon-purple">
              {`Goal: "Create a personalized coach for this user"`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`Tools: [saveMemory, updateConfig, queryTemplates, generatePrompt]`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`Instructions: "Discover preferences, match methodology, synthesize personality"`}
            </div>
            <div className="text-synthwave-text-secondary mt-2">
              {`→ LLM autonomously decides: questions, tool calls, conversation flow`}
            </div>
          </div>
        </div>

        {/* Multi-Model Orchestration */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Multi-Model</span>
            <span className={badgePatterns.muted}>Intelligent Routing</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Multi-LLM Orchestration in the Coach Creator
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Coach Creator doesn't rely on a single model—it orchestrates
            multiple LLMs, each chosen for their strengths. Different tasks
            require different capabilities, and we route intelligently to
            optimize for both quality and cost.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Claude Sonnet 4.5
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Complex reasoning, personality synthesis, and final coach prompt
                generation. When nuance matters, Sonnet delivers.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Claude Haiku 4.5
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Fast conversational responses during discovery. Quick pattern
                recognition and adaptive questioning at low latency.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Amazon Nova Lite
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Template matching and preference classification. Efficient
                analysis of user responses against our methodology database.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Amazon Nova 2 Lite
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Real-time contextual updates and progress feedback. Ultra-low
                latency for ephemeral UI messages during coach creation.
              </p>
            </div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            This multi-model approach means you get Sonnet-quality personality
            synthesis without paying Sonnet prices for every conversational
            turn. The Coach Creator is smart about being smart.
          </p>
        </div>
      </section>

      {/* The Coach Personality System */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Under the Hood: The Personality Prompt System
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          A coach's "personality" isn't a single prompt—it's a layered system
          that controls how the AI thinks, speaks, and prioritizes. Let's look
          at what actually gets assembled:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Core Identity */}
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-3">
              Core Identity
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              The fundamental personality traits that define how the coach
              communicates:
            </p>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  Communication style (direct, warm, analytical, motivational)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  Feedback approach (constructive, celebratory, honest)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  Technical depth preference (simplified, detailed, contextual)
                </span>
              </li>
            </ul>
          </div>

          {/* Methodology Knowledge */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              Methodology Knowledge
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Discipline-specific expertise that shapes advice and programming:
            </p>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Training terminology and concepts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Periodization patterns and principles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Competition preparation protocols</span>
              </li>
            </ul>
          </div>

          {/* User Context */}
          <div className={containerPatterns.mediumGlassPurple}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-3">
              User Context
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Dynamic information that personalizes every interaction:
            </p>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Training history and recent workouts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Saved memories (injuries, preferences, goals)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Current program phase and progress</span>
              </li>
            </ul>
          </div>

          {/* Behavioral Guardrails */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              Behavioral Guardrails
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Safety and consistency rules that prevent coaching mistakes:
            </p>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Medical disclaimer requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Injury-aware programming constraints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Response format consistency</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Prompt Assembly Code */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Dynamic Prompt Assembly
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Every message triggers intelligent context assembly
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const systemPrompt = buildCoachPrompt({`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`  corePersonality: coachConfig.personality,`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  methodology: coachConfig.disciplines,`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`  memories: await queryPinecone(message, userId),`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`  recentWorkouts: routerAnalysis.needsWorkouts`}
            </div>
            <div className="text-synthwave-text-secondary pl-6">
              {`    ? await getRecentWorkouts(userId) : null,`}
            </div>
            <div className="text-synthwave-text-secondary pl-4">
              {`  activeProgram: routerAnalysis.needsProgram`}
            </div>
            <div className="text-synthwave-text-secondary pl-6">
              {`    ? await getActiveProgram(userId) : null`}
            </div>
            <div className="text-synthwave-neon-cyan">{`});`}</div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani mt-4 text-sm">
            Notice how context is loaded conditionally—we don't waste tokens
            fetching workout history for a simple "good morning" message. The
            Smart Request Router (from the last post) tells us exactly what
            context is needed.
          </p>
        </div>
      </section>

      {/* Why This Architecture Matters */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Why This Architecture Matters
        </h2>
        <p className={`${typographyPatterns.description} mb-8`}>
          The hybrid data architecture isn't just an engineering flex—it
          directly enables features that wouldn't be possible otherwise:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Semantic Memory */}
          <div className={containerPatterns.mediumGlassPurple}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-3">
              Semantic Memory Search
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              "Remember that thing I mentioned about my knee" actually works.
              Pinecone finds relevant memories by meaning, not keyword matching.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-text-muted">
                {`"that knee thing" → finds`}
              </div>
              <div className="text-synthwave-neon-purple">
                {`"Patellar tendinitis - avoid deep squats"`}
              </div>
            </div>
          </div>

          {/* Instant Recall */}
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-3">
              Instant Coach Recall
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Coach configuration loads in under 5ms from DynamoDB. No
              "loading..." states when starting a conversation.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-text-muted">
                {`DynamoDB single-table design`}
              </div>
              <div className="text-synthwave-neon-pink">
                {`pk: user#userId, sk: coach#coachId`}
              </div>
            </div>
          </div>

          {/* Rich Context */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              Rich Historical Context
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Full conversation transcripts in S3 mean the coach can reference
              discussions from months ago—retrieved on demand when relevant.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-text-muted">
                {`S3 transcript retrieval`}
              </div>
              <div className="text-synthwave-neon-cyan">
                {`~100ms when specifically needed`}
              </div>
            </div>
          </div>

          {/* Affordable at Scale */}
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-3">
              Affordable at Scale
            </h3>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Tiered storage means we can offer unlimited conversation history
              without passing massive storage bills to users.
            </p>
            <div className="bg-synthwave-bg-primary/30 rounded-lg p-3 font-mono text-xs">
              <div className="text-synthwave-text-muted">
                {`S3 storage cost`}
              </div>
              <div className="text-synthwave-neon-pink">
                {`$0.023/GB vs DynamoDB $0.25/GB`}
              </div>
            </div>
          </div>
        </div>

        <div className={containerPatterns.boldGradient}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            The Result: Coaches That Actually Feel Personal
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            When someone messages their coach, they're not talking to "the
            NeonPanda AI." They're talking to the specific coaching personality
            they created (or chose), enriched with their complete training
            history, memories, and context—assembled in real-time to deliver
            responses that feel genuinely personal.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                ~5ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Coach Config Load
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                ~50ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Semantic Context Fetch
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
                Infinite
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Personality Combinations
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          What's Next: Every Rep Counts
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Now that you have a personalized coach, it's time to actually train.
          In the next post, we'll explore the Workout Logger Agent—the AI that
          turns natural language workout descriptions into structured,
          analyzable data. Plus: multi-model orchestration and how we keep AI
          costs sane while delivering quality.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Spoiler: "Did Fran in 8:45, felt like death, still breathing" becomes
          a fully structured workout record with estimated metrics, and your
          coach actually remembers it next time you want to talk CrossFit
          benchmarks.
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
