import { describe, expect, it } from 'vitest'
import { totalConfirmedSavings } from '../../domain/decisions'
import { createEmptyData } from '../../storage/schema'
import type { CategoryId, Decision, Goal, ValueItem } from '../../types/domain'
import {
  addGoal,
  addValueItem,
  archiveExpiredPendingDecisions,
  dismissMonthlySummary,
  dismissWeeklySummary,
  removeDecision,
  removeGoal,
  removeValueItem,
  resetAllData,
  resolvePending,
  setPriorityGoal,
  toggleCategoryVisibility,
  updateDecision,
  updateGoal,
  updateHourlyWage,
  updateNotificationSettings,
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

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 'd1',
    amount: 500,
    categoryId: 'convenience',
    outcome: 'pending',
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

describe('保留の確定（resolvePending）', () => {
  const now = new Date('2026-08-03T00:00:00.000Z')

  it('「やめる」で確定すると、outcomeとresolvedAtが更新される', () => {
    const data = { ...createEmptyData(), decisions: [makeDecision({ id: 'd1', amount: 800 })] }
    const next = resolvePending(data, { id: 'd1', outcome: 'skipped', now })
    expect(next.decisions[0].outcome).toBe('skipped')
    expect(next.decisions[0].resolvedAt).toBe(now.toISOString())
  })

  it('「買う」で確定すると、理由も保存される', () => {
    const data = { ...createEmptyData(), decisions: [makeDecision({ id: 'd1' })] }
    const next = resolvePending(data, { id: 'd1', outcome: 'purchased', purchaseReason: 'reward', now })
    expect(next.decisions[0].outcome).toBe('purchased')
    expect(next.decisions[0].purchaseReason).toBe('reward')
  })

  it('確定によって新たに実績の条件を満たせば、実績が追加される', () => {
    const data = { ...createEmptyData(), decisions: [makeDecision({ id: 'd1', amount: 1000 })] }
    const next = resolvePending(data, { id: 'd1', outcome: 'skipped', now })
    expect(next.achievements.map((a) => a.id)).toContain('amount-1000')
  })
})

describe('履歴の編集（updateDecision）', () => {
  const now = new Date('2026-08-03T00:00:00.000Z')

  it('金額・カテゴリ・商品名・判断結果を変更できる', () => {
    const data = {
      ...createEmptyData(),
      decisions: [makeDecision({ id: 'd1', amount: 500, outcome: 'skipped' })],
    }
    const next = updateDecision(data, {
      id: 'd1',
      update: { amount: 800, categoryId: 'hobby', itemName: '漫画', outcome: 'skipped', purchaseReason: undefined },
      now,
    })
    expect(next.decisions[0]).toMatchObject({
      amount: 800,
      categoryId: 'hobby',
      itemName: '漫画',
      outcome: 'skipped',
    })
  })

  it('日付（createdAt）は変更されない', () => {
    const data = {
      ...createEmptyData(),
      decisions: [makeDecision({ id: 'd1', createdAt: '2026-08-01T00:00:00.000Z' })],
    }
    const next = updateDecision(data, {
      id: 'd1',
      update: { amount: 800, categoryId: 'hobby', itemName: undefined, outcome: 'skipped', purchaseReason: undefined },
      now,
    })
    expect(next.decisions[0].createdAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('編集で累計が節目を下回ると、実績が解除状態から外れる', () => {
    const data = {
      ...createEmptyData(),
      decisions: [makeDecision({ id: 'd1', amount: 1000, outcome: 'skipped' })],
      achievements: [
        { id: 'amount-1000', kind: { type: 'amount' as const, threshold: 1000 }, unlockedAt: '2026-08-01T00:00:00.000Z' },
      ],
    }
    const next = updateDecision(data, {
      id: 'd1',
      update: { amount: 300, categoryId: 'convenience', itemName: undefined, outcome: 'skipped', purchaseReason: undefined },
      now,
    })
    expect(next.achievements).toEqual([])
  })

  it('アーカイブ済みの保留を「やめた」に変更すると、archivedAtが解除され確定節約額に含まれる', () => {
    const data = {
      ...createEmptyData(),
      decisions: [
        makeDecision({
          id: 'd1',
          amount: 500,
          outcome: 'pending',
          archivedAt: '2026-08-02T00:00:00.000Z',
        }),
      ],
    }
    const next = updateDecision(data, {
      id: 'd1',
      update: {
        amount: 500,
        categoryId: 'convenience',
        itemName: undefined,
        outcome: 'skipped',
        purchaseReason: undefined,
      },
      now,
    })
    expect(next.decisions[0].archivedAt).toBeUndefined()
    expect(totalConfirmedSavings(next.decisions)).toBe(500)
  })

  it('判断結果を保留のままにした場合、既存のarchivedAtは変更しない', () => {
    const data = {
      ...createEmptyData(),
      decisions: [
        makeDecision({
          id: 'd1',
          amount: 500,
          outcome: 'pending',
          archivedAt: '2026-08-02T00:00:00.000Z',
        }),
      ],
    }
    const next = updateDecision(data, {
      id: 'd1',
      update: {
        amount: 700,
        categoryId: 'convenience',
        itemName: undefined,
        outcome: 'pending',
        purchaseReason: undefined,
      },
      now,
    })
    expect(next.decisions[0].archivedAt).toBe('2026-08-02T00:00:00.000Z')
  })
})

describe('履歴の削除（removeDecision）', () => {
  const now = new Date('2026-08-03T00:00:00.000Z')

  it('削除すると一覧から消える', () => {
    const data = { ...createEmptyData(), decisions: [makeDecision({ id: 'd1' })] }
    const next = removeDecision(data, { id: 'd1', now })
    expect(next.decisions).toHaveLength(0)
  })

  it('削除で累計が節目を下回ると、実績が解除状態から外れる', () => {
    const data = {
      ...createEmptyData(),
      decisions: [
        makeDecision({ id: 'd1', amount: 1000, outcome: 'skipped' }),
        makeDecision({ id: 'd2', amount: 500, outcome: 'skipped' }),
      ],
      achievements: [
        { id: 'amount-1000', kind: { type: 'amount' as const, threshold: 1000 }, unlockedAt: '2026-08-01T00:00:00.000Z' },
      ],
    }
    const next = removeDecision(data, { id: 'd1', now })
    expect(next.achievements).toEqual([])
    expect(next.decisions).toHaveLength(1)
  })
})

describe('保留の自動アーカイブ（archiveExpiredPendingDecisions）', () => {
  it('48時間経過した未対応の保留をアーカイブする', () => {
    const now = new Date('2026-08-03T00:00:00.000Z')
    const data = {
      ...createEmptyData(),
      decisions: [makeDecision({ id: 'd1', createdAt: '2026-08-01T00:00:00.000Z' })],
    }
    const next = archiveExpiredPendingDecisions(data, now)
    expect(next.decisions[0].archivedAt).toBe(now.toISOString())
  })

  it('48時間未満の保留はアーカイブしない', () => {
    const now = new Date('2026-08-01T12:00:00.000Z')
    const data = {
      ...createEmptyData(),
      decisions: [makeDecision({ id: 'd1', createdAt: '2026-08-01T00:00:00.000Z' })],
    }
    const next = archiveExpiredPendingDecisions(data, now)
    expect(next.decisions[0].archivedAt).toBeUndefined()
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

describe('通知設定の更新（updateNotificationSettings）', () => {
  it('指定した項目だけを更新し、他は変えない', () => {
    const next = updateNotificationSettings(createEmptyData(), { weeklySummary: true })
    expect(next.settings.notifications).toEqual({
      pendingReminder: true,
      weeklySummary: true,
      monthlySummary: false,
    })
  })
})

describe('時給の更新（updateHourlyWage）', () => {
  it('時給を登録する', () => {
    const next = updateHourlyWage(createEmptyData(), 1200)
    expect(next.settings.hourlyWage).toBe(1200)
  })

  it('undefinedを渡すと未登録に戻る', () => {
    const withWage = updateHourlyWage(createEmptyData(), 1200)
    const next = updateHourlyWage(withWage, undefined)
    expect(next.settings.hourlyWage).toBeUndefined()
  })

  it('他の設定項目は変えない', () => {
    const next = updateHourlyWage(createEmptyData(), 1200)
    expect(next.settings.onboardingCompleted).toBe(false)
    expect(next.settings.notifications).toEqual({
      pendingReminder: true,
      weeklySummary: false,
      monthlySummary: false,
    })
  })
})

describe('カテゴリの表示・非表示（toggleCategoryVisibility）', () => {
  const ALL: CategoryId[] = ['convenience', 'hobby', 'other']

  it('表示中のカテゴリを非表示にできる', () => {
    const next = toggleCategoryVisibility(createEmptyData(), 'convenience', ALL)
    expect(next.settings.hiddenCategoryIds).toEqual(['convenience'])
  })

  it('非表示中のカテゴリを表示に戻せる', () => {
    const data = {
      ...createEmptyData(),
      settings: {
        ...createEmptyData().settings,
        hiddenCategoryIds: ['convenience', 'hobby'] as CategoryId[],
      },
    }
    const next = toggleCategoryVisibility(data, 'convenience', ALL)
    expect(next.settings.hiddenCategoryIds).toEqual(['hobby'])
  })

  it('最後の1つを非表示にしようとした場合は変更しない', () => {
    const data = {
      ...createEmptyData(),
      settings: {
        ...createEmptyData().settings,
        hiddenCategoryIds: ['convenience', 'hobby'] as CategoryId[],
      },
    }
    const next = toggleCategoryVisibility(data, 'other', ALL)
    expect(next.settings.hiddenCategoryIds).toEqual(['convenience', 'hobby'])
  })
})

describe('週次・月次まとめを閉じる', () => {
  it('dismissWeeklySummaryは対象週のキーを記録する', () => {
    const next = dismissWeeklySummary(createEmptyData(), '2026-08-24')
    expect(next.settings.lastDismissedWeeklySummaryWeek).toBe('2026-08-24')
  })

  it('dismissMonthlySummaryは対象月のキーを記録する', () => {
    const next = dismissMonthlySummary(createEmptyData(), '2026-08')
    expect(next.settings.lastDismissedMonthlySummaryMonth).toBe('2026-08')
  })
})

describe('全データのリセット（resetAllData）', () => {
  it('初期状態を返す', () => {
    expect(resetAllData()).toEqual(createEmptyData())
  })
})
