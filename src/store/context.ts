import { createContext } from 'react'
import type { StoredData } from '../storage/schema'
import type { Achievement, CategoryId, Decision, Goal, Outcome, PurchaseReason, ValueItem } from '../types/domain'

export type RecordDecisionInput = {
  amount: number
  categoryId: CategoryId
  itemName?: string
  outcome: Outcome
  purchaseReason?: PurchaseReason
}

export type RecordDecisionResult = {
  decision: Decision
  newAchievements: Achievement[]
}

export type ValueItemInput = {
  name: string
  price: number
}

export type GoalInput = {
  title: string
  targetAmount: number
}

export type ResolvePendingInput = {
  outcome: 'skipped' | 'purchased'
  purchaseReason?: PurchaseReason
}

export type UpdateDecisionInput = {
  amount: number
  categoryId: CategoryId
  itemName?: string
  outcome: Outcome
  purchaseReason?: PurchaseReason
}

export type AppStateContextValue = {
  data: StoredData
  /** 保存が使えない環境（プライベートブラウジング等）かどうか。 */
  persistenceUnavailable: boolean
  recordDecision: (input: RecordDecisionInput) => RecordDecisionResult
  /** 保留（あとで考える）を「やめる」「買う」で確定する。 */
  resolvePending: (id: string, input: ResolvePendingInput) => void
  /** 履歴を編集する。日付（createdAt）は変更しない。 */
  updateDecision: (id: string, input: UpdateDecisionInput) => void
  removeDecision: (id: string) => void

  addValueItem: (input: ValueItemInput) => ValueItem
  updateValueItem: (id: string, input: ValueItemInput) => void
  removeValueItem: (id: string) => void

  addGoal: (input: GoalInput) => Goal
  updateGoal: (id: string, input: GoalInput) => void
  removeGoal: (id: string) => void
  /** 優先目標を切り替える。nullで優先目標なしにする。 */
  setPriorityGoal: (id: string | null) => void

  /** 初回オンボーディングを完了とする。以後、各画面への誘導が止まる。 */
  completeOnboarding: () => void

  /**
   * 48時間経過した未対応の保留をアーカイブする。アプリ起動時に自動実行されるほか、
   * 保留画面を開いたときにも同じ判定をやり直す（常時監視のタイマーは持たない）。
   */
  archiveExpiredPending: () => void
}

export const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)
