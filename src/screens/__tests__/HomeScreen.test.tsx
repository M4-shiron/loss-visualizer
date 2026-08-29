import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { seedCompletedOnboarding } from '../../test/seed'
import type { Decision, Goal } from '../../types/domain'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

function makeDecision(overrides: Partial<Decision>): Decision {
  return {
    id: crypto.randomUUID(),
    amount: 100,
    categoryId: 'convenience',
    outcome: 'skipped',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    title: '旅行資金',
    targetAmount: 50000,
    isPriority: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/** 今月の確定節約額（ファーストビューの大きな数字）を取得する。 */
function monthlySavingsText(container: HTMLElement): string | null {
  return container.querySelector('.text-4xl.font-extrabold')?.textContent ?? null
}

/** StatTileはラベルの直後の要素に数値を表示するので、ラベルから辿って取得する。 */
function statTileValue(labelText: string): string | null {
  const label = screen.getByText(labelText)
  return label.nextElementSibling?.textContent ?? null
}

describe('ホーム', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('判断が0件でもクラッシュせず、空状態の文言が出る', () => {
    seedCompletedOnboarding()
    const { container } = renderHome()

    expect(monthlySavingsText(container)).toBe('0円')
    expect(
      screen.getByText('まだ記録がありません。最初の判断をしてみましょう。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()
  })

  it('優先目標がなくてもクラッシュしない', () => {
    seedCompletedOnboarding({ goals: [makeGoal({ isPriority: false })] })
    renderHome()
    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()
  })

  it('6つの数値が集計関数の手計算値と一致する', () => {
    const now = new Date()
    const decisions: Decision[] = [
      makeDecision({ amount: 300, outcome: 'skipped', createdAt: now.toISOString() }),
      makeDecision({ amount: 500, outcome: 'skipped', createdAt: now.toISOString() }),
      makeDecision({ amount: 800, outcome: 'purchased', createdAt: now.toISOString() }),
      makeDecision({ amount: 1200, outcome: 'pending', createdAt: now.toISOString() }),
      // 先月の確定分（総累計には入るが、今月の集計には入らない）
      makeDecision({
        amount: 1000,
        outcome: 'skipped',
        createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      }),
    ]
    const goal = makeGoal({ targetAmount: 4000, isPriority: true })
    seedCompletedOnboarding({ decisions, goals: [goal] })

    const { container } = renderHome()

    // 今月の確定節約額: 300 + 500 = 800円
    expect(monthlySavingsText(container)).toBe('800円')
    // 総累計の確定節約額: 300 + 500 + 1000 = 1,800円
    expect(statTileValue('総累計の節約額')).toBe('1,800円')
    // 保留中の回避額: 1,200円
    expect(statTileValue('保留中の回避額')).toBe('1,200円')
    // 今月、思いとどまった回数: 2回
    expect(statTileValue('今月、思いとどまった回数')).toBe('2回')
    // 累計、思いとどまった回数: 3回
    expect(statTileValue('累計、思いとどまった回数')).toBe('3回')
    // 優先目標の達成率: 総累計1,800円 / 目標4,000円 = 45%
    expect(screen.getByText('達成率 45%（目標 4,000円）')).toBeInTheDocument()
  })

  it('購入判断を記録した後、ホームの数値が更新される', () => {
    seedCompletedOnboarding()
    const { container } = renderHome()

    fireEvent.click(screen.getByRole('link', { name: '買うか迷っている' }))
    fireEvent.click(screen.getByRole('button', { name: 'コンビニ' }))
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: '次へ' }))
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))
    fireEvent.click(screen.getByRole('button', { name: 'ホームへ' }))

    expect(monthlySavingsText(container)).toBe('250円')
  })
})
