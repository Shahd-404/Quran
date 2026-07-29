import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function productionSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return []
      return productionSourceFiles(fullPath)
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.(spec|test)\./.test(entry.name)) return []
    return [fullPath]
  })
}

const productionSource = productionSourceFiles('src')
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

describe('mobile-first UI system', () => {
  it('defines the restrained typography tokens', () => {
    const css = fs.readFileSync('src/app/globals.css', 'utf8')

    expect(css).toContain('font-size: 0.875rem')
    expect(css).toContain('font-weight: 400')
    expect(css).toContain('line-height: 1.75')
    expect(css).toContain('@apply text-xs font-medium tracking-wide')
    expect(css).toContain('@apply mt-2 text-2xl font-bold')
    expect(css).toContain("sm:text-[2rem]")
    expect(css).toContain("text-[1.0625rem] font-semibold")
    expect(css).toContain('text-sm font-semibold transition')
    expect(css).toContain('@apply block text-xs font-medium')
  })

  it('uses Lucide through tree-shakeable named imports without competing icon systems', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>
    }

    expect(packageJson.dependencies?.['lucide-react']).toBeDefined()
    expect(packageJson.dependencies?.['react-icons']).toBeUndefined()
    expect(packageJson.dependencies?.['@heroicons/react']).toBeUndefined()
    expect(packageJson.dependencies?.['@tabler/icons-react']).toBeUndefined()
    expect(packageJson.dependencies?.['phosphor-react']).toBeUndefined()
    expect(productionSource).toContain("from 'lucide-react'")
    expect(productionSource).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+['"]lucide-react['"]/)
    expect(productionSource).not.toMatch(/import\s+\w+\s+from\s+['"]lucide-react['"]/)
  })

  it('does not use emoji, decorative Unicode, or hand-authored SVG as UI icons', () => {
    expect(productionSource).not.toMatch(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u,
    )
    expect(productionSource).not.toMatch(/[✓✕✖×←→]/u)
    expect(productionSource).not.toContain('<svg')
  })
})
