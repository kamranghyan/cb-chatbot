/**
 * ENDPOINTS — every backend route the application talks to, in ONE file.
 *
 * RULES
 * -----
 * 1. No API path string may exist anywhere else in the codebase.
 * 2. Dynamic segments are functions: ENDPOINTS.chat.byId('123').
 * 3. Query strings are built by the caller with URLSearchParams — never
 *    concatenated by hand inside components.
 *
 * When the real backend arrives with slightly different paths, you edit
 * THIS file only. Services, hooks and UI never change.
 */

export const ENDPOINTS = {
  auth: {
    login: '/users/login',
    refreshToken: '/users/refresh-token',
  },

  users: {
    root: '/users',                                   // POST create
    byEmail: (email: string) => `/users?email=${encodeURIComponent(email.trim())}`,
    byId: (id: string) => `/user/get-user-by-id?id=${encodeURIComponent(id)}`,
    list: '/users/list',
    bots: '/users/bots',
    sessionList: '/users/session_list',
    update: (id: string) => `/users/${id}`,           // PATCH
    rolesList: '/users/role/list',
  },

  roles: {
    root: '/roles',                                   // GET list, POST create
    byId: (id: string) => `/roles/${id}`,             // GET, PUT, DELETE
  },

  chat: {
    root: '/chat',                                    // POST message
    list: '/chat/list',
    byId: (threadId: string) => `/chat/${threadId}`,  // GET, DELETE
    bySession: (sessionId: number) => `/chat/session/${sessionId}`,
    sessionConversations: '/chat/session/conversations/',
    feedback: (convId: number) => `/chat/feedback/${convId}`,
    triadScores: '/chat/rag/triad/scores',
    accuracy: '/chat/accuracy',
    questions: '/chat/questions',
    translate: (convId: string) => `/chat/translate/${convId}`,
  },

  content: {
    root: '/ingestion-metadata',                      // GET list, POST create
    byId: (uid: string) => `/ingestion-metadata/${uid}`,
    syncKnowledgeBase: (uid: string) => `/ingestion-metadata/sync-knowledgebase/${uid}`,
    verifyWebsite: (url: string) => `/ingestion-metadata/verify-website?url=${encodeURIComponent(url)}`,
    download: '/ingestion-metadata/download',
  },

  analytics: {
    summary: '/analytics/summary',
  },
  urls: {
    byId: (id: number) => `/api/url/get-url-by-id?id=${id}`,
    create: '/api/url/create',
    update: '/api/url/update-url',
    remove: (id: number) => `/api/url/delete/${id}`,
    list: '/api/url/list-url',
  },

  metadata: {
    departments: '/departments/list',
  },
} as const;
