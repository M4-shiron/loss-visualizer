import { describe, expect, it } from 'vitest'
import type { Goal } from '../../types/domain'
import { findPriorityGoal, goalProgressPercent } from '../goals'

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: 'g',
    title: '旅行資金',
    targetAmount: 50000,
    isPriority: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('節約目標の進捗', () => {
  it('累計節約額0円のとき0%', () => {
    expect(goalProgressPercent(makeGoal({ targetAmount: 50000 }), 0)).toBe(0)
  })

  it('目標の32%相当のとき32%になる', () => {
    expect(goalProgressPercent(makeGoal({ targetAmount: 50000 }), 16000)).toBe(32)
  })

  it('目標額を超えても100%で頭打ちにする', () => {
    expect(goalProgressPercent(makeGoal({ targetAmount: 50000 }), 80000)).toBe(100)
  })

  it('目標額が0円の場合は0%として扱う（ゼロ除算を避ける）', () => {
    expect(goalProgressPercent(makeGoal({ targetAmount: 0 }), 1000)).toBe(0)
  })

  it('findPriorityGoal: isPriorityがtrueの目標を返す', () => {
    const goals = [
      makeGoal({ id: 'g1', isPriority: false }),
      makeGoal({ id: 'g2', isPriority: true }),
    ]
    expect(findPriorityGoal(goals)?.id).toBe('g2')
  })

  it('findPriorityGoal: 優先目標がなければundefinedを返す', () => {
    const goals = [makeGoal({ id: 'g1', isPriority: false })]
    expect(findPriorityGoal(goals)).toBeUndefined()
  })
})
