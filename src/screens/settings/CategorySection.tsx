import { PROMPT_CATEGORIES } from '../../data/prompts'
import { ToggleRow } from '../../components/ToggleRow'
import { useAppState } from '../../store/useAppState'

/** 購入判断の選択肢から、使わないカテゴリを非表示にする（§19）。最低1つは表示が必要。 */
export function CategorySection() {
  const { data, toggleCategoryVisibility } = useAppState()
  const hiddenIds = data.settings.hiddenCategoryIds ?? []

  return (
    <section aria-label="カテゴリ設定" className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">カテゴリ設定</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        購入判断で使わないカテゴリを非表示にできます。最低1つは表示が必要です。過去の履歴には引き続き表示されます。
      </p>
      <div className="mt-3 divide-y divide-slate-100">
        {PROMPT_CATEGORIES.map((category) => (
          <ToggleRow
            key={category.id}
            label={category.name}
            checked={!hiddenIds.includes(category.id)}
            onChange={() => toggleCategoryVisibility(category.id)}
          />
        ))}
      </div>
    </section>
  )
}
