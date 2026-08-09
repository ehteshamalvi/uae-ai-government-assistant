import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyzeIntent } from '@/services/intent-api';
import {
  createTransaction,
  fetchWorkspace,
  prepareTransaction,
  analyzeDocument,
} from '@/services/workspace-api';

export function useAnalyzeIntent() {
  return useMutation({
    mutationFn: (message: string) => analyzeIntent(message),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id, 'workspace'],
    queryFn: () => fetchWorkspace(id!),
    enabled: Boolean(id),
  });
}

export function usePrepareTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prepareTransaction(id),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({
        queryKey: ['transactions', data.referenceCode],
      });
      void qc.invalidateQueries({
        queryKey: ['transactions', data.transactionId],
      });
    },
  });
}

export function useAnalyzeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => analyzeDocument(documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
