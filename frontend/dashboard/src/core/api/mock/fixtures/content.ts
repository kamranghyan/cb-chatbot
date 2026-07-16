import type { ContentItem } from '../../types';

export const contentFixture: ContentItem[] = [
  { external_uid: 'c-9001', title: 'Product FAQ.pdf', source_type: 'document', status: 'synced', brand: 'carolina', created_at: '2026-06-01T12:00:00Z' },
  { external_uid: 'c-9002', title: 'https://carolinarice.com/recipes', source_type: 'website', url: 'https://carolinarice.com/recipes', status: 'pending', brand: 'carolina', created_at: '2026-06-20T09:00:00Z' },
  { external_uid: 'c-9003', title: 'Cooking basics.mp4', source_type: 'video', status: 'synced', brand: 'minute', created_at: '2026-07-01T16:20:00Z' },
];
