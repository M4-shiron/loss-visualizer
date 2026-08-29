import type {
  Achievement,
  Decision,
  Goal,
  Settings,
  ValueItem,
} from '../types/domain'

/**
 * localStorage に保存する単一JSONの形。ルートに `schemaVersion` を持たせ、
 * 将来の構造変更に備える。
 */
export type StoredData = {
  schemaVersion: number
  decisions: Decision[]
  valueItems: ValueItem[]
  goals: Goal[]
  achievements: Achievement[]
  settings: Settings
}

export const CURRENT_SCHEMA_VERSION = 1

export const STORAGE_KEY = 'loss-visualizer:data'

/** 壊れた・読めないデータを退避しておくキー。次回起動時に上書きされる。 */
export const STORAGE_QUARANTINE_KEY = 'loss-visualizer:quarantine'

export function createEmptyData(): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    decisions: [],
    valueItems: [],
    goals: [],
    achievements: [],
    settings: {
      onboardingCompleted: false,
      notifications: {
        pendingReminder: true,
        weeklySummary: false,
        monthlySummary: false,
      },
    },
  }
}
