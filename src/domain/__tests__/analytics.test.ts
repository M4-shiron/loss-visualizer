import { describe, expect, it } from 'vitest'
import type { Decision, ValueItem } from '../../types/domain'
import {
  categoryBreakdown,
  monthKeyOf,
  previousMonthSavings,
  previousWeekSavings,
  savingsByMonth,
  startOfWeek,
  valueItemProgress,
  weekKey,
} from '../analytics'

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

describe('月別の確定節約額（savingsByMonth）', () => {
  it('判断が0件でも、指定した月数ぶん0円で埋める', () => {
    const now = new Date(2026, 7, 15) // 2026-08-15 ローカル
    const result = savingsByMonth([], now, 6)
    expect(result).toHaveLength(6)
    expect(result.every((r) => r.amount === 0)).toBe(true)
    expect(result.map((r) => r.label)).toEqual(['3月', '4月', '5月', '6月', '7月', '8月'])
  })

  it('今月を含む直近6か月ぶんを、古い月→新しい月の順で返す', () => {
    const now = new Date(2026, 0, 10) // 2026-01-10（年をまたぐケース）
    const result = savingsByMonth([], now, 6)
    expect(result.map((r) => `${r.year}-${r.month}`)).toEqual([
      '2025-7',
      '2025-8',
      '2025-9',
      '2025-10',
      '2025-11',
      '2026-0',
    ])
  })

  it('「やめる」の金額だけを、確定日（resolvedAt優先）の月に集計する', () => {
    const now = new Date(2026, 7, 15)
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', amount: 300, outcome: 'skipped', createdAt: '2026-08-01T00:00:00.000Z' }),
      makeDecision({ id: 'd2', amount: 500, outcome: 'purchased', createdAt: '2026-08-05T00:00:00.000Z' }),
      makeDecision({
        id: 'd3',
        amount: 200,
        outcome: 'skipped',
        createdAt: '2026-07-01T00:00:00.000Z',
        resolvedAt: '2026-08-02T00:00:00.000Z',
      }),
    ]
    const result = savingsByMonth(decisions, now, 6)
    const august = result.find((r) => r.year === 2026 && r.month === 7)
    expect(august?.amount).toBe(500) // 300(d1) + 200(d3、resolvedAtの月)
  })

  it('6か月の範囲外の判断は集計に含めない', () => {
    const now = new Date(2026, 7, 15)
    const decisions: Decision[] = [
      makeDecision({ id: 'old', amount: 9999, createdAt: '2025-01-01T00:00:00.000Z' }),
    ]
    const result = savingsByMonth(decisions, now, 6)
    expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(0)
  })
})

describe('カテゴリ別の内訳（categoryBreakdown）', () => {
  it('判断が0件なら空配列を返す', () => {
    expect(categoryBreakdown([])).toEqual([])
  })

  it('確定節約額・保留額・件数を正しく集計する', () => {
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', categoryId: 'convenience', amount: 200, outcome: 'skipped' }),
      makeDecision({ id: 'd2', categoryId: 'convenience', amount: 300, outcome: 'skipped' }),
      makeDecision({ id: 'd3', categoryId: 'convenience', amount: 400, outcome: 'purchased' }),
      makeDecision({ id: 'd4', categoryId: 'hobby', amount: 1000, outcome: 'pending' }),
    ]
    const result = categoryBreakdown(decisions)
    const convenience = result.find((r) => r.categoryId === 'convenience')
    expect(convenience).toMatchObject({ confirmedAmount: 500, pendingAmountValue: 0, count: 3 })
    const hobby = result.find((r) => r.categoryId === 'hobby')
    expect(hobby).toMatchObject({ confirmedAmount: 0, pendingAmountValue: 1000, count: 1 })
  })

  it('確定節約額の多い順に並ぶ', () => {
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', categoryId: 'convenience', amount: 100, outcome: 'skipped' }),
      makeDecision({ id: 'd2', categoryId: 'hobby', amount: 900, outcome: 'skipped' }),
      makeDecision({ id: 'd3', categoryId: 'fashion', amount: 500, outcome: 'skipped' }),
    ]
    const result = categoryBreakdown(decisions)
    expect(result.map((r) => r.categoryId)).toEqual(['hobby', 'fashion', 'convenience'])
  })

  it('一度も使われていないカテゴリは含めない', () => {
    const decisions: Decision[] = [makeDecision({ id: 'd1', categoryId: 'convenience' })]
    const result = categoryBreakdown(decisions)
    expect(result).toHaveLength(1)
    expect(result[0].categoryId).toBe('convenience')
  })

  it('アーカイブ済みの保留は保留額に含めない', () => {
    const decisions: Decision[] = [
      makeDecision({
        id: 'd1',
        categoryId: 'convenience',
        amount: 500,
        outcome: 'pending',
        archivedAt: '2026-08-10T00:00:00.000Z',
      }),
    ]
    const result = categoryBreakdown(decisions)
    expect(result[0].pendingAmountValue).toBe(0)
    expect(result[0].count).toBe(1)
  })
})

describe('価値尺度への到達度（valueItemProgress）', () => {
  function makeValueItem(overrides: Partial<ValueItem> = {}): ValueItem {
    return { id: 'v1', name: '焼肉', price: 4000, createdAt: '2026-08-01T00:00:00.000Z', ...overrides }
  }

  it('価値尺度が0件なら空配列を返す', () => {
    expect(valueItemProgress([], 10000)).toEqual([])
  })

  it('累計節約額が価格の何倍かを計算する', () => {
    const result = valueItemProgress([makeValueItem({ price: 4000 })], 9000)
    expect(result[0].multiplier).toBe(2.3) // 9000 / 4000 = 2.25 → 小数第1位に丸め
  })

  it('累計節約額が0円なら倍率も0になる', () => {
    const result = valueItemProgress([makeValueItem({ price: 4000 })], 0)
    expect(result[0].multiplier).toBe(0)
  })

  it('複数の価値尺度をそれぞれ計算する', () => {
    const result = valueItemProgress(
      [makeValueItem({ id: 'v1', price: 4000 }), makeValueItem({ id: 'v2', price: 1000 })],
      2000,
    )
    expect(result.find((r) => r.item.id === 'v1')?.multiplier).toBe(0.5)
    expect(result.find((r) => r.item.id === 'v2')?.multiplier).toBe(2)
  })
})

describe('週の開始日（startOfWeek, weekKey）', () => {
  it('週の開始日は常に月曜日になる', () => {
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(2026, 7, 1 + offset)
      expect(startOfWeek(date).getDay()).toBe(1)
    }
  })

  it('同じ週内の日付はすべて同じweekKeyになる', () => {
    const base = new Date(2026, 7, 26)
    const start = startOfWeek(base)
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
      expect(weekKey(date)).toBe(weekKey(base))
    }
  })

  it('週をまたぐとweekKeyが変わる', () => {
    const base = new Date(2026, 7, 26)
    const start = startOfWeek(base)
    const nextWeek = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    expect(weekKey(nextWeek)).not.toBe(weekKey(base))
  })
})

describe('monthKeyOf', () => {
  it('YYYY-MM形式（月は2桁）で返す', () => {
    expect(monthKeyOf(new Date(2026, 0, 15))).toBe('2026-01')
    expect(monthKeyOf(new Date(2026, 10, 1))).toBe('2026-11')
  })
})

describe('先週の確定節約額（previousWeekSavings）', () => {
  it('今週分は含めず、先週分だけを合計する', () => {
    const now = new Date(2026, 7, 26)
    const thisWeekStart = startOfWeek(now)
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', amount: 300, outcome: 'skipped', createdAt: thisWeekStart.toISOString() }),
      makeDecision({
        id: 'd2',
        amount: 500,
        outcome: 'skipped',
        createdAt: new Date(
          thisWeekStart.getFullYear(),
          thisWeekStart.getMonth(),
          thisWeekStart.getDate() - 3,
        ).toISOString(),
      }),
      makeDecision({
        id: 'd3',
        amount: 700,
        outcome: 'skipped',
        createdAt: new Date(
          thisWeekStart.getFullYear(),
          thisWeekStart.getMonth(),
          thisWeekStart.getDate() - 8,
        ).toISOString(),
      }),
    ]
    expect(previousWeekSavings(decisions, now)).toBe(500)
  })

  it('「買う」「保留」は含めない', () => {
    const now = new Date(2026, 7, 26)
    const thisWeekStart = startOfWeek(now)
    const lastWeekDate = new Date(
      thisWeekStart.getFullYear(),
      thisWeekStart.getMonth(),
      thisWeekStart.getDate() - 2,
    )
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', amount: 300, outcome: 'purchased', createdAt: lastWeekDate.toISOString() }),
      makeDecision({ id: 'd2', amount: 400, outcome: 'pending', createdAt: lastWeekDate.toISOString() }),
    ]
    expect(previousWeekSavings(decisions, now)).toBe(0)
  })
})

describe('先月の確定節約額（previousMonthSavings）', () => {
  it('今月分は含めず、先月分だけを合計する', () => {
    const now = new Date(2026, 7, 15)
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', amount: 300, outcome: 'skipped', createdAt: '2026-08-01T00:00:00.000Z' }),
      makeDecision({ id: 'd2', amount: 500, outcome: 'skipped', createdAt: '2026-07-15T00:00:00.000Z' }),
      makeDecision({ id: 'd3', amount: 700, outcome: 'skipped', createdAt: '2026-06-15T00:00:00.000Z' }),
    ]
    expect(previousMonthSavings(decisions, now)).toBe(500)
  })

  it('年をまたぐ場合も正しく先月を計算する', () => {
    const now = new Date(2026, 0, 10)
    const decisions: Decision[] = [
      makeDecision({ id: 'd1', amount: 900, outcome: 'skipped', createdAt: '2025-12-20T00:00:00.000Z' }),
    ]
    expect(previousMonthSavings(decisions, now)).toBe(900)
  })
})
