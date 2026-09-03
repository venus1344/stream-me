const KEY = 'beamcast_token'
const USER_KEY = 'beamcast_user'
const ROUTING_KEY = 'beamcast_routing'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ROUTING_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function getUser(): { id: string; email: string; role: string; tenantId?: string } | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setUser(user: { id: string; email: string; role: string; tenantId?: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export interface RoutingInfo {
  workerUrl: string | null
  omeUrl: string | null
  ingestUrl: string | null
  streamKey: string | null
}

export function setRouting(r: RoutingInfo): void {
  localStorage.setItem(ROUTING_KEY, JSON.stringify(r))
}

export function getRouting(): RoutingInfo | null {
  const raw = localStorage.getItem(ROUTING_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function getWorkerBase(): string {
  const r = getRouting()
  return r?.workerUrl ? r.workerUrl.replace(/\/+$/, '') : ''
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('session expired')
  }
  return res
}
