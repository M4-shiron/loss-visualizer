import type { GeneralComparison } from '../data/comparisons'
import { GENERAL_COMPARISONS } from '../data/comparisons'
import type { Goal, ValueItem } from '../types/domain'
import type { ComparisonCard } from './comparisonCard'
import { formatYen } from './format'
import { goalProgressPercent } from './goals'

/** 損失の可視化に表示する比較カードの上限（§9・購入直前の画面のため情報過多を避ける）。 */
const MAX_CARDS = 3

/** アプリ側で用意した一般比較の上限（§8）。 */
const MAX_GENERAL_CARDS = 2

/**
 * 金額以上の価値尺度のうち最も金額に近いものを選ぶ。
 * すべてが金額より安ければ、その中で最も高いものを選ぶ（§7）。
 */
function pickValueItem(valueItems: ValueItem[], amount: number): ValueItem | undefined {
  if (valueItems.length === 0) return undefined

  const atLeastAmount = valueItems.filter((v) => v.price >= amount)
  if (atLeastAmount.length > 0) {
    return atLeastAmount.reduce((best, v) => (v.price < best.price ? v : best))
  }
  return valueItems.reduce((best, v) => (v.price > best.price ? v : best))
}

function buildValueItemCard(item: ValueItem, amount: number): ComparisonCard {
  if (item.price >= amount) {
    const percent = Math.round((amount / item.price) * 100)
    const repeatsNeeded = Math.ceil(item.price / amount)
    // まだ「やめる／買う」を選ぶ前の画面なので、今回を見送る前提を断定しない言い回しにする。
    const subtext =
      repeatsNeeded >= 2
        ? `今回を含めて${repeatsNeeded}回、同じ判断をすれば${item.name}に届きます`
        : undefined
    return {
      kind: 'valueItem',
      title: item.name,
      text: `${item.name}${formatYen(item.price)}の${percent}%`,
      subtext,
      progressPercent: Math.min(100, Math.max(0, percent)),
    }
  }

  const multiplier = Math.round((amount / item.price) * 10) / 10
  return {
    kind: 'valueItem',
    title: item.name,
    text: `${item.name}の約${multiplier}倍`,
    progressPercent: 100,
  }
}

function buildGoalCard(goal: Goal, totalSavings: number, amount: number): ComparisonCard {
  const currentPercent = goalProgressPercent(goal, totalSavings)
  const afterPercent = goalProgressPercent(goal, totalSavings + amount)
  const roundedCurrent = Math.round(currentPercent * 10) / 10
  const roundedAfter = Math.round(afterPercent * 10) / 10

  return {
    kind: 'goal',
    title: goal.title,
    text: `${goal.title}の${roundedCurrent}%`,
    subtext: roundedAfter > roundedCurrent ? `今回見送ると${roundedAfter}%` : undefined,
    progressPercent: currentPercent,
  }
}

/** 一般比較の候補を、比率がもっとも1に近い順に並べる（§8）。 */
function rankGeneralComparisons(amount: number): GeneralComparison[] {
  return [...GENERAL_COMPARISONS].sort((a, b) => {
    const scoreA = Math.abs(Math.log(amount / a.price))
    const scoreB = Math.abs(Math.log(amount / b.price))
    return scoreA - scoreB
  })
}

/** 一般比較を最大2件選ぶ。2件目は1件目と異なるカテゴリを優先する（§8）。 */
function pickGeneralComparisons(amount: number, limit: number): GeneralComparison[] {
  if (limit <= 0) return []

  const ranked = rankGeneralComparisons(amount)
  const picked: GeneralComparison[] = []

  const first = ranked[0]
  if (first) picked.push(first)

  if (limit >= 2) {
    const secondFromOtherCategory = ranked.find(
      (item) => item.id !== first?.id && item.category !== first?.category,
    )
    const second = secondFromOtherCategory ?? ranked.find((item) => item.id !== first?.id)
    if (second) picked.push(second)
  }

  return picked.slice(0, limit)
}

function buildGeneralCard(item: GeneralComparison, amount: number): ComparisonCard {
  const ratio = amount / item.price
  const isRoughlyOne = ratio >= 0.85 && ratio <= 1.15

  const text = isRoughlyOne
    ? `${item.name}1${item.unit}分`
    : `${item.name}約${Math.round(ratio * 10) / 10}${item.unit}分`

  return {
    kind: 'general',
    title: item.name,
    text,
    progressPercent: Math.min(100, Math.round(ratio * 100)),
  }
}

export type ComparisonInput = {
  amount: number
  valueItems: ValueItem[]
  goals: Goal[]
  /** 優先目標の進捗計算に使う、現在までの総累計節約額。 */
  totalSavings: number
}

/**
 * 損失の可視化カードを組み立てる（§7）。
 * 優先順位: ①価値尺度 ②節約目標 ③一般比較。
 * 合計は最大{@link MAX_CARDS}枚（購入直前の画面のため情報過多を避ける）。
 * 一般比較のみは仕様上の上限（{@link MAX_GENERAL_CARDS}枚）を別途守る。
 */
export function buildComparisonCards(input: ComparisonInput): ComparisonCard[] {
  const { amount, valueItems, goals, totalSavings } = input
  const cards: ComparisonCard[] = []

  const valueItem = pickValueItem(valueItems, amount)
  if (valueItem) cards.push(buildValueItemCard(valueItem, amount))

  const priorityGoal = goals.find((g) => g.isPriority)
  if (priorityGoal && cards.length < MAX_CARDS) {
    cards.push(buildGoalCard(priorityGoal, totalSavings, amount))
  }

  const remainingSlots = Math.min(MAX_GENERAL_CARDS, MAX_CARDS - cards.length)
  const generalItems = pickGeneralComparisons(amount, remainingSlots)
  for (const item of generalItems) {
    cards.push(buildGeneralCard(item, amount))
  }

  return cards
}
