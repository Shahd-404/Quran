import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getQcfV2PageFontFamily,
  getQcfV2PageFontUrl,
  loadQcfV2FontsForPage,
  loadQcfV2PageFont,
} from './qcf-v2-font-loader'

class MockFontFace {
  static loadShouldFailFor = new Set<string>()

  constructor(
    readonly family: string,
    readonly source: string,
    readonly descriptors?: FontFaceDescriptors,
  ) {}

  async load(): Promise<MockFontFace> {
    if (MockFontFace.loadShouldFailFor.has(this.family)) {
      throw new Error('font unavailable')
    }
    return this
  }
}

function installFontApi() {
  const add = vi.fn()
  const Constructor = vi.fn(
    (family: string, source: string, descriptors?: FontFaceDescriptors) =>
      new MockFontFace(family, source, descriptors),
  )
  vi.stubGlobal('FontFace', Constructor)
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { add },
  })
  return { add, Constructor }
}

describe('QCF V2 page-font loader', () => {
  afterEach(() => {
    MockFontFace.loadShouldFailFor.clear()
    vi.unstubAllGlobals()
  })

  it('uses the official deterministic page-specific font contract', () => {
    expect(getQcfV2PageFontFamily(80)).toBe('p80-v2')
    expect(getQcfV2PageFontUrl(80)).toBe(
      'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p80.woff2',
    )
    expect(() => getQcfV2PageFontUrl(0)).toThrow('QCF_INVALID_PAGE')
    expect(() => getQcfV2PageFontUrl(605)).toThrow('QCF_INVALID_PAGE')
  })

  it('loads a page font once and reuses the same cached promise', async () => {
    const { add, Constructor } = installFontApi()

    const first = loadQcfV2PageFont(80)
    const second = loadQcfV2PageFont(80)

    expect(first).toBe(second)
    await expect(first).resolves.toBe('p80-v2')
    expect(Constructor).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('loads the page font and the official Unicode marker font together', async () => {
    const { Constructor } = installFontApi()

    await loadQcfV2FontsForPage(81)

    expect(Constructor.mock.calls.map(([family]) => family)).toEqual([
      'p81-v2',
      'WirdUthmanicHafs',
    ])
  })

  it('generates exact page font family names for low page numbers', () => {
    expect(getQcfV2PageFontFamily(1)).toBe('p1-v2')
    expect(getQcfV2PageFontFamily(22)).toBe('p22-v2')
  })

  it('removes a failed promise and retries a fresh font load on subsequent calls', async () => {
    const { add, Constructor } = installFontApi()
    MockFontFace.loadShouldFailFor.add('p82-v2')

    const first = loadQcfV2PageFont(82)
    const second = loadQcfV2PageFont(82)

    expect(first).toBe(second)
    await expect(first).rejects.toThrow('font unavailable')
    await expect(second).rejects.toThrow('font unavailable')
    expect(Constructor).toHaveBeenCalledTimes(1)

    MockFontFace.loadShouldFailFor.delete('p82-v2')
    const retry = loadQcfV2PageFont(82)

    await expect(retry).resolves.toBe('p82-v2')
    expect(Constructor).toHaveBeenCalledTimes(2)
    expect(add).toHaveBeenCalledTimes(1)
  })
})
