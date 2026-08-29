import type { Goal } from '../types/domain'

/** 優先目標への進捗率（0〜100、目標額0は0%扱い）。§6, §12。 */
export function goalProgressPercent(goal: Goal, totalSavings: number): number {
  if (goal.targetAmount <= 0) return 0
  const percent = (totalSavings / goal.targetAmount) * 100
  return Math.min(100, Math.max(0, percent))
}

export function findPriorityGoal(goals: Goal[]): Goal | undefined {
  return goals.find((g) => g.isPriority)
}
