import { describe, expect, it } from 'vitest'
import { createEmptyData } from '../../storage/schema'
import type { Goal, ValueItem } from '../../types/domain'
import {
  addGoal,
  addValueItem,
  removeGoal,
  removeValueItem,
  setPriorityGoal,
  updateGoal,
  updateValueItem,
} from '../mutations'

function makeValueItem(overrides: Partial<ValueItem> = {}): ValueItem {
  return {
    id: 'v1',
    name: '焼肉',
    price: 4000,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: '旅行資金',
    targetAmount: 50000,
    isPriority: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('価値尺度の変更', () => {
  it('追加すると一覧に加わる', () => {
    const next = addValueItem(createEmptyData(), makeValueItem())
    expect(next.valueItems).toHaveLength(1)
    expect(next.valueItems[0].name).toBe('焼肉')
  })

  it('更新すると該当idの内容だけが変わる', () => {
    const data = addValueItem(
      addValueItem(createEmptyData(), makeValueItem({ id: 'v1' })),
      makeValueItem({ id: 'v2', name: 'ゲームソフト', price: 7000 }),
    )
    const next = updateValueItem(data, makeValueItem({ id: 'v1', name: '焼肉(更新)', price: 4500 }))
    expect(next.valueItems.find((v) => v.id === 'v1')?.name).toBe('焼肉(更新)')
    expect(next.valueItems.find((v) => v.id === 'v2')?.name).toBe('ゲームソフト')
  })

  it('削除すると一覧から消える', () => {
    const data = addValueItem(createEmptyData(), makeValueItem({ id: 'v1' }))
    const next = removeValueItem(data, 'v1')
    expect(next.valueItems).toHaveLength(0)
  })

  it('他のデータ（決定・目標など）には影響しない', () => {
    const data = createEmptyData()
    const next = addValueItem(data, makeValueItem())
    expect(next.decisions).toBe(data.decisions)
    expect(next.goals).toBe(data.goals)
  })
})

describe('節約目標の変更', () => {
  it('追加すると一覧に加わる（デフォルトは優先ではない）', () => {
    const next = addGoal(createEmptyData(), makeGoal())
    expect(next.goals).toHaveLength(1)
    expect(next.goals[0].isPriority).toBe(false)
  })

  it('更新すると名前・目標額だけが変わり、優先状態は変わらない', () => {
    const data = addGoal(createEmptyData(), makeGoal({ id: 'g1', isPriority: true }))
    const next = updateGoal(data, { id: 'g1', title: '新しい旅行資金', targetAmount: 60000 })
    expect(next.goals[0].title).toBe('新しい旅行資金')
    expect(next.goals[0].targetAmount).toBe(60000)
    expect(next.goals[0].isPriority).toBe(true)
  })

  it('削除すると一覧から消える', () => {
    const data = addGoal(createEmptyData(), makeGoal({ id: 'g1' }))
    const next = removeGoal(data, 'g1')
    expect(next.goals).toHaveLength(0)
  })

  it('優先目標を削除しても、残りの目標が自動で優先に繰り上がらない', () => {
    const data = addGoal(
      addGoal(createEmptyData(), makeGoal({ id: 'g1', isPriority: true, createdAt: '2026-08-01T00:00:00.000Z' })),
      makeGoal({ id: 'g2', isPriority: false, createdAt: '2026-08-02T00:00:00.000Z' }),
    )
    const next = removeGoal(data, 'g1')
    expect(next.goals).toHaveLength(1)
    expect(next.goals[0].id).toBe('g2')
    expect(next.goals[0].isPriority).toBe(false)
  })

  it('目標が0件になっても壊れない', () => {
    const data = addGoal(createEmptyData(), makeGoal({ id: 'g1' }))
    const next = removeGoal(data, 'g1')
    expect(next.goals).toEqual([])
  })
})

describe('優先目標の切り替え', () => {
  it('指定したidだけが優先になり、他はすべて解除される', () => {
    const data = addGoal(
      addGoal(createEmptyData(), makeGoal({ id: 'g1', isPriority: true })),
      makeGoal({ id: 'g2', isPriority: false }),
    )
    const next = setPriorityGoal(data, 'g2')
    expect(next.goals.find((g) => g.id === 'g1')?.isPriority).toBe(false)
    expect(next.goals.find((g) => g.id === 'g2')?.isPriority).toBe(true)
  })

  it('nullを渡すと、すべての目標の優先が解除される（優先目標なしの状態）', () => {
    const data = addGoal(createEmptyData(), makeGoal({ id: 'g1', isPriority: true }))
    const next = setPriorityGoal(data, null)
    expect(next.goals.every((g) => !g.isPriority)).toBe(true)
  })

  it('優先目標は常に0または1件になる', () => {
    const data = addGoal(
      addGoal(createEmptyData(), makeGoal({ id: 'g1', isPriority: true })),
      makeGoal({ id: 'g2', isPriority: true }),
    )
    const next = setPriorityGoal(data, 'g1')
    const priorityCount = next.goals.filter((g) => g.isPriority).length
    expect(priorityCount).toBe(1)
  })
})
