// ============================================================================
// Extracts a human-readable message from a failed auth API response,
// regardless of shape. Handles FastAPI's standard {detail: "..."} /
// {detail: [{msg, loc}]}, and defensively also common Cognito-style
// {message: "..."} / {error: "..."} shapes, since the exact error format
// wasn't confirmed (only the success schemas were shared).
// ============================================================================

export async function extractAuthErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 429) return 'Too many attempts — please wait a moment and try again.'
  if (res.status === 401) return 'Incorrect email or password.'
  if (res.status === 409) return 'An account with this email already exists.'

  let body: any = null
  try {
    body = await res.json()
  } catch {
    // no JSON body — fall through to generic message below
  }

  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg
  if (typeof body?.message === 'string') return body.message
  if (typeof body?.error === 'string') return body.error

  return fallback
}
