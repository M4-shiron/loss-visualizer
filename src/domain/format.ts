export function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`
}

export function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}
