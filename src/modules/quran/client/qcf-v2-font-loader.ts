import { isValidQuranPage } from '../qcf-v2'

export const QCF_V2_FONT_CDN_BASE =
  'https://verses.quran.foundation/fonts/quran/hafs'
export const QCF_V2_UNICODE_FONT_FAMILY = 'WirdUthmanicHafs'

const pageFontPromises = new Map<number, Promise<string>>()
let unicodeFontPromise: Promise<string> | null = null

function fontEnvironment(): {
  FontFaceConstructor: typeof FontFace
  fontSet: FontFaceSet
} {
  if (
    typeof FontFace === 'undefined' ||
    typeof document === 'undefined' ||
    !document.fonts
  ) {
    throw new Error('QCF_FONT_API_UNAVAILABLE')
  }
  return { FontFaceConstructor: FontFace, fontSet: document.fonts }
}

function loadFont(
  family: string,
  url: string,
): Promise<string> {
  return Promise.resolve().then(async () => {
    const { FontFaceConstructor, fontSet } = fontEnvironment()
    const fontFace = new FontFaceConstructor(
      family,
      `url("${url}") format("woff2")`,
      { display: 'block' },
    )
    const loadedFont = await fontFace.load()
    fontSet.add(loadedFont)
    return family
  })
}

export function getQcfV2PageFontFamily(pageNumber: number): string {
  if (!isValidQuranPage(pageNumber)) throw new Error('QCF_INVALID_PAGE')
  return `p${pageNumber}-v2`
}

export function getQcfV2PageFontUrl(pageNumber: number): string {
  if (!isValidQuranPage(pageNumber)) throw new Error('QCF_INVALID_PAGE')
  return `${QCF_V2_FONT_CDN_BASE}/v2/woff2/p${pageNumber}.woff2`
}

export function getQcfV2UnicodeFontUrl(): string {
  return `${QCF_V2_FONT_CDN_BASE}/uthmanic_hafs/UthmanicHafs1Ver18.woff2`
}

export function loadQcfV2PageFont(pageNumber: number): Promise<string> {
  const cached = pageFontPromises.get(pageNumber)
  if (cached) return cached

  const promise = loadFont(
    getQcfV2PageFontFamily(pageNumber),
    getQcfV2PageFontUrl(pageNumber),
  )
  const handledPromise = promise.catch((error) => {
    if (pageFontPromises.get(pageNumber) === handledPromise) {
      pageFontPromises.delete(pageNumber)
    }
    throw error
  })
  pageFontPromises.set(pageNumber, handledPromise)

  return handledPromise
}

export function loadQcfV2UnicodeFont(): Promise<string> {
  if (!unicodeFontPromise) {
    unicodeFontPromise = loadFont(
      QCF_V2_UNICODE_FONT_FAMILY,
      getQcfV2UnicodeFontUrl(),
    )
  }
  return unicodeFontPromise
}

export async function loadQcfV2FontsForPage(
  pageNumber: number,
): Promise<void> {
  await Promise.all([
    loadQcfV2PageFont(pageNumber),
    loadQcfV2UnicodeFont(),
  ])
}
