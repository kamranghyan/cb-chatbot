/**
 * ENDPOINTS — every backend route the application talks to, in ONE file.
 *
 * These paths are copied 1:1 from the RAG Chatbot Backend v2 README
 * ("API Overview" table). ENV.API_BASE_URL is the bare host
 * (e.g. http://localhost:8000) — NOT including /api/v1 — because the
 * backend's /health route lives outside that prefix. Every versioned
 * route below carries the /api/v1 prefix explicitly.
 *
 * RULES
 * -----
 * 1. No API path string may exist anywhere else in the codebase.
 * 2. Dynamic segments are functions: ENDPOINTS.chat.byId('123').
 * 3. When the backend adds/renames a route, edit THIS file only.
 */

const V1 = '/api/v1';

export const ENDPOINTS = {
  health: '/health',

  auth: {
    /** POST { email } -> token. Backend note: "local env only". */
    devToken: `${V1}/auth/dev-token`,
  },

  chat: {
    root: `${V1}/chat`,                                      // POST — JSON chat
    stream: `${V1}/chat/stream`,                              // POST — SSE
    ws: (token: string) => `${V1}/chat/ws?token=${encodeURIComponent(token)}`,
    list: `${V1}/chat/list`,                                  // GET — user's chats
    byId: (chatId: string) => `${V1}/chat/${chatId}`,         // GET — detail + conversations + sources
    feedback: (convId: string) => `${V1}/chat/feedback/${convId}`, // POST — like/dislike/comment
    issue: (chatId: string) => `${V1}/chat/${chatId}/issue`,  // POST — file an issue
  },

  ingestion: {
    text: `${V1}/ingestion/text`,                             // POST (admin)
    file: `${V1}/ingestion/file`,                             // POST multipart (admin)
    s3: `${V1}/ingestion/s3`,                                 // POST (admin)
    presignedUrl: `${V1}/ingestion/presigned-url`,            // POST (admin)
    list: `${V1}/ingestion/list`,                             // GET (admin)
  },

  analytics: {
    summary: `${V1}/analytics/summary`,                       // GET (admin) — cached 60s
    daily: (days = 14) => `${V1}/analytics/daily?days=${days}`, // GET (admin), 1-90, default 14
  },

  /**
   * NOT in this backend yet — see ADMIN-ENDPOINTS-NEEDED.md for the exact
   * spec to hand to the backend dev. Mock-only until added (same pattern
   * as users/roles below).
   */
  adminConversations: {
    users: '/admin/conversation-users',
    userThreads: (email: string) => `/admin/conversation-users/${encodeURIComponent(email)}/threads`,
    unanswered: '/admin/unanswered-questions',
    issues: '/admin/issues',
  },

  /**
   * NOT in this backend. No /users or /roles routes exist in the README.
   * Kept so the existing admin screens still compile; their services are
   * wired to a mock-only client (see services/roles.service.ts /
   * users.service.ts) and will keep showing sample data until you add a
   * real user-management service.
   */
  users: {
    root: '/users',
    byEmail: (email: string) => `/users?email=${encodeURIComponent(email.trim())}`,
    byId: (id: string) => `/user/get-user-by-id?id=${encodeURIComponent(id)}`,
    list: '/users/list',
    update: (id: string) => `/users/${id}`,
    rolesList: '/users/role/list',
  },
  roles: {
    root: '/roles',
    byId: (id: string) => `/roles/${id}`,
  },
} as const;
