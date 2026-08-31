/**
 * 労働時間換算（改善方針3）。
 *
 * 購入金額を、ユーザーが登録した概算時給で割り、約5分単位に丸めて表示する。
 * 厳密な手取り計算・税計算はしない。時給が未登録なら常に`undefined`を返す。
 */

const ROUND_TO_MINUTES = 5

/** 金額と時給から、概算の労働時間（分・5分単位に丸め）を求める。時給が未登録・0以下なら`undefined`。 */
export function laborMinutesForAmount(
  amount: number,
  hourlyWage: number | undefined,
): number | undefined {
  if (hourlyWage === undefined || hourlyWage <= 0) return undefined
  if (amount <= 0) return undefined
  const rawMinutes = (amount / hourlyWage) * 60
  return Math.round(rawMinutes / ROUND_TO_MINUTES) * ROUND_TO_MINUTES
}

/** 「約2時間30分」のように読める文字列にする。5分未満に丸まる場合は「5分未満」とする。 */
export function formatLaborTime(roundedMinutes: number): string {
  if (roundedMinutes <= 0) return '5分未満'

  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60

  if (hours === 0) return `約${minutes}分`
  if (minutes === 0) return `約${hours}時間`
  return `約${hours}時間${minutes}分`
}
