import type { Achievement, AchievementKind, Decision } from '../types/domain'
import { ALL_ACHIEVEMENT_KINDS, achievementKindId } from './achievements'
import { totalConfirmedSavings, totalSkipCount } from './decisions'

/**
 * 現在の累計節約額・累計回数から、まだ解除されていない実績を判定する（§15）。
 * 呼び出し側は、返ってきた実績を保存済みリストへ追加する。
 */
export function detectNewAchievements(
  decisions: Decision[],
  alreadyUnlocked: Achievement[],
  now: Date,
): Achievement[] {
  const totalAmount = totalConfirmedSavings(decisions)
  const totalCount = totalSkipCount(decisions)
  const unlockedIds = new Set(alreadyUnlocked.map((a) => achievementKindId(a.kind)))

  const newlyUnlocked: Achievement[] = []
  for (const kind of ALL_ACHIEVEMENT_KINDS) {
    const id = achievementKindId(kind)
    if (unlockedIds.has(id)) continue
    if (isThresholdMet(kind, totalAmount, totalCount)) {
      newlyUnlocked.push({ id, kind, unlockedAt: now.toISOString() })
    }
  }
  return newlyUnlocked
}

function isThresholdMet(kind: AchievementKind, totalAmount: number, totalCount: number): boolean {
  return kind.type === 'amount' ? totalAmount >= kind.threshold : totalCount >= kind.threshold
}
