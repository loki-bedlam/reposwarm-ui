// All API calls go through the standalone RepoSwarm API server at /v1/*
// Auth: the HttpOnly cookie (reposwarm-ui-auth) set by Lambda@Edge is 
// sent automatically by the browser — no manual token handling needed.
//
// The API wraps responses in { data: ... }. We unwrap for UI compatibility.

const API_BASE = '/v1'

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, { ...options, headers })
  return response
}

// Helper that unwraps { data: T } responses from the API
export async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(err.error || `API error ${response.status}`)
  }
  const json = await response.json()
  // API wraps in { data: ... }, unwrap if present
  return json.data !== undefined ? json.data : json
}
