import { describe, expect, it } from 'vitest'
import type { Achievement, Decision } from '../../types/domain'
import { detectNewAchievements, recalculateAchievements } from '../achievementUnlock'

function makeSkipped(id: string, amount: number): Decision {
  return {
    id,
    amount,
    categoryId: 'convenience',
    outcome: 'skipped',
    createdAt: '2026-08-01T00:00:00.000Z',
  }
}

describe('実績の解除判定', () => {
  const now = new Date('2026-08-29T00:00:00.000Z')

  it('累計・回数がどの節目にも届かない場合は何も解除しない', () => {
    const decisions = [makeSkipped('d1', 500)]
    expect(detectNewAchievements(decisions, [], now)).toEqual([])
  })

  it('累計金額が1,000円に達すると amount-1000 が解除される', () => {
    const decisions = [makeSkipped('d1', 1000)]
    const result = detectNewAchievements(decisions, [], now)
    expect(result).toEqual([
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: now.toISOString() },
    ])
  })

  it('回数が5回に達すると count-5 が解除される（金額は届かない場合）', () => {
    const decisions = Array.from({ length: 5 }, (_, i) => makeSkipped(`d${i}`, 10))
    const result = detectNewAchievements(decisions, [], now)
    expect(result).toEqual([
      { id: 'count-5', kind: { type: 'count', threshold: 5 }, unlockedAt: now.toISOString() },
    ])
  })

  it('すでに解除済みの実績は再度返さない', () => {
    const decisions = [makeSkipped('d1', 1000)]
    const already: Achievement[] = [
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: '2026-08-20T00:00:00.000Z' },
    ]
    expect(detectNewAchievements(decisions, already, now)).toEqual([])
  })

  it('複数の節目を同時に超えた場合、すべて新規解除として返す', () => {
    const decisions = [makeSkipped('d1', 5000)]
    const result = detectNewAchievements(decisions, [], now)
    const ids = result.map((a) => a.id).sort()
    expect(ids).toEqual(['amount-1000', 'amount-5000'])
  })
})

describe('実績の再計算（履歴の編集・削除後）', () => {
  const now = new Date('2026-08-29T00:00:00.000Z')

  it('累計が節目を下回ると、実績は解除状態から外れる', () => {
    const decisions = [makeSkipped('d1', 500)] // 元は1000円だったが編集で500円に減った想定
    const existing: Achievement[] = [
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: '2026-08-20T00:00:00.000Z' },
    ]
    const result = recalculateAchievements(decisions, existing, now)
    expect(result).toEqual([])
  })

  it('条件を満たし続けている実績は、unlockedAtを変えずそのまま残す', () => {
    const decisions = [makeSkipped('d1', 1000), makeSkipped('d2', 200)]
    const originalUnlockedAt = '2026-08-20T00:00:00.000Z'
    const existing: Achievement[] = [
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: originalUnlockedAt },
    ]
    const result = recalculateAchievements(decisions, existing, now)
    expect(result).toEqual([
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: originalUnlockedAt },
    ])
  })

  it('解除→未解除→再達成の場合、unlockedAtは新しい達成時点になる', () => {
    // 一度1000円を達成して解除されたが、削除で500円に減り、その後また1000円に戻った想定
    const decisions = [makeSkipped('d1', 1000)]
    const existing: Achievement[] = [] // 一度解除から外れた状態（削除済み）
    const result = recalculateAchievements(decisions, existing, now)
    expect(result).toEqual([
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: now.toISOString() },
    ])
  })

  it('判断が0件になっても壊れない', () => {
    const existing: Achievement[] = [
      { id: 'amount-1000', kind: { type: 'amount', threshold: 1000 }, unlockedAt: '2026-08-20T00:00:00.000Z' },
    ]
    expect(recalculateAchievements([], existing, now)).toEqual([])
  })
})
