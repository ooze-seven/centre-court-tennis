export class BookError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function bookError(error: unknown): BookError | null {
  return error instanceof BookError ? error : null
}

export async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const key = process.env.SUPABASE_SECRET_KEY ?? ''
  if (!url || !key) throw new BookError('Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env', 500, 'config')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const body: unknown = text ? JSON.parse(text) : null
  if (!response.ok) {
    const record = isRecord(body) ? body : {}
    const message = typeof record.message === 'string' ? record.message : 'The book did not answer.'
    const code = typeof record.code === 'string' ? record.code : ''
    throw new BookError(message, response.status, code)
  }
  return body as T
}

export async function bookReady() {
  try {
    await rest('users?select=id&limit=1')
    return true
  } catch (error) {
    if (bookError(error)?.code === 'PGRST205') return false
    throw error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
