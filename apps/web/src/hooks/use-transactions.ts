import { useQuery } from '@tanstack/react-query';
import {
  fetchTransaction,
  fetchTransactions,
  fetchReadiness,
} from '@/services/transaction-api';

export function useTransactions(params?: {
  search?: string;
  status?: string;
  serviceId?: string;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => fetchTransactions(params),
    staleTime: 15_000,
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => fetchTransaction(id!),
    enabled: Boolean(id),
  });
}

export function useReadiness(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id, 'readiness'],
    queryFn: () => fetchReadiness(id!),
    enabled: Boolean(id),
  });
}
