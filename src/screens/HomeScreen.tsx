import { Link } from 'react-router-dom'
import { StatTile } from '../components/StatTile'
import { monthKeyOf, previousMonthSavings, previousWeekSavings, weekKey } from '../domain/analytics'
import {
  monthlyConfirmedSavings,
  monthlySkipCount,
  pendingAmount,
  totalConfirmedSavings,
  totalSkipCount,
} from '../domain/decisions'
import { formatYen } from '../domain/format'
import { findPriorityGoal, goalProgressPercent } from '../domain/goals'
import { needsPendingReminder } from '../domain/pending'
import { ROUTES } from '../routes'
import { useAppState } from '../store/useAppState'

/**
 * ホーム。最優先要素は「今月の確定節約額」と「すぐ購入判断を開始できる導線」で、
 * これらはファーストビューに収める。その他の集計・目標情報は縦スクロールを許容する（§12）。
 */
export function HomeScreen() {
  const { data, dismissWeeklySummary, dismissMonthlySummary } = useAppState()
  const now = new Date()

  const monthlySavings = monthlyConfirmedSavings(data.decisions, now)
  const totalSavings = totalConfirmedSavings(data.decisions)
  const pending = pendingAmount(data.decisions)
  const monthlyCount = monthlySkipCount(data.decisions, now)
  const totalCount = totalSkipCount(data.decisions)
  const priorityGoal = findPriorityGoal(data.goals)
  const hasAnyDecision = data.decisions.length > 0

  const pendingNeedingReminder = data.decisions.filter((d) => needsPendingReminder(d, now)).length
  const showPendingReminder = data.settings.notifications.pendingReminder && pendingNeedingReminder > 0

  const currentWeekKey = weekKey(now)
  const showWeeklySummary =
    data.settings.notifications.weeklySummary &&
    data.settings.lastDismissedWeeklySummaryWeek !== currentWeekKey
  const lastWeekSavings = previousWeekSavings(data.decisions, now)

  const currentMonthKey = monthKeyOf(now)
  const showMonthlySummary =
    data.settings.notifications.monthlySummary &&
    data.settings.lastDismissedMonthlySummaryMonth !== currentMonthKey
  const lastMonthSavings = previousMonthSavings(data.decisions, now)

  return (
    <>
      <header className="mb-4">
        <p className="text-sm text-slate-500">Loss Visualizer</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          買う前に、ひと呼吸。
        </h1>
      </header>

      {/* ファーストビュー: 今月の確定節約額 + 購入判断への導線 */}
      <section className="rounded-2xl bg-emerald-700 px-5 py-5 text-white shadow-lg shadow-emerald-700/20">
        <p className="text-xs font-medium text-emerald-50">今月、守れた金額</p>
        <p className="mt-1 text-4xl font-extrabold">{formatYen(monthlySavings)}</p>
        {!hasAnyDecision ? (
          <p className="mt-2 text-xs text-emerald-50">
            まだ記録がありません。最初の判断をしてみましょう。
          </p>
        ) : null}
      </section>

      <Link
        to={ROUTES.decide}
        className="mt-3 flex min-h-16 w-full items-center justify-center rounded-2xl bg-slate-900 px-6 text-lg font-bold text-white shadow-md transition-transform active:scale-[0.98]"
      >
        買うか迷っている
      </Link>

      <div className="mt-6 space-y-4">
        {showPendingReminder ? (
          <Link
            to={ROUTES.pending}
            className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
          >
            <span className="text-sm font-bold text-amber-800">
              保留リマインダー：{pendingNeedingReminder}件、そろそろ決めませんか？
            </span>
            <span className="text-amber-600" aria-hidden="true">
              ›
            </span>
          </Link>
        ) : null}

        {showWeeklySummary ? (
          <SummaryCard
            title="週次まとめ"
            message={`先週は${formatYen(lastWeekSavings)}守れました。`}
            onClose={dismissWeeklySummary}
          />
        ) : null}

        {showMonthlySummary ? (
          <SummaryCard
            title="月次まとめ"
            message={`先月は${formatYen(lastMonthSavings)}守れました。`}
            onClose={dismissMonthlySummary}
          />
        ) : null}

        {priorityGoal ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-900">{priorityGoal.title}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-600"
                style={{ width: `${goalProgressPercent(priorityGoal, totalSavings)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{`達成率 ${
              Math.round(goalProgressPercent(priorityGoal, totalSavings) * 10) / 10
            }%（目標 ${formatYen(priorityGoal.targetAmount)}）`}</p>
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="総累計の節約額" value={formatYen(totalSavings)} />
          <StatTile label="保留中の回避額" value={formatYen(pending)} />
          <StatTile label="今月、思いとどまった回数" value={`${monthlyCount}回`} />
          <StatTile label="累計、思いとどまった回数" value={`${totalCount}回`} />
        </div>
      </div>
    </>
  )
}

type SummaryCardProps = {
  title: string
  message: string
  onClose: () => void
}

/** 週次・月次まとめのカード。アプリ内表示であり、OSの通知ではない。 */
function SummaryCard({ title, message, onClose }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-sky-700">{title}</p>
          <p className="mt-0.5 text-sm font-bold text-sky-900">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`${title}を閉じる`}
          className="text-sky-500"
        >
          ×
        </button>
      </div>
    </div>
  )
}
