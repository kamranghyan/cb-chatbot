import type { RouteDef } from '../mockAdapter';
import { chatListFixture, chatDetailFixture } from '../fixtures/chat';

export const chatHandlers: RouteDef[] = [
  { route: 'GET /api/v1/chat/list', handler: () => ({ data: chatListFixture }) },
  {
    route: 'GET /api/v1/chat/:chatId',
    handler: ({ params }) => {
      const detail = chatDetailFixture[params.chatId];
      return detail ? { data: detail } : { status: 404, data: { message: 'Chat not found' } };
    },
  },
  {
    route: 'POST /api/v1/chat',
    handler: ({ body }) => {
      const payload = body as { question?: string; external_chat_id?: string | null };
      return {
        data: {
          external_chat_id: payload?.external_chat_id ?? `ch-${Date.now()}`,
          external_conv_id: `conv-${Date.now()}`,
          title: 'Mock chat',
          answer: `(mock) You asked: "${payload?.question ?? ''}". This simulates the 7-step RAG pipeline response.`,
          response_time: 0.42,
          sources: [{ content: 'This is a mock retrieved chunk of text used as a source.', metadata: { doc: 'mock.pdf' }, score: 0.87 }],
        },
      };
    },
  },
  { route: 'POST /api/v1/chat/feedback/:convId', handler: () => ({ data: { status: 'recorded' } }) },
  { route: 'POST /api/v1/chat/:chatId/issue', handler: () => ({ data: { status: 'issue_filed' } }) },
];
