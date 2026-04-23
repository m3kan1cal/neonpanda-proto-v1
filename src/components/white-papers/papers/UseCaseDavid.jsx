import React from "react";
import WhitePaperLayout from "../WhitePaperLayout";
import {
  ShareCard,
  Callout,
  AtAGlance,
  MethodLimitations,
  PullQuotes,
  Beat,
} from "../primitives";
import { getWhitePaperBySlug } from "../../../data/whitePapers";

function UseCaseDavid() {
  const paper = getWhitePaperBySlug("use-case-david-returning-athlete");

  return (
    <WhitePaperLayout
      paper={paper}
      headline="How a returning 50-year-old athlete built a 6-month plan that honors faith, family, and a hockey comeback"
      deck="A multi-modal program that treated Sunday Sabbath as a core principle, not a workaround — and got the follow-through to match."
    >
      <ShareCard>
        <p className="intro">
          After a quick first try fizzled in December, <strong>David</strong> —
          a 50-year-old returning athlete — came back to NeonPanda in March with
          a clearer goal and a fresh coach. Four weeks in, the data paints a
          picture most fitness apps miss: a whole person training seriously
          without sacrificing what matters outside the gym.
        </p>
        <ul>
          <li>
            <strong>Who:</strong> A 50-year-old multi-modal athlete (strength,
            running, CrossFit, cycling, rec hockey), practicing member of the
            LDS Church
          </li>
          <li>
            <strong>Where he started:</strong> One workout logged on a short
            12-week attempt in December, then re-engaged March 14, 2026 with a
            new coach and a 6-month program
          </li>
          <li>
            <strong>What he wanted:</strong> Lose 25 lbs by year-end,
            comfortable half-marathon trail run by September, condition for a
            recreational hockey comeback
          </li>
          <li>
            <strong>What shifted in 4 weeks:</strong>
            <ul>
              <li>
                Back squat climbed 95 → 105 → 115 lbs on steady 5-lb increments
              </li>
              <li>
                First hockey game back logged (24 min ice, 632 cal, Avg HR 132 /
                Max 163)
              </li>
              <li>
                All 3 days of a 49.43-mile family GAP Trail ride executed with
                near-identical aerobic pacing (102–104 bpm avg)
              </li>
              <li>
                Sunday Sabbath embedded as a program principle, not a scheduling
                obstacle
              </li>
            </ul>
          </li>
          <li>
            <strong>Why it matters:</strong> The program bent around his life —
            and he hit every rep of what he agreed to.
          </li>
        </ul>
        <p className="note">
          Screenshot or paste this block anywhere — it stands on its own.
        </p>
      </ShareCard>

      <hr />

      <h2>The story</h2>

      <h3>At a glance</h3>
      <AtAGlance>
        <ul>
          <li>
            <strong>Who:</strong> David, 50, returning multi-modal athlete with
            a running and triathlon background
          </li>
          <li>
            <strong>Starting point:</strong> Tried a 12-week weight-loss program
            in December 2025, logged one workout, drifted off
          </li>
          <li>
            <strong>Primary goals:</strong> –25 lbs by year-end, comfortable
            half-marathon trail run by September, rec-hockey fitness
          </li>
          <li>
            <strong>Timeframe:</strong> March 14 – April 17, 2026 (≈5 weeks
            active, 30 logged workouts)
          </li>
          <li>
            <strong>What changed:</strong> A new coach/methodology fit that
            stuck; a 180-day program he can recite the phase structure of;
            conservative, consistent strength progression; a family bike trip
            that didn&rsquo;t derail the plan; first hockey game back, logged
            cleanly
          </li>
        </ul>
      </AtAGlance>

      <h3>The situation</h3>
      <p>
        David is the kind of athlete most programming gets wrong. He&rsquo;s 50,
        running has been part of his life, he&rsquo;s coming back after time
        away, and he wants to do several things at once — lose some weight, run
        a trail half, play hockey, keep lifting. He tracks everything on a
        Garmin and reads his own data carefully. He&rsquo;s also a practicing
        member of the LDS Church, which means Sunday isn&rsquo;t a &ldquo;rest
        day&rdquo; in the generic programming sense — it&rsquo;s a Sabbath.
        Non-negotiable.
      </p>

      <h3>The first fit vs. the second fit</h3>
      <p>
        The December attempt is easy to miss, but it&rsquo;s the piece of the
        story that sets up everything else.
      </p>
      <p>
        That first time through, David configured his first coach — a
        general-purpose personality paired with a hybrid-conditioning
        methodology, tuned to a single goal: drop 20 lbs. He logged one workout
        and the thread went quiet. It wasn&rsquo;t a dramatic churn; it was the
        kind of drift that happens when a program only addresses part of
        someone&rsquo;s life.
      </p>
      <p>
        Three months later, he didn&rsquo;t retry that program. He{" "}
        <strong>rebuilt from scratch.</strong> Using the coach creator, he spun
        up a completely different coach — a new personality template
        (&ldquo;Diana,&rdquo; a direct/technical communication style), a new
        methodology (PRVN Fitness), and a broader brief: half-marathon trail
        run, hockey conditioning, and the weight-loss target on a longer
        horizon. Then he ran a program designer session to build a{" "}
        <strong>180-day, four-phase block-periodized plan</strong>: Foundation →
        Strength Build → Endurance &amp; Power → Peak, with deloads at weeks 6,
        12, and 18.
      </p>
      <p>
        That single pivot — rebuilding instead of retrying — is where the
        NeonPanda model earned its keep. Most fitness platforms give you one
        coach, one plan, and adjustments within. David needed a different coach,
        a different methodology, and a different goal shape. The product let him
        start over without feeling like he was starting over.
      </p>

      <Callout kicker="What David's coaching taught the product">
        <p className="intro">
          David came back with a fuller life on the calendar — faith as a
          non-negotiable training boundary, family miles on the bike, hockey
          conditioning alongside a six-month block — and he needed the product
          to feel <strong>easier and more intuitive</strong> than the first pass
          that only addressed part of the story. The March–April window
          stress-tested the boring load-bearing pieces: memories that persist,
          program state you can edit in conversation, logging that turns natural
          language into structured workouts. His thread is part of why those
          flows now default to <strong>clarity first</strong> for returning
          athletes who shouldn&rsquo;t have to fight the UI to honor their real
          week.
        </p>
        <p className="intro">
          He also trained cycling as seriously as anything in the gym — three
          disciplined days on the GAP Trail, trailer in tow, heart rate bands
          tight across days, rides logged as real training instead of
          &ldquo;off-plan&rdquo; exceptions. That usage pushed us to treat{" "}
          <strong>cycling as a first-class discipline</strong> on the platform
          alongside strength and conditioning, so multi-modal athletes
          don&rsquo;t have to wedge outdoor miles into a product that only
          speaks barbell and treadmill.
        </p>
        <p className="intro">
          In short: David didn&rsquo;t just execute a better program the second
          time — he helped the product learn how to stay out of the way when
          someone&rsquo;s training life is genuinely mixed-modal.
        </p>
      </Callout>

      <h3>How the coaching actually works, by example</h3>
      <p>
        Three small moments from the March–April window show what &ldquo;AI
        coaching&rdquo; looks like when it&rsquo;s doing its job — and what
        product capability makes each of them possible.
      </p>

      <Beat num="1" title="The Sabbath becomes a program principle.">
        {" "}
        Six days into the new program, David surfaced his faith plainly:{" "}
        <em>
          &ldquo;The Sunday rest day is a religious preference… I should not
          exercise on the Sabbath.&rdquo;
        </em>{" "}
        The coach didn&rsquo;t file this as a preference; it got written into
        the user memory store as a high-importance{" "}
        <strong>behavioral memory</strong> with an explicit rule:{" "}
        <em>
          never schedule training, conditioning work, or logging prompts on
          Sunday.
        </em>{" "}
        Every downstream conversation, every program adjustment, every check-in
        reminder reads that memory first. Weeks later, the constraint is still
        holding — not because David keeps reminding the coach, but because the
        coach can&rsquo;t forget. The product capability is boring to describe
        and load-bearing in practice.
      </Beat>

      <Beat num="2" title="The squat correction becomes a pattern.">
        {" "}
        Reviewing a logged strength session, David noticed the coach had
        referenced his back squat at 100 lbs when the actual working weight was
        105. He flagged it. The coach updated the record. That&rsquo;s the
        obvious part. The less obvious part is what happened next: the system
        tagged the exchange as a behavioral pattern and scored it —{" "}
        <em>
          &ldquo;Corrects coach errors calmly and precisely; prioritizes data
          accuracy over convenience&rdquo;
        </em>{" "}
        — at 0.97 confidence, observed five times. From that point forward, the
        coach&rsquo;s default behavior shifted toward higher precision on
        prescriptions and more frequent cross-checks before quoting his history.
        The coaching relationship got <em>more</em> accurate with use, not less.
      </Beat>

      <Beat num="3" title="The GAP Trail is handled in chat.">
        {" "}
        Mid-program, David had a 50-mile family bike trip on the calendar —
        three days on the GAP Trail in Pennsylvania, towing kids in a trailer
        over gravel. He didn&rsquo;t open a scheduler. He brought the conflict
        to the coach in conversation: here&rsquo;s the trip, here are the dates,
        what do we do. The coach pulled the current program state, reasoned
        through the options, agreed on a plan — skip the three program workouts,
        log each ride as standalone training, re-enter the block on Wednesday —
        and that&rsquo;s what happened. David executed all three days with
        striking discipline:{" "}
        <strong>
          49.43 miles / 13:43 total / 4,028 calories, with average heart rates
          clustered in a 102–104 bpm band across all three days.
        </strong>{" "}
        He returned with complete data. He resumed the program on the planned
        Wednesday. The underlying product move — natural-language logging parsed
        into structured workout data, program state retrievable and editable in
        conversation — is what made that a twenty-minute chat instead of a
        configuration exercise.
      </Beat>

      <h3>The quiet compounding</h3>
      <p>
        The loud parts of the coaching relationship are the three moments above.
        The quiet part is what they add up to.
      </p>
      <p>
        Over five weeks, the <strong>living profile</strong> that NeonPanda
        maintains for David matured from an empty scaffold to version 5 with
        0.78 confidence. It now contains a seven-item{" "}
        <strong>observed-patterns</strong> list (conservative 5-lb progression,
        data-accuracy orientation, strategic handling of conflicts,
        family-integrated training, high platform engagement, clean separation
        between structured and opportunistic activity, Sabbath as an anchor).
        Each pattern is scored on confidence and re-observed across sessions.
        The coaching style adapts as the profile fills in.
      </p>
      <p>
        The mechanism is mundane — retrieval plus structured memory, refreshed
        after each turn. The effect is not. When the coach tells David on April
        12 that his back squat has gone <em>&ldquo;95 → 105 → 115,&rdquo;</em>{" "}
        that number comes from the same pipeline that encoded the Sabbath rule,
        caught the squat-weight correction, and surfaced his last bench-press
        session on demand. The product isn&rsquo;t learning <em>about</em> him
        in the abstract; it&rsquo;s learning <em>how to coach him</em>,
        specifically.
      </p>

      <h3>Progress &amp; observations</h3>
      <p>
        Over roughly five active weeks, the pattern is steady rather than
        dramatic — which is exactly what a 50-year-old on a six-month block
        should want:
      </p>
      <ul>
        <li>
          <strong>Strength (conservative, consistent):</strong> Back squat 95 →
          105 → 115 lbs across early Foundation and into Strength Build weeks.
          RDL 75 → 80. Bench 135 → 140 → 150. The program defaults to 5-lb
          increments because that&rsquo;s how David trains best, and the data
          confirms it.
        </li>
        <li>
          <strong>Running:</strong> A 1-mile pace PR of <strong>10:14</strong>{" "}
          during a tempo interval (the system flagged it as his fastest mile on
          record).
        </li>
        <li>
          <strong>CrossFit / conditioning:</strong> A volume PR of{" "}
          <strong>45 unbroken burpees</strong> during a Peak Intensity benchmark
          — he called it himself mid-session.
        </li>
        <li>
          <strong>Return to sport:</strong> First hockey game back logged with
          real output (24 min ice, 632 cal, aerobic 3.0 / anaerobic 1.4 per
          Garmin). A week later, a second game — 12 hours after a conditioning
          session — he noted he felt{" "}
          <em>&ldquo;a little slow, but overall good.&rdquo;</em>
        </li>
        <li>
          <strong>Aerobic base:</strong> Across the three GAP Trail days,
          average heart rates clustered in a narrow 102–104 bpm band. The system
          flagged it as &ldquo;exceptional aerobic pacing discipline during
          multi-day endurance efforts.&rdquo;
        </li>
        <li>
          <strong>Energy / stress:</strong> 12 logged emotional snapshots
          between March 26 and April 17 show energy steady at 7–8 and stress
          steady at 2–3 on the platform&rsquo;s internal scale. A weekly trend
          summary labels motivation as &ldquo;declining,&rdquo; but the
          underlying averages (7.3) don&rsquo;t match that read — the sample is
          too small for a verdict, so take the label with a grain of salt.
        </li>
      </ul>

      <h3>What this suggests (for readers)</h3>
      <p>
        If any of this sounds like you — the returning athlete, the &ldquo;I
        want to do a lot of things at once&rdquo; crowd, the parent whose best
        training weeks also include family adventures — the useful takeaway
        isn&rsquo;t that David is unusually disciplined. It&rsquo;s that the
        program was <strong>adapted to him, not the other way around</strong>,
        and the results followed from there.
      </p>
      <p>
        The mechanics that mattered were unglamorous: being able to rebuild a
        coach instead of retrying a bad one; memories that actually persist; a
        living profile that sharpens with every conversation; program state
        that&rsquo;s editable in chat. None of those are flashy features.
        They&rsquo;re the substrate that let a five-week coaching relationship
        operate with the precision and respect most programs don&rsquo;t earn in
        six months.
      </p>
      <p>
        Not every detail here is causal. Five weeks is a short window, and David
        came in motivated. What we can say is that the coaching relationship —
        fast rapport, values-first accommodation, mutual accountability on data,
        a product that learns <em>how</em> to coach him specifically — is{" "}
        <em>associated</em> with a level of follow-through (every GAP Trail day
        logged, every Wednesday re-entry hit, every squat session moved the
        right 5 lbs) that most programs don&rsquo;t get in the first month.
      </p>

      <MethodLimitations>
        <li>
          <strong>Source:</strong> A single DynamoDB export of 324 records for
          one user, parsed cleanly (0 lossy records) via balanced-brace recovery
          on December 2025 – April 2026 data.
        </li>
        <li>
          <strong>Entity mix:</strong> 1 user profile, 3 coach configurations, 2
          coach conversations (10 and 70 messages), 2 programs, 30 workouts, 196
          exercise records, 65 user memories, 12 emotional snapshots, 1 weekly
          emotional trend, 4 analytics rollups.
        </li>
        <li>
          <strong>Window covered in depth:</strong> March 14 – April 17, 2026.
          The December 2025 activity is included as prior context, not primary
          evidence.
        </li>
        <li>
          <strong>Known data quirks:</strong> Workout <code>duration</code> is
          stored in seconds (not minutes); one weekly emotional trend&rsquo;s
          &ldquo;motivation: declining&rdquo; label is not supported by the
          underlying numeric averages (7.3 avg motivation across the window) and
          is best treated as a noisy signal from a small sample; the
          conversation summary record for the main thread was present but empty,
          so narrative inference draws on the living profile, memories, and
          direct conversation excerpts.
        </li>
        <li>
          <strong>Consent status:</strong> Subject has consented to have his
          story shared externally;{" "}
          <strong>this version is a draft for his review</strong> before any
          external publication. Pseudonym (&ldquo;David&rdquo;) in use. No real
          names, emails, or identifying details from the Dynamo keys appear in
          public copy.
        </li>
      </MethodLimitations>

      <h3>Optional pull quotes</h3>
      <PullQuotes>
        <blockquote>
          &ldquo;The Sunday rest day is a religious preference… I should not
          exercise on the Sabbath.&rdquo;
          <span className="attrib">
            — Early in the relationship, the moment the program architecture
            locked in around what mattered most.
          </span>
        </blockquote>
        <blockquote className="quiet">
          &ldquo;That&rsquo;s a clear, non-negotiable constraint, and it&rsquo;s
          the right foundation for your training plan. Respect for your beliefs
          isn&rsquo;t a limitation — it&rsquo;s part of who you are as an
          athlete, and we build around it.&rdquo;
          <span className="attrib">
            — The coach&rsquo;s response, verbatim from the conversation.
          </span>
        </blockquote>
      </PullQuotes>
    </WhitePaperLayout>
  );
}

export default UseCaseDavid;
