import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
  typographyPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";
import Footer from "../shared/Footer";

// Blog post metadata
const blogPosts = [
  {
    id: 1,
    slug: "the-foundation",
    title: "The Foundation of Everything",
    subtitle: "Building a Serverless Fitness Platform",
    description:
      "How we built an enterprise-grade serverless architecture that scales from zero to thousands of users without breaking a sweat. Introducing the Training Grounds and the Smart Request Router.",
    readTime: "8 min read",
    agent: "Smart Request Router",
    pattern: "Router Pattern",
    color: "pink",
    topics: ["AWS Lambda", "API Gateway", "DynamoDB", "Training Grounds"],
  },
  {
    id: 2,
    slug: "your-coach-your-way",
    title: "Your Coach, Built Your Way",
    subtitle: "The Coach Creator Agent",
    description:
      "Discover how our hybrid data architecture and Coach Creator Agent work together to build AI coaches that feel genuinely personal, not cookie-cutter.",
    readTime: "10 min read",
    agent: "Coach Creator Agent",
    pattern: "Assembler Pattern",
    color: "cyan",
    topics: ["S3", "Pinecone", "Coach Templates", "Personality Prompts"],
  },
  {
    id: 3,
    slug: "every-rep-counts",
    title: "Every Rep Counts, Every Time",
    subtitle: "The Workout Logger Agent",
    description:
      "Multi-model AI orchestration meets natural language workout logging. How we turn 'Did Fran in 8:45' into structured data and actionable insights.",
    readTime: "12 min read",
    agent: "Workout Logger Agent",
    pattern: "Tool-Use + Evaluator-Optimizer",
    color: "purple",
    topics: ["Claude Sonnet", "Haiku", "Nova", "Weekly Reports", "Analytics"],
  },
  {
    id: 4,
    slug: "training-programs-that-think",
    title: "Training Programs That Think",
    subtitle: "The Program Designer Agent",
    description:
      "Deep dive into agentic AI patterns: how the Program Designer Agent orchestrates multi-week training programs across 10 disciplines with intelligent periodization, evolving programs, and shareable plans.",
    readTime: "14 min read",
    agent: "Program Designer Agent",
    pattern: "Orchestrator + Parallel",
    color: "pink",
    topics: [
      "10 Disciplines",
      "Periodization",
      "Methodology Alignment",
      "Shareable Programs",
    ],
  },
  {
    id: 5,
    slug: "the-symphony",
    title: "When All Agents Converge",
    subtitle: "The Conversation Agent & Streaming Orchestration",
    description:
      "Meet the Conversation Agent—armed with 11 specialized tools and a streaming-first architecture, it pulls, pushes, queries, logs, and searches data across the entire platform in real time. This is where all the agents work in concert.",
    readTime: "15 min read",
    agent: "Conversation Agent",
    pattern: "Streaming Tool-Use",
    color: "cyan",
    topics: [
      "11 Agent Tools",
      "Streaming SSE",
      "Multi-Agent Orchestration",
      "Semantic Memory",
    ],
  },
];

function BlogIndex() {
  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getColorClasses = (color) => {
    switch (color) {
      case "pink":
        return {
          text: "text-synthwave-neon-pink",
          border: "border-synthwave-neon-pink/30",
          bg: "bg-synthwave-neon-pink/10",
          glow: "shadow-synthwave-neon-pink/20",
          badge: badgePatterns.pink,
        };
      case "cyan":
        return {
          text: "text-synthwave-neon-cyan",
          border: "border-synthwave-neon-cyan/30",
          bg: "bg-synthwave-neon-cyan/10",
          glow: "shadow-synthwave-neon-cyan/20",
          badge: badgePatterns.cyan,
        };
      case "purple":
        return {
          text: "text-synthwave-neon-purple",
          border: "border-synthwave-neon-purple/30",
          bg: "bg-synthwave-neon-purple/10",
          glow: "shadow-synthwave-neon-purple/20",
          badge: badgePatterns.purple,
        };
      default:
        return {
          text: "text-synthwave-neon-pink",
          border: "border-synthwave-neon-pink/30",
          bg: "bg-synthwave-neon-pink/10",
          glow: "shadow-synthwave-neon-pink/20",
          badge: badgePatterns.pink,
        };
    }
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* Hero Section */}
      <section className={`${layoutPatterns.hero} relative overflow-hidden`}>
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(/images/blog-posts/home-gym.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-synthwave-bg-primary/70 via-synthwave-bg-primary/65 to-synthwave-bg-primary/80"></div>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="font-rajdhani text-synthwave-neon-cyan uppercase tracking-widest text-sm mb-4">
            Technical Deep Dive Series
          </p>
          <h1 className={typographyPatterns.heroTitle}>
            Building the Future of{" "}
            <span className="text-synthwave-neon-pink">AI Coaching</span>
          </h1>
          <p
            className={`${typographyPatterns.heroSubtitle} max-w-3xl mx-auto mb-8`}
          >
            A 5-part technical journey from serverless foundations to
            multi-agent orchestration. Discover how we built an AI coaching
            platform that feels like magic, powered by best-in-class technology.
          </p>

          {/* Series Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm font-rajdhani">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-pink rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                5 Technical Posts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                Multiple Specialized AI Agents
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-synthwave-neon-purple rounded-full"></div>
              <span className="text-synthwave-text-secondary">
                6 Agentic Patterns
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          {/* Journey Visualization */}
          <div className="mb-16">
            <h2
              className={`${typographyPatterns.sectionTitle} text-center mb-8`}
            >
              The <span className="text-synthwave-neon-cyan">Journey</span>
            </h2>

            {/* Timeline */}
            <div className="relative">
              {/* Connecting Line */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-synthwave-neon-pink via-synthwave-neon-cyan to-synthwave-neon-purple"></div>

              {/* Posts */}
              <div className="space-y-8">
                {blogPosts.map((post, index) => {
                  const colors = getColorClasses(post.color);
                  const isEven = index % 2 === 0;

                  return (
                    <div
                      key={post.id}
                      className={`relative lg:flex ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8`}
                    >
                      {/* Timeline Node */}
                      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            post.color === "pink"
                              ? "bg-synthwave-neon-pink"
                              : post.color === "cyan"
                                ? "bg-synthwave-neon-cyan"
                                : "bg-synthwave-neon-purple"
                          }`}
                        >
                          <span className="font-inter font-bold text-lg text-black">
                            {post.id}
                          </span>
                        </div>
                      </div>

                      {/* Card */}
                      <div
                        className={`lg:w-[calc(50%-3rem)] ${isEven ? "lg:mr-auto" : "lg:ml-auto"}`}
                      >
                        {post.id <= 5 ? (
                          <Link
                            to={`/blog/${post.slug}`}
                            className={`block ${containerPatterns.cardLight} p-6 hover:${colors.border} transition-all duration-300 group`}
                          >
                            {/* Mobile Post Number */}
                            <div className="lg:hidden flex items-center gap-3 mb-4">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  post.color === "pink"
                                    ? "bg-synthwave-neon-pink"
                                    : post.color === "cyan"
                                      ? "bg-synthwave-neon-cyan"
                                      : "bg-synthwave-neon-purple"
                                }`}
                              >
                                <span className="font-inter font-bold text-sm text-black">
                                  {post.id}
                                </span>
                              </div>
                              <span className="font-rajdhani text-synthwave-text-muted text-sm">
                                Part {post.id} of 5
                              </span>
                            </div>

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <h3
                                  className={`${typographyPatterns.cardTitle} ${colors.text} group-hover:drop-shadow-lg transition-all duration-300`}
                                >
                                  {post.title}
                                </h3>
                                <p className="font-rajdhani text-lg text-white mt-1">
                                  {post.subtitle}
                                </p>
                              </div>
                              <span className="font-rajdhani text-sm text-synthwave-text-muted whitespace-nowrap">
                                {post.readTime}
                              </span>
                            </div>

                            {/* Description */}
                            <p
                              className={`${typographyPatterns.cardText} mb-4 line-clamp-3`}
                            >
                              {post.description}
                            </p>

                            {/* Agent & Pattern Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={colors.badge}>{post.agent}</span>
                              <span className={badgePatterns.muted}>
                                {post.pattern}
                              </span>
                            </div>

                            {/* Topics */}
                            <div className="flex flex-wrap gap-2">
                              {post.topics.map((topic, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs font-rajdhani text-synthwave-text-muted bg-synthwave-bg-primary/30 px-2 py-1 rounded-md"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>

                            {/* Read More Arrow */}
                            <div
                              className={`mt-4 flex items-center gap-2 ${colors.text} font-rajdhani font-semibold text-sm uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            >
                              <span>Read Article</span>
                              <svg
                                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <div
                            className={`block ${containerPatterns.cardLight} p-6 opacity-60 cursor-not-allowed relative`}
                          >
                            {/* Coming Soon Badge */}
                            <div className="absolute top-4 right-4 bg-synthwave-bg-primary border border-synthwave-neon-cyan/50 px-3 py-1 rounded-full">
                              <span className="text-xs font-rajdhani font-semibold text-synthwave-neon-cyan uppercase tracking-wider">
                                Coming Soon
                              </span>
                            </div>

                            {/* Mobile Post Number */}
                            <div className="lg:hidden flex items-center gap-3 mb-4">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  post.color === "pink"
                                    ? "bg-synthwave-neon-pink/50"
                                    : post.color === "cyan"
                                      ? "bg-synthwave-neon-cyan/50"
                                      : "bg-synthwave-neon-purple/50"
                                }`}
                              >
                                <span className="font-inter font-bold text-sm text-black/70">
                                  {post.id}
                                </span>
                              </div>
                              <span className="font-rajdhani text-synthwave-text-muted text-sm">
                                Part {post.id} of 5
                              </span>
                            </div>

                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div>
                                <h3
                                  className={`${typographyPatterns.cardTitle} ${colors.text}`}
                                >
                                  {post.title}
                                </h3>
                                <p className="font-rajdhani text-lg text-white mt-1">
                                  {post.subtitle}
                                </p>
                              </div>
                              <span className="font-rajdhani text-sm text-synthwave-text-muted whitespace-nowrap">
                                {post.readTime}
                              </span>
                            </div>

                            {/* Description */}
                            <p
                              className={`${typographyPatterns.cardText} mb-4 line-clamp-3`}
                            >
                              {post.description}
                            </p>

                            {/* Agent & Pattern Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={colors.badge}>{post.agent}</span>
                              <span className={badgePatterns.muted}>
                                {post.pattern}
                              </span>
                            </div>

                            {/* Topics */}
                            <div className="flex flex-wrap gap-2">
                              {post.topics.map((topic, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs font-rajdhani text-synthwave-text-muted bg-synthwave-bg-primary/30 px-2 py-1 rounded-md"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className={`${containerPatterns.boldGradient} text-center`}>
            <h2 className={`${typographyPatterns.sectionTitle} mb-4`}>
              Ready to Experience the{" "}
              <span className="text-synthwave-neon-pink">Technology</span>?
            </h2>
            <p
              className={`${typographyPatterns.description} mb-8 max-w-2xl mx-auto`}
            >
              Go beyond reading about our architecture. Sign up for NeonPanda
              and experience AI coaching that feels like magic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth" className={buttonPatterns.heroCTA}>
                Sign Up
              </Link>
              <Link to="/technology" className={buttonPatterns.secondary}>
                Explore Technology
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default BlogIndex;
