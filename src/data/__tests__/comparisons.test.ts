import { describe, expect, it } from 'vitest'
import { GENERAL_COMPARISONS } from '../comparisons'

describe('seed/general_comparisons.json の読み込み', () => {
  it('仕様の目安件数（50〜100件）の範囲内にある', () => {
    expect(GENERAL_COMPARISONS.length).toBeGreaterThanOrEqual(50)
    expect(GENERAL_COMPARISONS.length).toBeLessThanOrEqual(100)
  })

  it('すべての項目が id・name・price(正の数)・category・unit を持つ', () => {
    for (const item of GENERAL_COMPARISONS) {
      expect(typeof item.id).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(item.price).toBeGreaterThan(0)
      expect(typeof item.category).toBe('string')
      expect(item.unit.length).toBeGreaterThan(0)
    }
  })

  it('id が重複していない', () => {
    const ids = GENERAL_COMPARISONS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
