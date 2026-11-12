/**
 * Browser-side calls to /api/audio. Mutations carry the session's CSRF token.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

let csrfToken: Promise<string> | null = null

async function csrf(fresh = false): Promise<string> {
  if (!csrfToken || fresh) {
    csrfToken = fetch('/api/csrf-token', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { csrfToken: '' }))
      .then((data) => String(data.csrfToken ?? ''))
      .catch(() => '')
  }
  return csrfToken
}

const FALLBACK: Record<number, string> = {
  401: 'Your session ended. Sign in again.',
  403: 'Your session expired. Reload the page and try again.',
  404: 'That is no longer there.',
  429: 'Too many requests. Wait a moment and try again.',
}

async function parse(res: Response): Promise<any> {
  const data = await res.json().catch(() => null)
  if (res.ok) return data
  throw new ApiError(
    res.status,
    String(data?.error ?? `http_${res.status}`),
    String(data?.message ?? FALLBACK[res.status] ?? 'Something went wrong. Try again.')
  )
}

export async function apiGet<T = any>(url: string): Promise<T> {
  return parse(await fetch(url, { cache: 'no-store' }))
}

export async function apiSend<T = any>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
  const send = async (token: string) =>
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  let res = await send(await csrf())
  if (res.status === 403) {
    // The token is tied to the session cookie; a fresh sign-in rotates it.
    const data = await res.clone().json().catch(() => null)
    if (data?.error === 'invalid_csrf') res = await send(await csrf(true))
  }
  return parse(res)
}

/**
 * PUT a file to a one-time storage URL, reporting progress as 0..1.
 * Returns an abort function through `onAbortable`.
 */
export function putFile(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
  onAbortable?: (abort: () => void) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('content-type', contentType)
    xhr.setRequestHeader('cache-control', 'max-age=3600')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      const tooLarge = xhr.status === 413
      reject(new ApiError(xhr.status, 'upload_failed', tooLarge ? 'That file is too large.' : 'The upload was refused. Try again.'))
    }
    xhr.onerror = () => reject(new ApiError(0, 'network', 'The upload was interrupted. Check your connection and try again.'))
    xhr.onabort = () => reject(new ApiError(0, 'aborted', 'Upload cancelled.'))
    onAbortable?.(() => xhr.abort())
    xhr.send(file)
  })
}
