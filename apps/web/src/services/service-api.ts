import { apiGet } from './api';

export interface ServiceListItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  description: string;
  isActive: boolean;
  status: string;
  estimatedSlaHours: number | null;
  baseFeeAed: number | null;
  requiredDocumentCount: number;
  requiredInformationCount: number;
  sandbox: boolean;
}

export interface ServiceRequirementDto {
  id: string;
  code: string;
  type: string;
  name: string;
  nameAr: string;
  description: string;
  required: boolean;
  dataType: string | null;
  documentType: string | null;
  displayOrder: number;
}

export function fetchServices(params?: {
  search?: string;
  category?: string;
  active?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.active !== undefined) query.set('active', String(params.active));
  const qs = query.toString();
  return apiGet<ServiceListItem[]>(`/services${qs ? `?${qs}` : ''}`);
}

export function fetchService(id: string) {
  return apiGet<ServiceListItem & { requirements: ServiceRequirementDto[] }>(
    `/services/${id}`,
  );
}

export function fetchServiceRequirements(serviceId: string) {
  return apiGet<ServiceRequirementDto[]>(`/services/${serviceId}/requirements`);
}
