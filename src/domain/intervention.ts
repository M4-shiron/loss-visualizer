import { getCategoryName } from '../data/prompts'
import type { CategoryId, Decision, Goal, ValueItem } from '../types/domain'
import { pickValueItemForAmount } from './comparison'
import { effectiveDate, isConfirmedSkip, totalConfirmedSavings, totalSkipCount } from './decisions'
import { canUse, type Plan } from './entitlement'
import { formatYen } from './format'
import { findPriorityGoal } from './goals'
import { formatLaborTime, laborMinutesForAmount } from './laborTime'

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
  /** 労働時間換算のみ（価値尺度・目標と組み合わせられないとき）。 */
  | 'laborTime'
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
  /** 概算の時給（円）。未登録なら労働時間換算は一切使わない（改善方針3）。 */
  hourlyWage?: number
  /** 現在のプラン。労働時間換算と履歴ベースの候補はProのみ（改善方針4）。 */
  plan: Plan
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

/**
 * 労働時間換算の文言。時給が未登録、または丸めた結果が0分未満相当（5分未満）なら`undefined`。
 * 「単なる『約2時間30分』で終わらせず」の方針に沿って、呼び出し側で他の情報と組み合わせて使う。
 */
function laborTimeText(amount: number, hourlyWage: number | undefined): string | undefined {
  const minutes = laborMinutesForAmount(amount, hourlyWage)
  if (minutes === undefined || minutes <= 0) return undefined
  return formatLaborTime(minutes)
}

/** 第1優先：価値尺度を使った候補。時給が登録されていれば労働時間と組み合わせる（改善方針3）。 */
function valueItemCandidates(
  input: InterventionInput,
  laborText: string | undefined,
): Intervention[] {
  const item = pickValueItemForAmount(input.valueItems, input.amount)
  if (!item) return []

  const amountText = formatYen(input.amount)

  if (item.price >= input.amount) {
    // 同じ金額を、本人が価値を認めているものへ振り替える提案。
    // 労働時間換算が使えるときは、金額だけより実感しやすい組み合わせ型を優先する。
    const candidates: Intervention[] = laborText
      ? [
          {
            kind: 'valueItemSwap',
            text: `この${amountText}は${laborText}働いた分。${item.name}に回した方が満足しない？`,
          },
          {
            kind: 'valueItemSwap',
            text: `${laborText}働いて稼いだ${amountText}、${item.name}に回した方が満足しない？`,
          },
        ]
      : [
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

/** 第2優先：節約目標を使った候補。時給が登録されていれば労働時間と組み合わせる（改善方針3）。 */
function goalCandidates(
  input: InterventionInput,
  laborText: string | undefined,
): Intervention[] {
  const goal = findPriorityGoal(input.goals)
  if (!goal || goal.targetAmount <= 0) return []

  const amountText = formatYen(input.amount)
  const candidates: Intervention[] = laborText
    ? [
        {
          kind: 'goalSwap',
          text: `この${amountText}は${laborText}働いた分。${goal.title}に回した方が近づかない？`,
        },
      ]
    : [{ kind: 'goalSwap', text: `その${amountText}、${goal.title}に回した方が近づかない？` }]

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

/**
 * 第3優先：労働時間換算のみの候補。価値尺度・節約目標のどちらとも組み合わせられない
 * （＝どちらも未登録）ときだけ使う。それ以外は上位2層のどちらかに組み込まれている。
 */
function laborTimeOnlyCandidates(
  input: InterventionInput,
  laborText: string | undefined,
): Intervention[] {
  if (!laborText) return []

  const amountText = formatYen(input.amount)
  return [
    { kind: 'laborTime', text: `その${amountText}は${laborText}働いた分。それでも今回選ぶ？` },
    { kind: 'laborTime', text: `${laborText}働いて稼いだ${amountText}。今回はどうする？` },
  ]
}

/** 第4優先：履歴を使った候補。 */
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
 * 優先順位は 価値尺度 → 節約目標 → 労働時間換算 → 履歴（改善方針1・3）。
 * 上位の層に候補があればそこから選び、下位は見ない（改善方針1の「優先する」）。
 * 価値尺度・節約目標の層は、時給が登録されていれば労働時間換算と組み合わせた
 * 文言を使うため、労働時間換算が単独の層として現れるのは両方とも未登録のときだけ。
 * 同じ層の中では毎回同じ文にならないよう、候補からランダムに1件選ぶ。
 *
 * 無料プランでは労働時間換算と履歴ベースの層を使わない（改善方針4）。
 * 価値尺度・節約目標を使った代替提案は無料でも出るため、核心の介入体験は残る。
 *
 * どの層にも候補がない場合は`undefined`を返す。呼び出し側は
 * 抽象的な問いかけ（`pickRandomPrompt`）へフォールバックする。
 */
export function buildIntervention(
  input: InterventionInput,
  random: () => number = Math.random,
): Intervention | undefined {
  if (input.amount < 1) return undefined

  // 3つの層すべてで同じ(amount, hourlyWage)を使うため、ここで1回だけ計算する。
  // 無料プランでは労働時間換算を使わないので、そもそも計算しない。
  const laborText = canUse(input.plan, 'laborTime')
    ? laborTimeText(input.amount, input.hourlyWage)
    : undefined

  const tiers = [
    valueItemCandidates(input, laborText),
    goalCandidates(input, laborText),
    laborTimeOnlyCandidates(input, laborText),
    canUse(input.plan, 'historyIntervention') ? historyCandidates(input) : [],
  ]
  const candidates = tiers.find((tier) => tier.length > 0)
  if (!candidates) return undefined

  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index]
}
