import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComparisonCardView } from '../components/ComparisonCardView'
import { achievementLabel } from '../domain/achievements'
import type { ComparisonCard } from '../domain/comparisonCard'
import { buildComparisonCards } from '../domain/comparison'
import { planOf } from '../domain/entitlement'
import { totalConfirmedSavings } from '../domain/decisions'
import { formatYen } from '../domain/format'
import { findPriorityGoal, goalProgressPercent } from '../domain/goals'
import { buildIntervention } from '../domain/intervention'
import { PURCHASE_REASON_OPTIONS, purchaseReasonLabel } from '../domain/purchaseReason'
import { MAX_AMOUNT_DIGITS } from '../domain/validation'
import { pickRandomPrompt, visibleCategories, type PromptCategory } from '../data/prompts'
import { useCountUp } from '../hooks/useCountUp'
import type { RecordDecisionResult } from '../store/context'
import { useAppState } from '../store/useAppState'
import type { CategoryId, Goal, Outcome, PurchaseReason } from '../types/domain'
import { ROUTES } from '../routes'

type Step = 'input' | 'judge' | 'purchaseReason' | 'result'

/**
 * 購入判断フロー。入力→問いかけ→損失可視化→判断→結果を
 * この1画面の内部ステップとして進める（画面を細分化しない）。
 */
export function DecideScreen() {
  const navigate = useNavigate()
  const { data, recordDecision } = useAppState()
  const categories = visibleCategories(data.settings.hiddenCategoryIds ?? [])

  const [step, setStep] = useState<Step>('input')
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null)
  const [amountDigits, setAmountDigits] = useState('')
  const [itemName, setItemName] = useState('')

  const [prompt, setPrompt] = useState<string | undefined>(undefined)
  const [comparisonCards, setComparisonCards] = useState<ComparisonCard[]>([])
  const [savingsBeforeThisDecision, setSavingsBeforeThisDecision] = useState(0)
  const [result, setResult] = useState<RecordDecisionResult | null>(null)

  // 連続タップで記録が二重に呼ばれるのを防ぐ。1回のマウント中は一度きり。
  const hasFinalizedRef = useRef(false)

  const amount = Number(amountDigits || '0')
  const canProceedToJudge = categoryId !== null && amount >= 1

  function handleAmountChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/[^0-9]/g, '').slice(0, MAX_AMOUNT_DIGITS)
    setAmountDigits(digitsOnly)
  }

  function goToJudge() {
    if (!canProceedToJudge || categoryId === null) return
    const beforeTotal = totalConfirmedSavings(data.decisions)
    setSavingsBeforeThisDecision(beforeTotal)
    const plan = planOf(data.settings)
    // ユーザー自身のデータを使った代替提案を優先し、作れないときだけ
    // 抽象的な問いかけへフォールバックする（改善方針1）。
    const intervention = buildIntervention({
      amount,
      categoryId,
      valueItems: data.valueItems,
      goals: data.goals,
      decisions: data.decisions,
      now: new Date(),
      hourlyWage: data.settings.hourlyWage,
      plan,
    })
    setPrompt(intervention?.text ?? pickRandomPrompt(categoryId))
    setComparisonCards(
      buildComparisonCards({
        amount,
        valueItems: data.valueItems,
        goals: data.goals,
        totalSavings: beforeTotal,
        hourlyWage: data.settings.hourlyWage,
        plan,
      }),
    )
    setStep('judge')
  }

  function chooseOutcome(outcome: Outcome) {
    if (outcome === 'purchased') {
      setStep('purchaseReason')
      return
    }
    finalizeDecision(outcome, undefined)
  }

  function finalizeDecision(outcome: Outcome, purchaseReason: PurchaseReason | undefined) {
    if (categoryId === null) return
    if (hasFinalizedRef.current) return
    hasFinalizedRef.current = true
    const recorded = recordDecision({
      amount,
      categoryId,
      itemName: itemName.trim() || undefined,
      outcome,
      purchaseReason,
    })
    setResult(recorded)
    setStep('result')
  }

  function handleBack() {
    if (step === 'judge') {
      setStep('input')
    } else if (step === 'purchaseReason') {
      setStep('judge')
    } else {
      navigate(-1)
    }
  }

  /**
   * 判断結果の読み上げ用テキスト。
   *
   * ライブリージョンは「先に存在していて、あとから中身が変わる」ときに読み上げられる。
   * 中身ごと新しく挿入された領域は読み上げられないため、この領域は常に描画しておき、
   * 結果が出た時点でテキストだけを差し込む。
   */
  const resultAnnouncement =
    step === 'result' && result
      ? result.decision.outcome === 'skipped'
        ? `守れました。${formatYen(amount)}。ナイス判断です。`
        : result.decision.outcome === 'purchased'
          ? `記録しました。${formatYen(amount)}。`
          : `保留にしました。${formatYen(amount)}。24時間後に、もう一度確認します。`
      : ''

  const hasHero = step === 'judge' || (step === 'result' && result?.decision.outcome === 'skipped')

  return (
    <div className="flex min-h-dvh flex-col">
      <div role="status" aria-live="polite" className="sr-only">
        {resultAnnouncement}
      </div>

      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        {step !== 'result' ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex size-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm"
            aria-label="前の画面へ戻る"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="size-10" aria-hidden="true" />
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900">購入判断</h1>
      </header>

      {step === 'judge' ? (
        <JudgeHero amount={amount} itemName={itemName} prompt={prompt} />
      ) : null}
      {step === 'result' && result?.decision.outcome === 'skipped' ? (
        <RewardHero amount={amount} />
      ) : null}

      <main
        className={`mx-auto w-full max-w-md flex-1 px-4 ${hasHero ? 'pt-5' : ''} ${step === 'judge' ? 'pb-64' : 'pb-10'}`}
      >
        {step === 'input' ? (
          <InputStep
            categories={categories}
            categoryId={categoryId}
            onSelectCategory={setCategoryId}
            amountDigits={amountDigits}
            onAmountChange={handleAmountChange}
            itemName={itemName}
            onItemNameChange={setItemName}
            canProceed={canProceedToJudge}
            onNext={goToJudge}
          />
        ) : null}

        {step === 'judge' ? <JudgeStep cards={comparisonCards} /> : null}

        {step === 'purchaseReason' ? (
          <PurchaseReasonStep
            amount={amount}
            onChoose={(reason) => finalizeDecision('purchased', reason)}
          />
        ) : null}

        {step === 'result' && result ? (
          <ResultStep
            amount={amount}
            outcome={result.decision.outcome}
            purchaseReason={result.decision.purchaseReason}
            newAchievements={result.newAchievements}
            savingsBeforeThisDecision={savingsBeforeThisDecision}
            goals={data.goals}
            onGoHome={() => navigate(ROUTES.home)}
          />
        ) : null}
      </main>

      {step === 'judge' ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={() => chooseOutcome('skipped')}
              className="min-h-14 w-full rounded-2xl bg-emerald-700 text-base font-bold text-white transition-transform active:scale-[0.98]"
            >
              やめる
            </button>
            <button
              type="button"
              onClick={() => chooseOutcome('purchased')}
              className="min-h-14 w-full rounded-2xl bg-slate-800 text-base font-bold text-white transition-transform active:scale-[0.98]"
            >
              買う
            </button>
            <button
              type="button"
              onClick={() => chooseOutcome('pending')}
              className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white text-base font-bold text-slate-700 transition-transform active:scale-[0.98]"
            >
              あとで考える
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type InputStepProps = {
  categories: PromptCategory[]
  categoryId: CategoryId | null
  onSelectCategory: (id: CategoryId) => void
  amountDigits: string
  onAmountChange: (value: string) => void
  itemName: string
  onItemNameChange: (value: string) => void
  canProceed: boolean
  onNext: () => void
}

function InputStep({
  categories,
  categoryId,
  onSelectCategory,
  amountDigits,
  onAmountChange,
  itemName,
  onItemNameChange,
  canProceed,
  onNext,
}: InputStepProps) {
  const amount = Number(amountDigits || '0')

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">何に迷っていますか？</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              aria-pressed={categoryId === category.id}
              className={`min-h-14 rounded-2xl border-2 px-3 text-sm font-bold transition-colors ${
                categoryId === category.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="decide-amount" className="mb-2 block text-sm font-semibold text-slate-700">
          金額
        </label>
        <input
          id="decide-amount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={amountDigits}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-3xl font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
        {amount > 0 ? <p className="mt-1 text-sm text-slate-500">{formatYen(amount)}</p> : null}
      </section>

      <section>
        <label
          htmlFor="decide-item-name"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          商品名（任意）
        </label>
        <input
          id="decide-item-name"
          type="text"
          value={itemName}
          onChange={(e) => onItemNameChange(e.target.value)}
          placeholder="例：アイス"
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-600 focus:outline-none"
        />
      </section>

      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className="min-h-14 w-full rounded-2xl bg-slate-900 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300"
      >
        次へ
      </button>
    </div>
  )
}

type JudgeHeroProps = {
  amount: number
  itemName: string
  prompt: string | undefined
}

/**
 * 揺さぶり画面（判断直前）のヒーロー部分。金額とパーソナライズ文を主役にする（改善方針2）。
 * 静かで少し緊張感のあるトーンにするため、報酬画面とは対照的に暗い背景・控えめな入り方にする。
 * `max-w-md`の外へ全幅で出すため、`<main>`の外（ヘッダー直下）に配置する。
 */
function JudgeHero({ amount, itemName, prompt }: JudgeHeroProps) {
  return (
    <div className="animate-judge-in bg-slate-900 px-4 py-10 text-center">
      <div className="mx-auto max-w-md">
        {itemName ? <p className="text-sm font-medium text-slate-400">{itemName}</p> : null}
        <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">
          {formatYen(amount)}
        </p>
        {prompt ? (
          <p className="mx-auto mt-5 max-w-xs text-base font-medium leading-relaxed text-slate-300">
            {prompt}
          </p>
        ) : null}
      </div>
    </div>
  )
}

type RewardHeroProps = {
  amount: number
}

/**
 * 「やめる」を選んだ直後の報酬画面のヒーロー部分。揺さぶり画面とは対照的に、
 * 明るく達成感のあるトーンにする（改善方針2）。守った金額はカウントアップで見せる（§15）。
 */
function RewardHero({ amount }: RewardHeroProps) {
  const displayAmount = useCountUp(amount)

  return (
    <div className="animate-pop-in bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-10 text-center text-white">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold tracking-wide text-emerald-100">守れました</p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight">{formatYen(displayAmount)}</p>
        <p className="mt-2 text-sm font-medium text-emerald-50">ナイス判断です。</p>
      </div>
    </div>
  )
}

type JudgeStepProps = {
  cards: ComparisonCard[]
}

function JudgeStep({ cards }: JudgeStepProps) {
  if (cards.length === 0) return null
  return (
    <div className="space-y-2.5">
      {cards.map((card) => (
        <ComparisonCardView key={`${card.kind}-${card.title}`} card={card} />
      ))}
    </div>
  )
}

type PurchaseReasonStepProps = {
  amount: number
  onChoose: (reason: PurchaseReason | undefined) => void
}

function PurchaseReasonStep({ amount, onChoose }: PurchaseReasonStepProps) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-3xl font-extrabold text-slate-900">{formatYen(amount)}</p>
        <p className="mt-1 text-sm text-slate-500">よければ、理由を教えてください</p>
      </div>

      <div className="space-y-2">
        {PURCHASE_REASON_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-left text-base font-medium text-slate-700"
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChoose(undefined)}
        className="min-h-12 w-full text-sm font-medium text-slate-500 underline"
      >
        スキップ
      </button>
    </div>
  )
}

type ResultStepProps = {
  amount: number
  outcome: Outcome
  purchaseReason: PurchaseReason | undefined
  newAchievements: RecordDecisionResult['newAchievements']
  savingsBeforeThisDecision: number
  goals: Goal[]
  onGoHome: () => void
}

function ResultStep({
  amount,
  outcome,
  purchaseReason,
  newAchievements,
  savingsBeforeThisDecision,
  goals,
  onGoHome,
}: ResultStepProps) {
  const priorityGoal = useMemo(() => findPriorityGoal(goals), [goals])
  const reasonLabel = purchaseReasonLabel(purchaseReason)

  // ゲージを「見送る前」の位置でまず描画し、次のコミットで「見送った後」へ動かす。
  // 2段階に分けることでCSSのtransitionが働き、ゲージが更新される様子を見せられる（改善方針2）。
  const [gaugeFilled, setGaugeFilled] = useState(false)
  useEffect(() => {
    // 初回コミット（見送る前の幅）が描画された後、次のコミットで見送った後の幅へ切り替える。
    // 2回に分けること自体がCSSのtransitionを働かせるための意図的な仕組みで、外部システムとの
    // 同期ではないが、他に見送る前→後の推移をアニメーションさせる手段がない。
    // eslint-disable-next-line react/set-state-in-effect
    if (outcome === 'skipped' && priorityGoal) setGaugeFilled(true)
  }, [outcome, priorityGoal])

  const beforePercent = priorityGoal
    ? goalProgressPercent(priorityGoal, savingsBeforeThisDecision)
    : 0
  const afterPercent = priorityGoal
    ? goalProgressPercent(priorityGoal, savingsBeforeThisDecision + amount)
    : 0

  return (
    <div className="space-y-5">
      {outcome === 'purchased' ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">記録しました</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatYen(amount)}</p>
          {reasonLabel ? <p className="mt-2 text-sm text-slate-500">理由：{reasonLabel}</p> : null}
        </div>
      ) : outcome === 'pending' ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">保留にしました</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatYen(amount)}</p>
          <p className="mt-2 text-sm text-slate-500">24時間後に、もう一度確認します。</p>
        </div>
      ) : null}

      {outcome === 'skipped' && priorityGoal ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-800">{priorityGoal.title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-200/70">
            <div
              className="h-full rounded-full bg-sky-600 transition-[width] duration-700 ease-out"
              style={{ width: `${gaugeFilled ? afterPercent : beforePercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-sky-700">
            {Math.round(beforePercent * 10) / 10}% → {Math.round(afterPercent * 10) / 10}%
          </p>
        </div>
      ) : null}

      {newAchievements.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">実績を解除しました</p>
          <ul className="mt-1 space-y-0.5 text-sm text-amber-700">
            {newAchievements.map((a) => (
              <li key={a.id}>{achievementLabel(a.kind)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onGoHome}
        className="min-h-14 w-full rounded-2xl bg-slate-900 text-base font-bold text-white transition-transform active:scale-[0.98]"
      >
        ホームへ
      </button>
    </div>
  )
}
