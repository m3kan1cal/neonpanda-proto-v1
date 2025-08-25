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
    'coach-conversations': 'Coach Conversations',
    'workouts': 'Workouts',
    'manage-workouts': 'Manage Workouts',
    'manage-memories': 'Manage Memories',
    'manage-conversations': 'Manage Coach Conversations',
    'reports': 'View Reports',
    'weekly': 'Weekly Reports'
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

    // For Manage Workouts, preserve userId and coachId if available
    if (routeName === 'manage-workouts' && searchParams.has('userId') && searchParams.has('coachId')) {
      const userId = searchParams.get('userId');
      const coachId = searchParams.get('coachId');
      return `${basePath}?userId=${userId}&coachId=${coachId}`;
    }

    // For Manage Memories, preserve userId and coachId if available
    if (routeName === 'manage-memories' && searchParams.has('userId') && searchParams.has('coachId')) {
      const userId = searchParams.get('userId');
      const coachId = searchParams.get('coachId');
      return `${basePath}?userId=${userId}&coachId=${coachId}`;
    }

    // For Manage Conversations, preserve userId and coachId if available
    if (routeName === 'manage-conversations' && searchParams.has('userId') && searchParams.has('coachId')) {
      const userId = searchParams.get('userId');
      const coachId = searchParams.get('coachId');
      return `${basePath}?userId=${userId}&coachId=${coachId}`;
    }

    // For Reports, preserve userId and coachId if available
    if (routeName === 'reports' && searchParams.has('userId') && searchParams.has('coachId')) {
      const userId = searchParams.get('userId');
      const coachId = searchParams.get('coachId');
      return `${basePath}?userId=${userId}&coachId=${coachId}`;
    }

    // For Weekly Reports, preserve userId, weekId, and coachId if available
    if (routeName === 'weekly' && searchParams.has('userId')) {
      const userId = searchParams.get('userId');
      const weekId = searchParams.get('weekId');
      const coachId = searchParams.get('coachId');

      let params = `userId=${userId}`;
      if (weekId) params += `&weekId=${weekId}`;
      if (coachId) params += `&coachId=${coachId}`;

      return `${basePath}?${params}`;
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
          {(() => {
            // Special handling for coach-creator page - show it as a child of Coaches
            const isCoachCreatorPage = pathnames.includes('coach-creator');

            // Special handling for workouts page - show it as a child of Manage Workouts
            const isWorkoutsPage = pathnames.includes('workouts') && pathnames.includes('training-grounds');

            // Special handling for coach-conversations page - show it as a child of Manage Coach Conversations
            const isCoachConversationsPage = pathnames.includes('coach-conversations') && pathnames.includes('training-grounds');

            if (isCoachCreatorPage) {
              // Build custom breadcrumb path: Coaches > Coach Creator
              const userId = searchParams.get('userId');
              const coachesPath = userId ? `/coaches?userId=${userId}` : '/coaches';

              return [
                // Coaches breadcrumb (virtual parent)
                <React.Fragment key="coaches">
                  <span className="text-white font-medium">/</span>
                  <Link
                    to={coachesPath}
                    className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                  >
                    Coaches
                  </Link>
                </React.Fragment>,

                // Coach Creator breadcrumb (current page)
                <React.Fragment key="coach-creator-current">
                  <span className="text-white font-medium">/</span>
                  <span className="text-synthwave-neon-pink font-medium">
                    Coach Creator
                  </span>
                </React.Fragment>
              ];
            }

            if (isWorkoutsPage) {
              // Build custom breadcrumb path: Training Grounds > Manage Workouts > Workouts
              const trainingGroundsSegment = pathnames.slice(0, pathnames.indexOf('training-grounds') + 1);
              const manageWorkoutsPath = [...trainingGroundsSegment, 'manage-workouts'];

              return [
                // Training Grounds breadcrumb
                ...pathnames.slice(0, pathnames.indexOf('workouts')).map((name, index) => {
                  const pathSegments = pathnames.slice(0, index + 1);
                  const routeTo = buildRoute(pathSegments, name);
                  const displayName = routeMap[name] || name.charAt(0).toUpperCase() + name.slice(1);

                  return (
                    <React.Fragment key={name}>
                      <span className="text-white font-medium">/</span>
                      <Link
                        to={routeTo}
                        className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                      >
                        {displayName}
                      </Link>
                    </React.Fragment>
                  );
                }),

                // Manage Workouts breadcrumb (virtual parent)
                <React.Fragment key="manage-workouts">
                  <span className="text-white font-medium">/</span>
                  <Link
                    to={buildRoute(manageWorkoutsPath, 'manage-workouts')}
                    className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                  >
                    Manage Workouts
                  </Link>
                </React.Fragment>,

                // Workouts breadcrumb (current page)
                <React.Fragment key="workouts-current">
                  <span className="text-white font-medium">/</span>
                  <span className="text-synthwave-neon-pink font-medium">
                    Workouts
                  </span>
                </React.Fragment>
              ];
            }

            if (isCoachConversationsPage) {
              // Build custom breadcrumb path: Training Grounds > Manage Coach Conversations > Coach Conversation
              const trainingGroundsSegment = pathnames.slice(0, pathnames.indexOf('training-grounds') + 1);
              const manageConversationsPath = [...trainingGroundsSegment, 'manage-conversations'];

              return [
                // Training Grounds breadcrumb
                ...pathnames.slice(0, pathnames.indexOf('coach-conversations')).map((name, index) => {
                  const pathSegments = pathnames.slice(0, index + 1);
                  const routeTo = buildRoute(pathSegments, name);
                  const displayName = routeMap[name] || name.charAt(0).toUpperCase() + name.slice(1);

                  return (
                    <React.Fragment key={name}>
                      <span className="text-white font-medium">/</span>
                      <Link
                        to={routeTo}
                        className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                      >
                        {displayName}
                      </Link>
                    </React.Fragment>
                  );
                }),

                // Manage Coach Conversations breadcrumb (virtual parent)
                <React.Fragment key="manage-conversations">
                  <span className="text-white font-medium">/</span>
                  <Link
                    to={buildRoute(manageConversationsPath, 'manage-conversations')}
                    className="text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-200"
                  >
                    Manage Coach Conversations
                  </Link>
                </React.Fragment>,

                // Coach Conversation breadcrumb (current page)
                <React.Fragment key="coach-conversations-current">
                  <span className="text-white font-medium">/</span>
                  <span className="text-synthwave-neon-pink font-medium">
                    Coach Conversation
                  </span>
                </React.Fragment>
              ];
            }

            // Default breadcrumb rendering for all other pages
            return pathnames.map((name, index) => {
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
            });
          })()}
        </div>
      </div>
    </nav>
  );
}

export default Breadcrumbs;