export const analyticsSummaryFixture = {
  total_chats: 214,
  total_conversations: 4821,
  avg_response_time: 1.24,
  feedback: { likes: 3012, dislikes: 214 },
  ingestions_by_status: { COMPLETED: 38, PROCESSING: 2, FAILED: 1 },
  cached: false,
};

export const analyticsDailyFixture = [
  { day: '2026-07-10', conversations: 120, avg_response_time: 1.1 },
  { day: '2026-07-11', conversations: 145, avg_response_time: 1.2 },
  { day: '2026-07-12', conversations: 98, avg_response_time: 1.0 },
  { day: '2026-07-13', conversations: 176, avg_response_time: 1.3 },
  { day: '2026-07-14', conversations: 203, avg_response_time: 1.25 },
  { day: '2026-07-15', conversations: 189, avg_response_time: 1.15 },
  { day: '2026-07-16', conversations: 211, avg_response_time: 1.28 },
];
