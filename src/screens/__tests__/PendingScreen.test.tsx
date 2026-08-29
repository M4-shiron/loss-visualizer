import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { totalConfirmedSavings, pendingAmount } from '../../domain/decisions'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { seedCompletedOnboarding } from '../../test/seed'
import type { Decision } from '../../types/domain'

function renderPending() {
  return render(
    <MemoryRouter initialEntries={['/pending']}>
      <App />
    </MemoryRouter>,
  )
}

function readStoredData(): StoredData {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('保存データが見つかりません')
  return JSON.parse(raw) as StoredData
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function makePending(overrides: Partial<Decision> = {}): Decision {
  return {
    id: crypto.randomUUID(),
    amount: 500,
    categoryId: 'convenience',
    outcome: 'pending',
    createdAt: hoursAgo(1),
    ...overrides,
  }
}

describe('保留画面', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('保留が0件でもクラッシュせず、空状態の文言が出る', () => {
    seedCompletedOnboarding()
    renderPending()
    expect(screen.getByText('保留中の判断はありません。')).toBeInTheDocument()
  })

  it('「やめる」で確定すると、確定節約額に加算され保留額から外れる', () => {
    const pending = makePending({ amount: 800 })
    seedCompletedOnboarding({ decisions: [pending] })
    renderPending()

    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))

    const data = readStoredData()
    expect(data.decisions[0].outcome).toBe('skipped')
    expect(totalConfirmedSavings(data.decisions)).toBe(800)
    expect(pendingAmount(data.decisions)).toBe(0)
  })

  it('「買う」で確定すると、確定節約額は増えず保留額から外れる', () => {
    const pending = makePending({ amount: 800 })
    seedCompletedOnboarding({ decisions: [pending] })
    renderPending()

    fireEvent.click(screen.getByRole('button', { name: '買う' }))
    fireEvent.click(screen.getByRole('button', { name: 'スキップして確定' }))

    const data = readStoredData()
    expect(data.decisions[0].outcome).toBe('purchased')
    expect(totalConfirmedSavings(data.decisions)).toBe(0)
    expect(pendingAmount(data.decisions)).toBe(0)
  })

  it('「買う」で理由を選ぶと、その理由が記録される', () => {
    const pending = makePending({ amount: 800 })
    seedCompletedOnboarding({ decisions: [pending] })
    renderPending()

    fireEvent.click(screen.getByRole('button', { name: '買う' }))
    fireEvent.click(screen.getByRole('button', { name: 'ご褒美' }))

    const data = readStoredData()
    expect(data.decisions[0].purchaseReason).toBe('reward')
  })

  it('24時間以上経過した保留は「そろそろ決めませんか？」と表示される', () => {
    const old = makePending({ amount: 500, createdAt: hoursAgo(25) })
    const fresh = makePending({ amount: 300, createdAt: hoursAgo(1) })
    seedCompletedOnboarding({ decisions: [fresh, old] })
    renderPending()

    expect(screen.getByText('そろそろ決めませんか？')).toBeInTheDocument()
  })

  it('48時間経過した未対応の保留は、画面を開くとアーカイブされ一覧から消える', () => {
    const expired = makePending({ amount: 900, createdAt: hoursAgo(50) })
    seedCompletedOnboarding({ decisions: [expired] })
    renderPending()

    expect(screen.getByText('保留中の判断はありません。')).toBeInTheDocument()
    const data = readStoredData()
    expect(data.decisions[0].archivedAt).toBeDefined()
    expect(pendingAmount(data.decisions)).toBe(0)
    expect(totalConfirmedSavings(data.decisions)).toBe(0)
  })

  it('保留中の合計金額が表示される', () => {
    seedCompletedOnboarding({
      decisions: [makePending({ amount: 500 }), makePending({ amount: 300 })],
    })
    renderPending()
    expect(screen.getByText('保留中の合計：800円')).toBeInTheDocument()
  })
})
