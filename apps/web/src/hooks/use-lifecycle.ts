import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmReview,
  createPayment,
  fetchMonitor,
  fetchNotifications,
  fetchPayment,
  fetchReview,
  processPayment,
  sandboxAdvance,
  submitTransaction,
} from '@/services/lifecycle-api';

export function useReview(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id, 'review'],
    queryFn: () => fetchReview(id!),
    enabled: Boolean(id),
  });
}

export function useConfirmReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmReview(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['transactions', id] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id, 'payment'],
    queryFn: () => fetchPayment(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => createPayment(id),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['transactions', id] });
    },
  });
}

export function useProcessPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      outcome,
    }: {
      id: string;
      outcome: 'SUCCESS' | 'FAILURE';
    }) => processPayment(id, outcome),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['transactions', vars.id] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSubmitTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitTransaction(id),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['transactions', id] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMonitor(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id, 'monitor'],
    queryFn: () => fetchMonitor(id!),
    enabled: Boolean(id),
  });
}

export function useSandboxAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sandboxAdvance(id),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['transactions', id] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });
}
