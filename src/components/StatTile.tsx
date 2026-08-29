type Props = {
  label: string
  value: string
}

/** ホームの小さな集計タイル。 */
export function StatTile({ label, value }: Props) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}
