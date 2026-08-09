import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '@/services/api';

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: 1,
    refetchInterval: 60_000,
  });
}
