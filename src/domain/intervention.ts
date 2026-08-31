import { getCategoryName } from '../data/prompts'
import type { CategoryId, Decision, Goal, ValueItem } from '../types/domain'
import { pickValueItemForAmount } from './comparison'
import { effectiveDate, isConfirmedSkip, totalConfirmedSavings, totalSkipCount } from './decisions'
import { formatYen } from './format'
import { findPriorityGoal } from './goals'

/**
 * 購入直前に出すパーソナライズ介入文（改善方針1）。
 *
 * 抽象的な問いかけ（`seed/prompts.json`）より、ユーザー自身が登録した
 * データを使った具体的な代替提案を優先する。狙いは
 * 「言い訳を崩す＋別の使い道を提示する」こと。
 *
 * AI APIは使わない。テンプレート＋ユーザーデータだけで組み立てる。
 * 罪悪感を煽らず、説教調にもしない（PRODUCT_SPEC.md §0）。
 */

export type InterventionKind =
  /** 価値尺度への振り替えを提案する。 */
  | 'valueItemSwap'
  /** 買おうとしている額が価値尺度より大きいときに、その規模を示す。 */
  | 'valueItemScale'
  /** 節約目標への振り替えを提案する。 */
  | 'goalSwap'
  /** 同じカテゴリを今月何回買ったかを示し、今回との違いを問う。 */
  | 'categoryPattern'
  /** ここまで守れている流れを引き合いに出す。 */
  | 'streak'

export type Intervention = {
  kind: InterventionKind
  text: string
}

export type InterventionInput = {
  amount: number
  categoryId: CategoryId
  valueItems: ValueItem[]
  goals: Goal[]
  decisions: Decision[]
  now: Date
}

/** 「あと何回で届く」を出す上限。これを超えると現実味がなく、逆に響かない。 */
const MAX_REACH_COUNT = 8

/** 同じカテゴリの購入回数がこの数以上のときだけ、履歴ベースの介入を出す。 */
const MIN_CATEGORY_PURCHASES = 2

/** 見送り回数がこの数以上のときだけ、流れを引き合いに出す。 */
const MIN_SKIP_STREAK = 3

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/** 第1優先：価値尺度を使った候補。 */
function valueItemCandidates(input: InterventionInput): Intervention[] {
  const item = pickValueItemForAmount(input.valueItems, input.amount)
  if (!item) return []

  const amountText = formatYen(input.amount)

  if (item.price >= input.amount) {
    // 同じ金額を、本人が価値を認めているものへ振り替える提案。
    const candidates: Intervention[] = [
      { kind: 'valueItemSwap', text: `その${amountText}、${item.name}に回した方が満足しない？` },
      {
        kind: 'valueItemSwap',
        text: `同じ${amountText}を${item.name}に寄せることもできるけど、どっちがいい？`,
      },
    ]

    const reachCount = Math.ceil(item.price / input.amount)
    if (reachCount >= 2 && reachCount <= MAX_REACH_COUNT) {
      candidates.push({
        kind: 'valueItemSwap',
        text: `あと${reachCount}回この判断を見送れば${item.name}に届く。今回はどっちにする？`,
      })
    }
    return candidates
  }

  // 価値尺度より高い買い物。「何回分か」を示して規模を実感させる。
  const multiplier = Math.round((input.amount / item.price) * 10) / 10
  return [
    {
      kind: 'valueItemScale',
      text: `その${amountText}は${item.name}${multiplier}回分。それでも今回を選ぶ？`,
    },
    {
      kind: 'valueItemScale',
      text: `${item.name}${multiplier}回分の${amountText}。今日のこれは、それだけの価値がある？`,
    },
  ]
}

/** 第2優先：節約目標を使った候補。 */
function goalCandidates(input: InterventionInput): Intervention[] {
  const goal = findPriorityGoal(input.goals)
  if (!goal || goal.targetAmount <= 0) return []

  const amountText = formatYen(input.amount)
  const candidates: Intervention[] = [
    { kind: 'goalSwap', text: `その${amountText}、${goal.title}に回した方が近づかない？` },
  ]

  // 0.1%未満だと数字が効かないので、割合を出す言い回しは使わない。
  const percent = Math.round((input.amount / goal.targetAmount) * 1000) / 10
  if (percent >= 0.1) {
    candidates.push({
      kind: 'goalSwap',
      text: `見送れば${goal.title}に${percent}%ぶん近づく。それでも今回にする？`,
    })
  }

  const remaining = goal.targetAmount - totalConfirmedSavings(input.decisions)
  if (remaining > 0) {
    candidates.push({
      kind: 'goalSwap',
      text: `${goal.title}まであと${formatYen(remaining)}。その${amountText}、どっちに置く？`,
    })
  }

  return candidates
}

/** 第3優先：履歴を使った候補。 */
function historyCandidates(input: InterventionInput): Intervention[] {
  const candidates: Intervention[] = []

  const purchasesThisMonth = input.decisions.filter(
    (d) =>
      d.outcome === 'purchased' &&
      d.categoryId === input.categoryId &&
      d.archivedAt === undefined &&
      isSameMonth(effectiveDate(d), input.now),
  )

  if (purchasesThisMonth.length >= MIN_CATEGORY_PURCHASES) {
    const count = purchasesThisMonth.length
    const spent = purchasesThisMonth.reduce((sum, d) => sum + d.amount, 0)
    const categoryName = getCategoryName(input.categoryId)
    candidates.push(
      {
        kind: 'categoryPattern',
        text: `${categoryName}は今月${count}回買ってる。今日のこれは、その${count}回と何が違う？`,
      },
      {
        kind: 'categoryPattern',
        text: `今月${categoryName}に${formatYen(spent)}。今回もそこに足す？`,
      },
    )
  }

  const skipCount = totalSkipCount(input.decisions)
  if (skipCount >= MIN_SKIP_STREAK) {
    const saved = input.decisions.filter(isConfirmedSkip).reduce((sum, d) => sum + d.amount, 0)
    candidates.push({
      kind: 'streak',
      text: `ここまで${skipCount}回見送って${formatYen(saved)}守れてる。その流れ、今回も続ける？`,
    })
  }

  return candidates
}

/**
 * パーソナライズ介入文を1件組み立てる。
 *
 * 優先順位は 価値尺度 → 節約目標 → 履歴。
 * 上位の層に候補があればそこから選び、下位は見ない（改善方針1の「優先する」）。
 * 同じ層の中では毎回同じ文にならないよう、候補からランダムに1件選ぶ。
 *
 * どの層にも候補がない場合は`undefined`を返す。呼び出し側は
 * 抽象的な問いかけ（`pickRandomPrompt`）へフォールバックする。
 */
export function buildIntervention(
  input: InterventionInput,
  random: () => number = Math.random,
): Intervention | undefined {
  if (input.amount < 1) return undefined

  const tiers = [valueItemCandidates(input), goalCandidates(input), historyCandidates(input)]
  const candidates = tiers.find((tier) => tier.length > 0)
  if (!candidates) return undefined

  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index]
}
