import { useEffect, useState } from 'react'
import { getCategoryName } from '../data/prompts'
import { isPending, pendingAmount } from '../domain/decisions'
import { formatYen } from '../domain/format'
import { needsPendingReminder } from '../domain/pending'
import { PURCHASE_REASON_OPTIONS } from '../domain/purchaseReason'
import { useAppState } from '../store/useAppState'
import type { Decision, PurchaseReason } from '../types/domain'

function hoursSince(createdAt: string, now: Date): number {
  return (now.getTime() - new Date(createdAt).getTime()) / (60 * 60 * 1000)
}

function formatElapsed(createdAt: string, now: Date): string {
  const hours = hoursSince(createdAt, now)
  if (hours < 1) return 'たった今'
  if (hours < 24) return `${Math.floor(hours)}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

/**
 * 保留（あとで考える）の一覧と再判断（§10, §16）。
 * 48時間経過した未対応の保留は、アプリ起動時とこの画面を開いたときにアーカイブする
 * （常時監視のタイマーは持たない）。
 */
export function PendingScreen() {
  const { data, resolvePending, archiveExpiredPending } = useAppState()
  const [reasoningId, setReasoningId] = useState<string | null>(null)

  useEffect(() => {
    archiveExpiredPending()
    // 画面を開いたときに一度だけ判定する。以後の継続監視はしない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = new Date()
  const pendingWithReminder = data.decisions
    .filter(isPending)
    .map((decision) => ({ decision, reminder: needsPendingReminder(decision, now) }))
  const ordered = [
    ...pendingWithReminder.filter((p) => p.reminder),
    ...pendingWithReminder.filter((p) => !p.reminder),
  ]
  const totalPending = pendingAmount(data.decisions)

  function handleSkip(id: string) {
    resolvePending(id, { outcome: 'skipped' })
    setReasoningId(null)
  }

  function handlePurchase(id: string, reason: PurchaseReason | undefined) {
    resolvePending(id, { outcome: 'purchased', purchaseReason: reason })
    setReasoningId(null)
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">保留中</h1>
        <p className="mt-1 text-sm text-slate-500">
          「あとで考える」を選んだもの。確定節約額には含まれません。
        </p>
        {pendingWithReminder.length > 0 ? (
          <p className="mt-2 text-sm font-bold text-slate-700">
            保留中の合計：{formatYen(totalPending)}
          </p>
        ) : null}
      </header>

      {ordered.length === 0 ? (
        <p className="text-sm text-slate-400">保留中の判断はありません。</p>
      ) : (
        <ul className="space-y-3">
          {ordered.map(({ decision, reminder }) => (
            <PendingItem
              key={decision.id}
              decision={decision}
              now={now}
              reminder={reminder}
              reasoningOpen={reasoningId === decision.id}
              onOpenReasoning={() => setReasoningId(decision.id)}
              onCloseReasoning={() => setReasoningId(null)}
              onSkip={() => handleSkip(decision.id)}
              onPurchase={(reason) => handlePurchase(decision.id, reason)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

type PendingItemProps = {
  decision: Decision
  now: Date
  reminder: boolean
  reasoningOpen: boolean
  onOpenReasoning: () => void
  onCloseReasoning: () => void
  onSkip: () => void
  onPurchase: (reason: PurchaseReason | undefined) => void
}

function PendingItem({
  decision,
  now,
  reminder,
  reasoningOpen,
  onOpenReasoning,
  onCloseReasoning,
  onSkip,
  onPurchase,
}: PendingItemProps) {
  return (
    <li
      className={`rounded-2xl border p-4 ${
        reminder ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white'
      }`}
    >
      {reminder ? (
        <p className="mb-2 text-xs font-bold text-amber-700">そろそろ決めませんか？</p>
      ) : null}

      <div className="flex items-start justify-between">
        <div>
          {decision.itemName ? (
            <p className="text-sm text-slate-500">{decision.itemName}</p>
          ) : null}
          <p className="text-2xl font-extrabold text-slate-900">{formatYen(decision.amount)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {getCategoryName(decision.categoryId)} ・ {formatElapsed(decision.createdAt, now)}
          </p>
        </div>
      </div>

      {reasoningOpen ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">よければ、理由を教えてください</p>
          {PURCHASE_REASON_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onPurchase(option.id)}
              className="block min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-700"
            >
              {option.label}
            </button>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCloseReasoning}
              className="min-h-10 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => onPurchase(undefined)}
              className="min-h-10 flex-1 rounded-xl bg-slate-800 text-sm font-bold text-white"
            >
              スキップして確定
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 flex-1 rounded-xl bg-emerald-700 text-sm font-bold text-white"
          >
            やめる
          </button>
          <button
            type="button"
            onClick={onOpenReasoning}
            className="min-h-11 flex-1 rounded-xl bg-slate-800 text-sm font-bold text-white"
          >
            買う
          </button>
        </div>
      )}
    </li>
  )
}
