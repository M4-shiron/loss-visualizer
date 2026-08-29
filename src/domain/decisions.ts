import type { Decision } from '../types/domain'

/** 集計の基準日時。保留から確定した判断は `resolvedAt` を使う。 */
export function effectiveDate(decision: Decision): Date {
  return new Date(decision.resolvedAt ?? decision.createdAt)
}

export function isConfirmedSkip(decision: Decision): boolean {
  return decision.outcome === 'skipped' && decision.archivedAt === undefined
}

export function isPending(decision: Decision): boolean {
  return decision.outcome === 'pending' && decision.archivedAt === undefined
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function confirmedSkips(decisions: Decision[]): Decision[] {
  return decisions.filter(isConfirmedSkip)
}

function confirmedSkipsInMonth(decisions: Decision[], now: Date): Decision[] {
  return confirmedSkips(decisions).filter((d) => isSameMonth(effectiveDate(d), now))
}

/** 今月の確定節約額（§12）。「やめる」で確定した金額の合計。 */
export function monthlyConfirmedSavings(decisions: Decision[], now: Date): number {
  return confirmedSkipsInMonth(decisions, now).reduce((sum, d) => sum + d.amount, 0)
}

/** 総累計の確定節約額（§12）。 */
export function totalConfirmedSavings(decisions: Decision[]): number {
  return confirmedSkips(decisions).reduce((sum, d) => sum + d.amount, 0)
}

/** 保留中の回避額。確定節約額には含めない（§10）。 */
export function pendingAmount(decisions: Decision[]): number {
  return decisions.filter(isPending).reduce((sum, d) => sum + d.amount, 0)
}

/** 今月、思いとどまった回数（§12）。 */
export function monthlySkipCount(decisions: Decision[], now: Date): number {
  return confirmedSkipsInMonth(decisions, now).length
}

/** 累計、思いとどまった回数（§12, §15）。 */
export function totalSkipCount(decisions: Decision[]): number {
  return confirmedSkips(decisions).length
}
