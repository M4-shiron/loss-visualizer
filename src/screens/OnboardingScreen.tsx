import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NameAmountForm } from '../components/NameAmountForm'
import { formatYen } from '../domain/format'
import { ROUTES } from '../routes'
import { useAppState } from '../store/useAppState'

type Candidate = { name: string; price: number }

/** 初回オンボーディングの価値尺度候補（§5, §17）。 */
const VALUE_ITEM_CANDIDATES: Candidate[] = [
  { name: 'コンビニのお昼', price: 600 },
  { name: 'カフェでゆっくり', price: 1000 },
  { name: '映画', price: 2000 },
  { name: '焼肉', price: 4000 },
  { name: 'ゲームソフト', price: 7000 },
  { name: 'ライブ', price: 12000 },
  { name: 'イヤホン', price: 20000 },
  { name: '旅行', price: 30000 },
]

type Step = 'valueItems' | 'goal'

/**
 * 初回のみ表示する設定画面。1〜2分以内に終える構成にする（§17）。
 * 価値尺度は最低1件が必須、節約目標は任意でスキップできる。
 * すべての登録は最後（完了時）にまとめて保存する。
 */
export function OnboardingScreen() {
  const navigate = useNavigate()
  const { addValueItem, addGoal, setPriorityGoal, completeOnboarding } = useAppState()

  const [step, setStep] = useState<Step>('valueItems')
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [customItems, setCustomItems] = useState<Candidate[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)

  const selectedCount = selectedCandidates.size + customItems.length
  const canProceed = selectedCount >= 1

  function toggleCandidate(name: string) {
    setSelectedCandidates((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function removeCustomItem(index: number) {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }

  function finishOnboarding(goal?: { title: string; targetAmount: number }) {
    const allItems: Candidate[] = [
      ...VALUE_ITEM_CANDIDATES.filter((c) => selectedCandidates.has(c.name)),
      ...customItems,
    ]
    for (const item of allItems) {
      addValueItem({ name: item.name, price: item.price })
    }
    if (goal) {
      const created = addGoal(goal)
      setPriorityGoal(created.id)
    }
    completeOnboarding()
    navigate(ROUTES.home, { replace: true })
  }

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-10 pb-10">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">はじめる前に</h1>
          <p className="mt-1 text-sm text-slate-500">
            1分ほどで終わります。あとから変更できます。
          </p>
        </header>

        {step === 'valueItems' ? (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 text-sm font-bold text-slate-900">
              お金を払う価値があると思うものを選んでください
            </h2>
            <p className="mb-3 text-xs text-slate-500">最低1つ選ぶと次に進めます</p>

            <div className="grid grid-cols-2 gap-2">
              {VALUE_ITEM_CANDIDATES.map((candidate) => {
                const selected = selectedCandidates.has(candidate.name)
                return (
                  <button
                    key={candidate.name}
                    type="button"
                    onClick={() => toggleCandidate(candidate.name)}
                    aria-pressed={selected}
                    className={`min-h-16 rounded-2xl border-2 px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${selected ? 'text-emerald-700' : 'text-slate-700'}`}
                    >
                      {candidate.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatYen(candidate.price)}</p>
                  </button>
                )
              })}
            </div>

            {customItems.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {customItems.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">
                      {item.name}（{formatYen(item.price)}）
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomItem(index)}
                      aria-label={`${item.name}を削除`}
                      className="text-xs font-medium text-red-600 underline"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3">
              {showCustomForm ? (
                <NameAmountForm
                  nameLabel="名前"
                  amountLabel="金額"
                  submitLabel="追加する"
                  onSubmit={(name, price) => {
                    setCustomItems((prev) => [...prev, { name, price }])
                    setShowCustomForm(false)
                  }}
                  onCancel={() => setShowCustomForm(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600"
                >
                  ＋自由に追加
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep('goal')}
              disabled={!canProceed}
              className="mt-auto min-h-14 w-full rounded-2xl bg-slate-900 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300"
            >
              次へ（{selectedCount}件選択中）
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 text-sm font-bold text-slate-900">節約目標（任意）</h2>
            <p className="mb-3 text-xs text-slate-500">
              あとから追加・変更できます。スキップしても大丈夫です。
            </p>

            <NameAmountForm
              nameLabel="目標名"
              amountLabel="目標額"
              submitLabel="登録して完了する"
              cancelLabel="スキップして完了する"
              onSubmit={(title, targetAmount) => finishOnboarding({ title, targetAmount })}
              onCancel={() => finishOnboarding()}
            />
          </div>
        )}
      </main>
    </div>
  )
}
