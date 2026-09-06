import { ToggleRow } from '../../components/ToggleRow'
import { FEATURE_LABELS, planOf, PRO_FEATURE_IDS } from '../../domain/entitlement'
import { useAppState } from '../../store/useAppState'

/**
 * Proプレビューの切り替え（改善方針4）。
 *
 * 課金は存在しない。将来の無料/Pro境界を実際に動かして確かめるための切り替えであり、
 * ここで支払いは一切発生しない。表示する内容は`entitlement.ts`の対応表から作るため、
 * 境界を変えれば自動で追従する。
 */
export function ProSection() {
  const { data, setProPreview } = useAppState()
  const isPro = planOf(data.settings) === 'pro'

  return (
    <section aria-label="Proプレビュー" className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Proプレビュー（準備中）</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        将来のProで追加を検討している機能を、いまだけ自由に試せます。支払いはありません。
      </p>
      <div className="mt-3 border-t border-slate-100">
        <ToggleRow
          label="Proの機能を有効にする"
          description="OFFのときは無料版と同じ内容になります"
          checked={isPro}
          onChange={() => setProPreview(!isPro)}
        />
      </div>
      <ul className="mt-2 space-y-1">
        {PRO_FEATURE_IDS.map((id) => (
          <li key={id} className="text-xs text-slate-500">
            ・{FEATURE_LABELS[id]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        購入判断そのもの、価値尺度・目標を使った問いかけ、履歴の記録と振り返り、グラフ、実績、保留は、今後も無料のままにする予定です。
      </p>
    </section>
  )
}
