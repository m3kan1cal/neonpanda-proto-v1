import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns,
} from "../utils/ui/uiPatterns";
import Footer from "./shared/Footer";

function AboutUs() {
  const navigate = useNavigate();

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSignUp = () => {
    navigate("/auth");
  };

  const handleContactUs = () => {
    navigate("/contact?type=general");
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={typographyPatterns.pageTitle}>
            About <span className="text-synthwave-neon-pink">NeonPanda</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Building the future of personalized AI coaching—where cutting-edge
            agentic AI meets real athletic passion across every training
            discipline.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Our Story Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Our Story: Built by Athletes, for Athletes
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                We love fitness. All of it—the grind, the breakthroughs, the
                methodology debates, the PR celebrations. We also happen to be
                deeply passionate about AI and cutting-edge technology. So we
                asked ourselves:{" "}
                <strong className="text-synthwave-neon-pink">
                  what if we combined the best of both worlds?
                </strong>
              </p>
              <p className={typographyPatterns.description}>
                NeonPanda started as a tool we built for ourselves. Working
                professionally with cutting-edge AI and cloud systems, we saw an
                opportunity that others were missing. Fitness apps were either
                too generic or too rigid. Personal trainers were expensive and
                limited by geography. What was needed was something
                new—intelligent coaching that could adapt to each person's
                unique situation:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                    •
                  </span>
                  <span>
                    Custom-tailored programs for your specific goals and
                    constraints
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                    •
                  </span>
                  <span>
                    Methodology that matches your training discipline and
                    experience level
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                    •
                  </span>
                  <span>
                    Intelligent decisions powered by the latest AI models
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                    •
                  </span>
                  <span>
                    Coaching available whenever you need it—not just during
                    scheduled sessions
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                    •
                  </span>
                  <span>
                    Real adaptation based on your progress, preferences, and
                    feedback
                  </span>
                </li>
              </ul>
              <p className={typographyPatterns.description}>
                The vision was clear:{" "}
                <strong className="text-synthwave-neon-pink">
                  build a system that adapts to you, not the other way around.
                </strong>
              </p>
              <p className={typographyPatterns.description}>
                We started building AI coaches for our own training—different
                approaches for different goals, different personalities for
                different moods, different methodologies for different phases.
                Using ourselves as the first users meant we could iterate
                rapidly, testing every feature in real workouts and real
                conversations.
              </p>
              <p className={typographyPatterns.description}>
                What emerged was something more powerful than we'd anticipated:
                an{" "}
                <strong className="text-synthwave-neon-pink">
                  agentic AI architecture
                </strong>{" "}
                where specialized agents handle different aspects of
                coaching—from creating personalized coach configurations to
                designing multi-week programs to intelligently logging workouts
                across multiple training disciplines.
              </p>
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-cyan">
                  Being our own first customers
                </strong>{" "}
                meant experiencing every improvement and every shortcoming
                directly. And when we realized what NeonPanda was doing for our
                own training—the consistency, the personalization, the genuine
                coaching relationship—we knew we had to share it.
              </p>
              <p className={typographyPatterns.description}>
                Today, NeonPanda represents the intersection of deep AI
                expertise and genuine athletic passion—best-in-class models like
                Claude Sonnet 4.5, Claude Opus 4.5, and Nvidia embeddings,
                orchestrated through sophisticated agentic workflows, all in
                service of making you a better athlete.
              </p>
            </div>
          </section>

          {/* The Team Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              The Team: Athletes Who Build Technology
            </h2>

            <div className="space-y-6">
              <h3
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}
              >
                From AWS Architecture to Agentic AI Coaching
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  Our professional background in AWS cloud architecture and AI
                  systems positioned us uniquely to see what was possible—and
                  what was missing—in fitness technology. We'd spent years
                  building sophisticated systems for enterprise clients; why
                  couldn't the same level of intelligence be applied to
                  personalized coaching?
                </p>
                <p className={typographyPatterns.description}>
                  NeonPanda became the answer. Not a fitness app with some AI
                  features bolted on, but a{" "}
                  <strong className="text-synthwave-neon-pink">
                    purpose-built agentic AI platform
                  </strong>{" "}
                  where specialized agents—Coach Creator, Program Designer,
                  Workout Logger, and Smart Request Router—work together to
                  deliver genuinely personalized coaching experiences.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}
              >
                Technology Leadership Through Practice
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  Every architectural decision at NeonPanda comes from hands-on
                  experience. We use the latest Claude models (Sonnet 4.5, Haiku
                  4.5, Opus 4.5), Amazon Nova for efficient processing, and
                  Nvidia NV-Embed-V2 for best-in-class semantic search—not
                  because they're trendy, but because real-world testing proved
                  they deliver the best coaching experiences.
                </p>
                <p className={typographyPatterns.description}>
                  <strong className="text-synthwave-neon-pink">
                    The approach is simple
                  </strong>
                  : Build it, use it ourselves, iterate based on real training,
                  repeat. This keeps us honest about what actually works versus
                  what just looks impressive on paper.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}
              >
                The Technical Advantage That Actually Matters
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  The real advantage isn't just the technology stack—it's
                  understanding that{" "}
                  <strong className="text-synthwave-neon-pink">
                    the best technology disappears
                  </strong>
                  . You don't think about the multi-agent orchestration or the
                  sophisticated model selection when you're getting great
                  coaching. You just experience the relationship.
                </p>
                <p className={typographyPatterns.description}>
                  We're building AI coaching that feels natural and human,
                  powered by systems that happen to be incredibly sophisticated
                  under the hood. Sub-2-second response times. Intelligent model
                  selection based on task complexity. Tool-based validation with
                  blocking enforcement. All invisible to you—all working to make
                  your training better.
                </p>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}
            >
              Our Mission: Democratizing Elite-Level Coaching
            </h2>

            <div className="space-y-8">
              <div className={containerPatterns.mediumGlassPink}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-pink">
                      1
                    </span>
                  </div>
                  <h3
                    className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl flex-1`}
                  >
                    Great coaching adapts to you, not the other way around.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  The best coaches in the world understand that every athlete is
                  different. Your constraints, your goals, your available
                  equipment, your schedule, your recovery capacity—all of these
                  matter.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  NeonPanda builds AI coaches that understand these nuances.{" "}
                  <strong className="text-synthwave-neon-pink">
                    Fit matters more than fame
                  </strong>
                  —your coach should work for your specific situation, across
                  any of our 10 supported disciplines.
                </p>
              </div>

              <div className={containerPatterns.mediumGlass}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">
                      2
                    </span>
                  </div>
                  <h3
                    className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl flex-1`}
                  >
                    Technology should enable, not complicate.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  We use the most advanced AI available—Claude Sonnet 4.5, Opus
                  4.5, Haiku 4.5, Nova, Nvidia embeddings—but you never have to
                  think about any of it. The technology disappears into the
                  experience.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  You interact with a coach who remembers your history,
                  understands your goals, and delivers intelligent programming.
                  That it's powered by sophisticated agentic AI is our job to
                  worry about, not yours.
                </p>
              </div>

              <div className={containerPatterns.mediumGlassPurple}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-purple">
                      3
                    </span>
                  </div>
                  <h3
                    className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-2xl flex-1`}
                  >
                    Intelligent coaching should be accessible to everyone.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Elite-level coaching has traditionally been available only to
                  elite athletes with elite budgets. That's changing. AI makes
                  it possible to deliver personalized, intelligent coaching at
                  scale.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  Whether you're just starting out or preparing for competition,
                  whether you're doing CrossFit, powerlifting, HYROX, or any of
                  our supported disciplines—you deserve a coach that actually
                  understands your journey.
                </p>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Our Values: Built Into Every Interaction
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={containerPatterns.lightGlass}>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}
                >
                  Personalization Over Generic
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  Your coach should understand your exact situation—not
                  approximate it. Every limitation, every preference, every goal
                  that makes you different from the textbook athlete. That's why
                  we built specialized agents for each aspect of coaching.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}
                >
                  Honest Coaching
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  Real coaching acknowledges when things are hard, celebrates
                  genuine progress, and provides support that matches what you
                  actually need. No fake enthusiasm. No empty motivation. Just
                  honest guidance that helps you improve.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}
                >
                  Transparent AI
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  You should understand why your AI coach makes specific
                  recommendations. We build explainable systems where every
                  suggestion comes with clear reasoning. No black boxes—just
                  intelligent coaching you can trust.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}
                >
                  Continuous Improvement
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  Your coach learns from every interaction, every workout, every
                  piece of feedback. Not just data collection, but genuine
                  understanding that changes how they work with you over time.
                  Real adaptation for real progress.
                </p>
              </div>
            </div>
          </section>

          {/* Why NeonPanda Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              Why NeonPanda? The Name Behind the Experience
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-pink">Neon</strong>{" "}
                represents the intensity and focus of great training—bright,
                energizing, impossible to ignore when you need that extra push.
                It's also a nod to the cutting-edge technology that powers
                everything we build.
              </p>
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-cyan">Panda</strong>{" "}
                embodies the approachable wisdom we aim for—strong when they
                need to be, gentle most of the time, and unexpectedly adaptable
                to different situations.
              </p>
              <p className={typographyPatterns.description}>
                Together,{" "}
                <strong className="text-synthwave-neon-purple">
                  NeonPanda
                </strong>{" "}
                captures what we're building: coaching that's both intensely
                intelligent and genuinely approachable. Serious results with a
                refreshingly fun approach.
              </p>
            </div>
          </section>

          {/* Community Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Multi-Discipline Support: 8 and Growing
            </h2>

            <div className="space-y-8">
              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}
                >
                  Currently Supported Disciplines
                </h3>
                <p className={`${typographyPatterns.description} text-lg mb-6`}>
                  NeonPanda currently supports 10 training disciplines:
                </p>
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
                    "Circuit Training",
                    "Hybrid",
                  ].map((discipline, idx) => (
                    <div
                      key={idx}
                      className={`${containerPatterns.lightGlass} text-center py-4`}
                    >
                      <span className="text-synthwave-neon-pink font-rajdhani font-semibold text-lg">
                        {discipline}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}
                >
                  Deep Methodology Understanding
                </h3>
                <p className={`${typographyPatterns.description} text-lg mb-4`}>
                  Each discipline has its own programming principles,
                  periodization approaches, and training cultures. Our agents
                  understand these nuances—the Workout Logger automatically
                  detects discipline from your workout descriptions, and the
                  Program Designer builds methodology-appropriate progressions.
                </p>
                <p className={`${typographyPatterns.description} text-lg`}>
                  We're expanding to additional disciplines based on community
                  feedback. If your training style isn't currently supported,
                  let us know—your input directly shapes our roadmap.
                </p>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}
            >
              Our Vision: What We're Building Toward
            </h2>

            <div className="space-y-8">
              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3`}
                >
                  <span className="text-synthwave-neon-pink">Phase 1:</span> AI
                  Coaches That Truly Understand You
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Create AI coaches that understand your specific situation so
                  well that interacting with them feels like talking to someone
                  who's been training with you for years. Across 10 disciplines,
                  with more launching soon.
                </p>
              </div>

              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3`}
                >
                  <span className="text-synthwave-neon-pink">Phase 2:</span>{" "}
                  Human-AI Coach Collaboration
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Enable real coaches to extend their expertise through AI, so
                  they can support more people while maintaining the
                  relationship quality that makes great coaching work.
                </p>
              </div>

              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-3`}
                >
                  <span className="text-synthwave-neon-pink">Phase 3:</span> A
                  Training Ecosystem That Makes Sense
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Build a platform where methodology, experience, and genuine
                  coaching wisdom can be shared effectively—connecting athletes
                  with the coaching approaches that work best for them.
                </p>
              </div>

              <div
                className={`${containerPatterns.boldGradient} text-center mt-12`}
              >
                <h3
                  className={`${typographyPatterns.cardTitle} text-white text-2xl mb-4`}
                >
                  The Real Goal
                </h3>
                <p
                  className={`${typographyPatterns.description} text-base mt-4`}
                >
                  We're building toward a future where the boundaries between
                  human intuition and artificial intelligence create something
                  greater than either alone—transparent, intelligent
                  partnerships that transform how we train and discover what
                  we're truly capable of achieving.
                </p>
                <p
                  className={`${typographyPatterns.description} text-base mt-4`}
                >
                  This isn't about replacing coaches or automating fitness. It's
                  about democratizing access to intelligent coaching—where every
                  individual, regardless of resources or location, can train
                  with guidance that adapts to their unique journey.
                </p>
              </div>
            </div>
          </section>

          {/* Join Our Journey Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              Join the Journey
            </h2>

            <div className="space-y-8">
              <p className={typographyPatterns.description}>
                We're unlocking the next frontier for fitness—where AI coaching
                isn't a gimmick, it's a genuine advantage. If you're tired of
                cookie-cutter programs and want{" "}
                <strong className="text-synthwave-neon-pink">
                  custom-tailored coaching
                </strong>{" "}
                that actually understands your goals, your constraints, and your
                journey, you're in the right place.
              </p>

              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}
                >
                  This Might Be For You If:
                </h3>
                <ul className="space-y-4 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      You want coaching that adapts to your specific goals and
                      constraints—not cookie-cutter templates
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      You believe methodology matters—not just "getting sweaty"
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      You're curious about what cutting-edge AI can do for
                      personalized training
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      You train in CrossFit, powerlifting, HYROX, running,
                      calisthenics, or any of our supported disciplines
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      You want to be part of unlocking the next frontier in
                      fitness technology
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}
                >
                  Our Commitment to You
                </h3>
                <ul className="space-y-4 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Honest technology
                      </strong>
                      : We'll tell you what works and what we're still improving
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        User-driven development
                      </strong>
                      : Your feedback directly shapes what we build next
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Results over features
                      </strong>
                      : Every feature exists to help you train better
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Continuous improvement
                      </strong>
                      : As AI technology advances, so does your coaching
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Connect Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Connect With Us
            </h2>
            <div className="text-center space-y-6">
              <p
                className={`${typographyPatterns.description} text-lg max-w-4xl mx-auto`}
              >
                We're building NeonPanda for athletes who want more from their
                training technology. Whether you're curious about what we're
                building, have feedback on features, or want to discuss coaching
                methodology—we'd love to hear from you.
              </p>
              <p
                className={`${typographyPatterns.description} text-lg italic text-synthwave-neon-pink`}
              >
                The future of personalized coaching is being built right now.
                Come be part of it.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
                <button
                  onClick={handleSignUp}
                  className={`${buttonPatterns.heroCTA} min-w-48`}
                >
                  Sign Up
                </button>
                <button
                  onClick={handleContactUs}
                  className={`${buttonPatterns.secondary} min-w-48`}
                >
                  Contact Us
                </button>
              </div>

              <div className="mt-8">
                <p
                  className={`${typographyPatterns.caption} text-synthwave-neon-purple uppercase tracking-wider`}
                >
                  Built by athletes, for athletes • Powered by best-in-class AI
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default AboutUs;
