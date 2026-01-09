import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost1Foundation() {
  return (
    <>
      {/* Introduction */}
      <section className="mb-16">
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          When we set out to build NeonPanda, we had a clear philosophy: the
          best technology should feel like magic, not work. We didn't just want
          an AI chatbot—we wanted a complete fitness and analytics platform
          engineered from the ground up to support the demanding requirements of
          AI-powered coaching. A platform that could scale from zero users to
          thousands without missing a beat, respond in under 2 seconds, and
          maintain 99.9% uptime—all while feeling as natural as texting a
          friend.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          This is the story of how we built that foundation. Serverless wasn't
          just a convenient choice—it was essential for handling the
          unpredictable, bursty nature of AI workloads. From AWS Lambda
          functions that auto-scale effortlessly to DynamoDB tables with
          single-digit millisecond response times, every architectural decision
          was made to support one goal: creating AI coaching that feels
          remarkably human while handling complex fitness analytics at scale.
        </p>
      </section>

      {/* The Serverless Philosophy */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Serverless Philosophy
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Traditional server architectures require predicting traffic,
          provisioning resources, and paying for idle capacity. For a fitness
          coaching platform where usage spikes during early mornings and after
          work hours, this model is wildly inefficient.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            Why Serverless?
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Zero to Hero Scaling:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Lambda functions spin up instantly when a user messages their
                  coach at 5 AM, and scale down to zero during off-hours. We
                  only pay for what we use.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  No Capacity Planning:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Whether we have 10 users or 10,000, the architecture handles
                  it automatically. No 3 AM pager alerts about server overload.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Sub-2-Second Responses:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Conversations flow naturally without awkward AI-thinking
                  pauses. The coach responds as quickly as a knowledgeable
                  friend.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          Our AWS Amplify Gen 2 backend orchestrates everything: Lambda
          functions for compute, API Gateway v2 for HTTP APIs, DynamoDB for
          real-time data, and S3 for archival storage. It's enterprise-grade
          infrastructure with consumer-friendly simplicity.
        </p>
      </section>

      {/* The AWS-Native Stack */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The AWS-Native Stack
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Lambda */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/aws_lambda.png"
                alt="AWS Lambda"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                AWS Lambda
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani">
              TypeScript functions that handle everything from streaming coach
              conversations to building multi-week training programs. Async
              invocations for heavy processing, sync handlers for real-time
              responses.
            </p>
          </div>

          {/* API Gateway */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/aws_api_gateway_v2.png"
                alt="API Gateway"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                API Gateway v2
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani">
              HTTP APIs with Lambda function URLs for streaming responses.
              WebSocket-like experience for real-time coach conversations
              without the WebSocket complexity.
            </p>
          </div>

          {/* Amazon Bedrock */}
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Bedrock_64.svg"
                alt="Amazon Bedrock"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Amazon Bedrock
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani">
              Foundation models from Anthropic (Claude Sonnet & Haiku) power our
              AI coaching. Multi-model orchestration with intelligent routing
              between models based on task complexity.
            </p>
          </div>

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
            <p className="text-synthwave-text-secondary font-rajdhani">
              Single-table design with composite keys for lightning-fast
              queries. Workout history, coach configurations, and real-time
              metrics—all accessible in single-digit milliseconds.
            </p>
          </div>

          {/* S3 */}
          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Simple-Storage-Service_64.svg"
                alt="Amazon S3"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                Amazon S3
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani">
              Cost-optimized archival storage for conversation transcripts,
              detailed workout analyses, and rich media content. 90% storage
              cost reduction compared to keeping everything in DynamoDB.
            </p>
          </div>

          {/* EventBridge */}
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/aws_eventbridge.png"
                alt="Amazon EventBridge"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Amazon EventBridge
              </h3>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani">
              Event-driven architecture for async workflows like weekly report
              generation, analytics processing, and background AI tasks. Loose
              coupling enables independent scaling and evolution.
            </p>
          </div>
        </div>
      </section>

      {/* Introducing the Training Grounds */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Training Grounds
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Training Grounds is the user's personal fitness headquarters—the
          central hub where all coaching data comes together. It's where the
          serverless architecture meets user experience, transforming raw data
          into actionable insights.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            Everything in One Place
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Workout History
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Every workout logged through natural language, searchable and
                analyzable. From "Did Fran in 8:45" to detailed powerlifting
                sessions.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Coach Conversations
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                The complete coaching relationship history. Every question,
                every insight, every PR celebration preserved and searchable.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Training Programs
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Multi-week programs with phase management, progression tracking,
                and workout templates. A structured roadmap to fitness goals.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Analytics & Reports
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Weekly and monthly insights generated by AI. Progress patterns,
                strength trends, and personalized recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Spotlight: Smart Request Router */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
            <span className="font-inter font-bold text-xl text-synthwave-neon-pink">
              1
            </span>
          </div>
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-0`}
            >
              Agent Spotlight: Smart Request Router
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Intelligent Orchestrator"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          Every message sent to a coach first passes through the Smart Request
          Router—our intelligent traffic controller that ensures the user always
          gets the right response from the right AI model.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What It Does
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Router analyzes every user message to determine:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Intent:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Is the user logging a workout, asking for advice, designing a
                  program, or just chatting?
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Complexity:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Does this need deep reasoning (Sonnet 4.5) or a quick response
                  (Haiku 4.5)?
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Context:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  What additional data needs to be pulled—recent workouts,
                  memories, methodology knowledge?
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Router Pattern */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Router Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Router Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Router Pattern is a foundational agentic AI pattern that we
            implement at the entry point of every user interaction. Instead of
            sending all requests to a single model, the router intelligently
            analyzes intent and routes to the optimal processing path.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Simplified routing logic
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const route = await analyzeIntent(message);`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`if (route.isWorkoutLog) → WorkoutLoggerAgent`}
            </div>
            <div className="text-synthwave-neon-purple">
              {`if (route.isProgramDesign) → ProgramDesignerAgent`}
            </div>
            <div className="text-synthwave-neon-cyan">
              {`if (route.isComplex) → Sonnet 4.5`}
            </div>
            <div className="text-synthwave-text-secondary">
              {`else → Haiku 4.5 (fast response)`}
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          The magic is that users never notice the orchestration. Whether the
          request needs deep program analysis or a quick motivational boost, the
          right model responds instantly with the perfect level of intelligence.
        </p>
      </section>

      {/* Smart Router Deep Dive */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Smart Router: The Decision Engine
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Our Smart Request Router is a true agentic AI component—it uses Claude
          to make intelligent, context-aware decisions about how to process each
          message. Here's how the decision tree works in practice:
        </p>

        {/* Decision Flow Diagram */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-6">
            Decision Flow Architecture
          </h3>

          {/* Visual Flow Diagram */}
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-6 mb-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Entry Point */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  User Message Received
                </span>
              </div>

              {/* Arrow Down */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Parallel Burst */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  🚀 Parallel Burst
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Router Analysis + DynamoDB Reads (simultaneous)
                </p>
              </div>

              {/* Arrow Down */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Analysis Outputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <div className="bg-synthwave-bg-primary/50 border border-synthwave-neon-pink/30 rounded-lg p-3 text-center">
                  <span className="font-rajdhani text-sm text-synthwave-neon-pink">
                    Intent Classification
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    workout_logging | question | memory_request | general
                  </p>
                </div>
                <div className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-3 text-center">
                  <span className="font-rajdhani text-sm text-synthwave-neon-cyan">
                    Complexity Analysis
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    requiresDeepReasoning: true/false
                  </p>
                </div>
                <div className="bg-synthwave-bg-primary/50 border border-synthwave-neon-purple/30 rounded-lg p-3 text-center">
                  <span className="font-rajdhani text-sm text-synthwave-neon-purple">
                    Context Needs
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    needsPinecone | needsMemory | workoutHistory
                  </p>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Conditional Processing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-lg p-4">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-purple text-sm">
                    If Workout Detected
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    → Workout Logger Agent (multi-turn extraction)
                  </p>
                </div>
                <div className="bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 rounded-lg p-4">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-cyan text-sm">
                    If Memory Needed
                  </span>
                  <p className="text-synthwave-text-muted text-xs mt-1">
                    → Query Pinecone (parallel with response)
                  </p>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Model Selection */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-lg px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Model Selection
                </span>
                <div className="flex justify-center gap-4 mt-2">
                  <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                    Complex →{" "}
                    <span className="text-synthwave-neon-purple">
                      Sonnet 4.5
                    </span>
                  </span>
                  <span className="text-synthwave-text-muted">|</span>
                  <span className="text-synthwave-text-secondary font-rajdhani text-sm">
                    Simple →{" "}
                    <span className="text-synthwave-neon-cyan">Haiku 4.5</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Details */}
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Smart Router implementation (from detection.ts)
            </div>
            <div className="text-synthwave-neon-cyan">
              {`const [routerAnalysis, conversation, config] = await Promise.all([`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`  analyzeRequestCapabilities(message, context, timezone),`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  getCoachConversation(userId, coachId, conversationId),`}
            </div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`  getCoachConfig(userId, coachId)`}
            </div>
            <div className="text-synthwave-neon-cyan">{`]);`}</div>
            <div className="text-synthwave-text-muted mt-3 mb-2">
              // Route based on analysis
            </div>
            <div className="text-synthwave-text-secondary">
              {`if (routerAnalysis.workoutDetection.isWorkoutLog) {`}
            </div>
            <div className="text-synthwave-neon-pink pl-4">
              {`  → WorkoutLoggerAgent (Sonnet 4.5 for extraction)`}
            </div>
            <div className="text-synthwave-text-secondary">{`}`}</div>
            <div className="text-synthwave-text-secondary">
              {`if (routerAnalysis.conversationComplexity.requiresDeepReasoning) {`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  → Sonnet 4.5 (deep analysis, program design)`}
            </div>
            <div className="text-synthwave-text-secondary">{`} else {`}</div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`  → Haiku 4.5 (fast, conversational responses)`}
            </div>
            <div className="text-synthwave-text-secondary">{`}`}</div>
          </div>
        </div>

        {/* Router Capabilities */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What Makes It Agentic
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Smart Router isn't just a simple if/else chain—it's an
            AI-powered decision maker that considers multiple dimensions
            simultaneously:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Temporal Awareness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Understands "this morning" vs "yesterday" based on user
                  timezone
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Multi-Intent Detection:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Detects workout logging, memory requests, and questions in
                  single messages
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Context Optimization:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Only fetches data that's actually needed for the response
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Cost Efficiency:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Routes simple questions to faster, cheaper models
                  automatically
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Technical Deep Dive */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Technical Deep Dive: Single-Table DynamoDB Design
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          One of our key architectural decisions was adopting a single-table
          design for DynamoDB. Instead of creating separate tables for users,
          workouts, conversations, and programs, we use a unified table with
          composite keys.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Key Structure
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-lg p-4 font-mono text-sm mb-4">
            <div className="text-synthwave-neon-pink">pk: user#userId</div>
            <div className="text-synthwave-neon-cyan">
              sk: entity_type#entityId
            </div>
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani">
            This design enables powerful query patterns: get all workouts for a
            user, all conversations with a specific coach, or all programs in a
            single efficient query. Combined with Global Secondary Indexes
            (GSIs), we can access any data pattern in milliseconds.
          </p>
        </div>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            Throughput Scaling
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani">
            Every DynamoDB operation is wrapped in our{" "}
            <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded">
              withThroughputScaling()
            </code>{" "}
            utility, ensuring graceful handling of capacity limits with
            automatic retries and exponential backoff. The coach never misses a
            beat, even during traffic spikes.
          </p>
        </div>
      </section>

      {/* Why This Stack Matters */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Why This Stack Matters for AI
        </h2>
        <p className={`${typographyPatterns.description} mb-8`}>
          Every architectural choice was made with AI workloads in mind. Here's
          why our serverless, AWS-native approach is uniquely suited for
          AI-powered fitness coaching:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* HTTP API Benefits */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              HTTP API with Lambda Function URLs
            </h3>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>
                  True real-time streaming for coach responses (no buffering)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Lower latency than REST APIs (up to 70% faster)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>
                  Native SSE support for progressive response rendering
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Automatic CORS handling without middleware overhead</span>
              </li>
            </ul>
          </div>

          {/* Lambda Benefits */}
          <div className={containerPatterns.mediumGlassPink}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-3">
              Lambda for AI Workloads
            </h3>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  Async invocations for heavy AI tasks (program generation)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  15-minute timeout for complex multi-model orchestration
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>Parallel execution across independent AI operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-pink">→</span>
                <span>
                  Burst capacity handles AI response spikes gracefully
                </span>
              </li>
            </ul>
          </div>

          {/* Bedrock Benefits */}
          <div className={containerPatterns.mediumGlassPurple}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple mb-3">
              Bedrock Multi-Model Strategy
            </h3>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>
                  Claude Sonnet 4.5 for complex reasoning and extraction
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Claude Haiku 4.5 for fast conversational responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>
                  Amazon Nova Micro for contextual updates (ultra-low latency)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Native tool use for structured data extraction</span>
              </li>
            </ul>
          </div>

          {/* DynamoDB Benefits */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              DynamoDB for Real-Time AI Context
            </h3>
            <ul className="space-y-2 font-rajdhani text-sm text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>
                  Single-digit millisecond reads for AI prompt context
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>
                  GSIs enable efficient queries across any access pattern
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>On-demand capacity handles unpredictable AI usage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-cyan">→</span>
                <span>Atomic updates prevent data race conditions</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={containerPatterns.boldGradient}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            The Result: Sub-2-Second AI Responses
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            By combining serverless compute, intelligent model routing, and
            optimized data access patterns, we achieve response times that feel
            instantaneous. When a user messages their coach:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-inter font-bold text-synthwave-neon-pink mb-1">
                ~100ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Router Analysis
              </div>
            </div>
            <div>
              <div className="text-2xl font-inter font-bold text-synthwave-neon-cyan mb-1">
                ~50ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Context Loading
              </div>
            </div>
            <div>
              <div className="text-2xl font-inter font-bold text-synthwave-neon-purple mb-1">
                ~500ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                First Chunk Streamed
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
          What's Next
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          With the serverless foundation in place, we're ready to explore how we
          store and retrieve the rich context that makes AI coaching feel
          personal. In the next post, we'll dive into the hybrid data
          architecture and introduce the Coach Creator Agent—the AI that builds
          each user's perfect coach.
        </p>

        <div className={containerPatterns.cardLight}>
          <div className="p-6">
            <p className="font-rajdhani text-synthwave-text-muted text-sm uppercase tracking-wide mb-2">
              Next in the Series
            </p>
            <Link
              to="/blog/your-coach-your-way"
              className="group flex items-center justify-between"
            >
              <div>
                <h3 className="font-russo text-xl text-synthwave-neon-cyan group-hover:text-synthwave-neon-pink transition-colors">
                  Your Coach, Your Way
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  The Coach Creator Agent & Hybrid Data Architecture
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

export default BlogPost1Foundation;
