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

function UseCasePaige() {
  const paper = getWhitePaperBySlug(
    "use-case-paige-respiratory-therapist-iterates",
  );

  return (
    <WhitePaperLayout
      paper={paper}
      headline="How a hospital respiratory therapist on rotating 12-hour nights built six programs before finding one she could actually do"
      deck="What most fitness apps would log as churn, NeonPanda held as a nine-week design conversation — and Week 12 closed at 100% adherence with three PRs."
    >
      <ShareCard>
        <p className="intro">
          <strong>Paige</strong> is an intermediate athlete with a brutal work
          calendar — twelve-hour night shifts at a hospital, five in a row every
          other weekend, a left-foot heel spur, weak knees, and an honest
          preference for music-driven group fitness over silent weight sessions.
          She signed up in January with a half marathon two weeks out and a
          Spartan Beast on the horizon. Nine weeks later, after six programs,
          two coaches, and one candid &ldquo;the last program we made didn't
          fit&rdquo; conversation, she found the version that worked — and in
          the first full training week under it, she hit every planned session
          and set three PRs.
        </p>
        <ul>
          <li>
            <strong>Who:</strong> Intermediate-level respiratory therapist,
            rotating 12-hour hospital night shifts, heel spur + weak knees,
            long-term goal is the Spartan Trifecta (5K Super, 10K, 21K Beast)
          </li>
          <li>
            <strong>Signed up:</strong> January 16, 2026
          </li>
          <li>
            <strong>The design journey:</strong>
            <ul>
              <li>
                <strong>Six programs</strong> created between Jan 16 and Mar 16
                — five archived, one active
              </li>
              <li>
                <strong>Two coaches</strong> built (Alex_Flow_Builder →
                Alex_Obstacle_Architect, a Spartan-specific rebuild)
              </li>
              <li>
                <strong>Eight program designer sessions</strong>, one 16-message
                &ldquo;real talk&rdquo; conversation that re-fit a 5-day program
                into her 3-day reality
              </li>
            </ul>
          </li>
          <li>
            <strong>Week 12 (March 16–22):</strong> 4 of 4 planned sessions
            completed, <strong>100% program compliance</strong>, zero failed
            reps across 47 working sets, weekly tonnage up 2.6× over the Week 9
            baseline, three PRs (dead hang, aerobic run distance, farmer carry
            load)
          </li>
          <li>
            <strong>Why it matters:</strong> The iteration wasn't noise. It was
            the product doing exactly what it needed to do for an athlete whose
            real life doesn't fit a 5-day template.
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
            <strong>Who:</strong> Paige, intermediate athlete, hospital
            respiratory therapist on rotating 12-hour night shifts (5
            consecutive nights every other weekend), heel spur on left foot,
            weak knees from years of hard floor standing
          </li>
          <li>
            <strong>Starting point:</strong> Signed up January 16, 2026;
            completed the coach creator same day; first program (12-Week Hybrid
            Strength &amp; Race Prep) built that afternoon
          </li>
          <li>
            <strong>Primary goals:</strong> Weight loss and general health; half
            marathon (~2 weeks out at signup); long-term Spartan Trifecta (5K
            Super Sept 12, 10K Sept 26, 21K Beast Nov 21)
          </li>
          <li>
            <strong>Timeframe covered:</strong> January 16 – March 22, 2026 (~9
            weeks)
          </li>
          <li>
            <strong>What changed:</strong> A plan-first user who started with
            ambition and constraints that didn't line up, iterated six programs
            across two coaches, and finally landed on a 20-week Spartan Trifecta
            Prep that matched her real race calendar, real equipment, and real
            schedule. Week 12 was the first week she could execute the plan
            she'd actually been designing toward.
          </li>
        </ul>
      </AtAGlance>

      <h3>The situation</h3>
      <p>
        Paige signed up the way many constraint-heavy athletes do: with more
        ambition than her life could accommodate. In the coach creator session,
        she laid it out plainly. Her half marathon was two weeks away. The
        Spartan races were all over her calendar — and she'd be going for the
        Trifecta (Super, 10K, Beast) later in the year. Her running coach app,
        Runna, wasn't working for her — the algorithm's &ldquo;normal&rdquo;
        pace landed her somewhere between a fast walk and a jog, a zone she
        couldn't sustain comfortably. She worked 12-hour hospital night shifts
        on a rotating schedule, with five nights in a row every other weekend,
        which made fixed training days structurally impossible. A heel spur
        lived on her left foot; her knees had been worked hard by hospital
        floors. She liked Bodypump. She loved Zumba. Weights-alone, she got
        bored.
      </p>
      <p>
        That is the actual athlete. The question isn't whether a plan can be
        generated for her. The question is whether a platform can design{" "}
        <em>toward</em> her — iteratively — without making her feel like she's
        failing every time the plan doesn't fit yet.
      </p>

      <h3>
        Six programs, two coaches, one conversation that unlocked the rest
      </h3>
      <p>
        Between January 16 and March 16, Paige created six programs. They're not
        duplicates; each one represented a new attempt to reconcile the ambition
        and the constraints:
      </p>
      <ol>
        <li>
          <strong>Jan 16 — 12-Week Hybrid Strength &amp; Race Prep.</strong>{" "}
          Built the day she signed up. Archived.
        </li>
        <li>
          <strong>Jan 22 — 2-Week Half Marathon Race Prep.</strong> Built the
          week of her race. Archived.
        </li>
        <li>
          <strong>
            Feb 27 — 12-Week Spartan Race Prep: Foundation to Finish Line.
          </strong>{" "}
          A fresh restart after her half marathon, focused solely on Spartan.
          Five days per week. Archived.
        </li>
        <li>
          <strong>
            Feb 27 — 6-Month Spartan Race Prep: Hybrid Functional Strength.
          </strong>{" "}
          A longer horizon variant built the same day. Archived.
        </li>
        <li>
          <strong>Feb 27 — 6-Month Spartan Trifecta Training Program.</strong> A
          Trifecta-specific variant built the same day. Archived.
        </li>
        <li>
          <strong>Mar 16 — Spartan Trifecta 20-Week Prep.</strong>{" "}
          Block-periodized across four phases (Foundation &amp; Pull-Up Launch →
          Strength &amp; 10K Capacity Build → Race-Ready Peak → Beast Mode
          Endurance Build), mapped precisely to the Sept 12, Sept 26, and Nov 21
          race dates. <strong>Active.</strong>
        </li>
      </ol>
      <p>
        Most platforms would read six programs in sixty days as a disengaged
        user. NeonPanda's data reads it as designed iteration: five archived
        programs, one that stuck, and the full context of every earlier attempt
        preserved for the coach to reference.
      </p>

      <p>
        The turning-point exchange came on February 27. Paige opened a
        conversation with six words of candor that most athletes won't write:{" "}
        <em>
          &ldquo;The last program we made, I think there was a miscommunication
          on how many days I can work out in a week.&rdquo;
        </em>{" "}
        The coach's reply pulled the program state into the chat, named the
        mismatch (5 days prescribed; her coach creator answers said 3–4), and
        asked her directly what she could actually sustain. Over the next eight
        messages she clarified in successive passes: 3 days — no wait, 3 plus a
        running day — no wait, 3 total with running as one of the three. The
        days would vary week-to-week because her rotating night shifts made it
        impossible to lock in a Monday-Wednesday-Friday pattern. The coach
        adjusted on each turn, holding the phases and the exercise selection
        constant while condensing the weekly structure. Thirty-three minutes
        later, they'd landed on the fit.
      </p>

      <p>
        One moment in that exchange matters beyond the scheduling fix: when
        Paige asked how to actually restructure the program inside the Program
        Designer, the coach was honest about the limits of its view —{" "}
        <em>
          &ldquo;I'm not 100% certain of the exact interface layout on your
          end&rdquo;
        </em>{" "}
        — and walked her through what to look for anyway, with a fallback plan
        if the UI didn't cooperate. That's not a polished coaching moment; it's
        a product-maturity moment. The coach can't always see everything the
        athlete sees, and when it can't, it says so.
      </p>

      <Callout kicker="What Paige's iteration taught the product">
        <p className="intro">
          Paige's five archived programs weren't user churn — they were{" "}
          <strong>the compliance signal we needed</strong>. Every one of them
          was generated from the criteria she'd given us (shift-worker schedule,
          heel spur, weak knees, low-impact preferences), and every one of them
          still asked her to train more days than her real life could sustain.
        </p>
        <p className="intro">
          That gap — between a program the system believes honors the user's
          criteria and a program the user can actually execute — is the exact
          seam where adherence quietly dies in most fitness apps. Paige's
          iteration exposed it in the open, and the February 27 re-fit
          conversation became the template for how the Program Designer now
          reconciles <em>stated</em> availability with <em>sustainable</em>{" "}
          availability before a plan ever locks in.
        </p>
        <p className="intro">
          In short: her &ldquo;failed&rdquo; programs are the reason the next
          athlete with a rotating schedule will land a program that fits on the
          first try, not the sixth.
        </p>
      </Callout>

      <h3>How the coaching actually works, by example</h3>
      <p>
        Three mechanisms from the nine-week window show what the product was
        doing underneath the iteration — and why the iteration wasn't waste.
      </p>

      <Beat
        num="1"
        title="The safety profile as connective tissue across every program."
      >
        {" "}
        During the Jan 16 coach creator session, Paige disclosed her heel spur,
        her weak knees, her rotating 12-hour night shifts, and her low-impact
        preferences. Those responses got encoded as a structured{" "}
        <strong>safety profile</strong> on her account — a dedicated block with{" "}
        <code>contraindications</code> (high-impact activities, jumping,
        running-heavy lower body loads, prolonged standing on hard surfaces),{" "}
        <code>injuries</code> (heel spur, weak knees),{" "}
        <code>recoveryNeeds</code>, and <code>modifications</code> (low-impact
        cardio alternatives, supportive footwear, knee braces, avoid barefoot
        work). Every one of the six programs that followed respected it. When
        she returned to training on February 27 after a three-week break, the
        Week 9 analytics rollup noted it directly:{" "}
        <em>
          &ldquo;Injury constraints respected: No heel spur or knee discomfort
          reported in either session.&rdquo;
        </em>{" "}
        The constraints weren't a post-it note on the coach's desk. They were
        the load-bearing scaffold of every plan the system generated for her.
      </Beat>

      <Beat
        num="2"
        title="Iteration preserved as context, not erased as churn."
      >
        {" "}
        The five archived programs aren't deleted. They're still on the account,
        each with a description field that tells you what was attempted and why.
        When Paige rebuilt her coach on March 4 as{" "}
        <strong>Alex_Obstacle_Architect</strong> — methodology switched from
        functional bodybuilding to Invictus Fitness, equipment constrained to
        dumbbells / weighted medicine ball / kettlebell, exclusions updated to
        drop jump-and-pull obstacles and rope climbs — the new coach inherited
        the full program history. The March 16 Spartan Trifecta 20-Week Prep
        didn't come out of nowhere; it came out of five prior attempts' worth of
        &ldquo;this didn't quite fit.&rdquo; That's the product capability
        that's load-bearing here: archive without loss, rebuild without restart.
      </Beat>

      <Beat num="3" title="The candid in-chat re-fit.">
        {" "}
        The February 27 16-message conversation did in one sitting what would
        take most platforms a support ticket and a week. The coach pulled live
        program state into the chat, surfaced the 5-day-vs.-3-day mismatch
        herself, asked clarifying questions instead of prescribing immediately (
        <em>
          &ldquo;When you say 'flexibility during the week,' do you mean some
          weeks you can do 4-5, but others you need to drop to 2-3?&rdquo;
        </em>
        ), and kept the conversation moving through four successive
        clarifications until the fit locked in. When the restructure step ran
        into a UI gap, the coach was honest about it rather than pretending the
        button existed. The athlete's takeaway: her preferences were being
        negotiated with, not around.
      </Beat>

      <h3>The quiet compounding</h3>
      <p>
        By the end of the nine-week window, Paige's account held: six programs
        (five archived, one active with four phases block-periodized to her real
        race dates), two coach configurations (one a warm-up, the second
        Spartan-tuned), a structured safety profile that every program
        respected, a conversation history that included one 16-message re-fit
        exchange, and two weekly analytics rollups that tell a coherent story
        about her training trajectory.
      </p>
      <p>
        The <strong>Week 9 rollup</strong> (Feb 23–Mar 1, her return-to-training
        week) set the baseline: 2 of 3 planned sessions completed, 1,350 lbs of
        total weighted tonnage, RPE 5 execution, incline push-up 4×8 as her
        &ldquo;first session back&rdquo; PR, textbook foundation-phase entry.
        The <strong>Week 12 rollup</strong> (Mar 16–22, her first week under the
        active Trifecta program) tells a different story entirely: 4 of 4
        planned sessions, 3,510 lbs of weighted tonnage (a 2.6× jump from Week
        9), RPE ramping from 5 into the 8–10 range, zero failed reps across 47
        working sets, three PRs.
      </p>
      <p>
        Most of the intelligence showed up in how the Week 12 rollup flagged
        what to watch: the acute-to-chronic volume ratio at 1.45 (above the 1.3
        threshold — a volume-spike caution flag), a pull-vs.-push pattern
        imbalance (48 sets pull, 0 sets push — needs correction next week), RPE
        scale usage on running that probably reflected perceived terrain
        difficulty more than true maximal effort. The coaching system isn't just
        scoring the work; it's scoring how reliable its own scoring is, and it
        says so in plain language.
      </p>

      <h3>
        Week 12: what the first real week under the right program looked like
      </h3>
      <p>
        March 16–22 was the first seven-day block where the program, the coach,
        and the schedule all matched. Every number below is verified against the
        raw exercise metrics.
      </p>
      <ul>
        <li>
          <strong>Mon 3/16 — Hybrid strength.</strong> Goblet squat 15 lbs × 10
          for 4 sets, suitcase carry 15 lbs × 3 sets, scapular pull and
          band-assisted dead hang sequences, banded glute bridges, dead bugs,
          plank hold. First <strong>Dead Hang Hold PR</strong> logged — 10+
          seconds, first measurable baseline in the pull-up development pathway.
        </li>
        <li>
          <strong>Wed 3/18 — Aerobic run.</strong> Interval run at 4.11 miles
          with recovery segments interspersed. RPE was logged at 10/10, but the
          analytics rollup flagged that as more likely a terrain-difficulty
          reading (hill route) than true maximal effort — and recommended
          clarifying the RPE scale for future sessions.
        </li>
        <li>
          <strong>Thu 3/19 — Hybrid strength.</strong> DB single-arm row 15 lbs
          × 10 for 3 sets, kettlebell deadlift 15 lbs × 8 for 4 sets, step-ups 3
          × 10, Pallof press 3 × 10,{" "}
          <strong>farmer's carry 30 lbs for 3 sets of 40 m</strong> — a load PR,
          doubled from her 15 lb suitcase carry baseline.
        </li>
        <li>
          <strong>Fri 3/20 — Aerobic intervals.</strong> 2.32 miles in 30
          minutes across ten interval/recovery segments — an{" "}
          <strong>Aerobic Run Distance PR</strong>, up from 1.6 miles in 20
          minutes the prior training block.
        </li>
      </ul>
      <p>
        Three PRs. Zero failed reps. 100% program compliance. The farmer carry
        load jump is the cleanest signal — the &ldquo;functional carry
        strength&rdquo; pillar of the Spartan Trifecta prep had a 15-lb baseline
        a month earlier, and she doubled it cleanly inside her first execution
        week.
      </p>

      <h3>Progress &amp; observations</h3>
      <p>
        The pattern across the nine weeks is what you'd want from a plan-first,
        execution-shy profile finally finding the right fit:
      </p>
      <ul>
        <li>
          <strong>Adherence:</strong> Week 9 — 67% (2 of 3). Week 12 — 100% (4
          of 4). A 33-point jump inside three weeks, driven by fit rather than
          by willpower.
        </li>
        <li>
          <strong>Volume:</strong> 1,350 lbs → 3,510 lbs weekly tonnage (2.6×).
          Pull-pattern sets: 48 in Week 12. Carries: 41% of total tonnage in
          Week 12.
        </li>
        <li>
          <strong>Running:</strong> 1.6 miles at 12:30/mile (easy conversational
          pace) in Week 9 → 2.32 miles at ~13:00/mile across interval work in
          Week 12.
        </li>
        <li>
          <strong>Strength:</strong> Goblet squat held at 15 lbs × 10
          (appropriate for Week 1 of foundation); farmer carry doubled from 15
          to 30 lbs; KB deadlift introduced at 15 lbs × 8 × 4.
        </li>
        <li>
          <strong>Constraint respect:</strong> Across both tracked weeks, zero
          heel spur flare-ups, zero knee discomfort logged. The modifications in
          her safety profile — low-impact cardio, supportive footwear, avoid
          prolonged standing — are still the programming default, not an
          exception.
        </li>
      </ul>

      <h3>What this suggests (for readers)</h3>
      <p>
        If you're the constraint-heavy athlete — shift work, real injuries, a
        schedule that won't sit still — the useful claim here isn't that Paige
        did something exceptional. She didn't, yet. What she did do is find a
        plan she could actually execute, and the path to that plan ran through
        five archived programs, two coaches, and one candid conversation about
        what wasn't fitting.
      </p>
      <p>
        The mechanics that mattered are unglamorous: a safety profile structured
        enough to propagate across every program the system builds; an
        archive-without-loss pattern that lets iteration function as design
        rather than churn; an in-chat re-fit capability that turns &ldquo;the
        plan doesn't fit&rdquo; into a thirty-three-minute conversation rather
        than a support ticket; and a coach honest enough to say when it can't
        see a UI it's trying to help the athlete navigate.
      </p>
      <p>
        This is early data. Week 12 is one week. The Trifecta races are five to
        eight months out. What we can say is narrow but specific: the coaching
        relationship — five archived attempts, one conversation that named the
        gap, one program that matched her real life — is <em>associated</em>{" "}
        with a first execution week that an intermediate athlete with rotating
        12-hour night shifts and two musculoskeletal constraints would be proud
        of: 4 of 4 sessions, three PRs, zero failed reps.
      </p>

      <MethodLimitations>
        <li>
          <strong>Source:</strong> A single DynamoDB export of 102 records for
          one user (pseudonym &ldquo;Paige&rdquo;), parsed cleanly (0 lossy
          records) via balanced-brace recovery on January 16 – March 22, 2026
          data.
        </li>
        <li>
          <strong>Entity mix:</strong> 1 user profile (empty living profile,
          empty athlete profile summary — this user hasn't generated enough
          conversation volume for those pipelines to mature), 2 coach
          configurations, 2 coach creator sessions (both stored with empty{" "}
          <code>messages[]</code> arrays — the interview responses are preserved
          as a summary string inside{" "}
          <code>coachConfig.metadata.coach_creator_session_summary</code>), 2
          coach conversations (one empty, one 16-message re-fit exchange), 1
          conversation summary (empty), 7 workouts, 71 exercise records, 6
          programs (5 archived, 1 active), 8 program designer sessions (all with
          empty <code>messages[]</code> arrays), 2 weekly analytics rollups.
        </li>
        <li>
          <strong>Window covered in depth:</strong> January 16 – March 22, 2026.
          Week 9 (Feb 23–Mar 1) is the return-to-training baseline; Week 12 (Mar
          16–22) is the first full week under the active 20-Week Spartan
          Trifecta program.
        </li>
        <li>
          <strong>Known data quirks:</strong> All six programs'{" "}
          <code>startDate</code> and <code>endDate</code> fields display with a
          year offset (showing 2025 rather than 2026) — a known year-offset
          display bug on program rendering. Coach creator session and program
          designer session records are present with 0 messages; the substantive
          content lives in the coach-config metadata (for creator sessions) and
          the program records themselves (for designer sessions). The sole
          content-bearing conversation is the February 27 16-message exchange.
          The Week 12 analytics rollup reports &ldquo;total running volume
          across the week reached 4.11 miles&rdquo; while the raw exercise
          records show 4.11 miles on 3/18 plus 2.32 miles on 3/20; the PR
          framing (aerobic run distance PR — 2.32 miles in 30 minutes) is drawn
          from the analytics rollup directly. RPE readings on running sessions
          were logged at 10/10 but flagged by the analytics system as likely
          reflecting terrain difficulty rather than true maximal effort.
        </li>
        <li>
          <strong>Consent status:</strong>{" "}
          <strong>Draft for subject review.</strong> Pseudonym
          (&ldquo;Paige&rdquo;) in use. Not cleared for external publication. No
          real names, emails, or identifiers from the Dynamo keys appear in
          public copy.
        </li>
      </MethodLimitations>

      <h3>Optional pull quotes</h3>
      <PullQuotes>
        <blockquote>
          &ldquo;The last program we made, I think there was a miscommunication
          on how many days I can work out in a week.&rdquo;
          <span className="attrib">
            — The February 27 message that opened the re-fit conversation. Six
            words of candor that unlocked nine weeks of iteration.
          </span>
        </blockquote>
        <blockquote className="quiet">
          &ldquo;I'm not 100% certain of the exact interface layout in the
          Program Designer on your end… If you get stuck, take a screenshot or
          describe what options you're seeing, and I can help you navigate from
          there.&rdquo;
          <span className="attrib">
            — The coach, admitting the limits of its view and staying useful
            anyway. A small moment, and the right one.
          </span>
        </blockquote>
      </PullQuotes>
    </WhitePaperLayout>
  );
}

export default UseCasePaige;
