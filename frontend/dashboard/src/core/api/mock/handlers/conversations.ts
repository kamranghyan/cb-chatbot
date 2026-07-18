import type { RouteDef } from '../mockAdapter';
import { conversationUsersFixture, userThreadsFixture } from '../fixtures/conversations';
import type { UnansweredQuestionRow, IssueRow } from '../../types';

const userName = (email: string) => {
  const u = conversationUsersFixture.find((x) => x.email === email);
  return u ? `${u.first_name} ${u.last_name}` : email;
};

const buildUnanswered = (): UnansweredQuestionRow[] => {
  const rows: UnansweredQuestionRow[] = [];
  for (const [email, threads] of Object.entries(userThreadsFixture)) {
    for (const t of threads) {
      for (const ex of t.exchanges) {
        if (!ex.answer) {
          rows.push({
            external_conv_id: ex.external_conv_id,
            external_chat_id: t.external_chat_id,
            email, user_name: userName(email),
            question: ex.question, created_at: ex.created_at,
          });
        }
      }
    }
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

const buildIssues = (): IssueRow[] => {
  const rows: IssueRow[] = [];
  for (const [email, threads] of Object.entries(userThreadsFixture)) {
    for (const t of threads) {
      if (t.issue) {
        rows.push({ ...t.issue, external_chat_id: t.external_chat_id, email, user_name: userName(email), title: t.title, created_at: t.created_at });
      }
    }
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const conversationHandlers: RouteDef[] = [
  { route: 'GET /admin/conversation-users', handler: () => ({ data: conversationUsersFixture }) },
  {
    route: 'GET /admin/conversation-users/:email/threads',
    handler: ({ params }) => ({ data: userThreadsFixture[decodeURIComponent(params.email)] ?? [] }),
  },
  { route: 'GET /admin/unanswered-questions', handler: () => ({ data: buildUnanswered() }) },
  { route: 'GET /admin/issues', handler: () => ({ data: buildIssues() }) },
];
