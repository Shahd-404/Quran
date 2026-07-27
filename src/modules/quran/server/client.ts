import { Language } from '@quranjs/api'
import { createServerClient, ServerClient } from '@quranjs/api/server'
import { QuranConfigurationError } from './errors'

type QuranEnvironment = 'prelive' | 'production'

const SERVICES: Record<
  QuranEnvironment,
  { gatewayUrl: string; tokenHost: string }
> = {
  prelive: {
    gatewayUrl: 'https://apis-prelive.quran.foundation',
    tokenHost: 'https://prelive-oauth2.quran.foundation',
  },
  production: {
    gatewayUrl: 'https://apis.quran.foundation',
    tokenHost: 'https://oauth2.quran.foundation',
  },
}

let client: ServerClient | null = null

function getEnvironment(): QuranEnvironment {
  const environment = process.env.QF_ENV
  if (environment !== 'prelive' && environment !== 'production') {
    throw new QuranConfigurationError()
  }
  return environment
}

export function getQuranFoundationClient(): ServerClient {
  if (typeof window !== 'undefined') {
    throw new QuranConfigurationError()
  }
  if (client) return client

  const clientId = process.env.QF_CLIENT_ID?.trim()
  const clientSecret = process.env.QF_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new QuranConfigurationError()
  }

  client = createServerClient({
    clientId,
    clientSecret,
    defaults: { language: Language.ARABIC },
    services: SERVICES[getEnvironment()],
  })
  return client
}
