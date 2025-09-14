import React from 'react';
import { Link } from 'react-router-dom';
import { containerPatterns, buttonPatterns, layoutPatterns, typographyPatterns } from '../utils/uiPatterns';

function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Full-page background like AuthLayout */}
      <div className={`fixed inset-0 ${layoutPatterns.authBackground}`}></div>

      {/* Hero Section */}
      <section
        className="relative z-10 min-h-screen flex flex-col justify-center items-center px-8 text-center"
        style={{
          backgroundImage: 'url(/images/hero-splash-3.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}
      >
        {/* Light overlay for text readability while preserving vibrancy */}
        <div className="absolute inset-0 bg-synthwave-bg-primary/20"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/images/logo-light-sm.png"
              alt="NeonPanda Logo"
              className="h-16 w-auto"
            />
          </div>

          {/* Main Headline */}
          <h1 className={`${typographyPatterns.heroTitle} max-w-5xl mx-auto leading-tight`}>
            Your Electric Fitness Companion
          </h1>

          {/* Key Brand Message */}
          <div className={`${containerPatterns.mainContent} p-8 mb-8 max-w-4xl mx-auto`}>
            <p className="font-rajdhani text-2xl text-synthwave-neon-pink leading-relaxed mb-4">
              Where electric intelligence meets approachable excellence.
            </p>
            <p className="font-rajdhani text-xl text-synthwave-text-secondary leading-relaxed">
              We're not just building AI coaches – we're creating relationships that transform lives, one workout at a time.
            </p>
          </div>

          {/* Subtitle */}
          <p className={`${typographyPatterns.heroSubtitle} max-w-4xl mx-auto mb-12`}>
            Create an AI coach that gets you. Not just your goals, but your personality, your struggles, your victories.
            Because your fitness journey is as unique as you are.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/contact?type=waitlist" className={buttonPatterns.heroCTA}>
              Join the Waitlist
            </Link>
            <Link to="/contact?type=collaborate" className={buttonPatterns.secondary}>
              Let's Collaborate
            </Link>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`${typographyPatterns.pageTitle} mb-6`}>
              Meet Your Electric Companion
            </h2>
            <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
              NeonPanda isn't just another fitness app – it's the bridge between cutting-edge AI and genuine human connection.
              Making AI coaching feel less artificial and more personal.
            </p>
          </div>

          {/* App Screenshots Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Screenshot 1 - Coach Creation */}
            <div className={containerPatterns.cardMedium}>
              <div className="p-6">
                <div className="bg-synthwave-bg-primary/50 rounded-xl h-80 mb-6 flex items-center justify-center border-2 border-dashed border-synthwave-neon-pink/30">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-synthwave-neon-pink/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="font-rajdhani text-synthwave-text-muted">Coach Creation Screenshot</p>
                  </div>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink mb-3`}>
                  Design Your Coach
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  Build your perfect AI coach through guided conversations. Shape their personality, training philosophy, and communication style.
                </p>
              </div>
            </div>

            {/* Screenshot 2 - Chat Interface */}
            <div className={containerPatterns.cardMedium}>
              <div className="p-6">
                <div className="bg-synthwave-bg-primary/50 rounded-xl h-80 mb-6 flex items-center justify-center border-2 border-dashed border-synthwave-neon-cyan/30">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-synthwave-neon-cyan/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="font-rajdhani text-synthwave-text-muted">Chat Interface Screenshot</p>
                  </div>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan mb-3`}>
                  Real Conversations
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  Chat naturally with your AI coach. Get personalized guidance, motivation, and support whenever you need it.
                </p>
              </div>
            </div>

            {/* Screenshot 3 - Workout Programming */}
            <div className={containerPatterns.cardMedium}>
              <div className="p-6">
                <div className="bg-synthwave-bg-primary/50 rounded-xl h-80 mb-6 flex items-center justify-center border-2 border-dashed border-synthwave-neon-purple/30">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-synthwave-neon-purple/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-synthwave-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="font-rajdhani text-synthwave-text-muted">Workout Programming Screenshot</p>
                  </div>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple mb-3`}>
                  Smart Programming
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary">
                  Get intelligent workout programming that adapts to your progress, schedule, and goals. No more generic routines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why NeonPanda Section */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className={`${typographyPatterns.pageTitle} mb-8`}>
            Why NeonPanda?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Playful Power */}
            <div className={containerPatterns.cardLight}>
              <div className="p-8">
                <div className="w-16 h-16 bg-synthwave-neon-pink/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink mb-4`}>
                  Playful Power
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  Serious results don't require a serious attitude. Your AI coach is sophisticated enough to rival any human coach, yet approachable enough to feel like a friend.
                </p>
              </div>
            </div>

            {/* Electric Energy */}
            <div className={containerPatterns.cardLight}>
              <div className="p-8">
                <div className="w-16 h-16 bg-synthwave-neon-cyan/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan mb-4`}>
                  Electric Energy
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  We bring vibrant energy to every interaction. We're the spark that ignites your fitness journey and the bright light guiding you through tough workouts.
                </p>
              </div>
            </div>

            {/* Adaptive Authenticity */}
            <div className={containerPatterns.cardLight}>
              <div className="p-8">
                <div className="w-16 h-16 bg-synthwave-neon-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-synthwave-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple mb-4`}>
                  Adaptive Authenticity
                </h3>
                <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed">
                  Every coach is custom, every personality unique. We don't do generic. Your AI coach learns, adapts, and evolves with you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Start Section */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`${containerPatterns.mainContent} p-12`}>
            <h2 className={`${typographyPatterns.pageTitle} mb-8`}>
              Ready to Meet Your Electric Companion?
            </h2>
            <p className={`${typographyPatterns.description} mb-8`}>
              Join the waitlist to be first in line when we launch. Or connect with us if you want to help build the future of AI coaching.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Link to="/contact?type=waitlist" className={buttonPatterns.heroCTA}>
                Join the Waitlist
              </Link>
              <Link to="/contact?type=collaborate" className={buttonPatterns.secondary}>
                Let's Collaborate
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm font-rajdhani text-synthwave-text-secondary">
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
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative z-10 bg-synthwave-bg-primary border-t border-synthwave-neon-cyan/20 py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">

            {/* Logo and Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <img
                  src="/images/logo-light-sm.png"
                  alt="NeonPanda Logo"
                  className="h-8 w-auto mr-3"
                />
              </div>
              <p className="font-rajdhani text-synthwave-text-secondary leading-relaxed mb-6">
                Building the future of personalized AI fitness coaching. Create your perfect coach, tailored to your unique journey.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="lg:col-span-1">
              <h3 className="font-russo text-lg text-synthwave-neon-cyan mb-6 uppercase">Platform</h3>
              <ul className="space-y-4 font-rajdhani">
                <li><Link to="/contact?type=waitlist" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Join Waitlist</Link></li>
                <li><Link to="/contact?type=collaborate" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Collaborate</Link></li>
                <li><Link to="/features" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Pricing</Link></li>
                <li><Link to="/about" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">About Us</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="lg:col-span-1">
              <h3 className="font-russo text-lg text-synthwave-neon-purple mb-6 uppercase">Resources</h3>
              <ul className="space-y-4 font-rajdhani">
                <li><Link to="/blog" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Blog</Link></li>
                <li><Link to="/faqs" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">FAQ</Link></li>
                <li><Link to="/support" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Support</Link></li>
                <li><Link to="/docs" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Documentation</Link></li>
                <li><Link to="/community" className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors">Community</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h3 className="font-russo text-lg text-synthwave-neon-pink mb-6 uppercase">Contact</h3>
              <div className="space-y-4 font-rajdhani text-synthwave-text-secondary">
                <div>
                  <p className="font-semibold text-white mb-1">Email</p>
                  <a href="mailto:hello@NeonPanda.com" className="hover:text-synthwave-neon-pink transition-colors">
                    hello@NeonPanda.com
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Support</p>
                  <a href="mailto:support@NeonPanda.com" className="hover:text-synthwave-neon-pink transition-colors">
                    support@NeonPanda.com
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Partnership</p>
                  <a href="mailto:partners@NeonPanda.com" className="hover:text-synthwave-neon-pink transition-colors">
                    partners@NeonPanda.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-synthwave-neon-cyan/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 font-rajdhani text-synthwave-text-secondary">
                <p>&copy; {new Date().getFullYear()} NeonPanda, LLC. All rights reserved.</p>
                <div className="flex space-x-6">
                  <Link to="/privacy" className="hover:text-synthwave-neon-pink transition-colors">Privacy Policy</Link>
                  <Link to="/terms" className="hover:text-synthwave-neon-pink transition-colors">Terms of Service</Link>
                  <Link to="/cookies" className="hover:text-synthwave-neon-pink transition-colors">Cookie Policy</Link>
                </div>
              </div>
              <div className="flex items-center space-x-2 font-rajdhani text-synthwave-text-secondary">
                <div className="w-2 h-2 bg-synthwave-neon-green rounded-full animate-pulse"></div>
                <span className="text-sm">Status: Building the Future</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;