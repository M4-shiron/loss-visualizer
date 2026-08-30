import { BarChart } from '../../components/BarChart'
import { StatTile } from '../../components/StatTile'
import {
  lockedAchievementLabel,
  lockedAchievements,
  achievementLabel,
} from '../../domain/achievements'
import { categoryBreakdown, savingsByMonth, valueItemProgress } from '../../domain/analytics'
import {
  monthlyConfirmedSavings,
  monthlySkipCount,
  totalConfirmedSavings,
  totalSkipCount,
} from '../../domain/decisions'
import { formatShortDate, formatYen } from '../../domain/format'
import { goalProgressPercent } from '../../domain/goals'
import { useAppState } from '../../store/useAppState'

/** 履歴画面の「振り返り」タブ。時系列・カテゴリ別グラフ、到達度、実績（§14, §15）。 */
export function InsightsTab() {
  const { data } = useAppState()
  const now = new Date()

  const monthlyAmount = monthlyConfirmedSavings(data.decisions, now)
  const totalAmount = totalConfirmedSavings(data.decisions)
  const monthlyCount = monthlySkipCount(data.decisions, now)
  const totalCount = totalSkipCount(data.decisions)

  const monthly = savingsByMonth(data.decisions, now, 6)
  const categories = categoryBreakdown(data.decisions)
  const categoryChartData = categories.filter((c) => c.confirmedAmount > 0)

  const valueProgress = valueItemProgress(data.valueItems, totalAmount)

  const unlocked = [...data.achievements].sort(
    (a, b) => new Date(a.unlockedAt).getTime() - new Date(b.unlockedAt).getTime(),
  )
  const locked = lockedAchievements(data.achievements, totalAmount, totalCount).sort(
    (a, b) => a.remaining - b.remaining,
  )

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <StatTile label="今月の確定節約額" value={formatYen(monthlyAmount)} />
        <StatTile label="総累計の確定節約額" value={formatYen(totalAmount)} />
        <StatTile label="今月、思いとどまった回数" value={`${monthlyCount}回`} />
        <StatTile label="累計、思いとどまった回数" value={`${totalCount}回`} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">月別の確定節約額（直近6か月）</h2>
        <BarChart
          data={monthly.map((m) => ({ label: m.label, value: m.amount }))}
          ariaLabel="月別の確定節約額"
          formatValue={formatYen}
          emptyMessage="まだ確定した節約がありません。"
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">カテゴリ別の確定節約額</h2>
        <BarChart
          data={categoryChartData.map((c) => ({ label: c.categoryName, value: c.confirmedAmount }))}
          ariaLabel="カテゴリ別の確定節約額"
          formatValue={formatYen}
          emptyMessage="まだ確定した節約がありません。"
        />
        {categories.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-xl bg-white p-3 shadow-sm">
            {categories.map((c) => (
              <li key={c.categoryId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.categoryName}</span>
                <span className="text-xs text-slate-500">
                  確定{formatYen(c.confirmedAmount)}
                  {c.pendingAmountValue > 0 ? ` ・ 保留${formatYen(c.pendingAmountValue)}` : ''}
                  （{c.count}件）
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {data.valueItems.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-900">価値尺度への到達度</h2>
          <ul className="space-y-2">
            {valueProgress.map(({ item, multiplier }) => (
              <li key={item.id} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {multiplier >= 1
                    ? `累計で${item.name}の${multiplier}倍`
                    : `${item.name}まで、あと${formatYen(Math.max(0, item.price - totalAmount))}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.goals.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-900">目標への到達度</h2>
          <ul className="space-y-2">
            {data.goals.map((goal) => {
              const percent = Math.round(goalProgressPercent(goal, totalAmount) * 10) / 10
              return (
                <li key={goal.id} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{goal.title}</p>
                    <p className="text-xs text-slate-500">達成率 {percent}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-900">実績</h2>
        {/*
          unlocked と locked は常に実績の全種類（11件）を分け合う関係にあり、
          両方0件になることはない。「実績がありません」の空状態は用意しない。
        */}
        <ul className="space-y-2">
          {unlocked.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <span className="text-sm font-bold text-amber-800">{achievementLabel(a.kind)}</span>
              <span className="text-xs text-amber-700">
                {formatShortDate(new Date(a.unlockedAt))} 達成
              </span>
            </li>
          ))}
          {locked.map((l) => (
            <li
              key={`${l.kind.type}-${l.kind.threshold}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3"
            >
              <span className="text-sm text-slate-500">{lockedAchievementLabel(l)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
