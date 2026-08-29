import { createEmptyData, STORAGE_KEY, type StoredData } from '../storage/schema'

/**
 * オンボーディングを完了済みの状態からテストを始めたいときに使う。
 * 第5ループでオンボーディング未完了時のリダイレクトを追加したため、
 * オンボーディング自体を検証しないテストではこれを呼んでから render する。
 */
export function seedCompletedOnboarding(overrides: Partial<StoredData> = {}): void {
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
