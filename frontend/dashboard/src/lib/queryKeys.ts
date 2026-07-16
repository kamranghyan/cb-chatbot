/**
 * Central registry of TanStack Query cache keys.
 * One place to see everything the app caches, and to invalidate consistently.
 */
export const queryKeys = {
  users: { all: ['users'] as const },
  bots: { all: ['bots'] as const },
  roles: {
    all: ['roles'] as const,
    byId: (id: string) => ['roles', id] as const,
  },
  content: { all: ['content'] as const },
  chat: {
    threads: ['chat', 'threads'] as const,
    thread: (id: string) => ['chat', 'threads', id] as const,
    questions: ['chat', 'questions'] as const,
  },
  departments: ['departments'] as const,
};
