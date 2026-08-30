import { describe, expect, it } from 'vitest'
import type { Achievement } from '../../types/domain'
import { ALL_ACHIEVEMENT_KINDS, lockedAchievementLabel, lockedAchievements } from '../achievements'

describe('未解除の実績（lockedAchievements）', () => {
  it('何も解除していない場合、すべての節目が未解除として返る', () => {
    const result = lockedAchievements([], 0, 0)
    expect(result).toHaveLength(ALL_ACHIEVEMENT_KINDS.length)
  })

  it('解除済みの実績は含めない', () => {
    const unlocked: Achievement[] = [
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: '2026-08-01T00:00:00.000Z' },
    ]
    const result = lockedAchievements(unlocked, 1000, 0)
    expect(result.some((r) => r.kind.type === 'amount' && r.kind.threshold === 1000)).toBe(false)
  })

  it('節目までの残り（金額）を正しく計算する', () => {
    const result = lockedAchievements([], 300, 0)
    const next = result.find((r) => r.kind.type === 'amount' && r.kind.threshold === 1000)
    expect(next?.remaining).toBe(700)
  })

  it('節目までの残り（回数）を正しく計算する', () => {
    const result = lockedAchievements([], 0, 3)
    const next = result.find((r) => r.kind.type === 'count' && r.kind.threshold === 5)
    expect(next?.remaining).toBe(2)
  })
})

describe('未解除の実績ラベル（lockedAchievementLabel）', () => {
  it('金額の節目は「累計◯円まで、あと◯円」の形式になる', () => {
    const label = lockedAchievementLabel({ kind: { type: 'amount', threshold: 1000 }, remaining: 700 })
    expect(label).toBe('累計1,000円まで、あと700円')
  })

  it('回数の節目は「◯回まで、あと◯回」の形式になる', () => {
    const label = lockedAchievementLabel({ kind: { type: 'count', threshold: 5 }, remaining: 2 })
    expect(label).toBe('5回まで、あと2回')
  })
})
