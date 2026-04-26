import React from "react";
import { Link } from "react-router-dom";
import Callout from "./Callout";

function CoachConversationsDoc() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-synthwave-text-muted font-header">
          <span>Core Features</span>
          <span className="text-synthwave-neon-pink">/</span>
          <span>Coach Conversations</span>
        </div>
        <h1 className="font-header font-bold text-3xl md:text-4xl text-synthwave-text-primary leading-tight">
          Coach Conversations
        </h1>
        <p className="font-body text-lg text-synthwave-text-secondary leading-relaxed max-w-2xl">
          Your AI coach is available for real-time conversation. Ask questions,
          get training advice, log workouts, and receive personalized feedback
          — all through a natural chat interface with streaming responses.
        </p>
      </div>

      {/* Starting a conversation */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Starting a Conversation
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Conversations happen within your Training Grounds, tied to a specific
          coach. Here's how to begin:
        </p>

        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                Select your coach
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                From the <strong>Coaches</strong> page, select the coach you
                want to talk to. This takes you to the Training Grounds for
                that coach.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                Open or create a conversation
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                Navigate to <strong>Coach Conversations</strong> from the
                Training Grounds. You can continue an existing conversation or
                start a new one.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple flex items-center justify-center text-white font-header font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-1">
                Start chatting
              </h3>
              <p className="font-body text-synthwave-text-secondary text-sm leading-relaxed">
                Type your message and send it. Your coach responds in real-time
                with streaming text, so you see the response as it's being
                generated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What you can ask */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          What You Can Talk About
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Your coach has access to your training history, goals, preferences,
          and program data. Conversations are open-ended — here are some common
          topics:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: "Training Advice",
              desc: "Ask about programming, periodization, movement selection, and training methodology.",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
              color: "pink",
            },
            {
              title: "Form & Technique",
              desc: "Get guidance on exercise form, cues, and common mistakes to avoid.",
              icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
              color: "cyan",
            },
            {
              title: "Progress Check-Ins",
              desc: "Review your recent training, identify trends, and discuss what's working.",
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              color: "purple",
            },
            {
              title: "Workout Ideas",
              desc: "Ask your coach to suggest a workout for today based on your schedule and recent training.",
              icon: "M13 10V3L4 14h7v7l9-11h-7z",
              color: "pink",
            },
            {
              title: "Nutrition Guidance",
              desc: "Discuss nutrition strategies, recovery, and how to fuel your training.",
              icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
              color: "cyan",
            },
            {
              title: "Motivation & Mindset",
              desc: "Get encouragement, discuss setbacks, and work through training plateaus.",
              icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
              color: "purple",
            },
          ].map((topic) => {
            const colorMap = {
              pink: "border-synthwave-neon-pink/15 text-synthwave-neon-pink",
              cyan: "border-synthwave-neon-cyan/15 text-synthwave-neon-cyan",
              purple: "border-synthwave-neon-purple/15 text-synthwave-neon-purple",
            };
            return (
              <div
                key={topic.title}
                className={`p-4 rounded-lg border ${colorMap[topic.color].split(" ")[0]} bg-synthwave-bg-card/30`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className={`w-5 h-5 ${colorMap[topic.color].split(" ").slice(1).join(" ")}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={topic.icon}
                    />
                  </svg>
                  <h3 className="font-header font-bold text-sm text-synthwave-text-primary">
                    {topic.title}
                  </h3>
                </div>
                <p className="font-body text-xs text-synthwave-text-muted leading-relaxed">
                  {topic.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slash commands */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Slash Commands
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Within a coach conversation, you can use slash commands to trigger
          specific actions:
        </p>

        <div className="space-y-2">
          <div className="flex items-start space-x-3 p-3 rounded-xl border border-synthwave-neon-cyan/10 bg-synthwave-bg-card/30">
            <code className="shrink-0 px-2 py-0.5 rounded bg-synthwave-bg-primary border border-synthwave-neon-cyan/20 text-synthwave-neon-cyan font-ai text-sm">
              /log-workout
            </code>
            <p className="font-body text-sm text-synthwave-text-secondary">
              Log a workout directly from the conversation. Describe your
              session after the command, and it will be processed and linked to
              your training history.
            </p>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-xl border border-synthwave-neon-cyan/10 bg-synthwave-bg-card/30">
            <code className="shrink-0 px-2 py-0.5 rounded bg-synthwave-bg-primary border border-synthwave-neon-cyan/20 text-synthwave-neon-cyan font-ai text-sm">
              /save-memory
            </code>
            <p className="font-body text-sm text-synthwave-text-secondary">
              Save an important piece of information to your coach's memory.
              This helps the coach remember specific preferences, constraints,
              or context across conversations.
            </p>
          </div>
        </div>

        <Callout type="tip">
          Slash commands are available by typing <code className="text-synthwave-neon-cyan font-ai">/</code> at the
          start of your message. A suggestions menu will appear with available
          commands.
        </Callout>
      </div>

      {/* Streaming & real-time */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-purple uppercase tracking-wide">
          Real-Time Streaming
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          Coach responses stream in real-time — you see each word as it's
          generated, so you never have to wait for a full response to load.
          While your coach is thinking, you'll see contextual status updates
          that indicate what the AI is doing behind the scenes (e.g., reviewing
          your workout history or checking program details).
        </p>
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          Sharing Images
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          You can attach images to your messages. This is useful for sharing
          photos of your workout setup, progress pictures, or screenshots of
          exercises you want feedback on. Your coach can see and respond to
          the images in context.
        </p>
      </div>

      {/* Managing conversations */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Managing Conversations
        </h2>
        <p className="font-body text-synthwave-text-secondary leading-relaxed">
          You can have multiple conversations with each coach. Conversations
          can be:
        </p>
        <ul className="list-disc list-inside space-y-2 font-body text-synthwave-text-secondary ml-2">
          <li>
            <strong className="text-synthwave-text-primary">Renamed</strong> —
            Edit the conversation title for easy reference
          </li>
          <li>
            <strong className="text-synthwave-text-primary">Deleted</strong> —
            Remove conversations you no longer need
          </li>
          <li>
            <strong className="text-synthwave-text-primary">Reviewed</strong> —
            Browse past conversations from the Manage Conversations page
          </li>
        </ul>
        <Callout type="info">
          Your coach maintains context across messages within a conversation,
          and has access to your broader training history and saved memories
          across all conversations.
        </Callout>
      </div>

      {/* Tips */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-purple uppercase tracking-wide">
          Getting the Most from Your Coach
        </h2>
        <div className="space-y-3">
          <Callout type="tip">
            <strong>Be specific.</strong> Instead of "What should I do today?"
            try "I have 45 minutes and want to focus on upper body pulling.
            What do you suggest?" The more context you give, the better the
            response.
          </Callout>
          <Callout type="tip">
            <strong>Use /save-memory for important context.</strong> If you get
            new equipment, change your schedule, or have a new injury, save it
            as a memory so your coach always has the latest info.
          </Callout>
          <Callout type="tip">
            <strong>Review your training together.</strong> Ask your coach to
            review your recent workouts and suggest adjustments. The coach has
            access to your full training history and can spot patterns you
            might miss.
          </Callout>
        </div>
      </div>

      {/* Related */}
      <div className="p-6 rounded-lg border border-synthwave-neon-pink/20 bg-synthwave-neon-pink/5 space-y-3">
        <h3 className="font-header font-bold text-synthwave-text-primary">
          Related
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/docs/creating-a-coach"
            className="font-body text-sm text-synthwave-neon-pink hover:underline"
          >
            Creating a Coach &rarr;
          </Link>
          <Link
            to="/docs/logging-workouts"
            className="font-body text-sm text-synthwave-neon-cyan hover:underline"
          >
            Logging Workouts &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CoachConversationsDoc;
