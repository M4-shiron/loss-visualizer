import { useNavigate } from 'react-router-dom'
import { Placeholder } from '../components/Placeholder'

/**
 * 購入判断フロー。入力→問いかけ→損失可視化→判断→結果を
 * この1画面の内部ステップとして進める（画面を細分化しない）。
 */
export function DecideScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10">
        <header className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm"
            aria-label="前の画面へ戻る"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            購入判断
          </h1>
        </header>

        <Placeholder
          loop={3}
          items={[
            'カテゴリ選択（8カテゴリ）',
            'おおよその金額入力・商品名は任意',
            'カテゴリ別の問いかけをランダム表示',
            '価値尺度・目標・一般比較による損失の可視化',
            '「やめる」「買う」「あとで考える」の3択',
            '判断結果のフィードバック表示',
          ]}
        />
      </main>
    </div>
  )
}
