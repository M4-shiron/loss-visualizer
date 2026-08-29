import type { StoredData } from '../storage/schema'
import type { Goal, ValueItem } from '../types/domain'

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
