export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const DEMO_USER_EMAIL =
  import.meta.env.VITE_DEMO_USER_EMAIL ?? 'khalid.demo@govflow.ai';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'X-Demo-User-Email': DEMO_USER_EMAIL,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API error ${response.status}`;
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export interface HealthResponse {
  status: string;
  service: string;
  environment?: string;
  demoMode?: boolean;
  sandboxControls?: boolean;
  ai?: { provider: string; status: string };
  checks?: { database: string; redis: string; api?: string };
  timestamp?: string;
}

export function fetchHealth() {
  return apiGet<HealthResponse>('/health');
}
