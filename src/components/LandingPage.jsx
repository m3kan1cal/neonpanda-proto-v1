import React from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder, GlitchText } from './themes/SynthwaveComponents';

function LandingPage() {
  return (
    <div className={`${themeClasses.container} border-0 m-0`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-48 px-8 text-center min-h-screen flex flex-col justify-center bg-synthwave-gradient before:absolute before:inset-0 before:bg-gradient-to-br before:from-synthwave-neon-pink/10 before:via-transparent before:to-synthwave-neon-cyan/10 before:pointer-events-none border-none outline-none" style={{backgroundImage: 'url(images/hero-splash-1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay'}}>
        <div className="absolute inset-0 bg-synthwave-bg-primary/60"></div>
        <div className="relative z-10">
          <h1 className="font-russo font-black text-5xl md:text-6xl lg:text-7xl text-white mb-8 drop-shadow-lg">
            Your Fitness Journey is Unique. Your Coach Should Be Too.
          </h1>
          <h2 className={`${themeClasses.heroSubtitle} max-w-5xl mx-auto`}>
            Stop following generic workout programs. Create an AI coach that understands your goals, adapts to your progress, and is available whenever you need guidance—without the elite-level price tag.
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
            <button className={themeClasses.neonButton}>
              Join the Waitlist - Launch Late 2025
            </button>
            <button className={themeClasses.cyanButton}>
              Interested in Collaborating? Let's Connect
            </button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 relative bg-gradient-to-br from-synthwave-bg-primary via-synthwave-bg-primary to-synthwave-bg-secondary">
        <div className="absolute inset-0 grid-bg opacity-10"></div>
        <div className="max-w-7xl mx-auto px-8">
            <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-16 text-center uppercase">
              The Problem with Most Fitness Apps
            </h2>

          <div className={themeClasses.cardGrid}>
            <div className={`${themeClasses.glowCard} border-synthwave-neon-pink/30 hover:border-synthwave-neon-pink`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-pink`}>
                Generic Programs Don't Work
              </h3>
              <p className={themeClasses.cardText}>
                One-size-fits-all workouts ignore your unique goals, schedule, injuries, and preferences. You end up frustrated with programs that don't fit your life.
              </p>
            </div>

            <div className={`${themeClasses.glowCard} border-synthwave-neon-cyan/30 hover:border-synthwave-neon-cyan`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-cyan`}>
                Great Coaches Are Expensive & Unavailable
              </h3>
              <p className={themeClasses.cardText}>
                Personal trainers cost $100+ per session, and even then, they're not available when you have questions at 6 AM or need motivation on a tough day.
              </p>
            </div>

            <div className={`${themeClasses.glowCard} border-synthwave-neon-purple/30 hover:border-synthwave-neon-purple`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-purple`}>
                Cookie-Cutter AI Feels Robotic
              </h3>
              <p className={themeClasses.cardText}>
                Existing fitness apps give you the same scripted responses as everyone else. They don't understand your training history or adapt to how you actually progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-gradient-to-r from-synthwave-bg-secondary via-purple-900/20 to-synthwave-bg-secondary border-t border-synthwave-neon-purple/20">
        <div className="max-w-7xl mx-auto px-8">
                      <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-8 text-center uppercase">
              Finally, An AI Coach Built Just for You
            </h2>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary mb-16 max-w-4xl mx-auto text-center leading-relaxed">
            Create your perfect AI fitness coach from scratch. Design how it communicates, what methodologies it follows, and how it adapts to your unique journey. Get personalized programming, motivation, and guidance that evolves as you do.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <NeonBorder color="pink" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-pink mb-4 uppercase">Completely Customizable</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Build your AI coach's personality, communication style, and training philosophy. Want a tough-love motivator or an encouraging supporter? You decide.
              </p>
            </NeonBorder>

            <NeonBorder color="cyan" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-cyan mb-4 uppercase">Learns & Adapts</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Your coach gets smarter with every workout, adjusting to your progress, preferences, and life changes. No more static programs that don't evolve.
              </p>
            </NeonBorder>

            <NeonBorder color="purple" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-purple mb-4 uppercase">Built on Proven Methods</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Choose from training approaches inspired by elite methodologies like Mayhem, PRVN, and CompTrain—or create your own hybrid approach.
              </p>
            </NeonBorder>

            <NeonBorder color="pink" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-pink mb-4 uppercase">Available 24/7</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Get instant answers to your questions, motivation when you need it, and programming that fits your schedule. Your coach never sleeps.
              </p>
            </NeonBorder>

            <NeonBorder color="cyan" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-cyan mb-4 uppercase">Advanced Yet Simple</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Sophisticated AI architecture that delivers intelligent coaching through an intuitive, easy-to-use interface. No tech degree required.
              </p>
            </NeonBorder>

            <NeonBorder color="purple" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-purple mb-4 uppercase">Secure & Private</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Your personal fitness data, goals, and conversations stay completely private. Enterprise-grade security ensures your information is protected.
              </p>
            </NeonBorder>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 relative bg-gradient-to-bl from-cyan-900/20 via-synthwave-bg-primary to-pink-900/20 border-t border-synthwave-neon-cyan/20">
        <div className="absolute inset-0 grid-bg opacity-15"></div>
        <div className="max-w-7xl mx-auto px-8">
                      <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-16 text-center uppercase">
              Three Steps to Your Perfect AI Coach
            </h2>

          <div className="space-y-16">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-3/5">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-synthwave-neon-pink rounded-full border-2 border-synthwave-neon-pink flex items-center justify-center font-russo font-bold text-synthwave-bg-primary mr-6">
                    1
                  </div>
                  <h3 className="font-russo text-2xl text-synthwave-neon-pink uppercase">Design Your Coach</h3>
                </div>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed mb-4">
                  <strong>Tell us about your goals, experience, and preferences.</strong> Answer guided questions about your training history, what motivates you, and how you like to communicate.
                </p>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed">
                  Starting with CrossFit? We've got specialized templates to get you going fast.
                </p>
              </div>
              <div className="lg:w-2/5 flex items-center">
                <div className="ml-auto mr-16">
                  <GlitchText className="font-russo text-6xl text-synthwave-neon-pink opacity-50">
                    DESIGN
                  </GlitchText>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-3/5">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-synthwave-neon-cyan rounded-full border-2 border-synthwave-neon-cyan flex items-center justify-center font-russo font-bold text-synthwave-bg-primary mr-6">
                    2
                  </div>
                  <h3 className="font-russo text-2xl text-synthwave-neon-cyan uppercase">Customize & Refine</h3>
                </div>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed mb-4">
                  <strong>Shape your coach's personality and approach.</strong> Choose training methodologies, communication style, and decision-making logic.
                </p>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed">
                  Want data-driven programming? Prefer intuitive guidance? Make it yours.
                </p>
              </div>
              <div className="lg:w-2/5 flex items-center">
                <div className="ml-auto mr-16">
                  <GlitchText className="font-russo text-6xl text-synthwave-neon-cyan opacity-50">
                    REFINE
                  </GlitchText>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-3/5">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-synthwave-neon-purple rounded-full border-2 border-synthwave-neon-purple flex items-center justify-center font-russo font-bold text-synthwave-bg-primary mr-6">
                    3
                  </div>
                  <h3 className="font-russo text-2xl text-synthwave-neon-purple uppercase">Train & Evolve</h3>
                </div>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed mb-4">
                  <strong>Start training with your personalized AI coach.</strong> Get custom workouts, real-time guidance, and motivation that adapts as you progress.
                </p>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed">
                  Your coach learns what works for you and gets better over time.
                </p>
              </div>
              <div className="lg:w-2/5 flex items-center">
                <div className="ml-auto mr-16">
                  <GlitchText className="font-russo text-6xl text-synthwave-neon-purple opacity-50">
                    EVOLVE
                  </GlitchText>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-24 bg-gradient-to-r from-synthwave-bg-secondary via-green-900/20 to-synthwave-bg-secondary border-t border-synthwave-neon-green/20">
        <div className="max-w-7xl mx-auto px-8">
                      <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-8 text-center uppercase">
              Built for Every Fitness Journey
            </h2>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary mb-16 max-w-4xl mx-auto text-center leading-relaxed">
            Starting with CrossFit and expanding to all fitness disciplines. Whether you're just beginning your fitness journey or training at an elite level, build the perfect AI coach tailored exactly to your needs.
          </p>

          <div className={themeClasses.cardGrid}>
            <div className={`${themeClasses.glowCard} border-synthwave-neon-pink/30 hover:border-synthwave-neon-pink`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-pink`}>
                CrossFit Athletes
              </h3>
              <p className="font-rajdhani text-sm text-synthwave-neon-pink/80 mb-4 uppercase tracking-wide">
                Our Starting Focus
              </p>
              <p className={themeClasses.cardText}>
                Whether you're prepping for the Open or just fell in love with the sport, get programming that understands CrossFit's unique demands and methodology.
              </p>
            </div>

            <div className={`${themeClasses.glowCard} border-synthwave-neon-cyan/30 hover:border-synthwave-neon-cyan`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-cyan`}>
                Fitness Enthusiasts
              </h3>
              <p className={themeClasses.cardText}>
                Ready to move beyond generic apps? Create a coach that understands your goals, whether that's strength, conditioning, or general health.
              </p>
            </div>

            <div className={`${themeClasses.glowCard} border-synthwave-neon-purple/30 hover:border-synthwave-neon-purple`}>
              <h3 className={`${themeClasses.cardTitle} text-synthwave-neon-purple`}>
                Expanding Soon
              </h3>
              <p className={themeClasses.cardText}>
                We're building with other disciplines in mind—powerlifting, bodybuilding, endurance sports, and more. Your input helps us prioritize what's next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 relative bg-gradient-to-tr from-pink-900/20 via-synthwave-bg-primary to-purple-900/30 border-t border-synthwave-neon-pink/20">
        <div className="absolute inset-0 grid-bg opacity-10"></div>
        <div className="max-w-7xl mx-auto px-8">
                      <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-16 text-center uppercase">
              Building the Future of Fitness AI
            </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <NeonBorder color="pink" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-pink mb-4 uppercase">Development Approach</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                We're taking a collaborative approach to building this platform. Rather than creating in isolation, we're seeking partners who want to help shape the future of AI coaching.
              </p>
            </NeonBorder>

            <NeonBorder color="cyan" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-cyan mb-4 uppercase">Methodology Foundation</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Our AI coaching framework draws inspiration from proven training methodologies including Mayhem, PRVN, and CompTrain principles, while maintaining complete independence from these programs.
              </p>
            </NeonBorder>

            <NeonBorder color="purple" className="p-8 bg-synthwave-bg-card/50">
              <h3 className="font-russo text-xl text-synthwave-neon-purple mb-4 uppercase">Technical Excellence</h3>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                Built on enterprise-grade infrastructure that ensures your AI coach responds quickly, securely, and reliably—without the tech complexity.
              </p>
            </NeonBorder>
          </div>

          <div className="text-center">
            <div className="inline-block bg-synthwave-bg-card/50 border border-synthwave-neon-pink/30 rounded-xl p-8 max-w-2xl">
              <p className="font-rajdhani text-lg text-synthwave-text-secondary italic leading-relaxed mb-4">
                "As someone who's tried every fitness app out there, the idea of building my own AI coach is game-changing. Finally, something that could actually understand how I want to train."
              </p>
              <p className="font-russo text-synthwave-neon-pink uppercase text-sm tracking-wide">
                — Beta User, CrossFit Athlete
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 text-center bg-gradient-to-b from-synthwave-bg-secondary via-cyan-900/30 to-synthwave-bg-primary border-t border-synthwave-neon-cyan/30">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="font-russo font-black text-4xl md:text-5xl text-white mb-8 uppercase">
            Ready to Build Your Perfect AI Coach?
          </h2>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary mb-12 leading-relaxed">
            Join thousands of fitness enthusiasts waiting for the future of personalized coaching. Be first to create your custom AI coach when we launch.
          </p>

          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className={themeClasses.neonButton}>
                Join the Waitlist
              </button>
              <button className={themeClasses.cyanButton}>
                Want to Collaborate?
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm font-rajdhani text-synthwave-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full"></div>
                <span>Get notified when we launch in late 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full"></div>
                <span>Help us build, test, or design the platform</span>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <GlitchText className="font-russo text-2xl text-synthwave-neon-purple">
              SYSTEM READY FOR LAUNCH
            </GlitchText>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;