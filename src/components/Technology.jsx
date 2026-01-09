import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns,
} from "../utils/ui/uiPatterns";
import Footer from "./shared/Footer";

function Technology() {
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Modal functionality
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setModalImage(null);
      }
    };

    if (modalImage) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [modalImage]);

  const openModal = (imageSrc, imageAlt) => {
    setModalImage({ src: imageSrc, alt: imageAlt });
  };

  const closeModal = () => {
    setModalImage(null);
  };

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
            Our Technology{" "}
            <span className="text-synthwave-neon-pink">Platform</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Where cutting-edge agentic AI meets real coaching. Best-in-class
            models, industry-recognized patterns, and sophisticated
            orchestration—all invisible behind naturally intuitive
            conversations.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Philosophy Section */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Our Philosophy: Invisible Complexity, Obvious Results
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                Here's the thing about great technology: it should feel like
                magic, not work.
              </p>
              <p className={typographyPatterns.description}>
                At NeonPanda, we've built something pretty incredible under the
                hood—a sophisticated AI coaching ecosystem with enterprise-grade
                architecture and best-in-class models. But here's what matters
                more:{" "}
                <strong className="text-synthwave-neon-pink">
                  it feels as natural as texting your most knowledgeable gym
                  buddy.
                </strong>
              </p>
              <p className={typographyPatterns.description}>
                Our core principle? The most advanced AI shouldn't intimidate—it
                should inspire, adapt, and occasionally make you laugh while
                crushing your PRs.
              </p>
            </div>
          </section>

          {/* The Magic Behind Your Coach */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              The Magic Behind Your Coach
            </h2>
            <h3
              className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}
            >
              Agentic AI Architecture: Specialized Agents Working Together
            </h3>
            <p className={typographyPatterns.description}>
              Unlike those basic fitness chatbots that spit out generic
              workouts, NeonPanda runs on a sophisticated{" "}
              <strong className="text-synthwave-neon-pink">
                agentic AI architecture
              </strong>{" "}
              with specialized agents for every aspect of your coaching
              experience. Think of it as your personal coaching staff—each
              specialist doing what they do best, seamlessly coordinating across
              8 supported disciplines to create your perfect training
              experience.
            </p>

            <div className="space-y-12">
              {/* Coach Creator Agent */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-pink">
                      1
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl`}
                    >
                      Coach Creator Agent
                    </h4>
                    <p
                      className={`${typographyPatterns.description} text-synthwave-neon-pink italic text-sm`}
                    >
                      "Your Personality Architect"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">
                      What it does:
                    </strong>{" "}
                    Orchestrates the creation of your personalized AI coach
                    through a sophisticated multi-tool workflow—from
                    understanding your goals to generating custom personality
                    prompts
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">
                      How it works:
                    </strong>{" "}
                    Through adaptive conversations that feel more like coffee
                    chats with a perceptive friend, this agent discovers your
                    goals, preferred training discipline, coaching style
                    preferences, and what actually motivates you. It then
                    selects from personality and methodology templates to create
                    a coach that's uniquely yours
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">
                      The magic:
                    </strong>{" "}
                    Uses planner models (Sonnet 4.5) for complex reasoning and
                    executor models (Haiku 4.5, Nova 2 Lite) for fast
                    operations—intelligently deciding template selection, prompt
                    generation, and configuration assembly to create coaches
                    that feel genuinely personal, not cookie-cutter
                  </p>
                </div>
              </div>

              {/* Program Designer Agent */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">
                      2
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl`}
                    >
                      Program Designer Agent
                    </h4>
                    <p
                      className={`${typographyPatterns.description} text-synthwave-neon-cyan italic text-sm`}
                    >
                      "Your Programming Mastermind"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">
                      What it does:
                    </strong>{" "}
                    Designs intelligent multi-week training programs with proper
                    periodization, phase management, and goal-oriented
                    progression tailored to your specific discipline
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">
                      How it works:
                    </strong>{" "}
                    Using a sophisticated multi-tool workflow, this agent
                    analyzes your goals, current fitness level, available
                    equipment, and schedule constraints. It then generates
                    comprehensive programs with warm-ups, strength work,
                    conditioning, and recovery—all following proven methodology
                    for your discipline
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">
                      The magic:
                    </strong>{" "}
                    Uses planner models (Sonnet 4.5) for program architecture
                    and executor models for validation and parallel
                    processing—ensuring your training follows intelligent
                    progression principles whether you're doing CrossFit,
                    powerlifting, HYROX, or any of our 8 supported disciplines
                  </p>
                </div>
              </div>

              {/* Workout Logger Agent */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-purple">
                      3
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl`}
                    >
                      Workout Logger Agent
                    </h4>
                    <p
                      className={`${typographyPatterns.description} text-synthwave-neon-purple italic text-sm`}
                    >
                      "Your Training Historian"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">
                      What it does:
                    </strong>{" "}
                    Extracts, validates, and saves workout data from natural
                    language descriptions—no rigid forms or confusing menus
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">
                      How it works:
                    </strong>{" "}
                    Using discipline detection across 8 supported training
                    styles, this agent understands everything from "Did Fran in
                    8:45" to complex powerlifting sessions with warmups and
                    working sets. It handles temporal awareness, partner
                    workouts, bilateral weights, and complex rep schemes
                    automatically
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">
                      The magic:
                    </strong>{" "}
                    Uses planner models (Sonnet 4.5) for complex extraction and
                    executor models for fast validation—with built-in blocking
                    to prevent incomplete data. Supports multimodal input—send a
                    photo of your gym's whiteboard and it extracts the workout
                    automatically
                  </p>
                </div>
              </div>

              {/* Smart Request Router */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-pink">
                      4
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl`}
                    >
                      Smart Request Router
                    </h4>
                    <p
                      className={`${typographyPatterns.description} text-synthwave-neon-pink italic text-sm`}
                    >
                      "The Intelligent Orchestrator"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">
                      What it does:
                    </strong>{" "}
                    Analyzes every user message to determine intent, detect
                    workout logging attempts, assess conversation complexity,
                    and dynamically select the optimal AI model for each task
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">
                      How it works:
                    </strong>{" "}
                    Consolidates multiple AI detection calls into a single
                    intelligent routing decision—understanding whether you're
                    logging a workout, asking for advice, designing a program,
                    or just chatting. Routes complex reasoning to Sonnet 4.5,
                    quick responses to Haiku 4.5, and efficient background tasks
                    to Nova
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">
                      The magic:
                    </strong>{" "}
                    You never notice the orchestration. Whether you need deep
                    program analysis or a quick motivational boost, the right
                    model responds instantly with the perfect level of
                    intelligence
                  </p>
                </div>
              </div>

              {/* Supporting Cast */}
              <div className={containerPatterns.mediumGlass}>
                <div className="mb-4">
                  <h4
                    className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-2`}
                  >
                    Agentic AI Patterns: The Supporting Architecture
                  </h4>
                  <p
                    className={`${typographyPatterns.description} text-synthwave-neon-cyan italic text-sm`}
                  >
                    "Industry-Recognized Patterns with Intelligent
                    Orchestration"
                  </p>
                </div>
                <p className={`${typographyPatterns.description} mb-6`}>
                  Our agents implement{" "}
                  <strong className="text-synthwave-neon-pink">
                    industry-recognized agentic AI patterns
                  </strong>{" "}
                  where Claude makes intelligent decisions about when and how to
                  use specialized tools. We leverage multiple established
                  patterns for robust, scalable AI workflows:
                </p>

                {/* Industry Patterns Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Orchestrator Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Central coordinator that manages multi-step workflows,
                      delegating to specialized agents based on task complexity
                    </p>
                  </div>
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Parallel Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Concurrent execution of independent tasks for faster
                      processing—analytics, summaries, and validations running
                      simultaneously
                    </p>
                  </div>
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Assembler Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Combines outputs from multiple agents into cohesive
                      responses—merging workout data, coach context, and user
                      preferences
                    </p>
                  </div>
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Router Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Intelligent request routing that analyzes intent and
                      selects optimal models and processing paths dynamically
                    </p>
                  </div>
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Tool-Use Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Agents equipped with specialized tools for validation,
                      data extraction, and external integrations with blocking
                      enforcement
                    </p>
                  </div>
                  <div className="bg-synthwave-bg-secondary/30 rounded-lg p-4 border border-synthwave-neon-cyan/20">
                    <h5 className="text-synthwave-neon-cyan font-rajdhani font-semibold mb-2">
                      Evaluator-Optimizer Pattern
                    </h5>
                    <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                      Continuous quality assessment of agent outputs with
                      iterative refinement for accuracy and safety
                    </p>
                  </div>
                </div>

                <ul className="space-y-3 text-synthwave-text-secondary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Smart Prompt Assembly:
                      </strong>{" "}
                      We construct intelligent prompts on-the-fly, pulling only
                      the context required for each request—coach personality,
                      relevant memories, recent workouts, user preferences—to
                      minimize token usage and maximize accuracy
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Tool-Based Validation:
                      </strong>{" "}
                      Every agent includes validation tools with blocking
                      enforcement—preventing incomplete or unsafe data from
                      being saved
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Smart Model Selection:
                      </strong>{" "}
                      Opus 4.5 for deep reasoning tasks, Sonnet 4.5 for
                      orchestration, Haiku 4.5 and Nova 2 Lite for fast
                      responses, Nova Micro for efficient background processing
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Memory Management Workflows:
                      </strong>{" "}
                      Semantic search via Nvidia embeddings across all record
                      types—workouts, training programs, user memories,
                      conversation summaries, coach configurations, and
                      methodology knowledge bases
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Analytics & Reporting Agents:
                      </strong>{" "}
                      Weekly and monthly report generation, progress pattern
                      analysis, and insight extraction
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Discipline Detection:
                      </strong>{" "}
                      Automatic classification across 8 training disciplines for
                      targeted extraction schemas and methodology alignment
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Fire-and-Forget Async:
                      </strong>{" "}
                      Lambda invocations for conversation summaries, workout
                      saves, program generation, and Pinecone indexing without
                      blocking user interactions
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <p className={typographyPatterns.description}>
                This creates a comprehensive system where specialized AI agents
                handle different aspects of your coaching experience—from
                managing your conversation history and workout progression to
                coordinating data from various sources and ensuring system
                reliability—all working together seamlessly in the background.
              </p>
              <p
                className={`${typographyPatterns.description} text-lg font-semibold`}
              >
                <strong className="text-synthwave-neon-pink">
                  The result:
                </strong>{" "}
                Multiple layers of intelligence working together to create what
                feels like a single, intuitive coaching relationship.
              </p>
            </div>
          </section>

          {/* Your Data, Elevated */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}
            >
              Your Data, Elevated
            </h2>
            <h3
              className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}
            >
              Making Every Workout Smarter Than the Last
            </h3>

            {/* Architecture Overview Placeholder */}
            <p className={typographyPatterns.description}>
              At NeonPanda, we've architected a cutting-edge fitness AI platform
              that combines the best of serverless computing with sophisticated
              AI orchestration to deliver personalized coaching experiences that
              rival human trainers. Our AWS-native architecture centers around a
              revolutionary multi-agent system—featuring specialized Coach
              Creator, Coach Agent, and Safety Agent AI components—all built on
              a foundation of Lambda functions that auto-scale from zero to
              thousands of concurrent users without missing a beat.
            </p>

            <p className={typographyPatterns.description}>
              What sets us apart is our innovative hybrid data strategy: we use
              DynamoDB's lightning-fast queries for real-time user interactions
              while leveraging S3's cost-effective storage for rich conversation
              histories, achieving a 90% reduction in storage costs compared to
              traditional approaches. The magic happens through our integration
              of AWS Bedrock and Pinecone vector search, enabling our AI coaches
              to access methodology knowledge and conversation context in under
              2 seconds, creating coaching interactions that feel remarkably
              human. This serverless-first architecture doesn't just handle
              scale gracefully—it transforms our founder's deep AWS expertise
              into a sustainable competitive moat, allowing us to deliver
              enterprise-grade AI coaching features at consumer-friendly prices
              while maintaining the technical sophistication that larger
              competitors with generic cloud solutions simply can't match.
            </p>

            {/* Architecture Diagram */}
            <div className="my-8 text-center">
              <img
                src="/images/diagrams/architecture-v1.png"
                alt="NeonPanda AWS Architecture Overview - Multi-agent AI system built on serverless infrastructure"
                className="mx-auto rounded-xl shadow-lg cursor-zoom-in hover:shadow-xl transition-shadow duration-300 max-w-2xl"
                onClick={() =>
                  openModal(
                    "/images/diagrams/architecture-v1.png",
                    "NeonPanda AWS Architecture Overview - Multi-agent AI system built on serverless infrastructure",
                  )
                }
              />
            </div>

            <p className={typographyPatterns.description}>
              We've designed our data architecture like a coach's perfect
              memory—capturing everything that matters while making it instantly
              accessible when needed.
            </p>

            <div className="space-y-12">
              {/* DynamoDB - High-Speed Structured Data */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}
                >
                  DynamoDB: Lightning-Fast Structured Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For frequently accessed data that needs instant
                      retrieval—workout records, progress metrics, user
                      preferences, and real-time performance tracking.{" "}
                      <strong className="text-synthwave-neon-pink">
                        DynamoDB's single-digit millisecond response times
                      </strong>{" "}
                      ensure your coach can instantly access your last workout,
                      current PRs, or training patterns without any delay.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-pink">
                          Perfect for:
                        </strong>{" "}
                        Workout logs, exercise history, performance metrics,
                        user settings, active coaching sessions
                      </p>
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-pink">
                          Why this matters:
                        </strong>{" "}
                        Your coach remembers your deadlift PR from six months
                        ago and notices performance patterns you might miss—all
                        in real-time.
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <img
                      src="/images/icons/Arch_Amazon-DynamoDB_64.svg"
                      alt="Amazon DynamoDB - High-performance NoSQL database service"
                      className="w-32 h-32 mx-auto drop-shadow-lg"
                    />
                  </div>
                </div>
              </div>

              {/* S3 - Archival and Infrequent Data */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}
                >
                  S3 Buckets: Deep Storage for Rich Context
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For comprehensive conversation archives, detailed workout
                      analysis reports, historical coaching sessions, and rich
                      media content.{" "}
                      <strong className="text-synthwave-neon-cyan">
                        S3's virtually unlimited storage
                      </strong>{" "}
                      preserves your entire coaching relationship history while
                      keeping costs optimized for infrequently accessed data.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-cyan">
                          Perfect for:
                        </strong>{" "}
                        Full conversation transcripts, detailed workout
                        analyses, progress photos, coaching methodology
                        documents, historical reports
                      </p>
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-cyan">
                          Why this matters:
                        </strong>{" "}
                        Every conversation, every insight, every piece of your
                        coaching journey is preserved and retrievable when
                        context is needed.
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <img
                      src="/images/icons/Arch_Amazon-Simple-Storage-Service_64.svg"
                      alt="Amazon S3 - Scalable cloud storage service"
                      className="w-32 h-32 mx-auto drop-shadow-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Pinecone - Semantic Search and AI Context */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}
                >
                  Pinecone: Intelligent Semantic Retrieval
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For semantic similarity searches and contextual AI
                      retrieval—finding relevant training methodologies,
                      matching similar situations from your history, and
                      connecting related concepts across vast knowledge bases.{" "}
                      <strong className="text-synthwave-neon-purple">
                        Pinecone's vector similarity search
                      </strong>{" "}
                      enables your coach to understand meaning, not just
                      keywords.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-purple">
                          Perfect for:
                        </strong>{" "}
                        Training methodology libraries, contextual conversation
                        retrieval, exercise variation matching, injury history
                        correlation, goal-based program suggestions
                      </p>
                      <p
                        className={`${typographyPatterns.description} text-base`}
                      >
                        <strong className="text-synthwave-neon-purple">
                          Why this matters:
                        </strong>{" "}
                        When you mention "shoulder feels tweaky," your coach
                        instantly connects to relevant methodology, your injury
                        history, and appropriate exercise modifications.
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="bg-white rounded-lg p-4 mx-auto w-fit drop-shadow-lg">
                      <img
                        src="/images/icons/pinecone-logo.svg"
                        alt="Pinecone - Vector database for AI applications"
                        className="w-24 h-24"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Built on Rock-Solid Foundations */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Built on Rock-Solid Foundations
            </h2>
            <h3
              className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}
            >
              Enterprise-Grade Technology with Neighborhood Gym Vibes
            </h3>

            {/* AWS Native Architecture */}
            <div>
              <h4
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}
              >
                Amazon Web Services (AWS) Native Architecture
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <p className={`${typographyPatterns.description} mb-6`}>
                    Why AWS? Because when you're building something this
                    sophisticated, you need infrastructure that scales
                    beautifully:
                  </p>
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-cyan">
                          99.9% Uptime:
                        </strong>{" "}
                        Your coach is always available, even during your 5 AM
                        workout motivation crisis
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-cyan">
                          Sub-2-Second Response Times:
                        </strong>{" "}
                        Conversations flow naturally without awkward AI-thinking
                        pauses
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-cyan">
                          Global Performance:
                        </strong>{" "}
                        Fast and reliable whether you're training in New York or
                        New Zealand
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-cyan">
                          Bank-Level Security:
                        </strong>{" "}
                        Your training data is protected with the same encryption
                        banks use for your money
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-span-1">
                  <img
                    src="/images/icons/AWS-Cloud-logo_32.svg"
                    alt="Amazon Web Services - Cloud computing platform"
                    className="w-32 h-32 mx-auto drop-shadow-lg"
                  />
                </div>
              </div>
            </div>

            {/* Advanced AI Model Orchestration */}
            <div>
              <h4
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}
              >
                Advanced AI Model Orchestration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <p className={`${typographyPatterns.description} mb-4`}>
                    <strong className="text-synthwave-neon-pink">
                      Multi-Model AI Ecosystem:
                    </strong>{" "}
                    We leverage the latest and greatest AI models through{" "}
                    <strong className="text-synthwave-neon-pink">
                      Amazon Bedrock Runtime APIs:
                    </strong>
                  </p>
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Claude Sonnet 4.5:
                        </strong>{" "}
                        Our primary conversational engine for natural coaching
                        interactions and complex orchestration
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Claude Haiku 4.5:
                        </strong>{" "}
                        Lightning-fast responses for quick questions and
                        real-time feedback
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Claude Opus 4.5:
                        </strong>{" "}
                        Deep reasoning for complex program design and
                        methodology application
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Nova Micro:
                        </strong>{" "}
                        Ultra-efficient processing for contextual updates and
                        intent classification
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Nova 2 Lite:
                        </strong>{" "}
                        High-speed parallel task execution for background
                        operations
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Nvidia NV-Embed-V2:
                        </strong>{" "}
                        State-of-the-art embeddings for semantic search and
                        memory retrieval
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-pink">
                          Additional Specialized Models:
                        </strong>{" "}
                        Custom-selected models optimized for specific coaching
                        functions across 8 supported disciplines
                      </span>
                    </li>
                  </ul>
                  <div className="mt-6 space-y-4">
                    <p className={typographyPatterns.description}>
                      <strong className="text-synthwave-neon-pink">
                        AWS Bedrock Integration:
                      </strong>{" "}
                      Seamless access to multiple AI models through unified
                      APIs, enabling intelligent model selection—Sonnet 4.5 for
                      complex reasoning, Haiku 4.5 for speed, Nova for
                      efficiency—without you ever noticing the orchestration
                    </p>
                    <p className={typographyPatterns.description}>
                      <strong className="text-synthwave-neon-pink">
                        Custom Prompt Engineering:
                      </strong>{" "}
                      Hundreds of hours fine-tuning each model's coaching
                      personalities to feel authentic, not robotic—whether
                      you're getting quick motivation from Haiku 4.5 or deep
                      program analysis from Opus 4.5
                    </p>
                  </div>
                </div>
                <div className="md:col-span-1 space-y-6">
                  <img
                    src="/images/icons/Arch_Amazon-Bedrock_64.svg"
                    alt="Amazon Bedrock - Fully managed foundation model service"
                    className="w-32 h-32 mx-auto drop-shadow-lg"
                  />
                  <img
                    src="/images/icons/Arch_Amazon-Nova_64.svg"
                    alt="Amazon Nova - Advanced AI model for specialized tasks"
                    className="w-32 h-32 mx-auto drop-shadow-lg"
                  />
                  <div className="bg-white rounded-lg p-4 mx-auto w-fit drop-shadow-lg">
                    <img
                      src="/images/icons/Claude_AI_logo.svg"
                      alt="Claude AI - Advanced conversational AI models"
                      className="w-24 h-24"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Frontend Experience */}
            <div>
              <h4
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}
              >
                Modern Frontend Experience
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-purple">
                          Progressive Web App:
                        </strong>{" "}
                        Near-native mobile experience without app store
                        friction—bookmark it and go
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-purple">
                          React + Vite:
                        </strong>{" "}
                        Lightning-fast, mobile-first interface that works
                        beautifully on any device
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                        •
                      </span>
                      <span>
                        <strong className="text-synthwave-neon-purple">
                          Offline Capabilities:
                        </strong>{" "}
                        Key features work even when gym WiFi doesn't
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-span-1">
                  <img
                    src="/images/icons/react-1-logo.svg"
                    alt="React - Modern frontend JavaScript library"
                    className="w-32 h-32 mx-auto drop-shadow-lg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Safety Without Paranoia */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              Safety Without Paranoia
            </h2>
            <h3
              className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}
            >
              Serious Protection with Playful Approach
            </h3>

            <p className={typographyPatterns.description}>
              Great coaching pushes you appropriately, never recklessly. Our
              multi-layer safety system ensures your AI coach maintains that
              perfect balance—challenging enough to drive progress, protective
              enough to prevent injury. We've built safety into the core
              architecture, not as an afterthought.
            </p>

            <div className="space-y-8">
              {/* Intelligent Safety Validation */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}
                >
                  Intelligent Safety Validation
                </h4>
                <p className={`${typographyPatterns.description} mb-6`}>
                  Every piece of coaching advice goes through sophisticated
                  checks before reaching you:
                </p>
                <ol className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      1.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Exercise Appropriateness:
                      </strong>{" "}
                      Is this suitable for your experience level and current
                      capabilities?
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      2.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Progression Logic:
                      </strong>{" "}
                      Does this follow safe advancement principles without
                      jumping too far ahead?
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      3.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Methodology Alignment:
                      </strong>{" "}
                      Is this grounded in proven training principles?
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      4.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Injury Risk Assessment:
                      </strong>{" "}
                      Does this consider your movement patterns and any
                      limitations you've mentioned?
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      5.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Volume & Intensity Checks:
                      </strong>{" "}
                      Are training loads appropriate for your recovery capacity
                      and training history?
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      6.
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-pink">
                        Tool-Based Blocking:
                      </strong>{" "}
                      Agent validation tools prevent saving incomplete or
                      potentially harmful recommendations
                    </span>
                  </li>
                </ol>
              </div>

              {/* Expert-Validated Methodology */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}
                >
                  Expert-Validated Methodology
                </h4>
                <p className={`${typographyPatterns.description} mb-4`}>
                  Our training principles are reviewed by certified coaches and
                  experienced athletes across all 8 supported disciplines. We
                  blend cutting-edge AI with time-tested wisdom from established
                  programming methodologies.
                </p>
                <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Discipline-Specific Knowledge:
                      </strong>{" "}
                      Each discipline has its own validated methodology library
                      with proven periodization approaches and programming
                      principles
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Pinecone Methodology Retrieval:
                      </strong>{" "}
                      Semantic search across comprehensive training knowledge
                      bases ensures recommendations are grounded in established
                      science
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-cyan">
                        Continuous Refinement:
                      </strong>{" "}
                      User feedback and outcome tracking help us continuously
                      improve methodology recommendations
                    </span>
                  </li>
                </ul>
              </div>

              {/* Transparent Decision Making */}
              <div>
                <h4
                  className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}
                >
                  Transparent Decision Making
                </h4>
                <p className={`${typographyPatterns.description} mb-4`}>
                  Your coach can explain why it made specific recommendations,
                  helping you learn the "why" behind your programming while
                  building trust in the system. No black boxes—just intelligent
                  coaching you can understand.
                </p>
                <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-purple">
                        Ask "Why":
                      </strong>{" "}
                      Question any recommendation and get clear reasoning based
                      on your goals, history, and training principles
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-purple">
                        Context Awareness:
                      </strong>{" "}
                      Your coach explains how recent workouts, recovery status,
                      and long-term goals influenced today's programming
                    </span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-synthwave-neon-purple">
                        Educational Value:
                      </strong>{" "}
                      Every explanation is an opportunity to learn more about
                      training methodology and become a more informed athlete
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <p
              className={`${typographyPatterns.description} text-lg font-semibold mt-8`}
            >
              <strong className="text-synthwave-neon-pink">The result:</strong>{" "}
              Push hard with confidence, knowing someone's watching your back
              with the expertise of certified coaches and the vigilance of
              intelligent systems.
            </p>
          </section>

          {/* Why This Approach Works */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}
            >
              Why This Approach Works
            </h2>
            <h3
              className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}
            >
              Technology in Service of Humanity
            </h3>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                Most fitness tech companies build cool technology and try to
                make it user-friendly. We started with the human experience we
                wanted to create and built the technology to support it.
              </p>
              <p
                className={`${typographyPatterns.description} text-lg font-semibold`}
              >
                <strong className="text-synthwave-neon-pink">
                  The result:
                </strong>{" "}
                AI coaching that feels natural, responds intelligently, and gets
                better over time—without you needing to understand a single line
                of code or AI principle.
              </p>
            </div>

            {/* Technical Philosophy - Now as regular subsection */}
            <div className="mt-8">
              <h4
                className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-6`}
              >
                Our Technical Philosophy
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 font-rajdhani">
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Complexity Hidden:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Sophisticated multi-agent systems running seamlessly
                        behind simple conversations. You interact with a
                        coach—we handle the orchestration.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Performance Obsessed:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Sub-2-second response times because good coaching flows
                        naturally. No awkward pauses, no spinning wheels—just
                        conversation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Privacy Protected:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Your data stays yours, secured with enterprise-grade
                        encryption. We don't sell data or share training
                        insights.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 font-rajdhani">
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Future-Ready:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Architecture designed to incorporate new AI capabilities
                        as they emerge. As models improve, your coaching
                        improves automatically.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Human-Centric:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Every technical decision evaluated through the lens of
                        user experience. We build what makes coaching better,
                        not what sounds impressive.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">
                      •
                    </span>
                    <div>
                      <strong className="text-synthwave-neon-pink text-lg">
                        Cost-Efficient Intelligence:
                      </strong>
                      <p className="text-synthwave-text-secondary text-lg mt-1">
                        Smart prompt assembly and model selection mean you get
                        best-in-class AI without enterprise pricing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The NeonPanda Difference */}
          <section className="space-y-8">
            <h2
              className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}
            >
              The NeonPanda Difference
            </h2>

            <div className={`${containerPatterns.boldGradient} text-center`}>
              <p
                className={`${typographyPatterns.description} text-lg font-semibold mb-4`}
              >
                At NeonPanda, we believe the best technology disappears into the
                background, leaving you free to focus on what matters most:{" "}
                <strong className="text-white">
                  crushing your goals, building confidence, and having genuine
                  fun with your fitness journey.
                </strong>
              </p>
              <p className={`${typographyPatterns.description} text-base`}>
                We're not building AI for AI's sake—we're creating relationships
                that happen to be powered by artificial intelligence. The tech
                is sophisticated, but the experience is simply... coaching.
              </p>
            </div>

            <div className="text-center mt-12">
              <p
                className={`${typographyPatterns.description} text-lg italic text-synthwave-neon-pink`}
              >
                Ready to experience coaching that's both incredibly smart and
                refreshingly human? Your perfect coach is just a conversation
                away.
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
                  Learn More
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />

      {/* Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute -top-2 -right-2 w-8 h-8 bg-synthwave-neon-pink rounded-full flex items-center justify-center text-white hover:bg-synthwave-neon-pink/80 transition-colors duration-200"
              aria-label="Close image"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Technology;
