import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getRouteDisplayName, buildRouteWithParams } from '../../utils/routeUtils';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { Tooltip } from 'react-tooltip';
import { tooltipPatterns } from '../../utils/ui/uiPatterns';

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
  const { isSidebarCollapsed } = useNavigationContext();

  // Route mappings now handled by shared utility

  // Don't show breadcrumbs on the home page
  if (location.pathname === '/') {
    return null;
  }

  // Helper function now uses shared utility
  const buildRoute = (pathSegments, routeName) => {
    return buildRouteWithParams(pathSegments, routeName, searchParams);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 pt-2 pointer-events-none ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-[272px]'}`}>
      <div className="px-4 py-1 pb-2">
        <div className="flex items-center space-x-2 text-sm font-rajdhani overflow-x-auto synthwave-scrollbar-cyan pb-2 -mb-2 scrollbar-hide-on-mobile pointer-events-auto">
          {/* Logo - Mobile only */}
          <Link
            to="/"
            className="md:hidden flex-shrink-0 mr-1"
            aria-label="Go to home"
            data-tooltip-id="breadcrumb-logo-tooltip"
            data-tooltip-content="Go to Home"
          >
            <img
              src="/images/logo-light-sm-head.png"
              alt="NeonPanda"
              className="w-8 h-8 object-contain hover:opacity-80 transition-opacity duration-200"
            />
          </Link>

          {/* Home link */}
          <Link
            to="/"
            className="flex items-center space-x-1 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
          >
            <HomeIcon />
            <span>Home</span>
          </Link>

          {/* Breadcrumb trail */}
          {(() => {
            // Special handling for coach-creator page - show it as a child of Coaches
            const isCoachCreatorPage = pathnames.includes('coach-creator');

            // Special handling for workout details page - show it as a child of Manage Workouts
            const isWorkoutDetailsPage = pathnames.includes('workouts') && pathnames.includes('training-grounds') && pathnames.length > 2;

            // Special handling for coach-conversations page - show it as a child of Manage Coach Conversations
            const isCoachConversationsPage = pathnames.includes('coach-conversations') && pathnames.includes('training-grounds');

            // Special handling for view workouts page (today or specific day) - show it as a child of Training Grounds
            const isViewWorkoutsPage = (pathnames.includes('today') || pathnames.includes('day')) && pathnames.includes('training-programs');

            if (isCoachCreatorPage) {
              // Build custom breadcrumb path: Coaches > Coach Creator
              const userId = searchParams.get('userId');
              const coachesPath = userId ? `/coaches?userId=${userId}` : '/coaches';

              return [
                // Coaches breadcrumb (virtual parent)
                <React.Fragment key="coaches">
                  <Link
                    to={coachesPath}
                    className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                  >
                    Coaches
                  </Link>
                </React.Fragment>,

                // Coach Creator breadcrumb (current page)
                <React.Fragment key="coach-creator-current">
                  <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                    Coach Creator
                  </span>
                </React.Fragment>
              ];
            }

            if (isWorkoutDetailsPage) {
              // Build custom breadcrumb path: Training Grounds > Workouts > Workout Details
              const trainingGroundsSegment = pathnames.slice(0, pathnames.indexOf('training-grounds') + 1);
              const manageWorkoutsPath = [...trainingGroundsSegment, 'manage-workouts'];

              return [
                // Training Grounds breadcrumb
                ...pathnames.slice(0, pathnames.indexOf('workouts')).map((name, index) => {
                  const pathSegments = pathnames.slice(0, index + 1);
                  const routeTo = buildRoute(pathSegments, name);
                  const displayName = getRouteDisplayName(name);

                  return (
                    <React.Fragment key={name}>
                      <Link
                        to={routeTo}
                        className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                      >
                        {displayName}
                      </Link>
                    </React.Fragment>
                  );
                }),

                // Workouts breadcrumb (virtual parent)
                <React.Fragment key="manage-workouts">
                  <Link
                    to={buildRoute(manageWorkoutsPath, 'manage-workouts')}
                    className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                  >
                    Workouts
                  </Link>
                </React.Fragment>,

                // Workout Details breadcrumb (current page)
                <React.Fragment key="workout-details-current">
                  <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                    Workout Details
                  </span>
                </React.Fragment>
              ];
            }

            if (isCoachConversationsPage) {
              // Build custom breadcrumb path: Training Grounds > Coach Conversations > Coach Conversation
              const trainingGroundsSegment = pathnames.slice(0, pathnames.indexOf('training-grounds') + 1);
              const manageConversationsPath = [...trainingGroundsSegment, 'manage-conversations'];

              return [
                // Training Grounds breadcrumb
                ...pathnames.slice(0, pathnames.indexOf('coach-conversations')).map((name, index) => {
                  const pathSegments = pathnames.slice(0, index + 1);
                  const routeTo = buildRoute(pathSegments, name);
                  const displayName = getRouteDisplayName(name);

                  return (
                    <React.Fragment key={name}>
                      <Link
                        to={routeTo}
                        className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                      >
                        {displayName}
                      </Link>
                    </React.Fragment>
                  );
                }),

                // Coach Conversations breadcrumb (virtual parent)
                <React.Fragment key="manage-conversations">
                  <Link
                    to={buildRoute(manageConversationsPath, 'manage-conversations')}
                    className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                  >
                    Coach Conversations
                  </Link>
                </React.Fragment>,

                // Coach Conversation breadcrumb (current page)
                <React.Fragment key="coach-conversations-current">
                  <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                    Coach Conversation
                  </span>
                </React.Fragment>
              ];
            }

            if (isViewWorkoutsPage) {
              // Build custom breadcrumb path: Training Grounds > (Today's Workouts or View Workouts)
              const trainingGroundsSegment = pathnames.slice(0, pathnames.indexOf('training-grounds') + 1);
              const isToday = pathnames.includes('today');
              const breadcrumbText = isToday ? "Today's Workouts" : "View Workouts";

              return [
                // Training Grounds breadcrumb
                <React.Fragment key="training-grounds">
                  <Link
                    to={buildRoute(trainingGroundsSegment, 'training-grounds')}
                    className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                  >
                    Training Grounds
                  </Link>
                </React.Fragment>,

                // View Workouts breadcrumb (current page - dynamic text)
                <React.Fragment key="view-workouts-current">
                  <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                    {breadcrumbText}
                  </span>
                </React.Fragment>
              ];
            }

            // Default breadcrumb rendering for all other pages
            return pathnames.map((name, index) => {
              const pathSegments = pathnames.slice(0, index + 1);
              const routeTo = buildRoute(pathSegments, name);
              const isLast = index === pathnames.length - 1;
              const displayName = getRouteDisplayName(name);

              return (
                <React.Fragment key={name}>
                  {isLast ? (
                    <span className="bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                      {displayName}
                    </span>
                  ) : (
                    <Link
                      to={routeTo}
                      className="bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 transition-all duration-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
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

      {/* Tooltip for logo */}
      <div className="pointer-events-auto">
        <Tooltip
          id="breadcrumb-logo-tooltip"
          place="bottom"
          {...tooltipPatterns.standard}
        />
      </div>
    </nav>
  );
}

export default Breadcrumbs;
