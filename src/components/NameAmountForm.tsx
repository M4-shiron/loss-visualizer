import { useId, useState } from 'react'
import {
  isValidAmount,
  isValidName,
  MAX_AMOUNT,
  MAX_AMOUNT_DIGITS,
  NAME_MAX_LENGTH,
} from '../domain/validation'
import { formatYen } from '../domain/format'

type Props = {
  nameLabel: string
  amountLabel: string
  initialName?: string
  initialAmount?: number
  submitLabel: string
  cancelLabel?: string
  onSubmit: (name: string, amount: number) => void
  onCancel: () => void
}

/** 価値尺度・節約目標に共通する「名前＋金額」の追加・編集フォーム。 */
export function NameAmountForm({
  nameLabel,
  amountLabel,
  initialName = '',
  initialAmount,
  submitLabel,
  cancelLabel = 'キャンセル',
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName)
  const [amountDigits, setAmountDigits] = useState(
    initialAmount !== undefined ? String(initialAmount) : '',
  )
  const nameInputId = useId()
  const amountInputId = useId()

  const amount = Number(amountDigits || '0')
  const nameValid = isValidName(name)
  const amountValid = isValidAmount(amount)
  const canSubmit = nameValid && amountValid

  function handleAmountChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/[^0-9]/g, '').slice(0, MAX_AMOUNT_DIGITS)
    setAmountDigits(digitsOnly)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <label htmlFor={nameInputId} className="mb-1 block text-xs font-semibold text-slate-600">
          {nameLabel}
        </label>
        <input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
        {name.length > 0 && !nameValid ? (
          <p className="mt-1 text-xs text-red-600">1〜{NAME_MAX_LENGTH}文字で入力してください</p>
        ) : null}
      </div>

      <div>
        <label htmlFor={amountInputId} className="mb-1 block text-xs font-semibold text-slate-600">
          {amountLabel}
        </label>
        <input
          id={amountInputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountDigits}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
        {amountDigits.length > 0 && !amountValid ? (
          <p className="mt-1 text-xs text-red-600">
            1〜{formatYen(MAX_AMOUNT)}の範囲で入力してください
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(name.trim(), amount)}
          className="min-h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:bg-slate-300"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
