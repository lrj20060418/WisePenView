function normalizeBaseUrl(value: string): string {
  return `${value.trim().replace(/\/+$/, '')}/`;
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
}
