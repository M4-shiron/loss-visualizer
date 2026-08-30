import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComparisonCardView } from '../components/ComparisonCardView'
import { achievementLabel } from '../domain/achievements'
import type { ComparisonCard } from '../domain/comparisonCard'
import { buildComparisonCards } from '../domain/comparison'
import { totalConfirmedSavings } from '../domain/decisions'
import { formatYen } from '../domain/format'
import { findPriorityGoal, goalProgressPercent } from '../domain/goals'
import { PURCHASE_REASON_OPTIONS, purchaseReasonLabel } from '../domain/purchaseReason'
import { MAX_AMOUNT_DIGITS } from '../domain/validation'
import { pickRandomPrompt, visibleCategories, type PromptCategory } from '../data/prompts'
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
    setPrompt(pickRandomPrompt(categoryId))
    setComparisonCards(
      buildComparisonCards({
        amount,
        valueItems: data.valueItems,
        goals: data.goals,
        totalSavings: beforeTotal,
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

  return (
    <div className="flex min-h-dvh flex-col">
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

      <main
        className={`mx-auto w-full max-w-md flex-1 px-4 ${step === 'judge' ? 'pb-64' : 'pb-10'}`}
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

        {step === 'judge' ? (
          <JudgeStep amount={amount} itemName={itemName} prompt={prompt} cards={comparisonCards} />
        ) : null}

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

type JudgeStepProps = {
  amount: number
  itemName: string
  prompt: string | undefined
  cards: ComparisonCard[]
}

function JudgeStep({ amount, itemName, prompt, cards }: JudgeStepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        {itemName ? <p className="text-sm text-slate-500">{itemName}</p> : null}
        <p className="text-4xl font-extrabold text-slate-900">{formatYen(amount)}</p>
      </div>

      {prompt ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-center text-base font-medium text-slate-700 shadow-sm">
          {prompt}
        </p>
      ) : null}

      {cards.length > 0 ? (
        <div className="space-y-2.5">
          {cards.map((card) => (
            <ComparisonCardView key={`${card.kind}-${card.title}`} card={card} />
          ))}
        </div>
      ) : null}
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

  return (
    <div className="space-y-5" role="status" aria-live="polite">
      {outcome === 'skipped' ? (
        <div className="animate-pop-in rounded-2xl bg-emerald-50 p-6 text-center">
          <p className="text-sm font-semibold text-emerald-700">守れました</p>
          <p className="mt-1 text-4xl font-extrabold text-emerald-700">{formatYen(amount)}</p>
          <p className="mt-2 text-sm text-emerald-800">ナイス判断です。</p>
        </div>
      ) : outcome === 'purchased' ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">記録しました</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatYen(amount)}</p>
          {reasonLabel ? <p className="mt-2 text-sm text-slate-500">理由：{reasonLabel}</p> : null}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">保留にしました</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatYen(amount)}</p>
          <p className="mt-2 text-sm text-slate-500">24時間後に、もう一度確認します。</p>
        </div>
      )}

      {outcome === 'skipped' && priorityGoal ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-800">{priorityGoal.title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-200/70">
            <div
              className="h-full rounded-full bg-sky-600"
              style={{
                width: `${goalProgressPercent(priorityGoal, savingsBeforeThisDecision + amount)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-sky-700">
            {Math.round(goalProgressPercent(priorityGoal, savingsBeforeThisDecision) * 10) / 10}%
            →{' '}
            {Math.round(
              goalProgressPercent(priorityGoal, savingsBeforeThisDecision + amount) * 10,
            ) / 10}
            %
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
