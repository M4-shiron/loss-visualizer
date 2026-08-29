import type { AchievementKind } from '../types/domain'
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
