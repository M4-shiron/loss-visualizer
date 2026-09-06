import { useId, useState } from 'react'
import { planOf } from '../../domain/entitlement'
import { formatYen } from '../../domain/format'
import { isValidAmount, MAX_AMOUNT_DIGITS } from '../../domain/validation'
import { useAppState } from '../../store/useAppState'

/**
 * 概算の時給（任意）の登録・変更・削除（改善方針3）。
 * 登録すると、購入判断のときに金額を「約◯時間働いた分」として見せる。未登録なら一切表示しない。
 *
 * 労働時間換算はPro側の機能（改善方針4）だが、無料に切り替えたあとも
 * 登録済みの値は本人が確認・削除できるようにする。自分が入れた値を
 * 消せない状態にはしない。
 */
export function HourlyWageSection() {
  const { data, updateHourlyWage } = useAppState()
  const hourlyWage = data.settings.hourlyWage
  const isPro = planOf(data.settings) === 'pro'

  const [editing, setEditing] = useState(false)
  const [digits, setDigits] = useState('')
  const inputId = useId()

  const amount = Number(digits || '0')
  const canSave = isValidAmount(amount)

  function startEditing() {
    setDigits(hourlyWage !== undefined ? String(hourlyWage) : '')
    setEditing(true)
  }

  function handleSave() {
    if (!canSave) return
    updateHourlyWage(amount)
    setEditing(false)
  }

  function handleClear() {
    updateHourlyWage(undefined)
    setEditing(false)
  }

  return (
    <section aria-label="時給の目安" className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">時給の目安（任意）</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        {isPro
          ? '登録すると、買おうとしている金額を「約◯時間働いた分」として見せます。概算で構いません。'
          : '無料版では使いません。Proプレビューを有効にすると、また「約◯時間働いた分」の表示に使われます。'}
      </p>

      {!isPro ? (
        hourlyWage !== undefined ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{formatYen(hourlyWage)} / 時間</p>
            <button
              type="button"
              onClick={handleClear}
              className="min-h-8 shrink-0 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600"
            >
              削除
            </button>
          </div>
        ) : null
      ) : editing ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={inputId} className="sr-only">
            時給の目安
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={digits}
            onChange={(e) =>
              setDigits(e.target.value.replace(/[^0-9]/g, '').slice(0, MAX_AMOUNT_DIGITS))
            }
            placeholder="例：1200"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-9 flex-1 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-600"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="min-h-9 flex-1 rounded-xl bg-emerald-700 text-xs font-bold text-white disabled:bg-slate-300"
            >
              保存する
            </button>
          </div>
        </div>
      ) : hourlyWage !== undefined ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">{formatYen(hourlyWage)} / 時間</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startEditing}
              className="min-h-8 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600"
            >
              編集
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="min-h-8 shrink-0 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="mt-3 min-h-9 w-full rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-600"
        >
          ＋時給を登録する
        </button>
      )}
    </section>
  )
}
