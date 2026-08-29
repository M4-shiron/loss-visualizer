/** 価値尺度・節約目標の名前・金額に共通する入力制約。 */

export const NAME_MAX_LENGTH = 30
export const MIN_AMOUNT = 1
export const MAX_AMOUNT = 9_999_999

export function isValidName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX_LENGTH
}

export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT
}
