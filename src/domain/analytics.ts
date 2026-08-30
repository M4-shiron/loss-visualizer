import { getCategoryName } from '../data/prompts'
import type { CategoryId, Decision, ValueItem } from '../types/domain'
import { effectiveDate, isConfirmedSkip, isPending } from './decisions'

export type MonthlySavings = {
  year: number
  month: number
  label: string
  amount: number
}

/**
 * 直近 `months` か月（今月を含む）の確定節約額を、古い月→新しい月の順で返す。
 * データがない月も0円として埋め、常に固定した月数・並びになるようにする（§14）。
 */
export function savingsByMonth(decisions: Decision[], now: Date, months = 6): MonthlySavings[] {
  const buckets: MonthlySavings[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}月`, amount: 0 })
  }

  const indexByKey = new Map(buckets.map((b, i) => [`${b.year}-${b.month}`, i]))
  for (const decision of decisions) {
    if (!isConfirmedSkip(decision)) continue
    const date = effectiveDate(decision)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const index = indexByKey.get(key)
    if (index !== undefined) {
      buckets[index] = { ...buckets[index], amount: buckets[index].amount + decision.amount }
    }
  }
  return buckets
}

export type CategoryBreakdownRow = {
  categoryId: CategoryId
  categoryName: string
  confirmedAmount: number
  pendingAmountValue: number
  count: number
}

/**
 * カテゴリ別の確定節約額・保留中の回避額・件数（§14）。
 * 一度も使われていないカテゴリは含めない。確定節約額の多い順に並べる。
 */
export function categoryBreakdown(decisions: Decision[]): CategoryBreakdownRow[] {
  const rows = new Map<CategoryId, CategoryBreakdownRow>()

  function rowFor(categoryId: CategoryId): CategoryBreakdownRow {
    const existing = rows.get(categoryId)
    if (existing) return existing
    const created: CategoryBreakdownRow = {
      categoryId,
      categoryName: getCategoryName(categoryId),
      confirmedAmount: 0,
      pendingAmountValue: 0,
      count: 0,
    }
    rows.set(categoryId, created)
    return created
  }

  for (const decision of decisions) {
    const row = rowFor(decision.categoryId)
    row.count += 1
    if (isConfirmedSkip(decision)) row.confirmedAmount += decision.amount
    if (isPending(decision)) row.pendingAmountValue += decision.amount
  }

  return [...rows.values()].sort(
    (a, b) => b.confirmedAmount - a.confirmedAmount || b.pendingAmountValue - a.pendingAmountValue,
  )
}

export type ValueItemProgressRow = {
  item: ValueItem
  /** 総累計節約額が、この価値尺度の金額の何倍に相当するか（1未満なら未到達）。 */
  multiplier: number
}

/** 総累計節約額が、登録済みの各価値尺度の何倍に相当するかを計算する（§7, §14）。 */
export function valueItemProgress(
  valueItems: ValueItem[],
  totalSavings: number,
): ValueItemProgressRow[] {
  return valueItems.map((item) => ({
    item,
    multiplier: item.price > 0 ? Math.round((totalSavings / item.price) * 10) / 10 : 0,
  }))
}
