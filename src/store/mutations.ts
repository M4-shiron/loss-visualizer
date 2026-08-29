import { detectNewAchievements, recalculateAchievements } from '../domain/achievementUnlock'
import { archiveExpiredPending } from '../domain/pending'
import type { StoredData } from '../storage/schema'
import type { Decision, Goal, PurchaseReason, ValueItem } from '../types/domain'

/**
 * データ変更をすべて `(prev, args) => next` の純粋関数として定義する。
 * Providerはこれらを呼び出して結果をそのまま保存するだけにし、
 * 「古いstateを参照して直前の変更を上書きする」誤りを構造的に防ぐ
 * （第3ループでの指摘を踏まえた設計）。
 */

export function addValueItem(prev: StoredData, item: ValueItem): StoredData {
  return { ...prev, valueItems: [...prev.valueItems, item] }
}

export function updateValueItem(
  prev: StoredData,
  update: Pick<ValueItem, 'id' | 'name' | 'price'>,
): StoredData {
  return {
    ...prev,
    valueItems: prev.valueItems.map((v) =>
      v.id === update.id ? { ...v, name: update.name, price: update.price } : v,
    ),
  }
}

export function removeValueItem(prev: StoredData, id: string): StoredData {
  return { ...prev, valueItems: prev.valueItems.filter((v) => v.id !== id) }
}

export function addGoal(prev: StoredData, goal: Goal): StoredData {
  return { ...prev, goals: [...prev.goals, goal] }
}

export function updateGoal(
  prev: StoredData,
  update: Pick<Goal, 'id' | 'title' | 'targetAmount'>,
): StoredData {
  return {
    ...prev,
    goals: prev.goals.map((g) =>
      g.id === update.id ? { ...g, title: update.title, targetAmount: update.targetAmount } : g,
    ),
  }
}

export function removeGoal(prev: StoredData, id: string): StoredData {
  // 優先目標を削除しても、他の目標を自動で優先へ繰り上げない。
  // どれを優先にするかはユーザーが改めて選ぶ（ユーザー指示）。
  return { ...prev, goals: prev.goals.filter((g) => g.id !== id) }
}

/**
 * 優先目標を切り替える。優先目標は常に0または1件。
 * `id` に null を渡すと、優先目標なしの状態にする。
 */
export function setPriorityGoal(prev: StoredData, id: string | null): StoredData {
  return {
    ...prev,
    goals: prev.goals.map((g) => ({ ...g, isPriority: g.id === id })),
  }
}

export function completeOnboarding(prev: StoredData): StoredData {
  return { ...prev, settings: { ...prev.settings, onboardingCompleted: true } }
}

export type ResolvePendingArgs = {
  id: string
  outcome: 'skipped' | 'purchased'
  purchaseReason?: PurchaseReason
  now: Date
}

/**
 * 保留（outcome: 'pending'）を「やめる」「買う」で確定する。
 * 保留から確定した判断は resolvedAt を集計の基準にする（第2ループの決定）。
 * 確定は累計を増やす方向にしか働かないため、新規に解除される実績だけを追加する。
 */
export function resolvePending(prev: StoredData, args: ResolvePendingArgs): StoredData {
  const decisions = prev.decisions.map((d) =>
    d.id === args.id
      ? {
          ...d,
          outcome: args.outcome,
          purchaseReason: args.purchaseReason,
          resolvedAt: args.now.toISOString(),
        }
      : d,
  )
  const newAchievements = detectNewAchievements(decisions, prev.achievements, args.now)
  return { ...prev, decisions, achievements: [...prev.achievements, ...newAchievements] }
}

export type UpdateDecisionFields = Pick<
  Decision,
  'amount' | 'categoryId' | 'itemName' | 'outcome' | 'purchaseReason'
>

/**
 * 履歴の編集（§13）。日付は編集対象に含めない。
 * 金額や判断結果の変更で累計が増減しうるため、実績は再計算する。
 */
export function updateDecision(
  prev: StoredData,
  args: { id: string; update: UpdateDecisionFields; now: Date },
): StoredData {
  const decisions = prev.decisions.map((d) => {
    if (d.id !== args.id) return d
    const updated = { ...d, ...args.update }
    // 判断結果を保留以外へ変更した場合、古いアーカイブ状態を引きずらない。
    // 引きずると archivedAt が残ったまま「やめた／買った」扱いになり、
    // isConfirmedSkip 等の判定（archivedAt === undefined を要求する）から
    // 静かに除外され続けてしまう。
    if (args.update.outcome !== 'pending') {
      return { ...updated, archivedAt: undefined }
    }
    return updated
  })
  const achievements = recalculateAchievements(decisions, prev.achievements, args.now)
  return { ...prev, decisions, achievements }
}

/** 履歴の削除（§13）。累計が減りうるため、実績は再計算する。 */
export function removeDecision(prev: StoredData, args: { id: string; now: Date }): StoredData {
  const decisions = prev.decisions.filter((d) => d.id !== args.id)
  const achievements = recalculateAchievements(decisions, prev.achievements, args.now)
  return { ...prev, decisions, achievements }
}

/** 48時間経過した未対応の保留をアーカイブする（§10）。 */
export function archiveExpiredPendingDecisions(prev: StoredData, now: Date): StoredData {
  return { ...prev, decisions: archiveExpiredPending(prev.decisions, now) }
}
