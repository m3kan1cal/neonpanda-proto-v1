import React from "react";
const LandingPage = () => {
  const features = [
    {
      title: "Purpose-built coaches across multiple disciplines",
      subtitle: "Coaches built specifically for you",
      description:
        "Create AI coaches designed around your exact goals, training style, and preferences—whether you’re crushing CrossFit WODs, powerlifting PRs, training for HYROX events, improving your running, or building overall fitness. Every coach is custom-built to fit your needs perfectly.",
      imageAlt: "Coach personality customization interface",
    },
    {
      title: "Intelligent workout programming & planning",
      subtitle: "Programming that actually makes sense",
      description:
        "Get workouts designed around your goals, available equipment, and current fitness level. Unlike generic fitness apps, your coach belongs only to you. No more wasting money on one-size-fits-all programs—your coach creates programming specifically for you that evolves with your progress.",
      imageAlt: "Workout programming interface",
    },
    {
      title: "Smart progress tracking & adaptation",
      subtitle: "Coaching that gets smarter over time",
      description:
        "Your coach tracks your wins, learns from your struggles, and adapts your programming automatically. The more you share about your workouts, energy levels, and challenges, the better your coach becomes at supporting you. Every rep, every PR, every conversation makes your coaching smarter.",
      imageAlt: "Progress tracking dashboard",
    },
    {
      title: "Natural language workout logging",
      subtitle: "Just tell your coach what you did",
      description:
        "No rigid forms or confusing menus. Describe your workout however feels natural - ‘Did Fran in 8:45’ or ‘Ran 5K, felt great’ or ‘Bench felt heavy today, hit 225x5.’ Your coach understands and learns your unique way of describing workouts, making logging effortless.",
      imageAlt: "Natural language workout input interface",
    },
    {
      title: "Conversational coaching that learns you",
      subtitle: "Your ideal coach, electrified",
      description:
        "Imagine your favorite coach or the perfect coach you’ve always wanted—now imagine an electric version that’s available 24/7. Have real conversations with coaches who remember your preferences, celebrate your victories, and support you through tough days, all while getting smarter about what motivates you.",
      imageAlt: "Coach conversation interface",
    },
  ];
  const technicalFeatures = [
    {
      title: "Your personal coach + system-wide expertise",
      subtitle: "Multi-agent intelligence",
      description:
        "Each coach you create is an entirely separate AI agent that belongs exclusively to you—your private coaching relationship. Behind the scenes, system-wide agents coordinate to provide expertise across programming, nutrition, and recovery, but your coach remains uniquely yours.",
    },
    {
      title: "Intelligence that grows with you",
      subtitle: "Adaptive agentic AI systems",
      description:
        "Advanced agentic and generative AI technologies power each coach’s ability to understand your unique patterns, preferences, and goals. Your personal AI agent becomes more sophisticated with every interaction, creating truly individualized coaching experiences.",
    },
    {
      title: "Coaches that remember everything about you",
      subtitle: "Contextual memory & coordination",
      description:
        "Your personal coach maintains deep context about your entire fitness journey—remembering past conversations, tracking long-term progress patterns, and learning what works specifically for you. It’s like having a dedicated coach with perfect memory who exists solely for your success.",
    },
  ];
  return (
    <div className="min-h-screen bg-gray-900 font-inter">
      {/* Google Font Import */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Hero Section */}
      <section
        className="relative py-20 px-6 min-h-[600px] flex items-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=800&fit=crop&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Blur overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-cyan-400/60 via-pink-500/60 to-purple-900/80"
          style={{ backdropFilter: "blur(2px)" }}
        ></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your perfect coach,
            <span
              className="text-white ml-3"
              style={{
                textDecoration: "underline",
                textDecorationColor: "#ffffff",
                textDecorationThickness: "3px",
                textUnderlineOffset: "6px",
              }}
            >
              electrified
            </span>
          </h1>
          <div className="text-xl md:text-2xl text-white font-medium mb-8 tracking-wide">
            <span className="block">Your coach.</span>
            <span className="block">Your goals.</span>
            <span className="block">Your style.</span>
            <span className="block text-cyan-100">Always available.</span>
          </div>
          <p className="text-lg text-white opacity-90 max-w-3xl mx-auto mb-12 leading-relaxed">
            Building the future of personalized AI fitness coaching. Create your
            perfect coach, tailored to your unique journey.
          </p>
          <p className="text-base text-white opacity-75 italic max-w-2xl mx-auto">
            We're not just building AI coaches – we're creating relationships
            that transform lives, one workout and one conversation at a time.
          </p>
        </div>
      </section>
      {/* Features Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{
                textDecoration: "underline",
                textDecorationColor: "#22d3ee",
                textDecorationThickness: "3px",
                textUnderlineOffset: "6px",
              }}
            >
              Building real coaching relationships that drive results
            </h2>
          </div>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center mb-24 gap-12`}
            >
              {/* Content */}
              <div className="flex-1">
                <h3
                  className={`text-2xl md:text-3xl font-bold mb-4 ${
                    index % 2 === 0 ? "text-cyan-400" : "text-pink-400"
                  }`}
                  style={{
                    textDecoration: "underline",
                    textDecorationColor:
                      index % 2 === 0 ? "#22d3ee" : "#f472b6",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "4px",
                  }}
                >
                  {feature.subtitle}
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
              {/* Screenshot Placeholder */}
              <div className="flex-1">
                <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl h-80 flex items-center justify-center shadow-2xl border border-gray-600">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">NP</span>
                    </div>
                    <p className="text-gray-400 font-medium">
                      {feature.imageAlt}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-black via-gray-900 to-black py-20 px-6 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to meet your perfect coach?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Join our exclusive Co-creator Access program and help us build the
            coaching platform you've always wanted. Be part of shaping the
            future of AI coaching while getting early access to cutting-edge
            features.
          </p>
          <button className="bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold py-4 px-8 rounded-full text-lg hover:shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300 mb-6">
            Get Co-creator Access - Free Program
          </button>
          <p className="text-sm text-gray-400 mb-12">
            No credit card required. Early adopters get lifetime discounts when
            we launch.
          </p>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-lg text-gray-300 mb-4">
              Skip the $200+/month personal trainer who cancels on you.
              NeonPanda isn't just another fitness app – it's the bridge between
              cutting-edge AI and genuine human connection.
            </p>
            <p className="text-lg text-cyan-400 font-medium">
              Ready to experience coaching that actually gets you?
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
