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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** `date`を含む週の月曜日（時刻は00:00）を返す。週は月曜始まり。 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=日, 1=月, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

/** 週次まとめの対象週を一意に表すキー（月曜日のYYYY-MM-DD）。 */
export function weekKey(date: Date): string {
  const s = startOfWeek(date)
  return `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`
}

/** 月次まとめの対象月を一意に表すキー（YYYY-MM）。 */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

function isWithinRange(date: Date, startInclusive: Date, endExclusive: Date): boolean {
  return date.getTime() >= startInclusive.getTime() && date.getTime() < endExclusive.getTime()
}

/** 「先週」（`now`を含む週の直前の月〜日）に確定した節約額（§16の週次まとめ用）。 */
export function previousWeekSavings(decisions: Decision[], now: Date): number {
  const currentWeekStart = startOfWeek(now)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)

  return decisions
    .filter(
      (d) => isConfirmedSkip(d) && isWithinRange(effectiveDate(d), previousWeekStart, currentWeekStart),
    )
    .reduce((sum, d) => sum + d.amount, 0)
}

/** 「先月」に確定した節約額（§16の月次まとめ用）。 */
export function previousMonthSavings(decisions: Decision[], now: Date): number {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return decisions
    .filter(
      (d) =>
        isConfirmedSkip(d) && isWithinRange(effectiveDate(d), previousMonthStart, currentMonthStart),
    )
    .reduce((sum, d) => sum + d.amount, 0)
}
