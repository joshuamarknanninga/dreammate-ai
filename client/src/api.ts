const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function api(path: string, { method = 'GET', token, body }: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {};
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}
