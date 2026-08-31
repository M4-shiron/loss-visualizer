import { describe, expect, it } from 'vitest'
import { createEmptyData } from '../schema'
import { validateStoredData } from '../validate'

/** `createEmptyData()` の`settings`へ、指定した内容を上書きしたデータを作る。 */
function withSettings(overrides: Record<string, unknown>): unknown {
  const base = createEmptyData()
  return { ...base, settings: { ...base.settings, ...overrides } }
}

describe('validateStoredData: hourlyWage（改善方針3で追加した任意項目）', () => {
  it('hourlyWageが無くても有効（未登録として許容する）', () => {
    expect(validateStoredData(createEmptyData())).toBe(true)
  })

  it('正の数値なら有効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: 1200 }))).toBe(true)
  })

  it('0は無効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: 0 }))).toBe(false)
  })

  it('負の数値は無効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: -100 }))).toBe(false)
  })

  it('文字列は無効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: '1200' }))).toBe(false)
  })

  it('NaNは無効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: Number.NaN }))).toBe(false)
  })

  it('Infinityは無効', () => {
    expect(validateStoredData(withSettings({ hourlyWage: Number.POSITIVE_INFINITY }))).toBe(false)
  })
})
