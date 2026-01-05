import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns
} from '../utils/ui/uiPatterns';
import Footer from './shared/Footer';

function AboutUs() {
  const navigate = useNavigate();

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            About <span className="text-synthwave-neon-pink">NeonPanda</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Born from personal frustration with generic fitness solutions, NeonPanda is building AI coaches that understand your specific constraints, goals, and training style.
          </p>
        </div>

        {/* Main Content */}
        <div className={`${containerPatterns.mainContent} p-8 md:p-12 space-y-16`}>

          {/* Our Story Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Our Story: Born from Personal Frustration
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                NeonPanda didn't start in a boardroom or emerge from market research. It began with a deeply personal disruption: <strong className="text-synthwave-neon-pink">When the CrossFit box that had been my training home for years changed ownership, everything I relied on disappeared overnight.</strong>
              </p>
              <p className={typographyPatterns.description}>
                The new management brought different programming, different methodology, different community dynamics. What had been a perfect fit for my goals, mobility issues, and training preferences suddenly wasn't. I found myself adrift, searching for a new gym that could provide:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Programming that worked with my specific mobility limitations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Methodology aligned with my particular goals (not just generic "get fitter")</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Equipment that matched what I actually had access to</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Scheduling that worked with my unpredictable work travel</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>A community approach that felt right for how I like to train</span>
                </li>
              </ul>
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-pink">The search was frustrating.</strong> Every gym I visited offered their version of "one-size-fits-all" programming. Close to home but wrong methodology. Great coaches but terrible timing. Perfect equipment but goals that didn't align with mine.
              </p>
              <p className={typographyPatterns.description}>
                So I took matters into my own hands.
              </p>
              <p className={typographyPatterns.description}>
                Working professionally with AI systems gave me a unique perspective: <em className="text-synthwave-neon-cyan">What if I could create the exact coaching experience I needed?</em> Not just programming, but truly personalized guidance that understood my constraints, preferences, and goals.
              </p>
              <p className={typographyPatterns.description}>
                The lightbulb moment came during a late-night training session in my garage gym: <strong className="text-synthwave-neon-pink">"Instead of adapting myself to someone else's system, what if I could build a system that adapts to me?"</strong>
              </p>
              <p className={typographyPatterns.description}>
                That question became our mission. The personal frustration of losing my training community became the driving force to create something better—AI coaches that understand not just what you want to achieve, but how you need to get there given your real-world constraints.
              </p>
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-pink">Building for myself first meant I couldn't hide from the problems.</strong> Every time the AI didn't understand my equipment limitations, every time it suggested something that ignored my travel schedule, every time it felt generic instead of personal—I experienced those shortcomings directly.
              </p>
              <p className={typographyPatterns.description}>
                This personal investment ensures NeonPanda solves real problems, not imagined ones. We're building the coaching experience I wished existed when my training world got turned upside down.
              </p>
            </div>
          </section>

          {/* The Founder Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              The Founder: When Technical Expertise Meets Real Frustration
            </h2>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}>
                From AWS Architecture to AI Coaching
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  I didn't set out to become a fitness entrepreneur. I was just someone who loved training, worked professionally with AI and AWS systems, and got tired of compromising on what I needed from my fitness routine.
                </p>
                <p className={typographyPatterns.description}>
                  When my CrossFit world got disrupted, I started building AI coaches for myself—not as a business idea, but as a solution to a problem I was living with every day. Different coaches for different training phases. Different personalities for different moods. Different approaches for different goals.
                </p>
                <p className={typographyPatterns.description}>
                  <strong className="text-synthwave-neon-pink">The approach was simple</strong>: Build it, use it, break it, fix it, use it again.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}>
                Why Building for Yourself First Changes Everything
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  When you're your own first customer, you can't bullshit yourself about whether something actually works. Every clunky interaction, every moment the AI misses the mark, every time it feels like talking to a robot instead of getting coached—you feel it directly.
                </p>
                <p className={typographyPatterns.description}>
                  This isn't about perfecting metrics or optimizing funnels. It's about creating something that genuinely improves your day, makes hard workouts feel achievable, and keeps you consistent when motivation is low.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl`}>
                The Technical Advantage That Actually Matters
              </h3>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className={typographyPatterns.description}>
                  Sure, my AWS and AI background helps build robust, scalable technology. But the real advantage is understanding that <strong className="text-synthwave-neon-pink">the best technology disappears</strong>. You don't think about the infrastructure when you're getting great coaching—you just experience the relationship.
                </p>
                <p className={typographyPatterns.description}>
                  We're not building AI for AI's sake. We're building the coaching relationship I couldn't find anywhere else, using technology that happens to be really sophisticated under the hood.
                </p>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Our Mission: What We Learned the Hard Way
            </h2>

            <div className="space-y-8">
              <div className={containerPatterns.mediumGlassPink}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-pink/20 border-2 border-synthwave-neon-pink">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-pink">1</span>
                  </div>
                  <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl flex-1`}>
                    Great coaching isn't about perfect programming—it's about perfect fit.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  I had access to world-class programming from respected coaches, but none of it fit my specific situation. My mobility issues, my equipment, my schedule, my goals that didn't align with what most gyms optimize for.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  NeonPanda exists because <strong className="text-synthwave-neon-pink">fit matters more than fame</strong>. Your AI coach should understand your constraints, not ignore them. Should work with your schedule, not against it. Should adapt to your equipment, not assume you have everything.
                </p>
              </div>

              <div className={containerPatterns.mediumGlass}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-cyan/20 border-2 border-synthwave-neon-cyan">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-cyan">2</span>
                  </div>
                  <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl flex-1`}>
                    Technology should solve real problems, not create impressive demos.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  I work with cutting-edge AI professionally, but I've also experienced how much bad "smart" fitness technology exists. Apps that are more concerned with looking futuristic than being useful, often hiding how their AI actually works.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  We build technology that disappears into the experience while remaining completely transparent about how it works. You don't interact with "AI"—you get coached by someone who happens to be powered by explainable, responsible systems that you can understand and trust.
                </p>
              </div>

              <div className={containerPatterns.mediumGlassPurple}>
                <div className="flex items-center gap-4 mb-4">
                  {/* Mission Number Circle */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-synthwave-neon-purple/20 border-2 border-synthwave-neon-purple">
                    <span className="font-inter font-bold text-xl text-synthwave-neon-purple">3</span>
                  </div>
                  <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-2xl flex-1`}>
                    Community isn't about having people around—it's about being understood.
                  </h3>
                </div>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Losing my CrossFit community taught me that belonging isn't just about shared workouts. It's about shared understanding. People who get your struggles, celebrate your victories, and support your specific journey.
                </p>
                <p className={`${typographyPatterns.description} text-lg mt-4`}>
                  NeonPanda coaches are built to understand you specifically, not humans generally. They know your history, your patterns, your preferences, and your goals in ways that create genuine connection.
                </p>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Our Values: Learned Through Real Experience
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={containerPatterns.lightGlass}>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}>
                  Specific Over Generic
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  We've lived the frustration of "close enough" programming. Your coach should understand your exact situation, not approximate it. Every limitation, every preference, every goal that makes you different from the textbook athlete.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-4`}>
                  Honest Energy
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  We're enthusiastic about what we build, but we're not going to fake-motivate you. Real coaching acknowledges when things suck, celebrates genuine progress, and provides support that matches what you actually need in the moment.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-4`}>
                  Transparent AI, Always
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  You should always understand why your AI coach makes specific recommendations. We build explainable systems where every suggestion comes with clear reasoning, and you can see how our AI learns and adapts to your unique situation.
                </p>
              </div>

              <div className={containerPatterns.lightGlass}>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-4`}>
                  Real Adaptation
                </h3>
                <p className={`${typographyPatterns.cardText} text-base`}>
                  Your coach learns from every interaction, every workout, every piece of feedback. Not just data collection, but genuine understanding that changes how they work with you over time.
                </p>
              </div>
            </div>
          </section>

          {/* Why NeonPanda Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Why NeonPanda? The Name Behind the Experience
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-pink">Neon</strong> represents the intensity and focus of great training—bright, energizing, impossible to ignore when you need that extra push.
              </p>
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-cyan">Panda</strong> embodies the approachable wisdom we aim for—strong when they need to be, gentle most of the time, and unexpectedly adaptable to different situations.
              </p>
              <p className={typographyPatterns.description}>
                Together, <strong className="text-synthwave-neon-purple">NeonPanda</strong> captures what we learned about great coaching: it should be intense when you need intensity, gentle when you need support, and always adapt to what works for you specifically.
              </p>
              <p className={typographyPatterns.description}>
                Plus, it's memorable and makes people smile—which matters more than you might think when you're trying to stay consistent with training.
              </p>
            </div>
          </section>

          {/* Community Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Our Community: Built on Real Understanding
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}>
                  Starting with CrossFit, Because We Get It
                </h3>
                <p className={`${typographyPatterns.description} text-lg mb-6`}>
                  We began with the CrossFit community because we understand the culture firsthand:
                </p>
                <ul className="space-y-4 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Methodology matters</strong>: You can't just throw movements together and call it programming</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Personal records are personal</strong>: Your PR means something, regardless of what anyone else is lifting</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Community support is real</strong>: The right encouragement at the right moment can change your entire workout</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Consistency trumps perfection</strong>: Showing up matters more than having the perfect day</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
                  Growing Beyond CrossFit, Keeping the Values
                </h3>
                <p className={`${typographyPatterns.description} text-lg mb-4`}>
                  As we expand to other training styles, we're bringing the same principles: deep methodology understanding, genuine community support, and respect for individual goals and constraints.
                </p>
                <p className={`${typographyPatterns.description} text-lg`}>
                  We're not trying to be everything to everyone immediately. We're focused on being genuinely useful for people who care about their training and want something better than generic fitness apps.
                </p>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-2xl mb-6`}>
                  User-Driven Development
                </h3>
                <p className={`${typographyPatterns.description} text-lg mb-4`}>
                  Every feature we build comes from real user needs, not hypothetical market opportunities. Every coach personality option, every methodology we support, every adaptation we make—it's all based on actual people telling us what would make their training better.
                </p>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Because we built this for ourselves first, we know the difference between features that sound good and features that actually improve your day. Every AI decision is explainable, every recommendation is traceable, and you always maintain control over how your coach learns from your data.
                </p>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Our Vision: What We're Actually Building Toward
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3`}>
                  <span className="text-synthwave-neon-pink">Phase 1:</span> Coaches That Actually Get You
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Create AI coaches that understand your specific situation so well that interacting with them feels like talking to someone who's been training with you for years.
                </p>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3`}>
                  <span className="text-synthwave-neon-pink">Phase 2:</span> Human-AI Coach Collaboration
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Enable real coaches to extend their expertise through AI, so they can support more people while maintaining the relationship quality that makes great coaching work.
                </p>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-xl mb-3`}>
                  <span className="text-synthwave-neon-pink">Phase 3:</span> A Training Ecosystem That Makes Sense
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  Build a platform where methodology, experience, and genuine coaching wisdom can be shared without the usual fitness industry BS.
                </p>
              </div>

              <div className={`${containerPatterns.boldGradient} text-center mt-12`}>
                <h3 className={`${typographyPatterns.cardTitle} text-white text-2xl mb-4`}>
                  The Real Goal
                </h3>
                <p className={`${typographyPatterns.description} text-base mt-4`}>
                  We're building toward a future where the boundaries between human intuition and artificial intelligence dissolve into something greater—transparent, explainable partnerships that transform not just how we train, but how we discover what our bodies and minds are truly capable of achieving.
                </p>
                <p className={`${typographyPatterns.description} text-base mt-4`}>
                  This isn't about replacing coaches or automating fitness. It's about creating a new frontier where responsible AI amplifies human expertise, where transparent systems learn from your unique journey, and where every individual—regardless of resources or location—has access to coaching wisdom that is always explainable, always ethical, and always under their control.
                </p>
              </div>
            </div>
          </section>

          {/* Join Our Journey Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Join Our Journey (If This Resonates)
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
                  We're Solving Real Problems
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  NeonPanda exists because generic fitness solutions suck when you have specific needs. We're building something for people who've experienced that frustration and want something better.
                </p>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-2xl mb-6`}>
                  Our Promise to You
                </h3>
                <ul className="space-y-4 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">No trickery, just honesty</strong>: We'll tell you what works and what doesn't, based on real experience</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Continuous improvement</strong>: Your feedback directly changes what we build next</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Community over customers</strong>: We're building for people who care about training, not maximizing user engagement metrics</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                    <span><strong className="text-synthwave-neon-pink">Results over features</strong>: Every feature exists to help you train better, not to look impressive in demos</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-2xl mb-6`}>
                  This Might Be For You If:
                </h3>
                <ul className="space-y-4 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span>You've been frustrated by generic fitness programming</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span>You want coaching that adapts to your real-world constraints</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span>You believe methodology matters, not just "getting sweaty"</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span>You want community support without the usual fitness culture nonsense</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                    <span>You're curious about AI that actually solves problems instead of just existing</span>
                  </li>
                </ul>
              </div>

              <div className={containerPatterns.mediumGlassPurple}>
                <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-purple text-2xl mb-4`}>
                  Not Sure? That's Fine Too
                </h3>
                <p className={`${typographyPatterns.description} text-lg`}>
                  We built this because we needed it ourselves. If it solves problems you're experiencing, great. If not, no hard feelings—there are lots of ways to approach fitness, and this is just one of them.
                </p>
              </div>
            </div>
          </section>

          {/* Connect Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Connect With Us
            </h2>
            <div className="text-center space-y-6">
              <p className={`${typographyPatterns.description} text-lg max-w-4xl mx-auto`}>
                We're always interested in hearing from people who share our perspective on training, coaching, and building useful technology. Hit us through one of the options in the footer.
              </p>
              <p className={`${typographyPatterns.description} text-lg italic text-synthwave-neon-pink`}>
                Whether you're curious about what we're building or frustrated with current options, we'd love to hear from you.
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
                  Contact Us
                </button>
              </div>

              <div className="mt-8">
                <p className={`${typographyPatterns.caption} text-synthwave-neon-purple uppercase tracking-wider`}>
                  Built by fitness enthusiasts, for fitness enthusiasts
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
