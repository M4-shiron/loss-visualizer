import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { seedCompletedOnboarding } from '../../test/seed'
import type { Achievement, Decision, Goal, ValueItem } from '../../types/domain'

function renderHistory() {
  return render(
    <MemoryRouter initialEntries={['/history']}>
      <App />
    </MemoryRouter>,
  )
}

function goToInsights() {
  fireEvent.click(screen.getByRole('tab', { name: '振り返り' }))
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: crypto.randomUUID(),
    amount: 500,
    categoryId: 'convenience',
    outcome: 'skipped',
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('履歴画面: タブ切り替え', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('「記録」タブが既定で表示され、「振り返り」タブに切り替えられる', () => {
    seedCompletedOnboarding()
    renderHistory()

    expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument()

    goToInsights()
    expect(screen.getByText('月別の確定節約額（直近6か月）')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'すべて' })).not.toBeInTheDocument()
  })
})

describe('振り返りタブ: 空データでもクラッシュしない', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('判断・価値尺度・目標が0件でもクラッシュしない', () => {
    seedCompletedOnboarding()
    renderHistory()
    goToInsights()

    expect(screen.getAllByText('まだ確定した節約がありません。').length).toBeGreaterThan(0)
    // 価値尺度・目標が未登録の場合、セクションごと消すのではなく設定への導線を表示する（第9ループ）。
    expect(screen.getByText('価値尺度への到達度')).toBeInTheDocument()
    expect(screen.getByText('目標への到達度')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '設定で登録する' })).toHaveLength(2)
    // 実績は「未解除」の節目一覧として、判断が0件でも表示される（空状態にはならない）。
    expect(screen.getByText('累計1,000円まで、あと1,000円')).toBeInTheDocument()
  })
})

describe('振り返りタブ: 実績の一覧', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('解除済み（達成日つき）と未解除（残り表示）の両方が一覧できる', () => {
    const achievement: Achievement = {
      id: 'amount-1000',
      kind: { type: 'amount', threshold: 1000 },
      unlockedAt: '2026-08-10T00:00:00.000Z',
    }
    seedCompletedOnboarding({
      decisions: [makeDecision({ amount: 1000 })],
      achievements: [achievement],
    })
    renderHistory()
    goToInsights()

    expect(screen.getByText('累計1,000円達成')).toBeInTheDocument()
    expect(screen.getByText('8/10 達成')).toBeInTheDocument()
    expect(screen.getByText('累計5,000円まで、あと4,000円')).toBeInTheDocument()
  })
})

describe('振り返りタブ: 価値尺度・目標への到達度', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  function makeValueItem(overrides: Partial<ValueItem> = {}): ValueItem {
    return { id: 'v1', name: '焼肉', price: 4000, createdAt: '2026-08-01T00:00:00.000Z', ...overrides }
  }

  function makeGoal(overrides: Partial<Goal> = {}): Goal {
    return {
      id: 'g1',
      title: '旅行資金',
      targetAmount: 50000,
      isPriority: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('価値尺度への到達度が表示される', () => {
    seedCompletedOnboarding({
      decisions: [makeDecision({ amount: 2000 })],
      valueItems: [makeValueItem({ price: 4000 })],
    })
    renderHistory()
    goToInsights()

    expect(screen.getByText('焼肉まで、あと2,000円')).toBeInTheDocument()
  })

  it('目標への到達度が表示される', () => {
    seedCompletedOnboarding({
      decisions: [makeDecision({ amount: 16000 })],
      goals: [makeGoal({ targetAmount: 50000 })],
    })
    renderHistory()
    goToInsights()

    expect(screen.getByText('達成率 32%')).toBeInTheDocument()
  })
})

describe('振り返りタブ: グラフ', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('時系列グラフは、データが少なくても固定で6か月分のラベルを持つ', () => {
    seedCompletedOnboarding({ decisions: [makeDecision({ amount: 500 })] })
    renderHistory()
    goToInsights()

    const chart = screen.getByRole('img', { name: /月別の確定節約額/ })
    const monthCount = (chart.getAttribute('aria-label')?.match(/\d+月/g) ?? []).length
    expect(monthCount).toBe(6)
  })

  it('カテゴリ別グラフは確定節約額のみで構成され、保留額は含めない', () => {
    seedCompletedOnboarding({
      decisions: [
        makeDecision({ categoryId: 'convenience', amount: 300, outcome: 'skipped' }),
        makeDecision({ categoryId: 'hobby', amount: 900, outcome: 'pending', resolvedAt: undefined }),
      ],
    })
    renderHistory()
    goToInsights()

    const chart = screen.getByRole('img', { name: /カテゴリ別の確定節約額/ })
    expect(chart.getAttribute('aria-label')).toContain('コンビニ 300円')
    expect(chart.getAttribute('aria-label')).not.toContain('趣味・娯楽')
  })
})
