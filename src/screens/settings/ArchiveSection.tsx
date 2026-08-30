import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { useAppState } from '../../store/useAppState'

/** アーカイブ済みの保留を、履歴画面の「保留・アーカイブ」絞り込みへ導線する（§19）。 */
export function ArchiveSection() {
  const { data } = useAppState()
  const archivedCount = data.decisions.filter((d) => d.archivedAt !== undefined).length

  return (
    <section aria-label="アーカイブの確認" className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">アーカイブの確認</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        48時間、対応しなかった保留はアーカイブされます。現在{archivedCount}件。
      </p>
      <Link
        to={`${ROUTES.history}?filter=pendingOrArchived`}
        className="mt-3 inline-block text-sm font-bold text-emerald-700 underline"
      >
        履歴で確認する
      </Link>
    </section>
  )
}
