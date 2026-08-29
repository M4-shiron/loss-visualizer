import { useNavigate } from 'react-router-dom'
import { Placeholder } from '../components/Placeholder'
import { ROUTES } from '../routes'

/** 初回のみ表示する設定画面。1〜2分以内に終える構成にする。 */
export function OnboardingScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-10 pb-10">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            はじめる前に
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            1分ほどで終わります。あとから変更できます。
          </p>
        </header>

        <Placeholder
          loop={4}
          items={[
            '価値尺度を最低1件登録（候補から選択・自由追加）',
            '節約目標の登録（任意）',
            '通知設定（任意）',
          ]}
        />

        <button
          type="button"
          onClick={() => navigate(ROUTES.home)}
          className="mt-auto min-h-14 w-full rounded-2xl bg-slate-900 text-base font-bold text-white transition-transform active:scale-[0.98]"
        >
          ホームへ
        </button>
      </main>
    </div>
  )
}
