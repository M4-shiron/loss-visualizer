import type {
  Achievement,
  CategoryId,
  Decision,
  Goal,
  Outcome,
  PurchaseReason,
  Settings,
  ValueItem,
} from '../types/domain'
import { CURRENT_SCHEMA_VERSION, type StoredData } from './schema'

const CATEGORY_IDS: CategoryId[] = [
  'convenience',
  'restaurant-cafe',
  'game-charge',
  'fashion',
  'hobby',
  'daily',
  'subscription',
  'other',
]

const OUTCOMES: Outcome[] = ['skipped', 'purchased', 'pending']

const PURCHASE_REASONS: PurchaseReason[] = [
  'necessary',
  'reward',
  'planned',
  'impulse',
  'other',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isDecision(value: unknown): value is Decision {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.amount !== 'number' || !Number.isFinite(value.amount)) return false
  if (!CATEGORY_IDS.includes(value.categoryId as CategoryId)) return false
  if (value.itemName !== undefined && typeof value.itemName !== 'string') return false
  if (!OUTCOMES.includes(value.outcome as Outcome)) return false
  if (
    value.purchaseReason !== undefined &&
    !PURCHASE_REASONS.includes(value.purchaseReason as PurchaseReason)
  ) {
    return false
  }
  if (!isIsoDateString(value.createdAt)) return false
  if (value.resolvedAt !== undefined && !isIsoDateString(value.resolvedAt)) return false
  if (value.archivedAt !== undefined && !isIsoDateString(value.archivedAt)) return false
  return true
}

function isValueItem(value: unknown): value is ValueItem {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    isIsoDateString(value.createdAt)
  )
}

function isGoal(value: unknown): value is Goal {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.targetAmount === 'number' &&
    Number.isFinite(value.targetAmount) &&
    typeof value.isPriority === 'boolean' &&
    isIsoDateString(value.createdAt)
  )
}

function isAchievement(value: unknown): value is Achievement {
  if (!isRecord(value)) return false
  const kind = value.kind
  if (!isRecord(kind)) return false
  const isAmountKind = kind.type === 'amount' && typeof kind.threshold === 'number'
  const isCountKind = kind.type === 'count' && typeof kind.threshold === 'number'
  if (!isAmountKind && !isCountKind) return false
  return typeof value.id === 'string' && isIsoDateString(value.unlockedAt)
}

function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORY_IDS.includes(value as CategoryId)
}

/**
 * `hiddenCategoryIds` 以降は第8ループで追加した任意項目。
 * 存在しない場合（旧データ）は許容し、存在する場合のみ型を検証する。
 * こうすることで、これらの項目を持たない旧データも壊れたデータ扱いにならない。
 */
function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false
  if (typeof value.onboardingCompleted !== 'boolean') return false
  const notifications = value.notifications
  if (!isRecord(notifications)) return false
  if (
    typeof notifications.pendingReminder !== 'boolean' ||
    typeof notifications.weeklySummary !== 'boolean' ||
    typeof notifications.monthlySummary !== 'boolean'
  ) {
    return false
  }

  if (value.hiddenCategoryIds !== undefined) {
    if (!Array.isArray(value.hiddenCategoryIds) || !value.hiddenCategoryIds.every(isCategoryId)) {
      return false
    }
  }
  if (
    value.lastDismissedWeeklySummaryWeek !== undefined &&
    typeof value.lastDismissedWeeklySummaryWeek !== 'string'
  ) {
    return false
  }
  if (
    value.lastDismissedMonthlySummaryMonth !== undefined &&
    typeof value.lastDismissedMonthlySummaryMonth !== 'string'
  ) {
    return false
  }
  if (value.hourlyWage !== undefined) {
    if (
      typeof value.hourlyWage !== 'number' ||
      !Number.isFinite(value.hourlyWage) ||
      value.hourlyWage <= 0
    ) {
      return false
    }
  }
  if (value.proPreviewEnabled !== undefined && typeof value.proPreviewEnabled !== 'boolean') {
    return false
  }
  return true
}

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length
}

/**
 * 未加工の値が現行スキーマの `StoredData` として妥当か検証する。
 * バージョンが現行と異なる場合は、将来ここへ移行処理を追加する。
 * 現状は移行対象がないため、一致しない場合は無効として扱う。
 */
export function validateStoredData(value: unknown): value is StoredData {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) return false
  if (!Array.isArray(value.decisions) || !value.decisions.every(isDecision)) return false
  if (!hasUniqueIds(value.decisions)) return false
  if (!Array.isArray(value.valueItems) || !value.valueItems.every(isValueItem)) return false
  if (!hasUniqueIds(value.valueItems)) return false
  if (!Array.isArray(value.goals) || !value.goals.every(isGoal)) return false
  if (!hasUniqueIds(value.goals)) return false
  if (!Array.isArray(value.achievements) || !value.achievements.every(isAchievement)) {
    return false
  }
  if (!hasUniqueIds(value.achievements)) return false
  if (!isSettings(value.settings)) return false
  return true
}
