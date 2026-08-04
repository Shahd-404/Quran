import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const globalStyles = fs.readFileSync('src/app/globals.css', 'utf8')

describe('QCF Mushaf responsive layout contract', () => {
  it('scales one 15-line page composition without allowing word reflow', () => {
    expect(globalStyles).toContain(
      'grid-template-rows: repeat(15, minmax(0, 1fr))',
    )
    expect(globalStyles).toContain('container-type: inline-size')
    expect(globalStyles).toContain('white-space: nowrap')
    expect(globalStyles).toContain('overflow: hidden')
    expect(globalStyles).toContain('font-size: 4.05cqw')
  })
})
