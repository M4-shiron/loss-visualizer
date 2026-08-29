import type { AchievementKind } from '../types/domain'

/** 実績の節目（§15）。 */
export const AMOUNT_THRESHOLDS = [1000, 5000, 10000, 30000, 50000, 100000] as const

export const COUNT_THRESHOLDS = [5, 10, 25, 50, 100] as const

export function achievementKindId(kind: AchievementKind): string {
  return `${kind.type}-${kind.threshold}`
}

export const ALL_ACHIEVEMENT_KINDS: AchievementKind[] = [
  ...AMOUNT_THRESHOLDS.map((threshold): AchievementKind => ({ type: 'amount', threshold })),
  ...COUNT_THRESHOLDS.map((threshold): AchievementKind => ({ type: 'count', threshold })),
]
