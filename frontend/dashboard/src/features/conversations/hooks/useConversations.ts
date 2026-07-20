'use client';

import { useQuery } from '@tanstack/react-query';
import { conversationsService } from '@/services';

export function useConversationUsers() {
  return useQuery({
    queryKey: ['admin', 'conversation-users'],
    queryFn: () => conversationsService.listConversationUsers().then((res) => res.data),
  });
}

export function useUserThreads(email: string | null) {
  return useQuery({
    queryKey: ['admin', 'conversation-users', email, 'threads'],
    queryFn: () => conversationsService.listUserThreads(email as string).then((res) => res.data),
    enabled: Boolean(email),
  });
}

export function useUnansweredQuestions() {
  return useQuery({
    queryKey: ['admin', 'unanswered-questions'],
    queryFn: () => conversationsService.listUnansweredQuestions().then((res) => res.data),
  });
}

export function useIssues() {
  return useQuery({
    queryKey: ['admin', 'issues'],
    queryFn: () => conversationsService.listIssues().then((res) => res.data),
  });
}
