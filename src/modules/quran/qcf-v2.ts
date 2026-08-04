export const FIRST_QURAN_PAGE = 1
export const LAST_QURAN_PAGE = 604
export const QCF_V2_MUSHAF_ID = 1 as const
export const QCF_V2_SCHEMA_VERSION = 1 as const
export const QCF_V2_MAX_LINE_NUMBER = 15

const QCF_NUMERIC_ENTITY = /&#(x[0-9a-f]+|[0-9]+);/giu

function isQcfGlyphCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xfb50 && codePoint <= 0xfdff) ||
    (codePoint >= 0xfe70 && codePoint <= 0xfeff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  )
}

export function isValidQuranPage(pageNumber: number): boolean {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= FIRST_QURAN_PAGE &&
    pageNumber <= LAST_QURAN_PAGE
  )
}

export function isSafeQcfV2GlyphMarkup(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false

  if (value.startsWith('&#')) {
    const entities = [...value.matchAll(QCF_NUMERIC_ENTITY)]
    if (entities.map((match) => match[0]).join('') !== value) return false
    return entities.every((match) => {
      const encoded = match[1]
      const codePoint = encoded.toLowerCase().startsWith('x')
        ? Number.parseInt(encoded.slice(1), 16)
        : Number.parseInt(encoded, 10)
      return isQcfGlyphCodePoint(codePoint)
    })
  }

  return [...value].every((character) =>
    isQcfGlyphCodePoint(character.codePointAt(0) ?? 0),
  )
}
