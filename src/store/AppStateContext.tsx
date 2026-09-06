import { useMemo, useState, type ReactNode } from 'react'
import { detectNewAchievements } from '../domain/achievementUnlock'
import { monthKeyOf, weekKey } from '../domain/analytics'
import { ALL_CATEGORY_IDS } from '../data/prompts'
import { generateId } from '../domain/id'
import { shouldArchive } from '../domain/pending'
import { LocalStorageRepository } from '../storage/localStorageRepository'
import type { StoredData } from '../storage/schema'
import type { Achievement, CategoryId, Decision, Goal, NotificationSettings, ValueItem } from '../types/domain'
import {
  AppStateContext,
  type AppStateContextValue,
  type GoalInput,
  type RecordDecisionInput,
  type RecordDecisionResult,
  type ResolvePendingInput,
  type UpdateDecisionInput,
  type ValueItemInput,
} from './context'
import * as mutations from './mutations'

const repository = new LocalStorageRepository()

/**
 * アプリ全体のデータを保持し、ブラウザ内保存と同期する。
 * 起動時に一度だけ読み込み、以後は変更のたびに保存する。
 *
 * すべての変更はstore/mutations.tsの純粋関数 `(prev, args) => next` を通す。
 * setDataを関数型で呼ぶことで、直前の呼び出しの結果を取りこぼさない
 * （第3ループでの指摘を踏まえた設計）。
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const loaded = repository.load()
    // 起動時に1回だけ、48時間経過した未対応の保留をアーカイブする（常時監視はしない）。
    const now = new Date()
    if (loaded.data.decisions.some((d) => shouldArchive(d, now))) {
      const archivedData = mutations.archiveExpiredPendingDecisions(loaded.data, now)
      const saved = repository.save(archivedData)
      return {
        ...loaded,
        data: archivedData,
        persistenceUnavailable: loaded.persistenceUnavailable || !saved,
      }
    }
    return loaded
  })
  const [data, setData] = useState<StoredData>(initial.data)
  /**
   * 読み込みは成功したのに、書き込みだけが失敗する環境がある
   * （Safariのプライベートブラウジング、容量超過など）。
   * この場合こそ「保存できません」と伝える必要があるため、保存の失敗を記録する。
   */
  const [saveFailed, setSaveFailed] = useState(false)

  const value = useMemo<AppStateContextValue>(() => {
    function applyAndSave(mutate: (prev: StoredData) => StoredData): void {
      setData((prev) => {
        const nextData = mutate(prev)
        if (!repository.save(nextData)) {
          // 更新関数の中で直接setStateせず、次のタスクへ逃がす（更新関数は純粋に保つ）。
          queueMicrotask(() => setSaveFailed(true))
        }
        return nextData
      })
    }

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

      // 呼び出し元へ即座に返す値は、この時点のdataから計算する（通常の単発呼び出しでは正確）。
      // 実際に保存されるデータは下のapplyAndSave内で、常に最新のprevから再計算する。
      const newAchievements: Achievement[] = detectNewAchievements(
        [...data.decisions, decision],
        data.achievements,
        now,
      )

      applyAndSave((prev) => {
        const decisions = [...prev.decisions, decision]
        const achievements = [
          ...prev.achievements,
          ...detectNewAchievements(decisions, prev.achievements, now),
        ]
        return { ...prev, decisions, achievements }
      })

      return { decision, newAchievements }
    }

    const addValueItem = (input: ValueItemInput): ValueItem => {
      const item: ValueItem = {
        id: generateId(),
        name: input.name,
        price: input.price,
        createdAt: new Date().toISOString(),
      }
      applyAndSave((prev) => mutations.addValueItem(prev, item))
      return item
    }

    const updateValueItem = (id: string, input: ValueItemInput): void => {
      applyAndSave((prev) =>
        mutations.updateValueItem(prev, { id, name: input.name, price: input.price }),
      )
    }

    const removeValueItem = (id: string): void => {
      applyAndSave((prev) => mutations.removeValueItem(prev, id))
    }

    const addGoal = (input: GoalInput): Goal => {
      const goal: Goal = {
        id: generateId(),
        title: input.title,
        targetAmount: input.targetAmount,
        isPriority: false,
        createdAt: new Date().toISOString(),
      }
      applyAndSave((prev) => mutations.addGoal(prev, goal))
      return goal
    }

    const updateGoal = (id: string, input: GoalInput): void => {
      applyAndSave((prev) =>
        mutations.updateGoal(prev, { id, title: input.title, targetAmount: input.targetAmount }),
      )
    }

    const removeGoal = (id: string): void => {
      applyAndSave((prev) => mutations.removeGoal(prev, id))
    }

    const setPriorityGoal = (id: string | null): void => {
      applyAndSave((prev) => mutations.setPriorityGoal(prev, id))
    }

    const completeOnboarding = (): void => {
      applyAndSave((prev) => mutations.completeOnboarding(prev))
    }

    const resolvePending = (id: string, input: ResolvePendingInput): void => {
      const now = new Date()
      applyAndSave((prev) =>
        mutations.resolvePending(prev, {
          id,
          outcome: input.outcome,
          purchaseReason: input.purchaseReason,
          now,
        }),
      )
    }

    const updateDecision = (id: string, input: UpdateDecisionInput): void => {
      const now = new Date()
      applyAndSave((prev) =>
        mutations.updateDecision(prev, {
          id,
          update: {
            amount: input.amount,
            categoryId: input.categoryId,
            itemName: input.itemName,
            outcome: input.outcome,
            purchaseReason: input.purchaseReason,
          },
          now,
        }),
      )
    }

    const removeDecision = (id: string): void => {
      const now = new Date()
      applyAndSave((prev) => mutations.removeDecision(prev, { id, now }))
    }

    const archiveExpiredPending = (): void => {
      applyAndSave((prev) => mutations.archiveExpiredPendingDecisions(prev, new Date()))
    }

    const updateNotificationSettings = (input: Partial<NotificationSettings>): void => {
      applyAndSave((prev) => mutations.updateNotificationSettings(prev, input))
    }

    const setProPreview = (enabled: boolean): void => {
      applyAndSave((prev) => mutations.setProPreview(prev, enabled))
    }

    const updateHourlyWage = (hourlyWage: number | undefined): void => {
      applyAndSave((prev) => mutations.updateHourlyWage(prev, hourlyWage))
    }

    const toggleCategoryVisibility = (categoryId: CategoryId): void => {
      applyAndSave((prev) => mutations.toggleCategoryVisibility(prev, categoryId, ALL_CATEGORY_IDS))
    }

    const dismissWeeklySummary = (): void => {
      applyAndSave((prev) => mutations.dismissWeeklySummary(prev, weekKey(new Date())))
    }

    const dismissMonthlySummary = (): void => {
      applyAndSave((prev) => mutations.dismissMonthlySummary(prev, monthKeyOf(new Date())))
    }

    const resetAllData = (): void => {
      applyAndSave(() => mutations.resetAllData())
    }

    return {
      data,
      // 起動時に読めなかった場合と、あとから書き込みに失敗した場合の両方を含める。
      persistenceUnavailable: initial.persistenceUnavailable || saveFailed,
      recoveredFromCorruption: initial.recoveredFromCorruption,
      recordDecision,
      resolvePending,
      updateDecision,
      removeDecision,
      addValueItem,
      updateValueItem,
      removeValueItem,
      addGoal,
      updateGoal,
      removeGoal,
      setPriorityGoal,
      completeOnboarding,
      archiveExpiredPending,
      updateNotificationSettings,
      updateHourlyWage,
      setProPreview,
      toggleCategoryVisibility,
      dismissWeeklySummary,
      dismissMonthlySummary,
      resetAllData,
    }
  }, [data, initial.persistenceUnavailable, initial.recoveredFromCorruption, saveFailed])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
