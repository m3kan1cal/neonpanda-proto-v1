import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns
} from '../utils/uiPatterns';
import Footer from './shared/Footer';

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
      if (e.key === 'Escape') {
        setModalImage(null);
      }
    };

    if (modalImage) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [modalImage]);

  const openModal = (imageSrc, imageAlt) => {
    setModalImage({ src: imageSrc, alt: imageAlt });
  };

  const closeModal = () => {
    setModalImage(null);
  };

  const handleJoinWaitlist = () => {
    navigate('/contact?type=waitlist');
  };

  const handleContactUs = () => {
    navigate('/contact?type=general');
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={typographyPatterns.pageTitle}>
            Our Technology <span className="text-synthwave-neon-pink">Platform</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Where electric intelligence meets approachable excellence. Discover the sophisticated AI coaching ecosystem that delivers expert-level guidance through naturally intuitive conversations.
          </p>
        </div>

        {/* Main Content */}
        <div className={`${containerPatterns.mainContent} p-8 md:p-12 space-y-16`}>

          {/* Philosophy Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Our Philosophy: Invisible Complexity, Obvious Results
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                Here's the thing about great technology: it should feel like magic, not work.
              </p>
              <p className={typographyPatterns.description}>
                At NeonPanda, we've built something pretty incredible under the hood—a sophisticated AI coaching ecosystem that would make any tech nerd's heart race. But here's what matters more: <strong className="text-synthwave-neon-pink">it feels as natural as texting your most knowledgeable gym buddy.</strong>
              </p>
              <p className={typographyPatterns.description}>
                Our core principle? The most advanced AI shouldn't intimidate—it should inspire, adapt, and occasionally make you laugh while crushing your PRs.
              </p>
            </div>
          </section>

          {/* The Magic Behind Your Coach */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              The Magic Behind Your Coach
            </h2>
            <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
              Three AI Agents Working in Perfect Harmony
            </h3>
            <p className={typographyPatterns.description}>
              Unlike those basic fitness chatbots that spit out generic workouts, NeonPanda runs on a sophisticated <strong className="text-synthwave-neon-pink">multi-agent AI system</strong>. Think of it as your personal coaching staff—each specialist doing what they do best, seamlessly coordinating to create your perfect training experience.
            </p>

            <div className="space-y-12">
              {/* Coach Creator Agent */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-pink">1</span>
                  </div>
                  <div>
                    <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl`}>
                      The Coach Creator Agent
                    </h4>
                    <p className={`${typographyPatterns.description} text-synthwave-neon-pink italic text-sm`}>
                      "The Personality Detective"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">What it does:</strong> Conducts those surprisingly enjoyable conversations that figure out exactly what kind of coach you need
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">How it works:</strong> Through adaptive interviews that feel more like coffee chats with a perceptive friend, this agent discovers your goals, personality quirks, training history, and what actually motivates you (spoiler: it's probably not generic "you got this!" messages)
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">The magic:</strong> It automatically adjusts its conversation style based on whether you're a complete beginner or someone who knows what a Bulgarian split squat is without crying
                  </p>
                </div>
              </div>

              {/* Coach Agents */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">2</span>
                  </div>
                  <div>
                    <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl`}>
                      Your Coach Agents
                    </h4>
                    <p className={`${typographyPatterns.description} text-synthwave-neon-cyan italic text-sm`}>
                      "Your Training Soulmates"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">What they do:</strong> Two specialized agents work together as your daily training partners—the Coach Agent handles programming and methodology, while the Conversation Agent manages your ongoing relationship and context
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">How they work:</strong> Generated from your Coach Creator conversation, each coach has its own distinct personality, knowledge base, and coaching style. The Coach Agent draws from training methodologies while the Conversation Agent maintains your relationship history and preferences—like having a human coach who never forgets anything and is available 24/7
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">The magic:</strong> This coordination creates seamless coaching experiences where Marcus explains biomechanics differently than Emma, and both remember your conversation from last Tuesday about your shoulder feeling tweaky
                  </p>
                </div>
              </div>

              {/* Safety Agent */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {/* Agent Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-purple">3</span>
                  </div>
                  <div>
                    <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl`}>
                      The Safety Agent
                    </h4>
                    <p className={`${typographyPatterns.description} text-synthwave-neon-purple italic text-sm`}>
                      "Your Invisible Training Guardian"
                    </p>
                  </div>
                </div>
                <div className="space-y-4 ml-20">
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-pink">What it does:</strong> Acts as your behind-the-scenes safety net, validating every piece of coaching advice before it reaches you
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-cyan">How it works:</strong> Runs sophisticated checks on exercise appropriateness, progression logic, methodology alignment, and injury risk—all without interrupting your coaching flow
                  </p>
                  <p className={typographyPatterns.description}>
                    <strong className="text-synthwave-neon-purple">The magic:</strong> Ensures your coach's enthusiasm never compromises your safety, while maintaining the natural feel of human coaching
                  </p>
                </div>
              </div>

              {/* Supporting Cast */}
              <div className={containerPatterns.mediumGlass}>
                <div className="mb-4">
                  <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-2`}>
                    The Supporting Cast: Behind-the-Scenes Intelligence
                  </h4>
                  <p className={`${typographyPatterns.description} text-synthwave-neon-cyan italic text-sm`}>
                    "The Digital Ecosystem You Never See"
                  </p>
                </div>
                <p className={`${typographyPatterns.description} mb-6`}>
                  While those three agents handle your direct coaching experience, there's an entire <strong className="text-synthwave-neon-pink">orchestrated ecosystem of specialized AI agents</strong> working behind the scenes to make everything seamless:
                </p>
                <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Memory Management Agents:</strong> Constantly organizing and updating your conversation history, training patterns, and preferences so your coach always has perfect context</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Workout Management Agents:</strong> Tracking your program progression, scheduling adaptations, and ensuring your training phases flow logically over weeks and months</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Reporting & Analytics Agents:</strong> Analyzing your progress patterns, generating insights, and preparing those satisfying progress summaries that make you realize how far you've come</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Integration Agents:</strong> Coordinating data from various sources (sleep tracking, nutrition apps, wearables) to give your coach a complete picture of your health and recovery</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Quality Assurance Agents:</strong> Continuously monitoring coaching effectiveness, user satisfaction patterns, and system performance to improve the entire platform</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">Communication Orchestration Agents:</strong> Managing notification timing, message prioritization, and ensuring you get the right information at exactly the right moment</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-cyan">System Maintenance & Automation:</strong> n8n automated workflows powered by agentic AI constantly monitor system health, optimize performance, and handle routine maintenance tasks</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <p className={typographyPatterns.description}>
                This creates a comprehensive system where specialized AI agents handle different aspects of your coaching experience—from managing your conversation history and workout progression to coordinating data from various sources and ensuring system reliability—all working together seamlessly in the background.
              </p>
              <p className={`${typographyPatterns.description} text-lg font-semibold`}>
                <strong className="text-synthwave-neon-pink">The result:</strong> Multiple layers of intelligence working together to create what feels like a single, intuitive coaching relationship.
              </p>
            </div>
          </section>

          {/* Your Data, Elevated */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Your Data, Elevated
            </h2>
            <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
              Making Every Workout Smarter Than the Last
            </h3>

            {/* Architecture Overview Placeholder */}
            <p className={typographyPatterns.description}>
              At NeonPanda, we've architected a cutting-edge fitness AI platform that combines the best of serverless computing with sophisticated AI orchestration to deliver personalized coaching experiences that rival human trainers. Our AWS-native architecture centers around a revolutionary multi-agent system—featuring specialized Coach Creator, Coach Agent, and Safety Agent AI components—all built on a foundation of Lambda functions that auto-scale from zero to thousands of concurrent users without missing a beat.
            </p>

            <p className={typographyPatterns.description}>
              What sets us apart is our innovative hybrid data strategy: we use DynamoDB's lightning-fast queries for real-time user interactions while leveraging S3's cost-effective storage for rich conversation histories, achieving a 90% reduction in storage costs compared to traditional approaches. The magic happens through our integration of AWS Bedrock and Pinecone vector search, enabling our AI coaches to access methodology knowledge and conversation context in under 2 seconds, creating coaching interactions that feel remarkably human. This serverless-first architecture doesn't just handle scale gracefully—it transforms our founder's deep AWS expertise into a sustainable competitive moat, allowing us to deliver enterprise-grade AI coaching features at consumer-friendly prices while maintaining the technical sophistication that larger competitors with generic cloud solutions simply can't match.
            </p>

            {/* Architecture Diagram */}
            <div className="my-8 text-center">
              <img
                src="/images/diagrams/architecture-v1.png"
                alt="NeonPanda AWS Architecture Overview - Multi-agent AI system built on serverless infrastructure"
                className="mx-auto rounded-xl shadow-lg cursor-zoom-in hover:shadow-xl transition-shadow duration-300 max-w-2xl"
                onClick={() => openModal('/images/diagrams/architecture-v1.png', 'NeonPanda AWS Architecture Overview - Multi-agent AI system built on serverless infrastructure')}
              />
            </div>

            <p className={typographyPatterns.description}>
              We've designed our data architecture like a coach's perfect memory—capturing everything that matters while making it instantly accessible when needed.
            </p>

            <div className="space-y-12">
              {/* DynamoDB - High-Speed Structured Data */}
              <div>
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}>
                  DynamoDB: Lightning-Fast Structured Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For frequently accessed data that needs instant retrieval—workout records, progress metrics, user preferences, and real-time performance tracking. <strong className="text-synthwave-neon-pink">DynamoDB's single-digit millisecond response times</strong> ensure your coach can instantly access your last workout, current PRs, or training patterns without any delay.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-pink">Perfect for:</strong> Workout logs, exercise history, performance metrics, user settings, active coaching sessions
                      </p>
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-pink">Why this matters:</strong> Your coach remembers your deadlift PR from six months ago and notices performance patterns you might miss—all in real-time.
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
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}>
                  S3 Buckets: Deep Storage for Rich Context
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For comprehensive conversation archives, detailed workout analysis reports, historical coaching sessions, and rich media content. <strong className="text-synthwave-neon-cyan">S3's virtually unlimited storage</strong> preserves your entire coaching relationship history while keeping costs optimized for infrequently accessed data.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-cyan">Perfect for:</strong> Full conversation transcripts, detailed workout analyses, progress photos, coaching methodology documents, historical reports
                      </p>
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-cyan">Why this matters:</strong> Every conversation, every insight, every piece of your coaching journey is preserved and retrievable when context is needed.
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
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}>
                  Pinecone: Intelligent Semantic Retrieval
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2">
                    <p className={typographyPatterns.description}>
                      For semantic similarity searches and contextual AI retrieval—finding relevant training methodologies, matching similar situations from your history, and connecting related concepts across vast knowledge bases. <strong className="text-synthwave-neon-purple">Pinecone's vector similarity search</strong> enables your coach to understand meaning, not just keywords.
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-purple">Perfect for:</strong> Training methodology libraries, contextual conversation retrieval, exercise variation matching, injury history correlation, goal-based program suggestions
                      </p>
                      <p className={`${typographyPatterns.description} text-base`}>
                        <strong className="text-synthwave-neon-purple">Why this matters:</strong> When you mention "shoulder feels tweaky," your coach instantly connects to relevant methodology, your injury history, and appropriate exercise modifications.
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
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Built on Rock-Solid Foundations
            </h2>
            <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}>
              Enterprise-Grade Technology with Neighborhood Gym Vibes
            </h3>

            {/* AWS Native Architecture */}
            <div>
              <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}>
                Amazon Web Services (AWS) Native Architecture
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <p className={`${typographyPatterns.description} mb-6`}>
                    Why AWS? Because when you're building something this sophisticated, you need infrastructure that scales beautifully:
                  </p>
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-cyan">99.9% Uptime:</strong> Your coach is always available, even during your 5 AM workout motivation crisis</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-cyan">Sub-2-Second Response Times:</strong> Conversations flow naturally without awkward AI-thinking pauses</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-cyan">Global Performance:</strong> Fast and reliable whether you're training in New York or New Zealand</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-cyan">Bank-Level Security:</strong> Your training data is protected with the same encryption banks use for your money</span>
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
              <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}>
                Advanced AI Model Orchestration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <p className={`${typographyPatterns.description} mb-4`}>
                    <strong className="text-synthwave-neon-pink">Multi-Model AI Ecosystem:</strong> We leverage the latest and greatest AI models through <strong className="text-synthwave-neon-pink">Amazon Bedrock Runtime APIs:</strong>
                  </p>
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-pink">Claude Sonnet 4:</strong> Our primary conversational engine for natural coaching interactions</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-pink">Claude 3.5 Haiku:</strong> Lightning-fast responses for quick questions and real-time feedback</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-pink">Claude Opus 4.1:</strong> Deep reasoning for complex program design and methodology application</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-pink">Nova Micro:</strong> Specialized tasks requiring ultra-efficient processing</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-pink">Additional Specialized Models:</strong> Custom-selected models optimized for specific coaching functions like nutrition analysis, form assessment, and progress prediction</span>
                    </li>
                  </ul>
                  <div className="mt-6 space-y-4">
                    <p className={typographyPatterns.description}>
                      <strong className="text-synthwave-neon-pink">AWS Bedrock Integration:</strong> Seamless access to multiple AI models through unified APIs, enabling us to choose the perfect model for each coaching task without you ever noticing the complexity
                    </p>
                    <p className={typographyPatterns.description}>
                      <strong className="text-synthwave-neon-pink">Custom Prompt Engineering:</strong> Hundreds of hours fine-tuning each model's coaching personalities to feel authentic, not robotic—whether you're getting quick motivation from Haiku or deep program analysis from Opus
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
              <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}>
                Modern Frontend Experience
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-purple">Progressive Web App:</strong> Near-native mobile experience without app store friction—bookmark it and go</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-purple">React + Vite:</strong> Lightning-fast, mobile-first interface that works beautifully on any device</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                      <span><strong className="text-synthwave-neon-purple">Offline Capabilities:</strong> Key features work even when gym WiFi doesn't</span>
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
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Safety Without Paranoia
            </h2>
            <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
              Serious Protection with Playful Approach
            </h3>

            <p className={typographyPatterns.description}>
              Great coaching pushes you appropriately, never recklessly. Our multi-layer safety system ensures your AI coach maintains that perfect balance.
            </p>

            <div className="space-y-8">
              {/* Intelligent Safety Validation */}
              <div>
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}>
                  Intelligent Safety Validation
                </h4>
                <p className={`${typographyPatterns.description} mb-6`}>
                  Every piece of coaching advice goes through sophisticated checks:
                </p>
                <ol className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">1.</span>
                    <span><strong className="text-synthwave-neon-pink">Exercise Appropriateness:</strong> Is this suitable for your experience level and current capabilities?</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">2.</span>
                    <span><strong className="text-synthwave-neon-pink">Progression Logic:</strong> Does this follow safe advancement principles without jumping too far ahead?</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">3.</span>
                    <span><strong className="text-synthwave-neon-pink">Methodology Alignment:</strong> Is this grounded in proven training principles?</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">4.</span>
                    <span><strong className="text-synthwave-neon-pink">Injury Risk Assessment:</strong> Does this consider your movement patterns and any limitations you've mentioned?</span>
                  </li>
                </ol>
              </div>

              {/* Expert-Validated Methodology */}
              <div>
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}>
                  Expert-Validated Methodology
                </h4>
                <p className={typographyPatterns.description}>
                  Our training principles are reviewed by certified coaches and experienced athletes. We blend cutting-edge AI with time-tested wisdom.
                </p>
              </div>

              {/* Transparent Decision Making */}
              <div>
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}>
                  Transparent Decision Making
                </h4>
                <p className={typographyPatterns.description}>
                  Your coach can explain why it made specific recommendations, helping you learn the "why" behind your programming while building trust in the system.
                </p>
              </div>
            </div>

            <p className={`${typographyPatterns.description} text-lg font-semibold mt-8`}>
              <strong className="text-synthwave-neon-pink">The result:</strong> Push hard with confidence, knowing someone's watching your back.
            </p>
          </section>


          {/* Why This Approach Works */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Why This Approach Works
            </h2>
            <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}>
              Technology in Service of Humanity
            </h3>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                Most fitness tech companies build cool technology and try to make it user-friendly. We started with the human experience we wanted to create and built the technology to support it.
              </p>
              <p className={`${typographyPatterns.description} text-lg font-semibold`}>
                <strong className="text-synthwave-neon-pink">The result:</strong> AI coaching that feels natural, responds intelligently, and gets better over time—without you needing to understand a single line of code or AI principle.
              </p>
            </div>

            {/* Technical Philosophy */}
            <div className={containerPatterns.cardMinimal}>
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-lg`}>
                  Our Technical Philosophy
                </h4>
              </div>
              <ul className="space-y-2 text-synthwave-text-primary font-rajdhani text-base ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Complexity Hidden:</strong> <span className="text-synthwave-text-secondary">Sophisticated multi-agent systems running seamlessly behind simple conversations</span></span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Performance Obsessed:</strong> <span className="text-synthwave-text-secondary">Sub-2-second response times because good coaching flows naturally</span></span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Privacy Protected:</strong> <span className="text-synthwave-text-secondary">Your data stays yours, secured with enterprise-grade encryption</span></span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Future-Ready:</strong> <span className="text-synthwave-text-secondary">Architecture designed to incorporate new AI capabilities as they emerge</span></span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Human-Centric:</strong> <span className="text-synthwave-text-secondary">Every technical decision evaluated through the lens of user experience</span></span>
                </li>
              </ul>
            </div>
          </section>

          {/* The NeonPanda Difference */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              The NeonPanda Difference
            </h2>

            <div className={`${containerPatterns.boldGradient} text-center`}>
              <p className={`${typographyPatterns.description} text-lg font-semibold mb-4`}>
                At NeonPanda, we believe the best technology disappears into the background, leaving you free to focus on what matters most: <strong className="text-white">crushing your goals, building confidence, and having genuine fun with your fitness journey.</strong>
              </p>
              <p className={`${typographyPatterns.description} text-base`}>
                We're not building AI for AI's sake—we're creating relationships that happen to be powered by artificial intelligence. The tech is sophisticated, but the experience is simply... coaching.
              </p>
            </div>

            <div className="text-center mt-12">
              <p className={`${typographyPatterns.description} text-lg italic text-synthwave-neon-pink`}>
                Ready to experience coaching that's both incredibly smart and refreshingly human? Your perfect coach is just a conversation away.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
                <button
                  onClick={handleJoinWaitlist}
                  className={`${buttonPatterns.heroCTA} min-w-48`}
                >
                  Get Early Access
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

          {/* Technical Notes */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Technical Notes for the Curious
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Architecture Highlights */}
              <div className={containerPatterns.cardMinimal}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                  <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-lg`}>
                    Architecture Highlights
                  </h4>
                </div>
                <ul className="space-y-2 text-synthwave-text-primary font-rajdhani text-base ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Multi-Agent AI System:</strong> <span className="text-synthwave-text-secondary">Coach Creator, dual Coach Agents (Coach + Conversation), and Safety Agent as primary user-facing agents</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Ecosystem Orchestration:</strong> <span className="text-synthwave-text-secondary">Memory management, workout management, reporting, integration, QA, and communication agents</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Automated Operations:</strong> <span className="text-synthwave-text-secondary">n8n workflows with agentic AI for system maintenance and optimization</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Hybrid Data Architecture:</strong> <span className="text-synthwave-text-secondary">DynamoDB (single-digit ms), Pinecone (vector similarity), S3 (unlimited storage)</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">AWS-Native Infrastructure:</strong> <span className="text-synthwave-text-secondary">99.9% uptime, global performance, bank-level security</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Progressive Web App:</strong> <span className="text-synthwave-text-secondary">React + Vite frontend with offline capabilities and mobile-first design</span></span>
                  </li>
                </ul>
              </div>

              {/* AI Models */}
              <div className={containerPatterns.cardMinimal}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                  <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-lg`}>
                    AI Models
                  </h4>
                </div>
                <ul className="space-y-2 text-synthwave-text-primary font-rajdhani text-base ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Primary Conversational:</strong> <span className="text-synthwave-text-secondary">Claude Sonnet 4 for natural coaching interactions</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Fast Response:</strong> <span className="text-synthwave-text-secondary">Claude 3.5 Haiku for real-time feedback and quick questions</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Deep Reasoning:</strong> <span className="text-synthwave-text-secondary">Claude Opus 4.1 for complex program design and methodology application</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Specialized Processing:</strong> <span className="text-synthwave-text-secondary">Nova Micro and other task-specific models</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Unified Access:</strong> <span className="text-synthwave-text-secondary">All models accessed through AWS Bedrock Runtime APIs for seamless orchestration</span></span>
                  </li>
                </ul>
              </div>

              {/* Data Security */}
              <div className={containerPatterns.cardMinimal}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                  <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-lg`}>
                    Data Security
                  </h4>
                </div>
                <ul className="space-y-2 text-synthwave-text-primary font-rajdhani text-base ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Encryption:</strong> <span className="text-synthwave-text-secondary">End-to-end encryption with bank-level security standards</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Privacy:</strong> <span className="text-synthwave-text-secondary">Data minimization principles with complete user control and transparency</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Compliance:</strong> <span className="text-synthwave-text-secondary">HIPAA-ready architecture with enterprise-grade data protection</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Safety Validation:</strong> <span className="text-synthwave-text-secondary">Multi-layer safety system with exercise appropriateness and injury risk assessment</span></span>
                  </li>
                </ul>
              </div>

              {/* Performance */}
              <div className={containerPatterns.cardMinimal}>
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                  <h4 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-lg`}>
                    Performance
                  </h4>
                </div>
                <ul className="space-y-2 text-synthwave-text-primary font-rajdhani text-base ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Response Time:</strong> <span className="text-synthwave-text-secondary">Sub-2-second average for all user interactions (DynamoDB single-digit ms)</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Uptime:</strong> <span className="text-synthwave-text-secondary">99.9% availability target with multi-region redundancy and global performance</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Scalability:</strong> <span className="text-synthwave-text-secondary">Serverless AWS architecture supporting growth from hundreds to hundreds of thousands</span></span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Technology Philosophy:</strong> <span className="text-synthwave-text-secondary">Invisible complexity with obvious results - sophisticated tech that feels natural</span></span>
                  </li>
                </ul>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Technology;
