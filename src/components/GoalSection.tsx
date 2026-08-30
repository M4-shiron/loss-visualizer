import { goalProgressPercent } from '../domain/goals'
import type { Goal } from '../types/domain'
import { EditableListSection } from './EditableListSection'

type Props = {
  goals: Goal[]
  totalSavings: number
  onAdd: (title: string, targetAmount: number) => void
  onUpdate: (id: string, title: string, targetAmount: number) => void
  onRemove: (id: string) => void
  onSetPriority: (id: string | null) => void
}

/** 節約目標（§6）の一覧・追加・編集・削除・優先目標の切り替え。 */
export function GoalSection({
  goals,
  totalSavings,
  onAdd,
  onUpdate,
  onRemove,
  onSetPriority,
}: Props) {
  return (
    <EditableListSection
      ariaLabel="節約目標"
      title="節約目標"
      description="優先目標は0〜1件、自分で選べます"
      items={goals}
      nameLabel="目標名"
      amountLabel="目標額"
      getName={(goal) => goal.title}
      getAmount={(goal) => goal.targetAmount}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onRemove={onRemove}
      renderNameSuffix={(goal) =>
        goal.isPriority ? (
          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-sky-700">
            優先目標
          </span>
        ) : null
      }
      renderExtra={(goal) => {
        const percent = Math.round(goalProgressPercent(goal, totalSavings) * 10) / 10
        return (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-slate-500">達成率 {percent}%</p>
              {goal.isPriority ? (
                <button
                  type="button"
                  onClick={() => onSetPriority(null)}
                  className="text-xs font-medium text-slate-500 underline"
                >
                  優先目標を解除する
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetPriority(goal.id)}
                  className="text-xs font-medium text-sky-700 underline"
                >
                  優先目標にする
                </button>
              )}
            </div>
          </>
        )
      }}
    />
  )
}
