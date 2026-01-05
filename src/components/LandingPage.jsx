import React from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
  typographyPatterns,
} from "../utils/ui/uiPatterns";
import Footer from "./shared/Footer";

function LandingPage() {
  // Random hero image selection
  const [heroImage, setHeroImage] = React.useState("");

  // Modal state for feature images
  const [modalImage, setModalImage] = React.useState(null);

  React.useEffect(() => {
    // Select random hero image (1-7)
    const randomImageNumber = Math.floor(Math.random() * 7) + 1;
    setHeroImage(`/images/hero/unsplash-hero-${randomImageNumber}.jpg`);
  }, []);


  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setModalImage(null);
      }
    };

    if (modalImage) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [modalImage]);
  const features = [
    {
      title: "Purpose-built coaches across multiple disciplines",
      subtitle: "Coaches built specifically for you",
      description:
        "Create AI coaches designed around your exact goals, training style, and preferences—whether you're crushing CrossFit WODs, powerlifting PRs, training for HYROX events, improving your running, or building overall fitness. Every coach is custom-built to fit your needs perfectly.",
      imageAlt: "Coach personality customization interface",
      color: "pink",
    },
    {
      title: "Intelligent workout programming & planning",
      subtitle: "Programming that actually makes sense",
      description:
        "Get workouts designed around your goals, available equipment, and current fitness level. Unlike generic fitness apps, your coach belongs only to you. No more wasting money on one-size-fits-all programs—your coach creates programming specifically for you that evolves with your progress.",
      imageAlt: "Workout programming interface",
      color: "cyan",
    },
    {
      title: "Natural language workout logging",
      subtitle: "Just tell your coach what you did",
      description:
        "No rigid forms, searching for exercises, or confusing menus. Describe your workout however feels natural - 'Did Fran in 8:45' or 'Ran 5K, felt great' or 'Bench felt heavy today, hit 225x5.' Your coach understands and learns your unique way of describing workouts, making logging effortless.",
      imageAlt: "Natural language workout input interface",
      color: "cyan",
    },
    {
      title: "Conversational coaching that evolves with you",
      subtitle: "Your ideal coach, electrified and adaptive",
      description:
        "Imagine your favorite coach or the perfect coach you've always wanted—now imagine an electric version that's available 24/7. Have real conversations with coaches who remember your preferences, celebrate your victories, and support you through tough days. Your coach tracks your wins, learns from your struggles, and adapts your programming automatically. Every rep, every PR, every conversation makes your coach smarter about what motivates you and how to help you succeed.",
      imageAlt: "Conversational coaching and progress tracking interface",
      color: "pink",
    },
    {
      title: "Intelligent workout analysis & insights",
      subtitle: "Data-driven coaching that reveals patterns",
      description:
        "Your coach doesn't just log your workouts—it analyzes them for meaningful insights. Track trends in your performance, identify strengths and weaknesses, and get personalized reports that reveal patterns you'd never notice on your own. Turn your workout data into actionable coaching intelligence that drives real progress.",
      imageAlt: "Workout analysis and insights dashboard",
      color: "pink",
    },
    {
      title: "Your Training Grounds - Everything in one place",
      subtitle: "Your personal training grounds hub",
      description:
        "Access all your conversations, workouts, reports, analytics, memories, and preferences in one beautifully organized hub. The Training Grounds is your personal fitness headquarters where you can review your journey, track your progress, and manage your coaching experience. No more scattered data—everything you need is right at your fingertips.",
      imageAlt: "Training Grounds dashboard interface",
      color: "cyan",
    },
    {
      title: "Pre-built coach templates & multiple coaches",
      subtitle: "Ready-made coaches for instant results",
      description:
        "Skip the setup and jump straight into training with our library of pre-built coach templates. Choose from proven coaching styles for CrossFit, powerlifting, running, HYROX, and more. Need different approaches for different goals? Create multiple coaches—one for strength training, another for cardio, and a third for competition prep. Mix and match coaching styles to fit your complete fitness journey.",
      imageAlt: "Coach templates and multi-coach management interface",
      color: "pink",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Full-page background */}
      <div className={`fixed inset-0 ${layoutPatterns.authBackground}`}></div>

      {/* Hero Section */}
      <section
        className="relative z-10 min-h-screen flex flex-col justify-center px-8"
        style={{
          backgroundImage: heroImage
            ? `url(${heroImage})`
            : "url(/images/hero/unsplash-hero-1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Modern overlay with blur effect for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 backdrop-blur-sm"></div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="w-full">
            {/* Main Headline */}
            <h1 className="font-inter font-bold text-7xl md:text-7xl lg:text-8xl xl:text-8xl text-white mb-8 drop-shadow-lg leading-tight text-left">
              Your fitness coach,{" "}
              <span className="text-synthwave-neon-pink">electrified</span>
            </h1>

            {/* Subtitle */}
            <p className={`${typographyPatterns.heroSubtitle} mb-8 text-left w-full lg:w-3/4`}>
              Building the future of personalized AI coaching where your sweat meets electric intelligence to unlock your next fitness frontier. From your first workout to crushing PRs and competitions—get stronger, faster, and more consistent with a coach that's always in your corner.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 items-start w-full lg:w-2/3">
              <Link
                to="/contact?type=waitlist"
                className={buttonPatterns.heroCTA}
              >
                Get Early Access
              </Link>
              <Link
                to="/contact?type=collaborate"
                className={buttonPatterns.secondary}
              >
                Let's Collaborate
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vibrant Gradient Band - Hero Separator */}
      <div className="relative z-10 h-6 bg-gradient-to-r from-synthwave-neon-pink via-synthwave-neon-cyan to-synthwave-neon-purple"></div>

      {/* Challenge + Feature Pairing Section */}
      <section id="challenges" className="relative z-10 py-24 px-8 bg-slate-950/90">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-inter font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6">
              Your reality vs. Your <span className="text-synthwave-neon-pink">AI Coach</span>
            </h2>
            <p className="font-rajdhani text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              See how the NeonPanda platform transforms everyday fitness frustrations into seamless coaching experiences
            </p>
          </div>

          <div className="space-y-16">
            {/* Pair 1: Expensive Personal Trainers vs AI Coach */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">The Expensive Coach Dilemma</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "$150/session with my trainer who cancels last minute, doesn't remember I can't do overhead movements due to my shoulder injury, and gives me the same cookie-cutter program as everyone else..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">24/7 Personalized Coaching</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Your AI coach remembers every detail about your fitness goals, injury history, and training preferences. Never cancels, always available for workout questions, form checks, and program adjustments—at a fraction of the cost of personal training.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Personalized workout programming & periodization
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      24/7 availability for form checks & training questions
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Remembers your injury history & training adaptations
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pair 2: Terrible UX vs Natural Language Logging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 4h10v16H7V4zm2 2v2h6V6H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Workout Logging Hell</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "Spent 15 minutes trying to log a simple CrossFit WOD... endless dropdowns, can't find 'Fran', have to manually enter every movement. The logging took longer than the actual workout!"
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Natural Language Logging</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Log workouts by just telling your coach what you did—your way. No forms, no dropdowns, no searching for exercises. Whether it's "Did Fran in 8:45" or "Hit 315x5 on squats, felt solid"—your coach understands and tracks everything.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Automatic workout analysis & progress tracking
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Works for CrossFit WODs, strength training, cardio, & more
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Learns how you describe exercises & movements
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pair 3: Scattered Data vs Training Grounds Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Data Scattered Everywhere</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "My workouts are in one app, nutrition notes in another, progress pics scattered across my photo roll, and coach conversations buried in email threads. I can't see the full picture of my fitness journey..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Your Training Grounds Hub</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Your complete fitness dashboard. Workout history, training analytics, performance trends, coach conversations, and progress reports—all organized in one place. See your complete training journey from your first workout to your latest achievements.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Complete workout history & performance analytics
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Weekly & monthly training insights reports
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Track strength gains, skill improvements, & consistency
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pair 4: Generic Programming vs Purpose-Built Coaches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">One-Size-Fits-Nobody</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "Whether I'm learning basic movements or training for competitions, this app gives me the same generic workouts as everyone else. I need programming that meets me where I am—beginner fundamentals or competition prep—not one-size-fits-nobody routines..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Purpose-Built for Your Sport</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Create AI coaches built specifically for CrossFit, powerlifting, HYROX, running, or general fitness. Whether you're learning fundamental movements or preparing for elite-level competition, your coach programs for YOUR current level and goals.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Programming for beginners to elite-level athletes
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Sport-specific methodology & periodization
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Adapts from foundation-building to competition prep
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pair 5: Poor Programming vs Intelligent Workout Planning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Random Workout Chaos</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "My app gives me random workouts that don't build on each other. Heavy squats Monday, more squats Tuesday, then suddenly cardio for a week. There's no logical progression or periodization - just chaos..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Intelligent Programming That Makes Sense</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Get intelligent workout programming designed around your specific fitness goals, available equipment, training schedule, and current abilities. Every session builds logically toward your objectives—from building a base to peaking for competitions.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Structured periodization with progressive overload
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Adapts to your equipment, schedule, & recovery needs
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Every workout builds toward your fitness goals
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pair 6: Static Programs vs Adaptive Learning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Challenge Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/60 to-synthwave-bg-secondary/60 backdrop-blur-sm border-l-4 border-synthwave-neon-cyan/60 rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-cyan/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-cyan text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your Reality</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Programs That Never Evolve</h3>
                    </div>
                  </div>
                  <div className="bg-synthwave-bg-primary/20 rounded-lg p-4 border border-synthwave-neon-cyan/10">
                    <p className="text-white/90 italic text-lg font-rajdhani leading-relaxed">
                      "I've been crushing these weights for months but my program never adjusts. I'm hitting PRs left and right, but still getting beginner programming. Meanwhile, when I'm struggling, it never scales back..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-secondary/80 backdrop-blur-sm border-l-4 border-synthwave-neon-pink rounded-xl p-8 h-full shadow-xl shadow-synthwave-neon-pink/10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-synthwave-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-synthwave-neon-pink text-sm font-rajdhani font-semibold uppercase tracking-wider mb-1">Your AI Coach</p>
                      <h3 className="text-white text-xl font-inter font-bold mb-3">Smart Progress Tracking & Adaptation</h3>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg font-rajdhani leading-relaxed mb-4">
                    Your coach analyzes every workout, tracks your performance trends, and adapts your training automatically. Hitting strength milestones? Your programming progresses. Showing signs of fatigue? Your coach scales back intelligently. Real coaching that evolves with your fitness journey.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Tracks performance trends & strength progressions
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Adjusts training based on recovery & fatigue signals
                    </li>
                    <li className="flex items-center gap-2 text-synthwave-neon-pink text-base font-rajdhani">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Learns your optimal training intensity & volume
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="font-rajdhani text-2xl text-white/90 italic mb-8">
              Ready to transform your fitness frustrations into seamless coaching?
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/contact?type=waitlist"
                className={buttonPatterns.heroCTA}
              >
                Get Early Access
              </Link>
              <Link
                to="/contact?type=collaborate"
                className={buttonPatterns.secondary}
              >
                Let's Collaborate
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-8 border-t border-synthwave-neon-cyan/20">
        {/* Top gradient shadow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/20 via-black/10 to-transparent pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-32">
            <h2 className="font-inter font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6">
              Real <span className="text-synthwave-neon-pink">fitness coaching</span> that drives real results
            </h2>
            <p className="font-rajdhani text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              We're not just building AI coaches – we're creating relationships
              that transform lives, one workout and one conversation at a time.
            </p>
          </div>

          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center ${index === features.length - 1 ? "mb-24" : "mb-40"} gap-16 relative`}
            >
              {/* Content */}
              <div className="flex-1">
                <h3
                  className={`font-inter font-bold text-3xl md:text-4xl lg:text-5xl mb-4 ${
                    index % 2 === 0
                      ? "text-synthwave-neon-pink"
                      : "text-synthwave-neon-cyan"
                  }`}
                >
                  {feature.subtitle}
                </h3>
                <p className={`${typographyPatterns.description} text-xl`}>
                  {feature.description}
                </p>
              </div>

              {/* Fading Vertical Line */}
              <div className="hidden lg:block absolute left-1/2 -top-24 -bottom-24 w-px transform -translate-x-1/2">
                <div className="h-full w-full bg-gradient-to-b from-transparent via-white to-transparent opacity-30"></div>
              </div>

              {/* Screenshot */}
              <div className="flex-1 relative">
                {/* Ethereal background glow */}
                <div
                  className={`absolute inset-0 -m-8 md:-m-16 ${
                    index % 2 === 0
                      ? "bg-synthwave-neon-pink/15"
                      : "bg-synthwave-neon-cyan/15"
                  } rounded-full blur-3xl`}
                ></div>

                {/* Content */}
                <div className="relative z-10 h-120 flex items-center justify-center">
                  {index === 0 || index === 1 || index === 2 || index === 3 || index === 4 || index === 5 || index === 6 ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={`/images/features/feature-${index + 1}.png`}
                        alt={feature.imageAlt}
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl cursor-zoom-in hover:shadow-3xl transition-shadow duration-300"
                        onClick={() => setModalImage({
                          src: `/images/features/feature-${index + 1}.png`,
                          alt: feature.imageAlt
                        })}
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <div
                        className={`w-16 h-16 ${
                          index % 2 === 0
                            ? "bg-synthwave-neon-pink/20"
                            : "bg-synthwave-neon-cyan/20"
                        } rounded-xl mx-auto mb-4 flex items-center justify-center`}
                      >
                        <span
                          className={`${
                            index % 2 === 0
                              ? "text-synthwave-neon-pink"
                              : "text-synthwave-neon-cyan"
                          } font-russo font-bold text-xl`}
                        >
                          NP
                        </span>
                      </div>
                      <p className="font-rajdhani text-synthwave-text-muted font-medium">
                        {feature.imageAlt}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="relative z-10 py-24 px-8 bg-slate-950/90 border-t border-synthwave-neon-cyan/20">
        {/* Top gradient shadow for visual separation */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/10 via-black/5 to-transparent pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-inter font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-6">
              Get started in minutes
            </h2>
            <p className="font-rajdhani text-2xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              From signup to your first personalized workout in just a few
              simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: "Sign up",
                description: "Get early access in seconds with your email",
                color: "pink",
              },
              {
                step: 2,
                title: "Create your coach",
                description: "Build custom or choose from proven templates",
                color: "cyan",
              },
              {
                step: 3,
                title: "Start conversations",
                description: "Chat naturally with your AI coach about goals",
                color: "pink",
              },
              {
                step: 4,
                title: "Save memories",
                description: "Your coach learns your preferences and style",
                color: "cyan",
              },
              {
                step: 5,
                title: "Log workouts",
                description:
                  "Track progress effortlessly with natural language",
                color: "pink",
              },
              {
                step: 6,
                title: "Get smarter coaching",
                description: "Watch your coach adapt and improve over time",
                color: "cyan",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                {/* Step Number Circle */}
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    item.color === "pink"
                      ? "bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink"
                      : "bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan"
                  }`}
                >
                  <span
                    className={`font-inter font-bold text-xl ${
                      item.color === "pink"
                        ? "text-synthwave-neon-pink"
                        : "text-synthwave-neon-cyan"
                    }`}
                  >
                    {item.step}
                  </span>
                </div>

                {/* Step Title */}
                <h3
                  className={`font-inter font-bold text-xl md:text-2xl mb-3 ${
                    item.color === "pink"
                      ? "text-synthwave-neon-pink"
                      : "text-synthwave-neon-cyan"
                  }`}
                >
                  {item.title}
                </h3>

                {/* Step Description */}
                <p className={`${typographyPatterns.description} text-base`}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vibrant Gradient Band */}
      <div className="relative z-10 h-24 bg-gradient-to-r from-synthwave-neon-pink via-synthwave-neon-cyan to-synthwave-neon-purple"></div>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-8">
        {/* Top gradient shadow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/20 via-black/10 to-transparent pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="font-inter font-bold text-5xl md:text-6xl lg:text-7xl text-white mb-8">
            Ready to meet your <span className="text-synthwave-neon-pink">perfect coach</span>?
          </h2>
          <p className={`${typographyPatterns.description} text-xl mb-8`}>
            NeonPanda is reshaping digital fitness coaching forever. Be among the first to experience next-generation AI fitness coaching, help shape the platform,and gain exclusive access to features before they're available to the public.
          </p>

          <p className={`${typographyPatterns.description} text-xl mb-8`}>
            Join the OG community that's building the future of personalized fitness coaching. Your feedback will directly influence how millions of people train in the years to come. Ready to be part of the fitness coaching revolution?
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/contact?type=waitlist"
              className={buttonPatterns.heroCTA}
            >
              Get Early Access
            </Link>
            <Link
              to="/contact?type=collaborate"
              className={buttonPatterns.secondary}
            >
              Let's Collaborate
            </Link>
          </div>

          {/* Launch Info */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm font-rajdhani text-synthwave-text-secondary mt-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full animate-pulse"></div>
              <span>Launch: Late 2025</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-pulse"></div>
              <span>Starting with CrossFit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-purple rounded-full animate-pulse"></div>
              <span>Built for Everyone</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Image Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setModalImage(null)}
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
              onClick={() => setModalImage(null)}
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

export default LandingPage;
