import React from "react";
import { Link } from "react-router-dom";
import { DOCS_SECTIONS } from "./docsConfig";

const QUICKSTART_CARDS = [
  {
    title: "Create a Coach",
    description:
      "Build a personalized AI coach tailored to your fitness style, goals, and personality preferences.",
    path: "/docs/creating-a-coach",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    ),
    color: "pink",
  },
  {
    title: "Log a Workout",
    description:
      "Record your training sessions with natural language or structured input. Your coach remembers everything.",
    path: "/docs/logging-workouts",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    color: "cyan",
  },
  {
    title: "Start a Conversation",
    description:
      "Chat with your AI coach to get personalized advice, training plans, and real-time feedback.",
    path: "/docs/coach-conversations",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    color: "purple",
  },
];

function colorClasses(color) {
  switch (color) {
    case "pink":
      return {
        border: "border-synthwave-neon-pink/20 hover:border-synthwave-neon-pink/50",
        bg: "hover:bg-synthwave-neon-pink/5",
        icon: "text-synthwave-neon-pink",
        shadow: "hover:shadow-neon-pink",
      };
    case "cyan":
      return {
        border: "border-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/50",
        bg: "hover:bg-synthwave-neon-cyan/5",
        icon: "text-synthwave-neon-cyan",
        shadow: "hover:shadow-neon-cyan",
      };
    case "purple":
      return {
        border: "border-synthwave-neon-purple/20 hover:border-synthwave-neon-purple/50",
        bg: "hover:bg-synthwave-neon-purple/5",
        icon: "text-synthwave-neon-purple",
        shadow: "hover:shadow-neon-purple",
      };
    default:
      return {
        border: "border-synthwave-neon-cyan/20",
        bg: "",
        icon: "text-synthwave-neon-cyan",
        shadow: "",
      };
  }
}

function DocsHome() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-2">
          <img
            src="/images/logo-dark-sm.webp"
            alt="NeonPanda"
            className="h-8 w-auto"
          />
          <span className="text-xs uppercase tracking-widest text-synthwave-text-muted font-header">
            Documentation
          </span>
        </div>
        <h1 className="font-header font-bold text-4xl md:text-5xl text-synthwave-text-primary leading-tight">
          NeonPanda{" "}
          <span className="text-gradient-neon">Documentation</span>
        </h1>
        <p className="font-body text-lg text-synthwave-text-secondary leading-relaxed max-w-2xl">
          Learn how to create AI-powered fitness coaches, log workouts with
          natural language, and get personalized training guidance. Get started
          in minutes.
        </p>
      </div>

      {/* Quickstart Cards */}
      <div className="space-y-4">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-cyan uppercase tracking-wide">
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICKSTART_CARDS.map((card) => {
            const c = colorClasses(card.color);
            return (
              <Link
                key={card.title}
                to={card.path}
                className={`group block p-6 rounded-lg border ${c.border} ${c.bg} ${c.shadow} bg-synthwave-bg-card/50 transition-all duration-300`}
              >
                <div className={`${c.icon} mb-4`}>{card.icon}</div>
                <h3 className="font-header font-bold text-lg text-synthwave-text-primary mb-2 group-hover:text-synthwave-neon-pink transition-colors">
                  {card.title}
                </h3>
                <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* All docs listing */}
      <div className="space-y-6">
        <h2 className="font-header font-bold text-xl text-synthwave-neon-pink uppercase tracking-wide">
          All Documentation
        </h2>
        {DOCS_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            <h3 className="font-header font-semibold text-sm uppercase tracking-widest text-synthwave-text-muted">
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="group flex items-start space-x-3 p-3 rounded-xl hover:bg-synthwave-neon-cyan/5 border border-transparent hover:border-synthwave-neon-cyan/10 transition-all duration-200"
                >
                  <svg
                    className="w-5 h-5 text-synthwave-text-muted group-hover:text-synthwave-neon-cyan transition-colors mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <span className="font-body font-medium text-synthwave-text-primary group-hover:text-synthwave-neon-cyan transition-colors">
                      {item.title}
                    </span>
                    <p className="font-body text-sm text-synthwave-text-muted mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help callout */}
      <div className="p-6 rounded-lg border border-synthwave-neon-purple/20 bg-synthwave-neon-purple/5">
        <div className="flex items-start space-x-4">
          <svg
            className="w-6 h-6 text-synthwave-neon-purple shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-header font-bold text-synthwave-text-primary mb-1">
              Need help?
            </h3>
            <p className="font-body text-sm text-synthwave-text-secondary leading-relaxed">
              Can't find what you're looking for? Check out our{" "}
              <Link
                to="/faqs"
                className="text-synthwave-neon-cyan hover:underline"
              >
                FAQs
              </Link>{" "}
              or reach out to{" "}
              <Link
                to="/contact?type=support"
                className="text-synthwave-neon-cyan hover:underline"
              >
                Support
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocsHome;
