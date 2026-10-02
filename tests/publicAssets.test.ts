import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest はプロジェクト直下で実行される
const root = process.cwd()
const publicDir = resolve(root, 'public')

type Manifest = { name: string; start_url: string; display: string; icons: { src: string; sizes: string }[] }

describe('公開用の静的ファイル', () => {
  const manifest = JSON.parse(readFileSync(resolve(publicDir, 'manifest.webmanifest'), 'utf-8')) as Manifest

  it('マニフェストが参照するアイコンがすべて存在する', () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(publicDir, icon.src.replace(/^\//, ''))), icon.src).toBe(true)
    }
  })

  it('ホーム画面から単独のアプリとして開く設定になっている', () => {
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })

  it('index.html が参照する公開ファイルがすべて存在する', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf-8')
    const refs = [...html.matchAll(/(?:href|content)="(\/[^"/][^"]*\.(?:png|svg|webmanifest))"/g)].map((m) => m[1])
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      expect(existsSync(resolve(publicDir, ref.slice(1))), ref).toBe(true)
    }
  })
})
