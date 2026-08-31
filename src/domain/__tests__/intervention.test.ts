import { describe, expect, it } from 'vitest'
import type { CategoryId, Decision, Goal, ValueItem } from '../../types/domain'
import { buildIntervention, type InterventionInput } from '../intervention'

const NOW = new Date('2026-08-31T12:00:00+09:00')

let seq = 0
function id(): string {
  seq += 1
  return `id-${seq}`
}

function valueItem(name: string, price: number): ValueItem {
  return { id: id(), name, price, createdAt: NOW.toISOString() }
}

function goal(title: string, targetAmount: number, isPriority = true): Goal {
  return { id: id(), title, targetAmount, isPriority, createdAt: NOW.toISOString() }
}

function decision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: id(),
    amount: 500,
    categoryId: 'convenience',
    outcome: 'purchased',
    createdAt: NOW.toISOString(),
    resolvedAt: NOW.toISOString(),
    ...overrides,
  }
}

function input(overrides: Partial<InterventionInput> = {}): InterventionInput {
  return {
    amount: 3000,
    categoryId: 'convenience',
    valueItems: [],
    goals: [],
    decisions: [],
    now: NOW,
    ...overrides,
  }
}

/** 候補の何番目を選ぶかを固定する。 */
const pickFirst = () => 0
const pickLast = () => 0.999

describe('buildIntervention', () => {
  describe('優先順位', () => {
    it('価値尺度・目標・履歴がすべてあるとき、価値尺度を使う', () => {
      const result = buildIntervention(
        input({
          valueItems: [valueItem('モニター', 20000)],
          goals: [goal('旅行', 50000)],
          decisions: [decision(), decision()],
        }),
        pickFirst,
      )
      expect(result?.kind).toBe('valueItemSwap')
      expect(result?.text).toContain('モニター')
    })

    it('価値尺度がなければ、優先目標を使う', () => {
      const result = buildIntervention(
        input({ goals: [goal('旅行', 50000)], decisions: [decision(), decision()] }),
        pickFirst,
      )
      expect(result?.kind).toBe('goalSwap')
      expect(result?.text).toContain('旅行')
    })

    it('価値尺度も優先目標もなければ、履歴を使う', () => {
      const result = buildIntervention(input({ decisions: [decision(), decision()] }), pickFirst)
      expect(result?.kind).toBe('categoryPattern')
    })

    it('使えるデータが何もなければundefinedを返す（呼び出し側が抽象的な問いかけへ戻す）', () => {
      expect(buildIntervention(input())).toBeUndefined()
    })

    it('金額が1円未満ならundefinedを返す', () => {
      expect(
        buildIntervention(input({ amount: 0, valueItems: [valueItem('モニター', 20000)] })),
      ).toBeUndefined()
    })
  })

  describe('価値尺度ベース', () => {
    it('代替提案として、その金額を価値尺度へ回す案を出す', () => {
      const result = buildIntervention(
        input({ amount: 3000, valueItems: [valueItem('モニター', 20000)] }),
        pickFirst,
      )
      expect(result?.text).toBe('その3,000円、モニターに回した方が満足しない？')
    })

    it('金額に対して最も近い（金額以上の）価値尺度を選ぶ', () => {
      const result = buildIntervention(
        input({
          amount: 3000,
          valueItems: [
            valueItem('旅行', 30000),
            valueItem('焼肉', 4000),
            valueItem('ライブ', 12000),
          ],
        }),
        pickFirst,
      )
      expect(result?.text).toContain('焼肉')
    })

    it('あと何回で届くかを示す候補を含む', () => {
      const result = buildIntervention(
        input({ amount: 1000, valueItems: [valueItem('焼肉', 4000)] }),
        pickLast,
      )
      expect(result?.text).toBe('あと4回この判断を見送れば焼肉に届く。今回はどっちにする？')
    })

    it('届くまでの回数が多すぎるときは「あと何回」を出さない', () => {
      // 20,000円 ÷ 100円 = 200回。現実味がないため候補に入れない。
      const result = buildIntervention(
        input({ amount: 100, valueItems: [valueItem('モニター', 20000)] }),
        pickLast,
      )
      expect(result?.text).not.toContain('あと200回')
    })

    it('価値尺度より高い買い物では「何回分か」で規模を示す', () => {
      const result = buildIntervention(
        input({ amount: 12000, valueItems: [valueItem('焼肉', 4000)] }),
        pickFirst,
      )
      expect(result?.kind).toBe('valueItemScale')
      expect(result?.text).toBe('その12,000円は焼肉3回分。それでも今回を選ぶ？')
    })
  })

  describe('目標ベース', () => {
    it('目標へ回す案を出す', () => {
      const result = buildIntervention(input({ goals: [goal('旅行', 50000)] }), pickFirst)
      expect(result?.text).toBe('その3,000円、旅行に回した方が近づかない？')
    })

    it('見送った場合に近づく割合を示す候補を含む', () => {
      const texts = [0, 0.34, 0.67, 0.99].map(
        (r) => buildIntervention(input({ amount: 5000, goals: [goal('旅行', 50000)] }), () => r)?.text,
      )
      expect(texts).toContain('見送れば旅行に10%ぶん近づく。それでも今回にする？')
    })

    it('割合が0.1%未満なら、割合を出す言い回しは使わない', () => {
      // 100円 ÷ 1,000,000円 = 0.01%
      const texts = [0, 0.34, 0.67, 0.99].map(
        (r) =>
          buildIntervention(input({ amount: 100, goals: [goal('家', 1000000)] }), () => r)?.text,
      )
      expect(texts.every((t) => t !== undefined && !t.includes('ぶん近づく'))).toBe(true)
    })

    it('優先目標でない目標は使わない', () => {
      const result = buildIntervention(input({ goals: [goal('旅行', 50000, false)] }))
      expect(result).toBeUndefined()
    })

    it('目標額が0なら使わない', () => {
      expect(buildIntervention(input({ goals: [goal('未設定', 0)] }))).toBeUndefined()
    })
  })

  describe('履歴ベース', () => {
    it('同じカテゴリを今月2回以上買っていれば、その回数を示す', () => {
      const result = buildIntervention(
        input({
          categoryId: 'convenience',
          decisions: [decision({ amount: 300 }), decision({ amount: 500 })],
        }),
        pickFirst,
      )
      expect(result?.text).toBe('コンビニは今月2回買ってる。今日のこれは、その2回と何が違う？')
    })

    it('別カテゴリの購入は数えない', () => {
      const other: CategoryId = 'fashion'
      const result = buildIntervention(
        input({
          categoryId: 'convenience',
          decisions: [decision({ categoryId: other }), decision({ categoryId: other })],
        }),
      )
      expect(result).toBeUndefined()
    })

    it('先月の購入は数えない', () => {
      const lastMonth = new Date('2026-07-15T12:00:00+09:00').toISOString()
      const result = buildIntervention(
        input({
          decisions: [
            decision({ createdAt: lastMonth, resolvedAt: lastMonth }),
            decision({ createdAt: lastMonth, resolvedAt: lastMonth }),
          ],
        }),
      )
      expect(result).toBeUndefined()
    })

    it('アーカイブ済みの記録は数えない', () => {
      const result = buildIntervention(
        input({
          decisions: [
            decision({ archivedAt: NOW.toISOString() }),
            decision({ archivedAt: NOW.toISOString() }),
          ],
        }),
      )
      expect(result).toBeUndefined()
    })

    it('見送りが3回以上あれば、その流れを引き合いに出す', () => {
      const skips = [
        decision({ outcome: 'skipped', amount: 300 }),
        decision({ outcome: 'skipped', amount: 500 }),
        decision({ outcome: 'skipped', amount: 200 }),
      ]
      const result = buildIntervention(input({ decisions: skips }), pickFirst)
      expect(result?.kind).toBe('streak')
      expect(result?.text).toBe('ここまで3回見送って1,000円守れてる。その流れ、今回も続ける？')
    })
  })

  describe('文面の方針', () => {
    const inputs: InterventionInput[] = [
      input({ valueItems: [valueItem('モニター', 20000)] }),
      input({ amount: 12000, valueItems: [valueItem('焼肉', 4000)] }),
      input({ goals: [goal('旅行', 50000)] }),
      input({ decisions: [decision(), decision()] }),
      input({
        decisions: [
          decision({ outcome: 'skipped' }),
          decision({ outcome: 'skipped' }),
          decision({ outcome: 'skipped' }),
        ],
      }),
    ]

    function allTexts(): string[] {
      const texts: string[] = []
      for (const i of inputs) {
        for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
          const text = buildIntervention(i, () => r)?.text
          if (text) texts.push(text)
        }
      }
      return texts
    }

    it('罪悪感を煽る語・説教調の語を含まない', () => {
      // PRODUCT_SPEC.md §0「買った利用者を責めない」を、機械的に守れる範囲で確認する。
      const forbidden = ['無駄', 'ダメ', '我慢', '反省', '浪費', 'べき', 'やめなさい']
      for (const text of allTexts()) {
        for (const word of forbidden) {
          expect(text).not.toContain(word)
        }
      }
    })

    it('購入直前に読める長さ（40文字以内）に収める', () => {
      for (const text of allTexts()) {
        expect(text.length).toBeLessThanOrEqual(40)
      }
    })

    it('同じ入力でも、選び方によって複数の文面が出る', () => {
      const variants = new Set(
        [0, 0.4, 0.8].map(
          (r) =>
            buildIntervention(input({ valueItems: [valueItem('モニター', 20000)] }), () => r)?.text,
        ),
      )
      expect(variants.size).toBeGreaterThan(1)
    })
  })
})
