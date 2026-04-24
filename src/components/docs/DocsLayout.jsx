import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { DOCS_SECTIONS, getAdjacentDocs } from "./docsConfig";
import Footer from "../shared/Footer";
import { useSeoHead } from "../../hooks/useSeoHead";

function DocsSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-72 bg-synthwave-bg-primary/95 backdrop-blur-md border-r border-synthwave-neon-cyan/10 overflow-y-auto transition-transform duration-300 md:sticky md:top-16 md:z-10 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Docs home link */}
          <Link
            to="/docs"
            className="flex items-center space-x-2 text-synthwave-neon-pink font-header font-bold text-lg tracking-wide hover:opacity-80 transition-opacity"
            onClick={onClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>Documentation</span>
          </Link>

          {/* Sections */}
          <nav className="space-y-5">
            {DOCS_SECTIONS.map((section) => (
              <div key={section.id}>
                <h3 className="font-header font-semibold text-xs uppercase tracking-widest text-synthwave-text-muted mb-2 px-2">
                  {section.title}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-md font-body text-sm transition-all duration-200 ${
                            isActive
                              ? "bg-synthwave-neon-pink/15 text-synthwave-neon-pink border-l-2 border-synthwave-neon-pink"
                              : "text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/5"
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Quick links */}
          <div className="pt-4 border-t border-synthwave-neon-cyan/10">
            <h3 className="font-header font-semibold text-xs uppercase tracking-widest text-synthwave-text-muted mb-2 px-2">
              Quick Links
            </h3>
            <ul className="space-y-0.5">
              <li>
                <Link
                  to="/faqs"
                  onClick={onClose}
                  className="block px-3 py-2 rounded-md font-body text-sm text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/5 transition-all duration-200"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  to="/contact?type=support"
                  onClick={onClose}
                  className="block px-3 py-2 rounded-md font-body text-sm text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/5 transition-all duration-200"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  onClick={onClose}
                  className="block px-3 py-2 rounded-md font-body text-sm text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/5 transition-all duration-200"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}

function DocsPagination({ currentPath }) {
  const { prev, next } = getAdjacentDocs(currentPath);

  if (!prev && !next) return null;

  return (
    <div className="flex justify-between items-stretch gap-4 mt-12 pt-8 border-t border-synthwave-neon-cyan/10">
      {prev ? (
        <Link
          to={prev.path}
          className="group flex-1 flex flex-col items-start p-4 rounded-lg border border-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/30 hover:bg-synthwave-neon-cyan/5 transition-all duration-200"
        >
          <span className="text-xs uppercase tracking-wider text-synthwave-text-muted font-header mb-1">
            Previous
          </span>
          <span className="font-body font-medium text-synthwave-neon-cyan group-hover:text-synthwave-neon-cyan/80 transition-colors">
            &larr; {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          to={next.path}
          className="group flex-1 flex flex-col items-end p-4 rounded-lg border border-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/30 hover:bg-synthwave-neon-pink/5 transition-all duration-200"
        >
          <span className="text-xs uppercase tracking-wider text-synthwave-text-muted font-header mb-1">
            Next
          </span>
          <span className="font-body font-medium text-synthwave-neon-pink group-hover:text-synthwave-neon-pink/80 transition-colors">
            {next.title} &rarr;
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useSeoHead({
    description:
      "NeonPanda documentation — how to create AI coaches, log workouts, run coach conversations, and more.",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-1">
        <DocsSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0">
          {/* Mobile sidebar toggle */}
          <div className="sticky top-16 z-30 md:hidden bg-synthwave-bg-primary/90 backdrop-blur-sm border-b border-synthwave-neon-cyan/10 px-4 py-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center space-x-2 text-synthwave-text-secondary hover:text-synthwave-neon-cyan font-body text-sm transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span>Menu</span>
            </button>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-10">
            <Outlet />
            <DocsPagination currentPath={location.pathname} />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default DocsLayout;
