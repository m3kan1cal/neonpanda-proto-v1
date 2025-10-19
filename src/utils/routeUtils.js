// Centralized route mapping for consistent naming across breadcrumbs and page titles
export const routeMap = {
  'about': 'About',
  'technology': 'Technology',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  'faqs': 'FAQs',
  'changelog': 'Changelog',
  'contact': 'Contact',
  'auth': 'Authentication',
  'coach-creator': 'Coach Creator',
  'coaches': 'Coaches',
  'training-grounds': 'Training Grounds',
  'coach-conversations': 'Coach Conversations',
  'workouts': 'Workouts',
  'manage-workouts': 'Manage Workouts',
  'manage-memories': 'Manage Memories',
  'manage-conversations': 'Manage Coach Conversations',
  'reports': 'View Reports',
  'weekly': 'Weekly Reports',
  'template/synthwave': 'Synthwave Theme'
};

/**
 * Get the display name for a route segment
 * @param {string} segment - The route segment (e.g., 'coach-creator')
 * @returns {string} - The display name (e.g., 'Coach Creator')
 */
export const getRouteDisplayName = (segment) => {
  const mappedName = routeMap[segment];
  if (mappedName) {
    return mappedName;
  }
  // Fallback: capitalize first letter
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

/**
 * Process a pathname into an array of display names
 * @param {string} pathname - The full pathname (e.g., '/training-grounds/workouts')
 * @returns {string[]} - Array of display names (e.g., ['Training Grounds', 'Workouts'])
 */
export const getRouteDisplayNames = (pathname) => {
  if (pathname === '/') {
    return [];
  }

  const pathSegments = pathname.split('/').filter(x => x);
  const displayNames = [];

  // Handle special compound routes
  if (pathname.includes('/template/synthwave')) {
    return ['Synthwave Theme'];
  }

  // Process each path segment
  pathSegments.forEach((segment) => {
    displayNames.push(getRouteDisplayName(segment));
  });

  return displayNames;
};

/**
 * Generate a page title from pathname
 * @param {string} pathname - The current pathname
 * @returns {string} - The formatted page title
 */
export const generatePageTitle = (pathname) => {
  // Home page gets the default title
  if (pathname === '/') {
    return 'NeonPanda - Create Your Perfect Virtual Coach';
  }

  const displayNames = getRouteDisplayNames(pathname);

  // Build the title: "PageName - NeonPanda" or "Parent > Child - NeonPanda"
  if (displayNames.length === 0) {
    return 'NeonPanda - Create Your Perfect Virtual Coach';
  } else if (displayNames.length === 1) {
    return `${displayNames[0]} - NeonPanda`;
  } else {
    // For nested routes, show hierarchy like "Training Grounds > Workouts - NeonPanda"
    const hierarchy = displayNames.join(' > ');
    return `${hierarchy} - NeonPanda`;
  }
};

/**
 * Helper function to build route with query parameters (used by breadcrumbs)
 * @param {string[]} pathSegments - Array of path segments
 * @param {string} routeName - The current route name
 * @param {URLSearchParams} searchParams - Current URL search parameters
 * @returns {string} - The route with appropriate query parameters preserved
 */
export const buildRouteWithParams = (pathSegments, routeName, searchParams) => {
  const basePath = `/${pathSegments.join('/')}`;

  // Routes that should preserve userId and coachId
  const preserveUserCoachRoutes = [
    'training-grounds',
    'manage-workouts',
    'manage-memories',
    'manage-conversations'
  ];

  if (preserveUserCoachRoutes.includes(routeName) &&
      searchParams.has('userId') &&
      searchParams.has('coachId')) {
    const userId = searchParams.get('userId');
    const coachId = searchParams.get('coachId');
    return `${basePath}?userId=${userId}&coachId=${coachId}`;
  }

  // For Coaches, preserve userId if available
  if (routeName === 'coaches' && searchParams.has('userId')) {
    const userId = searchParams.get('userId');
    return `${basePath}?userId=${userId}`;
  }

  // For Coach Creator, preserve userId if available
  if (routeName === 'coach-creator' && searchParams.has('userId')) {
    const userId = searchParams.get('userId');
    return `${basePath}?userId=${userId}`;
  }

  // For View Reports, preserve userId and coachId if available
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
