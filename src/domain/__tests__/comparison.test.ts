import { describe, expect, it } from 'vitest'
import type { Goal, ValueItem } from '../../types/domain'
import { buildComparisonCards } from '../comparison'

function makeValueItem(overrides: Partial<ValueItem>): ValueItem {
  return {
    id: 'v',
    name: '焼肉',
    price: 4000,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: 'g',
    title: '旅行資金',
    targetAmount: 50000,
    isPriority: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('比較カードの組み立て', () => {
  it('価値尺度・目標が未登録でも一般比較だけで1枚以上出る', () => {
    const cards = buildComparisonCards({
      amount: 180,
      valueItems: [],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.every((c) => c.kind === 'general')).toBe(true)
  })

  it('価値尺度・目標がない場合、一般比較は最大2枚', () => {
    const cards = buildComparisonCards({
      amount: 1000,
      valueItems: [],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards.length).toBeLessThanOrEqual(2)
  })

  it('価値尺度と目標が両方ある場合、優先順位どおり価値尺度→目標の順で並ぶ', () => {
    const cards = buildComparisonCards({
      amount: 800,
      valueItems: [makeValueItem({})],
      goals: [makeGoal({})],
      totalSavings: 10000,
      plan: 'pro',
    })
    expect(cards[0].kind).toBe('valueItem')
    expect(cards[1].kind).toBe('goal')
  })

  it('カードの合計は3枚を超えない（購入直前の画面のため情報過多を避ける）', () => {
    const cards = buildComparisonCards({
      amount: 800,
      valueItems: [makeValueItem({})],
      goals: [makeGoal({})],
      totalSavings: 10000,
      plan: 'pro',
    })
    expect(cards.length).toBeLessThanOrEqual(3)
  })

  it('価値尺度と目標が両方ある場合、一般比較は1枚に絞られる（合計3枚を守るため）', () => {
    const cards = buildComparisonCards({
      amount: 800,
      valueItems: [makeValueItem({})],
      goals: [makeGoal({})],
      totalSavings: 10000,
      plan: 'pro',
    })
    const generalCards = cards.filter((c) => c.kind === 'general')
    expect(generalCards.length).toBe(1)
  })

  it('優先目標でない目標（isPriority: false）は使わない', () => {
    const cards = buildComparisonCards({
      amount: 800,
      valueItems: [],
      goals: [makeGoal({ isPriority: false })],
      totalSavings: 10000,
      plan: 'pro',
    })
    expect(cards.some((c) => c.kind === 'goal')).toBe(false)
  })

  it('価値尺度: 金額が価格以下のとき「○○円のN%」の形式になる', () => {
    const cards = buildComparisonCards({
      amount: 800,
      valueItems: [makeValueItem({ name: '焼肉', price: 4000 })],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards[0].text).toBe('焼肉4,000円の20%')
  })

  it('価値尺度: 金額が価格を超えるとき「約N倍」の形式になる', () => {
    const cards = buildComparisonCards({
      amount: 15000,
      valueItems: [makeValueItem({ name: 'ゲームソフト', price: 7000 })],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards[0].text).toContain('倍')
  })

  it('価値尺度: 金額以上のものが複数あれば最も近い(=最も安い)ものを選ぶ', () => {
    const cards = buildComparisonCards({
      amount: 3000,
      valueItems: [
        makeValueItem({ id: 'v1', name: '安め', price: 4000 }),
        makeValueItem({ id: 'v2', name: '高め', price: 12000 }),
      ],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards[0].title).toBe('安め')
  })

  it('価値尺度: すべて金額より安ければ最も高いものを選ぶ', () => {
    const cards = buildComparisonCards({
      amount: 100000,
      valueItems: [
        makeValueItem({ id: 'v1', name: '安め', price: 4000 }),
        makeValueItem({ id: 'v2', name: '高め', price: 12000 }),
      ],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards[0].title).toBe('高め')
  })

  it('目標: 進捗率と、見送った場合の進捗率を含む', () => {
    const cards = buildComparisonCards({
      amount: 200,
      valueItems: [],
      goals: [makeGoal({ title: '旅行資金', targetAmount: 50000 })],
      totalSavings: 16000,
      plan: 'pro',
    })
    const goalCard = cards.find((c) => c.kind === 'goal')
    expect(goalCard?.text).toBe('旅行資金の32%')
    expect(goalCard?.subtext).toContain('今回見送ると')
  })

  it('一般比較: 金額が価格に近いとき「1○分」の形式になる', () => {
    const cards = buildComparisonCards({
      amount: 180,
      valueItems: [],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    expect(cards[0].text).toMatch(/1(個|回|本|杯|袋|枚|足|着|台|か月)分$/)
  })

  it('一般比較: 2枚選ばれる場合、異なるカテゴリになる', () => {
    const cards = buildComparisonCards({
      amount: 1000,
      valueItems: [],
      goals: [],
      totalSavings: 0,
      plan: 'pro',
    })
    if (cards.length === 2) {
      expect(cards[0].title).not.toBe(cards[1].title)
    }
  })

  it('すべての価格帯（100〜50,000円）でクラッシュせず1枚以上返す', () => {
    const amounts = [100, 180, 500, 1000, 3000, 8000, 15000, 30000, 50000]
    for (const amount of amounts) {
      const cards = buildComparisonCards({ amount, valueItems: [], goals: [], totalSavings: 0, plan: 'pro' })
      expect(cards.length).toBeGreaterThan(0)
    }
  })

  describe('労働時間換算（改善方針3）', () => {
    it('時給が未登録なら労働時間換算カードは出さない', () => {
      const cards = buildComparisonCards({ amount: 800, valueItems: [], goals: [], totalSavings: 0, plan: 'pro' })
      expect(cards.some((c) => c.kind === 'laborTime')).toBe(false)
    })

    it('時給が登録されていれば、価値尺度・目標より下・一般比較より上の優先度で入る', () => {
      const cards = buildComparisonCards({
        amount: 800,
        valueItems: [makeValueItem({})],
        goals: [makeGoal({})],
        totalSavings: 10000,
        plan: 'pro',
        hourlyWage: 1200,
      })
      expect(cards.map((c) => c.kind)).toEqual(['valueItem', 'goal', 'laborTime'])
    })

    it('文言は「約◯時間◯分働いた分」の形式になる', () => {
      const cards = buildComparisonCards({
        amount: 3000,
        valueItems: [],
        goals: [],
        totalSavings: 0,
        plan: 'pro',
        hourlyWage: 1200,
      })
      const laborCard = cards.find((c) => c.kind === 'laborTime')
      expect(laborCard?.text).toBe('約2時間30分働いた分')
    })

    it('割合の概念がないため、ミニゲージ用のprogressPercentを持たない', () => {
      const cards = buildComparisonCards({
        amount: 3000,
        valueItems: [],
        goals: [],
        totalSavings: 0,
        plan: 'pro',
        hourlyWage: 1200,
      })
      const laborCard = cards.find((c) => c.kind === 'laborTime')
      expect(laborCard?.progressPercent).toBeUndefined()
    })

    it('価値尺度・目標・労働時間換算で3枚埋まる場合、一般比較は出さない', () => {
      const cards = buildComparisonCards({
        amount: 800,
        valueItems: [makeValueItem({})],
        goals: [makeGoal({})],
        totalSavings: 10000,
        plan: 'pro',
        hourlyWage: 1200,
      })
      expect(cards.some((c) => c.kind === 'general')).toBe(false)
      expect(cards.length).toBe(3)
    })

    it('丸めると5分未満になる金額では、労働時間換算カードを出さない（弱い文言「5分未満働いた分」を避ける）', () => {
      // 10円 ÷ 1,200円/時 × 60 = 0.5分 → 5分単位で丸めると0分
      const cards = buildComparisonCards({
        amount: 10,
        valueItems: [],
        goals: [],
        totalSavings: 0,
        plan: 'pro',
        hourlyWage: 1200,
      })
      expect(cards.some((c) => c.kind === 'laborTime')).toBe(false)
    })
  })

  describe('無料プランの境界（改善方針4）', () => {
    it('無料では、時給を登録していても労働時間換算カードを出さない', () => {
      const cards = buildComparisonCards({
        amount: 3000,
        valueItems: [],
        goals: [],
        totalSavings: 0,
        plan: 'free',
        hourlyWage: 1200,
      })
      expect(cards.some((c) => c.kind === 'laborTime')).toBe(false)
      // 枠が空くので一般比較で埋まる。カードが0枚になる空っぽの画面にはしない。
      expect(cards.length).toBeGreaterThan(0)
    })

    it('無料でも、価値尺度・目標のカードはこれまでどおり出る', () => {
      const cards = buildComparisonCards({
        amount: 800,
        valueItems: [makeValueItem({})],
        goals: [makeGoal({})],
        totalSavings: 10000,
        plan: 'free',
        hourlyWage: 1200,
      })
      expect(cards[0].kind).toBe('valueItem')
      expect(cards[1].kind).toBe('goal')
    })
  })
})
