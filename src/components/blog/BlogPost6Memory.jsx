import React from "react";
import {
  containerPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";

function BlogPost6Memory() {
  return (
    <>
      {/* Opening Hook */}
      <section className="mb-16">
        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-body text-xl text-white leading-relaxed italic">
            "How's the knee feeling after that run on Saturday? Last time we
            talked, you mentioned it was flaring up during box jumps. By the
            way—your half marathon is in three weeks. Are we still feeling
            confident about the pacing strategy we mapped out?"
          </p>
        </div>

        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          That response didn't come from a human coach reviewing their notes
          before a session. It came from NeonPanda's AI coach—drawing on a
          persistent memory of your knee concern from two weeks ago, a
          prospective memory that your half marathon is approaching, and an
          emotional read that you've been feeling confident lately.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed mb-6`}
        >
          Most AI fitness apps treat every conversation like a first date. They
          don't remember your injury history. They don't follow up on the
          competition you mentioned last month. They definitely don't notice
          that your motivation has been declining over the last three sessions
          and adjust their tone accordingly.
        </p>
        <p
          className={`${typographyPatterns.description} text-xl leading-relaxed`}
        >
          <span className="text-synthwave-neon-purple font-semibold">
            We built something different.
          </span>{" "}
          A 4-layer memory architecture that gives your AI coach a real mental
          model of who you are—one that strengthens with every conversation,
          fades when neglected, and evolves as you do. This is the system that
          turns an AI chatbot into a coaching relationship.
        </p>
      </section>

      {/* The Problem */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          The Amnesia Problem
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          Here's the dirty secret of AI coaching: most systems have the memory
          of a goldfish. They work within a single conversation window—maybe the
          last 10 or 20 messages. Close the chat and open a new one? Clean
          slate. Your AI "coach" has no idea you exist.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          Some platforms bolt on basic memory—a list of facts the AI can
          reference. "User prefers morning workouts." "User has a shoulder
          injury." That's better than nothing, but it's a filing cabinet, not a
          coaching relationship. A real coach doesn't just remember facts. They
          notice patterns. They follow up on things you said weeks ago. They
          sense when you're off and adjust. They build a mental model of who you
          are that deepens with every interaction.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-body font-semibold text-xl text-synthwave-neon-pink mb-4">
            What Real Coaching Memory Looks Like
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-body">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Temporal awareness:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  "Your marathon is in 3 weeks" — not because you told it today,
                  but because you mentioned it two months ago and the date is
                  approaching.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-body">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Emotional calibration:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Noticing that your energy has been low across the last few
                  sessions and easing up on intensity without you having to ask.
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-body">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Relationship depth:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Referencing shared moments naturally—"Remember when you hit
                  that 3-plate squat and got emotional about your dad? That was
                  a breakthrough moment."
                </span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-pink mt-1">•</span>
              <div className="font-body">
                <strong className="text-synthwave-neon-pink font-semibold">
                  Decay and reinforcement:
                </strong>{" "}
                <span className="text-synthwave-text-secondary">
                  Memories that matter stay strong. Offhand comments fade
                  naturally. Just like a real brain.
                </span>
              </div>
            </li>
          </ul>
        </div>

        <p className={`${typographyPatterns.description}`}>
          That's what we set out to build. Not a smarter database query. A
          cognitive architecture.
        </p>
      </section>

      {/* Upgrade 1: Prospective Memory */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Layer 1: Prospective Memory — Your Coach Follows Up
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          In cognitive science, prospective memory is the ability to remember to
          do something in the future. "Remind me to pick up groceries." "Don't
          forget Sarah's birthday." Humans are notoriously bad at this. AI can
          be exceptionally good at it.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          Every time you chat with your coach, the system runs a fire-and-forget
          extraction pipeline on both your message and the coach's response. It
          scans for forward-looking commitments, events, and milestones:
        </p>

        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-body font-semibold text-xl text-synthwave-neon-cyan mb-4">
            What Gets Extracted
          </h3>
          <ul className="space-y-3 font-body text-synthwave-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-synthwave-neon-cyan mt-0.5">→</span>
              <span>
                <strong className="text-white">Events with dates:</strong> "My
                half marathon is October 15" — follow up before and after
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-synthwave-neon-cyan mt-0.5">→</span>
              <span>
                <strong className="text-white">Commitments:</strong> "I'll try
                sumo deadlifts next week" — ask how it went
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-synthwave-neon-cyan mt-0.5">→</span>
              <span>
                <strong className="text-white">Milestones:</strong> "Aiming for
                a 315 deadlift by June" — track progress, celebrate
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-synthwave-neon-cyan mt-0.5">→</span>
              <span>
                <strong className="text-white">Life changes:</strong> "Going on
                vacation Aug 1-15" — adjust expectations, welcome back
              </span>
            </li>
          </ul>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          Each extracted item gets a trigger window—a time range around the
          target date when the coach should naturally bring it up. Major events
          like competitions surface 7 days before and 5 days after. Small
          commitments like "try a new exercise" surface the next day. The coach
          doesn't force these into every conversation. They're woven in
          naturally, like how a good human coach would think "oh right, didn't
          they have that race last weekend?"
        </p>
        <p className={`${typographyPatterns.description}`}>
          The result? Your coach remembers your future, not just your past. You
          mention a powerlifting meet in passing, and three months later your
          coach brings it up at exactly the right time.
        </p>
      </section>

      {/* Upgrade 2: Living Profile */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Layer 2: The Living Profile — A Mental Model That Grows
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          When a human coach works with an athlete for months, they build an
          internal model of that person. Not just their PRs and their
          program—but how they communicate, what motivates them, what topics
          make them shut down, how their life outside the gym affects their
          training. It's an intuition built from dozens of conversations.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          The Living Profile is our attempt to give the AI that same intuition.
          After every conversation, a summary is generated and passed to a
          dedicated Lambda function that synthesizes (or incrementally updates)
          a structured mental model of the user.
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <h3 className="font-body font-semibold text-xl text-synthwave-neon-purple mb-4">
            What the Living Profile Contains
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 font-body text-synthwave-text-secondary">
              <p>
                <strong className="text-synthwave-neon-purple">
                  Training Identity
                </strong>{" "}
                — who they are as an athlete, experience level, disciplines,
                their personal narrative around fitness
              </p>
              <p>
                <strong className="text-synthwave-neon-purple">
                  Communication Style
                </strong>{" "}
                — do they want direct technical talk or warm encouragement? What
                motivates them? What topics are sensitive?
              </p>
              <p>
                <strong className="text-synthwave-neon-purple">
                  Life Context
                </strong>{" "}
                — occupation, schedule, stressors, support factors, constraints
                that affect training
              </p>
            </div>
            <div className="space-y-2 font-body text-synthwave-text-secondary">
              <p>
                <strong className="text-synthwave-neon-purple">
                  Goals & Progress
                </strong>{" "}
                — active goals, milestones, current training phase, trajectory
              </p>
              <p>
                <strong className="text-synthwave-neon-purple">
                  Coaching Relationship
                </strong>{" "}
                — from "new" to "deep," tracking rapport and communication
                dynamics over time
              </p>
              <p>
                <strong className="text-synthwave-neon-purple">
                  Knowledge Gaps
                </strong>{" "}
                — what the coach <em>doesn't</em> know yet. Questions to ask
                naturally over time. Metamemory—memory about what's missing.
              </p>
            </div>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The relationship stage is particularly important. In the first few
          conversations, the coach knows to ask more discovery questions and
          avoid assumptions. After 30+ conversations, they can reference shared
          history, inside jokes, and hard-won milestones. The coaching
          relationship matures, just like a real one.
        </p>
        <p className={`${typographyPatterns.description}`}>
          And here's the metamemory concept: the profile explicitly tracks what
          the coach doesn't know. "Unknown: sleep schedule." "Partially known:
          shoulder injury but not specifics." This gives the AI natural prompts
          to fill knowledge gaps over time—"How's your sleep been, by the
          way?"—rather than dumping a 20-question intake form on day one.
        </p>
      </section>

      {/* Upgrade 3: FSRS */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Layer 3: FSRS-Based Temporal Decay — Memory That Breathes
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          In most AI memory systems, every memory is equally accessible forever.
          That offhand comment about liking morning workouts from six months ago
          sits right next to the critical training directive from yesterday.
          That's not how memory works—not for humans, and not for a good
          coaching system.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          We implemented a temporal decay model based on FSRS v6 (Free Spaced
          Repetition Scheduler)—the same algorithm behind some of the best
          flashcard learning systems in the world. The core insight from spaced
          repetition research: memory stability grows with each successful
          retrieval, and it grows MORE when the retrieval happens at the edge of
          forgetting.
        </p>

        <div className={`${containerPatterns.mediumGlassPink} mb-8`}>
          <h3 className="font-body font-semibold text-xl text-synthwave-neon-pink mb-4">
            How Memory Decay Works
          </h3>
          <div className="space-y-4 font-body text-synthwave-text-secondary">
            <p>
              Every memory starts with an initial{" "}
              <strong className="text-white">stability</strong>—how many days
              until it fades to 37% retrievability. High-importance memories
              start at 30 days. Low-importance ones start at 7.
            </p>
            <p>
              Each time a memory is retrieved and used in conversation, it gets{" "}
              <strong className="text-white">reinforced</strong>. Its stability
              grows based on the "desirable difficulty" effect—memories
              reinforced when they're about to fade gain MORE strength than
              memories reinforced while still fresh.
            </p>
            <p>
              The result: memories you and your coach reference often become
              practically permanent. Offhand comments naturally fade unless
              they're reinforced. Over time, the system self-curates—the most
              relevant memories float to the top, and forgotten ones gracefully
              compress and eventually archive.
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          This replaced our original flat scoring model, where every memory
          under 30 days old was treated equally and everything older just
          disappeared. Now a high-importance memory that's been reinforced 10
          times might have an effective lifespan of months. A throwaway comment
          that was never referenced again fades in a week or two. Just like in a
          real coaching relationship.
        </p>
        <p className={`${typographyPatterns.description}`}>
          The lifecycle also includes compression and archival stages. When a
          memory's retrievability drops below 30%, it can be compressed to a
          gist—the essence preserved, the details released. Below 10%? Archived
          entirely. Your coach's working memory stays focused on what matters
          right now.
        </p>
      </section>

      {/* Upgrade 4: Emotional Intelligence */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Layer 4: Emotional Intelligence — Reading the Room
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The final layer is one that most AI systems don't even attempt:
          tracking emotional state across conversations. Not sentiment analysis
          on a single message—longitudinal emotional awareness. How has this
          person's motivation trended over the last month? Are they more
          stressed than usual? Is their confidence building or eroding?
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          After each conversation summary is generated, the system extracts an
          emotional snapshot: calibrated 1-10 scores for motivation, energy,
          confidence, stress, and coach satisfaction, plus a dominant emotion
          label and a brief narrative. These snapshots aggregate into weekly and
          monthly trends—pure math, no AI needed for the trend calculation.
        </p>

        <div className={`${containerPatterns.mediumGlassCyan} mb-8`}>
          <h3 className="font-body font-semibold text-xl text-synthwave-neon-cyan mb-4">
            How the Coach Adapts
          </h3>
          <div className="space-y-3 font-body text-synthwave-text-secondary">
            <p>
              <strong className="text-synthwave-neon-cyan">
                High stress detected?
              </strong>{" "}
              The coach eases into a lighter check-in and emphasizes recovery.
              No one wants to be pushed harder when they're already overwhelmed.
            </p>
            <p>
              <strong className="text-synthwave-neon-cyan">
                Low motivation across 3 sessions?
              </strong>{" "}
              Focus shifts to small wins and intrinsic rewards—not "just push
              harder." The system even flags it as a coaching alert.
            </p>
            <p>
              <strong className="text-synthwave-neon-cyan">
                Confidence and motivation both high?
              </strong>{" "}
              Great headspace. Time to suggest that new challenge or revisit an
              ambitious goal.
            </p>
          </div>
        </div>

        <p className={`${typographyPatterns.description}`}>
          The coach never mentions these metrics directly. You won't see "Your
          motivation score is 4/10." Instead, the emotional context shapes the
          tone, the approach, the intensity of what the coach says. It's the
          difference between an AI that reacts to your words and one that
          responds to how you're doing.
        </p>
      </section>

      {/* The Integration */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          Where It All Comes Together
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          These four layers don't operate in isolation. On every conversation
          turn, they converge into the coach's system prompt in a deliberate
          order:
        </p>

        <div className={`${containerPatterns.mediumGlassPurple} mb-8`}>
          <ol className="space-y-3 font-body text-synthwave-text-secondary">
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-purple font-bold mt-0.5">
                1.
              </span>
              <span>
                <strong className="text-white">Living Profile</strong> — the
                coach's mental model of who you are, loaded first to set the
                foundation
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-purple font-bold mt-0.5">
                2.
              </span>
              <span>
                <strong className="text-white">Emotional Context</strong> —
                current emotional state and trends to calibrate tone
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-purple font-bold mt-0.5">
                3.
              </span>
              <span>
                <strong className="text-white">
                  Prospective Follow-Up Items
                </strong>{" "}
                — what to naturally follow up on today
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-purple font-bold mt-0.5">
                4.
              </span>
              <span>
                <strong className="text-white">Active Memories</strong> —
                FSRS-ranked, relevant memories grouped by type
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-synthwave-neon-purple font-bold mt-0.5">
                5.
              </span>
              <span>
                <strong className="text-white">
                  Recent workouts, semantic context, user data
                </strong>{" "}
                — the real-time operational context
              </span>
            </li>
          </ol>
        </div>

        <p className={`${typographyPatterns.description} mb-6`}>
          The pipeline is designed for speed. Memory retrieval is a DynamoDB
          query (sub-50ms). Prospective filtering is pure date math (no AI
          call). The Living Profile is pre-built asynchronously and just loaded
          from the user record. Emotional context is pre-computed. The only AI
          call on the sync path is the optional semantic memory retrieval from
          Pinecone—and that only fires when the system detects it would actually
          help.
        </p>
        <p className={`${typographyPatterns.description}`}>
          The heavy work—living profile updates, emotional extraction, episodic
          moment detection, behavioral pattern recognition—all happens
          asynchronously after conversation summaries. Your conversation is
          never waiting for memory to catch up. Memory catches up on its own,
          behind the scenes, and is ready for the next time you talk.
        </p>
      </section>

      {/* Why This Matters */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink mb-6`}
        >
          Why This Matters
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          The gap between AI fitness tools and real coaching has always been
          relational. The AI is smart enough to write a great workout. It's
          knowledgeable enough to explain periodization. But ask it about
          something you discussed last month and it draws a blank.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          This memory architecture is our attempt to close that gap. Not by
          making the AI smarter in any given conversation—it was already smart.
          But by giving it the thing human coaches have that AI has lacked:
          continuity. The sense that each conversation builds on the last. That
          your coach knows you better in month six than in month one. That the
          relationship is going somewhere.
        </p>

        <div className={`${containerPatterns.boldGradient} mb-8`}>
          <p className="font-body text-xl text-white leading-relaxed">
            The best coaching relationships are built on trust, and trust is
            built on memory. When someone remembers your story—not just the data
            points, but the moments, the struggles, the victories—that's when
            coaching becomes transformative.
          </p>
        </div>

        <p className={`${typographyPatterns.description}`}>
          That's what we're building at NeonPanda. Not just an AI that knows
          your numbers. A coach that knows <em>you</em>.
        </p>
      </section>

      {/* Technical Summary */}
      <section className="mb-16">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan mb-6`}
        >
          Under the Hood
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={`${containerPatterns.mediumGlassCyan} p-6`}>
            <h3 className="font-body font-semibold text-lg text-synthwave-neon-cyan mb-3">
              Memory Types
            </h3>
            <div className="space-y-2 font-body text-synthwave-text-secondary text-sm">
              <p>
                <span className={badgePatterns.cyan}>Explicit</span>{" "}
                Preferences, goals, constraints, instructions, context
              </p>
              <p>
                <span className={badgePatterns.purple}>Prospective</span>{" "}
                Forward-looking events, commitments, milestones
              </p>
              <p>
                <span className={badgePatterns.pink}>Episodic</span> Significant
                shared moments and breakthroughs
              </p>
              <p>
                <span className={badgePatterns.muted}>Behavioral</span> Observed
                patterns from longitudinal data
              </p>
            </div>
          </div>

          <div className={`${containerPatterns.mediumGlassPink} p-6`}>
            <h3 className="font-body font-semibold text-lg text-synthwave-neon-pink mb-3">
              Architecture
            </h3>
            <div className="space-y-2 font-body text-synthwave-text-secondary text-sm">
              <p>
                <strong className="text-white">Storage:</strong> DynamoDB
                (structured) + Pinecone (semantic)
              </p>
              <p>
                <strong className="text-white">Decay:</strong> FSRS v6 power-law
                forgetting curve
              </p>
              <p>
                <strong className="text-white">Profile:</strong>{" "}
                Sonnet-generated Living Profile, async updates
              </p>
              <p>
                <strong className="text-white">Emotion:</strong>{" "}
                Per-conversation snapshots → weekly/monthly trends
              </p>
            </div>
          </div>
        </div>

        <div className={`${containerPatterns.mediumGlassPurple} p-6`}>
          <h3 className="font-body font-semibold text-lg text-synthwave-neon-purple mb-3">
            Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-body text-center">
            <div>
              <p className="text-2xl font-bold text-synthwave-neon-purple">
                &lt;50ms
              </p>
              <p className="text-xs text-synthwave-text-muted">
                Memory retrieval
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-synthwave-neon-cyan">0ms</p>
              <p className="text-xs text-synthwave-text-muted">
                Prospective filter (date math)
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-synthwave-neon-pink">
                Async
              </p>
              <p className="text-xs text-synthwave-text-muted">
                Heavy extraction (non-blocking)
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">&lt;1%</p>
              <p className="text-xs text-synthwave-text-muted">
                Cost overhead per conversation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Full System, Now Live */}
      <section className="mb-8">
        <h2
          className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple mb-6`}
        >
          The Full System, Now Live
        </h2>
        <p className={`${typographyPatterns.description} mb-6`}>
          All four upgrades are fully operational. Prospective memory and the
          Living Profile have been running in production since day one. FSRS-4.5
          decay scoring replaced the flat 30-day window with real cognitive
          curves. And now the final two layers are wired in.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          Every conversation summary now triggers two background extractions.
          The first captures an emotional snapshot—motivation, energy,
          confidence, stress—scored and timestamped, then aggregated into weekly
          trends. The second pulls episodic moments: the breakthrough sets, the
          admissions of burnout, the race-day outcomes. These memories are
          stored globally so every coach context benefits from them, not just
          the one that was open when they happened.
        </p>
        <p className={`${typographyPatterns.description} mb-6`}>
          Every night at 3am, a lifecycle dispatcher runs across every user. It
          fans out per-user processors in parallel—each one compressing memories
          that have decayed below 30% retrievability into a single sentence,
          archiving memories that have faded below 10%, expiring prospective
          memories that missed their window, and on Sundays running weekly
          behavioral pattern detection across the last two weeks of conversation
          summaries to surface implicit tendencies the user hasn&apos;t
          articulated themselves.
        </p>
        <p className={`${typographyPatterns.description}`}>
          The goal has never changed: make AI coaching feel less like talking to
          a machine and more like working with someone who genuinely knows you.
          Memory is how we get there—and now the full system is running.
        </p>
      </section>
    </>
  );
}

export default BlogPost6Memory;
