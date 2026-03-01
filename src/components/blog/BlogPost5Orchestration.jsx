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
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-rajdhani text-xl text-white leading-relaxed italic">
            "Just got back from the gym—hit 275 for a clean double on squat,
            then ran through the MetCon in 11:40. Legs are fried but I feel
            great. Oh, and my knee was bugging me on the box jumps again. Can
            you check my squat numbers from the last few weeks and remind me
            what we talked about with that knee?"
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          One message. Four distinct intents. Behind the scenes, the
          Conversation Agent just orchestrated a symphony: it logged the full
          workout, marked a program day complete, saved a knee concern as a
          persistent memory, queried squat history to surface a 15lb PR trend,
          retrieved the knee memory from two weeks ago, and streamed a
          personalized response—all in your coach's unique voice, all in real
          time. Six tool calls. One natural reply.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          The user sees none of the orchestration. They see a coach who
          listened, remembered, acted, and responded—like any great coach would.
          But underneath that natural conversation is the most sophisticated
          agent in the entire NeonPanda platform.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-cyan font-semibold">
            This is the Conversation Agent.
          </span>{" "}
          Armed with 11 specialized tools and a streaming-first architecture, it
          pulls, pushes, queries, logs, and searches data across the entire
          platform—transforming every conversation into an intelligent,
          context-rich coaching experience. This is the post where all the
          agents come together.
        </p>
      </section>

      {/* The Problem: Chatbots Are Not Coaches */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Problem: Chatbots Are Not Coaches
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Most AI fitness "coaches" are glorified chatbots. They respond to your
          message, maybe reference the last few messages in the conversation,
          and call it coaching. They can't look up your workout history. They
          can't check your program. They can't remember that you tweaked your
          back three weeks ago. Every conversation starts from near-zero
          context.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-synthwave-neon-pink mb-4">
            What's Missing from "AI Coaching"
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  No action behind the words:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  You say "log this workout" and the chatbot says "Great
                  workout!" but nothing actually gets saved. It's a
                  conversation, not a system. Real coaching requires doing
                  things, not just talking about them.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  No memory across sessions:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Tell the AI about your knee injury on Monday. By Wednesday,
                  it's forgotten. By Friday, it's recommending deep squats.
                  Context doesn't survive the conversation boundary because
                  there's no persistent memory system.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  No data access:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "What was my squat PR last month?" A chatbot can't answer
                  that—it doesn't have access to your training data. It can only
                  reference what's in the current conversation window. That's
                  not coaching, that's chatting with amnesia.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  No program awareness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  You're in Week 6 of a peaking program. The chatbot doesn't
                  know that, can't pull today's workout, and can't mark it
                  complete when you're done. Your program and your conversations
                  exist in separate universes.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={typographyPatterns.description}>
          We needed something fundamentally different—not a chatbot with better
          prompts, but an autonomous agent that can take real actions, access
          real data, and maintain real context across the full breadth of a
          coaching relationship.
        </p>
      </section>

      {/* Agent Spotlight: The Conversation Agent */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
            <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">
              5
            </span>
          </div>
          <div>
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-0`}
            >
              Agent Spotlight: The Conversation Agent
            </h2>
            <p className="font-rajdhani text-synthwave-text-muted italic">
              "The Orchestration Layer"
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The Conversation Agent is the centerpiece of NeonPanda—the agent every
          user interacts with directly, every single session. While the Coach
          Creator builds your coach, the Workout Logger extracts data, and the
          Program Designer builds plans, it's the Conversation Agent that ties
          them all together. It's the real-time streaming interface between you
          and everything the platform can do.
        </p>

        <p className={`${typographyPatterns.description} mb-8`}>
          What makes it different? It doesn't just generate text. It{" "}
          <span className="text-synthwave-neon-cyan font-semibold">
            takes action
          </span>
          . When you say "log that workout," it actually logs the workout. When
          you ask "what's my workout today?" it actually queries your active
          program. When you mention a nagging injury, it actually saves that as
          a memory for future reference. The conversation is the interface; the
          tools are the power.
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={badgePatterns.cyan}>Tool-Use Pattern</span>
            <span className={badgePatterns.muted}>Agentic AI Pattern</span>
          </div>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            The Streaming Tool-Use Pattern
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Conversation Agent extends the Tool-Use Pattern (Post 3) with
            real-time streaming. Instead of waiting for the entire response to
            generate, tokens stream to the user as they're produced. Tool calls
            execute mid-stream, and the agent weaves tool results back into the
            response seamlessly—all while maintaining your coach's personality.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-md p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Streaming conversation with autonomous tool use
            </div>
            <div className="text-synthwave-neon-cyan">
              {`User: "Just finished today's program workout, hit a squat PR"`}
            </div>
            <div className="text-synthwave-neon-pink mt-2">
              {`→ Stream: "That's what I'm talking about! Let me get that..."`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`→ Tool: log_workout({ exercises, results, notes })`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`→ Tool: complete_program_workout({ dayNumber, results })`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`→ Tool: query_exercise_history({ exercise: "squat" })`}
            </div>
            <div className="text-synthwave-text-secondary mt-2">
              {`→ Stream: "...logged and your program's updated. That 225x3`}
            </div>
            <div className="text-synthwave-text-secondary">
              {`   is a 10lb PR from three weeks ago. Strength is trending up."`}
            </div>
          </div>
        </div>
      </section>

      {/* The 11 Tools */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          11 Tools, Infinite Combinations
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Conversation Agent has 11 specialized tools at its disposal. Each
          tool gives the agent a specific capability—reading data, writing data,
          searching semantically, or triggering downstream pipelines. The agent
          autonomously decides which tools to use, when, and in what
          combination. Here's the full arsenal:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Search & Discovery Tools */}
          <div className={`${containerPatterns.mediumGlassPurple}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={badgePatterns.purple}>Search & Discovery</span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-1">
                  search_knowledge_base
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Semantic search across workouts, conversations, programs, and
                  memories. "How did my squats feel last month?" finds the
                  answer by meaning, not keywords.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-1">
                  search_methodology
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Queries the methodology knowledge base for training
                  philosophy, programming principles, and exercise technique.
                  Your coach's advice is grounded in real expertise.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-1">
                  retrieve_memories
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Pulls stored preferences, goals, constraints, and
                  instructions. That shoulder injury you mentioned weeks ago?
                  Instantly recalled.
                </p>
              </div>
            </div>
          </div>

          {/* Data Writing Tools */}
          <div className={`${containerPatterns.mediumGlassPink}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={badgePatterns.pink}>Data Writing</span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-1">
                  log_workout
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Triggers the full async workout creation pipeline—extraction,
                  normalization, validation, DynamoDB persistence, and Pinecone
                  indexing. One tool call, entire pipeline.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-1">
                  save_memory
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Persists user preferences, goals, constraints, or instructions
                  for future reference. Memories survive across conversations
                  and inform every future interaction.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-1">
                  complete_program_workout
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Marks a program-prescribed workout as done. Updates completion
                  stats, advances the current day, and recalculates adherence
                  rate. Your program stays in sync automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Program & Workout Query Tools */}
          <div className={`${containerPatterns.mediumGlass}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={badgePatterns.cyan}>Program Intelligence</span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-1">
                  get_todays_workout
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Fetches today's prescribed workout from your active training
                  program. Knows about rest days, current phase, and exercise
                  details. Your coach always knows what's on the menu.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-1">
                  query_programs
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Queries your training program history—active, completed, or
                  archived. Returns metadata, adherence rates, completion stats,
                  and phase structure.
                </p>
              </div>
            </div>
          </div>

          {/* Exercise History Tools */}
          <div className={`${containerPatterns.mediumGlassPurple}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={badgePatterns.purple}>
                Exercise Intelligence
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-1">
                  get_recent_workouts
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Pulls your recent workout history with completion dates,
                  disciplines, and names. Perfect for "What did I do this week?"
                  or trend analysis.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-1">
                  query_exercise_history
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Deep dive into a specific exercise—sets, reps, weights, PRs,
                  and aggregated statistics. Automatically normalizes exercise
                  names so "bench" and "bench press" return the same data.
                </p>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-1">
                  list_exercise_names
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Lists every distinct exercise in your history with occurrence
                  counts and disciplines. Your coach knows your entire movement
                  vocabulary.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why 11 Tools Matter */}
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-xl text-white mb-4">
            Why 11 Tools Changes Everything
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-6">
            Each tool is a capability. Combined, they transform the Conversation
            Agent from a text generator into a full-stack coaching system that
            can read, write, search, and act across the entire platform—all
            within a single streaming conversation.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                3
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Search Tools
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-cyan mb-1">
                3
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Write Tools
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-purple mb-1">
                2
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                Program Tools
              </div>
            </div>
            <div>
              <div className="text-2xl font-russo text-synthwave-neon-pink mb-1">
                3
              </div>
              <div className="font-rajdhani text-sm text-synthwave-text-muted">
                History Tools
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Streaming Architecture */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Streaming-First: Conversations That Flow
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Conversation Agent streams via Lambda Function URLs with
          Server-Sent Events (SSE). This isn't a request-response cycle where
          you wait for the full answer—tokens arrive as they're generated, tool
          calls execute mid-conversation, and the response builds in real time.
          The result feels less like querying a database and more like talking
          to someone who's thinking out loud.
        </p>

        {/* Streaming Flow Diagram */}
        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-6">
            Streaming Conversation Architecture
          </h3>

          <div className="bg-synthwave-bg-primary/30 rounded-md p-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Entry */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-md px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  User Message + Context
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Message, coach personality, conversation history, images
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-cyan"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-cyan"></div>
              </div>

              {/* Context Assembly */}
              <div className="bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan rounded-md px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Context Assembly (Parallel Burst)
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  DynamoDB reads + Pinecone search + coach personality
                  (simultaneous)
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-purple"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-purple"></div>
              </div>

              {/* Conversation Agent with Tools */}
              <div className="w-full max-w-lg">
                <div className="bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple rounded-md px-6 py-3 text-center mb-3">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-purple">
                    Conversation Agent (Streaming)
                  </span>
                  <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                    Claude Sonnet/Haiku with 11 tools + coach personality
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-md p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-pink text-xs font-semibold">
                      Text Stream
                    </span>
                    <p className="text-synthwave-text-muted text-xs">
                      Token by token
                    </p>
                  </div>
                  <div className="bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 rounded-md p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-cyan text-xs font-semibold">
                      Tool Calls
                    </span>
                    <p className="text-synthwave-text-muted text-xs">
                      Mid-stream
                    </p>
                  </div>
                  <div className="bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-md p-2 text-center">
                    <span className="font-rajdhani text-synthwave-neon-purple text-xs font-semibold">
                      Tool Results
                    </span>
                    <p className="text-synthwave-text-muted text-xs">
                      Woven back in
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-synthwave-neon-pink"></div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-synthwave-neon-pink"></div>
              </div>

              {/* Output */}
              <div className="bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink rounded-md px-6 py-3 text-center w-full max-w-md">
                <span className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Real-Time Streamed Response
                </span>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm mt-1">
                  Personalized coaching + data actions + contextual insights
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What Streaming Enables */}
        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink mb-4">
            What Streaming-First Enables
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Perceived zero latency:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  The first token arrives in ~500ms. The user starts reading
                  while the agent is still thinking, searching, and acting. The
                  conversation feels instantaneous even when complex
                  orchestration is happening.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Transparent tool execution:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  When the agent calls a tool, the user sees contextual updates
                  like "Looking up your squat history..." powered by Nvidia
                  Nemotron. Tool execution feels like a natural part of the
                  conversation, not a loading state.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-rajdhani">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Multi-turn tool chains:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  The agent can call multiple tools in sequence within a single
                  response—log a workout, then query exercise history to provide
                  trend analysis, then save a memory about the session—all
                  streamed seamlessly.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Real Orchestration Scenarios */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Orchestration in Action: Real Scenarios
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The true power of 11 tools isn't any single capability—it's how they
          combine. Here are real scenarios showing the Conversation Agent
          orchestrating across the platform:
        </p>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <div className="space-y-8">
            {/* Scenario 1: Morning Check-in */}
            <div className="border-l-2 border-synthwave-neon-pink pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Scenario: "What's on the menu today, coach?"
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-3">
                A simple question that triggers intelligent data retrieval.
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded-md p-3 text-sm font-rajdhani space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-cyan font-semibold shrink-0">
                    Tool 1:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                      get_todays_workout
                    </code>{" "}
                    → Fetches today's program workout with exercises, sets,
                    reps, and coaching notes
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-purple font-semibold shrink-0">
                    Tool 2:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
                      retrieve_memories
                    </code>{" "}
                    → Checks for relevant constraints (that shoulder thing,
                    sleep quality mentions)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-pink font-semibold shrink-0">
                    Result:
                  </span>
                  <span className="text-synthwave-text-secondary italic">
                    "Today's an upper body strength day—bench press, rows, and
                    overhead work. Given that shoulder click you mentioned, I'd
                    suggest starting with some extra shoulder warm-up..."
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario 2: Post-Workout Log with Program */}
            <div className="border-l-2 border-synthwave-neon-cyan pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Scenario: "Done! Hit 315x5 on squat, PR. Program workout
                complete."
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-3">
                Logging, program tracking, history analysis, and celebration in
                one exchange.
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded-md p-3 text-sm font-rajdhani space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-pink font-semibold shrink-0">
                    Tool 1:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded-md">
                      log_workout
                    </code>{" "}
                    → Fires async pipeline: extraction, normalization, DynamoDB
                    + Pinecone persistence
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-cyan font-semibold shrink-0">
                    Tool 2:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                      complete_program_workout
                    </code>{" "}
                    → Marks day complete, advances program, updates adherence
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-purple font-semibold shrink-0">
                    Tool 3:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
                      query_exercise_history
                    </code>{" "}
                    → Retrieves squat history to confirm the PR and show trend
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-pink font-semibold shrink-0">
                    Result:
                  </span>
                  <span className="text-synthwave-text-secondary italic">
                    "315x5—that's a 20lb PR from four weeks ago. Your program's
                    working. Day 18 of 36 complete, 94% adherence rate. You're
                    locked in."
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario 3: Complex Knowledge Query */}
            <div className="border-l-2 border-synthwave-neon-purple pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Scenario: "Should I deload next week? I've been feeling beat up
                lately."
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-3">
                A coaching question that requires data analysis and methodology
                knowledge.
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded-md p-3 text-sm font-rajdhani space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-cyan font-semibold shrink-0">
                    Tool 1:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                      get_recent_workouts
                    </code>{" "}
                    → Pulls last 10 sessions to assess training volume and
                    frequency
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-purple font-semibold shrink-0">
                    Tool 2:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
                      query_programs
                    </code>{" "}
                    → Checks current program phase to see if a deload is already
                    planned
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-pink font-semibold shrink-0">
                    Tool 3:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded-md">
                      search_methodology
                    </code>{" "}
                    → Retrieves deload protocols for your training methodology
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-cyan font-semibold shrink-0">
                    Tool 4:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                      save_memory
                    </code>{" "}
                    → Saves "feeling beat up" as a fatigue signal for future
                    context
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-purple font-semibold shrink-0">
                    Result:
                  </span>
                  <span className="text-synthwave-text-secondary italic">
                    "You've trained 6 of the last 7 days with increasing
                    intensity. Your program has a deload in Week 8—that's next
                    week. Perfect timing. Based on your methodology, I'd suggest
                    dropping volume 40% while maintaining intensity..."
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario 4: Broad Exploration */}
            <div className="border-l-2 border-synthwave-neon-pink pl-4">
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Scenario: "Which exercises have I been doing most? I feel like
                I'm neglecting my posterior chain."
              </h4>
              <p className="text-synthwave-text-muted text-sm font-rajdhani mb-3">
                Self-awareness query that requires exercise analytics.
              </p>
              <div className="bg-synthwave-bg-primary/30 rounded-md p-3 text-sm font-rajdhani space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-cyan font-semibold shrink-0">
                    Tool 1:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                      list_exercise_names
                    </code>{" "}
                    → Returns every exercise with occurrence counts and
                    discipline tags
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-purple font-semibold shrink-0">
                    Tool 2:
                  </span>
                  <span className="text-synthwave-text-secondary">
                    <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
                      search_knowledge_base
                    </code>{" "}
                    → Semantic search for posterior chain work to find related
                    sessions
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-synthwave-neon-pink font-semibold shrink-0">
                    Result:
                  </span>
                  <span className="text-synthwave-text-secondary italic">
                    "You're right to flag this. Bench press and squats are your
                    top two (18 and 15 sessions), but deadlifts and rows are at
                    6 and 4. You're pressing almost 3x as much as you're
                    pulling. Let's address that..."
                  </span>
                </div>
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
          The Complete Agentic Pattern Suite
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Throughout this series, we've explored six agentic AI patterns that
          power NeonPanda. The Conversation Agent is the culmination—it uses the
          Tool-Use Pattern to execute actions and draws on data created by
          agents using every other pattern. Here's the complete picture:
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.cyan}>Post 1</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Router Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Intelligent request routing based on intent analysis. Every
                message flows through the router first.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.pink}>Post 2</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Assembler Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Combining outputs from multiple sources into cohesive coach
                personalities.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.purple}>Post 3</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Tool-Use Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                AI deciding when and how to use specialized tools. The
                Conversation Agent takes this to the extreme with 11 tools.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.cyan}>Post 3</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Evaluator-Optimizer
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Quality assessment with iterative refinement. Confidence-based
                flow control for data extraction.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.pink}>Post 4</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Orchestrator Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Central coordinator managing multi-step workflows for program
                design.
              </p>
            </div>
            <div className="bg-synthwave-bg-primary/30 rounded-md p-4">
              <span className={badgePatterns.purple}>Post 4</span>
              <h4 className="font-rajdhani font-semibold text-white mt-2 mb-1">
                Parallel Pattern
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                Concurrent execution of independent tasks. 12 weeks generated
                simultaneously.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Model Orchestration */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Multi-Model Orchestration: The Right Brain for Every Task
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Conversation Agent doesn't rely on a single model. Different
          moments in a conversation demand different capabilities—and different
          cost profiles. Through Amazon Bedrock, we route to the optimal model
          for each task within the same streaming session.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-md p-2">
                <img
                  src="/images/icons/Claude_AI_logo.svg"
                  alt="Claude"
                  className="w-8 h-8"
                />
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-purple">
                Claude Sonnet 4.6
              </h3>
            </div>
            <p className="text-synthwave-neon-purple font-rajdhani font-semibold mb-2">
              The Deep Thinker
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Handles complex coaching conversations, multi-tool orchestration,
              nuanced advice, and situations requiring deep reasoning about
              training context and methodology.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Complex multi-tool conversations</li>
              <li>• Program-aware coaching advice</li>
              <li>• Injury and recovery reasoning</li>
              <li>• Methodology-grounded recommendations</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white rounded-md p-2">
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
              The Quick Responder
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Handles straightforward questions, quick check-ins, motivational
              responses, and simple tool calls. Sub-second first-token latency
              for a natural conversational flow.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Morning check-ins and quick queries</li>
              <li>• Single-tool responses</li>
              <li>• Motivational and celebratory messages</li>
              <li>• Fast conversational exchanges</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/icons/Arch_Amazon-Nova_64.svg"
                alt="Nemotron / Nova"
                className="w-12 h-12"
              />
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-pink">
                Nvidia Nemotron / Amazon Nova 2 Lite
              </h3>
            </div>
            <p className="text-synthwave-neon-pink font-rajdhani font-semibold mb-2">
              The Contextual Narrators
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Generate real-time contextual updates during tool execution.
              Coach-personality-aware ephemeral messages that keep the
              conversation feeling alive during processing.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• "Pulling up your squat history..." messages</li>
              <li>• Coach-personality-aware updates</li>
              <li>• Ultra-low latency (~100ms)</li>
              <li>• Keeps conversations feeling natural</li>
            </ul>
          </div>

          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-synthwave-neon-cyan/20 rounded-md p-2">
                <span className="font-russo text-synthwave-neon-cyan text-lg">
                  NV
                </span>
              </div>
              <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan">
                Nvidia NV-Embed-V2
              </h3>
            </div>
            <p className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
              The Semantic Bridge
            </p>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-3">
              Powers the semantic search behind{" "}
              <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md text-xs">
                search_knowledge_base
              </code>{" "}
              and{" "}
              <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md text-xs">
                search_methodology
              </code>
              . Finds relevant context by meaning, not keywords.
            </p>
            <ul className="space-y-1 text-synthwave-text-muted font-rajdhani text-xs">
              <li>• Workout history similarity search</li>
              <li>• Memory retrieval by meaning</li>
              <li>• Methodology knowledge matching</li>
              <li>• Cross-entity semantic queries</li>
            </ul>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlass} mb-8`}>
          <h3 className="font-rajdhani font-semibold text-lg text-synthwave-neon-cyan mb-4">
            Intelligent Model Selection
          </h3>
          <div className="bg-synthwave-bg-primary/30 rounded-md p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // Handler selects model based on conversation complexity
            </div>
            <div className="text-synthwave-neon-cyan">
              {`"What's my workout today?"        → Haiku 4.5 (fast, simple)`}
            </div>
            <div className="text-synthwave-neon-purple mt-1">
              {`"Should I deload? Feeling beat up" → Sonnet 4.6 (deep reasoning)`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`"Log that workout"                 → Sonnet 4.6 (tool orchestration)`}
            </div>
            <div className="text-synthwave-neon-cyan mt-1">
              {`"You got this!"                    → Haiku 4.5 (quick response)`}
            </div>
            <div className="text-synthwave-text-muted mt-3">
              {`// Result: Sonnet quality when it matters, Haiku speed when it doesn't`}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Layer Safety */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Multi-Layer Safety: Coaching That Protects You
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          An agent with 11 tools and the autonomy to use them needs guardrails.
          Great coaching pushes you appropriately, never recklessly. Safety
          isn't an afterthought—it's woven into every layer of the system.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-pink mb-4">
            The Safety Stack
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-synthwave-neon-pink/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  1
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Memory-Aware Coaching
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  The agent retrieves injury memories and constraints before
                  giving advice. That shoulder injury from three weeks ago
                  automatically informs today's recommendations.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-synthwave-neon-cyan/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                  2
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                  Methodology Grounding
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Coaching advice is grounded in validated methodology knowledge
                  via{" "}
                  <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
                    search_methodology
                  </code>
                  —not hallucinated fitness advice. The agent draws from
                  established training science, not internet bro-science.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-synthwave-neon-purple/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                  3
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple">
                  Tool-Level Validation
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  Every tool validates its inputs before executing. The{" "}
                  <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
                    log_workout
                  </code>{" "}
                  tool runs through normalization and validation before
                  persisting. Bad data doesn't make it to storage.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-synthwave-neon-pink/20 flex items-center justify-center shrink-0">
                <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                  4
                </span>
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink">
                  Behavioral Guardrails
                </h4>
                <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                  The agent's system prompt includes medical disclaimer
                  requirements, injury-aware coaching constraints, and response
                  consistency rules. It knows when to coach and when to refer to
                  a professional.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className={typographyPatterns.description}>
          The result: push hard with confidence, knowing the system is watching
          your back with the expertise of certified coaches and the vigilance of
          intelligent validation layers.
        </p>
      </section>

      {/* Semantic Memory */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Semantic Memory: A Coach That Never Forgets
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Conversation Agent's most human quality? Memory. Powered by Nvidia
          NV-Embed-V2 embeddings and Pinecone vector search, three of its tools—
          <code className="text-synthwave-neon-cyan bg-synthwave-bg-primary/50 px-1 rounded-md">
            search_knowledge_base
          </code>
          ,{" "}
          <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md">
            retrieve_memories
          </code>
          , and{" "}
          <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded-md">
            save_memory
          </code>
          —form a persistent memory loop. The agent both reads and writes
          memories, creating a coaching relationship that deepens over time.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { name: "Workout History", tool: "search_knowledge_base" },
            { name: "Training Programs", tool: "query_programs" },
            { name: "User Memories", tool: "retrieve_memories + save_memory" },
            { name: "Exercise PRs", tool: "query_exercise_history" },
            { name: "Conversation Summaries", tool: "search_knowledge_base" },
            { name: "Methodology Knowledge", tool: "search_methodology" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`${containerPatterns.cardLight} p-4 text-center`}
            >
              <span className="font-rajdhani font-semibold text-synthwave-text-primary text-sm block mb-1">
                {item.name}
              </span>
              <span className="font-rajdhani text-synthwave-text-muted text-xs">
                via {item.tool}
              </span>
            </div>
          ))}
        </div>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-russo text-lg text-synthwave-neon-purple mb-4">
            The Memory Loop
          </h3>
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            Most AI conversations are one-directional—you provide context, the
            AI responds. The Conversation Agent closes the loop: it reads
            memories to inform responses, and writes new memories during
            conversations. Mention a new injury? The agent saves it. Ask about
            an old one? The agent retrieves it. Over time, the memory builds a
            rich profile that makes every conversation smarter.
          </p>
          <div className="bg-synthwave-bg-primary/30 rounded-md p-4 font-mono text-sm">
            <div className="text-synthwave-text-muted mb-2">
              // The memory loop in action
            </div>
            <div className="text-synthwave-neon-purple">
              {`Month 1: save_memory("Tweaked lower back deadlifting")`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`Month 2: retrieve_memories() → "lower back caution"`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`         → Coach avoids heavy conventional deadlifts`}
            </div>
            <div className="text-synthwave-neon-purple mt-2">
              {`Month 3: save_memory("Back feeling great, cleared for DLs")`}
            </div>
            <div className="text-synthwave-neon-cyan mt-2">
              {`Month 4: retrieve_memories() → "back cleared, progressing"`}
            </div>
            <div className="text-synthwave-neon-pink mt-1">
              {`         → Coach reintroduces deadlifts progressively`}
            </div>
          </div>
        </div>
      </section>

      {/* Agents in Concert */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Multiple Agents, One Seamless Experience
        </h2>
        <p className={`${typographyPatterns.description} mb-8`}>
          The Conversation Agent doesn't work alone. It's the front-line agent
          that users interact with, but it coordinates with every specialized
          agent in the platform. Here's the full roster and how they connect:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className={containerPatterns.mediumGlass}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-cyan">
                  1
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
              Builds the coach personality that the Conversation Agent embodies
              in every response. Your coach's voice, style, and methodology
              expertise all originate here.
            </p>
          </div>

          <div className={containerPatterns.mediumGlassPurple}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-purple/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-purple">
                  2
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
              Powers the{" "}
              <code className="text-synthwave-neon-purple bg-synthwave-bg-primary/50 px-1 rounded-md text-xs">
                log_workout
              </code>{" "}
              tool. When the Conversation Agent detects a workout log, the
              Logger handles extraction, normalization, and persistence behind
              the scenes.
            </p>
          </div>

          <div className={containerPatterns.mediumGlassPink}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-pink/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-pink">
                  3
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
              Creates the programs that{" "}
              <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded-md text-xs">
                get_todays_workout
              </code>{" "}
              and{" "}
              <code className="text-synthwave-neon-pink bg-synthwave-bg-primary/50 px-1 rounded-md text-xs">
                complete_program_workout
              </code>{" "}
              interact with. Program design happens async; the Conversation
              Agent tracks progress in real time.
            </p>
          </div>

          <div
            className={`${containerPatterns.mediumGlass} border-synthwave-neon-cyan`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-synthwave-neon-cyan/30 flex items-center justify-center">
                <span className="font-inter font-bold text-synthwave-neon-cyan">
                  4
                </span>
              </div>
              <div>
                <h3 className="font-russo text-lg text-synthwave-neon-cyan">
                  Conversation Agent
                </h3>
                <p className="text-synthwave-text-muted text-sm font-rajdhani">
                  The Orchestration Layer — 11 Tools, Streaming, Real-Time
                </p>
              </div>
            </div>
            <p className="text-synthwave-text-secondary font-rajdhani text-sm">
              The agent users talk to every day. It orchestrates across the
              entire platform—pulling from programs, logging workouts, searching
              memories, querying history, saving context—all streamed in your
              coach's unique voice.
            </p>
          </div>
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
          for evolution—as models improve, as new tools become possible, your
          coaching improves automatically. The 11-tool foundation is extensible
          by design. Here's where we're headed:
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <h3 className="font-russo text-xl text-white mb-4">What's Coming</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                More Tools, More Capabilities
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Nutrition tracking, recovery management, competition prep tools.
                Each new tool is a new capability the Conversation Agent can
                autonomously leverage.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-cyan mb-2">
                Wearable Integration
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                HRV, sleep, and recovery data from wearables feeding directly
                into the Conversation Agent's context. "Should I train hard
                today?" answered with real physiological data.
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-purple mb-2">
                Proactive Coaching
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                The agent reaches out to you—not just responds. "Hey, you
                haven't trained in 3 days and your program has a heavy squat day
                waiting. Want to talk about it?"
              </p>
            </div>
            <div>
              <h4 className="font-rajdhani font-semibold text-synthwave-neon-pink mb-2">
                Community Features
              </h4>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Shared challenges, training partner matching, and
                community-driven coach templates. Your Conversation Agent as the
                bridge between solo training and community.
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
          <p className="text-synthwave-text-secondary font-rajdhani mb-4">
            The Conversation Agent embodies this philosophy completely. Users
            don't think about 11 tools, 4 AI models, or 5 coordinating agents.
            They think about their coach—the one who remembers their shoulder
            injury, celebrates their PRs, knows what workout is on deck today,
            and always has time for a conversation.
          </p>
          <p className="text-synthwave-text-secondary font-rajdhani">
            The tech is sophisticated, but the experience is simply... coaching.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mb-8">
        <div className={`${containerPatterns.boldGradient} text-center`}>
          <h2 className={`${typographyPatterns.sectionTitle} mb-4`}>
            Ready to Experience the{" "}
            <span className="text-synthwave-neon-pink">Orchestration</span>?
          </h2>
          <p
            className={`${typographyPatterns.description} mb-8 max-w-2xl mx-auto`}
          >
            You've seen the architecture. You've seen the tools. Now it's time
            to feel the difference. Sign up for NeonPanda and talk to a coach
            that actually listens, remembers, and acts.
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
              <span>11 Agent Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-purple rounded-full animate-pulse"></div>
              <span>Multiple Specialized AI Agents</span>
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
                className="group flex items-center gap-3 p-3 rounded-md hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-pink/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-pink">
                    1
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-pink transition-colors">
                  The Foundation of Everything
                </span>
              </Link>
              <Link
                to="/blog/your-coach-your-way"
                className="group flex items-center gap-3 p-3 rounded-md hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-cyan/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-cyan">
                    2
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-cyan transition-colors">
                  Your Coach, Built Your Way
                </span>
              </Link>
              <Link
                to="/blog/every-rep-counts"
                className="group flex items-center gap-3 p-3 rounded-md hover:bg-synthwave-bg-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-synthwave-neon-purple/20 flex items-center justify-center">
                  <span className="font-inter font-bold text-sm text-synthwave-neon-purple">
                    3
                  </span>
                </div>
                <span className="font-rajdhani text-synthwave-text-primary group-hover:text-synthwave-neon-purple transition-colors">
                  Every Rep Counts, Every Time
                </span>
              </Link>
              <Link
                to="/blog/training-programs-that-think"
                className="group flex items-center gap-3 p-3 rounded-md hover:bg-synthwave-bg-primary/30 transition-colors"
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
