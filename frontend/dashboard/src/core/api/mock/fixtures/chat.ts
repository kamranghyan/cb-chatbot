export const chatListFixture = [
  { external_chat_id: 'ch-1001', title: 'Rice cooking times', created_at: '2026-07-10T08:00:00Z' },
  { external_chat_id: 'ch-1002', title: 'Gluten free products', created_at: '2026-07-12T10:30:00Z' },
];

export const chatDetailFixture: Record<string, any> = {
  'ch-1001': {
    external_chat_id: 'ch-1001',
    title: 'Rice cooking times',
    conversations: [
      {
        external_conv_id: 'conv-1',
        question: 'How long should I cook basmati rice?',
        answer: 'Basmati rice typically cooks in 15–18 minutes using a 1:1.5 rice-to-water ratio.',
        sources: [{ source_uid: 'src-1', title: 'Cooking Guide.pdf', score: 0.91 }],
        created_at: '2026-07-10T08:00:05Z',
      },
    ],
  },
};
