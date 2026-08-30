import { createContext } from 'react'
import type { StoredData } from '../storage/schema'
import type {
  Achievement,
  CategoryId,
  Decision,
  Goal,
  NotificationSettings,
  Outcome,
  PurchaseReason,
  ValueItem,
} from '../types/domain'

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
  /** 起動時に壊れた保存データを検出し、初期状態へフォールバックしたかどうか（このセッションの最初の読み込み時のみtrueになりうる）。 */
  recoveredFromCorruption: boolean
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

  /** 保留リマインダー・週次まとめ・月次まとめの表示可否を切り替える（アプリ内表示。OS通知は使わない）。 */
  updateNotificationSettings: (input: Partial<NotificationSettings>) => void
  /** カテゴリの表示・非表示を切り替える。表示が0件になる変更は無視される。 */
  toggleCategoryVisibility: (categoryId: CategoryId) => void
  /** 今週の週次まとめを閉じる。同じ週の間は再表示しない。 */
  dismissWeeklySummary: () => void
  /** 今月の月次まとめを閉じる。同じ月の間は再表示しない。 */
  dismissMonthlySummary: () => void
  /** 全データを削除して初期状態に戻す。取り返しがつかない操作。 */
  resetAllData: () => void
}

export const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)
