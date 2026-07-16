export const threadsFixture = [
  {
    id: 'th-1001',
    title: 'Rice cooking times',
    createdAt: '2026-07-10T08:00:00Z',
    messages: [
      { id: 'm-1', role: 'user', body: 'How long should I cook basmati rice?', createdAt: '2026-07-10T08:00:05Z' },
      { id: 'm-2', role: 'assistant', body: 'Basmati rice typically cooks in 15–18 minutes using a 1:1.5 rice-to-water ratio…', createdAt: '2026-07-10T08:00:09Z' },
    ],
  },
  {
    id: 'th-1002',
    title: 'Gluten free products',
    createdAt: '2026-07-12T10:30:00Z',
    messages: [],
  },
];

export const chatQuestionsFixture = [
  'What products are gluten free?',
  'How do I cook jasmine rice?',
  'Where can I buy RiceSelect products?',
];
