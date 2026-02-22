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
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-rajdhani text-xl text-white leading-relaxed italic">
            "It's 5:47 AM. A user in Portland just crushed the first test of the
            Crossfit Open and wants to log it before coffee. Another in Miami is
            asking their coach about peaking for their first competition. A
            third in London is halfway through a conversation about body
            recomposition training and nutrition..."
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          All of this is happening simultaneously. And somewhere in the AWS
          cloud, a bunch of Lambda functions are spinning up, DynamoDB tables
          are returning data in single-digit milliseconds, and multiple AI
          models are reasoning about fitness in ways that would make a human
          coach's head spin.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          The users don't see any of this. They just see a coach who responds
          instantly, remembers everything, and somehow always knows the right
          thing to say.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-pink font-semibold">
            That's the magic we wanted to build.
          </span>{" "}
          This is the story of how we built the foundation that makes it
          possible.
        </p>
      </section>

      {/* The Problem We Were Solving */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Problem: AI Is Hungry
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's the thing about AI-powered coaching that nobody tells you: the
          AI part is actually the easy part. Getting Claude to give good fitness
          advice? Straightforward. Getting Claude to give good fitness advice{" "}
          <em>
            consistently, at scale, in under 2 seconds, without bankrupting us
          </em>
          ? That's where it gets interesting.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            What We Were Up Against
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Bursty traffic patterns:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Fitness people wake up early. Really early. Our traffic spikes
                  look like the world's most aggressive morning alarm—5 AM to 7
                  AM is chaos, then crickets until the after-work rush.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Context is everything:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  A good coach response requires knowing the user's workout
                  history, their goals, their injuries, their training
                  methodology preferences, and the personality of the coach
                  they've created. That's a lot of data to fetch, fast.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Not all requests are equal:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "What's my workout today?" should be instant. "Design me a
                  16-week powerlifting program" needs serious AI horsepower. We
                  needed to route intelligently.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          Traditional servers would have us paying for idle capacity at 2 AM and
          melting down at 6 AM. We needed something smarter.
        </p>
      </section>

      {/* The Serverless Philosophy */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Why We Went All-In on Serverless
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Serverless wasn't a trendy choice—it was the only choice that made
          sense for AI workloads. Here's the pitch we gave ourselves:
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-cyan mb-4">
            The Serverless Promise
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Zero to hero scaling:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Lambda functions spin up instantly when someone messages their
                  coach at 5 AM, and scale down to zero during off-hours. We
                  only pay for what we use—which is nothing at 3 AM when
                  everyone's sleeping.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  No capacity planning headaches:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Whether we have 10 users or 10,000, the architecture handles
                  it automatically. No 3 AM pager alerts about server overload.
                  (We like sleep. Sleep is good for gains.)
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Sub-2-second responses:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Conversations flow naturally without awkward AI-thinking
                  pauses. Your coach responds as quickly as a friend who happens
                  to be really good at AWS.
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
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Stack (a.k.a. Our Favorite Legos)
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Every piece of our architecture was chosen for a reason. Here's what's
          under the hood and why we picked it:
        </p>

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
              responses. We have ~50 Lambda functions, and we're not ashamed.
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
              without the WebSocket complexity. (We tried WebSockets. We have
              opinions.)
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
              between models based on task complexity. More on this later—it's
              where things get really fun.
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
              metrics—all accessible in single-digit milliseconds. Yes,
              single-table design is a thing. Yes, it's worth learning.
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
              cost reduction compared to keeping everything in DynamoDB. Our
              accountant is thrilled.
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
              coupling enables independent scaling—each piece evolves without
              breaking the others.
            </p>
          </div>
        </div>
      </section>

      {/* Introducing the Training Grounds */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Training Grounds: Where It All Comes Together
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          All this infrastructure exists to serve one place: the Training
          Grounds. It's each user's personal fitness headquarters—the central
          hub where coaching data, workout history, and AI-powered insights
          converge into something actually useful.
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
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Every workout logged through natural language, searchable and
                analyzable. From "Did Fran in 8:45" to detailed powerlifting
                sessions with RPE tracking.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Coach Conversations
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                The complete coaching relationship history. Every question,
                every insight, every PR celebration preserved and searchable.
                Your coach never forgets.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Training Programs
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Multi-week programs with phase management, progression tracking,
                and workout templates. A structured roadmap that adapts to real
                life.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Analytics & Reports
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-base">
                Weekly and monthly insights generated by AI. Progress patterns,
                strength trends, and personalized recommendations—not generic
                charts.
              </p>
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          The Training Grounds is where the serverless architecture meets user
          experience. All that data flying around at millisecond speeds? It
          transforms into a simple, intuitive interface that just works.
        </p>
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
              Agent Spotlight: The Smart Request Router
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Intelligent Traffic Controller"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          Here's where things get interesting. Every single message to a coach
          passes through the Smart Request Router—our AI-powered traffic
          controller that ensures the right response comes from the right model,
          with the right context, every time.
        </p>

        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Why Not Just Send Everything to Claude?
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            We could. It would work. But it would be slow and expensive.
            Instead, the Router analyzes every message to determine:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Intent:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Is this person logging a workout, asking for advice, designing
                  a program, or just chatting?
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Complexity:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Does this need deep reasoning (Sonnet 4.6) or a quick response
                  (Haiku 4.5)?
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-cyan mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-cyan font-semibold">
                  Context needs:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  What data do we need to fetch—recent workouts, memories,
                  methodology knowledge, program history?
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
            The Router Pattern in Action
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Router Pattern is a foundational agentic AI pattern. Instead of
            sending all requests to a single model, we use AI to analyze intent
            and route to the optimal processing path. It's AI deciding how to
            use AI.
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
              {`if (route.isComplex) → Sonnet 4.6`}
            </div>
            <div className="text-synthwave-text-secondary">
              {`else → Haiku 4.5 (fast response)`}
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          The magic is that users never notice the orchestration. Whether they
          need deep program analysis or a quick "you got this!" before a
          workout, the right model responds instantly with exactly the right
          level of intelligence.
        </p>
      </section>

      {/* Smart Router Deep Dive */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Inside the Router: The Decision Engine
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Let's get technical. Our Smart Request Router isn't a simple if/else
          chain—it's an AI-powered decision maker that considers multiple
          dimensions simultaneously. Here's how decisions flow in practice:
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
                      Sonnet 4.6
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
              // Actual implementation from detection.ts
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
              {`  → WorkoutLoggerAgent (Sonnet 4.6 for extraction)`}
            </div>
            <div className="text-synthwave-text-secondary">{`}`}</div>
            <div className="text-synthwave-text-secondary">
              {`if (routerAnalysis.conversationComplexity.requiresDeepReasoning) {`}
            </div>
            <div className="text-synthwave-neon-purple pl-4">
              {`  → Sonnet 4.6 (deep analysis, program design)`}
            </div>
            <div className="text-synthwave-text-secondary">{`} else {`}</div>
            <div className="text-synthwave-neon-cyan pl-4">
              {`  → Haiku 4.5 (fast, conversational responses)`}
            </div>
            <div className="text-synthwave-text-secondary">{`}`}</div>
          </div>
        </div>

        {/* What Makes It Agentic */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What Makes This Actually Agentic
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Smart Router isn't just following rules—it's making intelligent
            decisions. Here's what sets it apart from a simple switch statement:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Temporal awareness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Understands "this morning" vs "yesterday" based on user
                  timezone. Timezone handling is surprisingly tricky.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Multi-intent detection:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "I did Fran this morning, can you also remind me about my
                  shoulder thing?" — that's a workout log AND a memory request
                  in one message.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Context optimization:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Only fetches data that's actually needed for the response.
                  Less data = faster responses = happy users.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Cost efficiency:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Routes simple questions to faster, cheaper models
                  automatically. "What's my workout today?" doesn't need Sonnet.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Technical Deep Dive: DynamoDB */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          The Data Layer: Single-Table DynamoDB
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Real talk: we spent way too long debating database design. Multiple
          tables? Single table? SQL? NoSQL? In the end, single-table DynamoDB
          won, and here's why it matters for AI workloads:
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
            user, all conversations with a specific coach, or all programs—in a
            single efficient query. Combined with Global Secondary Indexes
            (GSIs), we can access any data pattern in milliseconds.
          </p>
        </div>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            Throughput Scaling (a.k.a. "Don't Drop Requests")
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani">
            Every DynamoDB operation is wrapped in our{" "}
            <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded">
              withThroughputScaling()
            </code>{" "}
            utility, ensuring graceful handling of capacity limits with
            automatic retries and exponential backoff. The coach never misses a
            beat, even during that 6 AM traffic spike.
          </p>
        </div>
      </section>

      {/* Why This Stack Matters for AI */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Why This Stack Matters for AI
        </h2>
        <p className={`${typographyPatterns.description} mb-8`}>
          Every architectural choice was made with AI workloads in mind. Here's
          why serverless + AWS-native is uniquely suited for AI coaching:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* HTTP API Benefits */}
          <div className={containerPatterns.mediumGlass}>
            <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-3">
              HTTP API with Lambda Function URLs
            </h3>
            <ul className="space-y-2 font-rajdhani text-base text-synthwave-text-secondary">
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
            <ul className="space-y-2 font-rajdhani text-base text-synthwave-text-secondary">
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
            <ul className="space-y-2 font-rajdhani text-base text-synthwave-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>
                  Claude Sonnet 4.6 for complex reasoning and extraction
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>Claude Haiku 4.5 for fast conversational responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-synthwave-neon-purple">→</span>
                <span>
                  Nvidia Nemotron / Amazon Nova 2 Lite for contextual updates
                  (ultra-low latency)
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
            <ul className="space-y-2 font-rajdhani text-base text-synthwave-text-secondary">
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
            instantaneous. When someone messages their coach:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                ~100ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Router Analysis
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                ~50ms
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Context Loading
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
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
          What's Next: The Coach Creator
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          With the serverless foundation in place, the real magic begins. In the
          next post, we'll dive into how we store and retrieve the rich context
          that makes AI coaching feel genuinely personal—and introduce the Coach
          Creator Agent, the AI that helps users build their perfect coach.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          Spoiler: it involves vector databases, semantic search, and some very
          clever prompt assembly. The foundation you've seen here? It's about to
          get a lot more interesting.
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
                  Your Coach, Built Your Way
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
