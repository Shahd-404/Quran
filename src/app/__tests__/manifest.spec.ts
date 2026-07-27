import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import manifest from '../manifest'

describe('PWA manifest', () => {
  it('contains installable Arabic RTL metadata', () => {
    expect(manifest()).toMatchObject({
      name: 'ورد — رفيقك للورد اليومي',
      short_name: 'ورد',
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      dir: 'rtl',
      lang: 'ar',
    })
  })
  it('references only existing local icons', () => {
    for (const icon of manifest().icons ?? []) {
      expect(icon.src.startsWith('/')).toBe(true)
      expect(fs.existsSync(path.join(process.cwd(), 'public', icon.src))).toBe(true)
    }
  })
})
