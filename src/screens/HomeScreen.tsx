import { Link } from 'react-router-dom'
import { Placeholder } from '../components/Placeholder'
import { ROUTES } from '../routes'

/**
 * ホーム。最優先要素は「すぐ購入判断を開始できる大きな導線」。
 * 集計値の表示は第4ループで実装する。
 */
export function HomeScreen() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-slate-500">Loss Visualizer</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          買う前に、ひと呼吸。
        </h1>
      </header>

      <Link
        to={ROUTES.decide}
        className="flex min-h-28 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-lg font-bold text-white shadow-lg shadow-emerald-600/20 transition-transform active:scale-[0.98]"
      >
        買うか迷っている
      </Link>

      <div className="mt-6 space-y-4">
        <Placeholder
          loop={4}
          items={[
            '今月の確定節約額（最も強く表示する）',
            '総累計の確定節約額',
            '保留中の回避額',
            '優先目標への進捗',
            '今月・累計の思いとどまった回数',
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
