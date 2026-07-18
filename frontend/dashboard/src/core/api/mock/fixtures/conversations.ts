/**
 * Demo data for the Conversation Management dashboard.
 * Backend has no cross-user admin endpoint yet (see ADMIN-ENDPOINTS-NEEDED.md
 * in the project root) — this mirrors what that endpoint will return once
 * it exists, so the swap later is just mockOnlyClient -> apiClient.
 */
import type { ConversationUser, UserConversationThread } from '../../types';

export const conversationUsersFixture: ConversationUser[] = [
  {
    email: 'sarah.khan@example.com', first_name: 'Sarah', last_name: 'Khan',
    conversation_count: 12, unanswered_count: 2, open_issue_count: 1,
    last_activity: '2026-07-17T14:20:00Z',
  },
  {
    email: 'omar.aziz@example.com', first_name: 'Omar', last_name: 'Aziz',
    conversation_count: 5, unanswered_count: 0, open_issue_count: 0,
    last_activity: '2026-07-16T09:10:00Z',
  },
  {
    email: 'lina.haddad@example.com', first_name: 'Lina', last_name: 'Haddad',
    conversation_count: 8, unanswered_count: 3, open_issue_count: 1,
    last_activity: '2026-07-18T02:05:00Z',
  },
];

export const userThreadsFixture: Record<string, UserConversationThread[]> = {
  'sarah.khan@example.com': [
    {
      external_chat_id: 'ch-2001', title: 'Rice cooking questions',
      email: 'sarah.khan@example.com', created_at: '2026-07-17T14:00:00Z',
      exchanges: [
        {
          external_conv_id: 'conv-2001a',
          question: 'How long should I cook basmati rice?',
          answer: 'Basmati rice typically cooks in 15–18 minutes using a 1:1.5 rice-to-water ratio.',
          sources: [{ content: 'Basmati cooking guide: rinse, soak 20 min, simmer 15-18 min.', metadata: { doc: 'cooking-guide.pdf' }, score: 0.91 }],
          reaction: { liked: true },
          created_at: '2026-07-17T14:00:05Z',
        },
        {
          external_conv_id: 'conv-2001b',
          question: 'Do you have a gluten-free rice noodle recipe?',
          answer: null,
          sources: [],
          reaction: null,
          created_at: '2026-07-17T14:20:00Z',
        },
      ],
      issue: null,
    },
    {
      external_chat_id: 'ch-2002', title: 'Order delivery delay',
      email: 'sarah.khan@example.com', created_at: '2026-07-15T11:00:00Z',
      exchanges: [
        {
          external_conv_id: 'conv-2002a',
          question: 'My order #4521 has not arrived, it is 3 days late.',
          answer: 'I\'m sorry about the delay. I\'ve flagged this for our support team to investigate.',
          sources: [],
          reaction: { disliked: true, comment: 'Still not resolved after this reply' },
          created_at: '2026-07-15T11:00:04Z',
        },
      ],
      issue: {
        category: 'ISSUES', sub_category: 'DELIVERY_DELAY',
        description: 'Order #4521 delayed by 3 days, customer wants updated ETA or refund.',
        resolution: null, resolved: false,
      },
    },
  ],
  'omar.aziz@example.com': [
    {
      external_chat_id: 'ch-2003', title: 'Product availability',
      email: 'omar.aziz@example.com', created_at: '2026-07-16T09:00:00Z',
      exchanges: [
        {
          external_conv_id: 'conv-2003a',
          question: 'Is the whole grain pasta available in the UAE stores?',
          answer: 'Yes, whole grain pasta is available in all UAE retail locations.',
          sources: [{ content: 'Product availability matrix: whole grain pasta — UAE: in stock.', metadata: { doc: 'availability.csv' }, score: 0.95 }],
          reaction: { liked: true },
          created_at: '2026-07-16T09:00:03Z',
        },
      ],
      issue: null,
    },
  ],
  'lina.haddad@example.com': [
    {
      external_chat_id: 'ch-2004', title: 'Recipe & allergy questions',
      email: 'lina.haddad@example.com', created_at: '2026-07-18T01:50:00Z',
      exchanges: [
        {
          external_conv_id: 'conv-2004a',
          question: 'Does the tomato sauce contain nuts?',
          answer: null,
          sources: [],
          reaction: null,
          created_at: '2026-07-18T01:50:05Z',
        },
        {
          external_conv_id: 'conv-2004b',
          question: 'What is the shelf life after opening?',
          answer: null,
          sources: [],
          reaction: null,
          created_at: '2026-07-18T01:55:00Z',
        },
        {
          external_conv_id: 'conv-2004c',
          question: 'Where can I find nutrition facts?',
          answer: 'Nutrition facts are printed on the back label and also on our website product page.',
          sources: [{ content: 'Nutrition facts are available on product pages under the Details tab.', metadata: { doc: 'faq.md' }, score: 0.82 }],
          reaction: null,
          created_at: '2026-07-18T02:05:00Z',
        },
      ],
      issue: {
        category: 'ISSUES', sub_category: 'PRODUCT_INFO_MISSING',
        description: 'Allergy information (nuts) not available in knowledge base for tomato sauce line.',
        resolution: 'Ingested updated allergen spec sheet from supplier on 2026-07-18; nut-free confirmed.',
        resolved: true,
      },
    },
  ],
};
