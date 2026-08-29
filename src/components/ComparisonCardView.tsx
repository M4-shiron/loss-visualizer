import type { ComparisonCard } from '../domain/comparisonCard'

const KIND_LABEL: Record<ComparisonCard['kind'], string> = {
  valueItem: 'あなたの価値尺度',
  goal: '節約目標',
  general: '目安',
}

const KIND_ACCENT: Record<ComparisonCard['kind'], string> = {
  valueItem: 'border-emerald-200 bg-emerald-50',
  goal: 'border-sky-200 bg-sky-50',
  general: 'border-slate-200 bg-white',
}

type Props = {
  card: ComparisonCard
}

export function ComparisonCardView({ card }: Props) {
  return (
    <div className={`rounded-2xl border p-3.5 ${KIND_ACCENT[card.kind]}`}>
      <p className="text-xs font-medium text-slate-500">{KIND_LABEL[card.kind]}</p>
      <p className="mt-0.5 text-[15px] font-bold text-slate-900">{card.text}</p>
      {card.subtext ? <p className="mt-0.5 text-xs text-slate-600">{card.subtext}</p> : null}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
        <div
          className="h-full rounded-full bg-slate-900/70 transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, card.progressPercent))}%` }}
        />
      </div>
    </div>
  )
}
