import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCategoryName, PROMPT_CATEGORIES } from '../../data/prompts'
import { effectiveDate } from '../../domain/decisions'
import { formatShortDate, formatYen } from '../../domain/format'
import { PURCHASE_REASON_OPTIONS, purchaseReasonLabel } from '../../domain/purchaseReason'
import { isValidAmount, MAX_AMOUNT, MAX_AMOUNT_DIGITS } from '../../domain/validation'
import { useAppState } from '../../store/useAppState'
import type { CategoryId, Decision, Outcome, PurchaseReason } from '../../types/domain'

type Filter = 'all' | 'skipped' | 'purchased' | 'pendingOrArchived'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'skipped', label: 'やめた' },
  { id: 'purchased', label: '買った' },
  { id: 'pendingOrArchived', label: '保留・アーカイブ' },
]

const FILTER_IDS = FILTERS.map((f) => f.id)

function isFilter(value: string | null): value is Filter {
  return value !== null && (FILTER_IDS as string[]).includes(value)
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  skipped: 'やめた',
  purchased: '買った',
  pending: '保留中',
}

function matchesFilter(decision: Decision, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'pendingOrArchived') return decision.outcome === 'pending'
  return decision.outcome === filter
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function monthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

/** 履歴の一覧・詳細・編集・削除（§13）。日付順（新しい順）に月別へグルーピングする。 */
export function RecordsTab() {
  const { data, updateDecision, removeDecision } = useAppState()
  const [searchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter')
  const [filter, setFilter] = useState<Filter>(isFilter(initialFilter) ? initialFilter : 'all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const filtered = useMemo(
    () => data.decisions.filter((d) => matchesFilter(d, filter)),
    [data.decisions, filter],
  )

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => effectiveDate(b).getTime() - effectiveDate(a).getTime(),
      ),
    [filtered],
  )

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: Decision[] }>()
    for (const decision of sorted) {
      const date = effectiveDate(decision)
      const key = monthKey(date)
      const group = map.get(key)
      if (group) {
        group.items.push(decision)
      } else {
        map.set(key, { label: monthLabel(date), items: [decision] })
      }
    }
    return [...map.values()]
  }, [sorted])

  function handleSaveEdit(id: string, fields: EditFields) {
    updateDecision(id, {
      amount: fields.amount,
      categoryId: fields.categoryId,
      itemName: fields.itemName || undefined,
      outcome: fields.outcome,
      purchaseReason: fields.outcome === 'purchased' ? fields.purchaseReason : undefined,
    })
    setEditingId(null)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`min-h-9 rounded-full border px-3 text-xs font-bold ${
              filter === f.id
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-400">
          {filter === 'all' ? '記録がありません。' : '該当する記録がありません。'}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-sm font-bold text-slate-500">{group.label}</h2>
              <ul className="space-y-2">
                {group.items.map((decision) => (
                  <li
                    key={decision.id}
                    className="rounded-2xl border border-slate-100 bg-white p-3.5"
                  >
                    {editingId === decision.id ? (
                      <DecisionEditForm
                        decision={decision}
                        onSave={(fields) => handleSaveEdit(decision.id, fields)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : confirmingDeleteId === decision.id ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-700">削除しますか？</span>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="min-h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600"
                          >
                            キャンセル
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeDecision(decision.id)
                              setConfirmingDeleteId(null)
                            }}
                            className="min-h-8 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white"
                          >
                            削除する
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedId((current) => (current === decision.id ? null : decision.id))
                        }
                        onKeyDown={(e) => {
                          // 内側の「編集」「削除」上でのキー操作は、そのボタン自身に任せる。
                          // ここで拾ってpreventDefaultすると、ボタン本来のクリック生成まで
                          // 打ち消してしまい、キーボードから編集・削除ができなくなる。
                          if (e.target !== e.currentTarget) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setExpandedId((current) => (current === decision.id ? null : decision.id))
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {decision.itemName || getCategoryName(decision.categoryId)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatShortDate(effectiveDate(decision))} ・{' '}
                              {getCategoryName(decision.categoryId)} ・{' '}
                              {OUTCOME_LABEL[decision.outcome]}
                              {decision.outcome === 'pending' && decision.archivedAt
                                ? '（アーカイブ済み）'
                                : ''}
                            </p>
                          </div>
                          <p className="text-lg font-extrabold text-slate-900">
                            {formatYen(decision.amount)}
                          </p>
                        </div>

                        {expandedId === decision.id ? (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            {decision.purchaseReason ? (
                              <p className="text-xs text-slate-500">
                                理由：{purchaseReasonLabel(decision.purchaseReason)}
                              </p>
                            ) : null}
                            <div className="mt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingId(decision.id)
                                }}
                                className="min-h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmingDeleteId(decision.id)
                                }}
                                className="min-h-8 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-600"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

type EditFields = {
  amount: number
  categoryId: CategoryId
  itemName: string
  outcome: Outcome
  purchaseReason: PurchaseReason | undefined
}

type DecisionEditFormProps = {
  decision: Decision
  onSave: (fields: EditFields) => void
  onCancel: () => void
}

function DecisionEditForm({ decision, onSave, onCancel }: DecisionEditFormProps) {
  const [amountDigits, setAmountDigits] = useState(String(decision.amount))
  const [categoryId, setCategoryId] = useState<CategoryId>(decision.categoryId)
  const [itemName, setItemName] = useState(decision.itemName ?? '')
  const [outcome, setOutcome] = useState<Outcome>(decision.outcome)
  const [purchaseReason, setPurchaseReason] = useState<PurchaseReason | undefined>(
    decision.purchaseReason,
  )

  const amount = Number(amountDigits || '0')
  const amountValid = isValidAmount(amount)
  const showAmountError = amountDigits.length > 0 && !amountValid
  const amountErrorId = useId()

  function handleAmountChange(rawValue: string) {
    setAmountDigits(rawValue.replace(/[^0-9]/g, '').slice(0, MAX_AMOUNT_DIGITS))
  }

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">金額</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountDigits}
          onChange={(e) => handleAmountChange(e.target.value)}
          aria-invalid={showAmountError}
          aria-describedby={showAmountError ? amountErrorId : undefined}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
        {showAmountError ? (
          <p id={amountErrorId} className="mt-1 text-xs text-red-600">
            1〜{formatYen(MAX_AMOUNT)}の範囲で入力してください
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">カテゴリ</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value as CategoryId)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        >
          {PROMPT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">商品名（任意）</label>
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">判断結果</label>
        <div className="flex gap-2">
          {(['skipped', 'purchased', 'pending'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOutcome(value)}
              aria-pressed={outcome === value}
              className={`min-h-9 flex-1 rounded-xl border text-xs font-bold ${
                outcome === value
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {OUTCOME_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {outcome === 'purchased' ? (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">理由（任意）</label>
          <select
            value={purchaseReason ?? ''}
            onChange={(e) =>
              setPurchaseReason((e.target.value || undefined) as PurchaseReason | undefined)
            }
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">選択しない</option>
            {PURCHASE_REASON_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!amountValid}
          onClick={() => onSave({ amount, categoryId, itemName, outcome, purchaseReason })}
          className="min-h-11 flex-1 rounded-xl bg-emerald-700 text-sm font-bold text-white disabled:bg-slate-300"
        >
          保存する
        </button>
      </div>
    </div>
  )
}
