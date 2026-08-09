import { useQuery } from '@tanstack/react-query';
import { fetchServices, fetchService } from '@/services/service-api';

export function useServices(params?: {
  search?: string;
  category?: string;
  active?: boolean;
}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => fetchServices(params),
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => fetchService(id!),
    enabled: Boolean(id),
  });
}
