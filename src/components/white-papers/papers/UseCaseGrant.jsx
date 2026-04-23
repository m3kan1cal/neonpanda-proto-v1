import React from "react";
import WhitePaperLayout from "../WhitePaperLayout";
import {
  ShareCard,
  Callout,
  AtAGlance,
  MethodLimitations,
  SubjectPortrait,
  Beat,
} from "../primitives";
import { getWhitePaperBySlug } from "../../../data/whitePapers";

function UseCaseGrant() {
  const paper = getWhitePaperBySlug("use-case-grant-first-meet-prep");

  return (
    <WhitePaperLayout
      paper={paper}
      docMeta="Published April 2026 · NeonPanda, LLC · Subject reviewed and approved for publication"
      headline="How a detail-obsessed powerlifter rebuilt his first-meet prep in a single conversation — and turned a medical procedure into better programming"
      deck="When the 5-workout-a-week program didn't fit a 4-day-a-week athlete, the fix took thirty-three minutes. The harder work came next: diagnosing a left-side weakness and resolving it nine days later."
    >
      <blockquote className="quiet">
        &ldquo;Something clicked and it&rsquo;s finally feeling natural to
        me.&rdquo;
        <span className="attrib">
          — Grant, April 8, 2026. Sumo deadlift at 135 lbs, two days after a
          brief outpatient procedure.
        </span>
      </blockquote>

      <SubjectPortrait
        src="/images/white-papers/grant-avatar.png"
        alt="Portrait of Grant, generated as aspirational meet-day energy"
        caption={
          <>
            Grant used AI to render &ldquo;future meet-day&rdquo; energy. Think
            aspirational meet poster, not a gym-mirror selfie&mdash;your logged
            sessions remain the ground truth.
          </>
        }
      />

      <ShareCard>
        <p className="intro">
          <strong>Grant</strong> is the kind of athlete who logs every session
          down to the second — heart rate, calories, enjoyment rating,
          exercise-level reps. He signed up for NeonPanda in late January to add
          a structured sumo-deadlift meet prep on top of an already full
          training life. In March, a scheduling mismatch forced a pivot. By
          April, the program had diagnosed a measurable left-side adductor
          asymmetry, resolved it with nine days of targeted work, and helped him
          complete his first fully embodied sumo deadlift session two days after
          a brief outpatient procedure.
        </p>
        <ul>
          <li>
            <strong>Who:</strong> An intermediate-to-advanced powerlifter
            prepping for his first powerlifting competition, training four
            planned days a week across an in-person trainer, group conditioning
            classes, and NeonPanda
          </li>
          <li>
            <strong>Where he started:</strong> January 24, 2026 — 22-Week
            Mobility &amp; Deadlift Meet Prep, an ambitious plan that prescribed
            more days than his week actually had
          </li>
          <li>
            <strong>What he wanted:</strong> A supplementary sumo-focused
            program that fit <em>around</em> his primary training, not on top of
            it
          </li>
          <li>
            <strong>What shifted in ~12 weeks:</strong>
            <ul>
              <li>
                Rebuilt the entire meet prep in one conversation — 33 minutes
                from &ldquo;real talk&rdquo; to a new active program
              </li>
              <li>
                Copenhagen planks surfaced a left adductor asymmetry on April 5;
                it was resolved through targeted programming by April 14
              </li>
              <li>
                Sumo deadlift pattern &ldquo;clicked&rdquo; on April 8 at 135
                lbs, two days after that outpatient procedure
              </li>
              <li>
                Living profile matured to version 14 at 0.97 confidence — the
                coach now knows <em>how</em> to coach him, specifically
              </li>
            </ul>
          </li>
          <li>
            <strong>Why it matters:</strong> The program was reshaped around his
            real week, his real body, and his real life — without him having to
            restart.
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
            <strong>Who:</strong> Grant, intermediate-to-advanced powerlifter,
            first-meet prep, data-driven to the second
          </li>
          <li>
            <strong>Starting point:</strong> Signed up January 23, 2026;
            configured coach &ldquo;Marcus&rdquo; (technical/collaborative);
            first program built January 24 prescribed five workouts per week for
            a four-day-a-week athlete
          </li>
          <li>
            <strong>Primary goals:</strong> Complete a 22-week sumo-deadlift
            meet prep on top of an existing three-stream training system without
            burning out
          </li>
          <li>
            <strong>Timeframe:</strong> January 24 – April 16, 2026 (≈12 weeks
            active, 88 workouts logged across 52 training days, 70 coach
            conversations)
          </li>
          <li>
            <strong>What changed:</strong> A second program designed for the
            week he actually trains; a structured coaching relationship that
            diagnoses before prescribing; an adductor asymmetry caught, tracked,
            and resolved; a sumo pattern that went from &ldquo;I still
            don&rsquo;t love it&rdquo; to &ldquo;it clicked and feels
            natural&rdquo;
          </li>
        </ul>
      </AtAGlance>

      <h3>The situation</h3>
      <p>
        Grant doesn&rsquo;t train in one place, with one coach, toward one
        thing. He operates a deliberately layered three-stream system: a
        personal trainer on Monday and Wednesday, a semi-private group fitness
        class on Thursday, and a circuit-plus-mobility double on Saturday.
        That&rsquo;s the spine of his week, and it&rsquo;s non-negotiable.
        NeonPanda was supposed to slot in <em>around</em> it — a dedicated meet
        prep that respected the fact that his primary programming was already
        well-handled.
      </p>
      <p>
        He&rsquo;s also fat-adapted keto (working with a nutrition coach at
        Virta Health), works from home with a well-equipped office-gym, runs
        Hinge Health exercise therapy as structured active recovery, and logs
        sessions with unusual precision — HR averages, zone distributions,
        calories, session-level enjoyment ratings, exercise names, reps,
        duration to the second. Body awareness is high. Expectations are
        specific. Inaccuracy in a coach&rsquo;s response gets corrected on the
        spot, calmly and without defensiveness.
      </p>

      <h3>The program that didn&rsquo;t fit vs. the program that did</h3>
      <p>
        The first program, created the day after signup, wasn&rsquo;t wrong — it
        was miscalibrated.
      </p>
      <p>
        The <em>22-Week Mobility &amp; Deadlift Meet Preparation</em> was
        structurally sound on paper: a phased build toward a first competition
        with a proper deload cadence. But it prescribed five workouts a week for
        an athlete whose week only had four gym days available and whose primary
        trainer was already handling deadlift work and accessories on two of
        them. For seven weeks Grant worked around the mismatch, skipping some
        sessions, logging others. Then, on March 17, he surfaced the problem
        directly:
      </p>

      <blockquote>
        &ldquo;Real talk: you have prescribed 5 workouts for me this week and
        next week. I go to the gym 4 days a week (as you know). I cannot succeed
        with this program with this volume and also succeed with my real life
        personal trainer.&rdquo;
      </blockquote>

      <p>
        He laid out the full structure in two follow-up sentences — Monday and
        Wednesday PT, Thursday semi-private, Saturday circuit plus mobility —
        and asked Marcus to scale the program back and treat any extra work as
        supplemental, not required. His trainer, he noted, was also running
        deadlift work; the semi-private was already doing deadlift accessories.
      </p>
      <p>
        Thirty-three minutes later — same conversation, no tickets filed, no
        settings page opened — a new active program existed:{" "}
        <strong>22-Week Sumo Deadlift Meet Prep</strong>, built through an
        in-conversation program designer session and explicitly scoped as two
        supplementary sessions per week that slot around the immutable baseline.
        The old program was paused. The new one was designed to <em>respect</em>{" "}
        what was already working rather than compete with it.
      </p>
      <p>
        That thirty-three-minute window is the product. Most platforms would
        have surfaced this as a &ldquo;submit a request, we&rsquo;ll rebuild
        your plan.&rdquo; For Grant, it was a coaching conversation that ended
        with a new block periodization on his screen.
      </p>

      <Callout kicker="What Grant's coaching taught the product">
        <p className="intro">
          Grant treats inaccuracy like a failed rep: notice it, correct it,
          expect better on the next set. Across{" "}
          <strong>seventy conversations</strong>, that standard surfaced a long
          tail of places where the model would{" "}
          <strong>misstate a coach&rsquo;s prescription</strong>, blur live
          program context, or answer as if this thread were the only one that
          mattered. His calm, specific corrections are a major reason those
          failure modes got closed — and why{" "}
          <strong>AI-generated coach guidance</strong> now stays aligned with
          the program and history an athlete can actually verify in their log.
        </p>
        <p className="intro">
          The same precision shaped{" "}
          <strong>how coach and athlete talk to each other</strong>: rationale
          before prescription, diagnostic questions before new load, pacing that
          respects someone who self-regulates intelligently. What&rsquo;s{" "}
          <strong>smooth today in coach–athlete conversation</strong> —
          including continuity that doesn&rsquo;t reset when the week gets
          complicated — is tied to the standard Grant held in chat.
        </p>
        <p className="intro">
          Under the hood, that also forced{" "}
          <strong>cross-conversation intelligence</strong> to mature: memories
          and profile updates that carry across threads so the coach
          doesn&rsquo;t contradict what it already committed to. In short: the
          polish on continuity is in no small part{" "}
          <strong>thanks to Grant</strong> training the product the way he
          trains sumo — detail-obsessed, patient, unwilling to pretend a miss is
          good enough.
        </p>
      </Callout>

      <h3>How the coaching actually works, by example</h3>
      <p>
        Three moments from the 12-week window show the coaching relationship
        earning its keep — and the product mechanism under each.
      </p>

      <Beat num="1" title="The program re-scope.">
        {" "}
        The March 17 exchange above wasn&rsquo;t just a rescue; it was a
        demonstration of what &ldquo;in-conversation program editing&rdquo;
        looks like when it works. Marcus had the live program state pulled up
        inside the chat, reasoned through Grant&rsquo;s full week with him (PT +
        semi-private + Saturday circuit as protected), and then invoked the
        program designer with the new brief: supplementary-only, two sessions
        per week, sumo-focused, same 22-week meet-prep timeline. The product
        capability — program state retrievable and editable in conversation,
        plus a program designer that can generate a full phased block plan
        in-chat — turned a structural conflict into a thirty-three-minute fix.
        No churn, no re-onboarding, no lost training history.
      </Beat>

      <Beat
        num="2"
        title="The adductor becomes a diagnostic, then a resolution."
      >
        {" "}
        On April 5, Grant ran Copenhagen planks and they &ldquo;brutally
        exposed&rdquo; a significant left-side adductor weakness that neither he
        nor Marcus had been tracking. The product move here is less about the
        diagnosis itself and more about what happened next. Marcus didn&rsquo;t
        prescribe immediately. He paused, asked clarifying questions — fatigue
        or stability breakdown? — and encoded the finding as a{" "}
        <strong>behavioral user memory</strong> with a specific rule:{" "}
        <em>
          prioritize unilateral and anti-rotation movements, frame them as
          &ldquo;asymmetry diagnostics&rdquo; rather than accessories, track
          left vs. right
        </em>
        . Every downstream session read that memory first. Copenhagen planks,
        single-leg RDLs, and split squats were layered into the supplementary
        blocks with asymmetry tracking built in. On April 14, a new episodic
        memory recorded the outcome:{" "}
        <em>
          &ldquo;A measurable left adductor weakness asymmetry was successfully
          resolved through targeted Copenhagen plank programming.&rdquo;
        </em>{" "}
        Nine days, problem named, problem gone.
      </Beat>

      <Beat
        num="3"
        title="Sumo clicks — on a week most coaches would have written off."
      >
        {" "}
        A week earlier, on April 3, Grant had told Marcus that sumo was
        partially &ldquo;clicking&rdquo; but that he &ldquo;still didn&rsquo;t
        love it&rdquo; — a candid admission that the mechanics were landing
        intellectually while the identity (&ldquo;this isn&rsquo;t a{" "}
        <em>real</em> deadlift&rdquo;) hadn&rsquo;t caught up. On April 6, he
        underwent a planned outpatient procedure. Marcus reframed the recovery
        window, in advance, as a deliberate periodization asset rather than a
        lost week; Grant proactively rescheduled his PT and stayed careful about
        nutrition and hydration during the clinician-directed prep window. On
        April 8, two days afterward, he reported that sumo had finally{" "}
        <em>clicked</em> — that it felt automatic and embodied, at 135 lbs.
        Marcus&rsquo;s response respected an already-documented pattern in the
        profile:{" "}
        <em>
          &ldquo;intellectual acceptance precedes emotional ownership by a
          meaningful lag; emotional ownership eventually arrives through
          accumulated positive reps at conservative loads.&rdquo;
        </em>{" "}
        No hype, no premature load push. The product move — a living profile
        that had already encoded <em>how</em> this athlete adopts technical
        change — let the coach meet the breakthrough with the right tempo.
      </Beat>

      <h3>The quiet compounding</h3>
      <p>
        Over 12 weeks, Grant&rsquo;s living profile matured to{" "}
        <strong>version 14 at 0.97 confidence</strong>. It now holds an explicit
        communication preference sheet (lead with rationale, diagnostic
        questioning before prescription, don&rsquo;t re-open scheduling
        discussions unless he initiates), a training identity paragraph that
        names him as an intermediate-to-advanced powerlifter with a
        &ldquo;three-stream training system,&rdquo; a goals list that runs 15
        items deep (from tempo sumo work to landmine press progression to a note
        about following up with support on a logging issue), and a life-context
        block that tracks his Virta Health nutrition coaching, his Hinge Health
        level (14), his home-gym setup, and the standing he&rsquo;s earned in
        his gym community.
      </p>
      <p>
        The mechanism is mundane — structured memory plus a living profile
        refreshed after each turn. The effect is that the coach&rsquo;s defaults
        now <em>match</em> how Grant actually wants to be coached: as a
        reasoning partner, not a top-down instructor. When Marcus suggested he
        push through inertia rope work post-arm-fatigue but validated him
        capping TRX decline rows at 3–4 reps to preserve form, that wasn&rsquo;t
        coincidence — both moves came from a profile that has observed, in
        writing, that this athlete self-regulates intelligently and
        shouldn&rsquo;t be second-guessed on it.
      </p>

      <h3>Progress &amp; observations</h3>
      <p>
        Twelve weeks is early for first-meet prep, and the pattern here is what
        a sophisticated intermediate would want: steady technical consolidation
        rather than load chasing.
      </p>
      <ul>
        <li>
          <strong>Sumo deadlift:</strong> Working load topped at 205 lbs in late
          February, dropped deliberately into the 30–60 lb range for tempo work
          (5-second eccentrics) in late March / early April, and rebuilt through
          a 135/155/175/195 build-up for 4 × 5 reps by April 16. The April 8
          session at 135 lbs is logged as the &ldquo;click&rdquo; — the
          nervous-system integration, not the peak load.
        </li>
        <li>
          <strong>Bench press:</strong> 100 lbs × 3 on April 1 inside a density
          circuit — moving cleanly, not chasing a true 1RM.
        </li>
        <li>
          <strong>Accessories:</strong> Face pulls 23 → 29 lbs between late
          March and early April; half-kneeling landmine press logged at 55 lbs ×
          5/side with Grant volunteering{" "}
          <em>&ldquo;I like the half kneeling landmine press&rdquo;</em>{" "}
          unprompted (a rare, significant expression of movement affinity, per
          his own observed-patterns record); Copenhagen plank progression
          targeted at the adductor asymmetry, resolved nine days after it was
          identified.
        </li>
        <li>
          <strong>Emotional series:</strong> Across 35 emotional snapshots,
          averages sit at energy 7.4, motivation 7.8, confidence 7.7, and coach
          satisfaction 8.5 on the platform&rsquo;s 1–10 scale, with
          &ldquo;determined&rdquo; as the dominant emotion in 31 of 35
          snapshots. A weekly trend rollup flags motivation as
          &ldquo;declining&rdquo; on one window — but the numeric averages
          don&rsquo;t support that read (the sample is small and the absolute
          numbers are high), so treat the label with skepticism.
        </li>
        <li>
          <strong>Training discipline:</strong> 88 workouts logged across 52
          training days, including a full structured session run fasted on
          medical prep day (April 5) and a return to full training load within
          two days of the procedure.
        </li>
      </ul>

      <h3>What this suggests (for readers)</h3>
      <p>
        If you train seriously, run multiple programs from multiple sources, and
        don&rsquo;t want an app that pretends yours is the only one — the useful
        takeaway isn&rsquo;t that Grant is unusually disciplined (he is).
        It&rsquo;s that the coaching relationship could be configured to{" "}
        <strong>respect</strong> his existing training system rather than
        compete with it, and then sharpen against him over 70 conversations.
      </p>
      <p>
        The mechanics that mattered were undramatic: a program designer that
        runs in chat, structured user memories that actually steer downstream
        prescriptions, a living profile that records how an athlete prefers to
        be coached and acts on it without being reminded. None of those are
        flashy features. They&rsquo;re what let a small scheduling mismatch get
        fixed in 33 minutes, a measurable asymmetry get caught and closed in
        nine days, and a first-meet sumo pattern land at the right emotional
        tempo — on a week the athlete was recovering from a medical procedure.
      </p>
      <p>
        Twelve weeks is a short runway to a first powerlifting meet. What we can
        say is that the coaching relationship is <em>associated</em> with a
        level of follow-through (88 workouts across 52 days, zero re-onboarding
        events, an asymmetry tracked from diagnosis through resolution) that
        fitness apps rarely earn in their first quarter with a user.
      </p>

      <MethodLimitations>
        <li>
          <strong>Source:</strong> A single DynamoDB export of 1,415 records for
          one user, parsed cleanly (0 lossy records) via balanced-brace recovery
          on January 23 – April 18, 2026 data.
        </li>
        <li>
          <strong>Entity mix:</strong> 1 user profile (with v14 living profile),
          1 coach configuration, 70 coach conversations (846 total messages), 2
          programs (first paused, second active), 88 workouts, 983 exercise
          records, 178 user memories, 38 conversation summaries, 35 emotional
          snapshots, 3 weekly emotional trend rollups, 9 analytics rollups, 5
          program designer sessions, 1 shared program.
        </li>
        <li>
          <strong>Window covered in depth:</strong> January 24 – April 16, 2026,
          with a specific emphasis on the March 17 program pivot and the April
          5–14 adductor diagnostic-to-resolution arc.
        </li>
        <li>
          <strong>Known data quirks:</strong> Workout <code>duration</code> is
          stored in seconds, not minutes; exercise records&rsquo; working-weight
          data lives under a <code>metrics</code> subtree (the top-level{" "}
          <code>sets</code>/<code>reps</code>/<code>weight</code> fields are
          often empty) — strength progressions above are read through that
          subtree, not from the record shells; one weekly emotional trend labels
          motivation as &ldquo;declining&rdquo; on a small sample despite high
          underlying averages — the label is treated as a noisy signal, not a
          verdict; coach creation date (March 5) post-dates the first program
          and first conversations, likely reflecting a migration or re-creation
          rather than a relationship that started in March.
        </li>
        <li>
          <strong>Publication &amp; consent:</strong> Grant has consented to
          this use-case narrative under his real name. The document is published
          for external distribution; training loads and dates above reflect
          logged data only and exclude account identifiers or Dynamo keys.
        </li>
      </MethodLimitations>
    </WhitePaperLayout>
  );
}

export default UseCaseGrant;
