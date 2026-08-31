import { vi } from 'vitest'

/**
 * jsdomは`window.matchMedia`を実装していない。OSの「視差効果を減らす」設定が
 * 有効な環境（`prefers-reduced-motion: reduce`）を再現するためのテスト用スタブ。
 *
 * 後片付けは呼び出し側で `vi.unstubAllGlobals()` を行う。
 */
export function stubPrefersReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}
