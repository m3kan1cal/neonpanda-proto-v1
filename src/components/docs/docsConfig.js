export const DOCS_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        id: "introduction",
        title: "Introduction",
        path: "/docs",
        description: "Welcome to NeonPanda and what you can do with the platform.",
      },
      {
        id: "creating-a-coach",
        title: "Creating a Coach",
        path: "/docs/creating-a-coach",
        description: "Build your first personalized AI fitness coach.",
      },
    ],
  },
  {
    id: "core-features",
    title: "Core Features",
    items: [
      {
        id: "logging-workouts",
        title: "Logging Workouts",
        path: "/docs/logging-workouts",
        description: "Log workouts using natural language or structured input.",
      },
      {
        id: "coach-conversations",
        title: "Coach Conversations",
        path: "/docs/coach-conversations",
        description: "Chat with your AI coach for guidance, plans, and feedback.",
      },
    ],
  },
];

export function getDocByPath(path) {
  for (const section of DOCS_SECTIONS) {
    const item = section.items.find((i) => i.path === path);
    if (item) return { ...item, section: section.title };
  }
  return null;
}

export function getAdjacentDocs(currentPath) {
  const allItems = DOCS_SECTIONS.flatMap((s) => s.items);
  const index = allItems.findIndex((i) => i.path === currentPath);
  return {
    prev: index > 0 ? allItems[index - 1] : null,
    next: index < allItems.length - 1 ? allItems[index + 1] : null,
  };
}
