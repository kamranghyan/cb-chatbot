import type { RouteDef } from '../mockAdapter';
import { threadsFixture, chatQuestionsFixture } from '../fixtures/chat';

let threads = JSON.parse(JSON.stringify(threadsFixture)) as typeof threadsFixture;

export const chatHandlers: RouteDef[] = [
  { route: 'GET /chat/list', handler: () => ({ data: threads }) },
  { route: 'GET /chat/accuracy', handler: () => ({ data: 'false' }) },
  { route: 'GET /chat/questions', handler: () => ({ data: chatQuestionsFixture }) },
  {
    route: 'GET /chat/:threadId',
    handler: ({ params }) => {
      const t = threads.find((x) => x.id === params.threadId);
      return t ? { data: t } : { status: 404, data: { message: 'Thread not found' } };
    },
  },
  {
    route: 'DELETE /chat/:threadId',
    handler: ({ params }) => {
      threads = threads.filter((x) => x.id !== params.threadId);
      return { status: 204, data: null };
    },
  },
  {
    route: 'POST /chat',
    handler: ({ body }) => {
      const payload = body as { message?: string; thread_id?: string };
      const answer = {
        id: `m-${Date.now()}`,
        role: 'assistant',
        body: `(mock) You asked: "${payload?.message ?? ''}". This is a simulated model answer so the chat pipeline can be built and tested before the backend exists.`,
        createdAt: new Date().toISOString(),
      };
      return { data: { thread_id: payload?.thread_id ?? `th-${Date.now()}`, conversation: answer } };
    },
  },
  // NOTE: literal routes must be registered BEFORE parameterised ones —
  // the router is first-match-wins, and ':sessionId' would swallow 'conversations'.
  { route: 'GET /chat/session/conversations', handler: () => ({ data: threads[0]?.messages ?? [] }) },
  { route: 'GET /chat/session/:sessionId', handler: () => ({ data: threads[0]?.messages ?? [] }) },
  { route: 'POST /chat/feedback/:convId', handler: () => ({ data: { status: 'recorded' } }) },
  { route: 'POST /chat/rag/triad/scores', handler: () => ({ data: { groundedness: 0.91, answer_relevance: 0.88, context_relevance: 0.9 } }) },
  { route: 'GET /chat/translate/:convId', handler: () => ({ data: { translated_text: '(mock) نص مترجم' } }) },
];
