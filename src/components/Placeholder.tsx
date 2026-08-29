type Props = {
  /** この画面を実装する開発ループの番号 */
  loop: number
  items: string[]
}

/**
 * 未実装画面の中身を示す仮表示。
 * 実装済みに見せかけないよう、担当ループと予定内容を明示する。
 */
export function Placeholder({ loop, items }: Props) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        第{loop}ループで実装予定
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">・</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
