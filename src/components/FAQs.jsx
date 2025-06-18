import React from 'react';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder, GlitchText } from './themes/SynthwaveComponents';

function FAQs() {
  const faqs = [
    {
      question: "Is this affiliated with CrossFit Inc. or other training programs?",
      answer: "No, we're an independent platform inspired by proven methodologies but not affiliated with any specific training programs or organizations."
    },
    {
      question: "Do I need a human coach to use this?",
      answer: "Not at all! Many users want to avoid the cost and scheduling challenges of human coaches. Your AI coach works independently, though we'll add collaborative features for those who want both."
    },
    {
      question: "How is this different from other fitness apps?",
      answer: "Most apps give you pre-built programs or generic AI. We let you create your own AI coach from scratch, exactly how you want it to think, communicate, and program for you."
    },
    {
      question: "What if I'm new to fitness?",
      answer: "Perfect! We're designing this to work for beginners through elite athletes. The guided setup process will help you create a coach that matches your experience level and goals."
    },
    {
      question: "When will this be available?",
      answer: "We're targeting late 2025 for launch. Join our waitlist to be first to know when we're ready, or reach out if you're interested in collaborating during development."
    },
    {
      question: "Will my data be safe?",
      answer: "Absolutely. We're built on enterprise-grade security infrastructure and will never share your personal fitness data with third parties."
    }
  ];

  return (
    <div className={themeClasses.container}>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-32 px-8 text-center min-h-[50vh] flex flex-col justify-center bg-gradient-to-br from-synthwave-bg-primary via-purple-900/20 to-synthwave-bg-secondary" style={{backgroundImage: 'url(images/hero-splash-2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay'}}>
        <div className="absolute inset-0 grid-bg opacity-15"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <GlitchText className="font-russo font-black text-5xl md:text-6xl text-white mb-8 uppercase">
            Frequently Asked Questions
          </GlitchText>
          <h2 className={`${themeClasses.heroSubtitle} max-w-3xl mx-auto`}>
            Everything you need to know about building your perfect AI fitness coach
          </h2>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-b from-synthwave-bg-secondary via-synthwave-bg-primary to-synthwave-bg-secondary">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-16 text-center uppercase">
            Common Questions
          </h2>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`p-8 bg-synthwave-bg-card/50 hover:bg-synthwave-bg-card/70 transition-all duration-300 border rounded-xl ${
                  index % 3 === 0 ? 'border-synthwave-neon-pink/30 hover:border-synthwave-neon-pink/50' :
                  index % 3 === 1 ? 'border-synthwave-neon-cyan/30 hover:border-synthwave-neon-cyan/50' :
                  'border-synthwave-neon-purple/30 hover:border-synthwave-neon-purple/50'
                }`}
              >
                <h3 className={`font-russo text-lg md:text-xl mb-4 uppercase ${
                  index % 3 === 0 ? 'text-synthwave-neon-pink' :
                  index % 3 === 1 ? 'text-synthwave-neon-cyan' :
                  'text-synthwave-neon-purple'
                }`}>
                  Q: {faq.question}
                </h3>
                <p className="font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed">
                  <span className={`font-bold ${
                    index % 3 === 0 ? 'text-synthwave-neon-pink' :
                    index % 3 === 1 ? 'text-synthwave-neon-cyan' :
                    'text-synthwave-neon-purple'
                  }`}>A:</span> {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center bg-gradient-to-r from-cyan-900/30 via-synthwave-bg-primary to-pink-900/30 border-t border-synthwave-neon-cyan/30">
        <div className="max-w-3xl mx-auto px-8">
          <h2 className="font-russo font-black text-3xl md:text-4xl text-white mb-6 uppercase">
            Still Have Questions?
          </h2>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary mb-8 leading-relaxed">
            We're here to help! Join our community or reach out directly.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button className={themeClasses.neonButton}>
              Join the Waitlist
            </button>
            <button className={themeClasses.cyanButton}>
              Contact Us
            </button>
          </div>

          <div className="mt-12">
            <GlitchText className="font-russo text-xl text-synthwave-neon-purple">
              YOUR QUESTIONS DRIVE OUR DEVELOPMENT
            </GlitchText>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FAQs;