import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDemoStatus, resetDemoTransaction } from '@/services/demo-api';

export function useDemoStatus() {
  return useQuery({
    queryKey: ['demo', 'status'],
    queryFn: fetchDemoStatus,
    staleTime: 30_000,
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resetDemoTransaction(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['demo'] });
    },
  });
}
