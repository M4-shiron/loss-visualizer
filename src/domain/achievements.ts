import type { Achievement, AchievementKind } from '../types/domain'
import { formatYen } from './format'

/** 実績の節目（§15）。 */
export const AMOUNT_THRESHOLDS = [1000, 5000, 10000, 30000, 50000, 100000] as const

export const COUNT_THRESHOLDS = [5, 10, 25, 50, 100] as const

export function achievementKindId(kind: AchievementKind): string {
  return `${kind.type}-${kind.threshold}`
}

export function achievementLabel(kind: AchievementKind): string {
  return kind.type === 'amount'
    ? `累計${formatYen(kind.threshold)}達成`
    : `${kind.threshold}回、思いとどまった`
}

export const ALL_ACHIEVEMENT_KINDS: AchievementKind[] = [
  ...AMOUNT_THRESHOLDS.map((threshold): AchievementKind => ({ type: 'amount', threshold })),
  ...COUNT_THRESHOLDS.map((threshold): AchievementKind => ({ type: 'count', threshold })),
]

export type LockedAchievement = {
  kind: AchievementKind
  /** 節目まで残っている金額または回数。 */
  remaining: number
}

/** まだ解除されていない実績と、節目までの残りを一覧する（§15）。 */
export function lockedAchievements(
  unlocked: Achievement[],
  totalAmount: number,
  totalCount: number,
): LockedAchievement[] {
  const unlockedIds = new Set(unlocked.map((a) => achievementKindId(a.kind)))
  return ALL_ACHIEVEMENT_KINDS.filter((kind) => !unlockedIds.has(achievementKindId(kind))).map(
    (kind) => ({
      kind,
      remaining:
        kind.type === 'amount'
          ? Math.max(0, kind.threshold - totalAmount)
          : Math.max(0, kind.threshold - totalCount),
    }),
  )
}

export function lockedAchievementLabel(locked: LockedAchievement): string {
  return locked.kind.type === 'amount'
    ? `累計${formatYen(locked.kind.threshold)}まで、あと${formatYen(locked.remaining)}`
    : `${locked.kind.threshold}回まで、あと${locked.remaining}回`
}
