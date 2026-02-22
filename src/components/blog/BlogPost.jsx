import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  containerPatterns,
  buttonPatterns,
  layoutPatterns,
  typographyPatterns,
  badgePatterns,
  navigationPatterns,
} from "../../utils/ui/uiPatterns";
import Footer from "../shared/Footer";

// Blog post metadata for navigation
const blogPosts = [
  {
    id: 1,
    slug: "the-foundation",
    title: "The Foundation",
    subtitle: "Building a Serverless Fitness Platform",
    readTime: "8 min read",
    agent: "Smart Request Router",
    pattern: "Router Pattern",
    color: "pink",
  },
  {
    id: 2,
    slug: "your-coach-your-way",
    title: "Your Coach, Your Way",
    subtitle: "The Coach Creator Agent",
    readTime: "10 min read",
    agent: "Coach Creator Agent",
    pattern: "Assembler Pattern",
    color: "cyan",
  },
  {
    id: 3,
    slug: "every-rep-counts",
    title: "Every Rep Counts",
    subtitle: "The Workout Logger Agent",
    readTime: "12 min read",
    agent: "Workout Logger Agent",
    pattern: "Tool-Use + Evaluator-Optimizer",
    color: "purple",
  },
  {
    id: 4,
    slug: "training-programs-that-think",
    title: "Training Programs That Think",
    subtitle: "The Program Designer Agent",
    readTime: "14 min read",
    agent: "Program Designer Agent",
    pattern: "Orchestrator + Parallel",
    color: "pink",
  },
  {
    id: 5,
    slug: "the-symphony",
    title: "The Symphony",
    subtitle: "The Conversation Agent & Streaming Orchestration",
    readTime: "15 min read",
    agent: "Conversation Agent",
    pattern: "Streaming Tool-Use",
    color: "cyan",
  },
];

function BlogPost({ children }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);

  // Find current post index
  const currentIndex = blogPosts.findIndex((post) => post.slug === slug);
  const currentPost = blogPosts[currentIndex];
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to top when post changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Handle invalid slug
  if (!currentPost) {
    return (
      <div className={layoutPatterns.pageContainer}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className={typographyPatterns.pageTitle}>Post Not Found</h1>
            <p className={typographyPatterns.description}>
              The blog post you're looking for doesn't exist.
            </p>
            <Link
              to="/blog"
              className={`${buttonPatterns.primary} mt-8 inline-flex`}
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getColorClasses = (color) => {
    switch (color) {
      case "pink":
        return {
          text: "text-synthwave-neon-pink",
          border: "border-synthwave-neon-pink",
          bg: "bg-synthwave-neon-pink/10",
          gradient: "from-synthwave-neon-pink",
          badge: badgePatterns.pink,
        };
      case "cyan":
        return {
          text: "text-synthwave-neon-cyan",
          border: "border-synthwave-neon-cyan",
          bg: "bg-synthwave-neon-cyan/10",
          gradient: "from-synthwave-neon-cyan",
          badge: badgePatterns.cyan,
        };
      case "purple":
        return {
          text: "text-synthwave-neon-purple",
          border: "border-synthwave-neon-purple",
          bg: "bg-synthwave-neon-purple/10",
          gradient: "from-synthwave-neon-purple",
          badge: badgePatterns.purple,
        };
      default:
        return {
          text: "text-synthwave-neon-pink",
          border: "border-synthwave-neon-pink",
          bg: "bg-synthwave-neon-pink/10",
          gradient: "from-synthwave-neon-pink",
          badge: badgePatterns.pink,
        };
    }
  };

  const colors = getColorClasses(currentPost.color);

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-synthwave-bg-primary/50">
        <div
          className={`h-full bg-gradient-to-r ${colors.gradient} to-synthwave-neon-purple transition-all duration-150`}
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>

      {/* Hero Section */}
      <section
        className={`${layoutPatterns.hero} relative pt-8 overflow-hidden`}
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(/images/blog-posts/${
              currentPost.slug === "training-programs-that-think"
                ? "training-program.jpg"
                : "barbells-plates.jpg"
            })`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-synthwave-bg-primary/50 via-synthwave-bg-primary/60 to-synthwave-bg-primary"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-rajdhani mb-6 bg-synthwave-bg-primary/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-synthwave-neon-pink/20 w-fit">
            <Link
              to="/blog"
              className="text-white hover:text-synthwave-neon-cyan transition-colors font-semibold"
            >
              Blog
            </Link>
            <span className="text-white/70">/</span>
            <span className={colors.text}>Part {currentPost.id} of 5</span>
          </div>

          {/* Post Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className={colors.badge}>{currentPost.agent}</span>
            <span className={badgePatterns.muted}>{currentPost.pattern}</span>
            <span className="font-rajdhani text-sm text-synthwave-text-muted">
              {currentPost.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className={`${typographyPatterns.heroTitle} mb-4`}>
            {currentPost.slug === "the-foundation" ? (
              <>
                <span className="text-white">The </span>
                <span className={colors.text}>Foundation</span>
              </>
            ) : currentPost.slug === "your-coach-your-way" ? (
              <>
                <span className="text-white">Your Coach, </span>
                <span className={colors.text}>Your Way</span>
              </>
            ) : currentPost.slug === "every-rep-counts" ? (
              <>
                <span className="text-white">Every </span>
                <span className={colors.text}>Rep Counts</span>
              </>
            ) : currentPost.slug === "training-programs-that-think" ? (
              <>
                <span className="text-white">Training Programs </span>
                <span className={colors.text}>That Think</span>
              </>
            ) : currentPost.slug === "the-symphony" ? (
              <>
                <span className="text-white">The </span>
                <span className={colors.text}>Symphony</span>
              </>
            ) : (
              <span className={colors.text}>{currentPost.title}</span>
            )}
          </h1>
          <p className={typographyPatterns.heroSubtitle}>
            {currentPost.subtitle}
          </p>

          {/* Series Navigation Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {blogPosts.map((post) => {
              const postColors = getColorClasses(post.color);
              const isCurrent = post.slug === slug;
              return (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent
                      ? `${postColors.bg} ${postColors.border} border-2 ${postColors.text}`
                      : "bg-synthwave-bg-primary/30 border border-synthwave-text-muted/30 text-synthwave-text-muted hover:border-synthwave-text-muted"
                  }`}
                  title={post.title}
                >
                  <span className="font-inter font-bold text-sm">
                    {post.id}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <article className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          {/* Content from child component */}
          <div className="prose prose-lg prose-invert max-w-none">
            {children}
          </div>
        </div>
      </article>

      {/* Navigation Footer */}
      <section className="py-12 px-8 border-t border-synthwave-neon-cyan/20">
        <div className="max-w-4xl mx-auto">
          {/* Prev/Next Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Previous Post */}
            {prevPost ? (
              <Link
                to={`/blog/${prevPost.slug}`}
                className={`${containerPatterns.cardLight} p-6 group`}
              >
                <div className="flex items-center gap-2 text-synthwave-text-muted mb-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="font-rajdhani text-sm uppercase tracking-wide">
                    Previous
                  </span>
                </div>
                <h3 className="font-russo text-lg text-white group-hover:text-synthwave-neon-cyan transition-colors">
                  {prevPost.title}
                </h3>
                <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                  {prevPost.subtitle}
                </p>
              </Link>
            ) : (
              <div></div>
            )}

            {/* Next Post */}
            {nextPost ? (
              <Link
                to={`/blog/${nextPost.slug}`}
                className={`${containerPatterns.cardLight} p-6 group text-right`}
              >
                <div className="flex items-center justify-end gap-2 text-synthwave-text-muted mb-2">
                  <span className="font-rajdhani text-sm uppercase tracking-wide">
                    Next
                  </span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <h3 className="font-russo text-lg text-white group-hover:text-synthwave-neon-pink transition-colors">
                  {nextPost.title}
                </h3>
                <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                  {nextPost.subtitle}
                </p>
              </Link>
            ) : (
              <div></div>
            )}
          </div>

          {/* Divider */}
          <div className={navigationPatterns.dividers.gradientCyan}></div>

          {/* CTA */}
          <div className="text-center mt-12">
            <h3 className={`${typographyPatterns.sectionTitle} mb-4`}>
              Experience the{" "}
              <span className="text-synthwave-neon-pink">Technology</span>
            </h3>
            <p
              className={`${typographyPatterns.description} mb-8 max-w-xl mx-auto`}
            >
              Go beyond reading. Sign up for NeonPanda and experience AI
              coaching that feels like magic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth" className={buttonPatterns.heroCTA}>
                Sign Up
              </Link>
              <Link to="/blog" className={buttonPatterns.secondary}>
                Back to Series
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default BlogPost;
