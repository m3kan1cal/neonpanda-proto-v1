import React from 'react';
import { Link, useLocation } from 'react-router-dom';

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

function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);
  const searchParams = new URLSearchParams(location.search);

  // Define route mappings for better display names
  const routeMap = {
    'faqs': 'FAQs',
    'contact': 'Contact',
    'coach-creator': 'Coach Creator',
    'coaches': 'Coaches',
    'training-grounds': 'Training Grounds',
    'coach-conversations': 'Coach Conversations'
  };

  // Don't show breadcrumbs on the home page
  if (location.pathname === '/') {
    return null;
  }

  // Helper function to build route with query parameters
  const buildRoute = (pathSegments, routeName) => {
    const basePath = `/${pathSegments.join('/')}`;

    // For Training Grounds, preserve userId and coachId if available
    if (routeName === 'training-grounds' && searchParams.has('userId') && searchParams.has('coachId')) {
      const userId = searchParams.get('userId');
      const coachId = searchParams.get('coachId');
      return `${basePath}?userId=${userId}&coachId=${coachId}`;
    }

    return basePath;
  };

  return (
    <nav className="fixed top-[72px] left-0 right-0 z-40 bg-synthwave-bg-secondary/45 backdrop-blur-sm border-b-2 border-synthwave-neon-pink/40">
      <div className="px-8 py-2">
        <div className="flex items-center space-x-2 text-sm font-rajdhani">
          {/* Home link */}
          <Link
            to="/"
            className="flex items-center space-x-1 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
          >
            <HomeIcon />
            <span>Home</span>
          </Link>

          {/* Breadcrumb trail */}
          {pathnames.map((name, index) => {
            const pathSegments = pathnames.slice(0, index + 1);
            const routeTo = buildRoute(pathSegments, name);
            const isLast = index === pathnames.length - 1;
            const displayName = routeMap[name] || name.charAt(0).toUpperCase() + name.slice(1);

            return (
              <React.Fragment key={name}>
                <span className="text-white font-medium">/</span>
                {isLast ? (
                  <span className="text-synthwave-neon-pink font-medium">
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={routeTo}
                    className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                  >
                    {displayName}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default Breadcrumbs;