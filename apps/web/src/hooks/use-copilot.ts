import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCopilotSession,
  fetchCopilotSession,
  listCopilotSessions,
  sendCopilotMessage,
} from '@/services/copilot-api';

export function useCopilotSessions() {
  return useQuery({
    queryKey: ['copilot', 'sessions'],
    queryFn: listCopilotSessions,
  });
}

export function useCopilotSession(id: string | undefined) {
  return useQuery({
    queryKey: ['copilot', 'sessions', id],
    queryFn: () => fetchCopilotSession(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCopilotSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCopilotSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['copilot', 'sessions'] });
    },
  });
}

export function useSendCopilotMessage(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; documentId?: string }) =>
      sendCopilotMessage(sessionId!, input.content, input.documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['copilot', 'sessions', sessionId] });
      void qc.invalidateQueries({ queryKey: ['copilot', 'sessions'] });
    },
  });
}
