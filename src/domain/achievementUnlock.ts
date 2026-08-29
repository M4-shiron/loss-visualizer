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

/**
 * 履歴の編集・削除など、累計が増減しうる変更の後に実績を再計算する（§13）。
 * 条件を満たさなくなった実績は解除状態から外し、あらためて条件を満たした場合は
 * その時点を新しい `unlockedAt` とする（過去の最初の達成日は保存しない）。
 */
export function recalculateAchievements(
  decisions: Decision[],
  existingAchievements: Achievement[],
  now: Date,
): Achievement[] {
  const totalAmount = totalConfirmedSavings(decisions)
  const totalCount = totalSkipCount(decisions)

  const stillMet = existingAchievements.filter((a) => isThresholdMet(a.kind, totalAmount, totalCount))
  const stillMetIds = new Set(stillMet.map((a) => achievementKindId(a.kind)))

  const newlyUnlocked: Achievement[] = ALL_ACHIEVEMENT_KINDS.filter(
    (kind) => !stillMetIds.has(achievementKindId(kind)) && isThresholdMet(kind, totalAmount, totalCount),
  ).map((kind) => ({ id: achievementKindId(kind), kind, unlockedAt: now.toISOString() }))

  return [...stillMet, ...newlyUnlocked]
}
