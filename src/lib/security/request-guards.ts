export type MutationGuardError = 'CROSS_ORIGIN_REQUEST' | 'JSON_REQUIRED' | 'REQUEST_TOO_LARGE'

export function validateMutationRequest(
  request: Request,
  options: { requireJson?: boolean; maxBytes?: number } = {},
): MutationGuardError | null {
  const expectedOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if ((origin && origin !== expectedOrigin) || fetchSite === 'cross-site') {
    return 'CROSS_ORIGIN_REQUEST'
  }

  const maxBytes = options.maxBytes ?? 16_384
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > maxBytes) return 'REQUEST_TOO_LARGE'

  if (options.requireJson) {
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
    if (contentType !== 'application/json') return 'JSON_REQUIRED'
  }
  return null
}


export function mutationGuardResponse(
  request: Request,
  options: { requireJson?: boolean; maxBytes?: number } = {},
): Response | null {
  const error = validateMutationRequest(request, options)
  if (!error) return null
  const status = error === 'CROSS_ORIGIN_REQUEST' ? 403 : error === 'REQUEST_TOO_LARGE' ? 413 : 415
  return Response.json({ success: false, code: error }, { status })
}
