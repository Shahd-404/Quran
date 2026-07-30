const LOCAL_DEVELOPMENT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
])

export function getTrustedSiteOrigin(
  configuredSiteUrl: string | undefined,
): string | null {
  const candidate = configuredSiteUrl?.trim()
  if (!candidate) return null

  try {
    const siteUrl = new URL(candidate)
    const isLocalDevelopmentHost = LOCAL_DEVELOPMENT_HOSTS.has(
      siteUrl.hostname,
    )

    if (
      siteUrl.username ||
      siteUrl.password ||
      (siteUrl.protocol !== 'https:' &&
        !(siteUrl.protocol === 'http:' && isLocalDevelopmentHost))
    ) {
      return null
    }

    return siteUrl.origin
  } catch {
    return null
  }
}

export function getTrustedAppUrl(
  pathname: `/${string}`,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  const siteOrigin = getTrustedSiteOrigin(configuredSiteUrl)
  return siteOrigin ? new URL(pathname, siteOrigin).toString() : null
}
