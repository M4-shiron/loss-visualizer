import { createEmptyData, STORAGE_KEY, type StoredData } from '../storage/schema'
import type { Settings } from '../types/domain'

/** `settings`だけは部分指定できる。既定値は`createEmptyData()`のものが使われる。 */
type SeedOverrides = Omit<Partial<StoredData>, 'settings'> & { settings?: Partial<Settings> }

/**
 * オンボーディングを完了済みの状態からテストを始めたいときに使う。
 * 第5ループでオンボーディング未完了時のリダイレクトを追加したため、
 * オンボーディング自体を検証しないテストではこれを呼んでから render する。
 */
export function seedCompletedOnboarding(overrides: SeedOverrides = {}): void {
  const base = createEmptyData()
  const data: StoredData = {
    ...base,
    ...overrides,
    settings: {
      ...base.settings,
      ...overrides.settings,
      onboardingCompleted: true,
    },
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
