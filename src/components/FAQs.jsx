import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns
} from '../utils/ui/uiPatterns';
import Footer from './shared/Footer';

function FAQs() {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState(null);

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      question: "What exactly is NeonPanda?",
      answer: "NeonPanda: Where electric intelligence meets approachable excellence. We're not just building AI coaches – we're creating relationships that transform lives, one workout at a time. NeonPanda is your complete AI coaching ecosystem! Create custom AI coaches with unique personalities, chat with them 24/7, log workouts, track progress with detailed analytics, save personal memories, and manage your entire fitness journey. It's like having a personal trainer, training partner, and progress tracker all rolled into one smart, electric companion."
    },
    {
      question: "How do I create my AI coach?",
      answer: "We make it conversational and fun! Our Coach Creator walks you through building your perfect coach - their personality, training style, communication approach, and expertise areas. Want a tough-love CrossFit coach? A zen yoga master? A technical powerlifting guru? In minutes, you'll have a coach that talks, thinks, and motivates exactly how you want."
    },
    {
      question: "Can I have multiple coaches?",
      answer: "Absolutely! Many users create different coaches for different goals - maybe a strength coach for the gym, a cardio coach for running, and a flexibility coach for recovery days. Each one has their own personality and expertise. It's like having an entire coaching staff in your pocket!"
    },
    {
      question: "What can I do with my AI coach?",
      answer: "Everything! Chat about your goals and struggles, get custom workouts designed for your equipment and time, log your training sessions, receive detailed weekly progress reports, save important memories and insights, and get real-time motivation and form tips. Your coach evolves with you, remembering what works and adapting to your progress."
    },
    {
      question: "How does the workout system work?",
      answer: "Your coach creates personalized workouts based on your goals, available equipment, time constraints, and current fitness level. Log your results right in the app, and your coach will adjust future sessions based on your performance. No more guessing - every workout is designed specifically for where you are and where you want to go."
    },
    {
      question: "What equipment do I need to get started?",
      answer: "Your coach adapts to whatever you have! Got a full gym membership? Perfect. Home gym with basics? Great. Just bodyweight and resistance bands? No problem. During coach creation, you'll specify your available equipment, and your coach will design workouts specifically for your setup. You can always update your equipment list as it changes."
    },
    {
      question: "What about progress tracking and analytics?",
      answer: "We're data nerds who make it simple! Get detailed weekly reports showing your progress trends, workout consistency, strength gains, and areas for improvement. Your coach analyzes everything and gives you insights in plain English - no confusing charts or overwhelming numbers, just clear feedback on your fitness journey."
    },
    {
      question: "How do I know the AI's fitness advice is safe and evidence-based?",
      answer: "Safety is our top priority! Every workout recommendation goes through our safety validation system that checks for proper progression, volume limits, and contraindications based on your profile. Our coaches are trained on evidence-based methodologies from respected programs and certified professionals. However, NeonPanda is designed to complement, not replace, professional medical advice - always consult healthcare providers for injury concerns or medical conditions."
    },
    {
      question: "Can I save personal notes and memories?",
      answer: "Yes! Our memory system lets you save important insights, track how you felt during workouts, note what motivates you, or record breakthrough moments. Your coach remembers these details and uses them to personalize your experience even more. It's like having a coach who never forgets what matters to you."
    },
    {
      question: "How does my coach's memory actually work?",
      answer: "Your coach builds context from every conversation and workout session, so you can pick up exactly where you left off without repeating yourself. Ask about previous discussions like 'Remember when we worked on my deadlift form last month?' or reference past struggles and victories. Your coach remembers your preferences, injury history, equipment changes, motivation triggers, and workout responses - becoming a more effective coaching partner with every interaction. Each coach maintains their own focused memory space, and you have full control to view, edit, or reset what they remember."
    },
    {
      question: "Do my AI coaches actually have memories like a real coach would?",
      answer: "Absolutely! Your coaches remember everything that matters to your fitness journey. They know your training history, what motivates you on tough days, which exercises you love or hate, your injury limitations, equipment changes, and even your personal milestones. Just like a great human coach, they can reference past conversations, track your progress patterns, and adapt their approach based on what's worked for you before. The difference? Your AI coach never forgets and can instantly recall any detail from your entire coaching relationship."
    },
    {
      question: "What if I don't like my AI coach's personality or advice?",
      answer: "No worries! You can modify your coach's personality, communication style, and approach anytime through your settings. Not working out? Start fresh with a completely new coach - your workout history and progress data carry over, so you don't lose your journey. We want you to have a coach you genuinely enjoy working with."
    },
    {
      question: "How long does it take for my coach to learn my preferences?",
      answer: "Your coach starts understanding you immediately from your initial setup, but the real magic happens in the first 2-3 weeks. As you log workouts, share feedback, and have conversations, your coach learns what motivates you, how you respond to different training styles, and what keeps you consistent. Most users notice a significant difference in personalization by their fourth week."
    },
    {
      question: "Do you have pre-built coach templates?",
      answer: "We do! If you want to get started quickly, choose from our coach templates - each one is a fully developed personality with specific expertise. You can use them as-is or customize them to match your preferences. Think of them as starting points for creating your perfect coach."
    },
    {
      question: "Can I use this with injuries or health conditions?",
      answer: "NeonPanda can work around many common limitations when you provide that information during setup. Your coach will modify exercises and programming accordingly. However, we're not a medical service - for injuries, chronic conditions, or health concerns, always consult with healthcare professionals first. Think of us as a knowledgeable training partner who adapts to your cleared limitations, not a medical advisor."
    },
    {
      question: "How does this work with my existing gym routine or personal trainer?",
      answer: "NeonPanda plays well with others! Many users integrate us with their existing routines - using their AI coach for home workouts, off-days, or travel training while maintaining their gym memberships or trainer relationships. You can also share your NeonPanda programs with your personal trainer for feedback. We're here to enhance your fitness journey, not complicate it."
    },
    {
      question: "What makes this different from MyFitnessPal, Freeletics, or other fitness apps?",
      answer: "NeonPanda isn't just another fitness app – it's the bridge between cutting-edge AI and genuine human connection. By making AI coaching feel less artificial and more personal, we're creating a new category in fitness technology. Unlike generic workout generators, NeonPanda creates actual coaching relationships. Your AI coach doesn't just give you workouts - they understand your methodology preferences, remember your struggles, celebrate your wins, and adapt their communication style to what motivates you. Plus, you're not stuck with one-size-fits-all - you literally create the coach you want to work with."
    },
    {
      question: "Do you integrate with fitness trackers and other apps?",
      answer: "Integration with popular fitness devices and apps is a core priority for us. We're building connections with major platforms to pull in your sleep, recovery, heart rate, and activity data so your coach can make even smarter recommendations. The more data your coach has access to, the better they can personalize your experience and timing."
    },
    {
      question: "What if I'm a fitness professional?",
      answer: "NeonPanda is perfect for extending your expertise! Create AI versions of your coaching style to help more clients 24/7, develop your own coach templates to share your methodology, and use our platform to enhance your existing coaching business. We're building specific tools for fitness professionals to monetize their expertise and reach more people through the platform."
    },
    {
      question: "How smart is my AI coach really?",
      answer: "Your AI coach combines deep expertise in exercise science, program design, and proven methodologies with personalized understanding of your goals, progress patterns, and preferences. They're trained on evidence-based practices from top coaches and continuously adapt their recommendations based on your responses and results. Think of it as having access to the collective knowledge of expert coaches, customized specifically for your journey."
    },
    {
      question: "Is there a community aspect?",
      answer: "We're building something special! While your coaching relationship is personal, you'll be part of a community that celebrates victories, shares insights, and supports each other's journeys. No toxic comparison culture - just genuine encouragement and shared wisdom from fellow fitness enthusiasts."
    },
    {
      question: "What about my data security?",
      answer: "Your privacy is sacred. We use enterprise-grade security, never share your personal data, and keep all your conversations, progress, and memories completely private. We're here to help you get stronger, not to sell your information. Your fitness journey belongs to you."
    },
    {
      question: "How much does this cost?",
      answer: "We're designing flexible pricing that makes personalized coaching accessible - significantly less than personal training sessions, but more comprehensive than generic fitness apps. Think monthly subscription comparable to a gym membership, but for unlimited access to your personalized coach. We'll announce specific pricing tiers as we approach launch, with options for different budgets and feature needs."
    },
    {
      question: "What makes this actually fun, not just another fitness app?",
      answer: "Your coach develops inside jokes with you, remembers that you hate burpees but love deadlifts, celebrates your wins with personalized enthusiasm, and even gets sarcastic when you make excuses (if that's your style!). Plus, coaches can create custom challenges, give you nicknames, and adapt their motivation style based on whether you need tough love or gentle encouragement on any given day."
    },
    {
      question: "What does a typical conversation with my coach actually look like?",
      answer: "Imagine texting a knowledgeable friend who happens to be obsessed with your progress. Your coach might send you a motivational message before a tough workout, ask how your sleep was when designing today's session, celebrate a PR with genuine excitement, or help you troubleshoot why your motivation is lagging. It's casual, personal, and always focused on what you need right now."
    },
    {
      question: "Do coaches have personalities that evolve over time?",
      answer: "Yes! Your coach doesn't just learn your preferences - they develop a relationship with you. Early conversations might be more formal, but over time your coach becomes more familiar, references past conversations, develops coaching 'quirks' that work for you, and even adapts their humor style. Many users say it feels like their coach is 'growing up' alongside their fitness journey."
    },
    {
      question: "Can my coach help with things beyond workouts?",
      answer: "Your coach becomes your complete fitness partner! They can help you prep for competitions, plan deload weeks around vacations, adjust training when life gets stressful, troubleshoot plateaus, celebrate non-scale victories, and even help you navigate gym politics. It's like having a knowledgeable training buddy who's always available and always has your back."
    },
    {
      question: "Who's behind NeonPanda?",
      answer: "Founded by an AI engineer with deep AWS expertise and a personal CrossFit journey. Our founder built this platform because they couldn't find AI coaching that actually understood methodology and progression like a real coach. We're backed by fitness industry advisors and have partnerships with respected methodology creators to ensure our AI coaches truly know their stuff."
    },
    {
      question: "How are you different from big tech companies doing AI fitness?",
      answer: "We're built by fitness enthusiasts for fitness enthusiasts - not a big tech company adding fitness as an afterthought. Every feature is designed by someone who actually trains and understands the frustration of generic programming. We're small enough to care about every user's experience and technical enough to build something truly sophisticated."
    },
    {
      question: "Do you have beta testers or success stories?",
      answer: "Our closed alpha testers have been incredible! We're seeing users stick with their programs 3x longer than typical fitness apps, with many saying it's the first time they've felt 'actually coached' by technology. We'll be sharing more success stories as we approach launch - these transformations are what keep us motivated to build something special."
    },
    {
      question: "What are the benefits of joining early?",
      answer: "Early adopters get lifetime discounts, direct input on new features, first access to new coach templates, and the chance to become part of our success stories. Plus, your feedback literally shapes how AI coaching evolves - you're not just getting a product, you're helping create the future of fitness technology."
    },
    {
      question: "Will there be a waitlist?",
      answer: "Yes - we're intentionally limiting our initial launch to ensure every user gets an amazing experience. Early waitlist members get priority access to beta testing, can reserve their preferred coach names, and join our private community where they can influence platform development. The earlier you join, the more input you have on what we build."
    },
    {
      question: "Who else is using this?",
      answer: "Our community includes everyone from CrossFit newbies to Games athletes, busy parents to fitness professionals. What unites them is wanting coaching that actually adapts to their life, not generic programming. We're building a community of people who believe fitness should be personal, intelligent, and genuinely supportive."
    },
    {
      question: "What if I have feedback or want to request features?",
      answer: "We LOVE feedback! As a small, passionate team, user input directly influences our roadmap. Many of our best features come from user suggestions. You're not shouting into the void - you're talking directly to the people building your experience, and we genuinely want to hear what would make your coaching relationship even better."
    },
    {
      question: "When can I start using NeonPanda?",
      answer: "We're targeting our first beta release for late Q3 2025, with full launch by late 2025. Join our waitlist for early access opportunities - we'll be selecting users for closed beta testing starting in mid-2025. We're also actively seeking fitness enthusiasts and professionals to help shape the platform through our advisory community."
    }
  ];

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleSignUp = () => {
    navigate('/contact?type=waitlist'); // Goes to waitlist form like AboutUs.jsx
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
            Frequently Asked <span className="text-synthwave-neon-pink">Questions</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Everything you need to know about creating your perfect AI fitness coach, building meaningful coaching relationships, and transforming your training with personalized guidance.
          </p>
        </div>

      {/* FAQ Section */}
        <div className={`${containerPatterns.mainContent} p-8 md:p-12`}>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`${containerPatterns.collapsibleSection} overflow-hidden`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className={containerPatterns.collapsibleHeader}
                >
                  <h3 className={`${typographyPatterns.cardTitle} text-base md:text-lg ${
                  index % 3 === 0 ? 'text-synthwave-neon-pink' :
                  index % 3 === 1 ? 'text-synthwave-neon-cyan' :
                  'text-synthwave-neon-purple'
                }`}>
                    {faq.question}
                </h3>
                  <div className={`ml-4 flex-shrink-0 transition-transform duration-200 ${
                    openFAQ === index ? 'rotate-180' : ''
                  } ${
                    index % 3 === 0 ? 'text-synthwave-neon-pink' :
                    index % 3 === 1 ? 'text-synthwave-neon-cyan' :
                    'text-synthwave-neon-purple'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {openFAQ === index && (
                  <div className={containerPatterns.collapsibleContent}>
                    <p className={`${typographyPatterns.cardText} text-base leading-relaxed`}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

      {/* CTA Section */}
          <div className="mt-16 text-center">
            <h2 className={`${typographyPatterns.sectionTitle} mb-6`}>
              Ready to Create Your Perfect Coach?
          </h2>
            <p className={`${typographyPatterns.description} mb-8 max-w-4xl mx-auto`}>
              Join thousands of fitness enthusiasts already experiencing the future of personalized AI coaching. Create your perfect coach, get workouts designed specifically for your goals and equipment, track your progress with intelligent analytics, and build a coaching relationship that adapts and grows with your fitness journey.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleSignUp}
                className={`${buttonPatterns.heroCTA} min-w-48`}
              >
                Get Early Access
            </button>
              <button
                onClick={handleContactUs}
                className={`${buttonPatterns.secondary} min-w-48`}
              >
              Contact Us
            </button>
          </div>

            <div className="mt-8">
              <p className={`${typographyPatterns.caption} text-synthwave-neon-purple uppercase tracking-wider`}>
                Your questions shape our development
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default FAQs;