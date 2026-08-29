import { useMemo, useState, type ReactNode } from 'react'
import { detectNewAchievements } from '../domain/achievementUnlock'
import { generateId } from '../domain/id'
import { LocalStorageRepository } from '../storage/localStorageRepository'
import type { StoredData } from '../storage/schema'
import type { Achievement, Decision } from '../types/domain'
import {
  AppStateContext,
  type AppStateContextValue,
  type RecordDecisionInput,
  type RecordDecisionResult,
} from './context'

const repository = new LocalStorageRepository()

/**
 * アプリ全体のデータを保持し、ブラウザ内保存と同期する。
 * 起動時に一度だけ読み込み、以後は変更のたびに保存する。
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => repository.load())
  const [data, setData] = useState<StoredData>(initial.data)

  const value = useMemo<AppStateContextValue>(() => {
    const recordDecision = (input: RecordDecisionInput): RecordDecisionResult => {
      const now = new Date()
      const decision: Decision = {
        id: generateId(),
        amount: input.amount,
        categoryId: input.categoryId,
        itemName: input.itemName,
        outcome: input.outcome,
        purchaseReason: input.purchaseReason,
        createdAt: now.toISOString(),
        resolvedAt: input.outcome === 'pending' ? undefined : now.toISOString(),
      }

      // 新規実績はここでは仮計算し、保存する値は下の関数型更新で確定させる。
      // setDataを関数型で書くことで、短時間に複数回呼ばれても前の呼び出しの
      // 結果を取りこぼさない（非関数型のsetDataだと、再描画前の古いdataを
      // 参照した2回目の呼び出しが1回目の結果を上書きしてしまう）。
      const newAchievements: Achievement[] = detectNewAchievements(
        [...data.decisions, decision],
        data.achievements,
        now,
      )

      setData((prev) => {
        const decisions = [...prev.decisions, decision]
        const achievements = [
          ...prev.achievements,
          ...detectNewAchievements(decisions, prev.achievements, now),
        ]
        const nextData: StoredData = { ...prev, decisions, achievements }
        repository.save(nextData)
        return nextData
      })

      return { decision, newAchievements }
    }

    return { data, persistenceUnavailable: initial.persistenceUnavailable, recordDecision }
  }, [data, initial.persistenceUnavailable])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
