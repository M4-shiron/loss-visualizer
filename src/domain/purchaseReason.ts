import type { PurchaseReason } from '../types/domain'

/** 「買う」を選んだ際の理由の選択肢（§10）。 */
export const PURCHASE_REASON_OPTIONS: { id: PurchaseReason; label: string }[] = [
  { id: 'necessary', label: '必要だった' },
  { id: 'reward', label: 'ご褒美' },
  { id: 'planned', label: '前から予定していた' },
  { id: 'impulse', label: 'その場で欲しくなった' },
  { id: 'other', label: 'その他' },
]

export function purchaseReasonLabel(reason: PurchaseReason | undefined): string | undefined {
  return PURCHASE_REASON_OPTIONS.find((r) => r.id === reason)?.label
}
