import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../routes'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

/**
 * アプリの説明・データの扱い・注意事項（公開アプリとしての案内ページ）。
 *
 * オンボーディング前でも読めるよう、`RequireOnboarding`の外に置く。
 * 直接開かれた場合は戻る先の履歴がないため、ホームへ戻す（未完了ならオンボーディングへ誘導される）。
 */
export function AboutScreen() {
  const navigate = useNavigate()
  const location = useLocation()

  function handleBack() {
    // React Routerは、最初に開いた画面の location.key を 'default' にする。
    // その場合はこのアプリ内に戻る先がない（navigate(-1)だと外のサイトへ出てしまう）。
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate(ROUTES.home, { replace: true })
    }
  }

  return (
    <div className="min-h-dvh">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10">
        <button
          type="button"
          onClick={handleBack}
          className="mb-3 min-h-10 rounded-xl px-1 text-sm font-bold text-slate-500"
        >
          ← 戻る
        </button>
        <header className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">このアプリについて</h1>
          <p className="mt-1 text-sm text-slate-500">買う前に、ひと呼吸。</p>
        </header>

        <div className="space-y-4">
          <Section title="Loss Visualizerとは">
            <p>
              買うか迷っている数十秒に、一度だけ立ち止まるためのアプリです。家計簿ではありません。
            </p>
            <p>
              金額を入れると、その金額で手に入る「自分にとって価値のあるもの」と比べて見せます。やめた場合は、その金額を「守れたお金」として積み上げます。買うことも、あとで考えることも、同じように大切な選択です。
            </p>
          </Section>

          <Section title="データとプライバシー">
            <ul className="list-disc space-y-1 pl-5">
              <li>記録はすべて、この端末のブラウザの中（localStorage）だけに保存されます。</li>
              <li>入力した内容をサーバーへ送信することはありません。アカウント登録もありません。</li>
              <li>広告、アクセス解析、外部へのデータ提供はありません。</li>
              <li>
                サイトの配信にはVercelを使っています。配信のため、通常のWebサイトと同様にアクセスの記録（IPアドレスなど）がVercel側で扱われることがあります。
              </li>
              <li>
                別の端末やブラウザには引き継がれません。ブラウザのデータを消去すると記録も消えます。
              </li>
            </ul>
          </Section>

          <Section title="ホーム画面に追加すると便利です">
            <p>アプリのようにすぐ開けて、レジ前でも数秒で使えます。</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>iPhone（Safari）：共有ボタン →「ホーム画面に追加」</li>
              <li>Android（Chrome）：右上のメニュー →「ホーム画面に追加」</li>
            </ul>
            <p className="text-xs text-slate-500">
              iPhoneのSafariでは、サイトをしばらく（目安7日）開かないと、ブラウザがサイトの保存データを削除することがあります。ホーム画面に追加して使うと、この削除の対象になりにくくなります。
            </p>
          </Section>

          <Section title="表示についての注意">
            <ul className="list-disc space-y-1 pl-5">
              <li>「守れた金額」は、やめた買い物の金額の記録です。実際の預金残高ではありません。</li>
              <li>一般比較の価格は目安です。労働時間の換算は、登録した時給にもとづく概算です。</li>
              <li>このアプリは、投資や家計についての専門的な助言を行うものではありません。</li>
            </ul>
          </Section>
        </div>
      </main>
    </div>
  )
}
