import { describe, expect, it } from 'vitest'
import { isSafeQcfV2GlyphMarkup } from '../qcf-v2'

describe('QCF V2 glyph validation', () => {
  it('accepts official presentation-form glyphs in literal and entity forms', () => {
    expect(isSafeQcfV2GlyphMarkup('ﱁ')).toBe(true)
    expect(isSafeQcfV2GlyphMarkup('&#xfb51;')).toBe(true)
    expect(isSafeQcfV2GlyphMarkup('&#xFC41;')).toBe(true)
  })

  it('rejects markup, ordinary text, and non-QCF entities', () => {
    expect(isSafeQcfV2GlyphMarkup('<span>ﱁ</span>')).toBe(false)
    expect(isSafeQcfV2GlyphMarkup('قرآن')).toBe(false)
    expect(isSafeQcfV2GlyphMarkup('&#60;')).toBe(false)
  })
})
