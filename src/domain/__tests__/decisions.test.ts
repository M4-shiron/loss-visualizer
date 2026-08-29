import { describe, expect, it } from 'vitest'
import type { Decision } from '../../types/domain'
import {
  monthlyConfirmedSavings,
  monthlySkipCount,
  pendingAmount,
  totalConfirmedSavings,
  totalSkipCount,
} from '../decisions'

function makeDecision(overrides: Partial<Decision>): Decision {
  return {
    id: 'd',
    amount: 100,
    categoryId: 'convenience',
    outcome: 'skipped',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('確定節約額の集計', () => {
  it('判断が0件のとき、すべて0になる', () => {
    const now = new Date('2026-08-29T00:00:00.000Z')
    expect(totalConfirmedSavings([])).toBe(0)
    expect(monthlyConfirmedSavings([], now)).toBe(0)
    expect(totalSkipCount([])).toBe(0)
    expect(monthlySkipCount([], now)).toBe(0)
    expect(pendingAmount([])).toBe(0)
  })

  it('「やめる」の金額だけを合計し、「買う」は含めない', () => {
    const decisions = [
      makeDecision({ id: 'd1', amount: 180, outcome: 'skipped' }),
      makeDecision({ id: 'd2', amount: 500, outcome: 'purchased' }),
      makeDecision({ id: 'd3', amount: 300, outcome: 'skipped' }),
    ]
    expect(totalConfirmedSavings(decisions)).toBe(480)
    expect(totalSkipCount(decisions)).toBe(2)
  })

  it('保留中の金額は確定節約額に含めない', () => {
    const decisions = [
      makeDecision({ id: 'd1', amount: 180, outcome: 'skipped' }),
      makeDecision({ id: 'd2', amount: 1000, outcome: 'pending' }),
    ]
    expect(totalConfirmedSavings(decisions)).toBe(180)
    expect(pendingAmount(decisions)).toBe(1000)
  })

  it('アーカイブ済みの保留は保留額にも確定節約額にも含めない', () => {
    const decisions = [
      makeDecision({
        id: 'd1',
        amount: 1000,
        outcome: 'pending',
        archivedAt: '2026-08-03T00:00:00.000Z',
      }),
    ]
    expect(pendingAmount(decisions)).toBe(0)
    expect(totalConfirmedSavings(decisions)).toBe(0)
  })

  it('月替わりの境界: 今月のもののみ月次集計に含める（端末のローカル時刻で判定する）', () => {
    // 集計は端末のローカル時刻で月を判定する（getFullYear/getMonthを使用）ため、
    // 境界のずれを避けるにはローカル時刻でDateを組み立てる。
    const now = new Date(2026, 7, 29, 12, 0, 0) // 2026-08-29 12:00 ローカル
    const decisions = [
      makeDecision({ id: 'd1', amount: 100, createdAt: new Date(2026, 7, 1, 0, 0, 0).toISOString() }),
      makeDecision({ id: 'd2', amount: 200, createdAt: new Date(2026, 6, 31, 23, 59, 59).toISOString() }),
      makeDecision({ id: 'd3', amount: 300, createdAt: new Date(2026, 8, 1, 0, 0, 0).toISOString() }),
    ]
    expect(monthlyConfirmedSavings(decisions, now)).toBe(100)
    expect(monthlySkipCount(decisions, now)).toBe(1)
    expect(totalConfirmedSavings(decisions)).toBe(600)
  })

  it('保留から確定した判断は resolvedAt を基準に月を判定する', () => {
    const now = new Date('2026-08-29T00:00:00.000Z')
    const decisions = [
      makeDecision({
        id: 'd1',
        amount: 500,
        outcome: 'skipped',
        createdAt: '2026-07-30T00:00:00.000Z',
        resolvedAt: '2026-08-01T00:00:00.000Z',
      }),
    ]
    expect(monthlyConfirmedSavings(decisions, now)).toBe(500)
    expect(totalConfirmedSavings(decisions)).toBe(500)
  })
})
