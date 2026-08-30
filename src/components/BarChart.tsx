export type BarDatum = {
  label: string
  value: number
}

type Props = {
  data: BarDatum[]
  ariaLabel: string
  formatValue: (value: number) => string
  emptyMessage?: string
}

/** グラフの内側の描画幅。375px画面で px-4（左右16px）のコンテナに収まる値。 */
const CHART_WIDTH = 327
const CHART_HEIGHT = 110
const LABEL_AREA_HEIGHT = 20
const MAX_BAR_WIDTH = 24
const BAR_GAP = 6
const BAR_COLOR = '#059669' // emerald-600。アプリ内で「確定節約額」に使っている色と揃える。
const GRIDLINE_COLOR = '#e1e0d9'
const BASELINE_COLOR = '#c3c2b7'

function roundedTopRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  if (height <= 0) return ''
  const r = Math.max(0, Math.min(radius, width / 2, height))
  return (
    `M${x + r},${y} ` +
    `L${x + width - r},${y} ` +
    `Q${x + width},${y} ${x + width},${y + r} ` +
    `L${x + width},${y + height} ` +
    `L${x},${y + height} ` +
    `L${x},${y + r} ` +
    `Q${x},${y} ${x + r},${y} Z`
  )
}

/**
 * 軽量な自作SVG棒グラフ。単一系列の大小比較専用（凡例は使わない。タイトルが系列を示す）。
 * 正確な数値は呼び出し側で別途一覧表示すること（アクセシブルな代替として、この関数はaria-labelに
 * 全データを文字列で埋め込む）。
 */
export function BarChart({ data, ariaLabel, formatValue, emptyMessage }: Props) {
  const hasValues = data.length > 0 && data.some((d) => d.value > 0)

  if (!hasValues) {
    return (
      <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-sm">
        {emptyMessage ?? 'データがありません。'}
      </p>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const slotWidth = CHART_WIDTH / data.length
  const barWidth = Math.max(4, Math.min(MAX_BAR_WIDTH, slotWidth - BAR_GAP))
  const plotHeight = CHART_HEIGHT - 10

  const fullAriaLabel = `${ariaLabel}。${data.map((d) => `${d.label} ${formatValue(d.value)}`).join('、')}`

  return (
    <svg
      role="img"
      aria-label={fullAriaLabel}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + LABEL_AREA_HEIGHT}`}
      width="100%"
      height={CHART_HEIGHT + LABEL_AREA_HEIGHT}
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={0} y1={4} x2={CHART_WIDTH} y2={4} stroke={GRIDLINE_COLOR} strokeWidth={1} />
      <text x={CHART_WIDTH} y={4} dy={-3} textAnchor="end" fontSize={9} className="fill-slate-400">
        {formatValue(maxValue)}
      </text>
      <line
        x1={0}
        y1={CHART_HEIGHT}
        x2={CHART_WIDTH}
        y2={CHART_HEIGHT}
        stroke={BASELINE_COLOR}
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * plotHeight
        const x = i * slotWidth + (slotWidth - barWidth) / 2
        const y = CHART_HEIGHT - barHeight
        return (
          <g key={`${d.label}-${i}`}>
            {barHeight > 0 ? (
              <path d={roundedTopRectPath(x, y, barWidth, barHeight, 4)} fill={BAR_COLOR} />
            ) : null}
            <text
              x={i * slotWidth + slotWidth / 2}
              y={CHART_HEIGHT + LABEL_AREA_HEIGHT - 6}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-500"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
