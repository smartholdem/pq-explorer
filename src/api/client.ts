import type { ApiResponse } from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string, public path: string) {
    super(message)
  }
  get isNotFound() { return this.status === 404 }
}

export type Params = Record<string, string | number | boolean | undefined | null>

export class ApiClient {
  constructor(public readonly baseUrl: string, private timeoutMs = 90_000) {}

  url(path: string, params?: Params): string {
    const u = new URL(`${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`)
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v))
    })
    return u.toString()
  }

  async get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, params, undefined, signal)
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, undefined, body, signal)
  }

  private async request<T>(method: string, path: string, params?: Params, body?: unknown, signal?: AbortSignal) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs)
    signal?.addEventListener('abort', () => ctrl.abort())
    try {
      const res = await fetch(this.url(path, params), {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      })
      const text = await res.text()
      let json: any = null
      try { json = text ? JSON.parse(text) : null } catch { json = null }
      if (!res.ok) throw new ApiError(res.status, json?.message ?? json?.error ?? `HTTP ${res.status}`, path)
      return json as ApiResponse<T>
    } finally {
      clearTimeout(timer)
    }
  }
}
