import { Link } from 'react-router-dom'
import { GoalSection } from '../components/GoalSection'
import { ScreenHeader } from '../components/ScreenHeader'
import { ValueItemSection } from '../components/ValueItemSection'
import { totalConfirmedSavings } from '../domain/decisions'
import { planOf } from '../domain/entitlement'
import { ArchiveSection } from './settings/ArchiveSection'
import { CategorySection } from './settings/CategorySection'
import { DataResetSection } from './settings/DataResetSection'
import { HourlyWageSection } from './settings/HourlyWageSection'
import { NotificationSection } from './settings/NotificationSection'
import { ProSection } from './settings/ProSection'
import { ROUTES } from '../routes'
import { useAppState } from '../store/useAppState'

export function SettingsScreen() {
  const { data, addValueItem, updateValueItem, removeValueItem, addGoal, updateGoal, removeGoal, setPriorityGoal } =
    useAppState()

  const totalSavings = totalConfirmedSavings(data.decisions)
  const isPro = planOf(data.settings) === 'pro'

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

        <ProSection />
        {/* 労働時間換算はPro側の機能なので、無料では設定項目を出さない。ただし
            すでに時給を登録している場合は、本人が確認・削除できるよう残す。 */}
        {isPro || data.settings.hourlyWage !== undefined ? <HourlyWageSection /> : null}
        <NotificationSection />
        <CategorySection />
        <ArchiveSection />
        <DataResetSection />
        <Link
          to={ROUTES.about}
          className="block rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 shadow-sm"
        >
          このアプリについて・データの扱い
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            記録の保存先、ホーム画面への追加方法、表示についての注意
          </span>
        </Link>
      </div>
    </>
  )
}
