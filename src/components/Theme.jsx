import React, { useState } from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { containerPatterns, iconButtonPatterns, toastPatterns, inputPatterns, buttonPatterns, inlineEditPatterns } from '../utils/ui/uiPatterns';
import { NeonBorder, WorkoutIcon, SendIcon, ConversationIcon, ReportIcon, LightningIcon } from './themes/SynthwaveComponents';

// Import existing components for reference
import AuthButton from '../auth/components/AuthButton';
import IconButton from './shared/IconButton';
import InlineEditField from './shared/InlineEditField';

// Sample icons for demonstration
const SampleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

// ProgramIcon component (matching TrainingGrounds.jsx)
const ProgramIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function Theme() {
  const [activeSection, setActiveSection] = useState('existing');
  const [activeCategory, setActiveCategory] = useState('buttons');

  return (
    <div className={`${themeClasses.container} min-h-screen pb-8`}>
      <div className="max-w-7xl mx-auto px-8 py-12 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            Synthwave Design System Showcase
          </h1>
          <p className="font-rajdhani text-lg text-synthwave-text-secondary max-w-3xl mx-auto mb-4">
            Comprehensive collection of all existing design elements and modern UI/UX proposals for the synthwave theme.
          </p>
        </div>

        {/* Category Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-synthwave-bg-card/50 rounded-lg p-1 border border-synthwave-neon-purple/30">
            <button
              onClick={() => setActiveCategory('buttons')}
              className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                activeCategory === 'buttons'
                  ? 'bg-synthwave-neon-purple text-white'
                  : 'text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10'
              }`}
            >
              Buttons
            </button>
            <button
              onClick={() => setActiveCategory('containers')}
              className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                activeCategory === 'containers'
                  ? 'bg-synthwave-neon-purple text-white'
                  : 'text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10'
              }`}
            >
              Containers
            </button>
            <button
              onClick={() => setActiveCategory('patterns')}
              className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                activeCategory === 'patterns'
                  ? 'bg-synthwave-neon-purple text-white'
                  : 'text-synthwave-neon-purple hover:bg-synthwave-neon-purple/10'
              }`}
            >
              Patterns
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        {activeCategory === 'buttons' && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-synthwave-bg-card/50 rounded-lg p-1 border border-synthwave-neon-pink/30">
              <button
                onClick={() => setActiveSection('existing')}
                className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                  activeSection === 'existing'
                    ? 'bg-synthwave-neon-pink text-synthwave-bg-primary'
                    : 'text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10'
                }`}
              >
                Existing Buttons
              </button>
              <button
                onClick={() => setActiveSection('proposed')}
                className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                  activeSection === 'proposed'
                    ? 'bg-synthwave-neon-cyan text-synthwave-bg-primary'
                    : 'text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10'
                }`}
              >
                Proposed Buttons
              </button>
            </div>
          </div>
        )}

        {activeCategory === 'containers' && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-synthwave-bg-card/50 rounded-lg p-1 border border-synthwave-neon-cyan/30">
              <button
                onClick={() => setActiveSection('existing')}
                className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                  activeSection === 'existing'
                    ? 'bg-synthwave-neon-cyan text-synthwave-bg-primary'
                    : 'text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10'
                }`}
              >
                Existing Containers
              </button>
              <button
                onClick={() => setActiveSection('proposed')}
                className={`px-6 py-3 rounded-md font-rajdhani font-semibold transition-all duration-300 ${
                  activeSection === 'proposed'
                    ? 'bg-synthwave-neon-pink text-synthwave-bg-primary'
                    : 'text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10'
                }`}
              >
                Proposed Containers
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1">
          <NeonBorder color={activeSection === 'existing' ? 'pink' : 'cyan'} className="bg-synthwave-bg-card/50 h-full overflow-hidden">
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">

              {/* BUTTONS SECTION */}
              {activeCategory === 'buttons' && activeSection === 'existing' && (
                <div className="space-y-12">
                  <h2 className="font-russo text-3xl text-synthwave-neon-pink mb-8 text-center uppercase">
                    Existing Button Inventory
                  </h2>

                  {/* Auth Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Auth Buttons (AuthButton.jsx)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Primary Variant</h4>
                        <AuthButton variant="primary">Sign In</AuthButton>
                        <AuthButton variant="primary" loading>Loading...</AuthButton>
                        <AuthButton variant="primary" disabled>Disabled</AuthButton>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Secondary Variant</h4>
                        <AuthButton variant="secondary">Cancel</AuthButton>
                        <AuthButton variant="secondary" loading>Loading...</AuthButton>
                        <AuthButton variant="secondary" disabled>Disabled</AuthButton>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Link Variant (Updated)</h4>
                        <AuthButton variant="link">Forgot Password?</AuthButton>
                        <AuthButton variant="link" loading>Loading...</AuthButton>
                        <AuthButton variant="link" disabled>Disabled</AuthButton>
                      </div>
                    </div>
                  </section>

                  {/* Icon Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Icon Buttons (IconButton.jsx) - Standardized Variants
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Solid (Primary)</h4>
                        <IconButton variant="solid"><SampleIcon /></IconButton>
                        <IconButton variant="solid" disabled><SampleIcon /></IconButton>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Bordered (Secondary)</h4>
                        <IconButton variant="bordered"><HeartIcon /></IconButton>
                        <IconButton variant="bordered" disabled><HeartIcon /></IconButton>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Solid Cyan (Management)</h4>
                        <IconButton variant="solidCyan"><SettingsIcon /></IconButton>
                        <IconButton variant="solidCyan" disabled><SettingsIcon /></IconButton>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Floating (Overlays)</h4>
                        <IconButton variant="floating"><SampleIcon /></IconButton>
                        <IconButton variant="floating" disabled><SampleIcon /></IconButton>
                      </div>
                    </div>
                    <div className="bg-synthwave-bg-card/20 border border-synthwave-neon-pink/20 rounded-lg p-4 mt-6">
                      <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                        <strong className="text-synthwave-neon-pink">Updated IconButton.jsx:</strong> Now uses standardized
                        iconButtonPatterns from uiPatterns.js. Legacy variants (default, cyan, active, small) are mapped
                        to new standardized variants for backward compatibility.
                      </p>
                    </div>
                  </section>

                  {/* Theme Class Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Theme Class Buttons (synthwaveThemeClasses.js)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Neon Button</h4>
                        <button className={themeClasses.neonButton}>Create Workout</button>
                        <button className={`${themeClasses.neonButton} opacity-50 cursor-not-allowed`} disabled>
                          Disabled Neon
                        </button>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Cyan Button</h4>
                        <button className={themeClasses.cyanButton}>Manage Data</button>
                        <button className={`${themeClasses.cyanButton} opacity-50 cursor-not-allowed`} disabled>
                          Disabled Cyan
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Chat Interface Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Chat Interface Buttons (CoachConversations.jsx)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-blue-400">Plus Action</h4>
                        <button className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-all group min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <SampleIcon />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-green-400">Camera Action</h4>
                        <button className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-green-400 hover:bg-green-400/10 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <HeartIcon />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-purple-400">Paperclip Action</h4>
                        <button className="p-2 sm:p-3 text-synthwave-text-secondary hover:text-purple-400 hover:bg-purple-400/10 rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <SettingsIcon />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Send Button</h4>
                        <button className="p-3 sm:p-4 bg-synthwave-neon-pink text-white rounded-full hover:bg-synthwave-neon-pink/80 transition-all transform hover:scale-105 active:scale-95 shadow-lg min-h-[48px] min-w-[48px] flex items-center justify-center">
                          <SampleIcon />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Slash Command Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Slash Command Buttons (CoachConversations.jsx)
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <button className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300">
                        /log-workout
                      </button>
                      <button className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300">
                        /save-memory
                      </button>
                      <button className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/30 text-synthwave-neon-pink px-3 py-1 rounded-full text-sm font-rajdhani hover:bg-synthwave-neon-pink/10 transition-colors duration-300">
                        /start-conversation
                      </button>
                    </div>
                  </section>

                  {/* Card Action Buttons Section */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Card Action Buttons (Various Components)
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-3 cursor-pointer transition-all duration-200">
                        <p className="text-synthwave-text-primary font-rajdhani">Card with hover effect</p>
                      </div>
                      <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 rounded-lg p-3">
                        <p className="text-synthwave-text-primary font-rajdhani">Static card (no hover)</p>
                      </div>
                    </div>
                  </section>

                  {/* Collapsible Section Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Collapsible Section Buttons (WorkoutViewer.jsx, etc.)
                    </h3>
                    <button className="w-full px-4 py-3 bg-synthwave-bg-primary/30 hover:bg-synthwave-bg-primary/50 transition-colors duration-200 flex items-center justify-between text-left rounded-lg border border-synthwave-neon-pink/30">
                      <span className="text-synthwave-text-primary font-rajdhani">Expandable Section Header</span>
                      <SampleIcon />
                    </button>
                  </section>
                </div>
              )}

              {activeCategory === 'buttons' && activeSection === 'proposed' && (
                <div className="space-y-12">
                  <h2 className="font-russo text-3xl text-synthwave-neon-cyan mb-8 text-center uppercase">
                    Modern UI/UX Button Proposals
                  </h2>

                  {/* Primary Action Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Primary Action Buttons - Modern Approach
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      {/* Solid Fill - High Impact */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Solid Fill (High Impact)</h4>
                        <button className="w-full px-6 py-3 bg-synthwave-neon-pink text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Create New
                        </button>
                        <button className="w-full px-6 py-3 bg-synthwave-neon-pink text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Save Changes
                        </button>
                      </div>

                      {/* Gradient Fill - Premium Feel */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Gradient Fill (Premium)</h4>
                        <button className="w-full px-6 py-3 bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-white font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Premium Action
                        </button>
                        <button className="w-full px-6 py-3 bg-gradient-to-r from-synthwave-neon-cyan to-synthwave-neon-blue text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Cool Action
                        </button>
                      </div>

                      {/* Outlined - Clean Modern */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-text-primary">Outlined (Clean)</h4>
                        <button className="w-full px-6 py-3 bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Secondary
                        </button>
                        <button className="w-full px-6 py-3 bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                          Alternative
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Icon Buttons - Modern Variants */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Icon Buttons - Modern Variants
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

                      {/* Minimal Clean */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Minimal</h4>
                        <button className={iconButtonPatterns.minimal}>
                          <SampleIcon />
                        </button>
                      </div>

                      {/* Soft Background */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Soft BG</h4>
                        <button className={iconButtonPatterns.softBg}>
                          <HeartIcon />
                        </button>
                      </div>

                      {/* Bordered */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Bordered</h4>
                        <button className={iconButtonPatterns.bordered}>
                          <SettingsIcon />
                        </button>
                      </div>

                      {/* Solid Fill */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Solid</h4>
                        <button className={iconButtonPatterns.solid}>
                          <SampleIcon />
                        </button>
                      </div>

                      {/* Solid Cyan */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Solid Cyan</h4>
                        <button className={iconButtonPatterns.solidCyan}>
                          <HeartIcon />
                        </button>
                      </div>

                      {/* Floating */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Floating</h4>
                        <button className={iconButtonPatterns.floating}>
                          <SettingsIcon />
                        </button>
                      </div>

                      {/* Glow Effect */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Glow</h4>
                        <button className={iconButtonPatterns.glow}>
                          <SampleIcon />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Small Action Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Small Action Buttons - Chat Interface
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">

                      {/* Action Small Blue */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Blue Action</h4>
                        <button className={iconButtonPatterns.actionSmallBlue}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Action Small Green */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Green Action</h4>
                        <button className={iconButtonPatterns.actionSmallGreen}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>

                      {/* Action Small Purple */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Purple Action</h4>
                        <button className={iconButtonPatterns.actionSmallPurple}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>

                      {/* Action Small Pink */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Pink Action</h4>
                        <button className={iconButtonPatterns.actionSmallPink}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Action Small Cyan */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-text-primary">Cyan Action</h4>
                        <button className={iconButtonPatterns.actionSmallCyan}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="bg-synthwave-bg-card/20 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                      <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                        <strong className="text-synthwave-neon-cyan">Small Action Buttons:</strong> Designed for chat interfaces and toolbars.
                        Smaller than regular icon buttons (40px vs 48px), use rounded-lg instead of rounded-full for modern consistency,
                        and maintain color-coded functionality (blue=actions, green=photos, purple=files, pink=destructive, cyan=utility).
                        <strong className="text-synthwave-neon-pink ml-2">Icons:</strong> All action button icons should be w-5 h-5 (20px) for consistent sizing.
                      </p>
                    </div>
                  </section>

                  {/* Badge Patterns - Tag-like Button Components */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Badge Patterns - Tag/Label Components
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">

                      {/* Pink Badge */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-pink">Pink</h4>
                        <span className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani font-medium inline-block">
                          High Priority
                        </span>
                      </div>

                      {/* Pink Bordered */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-pink">Pink Border</h4>
                        <span className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani font-medium border border-synthwave-neon-pink/40 inline-block">
                          Strength
                        </span>
                      </div>

                      {/* Cyan Badge */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-cyan">Cyan</h4>
                        <span className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani font-medium inline-block">
                          Info Tag
                        </span>
                      </div>

                      {/* Cyan Bordered */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-cyan">Cyan Border</h4>
                        <span className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani font-medium border border-synthwave-neon-cyan/40 inline-block">
                          Conditioning
                        </span>
                      </div>

                      {/* Purple Badge */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-purple">Purple</h4>
                        <span className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani font-medium inline-block">
                          Special
                        </span>
                      </div>

                      {/* Purple Bordered */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-purple">Purple Border</h4>
                        <span className="bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani font-medium border border-synthwave-neon-purple/40 inline-block">
                          Accessory
                        </span>
                      </div>

                      {/* Workout Detail Badge - for equipment, exercises, focus areas */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-sm text-synthwave-neon-cyan">Workout Detail</h4>
                        <span className="px-2 py-1 bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded text-sm font-rajdhani text-synthwave-text-secondary inline-block">
                          Barbell
                        </span>
                      </div>
                    </div>

                    <div className="bg-synthwave-bg-card/20 border border-synthwave-neon-pink/20 rounded-lg p-4">
                      <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                        <strong className="text-synthwave-neon-pink">Badge Patterns:</strong> Small tag-like components for categorization and labeling.
                        Used in workout types, memory tags, and other metadata displays. Available in pink (high priority), cyan (info), purple (special),
                        and muted variants. Both solid background and bordered versions are available from <strong className="text-synthwave-neon-cyan">badgePatterns</strong> in uiPatterns.js.
                        The <strong className="text-synthwave-neon-cyan">workoutDetail</strong> pattern is used for equipment, exercises, and focus areas in workout templates.
                      </p>
                    </div>
                  </section>

                  {/* Size Variants */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Size Variants - Touch Optimized
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Small */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Small (32px)</h4>
                        <button className="px-3 py-1.5 bg-synthwave-neon-pink text-synthwave-bg-primary font-rajdhani font-medium text-sm uppercase tracking-wide rounded-md transition-all duration-200 hover:bg-synthwave-neon-pink/90 hover:shadow-md hover:shadow-synthwave-neon-pink/30">
                          Small
                        </button>
                        <button className="p-2 bg-synthwave-neon-pink text-synthwave-bg-primary rounded-md transition-all duration-200 hover:bg-synthwave-neon-pink/90 hover:shadow-md hover:shadow-synthwave-neon-pink/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Medium */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Medium (40px)</h4>
                        <button className="px-4 py-2 bg-synthwave-neon-cyan text-synthwave-bg-primary font-rajdhani font-semibold text-base uppercase tracking-wide rounded-lg transition-all duration-200 hover:bg-synthwave-neon-cyan/90 hover:shadow-md hover:shadow-synthwave-neon-cyan/30">
                          Medium
                        </button>
                        <button className="p-2.5 bg-synthwave-neon-cyan text-synthwave-bg-primary rounded-lg transition-all duration-200 hover:bg-synthwave-neon-cyan/90 hover:shadow-md hover:shadow-synthwave-neon-cyan/30">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Large */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Large (48px)</h4>
                        <button className="px-6 py-3 bg-synthwave-neon-purple text-white font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-200 hover:bg-synthwave-neon-purple/90 hover:shadow-lg hover:shadow-synthwave-neon-purple/30">
                          Large
                        </button>
                        <button className="p-3 bg-synthwave-neon-purple text-white rounded-lg transition-all duration-200 hover:bg-synthwave-neon-purple/90 hover:shadow-lg hover:shadow-synthwave-neon-purple/30">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>

                      {/* Extra Large */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">XL (56px)</h4>
                        <button className="px-8 py-4 bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-white font-rajdhani font-bold text-xl uppercase tracking-wide rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0">
                          Hero CTA
                        </button>
                        <button className="p-4 bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* State Variations */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Interactive States - Modern Feedback
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                      {/* Loading States */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Loading States</h4>
                        <button className="w-full px-6 py-3 bg-synthwave-neon-pink text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading...</span>
                        </button>
                        <button className="w-full px-6 py-3 bg-synthwave-neon-cyan text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span>Processing</span>
                        </button>
                      </div>

                      {/* Success States */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-green-400">Success States</h4>
                        <button className="w-full px-6 py-3 bg-green-500 text-white font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Saved!</span>
                        </button>
                        <button className="w-full px-6 py-3 bg-transparent border-2 border-green-500 text-green-500 font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Complete</span>
                        </button>
                      </div>

                      {/* Warning States */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-yellow-400">Warning States</h4>
                        <button className="w-full px-6 py-3 bg-yellow-500 text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span>Caution</span>
                        </button>
                        <button className="w-full px-6 py-3 bg-transparent border-2 border-yellow-500 text-yellow-500 font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Warning</span>
                        </button>
                      </div>

                      {/* Danger States */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-red-400">Danger States</h4>
                        <button className="w-full px-6 py-3 bg-red-500 text-white font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-red-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                        <button className="w-full px-6 py-3 bg-transparent border-2 border-red-500 text-red-500 font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 hover:bg-red-500/10">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Floating Action Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Floating Action Buttons - Modern Mobile UX
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      {/* Primary FAB */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Primary FAB</h4>
                        <div className="relative">
                          <button className="w-14 h-14 bg-synthwave-neon-pink text-synthwave-bg-primary rounded-full shadow-lg shadow-synthwave-neon-pink/30 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                            <SampleIcon />
                          </button>
                        </div>
                      </div>

                      {/* Extended FAB */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Extended FAB</h4>
                        <button className="px-6 py-3 bg-synthwave-neon-cyan text-synthwave-bg-primary font-rajdhani font-semibold text-lg uppercase tracking-wide rounded-full shadow-lg shadow-synthwave-neon-cyan/30 hover:shadow-xl hover:shadow-synthwave-neon-cyan/40 hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2">
                          <SampleIcon />
                          <span>Create</span>
                        </button>
                      </div>

                      {/* Mini FAB */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Mini FAB</h4>
                        <button className="w-10 h-10 bg-synthwave-neon-purple text-white rounded-full shadow-md shadow-synthwave-neon-purple/30 hover:shadow-lg hover:shadow-synthwave-neon-purple/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Modern Link Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Modern Link Buttons - Refined Secondary Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      {/* Updated Link Style */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Modern Link (Recommended)</h4>
                        <AuthButton variant="link">Forgot Password?</AuthButton>
                        <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                          Enhanced with subtle background, better padding, and refined hover states.
                        </p>
                      </div>

                      {/* Alternative Link Styles */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Underline Style</h4>
                        <button className="bg-transparent border-none text-synthwave-neon-pink px-2 py-1 hover:text-white transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide underline decoration-synthwave-neon-pink/50 hover:decoration-white underline-offset-4">
                          Go Back
                        </button>
                        <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                          Classic underline approach with modern hover transitions.
                        </p>
                      </div>

                      {/* Minimal Link */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Minimal Clean</h4>
                        <button className="bg-transparent border-none text-synthwave-neon-purple px-2 py-1 hover:text-white hover:bg-synthwave-neon-purple/10 rounded-lg transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide">
                          Cancel
                        </button>
                        <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                          Ultra-minimal with just color change and subtle background.
                        </p>
                      </div>
                    </div>

                    {/* Link Button Guidelines */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-lg p-6 mt-6">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold mb-4">Link Button Best Practices:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                        <div>
                          <h5 className="text-synthwave-neon-pink font-semibold mb-2">When to Use:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Secondary actions (Forgot password, Cancel)</li>
                            <li>• Navigation links in forms</li>
                            <li>• Less important CTAs</li>
                            <li>• Actions that shouldn't compete with primary buttons</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-synthwave-neon-cyan font-semibold mb-2">Modern Features:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Adequate padding for touch targets</li>
                            <li>• Subtle hover backgrounds</li>
                            <li>• Proper focus rings for accessibility</li>
                            <li>• Smooth transitions and animations</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Tab Buttons */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Tab Buttons - Content Switching
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Tab Switcher Example */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Tab Switcher (ViewReports.jsx)</h4>
                        <div className="flex items-center justify-center gap-2 p-4 bg-synthwave-bg-card/30 rounded-lg">
                          <button className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40">
                            Active Tab
                          </button>
                          <button className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent hover:border-synthwave-neon-cyan/20 hover:bg-synthwave-neon-cyan/10">
                            Inactive Tab
                          </button>
                        </div>
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          Used for switching between weekly and monthly reports. Active state has cyan background and border,
                          inactive has cyan text with subtle hover state.
                        </p>
                      </div>

                      {/* Tab Switcher States */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Tab States</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-synthwave-text-secondary font-rajdhani text-xs w-16">Active:</span>
                            <button className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40">
                              Tab
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-synthwave-text-secondary font-rajdhani text-xs w-16">Inactive:</span>
                            <button className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent">
                              Tab
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-synthwave-text-secondary font-rajdhani text-xs w-16">Hover:</span>
                            <button className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/20">
                              Tab
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tab Button Guidelines */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-lg p-6 mt-6">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold mb-4">Tab Button Guidelines:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                        <div>
                          <h5 className="text-synthwave-neon-pink font-semibold mb-2">When to Use:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Switching between related content views</li>
                            <li>• Filtering data by category</li>
                            <li>• Navigation within a single page</li>
                            <li>• Toggling between report types (weekly/monthly)</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-synthwave-neon-cyan font-semibold mb-2">Design Features:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Active: bg-synthwave-neon-cyan/20 with border</li>
                            <li>• Inactive: transparent bg with cyan text</li>
                            <li>• Hover: subtle cyan background (bg-synthwave-neon-cyan/10)</li>
                            <li>• Border: 2px with rounded-lg corners</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Recommendations */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      UI/UX Recommendations
                    </h3>
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-lg p-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Modern Best Practices:</h4>
                        <ul className="space-y-2 text-synthwave-text-primary font-rajdhani">
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Touch Targets:</strong> Minimum 44px for mobile accessibility</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Visual Hierarchy:</strong> Solid fills for primary actions, outlines for secondary</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Feedback:</strong> Subtle hover animations (-translate-y-0.5) and focus rings</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Loading States:</strong> Clear progress indicators with disabled styling</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Color Coding:</strong> Pink for primary, cyan for secondary, red for destructive</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Consistency:</strong> Unified border radius (lg for buttons, xl for cards)</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Accessibility:</strong> Focus rings, proper contrast ratios, keyboard navigation</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* CONTAINERS SECTION */}
              {activeCategory === 'containers' && activeSection === 'existing' && (
                <div className="space-y-12">
                  <h2 className="font-russo text-3xl text-synthwave-neon-cyan mb-8 text-center uppercase">
                    Existing Container Inventory
                  </h2>

                  {/* NeonBorder Component */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Main Content Container - Current NeonBorder
                    </h3>

                    {/* Current NeonBorder Cyan */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">NeonBorder Cyan (Used on Workouts, Reports, Conversations, etc.)</h4>
                      <NeonBorder color="cyan" className="bg-synthwave-bg-card/50 h-64 overflow-hidden">
                        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                          <h5 className="font-russo text-lg text-white mb-4 uppercase">Current Main Container</h5>
                          <p className="text-synthwave-text-primary font-rajdhani mb-4">
                            This is the current main content container used across Workouts.jsx, WeeklyReports.jsx,
                            CoachConversations.jsx, and other detail pages. It features a bright cyan neon border
                            with shadow effects.
                          </p>
                          <div className="space-y-2">
                            <div className="bg-synthwave-bg-primary/30 p-3 rounded-lg">
                              <p className="text-synthwave-text-secondary text-sm font-rajdhani">Sample content area</p>
                            </div>
                            <div className="bg-synthwave-bg-primary/30 p-3 rounded-lg">
                              <p className="text-synthwave-text-secondary text-sm font-rajdhani">More sample content</p>
                            </div>
                          </div>
                        </div>
                      </NeonBorder>
                      <div className="bg-synthwave-bg-card/20 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          <strong className="text-synthwave-neon-cyan">Current Issues:</strong> Heavy visual weight, competes with content,
                          harsh on eyes, feels dated (2020 aesthetic), poor mobile experience with sharp borders.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Other NeonBorder Variants */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Other NeonBorder Variants (SynthwaveComponents.jsx)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Pink Border (Theme Page)</h4>
                        <NeonBorder color="pink" className="p-6">
                          <p className="text-synthwave-text-primary font-rajdhani">
                            Used for theme showcase and accent containers.
                          </p>
                        </NeonBorder>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Purple Border (Accent)</h4>
                        <NeonBorder color="purple" className="p-6">
                          <p className="text-synthwave-text-primary font-rajdhani">
                            Accent container for special content sections.
                          </p>
                        </NeonBorder>
                      </div>
                    </div>
                  </section>

                  {/* Theme Class Cards */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Theme Class Cards (synthwaveThemeClasses.js)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Glow Card</h4>
                        <div className={themeClasses.glowCard}>
                          <h5 className={themeClasses.cardTitle}>Card Title</h5>
                          <p className={themeClasses.cardText}>
                            This is a glow card with hover effects, border animations, and shadow glow.
                            Perfect for feature highlights and important content sections.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Container Class</h4>
                        <div className="bg-synthwave-gradient p-6 rounded-lg border border-synthwave-neon-cyan/30">
                          <h5 className="font-russo text-xl text-white mb-4 uppercase">Container</h5>
                          <p className="font-rajdhani text-synthwave-text-secondary">
                            Standard container with gradient background and subtle border.
                            Used for main page layouts and content sections.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Card Variations */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Card Variations (Various Components)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      {/* Interactive Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Interactive Card</h4>
                        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 rounded-lg p-4 cursor-pointer transition-all duration-200">
                          <h5 className="font-rajdhani text-lg text-synthwave-text-primary mb-2">Workout Card</h5>
                          <p className="text-synthwave-text-secondary text-sm font-rajdhani">
                            Clickable card with hover effects. Used for workouts, conversations, and reports.
                          </p>
                        </div>
                      </div>

                      {/* Static Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Static Card</h4>
                        <div className="bg-synthwave-bg-card/50 border border-synthwave-neon-cyan/30 rounded-lg p-4">
                          <h5 className="font-rajdhani text-lg text-synthwave-text-primary mb-2">Info Card</h5>
                          <p className="text-synthwave-text-secondary text-sm font-rajdhani">
                            Non-interactive card for displaying information and static content.
                          </p>
                        </div>
                      </div>

                      {/* Floating Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Floating Card</h4>
                        <div className="bg-synthwave-bg-card/80 backdrop-blur-sm border border-synthwave-neon-purple/30 rounded-xl p-4 shadow-lg shadow-synthwave-neon-purple/20">
                          <h5 className="font-rajdhani text-lg text-synthwave-text-primary mb-2">Floating Menu</h5>
                          <p className="text-synthwave-text-secondary text-sm font-rajdhani">
                            Floating card with backdrop blur and enhanced shadows. Used for overlays and menus.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Chat Interface Containers */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Chat Interface Containers (CoachConversations.jsx)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* User Message Bubble */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">User Message Bubble</h4>
                        <div className="flex justify-end">
                          <div className="bg-synthwave-neon-pink/70 text-white border border-synthwave-neon-pink/30 rounded-br-md rounded-tl-lg rounded-bl-lg p-4 max-w-xs shadow-lg shadow-synthwave-neon-pink/20">
                            <p className="font-rajdhani">This is a user message with soft pink background and proper contrast.</p>
                            <div className="flex justify-end mt-2 space-x-1">
                              <div className="w-2 h-2 bg-synthwave-neon-pink/60 rounded-full"></div>
                              <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Message Bubble */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">AI Message Bubble</h4>
                        <div className="flex justify-start">
                          <div className="bg-synthwave-neon-cyan/10 text-synthwave-text-primary border border-synthwave-neon-cyan/30 rounded-bl-md rounded-tr-lg rounded-br-lg p-4 max-w-xs">
                            <p className="font-rajdhani">This is an AI response with lighter cyan background and consistent border styling.</p>
                            <div className="flex justify-start mt-2 space-x-1">
                              <div className="w-2 h-2 bg-synthwave-neon-cyan/60 rounded-full"></div>
                              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Fixed Floating Input */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Fixed Floating Input (CoachConversations.jsx)
                    </h3>
                    <div className="relative">
                      <div className="bg-synthwave-bg-card/95 backdrop-blur-lg border-t-2 border-synthwave-neon-pink/30 shadow-lg shadow-synthwave-neon-pink/20 rounded-lg p-6">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink mb-4">Chat Input Container</h4>
                        <p className="text-synthwave-text-secondary font-rajdhani mb-4">
                          Fixed positioning container with backdrop blur, gradient background, and neon border effects.
                          Stays visible during scroll with glassmorphism styling.
                        </p>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 bg-synthwave-bg-primary/50 border border-synthwave-neon-pink/30 rounded-lg p-3">
                            <span className="text-synthwave-text-muted font-rajdhani">Type your message...</span>
                          </div>
                          <button className="p-3 bg-synthwave-neon-pink text-white rounded-full">
                            <SendIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Collapsible Sections */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Collapsible Sections (WorkoutViewer.jsx, etc.)
                    </h3>
                    <div className="space-y-4">
                      <div className="border border-synthwave-neon-pink/30 rounded-lg overflow-hidden">
                        <button className="w-full px-4 py-3 bg-synthwave-bg-primary/30 hover:bg-synthwave-bg-primary/50 transition-colors duration-200 flex items-center justify-between text-left">
                          <div className="flex items-center space-x-3">
                            <div className="text-synthwave-neon-pink">
                              <WorkoutIcon />
                            </div>
                            <h4 className="font-russo font-bold text-white text-sm uppercase">Workout Metadata</h4>
                          </div>
                          <div className="text-synthwave-neon-pink">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        <div className="p-4 bg-synthwave-bg-card/20">
                          <p className="text-synthwave-text-primary font-rajdhani">
                            Expandable content section with header button and collapsible body.
                            Used throughout the app for organizing detailed information.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Toast Notifications */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-cyan/30 pb-2">
                      Toast Notifications (Toast.jsx)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                      {/* Success Toast - Now using modern gradient patterns */}
                      <div className={toastPatterns.success}>
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-rajdhani font-semibold">Success (Updated)</span>
                        </div>
                      </div>

                      {/* Error Toast - Now using modern gradient patterns */}
                      <div className={toastPatterns.error}>
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="font-rajdhani font-semibold">Error (Updated)</span>
                        </div>
                      </div>

                      {/* Warning Toast - Now using modern gradient patterns */}
                      <div className={toastPatterns.warning}>
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="font-rajdhani font-semibold">Warning (Updated)</span>
                        </div>
                      </div>

                      {/* Info Toast - Now using modern gradient patterns */}
                      <div className={toastPatterns.info}>
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-rajdhani font-semibold">Info (Updated)</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeCategory === 'containers' && activeSection === 'proposed' && (
                <div className="space-y-12">
                  <h2 className="font-russo text-3xl text-synthwave-neon-pink mb-8 text-center uppercase">
                    Modern UI/UX Container Proposals
                  </h2>

                  {/* Modern Main Content Container Alternatives */}
                  <section className="space-y-8">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Main Content Container - Modern Alternatives
                    </h3>

                    {/* Proposed Alternatives */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                      {/* Option 1: Subtle Glassmorphism */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold">Option 1: Subtle Glassmorphism (Recommended)</h4>
                        <div className="bg-synthwave-bg-card/30 backdrop-blur-xl border border-synthwave-neon-cyan/10 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/5 h-64 overflow-hidden transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-cyan/15">
                          <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                            <h5 className="font-russo text-lg text-white mb-4 uppercase">Modern Glassmorphism</h5>
                            <p className="text-synthwave-text-primary font-rajdhani mb-4">
                              Subtle glassmorphism with minimal borders. Provides modern depth without competing
                              with content. Perfect balance of style and functionality.
                            </p>
                            <div className="space-y-2">
                              <div className="bg-synthwave-bg-primary/20 p-3 rounded-xl">
                                <p className="text-synthwave-text-secondary text-sm font-rajdhani">Sample content area</p>
                              </div>
                              <div className="bg-synthwave-bg-primary/20 p-3 rounded-xl">
                                <p className="text-synthwave-text-secondary text-sm font-rajdhani">More sample content</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <p className="text-green-400 font-rajdhani text-sm">
                            <strong>Benefits:</strong> Modern 2025 aesthetic, better content focus, accessibility friendly,
                            mobile optimized, maintains brand subtly, future-proof design.
                          </p>
                        </div>
                      </div>

                      {/* Option 2: Enhanced Glassmorphism */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple font-semibold">Option 2: Enhanced Glassmorphism</h4>
                        <div className="bg-gradient-to-br from-synthwave-bg-card/40 to-synthwave-bg-card/20 backdrop-blur-2xl border border-synthwave-neon-cyan/15 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/10 h-64 overflow-hidden">
                          <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                            <h5 className="font-russo text-lg text-white mb-4 uppercase">Enhanced Glass</h5>
                            <p className="text-synthwave-text-primary font-rajdhani mb-4">
                              Enhanced glassmorphism with gradient backgrounds and stronger shadows.
                              More visual impact while staying modern.
                            </p>
                            <div className="space-y-2">
                              <div className="bg-synthwave-bg-primary/25 backdrop-blur-sm p-3 rounded-xl">
                                <p className="text-synthwave-text-secondary text-sm font-rajdhani">Sample content area</p>
                              </div>
                              <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-4">
                                <p className="text-synthwave-text-secondary text-sm font-rajdhani">Workout subcontainer (used in TodaysWorkoutCard phase display, workout description, coach notes)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-400 font-rajdhani text-sm">
                            <strong>Benefits:</strong> More visual impact than Option 1, gradient depth,
                            stronger shadows for hierarchy, still modern and accessible.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 3: Minimal Modern */}
                    <div className="space-y-4 mt-8">
                      <h4 className="font-rajdhani text-lg text-synthwave-text-primary font-semibold">Option 3: Minimal Modern (Clean)</h4>
                      <div className="bg-synthwave-bg-card/25 rounded-3xl shadow-xl h-64 overflow-hidden border-0">
                        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                          <h5 className="font-russo text-lg text-white mb-4 uppercase">Minimal Clean</h5>
                          <p className="text-synthwave-text-primary font-rajdhani mb-4">
                            Ultra-minimal approach with no borders, just subtle background and shadows.
                            Maximum content focus with clean, modern aesthetics.
                          </p>
                          <div className="space-y-2">
                            <div className="bg-synthwave-bg-primary/20 p-3 rounded-2xl">
                              <p className="text-synthwave-text-secondary text-sm font-rajdhani">Sample content area</p>
                            </div>
                            <div className="bg-synthwave-bg-primary/20 p-3 rounded-2xl">
                              <p className="text-synthwave-text-secondary text-sm font-rajdhani">More sample content</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-400 font-rajdhani text-sm">
                          <strong>Benefits:</strong> Maximum content focus, ultra-clean aesthetic,
                          excellent performance, works on any screen size, timeless design.
                        </p>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/30 rounded-xl p-6 mt-8">
                      <h4 className="font-russo text-lg text-synthwave-neon-pink mb-4 uppercase">My Recommendation</h4>
                      <p className="text-synthwave-text-primary font-rajdhani mb-4">
                        <strong>Option 1 (Subtle Glassmorphism)</strong> is the sweet spot for your main content containers.
                        It maintains the synthwave brand identity while embracing modern 2025 design standards. The subtle cyan
                        hints preserve your color theme without overwhelming the content.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                        <div>
                          <h5 className="text-synthwave-neon-pink font-semibold mb-2">Perfect for:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Workout detail pages</li>
                            <li>• Weekly report viewers</li>
                            <li>• Coach conversation containers</li>
                            <li>• Management interfaces</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-synthwave-neon-cyan font-semibold mb-2">Key Advantages:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Reduces eye strain</li>
                            <li>• Improves content readability</li>
                            <li>• Works on mobile devices</li>
                            <li>• Future-proof design</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Glassmorphism Containers */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      General Glassmorphism Containers - Modern Trend
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      {/* Light Glass */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Light Glass</h4>
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Light Glass</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Subtle glassmorphism with light background blur and minimal borders.
                            Perfect for overlays and floating elements.
                          </p>
                        </div>
                      </div>

                      {/* Medium Glass */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Medium Glass</h4>
                        <div className="bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-cyan/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-cyan/10">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Medium Glass</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Enhanced glassmorphism with themed background and colored shadows.
                            Ideal for main content areas and cards.
                          </p>
                        </div>
                      </div>

                      {/* Heavy Glass */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Heavy Glass</h4>
                        <div className="bg-synthwave-bg-card/50 backdrop-blur-xl border border-synthwave-neon-purple/30 rounded-2xl p-6 shadow-2xl shadow-synthwave-neon-purple/20">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Heavy Glass</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Strong glassmorphism with pronounced blur and enhanced shadows.
                            Best for modals and important UI elements.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Gradient Containers */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Gradient Containers - Visual Impact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Subtle Gradient */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Subtle Gradient</h4>
                        <div className="bg-gradient-to-br from-synthwave-bg-card/80 to-synthwave-bg-primary/80 border border-synthwave-neon-pink/20 rounded-xl p-6">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Subtle Background</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani">
                            Gentle gradient from card to primary background colors.
                            Provides depth without overwhelming content.
                          </p>
                        </div>
                      </div>

                      {/* Bold Gradient */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Bold Gradient</h4>
                        <div className="bg-gradient-to-br from-synthwave-neon-pink/20 via-synthwave-neon-purple/10 to-synthwave-neon-cyan/20 border border-synthwave-neon-cyan/30 rounded-xl p-6">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Neon Gradient</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani">
                            Multi-color gradient using theme neon colors.
                            Creates visual interest for hero sections and highlights.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Modern Card Layouts */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Card Layouts - 2025 Standards
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      {/* Minimal Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Minimal Card</h4>
                        <div className="bg-synthwave-bg-card/20 hover:bg-synthwave-bg-card/40 border-0 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-synthwave-neon-pink/10">
                          <div className="flex items-start space-x-3 mb-4">
                            <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                            <h5 className="font-russo text-lg text-white uppercase">Minimal</h5>
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Clean, borderless design with subtle hover effects.
                            Modern approach focusing on content over decoration.
                          </p>
                        </div>
                      </div>

                      {/* Outlined Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Outlined Card</h4>
                        <div className="bg-transparent hover:bg-synthwave-neon-cyan/5 border-2 border-synthwave-neon-cyan/30 hover:border-synthwave-neon-cyan/60 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
                          <div className="flex items-start space-x-3 mb-4">
                            <div className="w-3 h-3 border-2 border-synthwave-neon-cyan rounded-full flex-shrink-0 mt-2"></div>
                            <h5 className="font-russo text-lg text-white uppercase">Outlined</h5>
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Prominent border with transparent background.
                            Emphasizes structure while maintaining lightness.
                          </p>
                        </div>
                      </div>

                      {/* Elevated Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple">Elevated Card</h4>
                        <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-purple/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-purple/20 hover:shadow-2xl hover:shadow-synthwave-neon-purple/30 transition-all duration-300 hover:-translate-y-2">
                          <div className="flex items-start space-x-3 mb-4">
                            <div className="w-3 h-3 bg-gradient-to-r from-synthwave-neon-purple to-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                            <h5 className="font-russo text-lg text-white uppercase">Elevated</h5>
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Strong shadow elevation with enhanced hover effects.
                            Creates depth hierarchy and draws attention.
                          </p>
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Content Card</h4>
                        <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 transition-all duration-300 hover:-translate-y-1">
                          <p className="text-synthwave-text-primary font-rajdhani text-base mb-3 leading-relaxed">
                            This is a content-focused card without headers. Perfect for displaying user-generated content like memories, notes, or messages where the content itself is the primary focus.
                          </p>
                          <div className="flex flex-wrap items-center gap-4 font-rajdhani text-synthwave-text-primary text-sm">
                            <div className="bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani">
                              Personal
                            </div>
                            <div className="bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani">
                              High Priority
                            </div>
                            <div className="text-synthwave-text-secondary">
                              2 days ago
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Info Card</h4>
                        <div className={containerPatterns.infoCard}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-rajdhani text-sm text-white font-medium truncate">
                                Coach Identity
                              </div>
                              <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1">
                                Created: Jan 15, 2024 • 12 conversations
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                          Static information display without hover effects. Used for coach config details, metadata, and non-interactive content sections.
                        </p>
                      </div>

                      {/* Tips Item Card */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Tips Item Card</h4>
                        <div className={containerPatterns.minimalCardStatic}>
                          <div className="mb-2">
                            <h5 className="font-rajdhani text-base text-white font-medium">Training Goals</h5>
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Be specific about your fitness objectives. Instead of "get stronger," try "increase my deadlift 1RM by 20 pounds" or "complete 10 unbroken pull-ups."
                          </p>
                        </div>
                        <p className="text-synthwave-text-secondary font-rajdhani text-xs">
                          Static tips content card without hover effects or color dots. Used in ChatInput tips popup for clean, minimal help content display.
                        </p>
                      </div>
                    </div>

                    {/* Dashed Card */}
                    <div className="mt-8">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-pink mb-4">Dashed Card (Create/Add Actions)</h4>
                      <div className="bg-synthwave-bg-card/20 backdrop-blur-sm border-2 border-dashed border-synthwave-neon-pink/30 rounded-2xl shadow-lg shadow-synthwave-neon-pink/10 transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-pink/50 hover:shadow-xl hover:shadow-synthwave-neon-pink/20 hover:-translate-y-1 p-6">
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="w-3 h-3 border-2 border-dashed border-synthwave-neon-pink rounded-full flex-shrink-0 mt-2"></div>
                          <h5 className="font-russo text-lg text-white uppercase">Create New</h5>
                        </div>
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          Dashed border container for create/add actions. Perfect for "Add New Coach" cards
                          and other creation interfaces. Uses pink theme for primary creation actions.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Interactive States */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Interactive Container States
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Loading State */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Loading State</h4>
                        <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-synthwave-neon-pink/10 to-transparent animate-pulse"></div>
                          <div className="relative">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-4 h-4 border-2 border-synthwave-neon-pink border-t-transparent rounded-full animate-spin"></div>
                              <h5 className="font-russo text-lg text-white uppercase">Loading</h5>
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse"></div>
                              <div className="h-3 bg-synthwave-text-muted/20 rounded animate-pulse w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Error State */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-red-400">Error State</h4>
                        <div className={containerPatterns.errorState}>
                          <div className="flex items-center space-x-3 mb-4">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h5 className="font-russo text-lg text-red-400 uppercase">Error</h5>
                          </div>
                          <p className="text-red-300 font-rajdhani text-sm">
                            Error state container with appropriate color coding and iconography.
                            Clearly communicates issues while maintaining design consistency.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Modern Chat Interface Containers */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Chat Interface Containers - 2025 Standards
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Enhanced User Bubble */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Enhanced User Bubble</h4>
                        <div className="flex justify-end">
                          <div className="bg-gradient-to-br from-synthwave-neon-pink/80 to-synthwave-neon-pink/60 text-white border-0 rounded-2xl rounded-br-md p-4 max-w-xs shadow-xl shadow-synthwave-neon-pink/30 backdrop-blur-sm">
                            <p className="font-rajdhani">Modern gradient bubble with enhanced shadows and borderless design for cleaner aesthetics.</p>
                            <div className="flex justify-end mt-2 space-x-1">
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced AI Bubble */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Enhanced AI Bubble</h4>
                        <div className="flex justify-start">
                          <div className={`${containerPatterns.aiChatBubble} p-4 max-w-xs`}>
                            <p className="font-rajdhani">Glassmorphism AI bubble with backdrop blur and subtle shadows for modern depth perception.</p>
                            <div className="flex justify-start mt-2 space-x-1">
                              <div className="w-2 h-2 bg-synthwave-neon-cyan/60 rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Floating Input */}
                    <div className="mt-8">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-purple mb-4">Advanced Floating Input</h4>
                      <div className="relative">
                        <div className="bg-gradient-to-r from-synthwave-bg-card/90 via-synthwave-bg-card/95 to-synthwave-bg-card/90 backdrop-blur-xl border border-synthwave-neon-purple/20 shadow-2xl shadow-synthwave-neon-purple/20 rounded-2xl p-6">
                          <p className="text-synthwave-text-secondary font-rajdhani mb-4 text-sm">
                            Next-gen floating input with gradient backgrounds, enhanced blur effects, and seamless integration.
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="flex-1 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-purple/20 rounded-2xl p-4 focus-within:border-synthwave-neon-purple/50 transition-all duration-300">
                              <span className="text-synthwave-text-muted font-rajdhani">Enhanced message input...</span>
                            </div>
                            <button className="p-4 bg-gradient-to-r from-synthwave-neon-purple to-synthwave-neon-pink text-white rounded-2xl shadow-lg shadow-synthwave-neon-purple/30 hover:shadow-xl hover:shadow-synthwave-neon-purple/40 transition-all duration-300">
                              <SendIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Quick Stats Bar Container */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Quick Stats Bar Container - Modern Dashboard Pattern
                    </h3>
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Training Grounds Quick Stats Bar</h4>
                      <div className="bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 p-4">
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                          {/* Stat 1 - Pink */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                              <ConversationIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">12</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Chats</div>
                            </div>
                          </div>

                          {/* Stat 2 - Cyan */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                              <ConversationIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">48</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Messages</div>
                            </div>
                          </div>

                          {/* Stat 3 - Purple */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50">
                              <WorkoutIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">24</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Workouts</div>
                            </div>
                          </div>

                          {/* Stat 4 - Pink */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                              <WorkoutIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">3</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">This Week</div>
                            </div>
                          </div>

                          {/* Stat 5 - Cyan */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                              <WorkoutIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">2</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Days Ago</div>
                            </div>
                          </div>

                          {/* Stat 6 - Purple */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 hover:text-synthwave-neon-purple rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50">
                              <ProgramIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">1</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Programs</div>
                            </div>
                          </div>

                          {/* Stat 7 - Pink */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50">
                              <LightningIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">15</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Days</div>
                            </div>
                          </div>

                          {/* Stat 8 - Cyan */}
                          <div className="flex items-center gap-2 group cursor-pointer min-w-[120px]">
                            <div className="p-2 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 hover:text-synthwave-neon-cyan rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                              <ReportIcon />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-russo font-bold text-white group-hover:scale-105 transition-transform duration-300">7</div>
                              <div className="text-xs text-synthwave-text-muted font-rajdhani uppercase tracking-wide">Reports</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-synthwave-bg-card/20 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          <strong className="text-synthwave-neon-cyan">Quick Stats Bar Features:</strong> Horizontal layout with repeating pink → cyan → purple color pattern,
                          compact icon + number + label design, hover animations, focus rings for accessibility, responsive grid (2 cols mobile, 8 cols desktop),
                          and consistent spacing. Perfect for dashboard overview sections.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Mobile-First Containers */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Mobile-First Container Design
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Mobile Optimized */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Mobile Optimized</h4>
                        <div className="bg-synthwave-bg-card/40 border border-synthwave-neon-cyan/30 rounded-2xl p-4 md:p-6">
                          <h5 className="font-russo text-base md:text-lg text-white mb-3 uppercase">Responsive</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm md:text-base">
                            Responsive padding and typography that adapts to screen size.
                            Ensures optimal touch targets and readability on all devices.
                          </p>
                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <button className="px-4 py-2 bg-synthwave-neon-cyan text-synthwave-bg-primary rounded-lg text-sm font-rajdhani font-semibold">
                              Mobile Action
                            </button>
                            <button className="px-4 py-2 border border-synthwave-neon-cyan text-synthwave-neon-cyan rounded-lg text-sm font-rajdhani font-semibold">
                              Secondary
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Touch-Friendly */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink">Touch-Friendly</h4>
                        <div className="bg-synthwave-bg-card/40 border border-synthwave-neon-pink/30 rounded-2xl p-6">
                          <h5 className="font-russo text-lg text-white mb-3 uppercase">Touch UI</h5>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm mb-4">
                            Generous spacing and large touch targets for mobile interaction.
                            Minimum 44px touch targets with adequate spacing.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button className="h-12 bg-synthwave-neon-pink text-synthwave-bg-primary rounded-lg font-rajdhani font-semibold text-sm">
                              Touch Me
                            </button>
                            <button className="h-12 border-2 border-synthwave-neon-pink text-synthwave-neon-pink rounded-lg font-rajdhani font-semibold text-sm">
                              Or Me
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Inline Edit Input */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Inline Edit Input - Modern Text Editing
                    </h3>
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold">Inline Text Editor</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value="Fortis Ascensus Awesome"
                            className={inputPatterns.inlineEdit}
                            placeholder="Enter text..."
                            readOnly
                          />
                          <button className="p-1.5 bg-synthwave-neon-pink text-synthwave-bg-primary hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button className="p-1.5 border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Guidelines */}
                      <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-xl p-6 mt-6">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold mb-4">Inline Edit Features:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                          <div>
                            <h5 className="text-synthwave-neon-pink font-semibold mb-2">Design Features:</h5>
                            <ul className="space-y-1 text-synthwave-text-secondary">
                              <li>• Fixed height (40px) to prevent layout shift</li>
                              <li>• Moderate border radius (8px) for modern look</li>
                              <li>• Pink border with hover enhancement</li>
                              <li>• Normal font weight for comfortable editing</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-synthwave-neon-cyan font-semibold mb-2">UX Benefits:</h5>
                            <ul className="space-y-1 text-synthwave-text-secondary">
                              <li>• No content jumping during edit mode</li>
                              <li>• Consistent with save/cancel button styling</li>
                              <li>• Appropriate sizing for inline editing</li>
                              <li>• Clean focus states without rings</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-synthwave-neon-pink/10 rounded-lg border border-synthwave-neon-pink/20">
                          <p className="text-synthwave-neon-pink font-rajdhani text-sm">
                            <strong>Usage:</strong> Import inputPatterns from uiPatterns.js and use className={`${inputPatterns.inlineEdit}`} for consistent inline editing across the application.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Modern Toast Notifications */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Toast Notifications - 2025 Gradient Style
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                      {/* Success Toast */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-green-400">Success Toast</h4>
                        <div className="bg-gradient-to-br from-green-500/20 via-synthwave-neon-cyan/10 to-green-400/20 border border-green-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-green-500/20 text-green-400">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-rajdhani font-semibold">Workout saved!</span>
                          </div>
                        </div>
                      </div>

                      {/* Error Toast */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-red-400">Error Toast</h4>
                        <div className="bg-gradient-to-br from-red-500/20 via-synthwave-neon-pink/10 to-red-400/20 border border-red-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-red-500/20 text-red-400">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="font-rajdhani font-semibold">Save failed</span>
                          </div>
                        </div>
                      </div>

                      {/* Warning Toast */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-yellow-400">Warning Toast</h4>
                        <div className="bg-gradient-to-br from-yellow-500/20 via-synthwave-neon-purple/10 to-yellow-400/20 border border-yellow-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-yellow-500/20 text-yellow-400">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="font-rajdhani font-semibold">Check data</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Toast */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan">Info Toast</h4>
                        <div className="bg-gradient-to-br from-synthwave-neon-cyan/20 via-synthwave-neon-purple/10 to-synthwave-neon-pink/20 border border-synthwave-neon-cyan/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-synthwave-neon-cyan/20 text-synthwave-neon-cyan">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-rajdhani font-semibold">New feature</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Toast Guidelines */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/30 rounded-xl p-6 mt-6">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold mb-4">Modern 2025 Toast Features:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                        <div>
                          <h5 className="text-synthwave-neon-cyan font-semibold mb-2">Visual Enhancements:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Diagonal gradient backgrounds with brand colors</li>
                            <li>• Glassmorphism with backdrop-blur effects</li>
                            <li>• Enhanced shadows for depth perception</li>
                            <li>• Modern xl border radius (12px)</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-synthwave-neon-pink font-semibold mb-2">UX Improvements:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Color-coded by semantic meaning</li>
                            <li>• Optimized padding for mobile touch</li>
                            <li>• Consistent iconography and typography</li>
                            <li>• Accessible contrast ratios maintained</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-synthwave-neon-cyan/10 rounded-lg border border-synthwave-neon-cyan/20">
                        <p className="text-synthwave-neon-cyan font-rajdhani text-sm">
                          <strong>Usage:</strong> Import toastPatterns from uiPatterns.js and use className={`${toastPatterns.success}`} for consistent styling across the application.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Modern Input Fields */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Input Fields - 2025 Standards
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                      {/* Standard Input */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold">Standard Input Field</h4>
                        <input
                          type="text"
                          className={inputPatterns.standard}
                          placeholder="Enter your name..."
                          defaultValue=""
                        />
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          Glassmorphism input with subtle backdrop blur, pink accent borders, and smooth focus transitions.
                        </p>
                      </div>

                      {/* Error State Input */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-red-400 font-semibold">Error State Input</h4>
                        <input
                          type="email"
                          className={inputPatterns.error}
                          placeholder="invalid-email"
                          defaultValue="invalid-email"
                        />
                        <p className="text-red-400 font-rajdhani text-sm">
                          Error state with red borders and enhanced focus styling for clear validation feedback.
                        </p>
                      </div>

                      {/* Textarea */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Textarea Field</h4>
                        <textarea
                          className={inputPatterns.textarea}
                          placeholder="Enter your message..."
                          rows={4}
                          defaultValue=""
                        />
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          Multi-line text input with consistent styling, vertical resize capability, and proper minimum height.
                        </p>
                      </div>

                      {/* Inline Edit */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple font-semibold">Inline Edit Input</h4>
                        <input
                          type="text"
                          className={inputPatterns.inlineEdit}
                          defaultValue="Workout Title"
                        />
                        <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                          Fixed-height input for inline editing that prevents layout shifts during edit mode.
                        </p>
                      </div>
                    </div>

                    {/* Input Guidelines */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/30 rounded-xl p-6 mt-8">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-pink font-semibold mb-4">Modern Input Features:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-rajdhani">
                        <div>
                          <h5 className="text-synthwave-neon-cyan font-semibold mb-2">Visual Enhancements:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Glassmorphism with backdrop blur effects</li>
                            <li>• Pink accent colors for focus states</li>
                            <li>• Smooth transitions (300ms duration)</li>
                            <li>• Consistent border radius (xl - 12px)</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-synthwave-neon-pink font-semibold mb-2">UX Improvements:</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary">
                            <li>• Minimum 48px height for accessibility</li>
                            <li>• Clear error states with red styling</li>
                            <li>• Proper focus rings and outline removal</li>
                            <li>• Consistent typography (Rajdhani font)</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-synthwave-neon-cyan/10 rounded-lg border border-synthwave-neon-cyan/20">
                        <p className="text-synthwave-neon-cyan font-rajdhani text-sm">
                          <strong>Usage:</strong> Import inputPatterns from uiPatterns.js and use className={`${inputPatterns.standard}`} for consistent input styling across the application.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Modern Breadcrumb Navigation */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Breadcrumb Navigation - 2025 Standards
                    </h3>

                    <div className="space-y-8">
                      {/* Current vs Proposed Comparison */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Current Breadcrumb */}
                        <div className="space-y-4">
                          <h4 className="font-rajdhani text-lg text-red-400 font-semibold">Current Breadcrumb (Heavy)</h4>
                          <div className="bg-synthwave-bg-secondary/45 backdrop-blur-sm border-b-2 border-synthwave-neon-pink/40 p-4">
                            <div className="flex items-center space-x-2 text-sm font-rajdhani">
                              <HomeIcon />
                              <span className="text-synthwave-text-secondary">Home</span>
                              <span className="text-white font-medium">/</span>
                              <span className="text-synthwave-text-secondary">Training Grounds</span>
                              <span className="text-white font-medium">/</span>
                              <span className="text-synthwave-neon-pink font-medium">Workouts</span>
                            </div>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400 font-rajdhani text-sm">
                              <strong>Issues:</strong> Heavy border, harsh colors, sharp edges, poor mobile experience, competes with content.
                            </p>
                          </div>
                        </div>

                        {/* Proposed Modern Breadcrumb */}
                        <div className="space-y-4">
                          <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Proposed Modern (Recommended)</h4>
                          <div className="bg-synthwave-bg-card/20 backdrop-blur-xl border border-synthwave-neon-cyan/10 rounded-2xl shadow-lg shadow-synthwave-neon-cyan/5 p-4 hover:bg-synthwave-bg-card/30 hover:border-synthwave-neon-cyan/15 transition-all duration-300">
                            <div className="flex items-center space-x-3 text-sm font-rajdhani">
                              <div className="p-1.5 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan rounded-lg hover:bg-synthwave-neon-cyan/20 transition-all duration-200">
                                <HomeIcon />
                              </div>
                              <span className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer">Home</span>

                              <div className="text-synthwave-text-muted/60">
                                <ChevronRightIcon />
                              </div>

                              <span className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200 cursor-pointer">Training Grounds</span>

                              <div className="text-synthwave-text-muted/60">
                                <ChevronRightIcon />
                              </div>

                              <span className="text-synthwave-neon-pink font-medium bg-synthwave-neon-pink/10 px-2 py-1 rounded-lg">Workouts</span>
                            </div>
                          </div>
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <p className="text-green-400 font-rajdhani text-sm">
                              <strong>Benefits:</strong> Glassmorphism, subtle shadows, rounded corners, hover effects, mobile-friendly, modern aesthetics.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Alternative Modern Styles */}
                      <div className="space-y-6">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-purple font-semibold">Alternative Modern Styles</h4>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Minimal Clean Style */}
                          <div className="space-y-4">
                            <h5 className="font-rajdhani text-base text-synthwave-text-primary">Minimal Clean</h5>
                            <div className="bg-synthwave-bg-card/10 rounded-xl p-4 border-0">
                              <div className="flex items-center space-x-2 text-sm font-rajdhani">
                                <span className="text-synthwave-neon-cyan hover:text-white transition-colors duration-200 cursor-pointer">Home</span>
                                <span className="text-synthwave-text-muted/40">•</span>
                                <span className="text-synthwave-neon-cyan hover:text-white transition-colors duration-200 cursor-pointer">Training</span>
                                <span className="text-synthwave-text-muted/40">•</span>
                                <span className="text-white font-medium">Workouts</span>
                              </div>
                            </div>
                            <p className="text-synthwave-text-secondary font-rajdhani text-xs">Ultra-minimal with dot separators and no container styling.</p>
                          </div>

                          {/* Pill Style */}
                          <div className="space-y-4">
                            <h5 className="font-rajdhani text-base text-synthwave-text-primary">Pill Style</h5>
                            <div className="flex items-center space-x-2 text-sm font-rajdhani">
                              <span className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan px-3 py-1.5 rounded-full hover:bg-synthwave-neon-cyan/20 transition-all duration-200 cursor-pointer">Home</span>
                              <div className="text-synthwave-text-muted/60">
                                <ChevronRightIcon />
                              </div>
                              <span className="bg-synthwave-neon-purple/10 text-synthwave-neon-purple px-3 py-1.5 rounded-full hover:bg-synthwave-neon-purple/20 transition-all duration-200 cursor-pointer">Training</span>
                              <div className="text-synthwave-text-muted/60">
                                <ChevronRightIcon />
                              </div>
                              <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium">Workouts</span>
                            </div>
                            <p className="text-synthwave-text-secondary font-rajdhani text-xs">Individual pill-styled breadcrumbs with color-coded hierarchy.</p>
                          </div>

                          {/* Floating Style */}
                          <div className="space-y-4">
                            <h5 className="font-rajdhani text-base text-synthwave-text-primary">Floating Glassmorphism</h5>
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-xl inline-flex items-center space-x-3 text-sm font-rajdhani">
                              <div className="p-1 bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan rounded-full">
                                <HomeIcon />
                              </div>
                              <span className="text-white/80 hover:text-white transition-colors duration-200 cursor-pointer">Home</span>
                              <div className="text-white/40">
                                <ChevronRightIcon />
                              </div>
                              <span className="text-white/80 hover:text-white transition-colors duration-200 cursor-pointer">Training</span>
                              <div className="text-white/40">
                                <ChevronRightIcon />
                              </div>
                              <span className="text-synthwave-neon-pink font-medium">Workouts</span>
                            </div>
                            <p className="text-synthwave-text-secondary font-rajdhani text-xs">Floating pill with heavy glassmorphism and enhanced blur effects.</p>
                          </div>

                          {/* Compact Mobile Style */}
                          <div className="space-y-4">
                            <h5 className="font-rajdhani text-base text-synthwave-text-primary">Compact Mobile</h5>
                            <div className="bg-synthwave-bg-card/30 rounded-xl p-3 border border-synthwave-neon-pink/20">
                              <div className="flex items-center justify-between text-sm font-rajdhani">
                                <div className="flex items-center space-x-2">
                                  <button className="p-1 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded transition-colors duration-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <span className="text-white font-medium">Workouts</span>
                                </div>
                                <div className="text-synthwave-text-muted text-xs">Training Grounds</div>
                              </div>
                            </div>
                            <p className="text-synthwave-text-secondary font-rajdhani text-xs">Mobile-optimized with back button and context hint.</p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Features */}
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Modern Interactive Features</h4>
                        <div className="bg-synthwave-bg-card/20 backdrop-blur-xl border border-synthwave-neon-cyan/10 rounded-2xl p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-rajdhani">
                            <div>
                              <h5 className="text-synthwave-neon-pink font-semibold mb-3">Enhanced UX Features:</h5>
                              <ul className="space-y-2 text-synthwave-text-secondary">
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-pink mt-0.5">•</span>
                                  <span><strong>Hover Effects:</strong> Subtle background changes and color transitions</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-pink mt-0.5">•</span>
                                  <span><strong>Active State:</strong> Current page highlighted with brand color and background</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-pink mt-0.5">•</span>
                                  <span><strong>Touch Friendly:</strong> Adequate padding for mobile interaction</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-pink mt-0.5">•</span>
                                  <span><strong>Keyboard Navigation:</strong> Focus rings and arrow key support</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-synthwave-neon-cyan font-semibold mb-3">Visual Enhancements:</h5>
                              <ul className="space-y-2 text-synthwave-text-secondary">
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-cyan mt-0.5">•</span>
                                  <span><strong>Glassmorphism:</strong> Backdrop blur with subtle transparency</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-cyan mt-0.5">•</span>
                                  <span><strong>Smooth Transitions:</strong> 200-300ms duration for all interactions</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-cyan mt-0.5">•</span>
                                  <span><strong>Consistent Spacing:</strong> 12px padding, 16px gaps between items</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <span className="text-synthwave-neon-cyan mt-0.5">•</span>
                                  <span><strong>Modern Icons:</strong> Rounded chevrons and iconography</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Modern Delete Modal */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Modern Delete Modal - Destructive Action Container
                    </h3>
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-red-400 font-semibold">Delete Modal Container (2025 Standards)</h4>
                      <div className="flex justify-center">
                        <div className={`${containerPatterns.deleteModal} p-6 max-w-md w-full`}>
                          <div className="text-center">
                            <h5 className="text-red-400 font-rajdhani text-xl font-bold mb-2">
                              Delete Item
                            </h5>
                            <p className="font-rajdhani text-base text-synthwave-text-secondary mb-6">
                              Are you sure you want to delete this item? This action cannot be undone.
                            </p>
                            <div className="flex space-x-4">
                              <button className={`flex-1 ${buttonPatterns.secondary} text-sm`}>
                                Cancel
                              </button>
                              <button className={`flex-1 ${buttonPatterns.primary} text-sm`}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-400 font-rajdhani text-sm">
                          <strong>Modern Features:</strong> Diagonal red gradient background, glassmorphism with backdrop blur,
                          2xl border radius (16px), enhanced shadows for depth, destructive theming with red accents,
                          and smooth transitions. Perfect for delete confirmations and destructive actions.
                        </p>
                      </div>
                      <div className="bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/20 rounded-lg p-4">
                        <p className="text-synthwave-neon-cyan font-rajdhani text-sm">
                          <strong>Usage:</strong> Import containerPatterns from uiPatterns.js and use className={`${containerPatterns.deleteModal}`}
                          for consistent delete modal styling across the application.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Recommendations */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Container Design Recommendations
                    </h3>
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-xl p-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Modern Best Practices:</h4>
                        <ul className="space-y-2 text-synthwave-text-primary font-rajdhani">
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Glassmorphism:</strong> Use backdrop-blur for modern depth without heaviness</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Rounded Corners:</strong> 2xl (16px) for cards, xl (12px) for smaller elements</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Subtle Animations:</strong> Hover translations (-translate-y-1) and shadow changes</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Consistent Spacing:</strong> 24px (p-6) for cards, 16px (p-4) for compact elements</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Color Hierarchy:</strong> Pink for primary, cyan for secondary, purple for accent</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Mobile First:</strong> Responsive padding and touch-friendly sizing</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Loading States:</strong> Skeleton screens and progress indicators for better UX</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* PATTERNS SECTION */}
              {activeCategory === 'patterns' && (
                <div className="space-y-12">
                  <h2 className="font-russo text-3xl text-synthwave-neon-pink mb-8 text-center uppercase">
                    Interactive Patterns
                  </h2>

                  {/* Inline Edit Pattern */}
                  <section className="space-y-6">
                    <h3 className="font-russo text-xl text-white mb-4 uppercase border-b border-synthwave-neon-pink/30 pb-2">
                      Inline Edit Pattern (InlineEditField.jsx)
                    </h3>

                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/20 rounded-xl p-6 space-y-4">
                      <p className="text-synthwave-text-primary font-rajdhani">
                        <strong className="text-synthwave-neon-cyan">Overview:</strong> Standardized inline editing pattern
                        with consistent sizing, colors, tooltips, and keyboard shortcuts. Used for editing coach names, conversation
                        titles, and workout titles across the application.
                      </p>
                      <p className="text-synthwave-text-primary font-rajdhani">
                        <strong className="text-synthwave-neon-cyan">Key Features:</strong> Three size variants (small/medium/large),
                        pink accent color matching FormInput/AuthInput, consistent tooltips (edit=top, actions=bottom), keyboard
                        shortcuts (Enter to save, Esc to cancel), loading states, and flexible validation.
                      </p>
                    </div>

                    {/* Small Size */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Small Size</h4>
                      <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-xl p-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-synthwave-text-secondary font-rajdhani text-sm">Example:</span>
                            <InlineEditField
                              value="Small Text Example"
                              onSave={async (newValue) => { console.info('Saved:', newValue); return true; }}
                              placeholder="Enter small text..."
                              size="small"
                            />
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Used for compact UI elements, labels, or tags. Icon size: Edit w-4 h-4, Actions w-3 h-3.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Medium Size */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Medium Size (Default)</h4>
                      <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-xl p-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-synthwave-text-secondary font-rajdhani">Example:</span>
                            <InlineEditField
                              value="Medium Text Example"
                              onSave={async (newValue) => { console.info('Saved:', newValue); return true; }}
                              placeholder="Enter medium text..."
                              size="medium"
                            />
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Used for standard titles like coach names and conversation titles. Icon size: Edit w-5 h-5, Actions w-4 h-4.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Large Size */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Large Size</h4>
                      <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-xl p-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-synthwave-text-secondary font-rajdhani text-lg">Example:</span>
                            <InlineEditField
                              value="Large Text Example"
                              onSave={async (newValue) => { console.info('Saved:', newValue); return true; }}
                              placeholder="Enter large text..."
                              size="large"
                            />
                          </div>
                          <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                            Used for prominent headers like workout titles. Icon size: Edit w-6 h-6, Actions w-5 h-5.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* States */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">States & Behavior</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-lg p-4">
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Display Mode</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• Hover reveals edit icon</li>
                            <li>• Pink accent on hover</li>
                            <li>• Tooltip: "Edit [item] name" (top, offset 4px)</li>
                            <li>• Click to enter edit mode</li>
                          </ul>
                        </div>
                        <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-lg p-4">
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Edit Mode</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• Pink border input field</li>
                            <li>• Save button (Enter) - pink bg</li>
                            <li>• Cancel button (Esc) - cyan border</li>
                            <li>• Tooltips bottom, offset 8px</li>
                          </ul>
                        </div>
                        <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-lg p-4">
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Loading State</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• Spinner replaces save icon</li>
                            <li>• Buttons disabled</li>
                            <li>• 50% opacity</li>
                            <li>• Prevents interaction</li>
                          </ul>
                        </div>
                        <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-lg p-4">
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Validation</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• Flexible validation patterns</li>
                            <li>• Save button disabled if invalid</li>
                            <li>• onSave returns true/false</li>
                            <li>• Error handling by parent</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Code Example */}
                    <div className="space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Usage Example</h4>
                      <div className="bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded-lg p-4">
                        <pre className="text-synthwave-text-primary font-mono text-xs overflow-x-auto">
{`// Import the component
import InlineEditField from './common/InlineEditField';

// Basic usage
<InlineEditField
  value={coachData.name}
  onSave={handleSaveCoachName}
  placeholder="Enter coach name..."
  size="medium"
/>

// With custom display styling
<InlineEditField
  value={workout.title}
  onSave={handleSaveWorkoutTitle}
  placeholder="Enter workout name..."
  size="large"
  displayClassName="font-rajdhani font-bold text-2xl text-white"
/>

// Using CoachAgent helper (eliminates duplicate code)
const handleSaveCoachName = coachAgent.createCoachNameHandler(
  userId,
  coachId,
  setCoachData,
  { success, error }
);`}
                        </pre>
                      </div>
                    </div>

                    {/* Pattern Details */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/20 rounded-xl p-6 space-y-4">
                      <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Pattern Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Icon Sizes</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• <strong>Small:</strong> Edit w-4 h-4, Actions w-3 h-3</li>
                            <li>• <strong>Medium:</strong> Edit w-5 h-5, Actions w-4 h-4</li>
                            <li>• <strong>Large:</strong> Edit w-6 h-6, Actions w-5 h-5</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Colors</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• <strong>Primary:</strong> Neon pink (#ff6ec7)</li>
                            <li>• <strong>Secondary:</strong> Neon cyan (#00f0ff)</li>
                            <li>• <strong>Input Border:</strong> Pink on focus</li>
                            <li>• <strong>Buttons:</strong> Pink primary, cyan secondary</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Tooltips</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• <strong>Edit:</strong> Top placement, offset 4px</li>
                            <li>• <strong>Actions:</strong> Bottom placement, offset 8px</li>
                            <li>• <strong>Transform:</strong> translateX(-8px)</li>
                            <li>• <strong>Style:</strong> Black bg, white text, 8px radius</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-rajdhani text-synthwave-neon-pink font-semibold mb-2">Keyboard Shortcuts</h5>
                          <ul className="space-y-1 text-synthwave-text-secondary font-rajdhani text-sm">
                            <li>• <strong>Enter:</strong> Save changes</li>
                            <li>• <strong>Escape:</strong> Cancel edit</li>
                            <li>• <strong>Auto-focus:</strong> Input on edit</li>
                            <li>• <strong>Disabled:</strong> When loading</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Implementation Notes */}
                    <div className="bg-synthwave-neon-pink/10 border border-synthwave-neon-pink/20 rounded-lg p-4">
                      <p className="text-synthwave-neon-pink font-rajdhani text-sm">
                        <strong>Implementation:</strong> This pattern consolidates 3 different inline edit implementations
                        (coach name, conversation title, workout title) into a single reusable component, eliminating ~190 lines
                        of duplicate code. All patterns are defined in <code className="bg-synthwave-bg-primary px-1 rounded">inlineEditPatterns</code>
                        {' '}from <code className="bg-synthwave-bg-primary px-1 rounded">uiPatterns.js</code>.
                      </p>
                    </div>

                    {/* Best Practices */}
                    <div className="bg-synthwave-bg-card/30 border border-synthwave-neon-cyan/30 rounded-xl p-6">
                      <div className="space-y-4">
                        <h4 className="font-rajdhani text-lg text-synthwave-neon-cyan font-semibold">Best Practices:</h4>
                        <ul className="space-y-2 text-synthwave-text-primary font-rajdhani">
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Size Selection:</strong> Use small for labels, medium for standard titles, large for prominent headers</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Validation:</strong> Return true/false from onSave to control edit mode exit</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Toast Notifications:</strong> Show success/error messages in onSave handler</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Agent Integration:</strong> Use CoachAgent.createCoachNameHandler() to eliminate duplicate code</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Display Styling:</strong> Use displayClassName prop for custom text styling</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Accessibility:</strong> Keyboard shortcuts (Enter/Esc) and tooltips included</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-synthwave-neon-cyan mt-1">•</span>
                            <span><strong>Loading States:</strong> Component handles loading UI automatically during save</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </NeonBorder>
        </div>
      </div>
    </div>
  );
}

export default Theme;
