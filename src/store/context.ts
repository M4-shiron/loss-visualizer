import { createContext } from 'react'
import type { StoredData } from '../storage/schema'
import type { Achievement, CategoryId, Decision, Outcome, PurchaseReason } from '../types/domain'

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

export type AppStateContextValue = {
  data: StoredData
  /** 保存が使えない環境（プライベートブラウジング等）かどうか。 */
  persistenceUnavailable: boolean
  recordDecision: (input: RecordDecisionInput) => RecordDecisionResult
}

export const AppStateContext = createContext<AppStateContextValue | undefined>(undefined)
