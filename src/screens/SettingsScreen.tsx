import { Link } from 'react-router-dom'
import { GoalSection } from '../components/GoalSection'
import { Placeholder } from '../components/Placeholder'
import { ScreenHeader } from '../components/ScreenHeader'
import { ValueItemSection } from '../components/ValueItemSection'
import { totalConfirmedSavings } from '../domain/decisions'
import { ROUTES } from '../routes'
import { useAppState } from '../store/useAppState'

export function SettingsScreen() {
  const { data, addValueItem, updateValueItem, removeValueItem, addGoal, updateGoal, removeGoal, setPriorityGoal } =
    useAppState()

  const totalSavings = totalConfirmedSavings(data.decisions)

  return (
    <>
      <ScreenHeader title="設定" />
      <div className="space-y-4">
        <ValueItemSection
          valueItems={data.valueItems}
          onAdd={(name, price) => addValueItem({ name, price })}
          onUpdate={(id, name, price) => updateValueItem(id, { name, price })}
          onRemove={removeValueItem}
        />

        <GoalSection
          goals={data.goals}
          totalSavings={totalSavings}
          onAdd={(title, targetAmount) => addGoal({ title, targetAmount })}
          onUpdate={(id, title, targetAmount) => updateGoal(id, { title, targetAmount })}
          onRemove={removeGoal}
          onSetPriority={setPriorityGoal}
        />

        <Placeholder
          loop={7}
          items={[
            '通知設定（保留・週次・月次）',
            'カテゴリ設定',
            'アーカイブの確認',
            '全データのリセット',
          ]}
        />
        <p className="text-center text-xs text-slate-400">
          <Link to={ROUTES.onboarding} className="underline">
            初回設定の画面を確認する
          </Link>
        </p>
      </div>
    </>
  )
}
