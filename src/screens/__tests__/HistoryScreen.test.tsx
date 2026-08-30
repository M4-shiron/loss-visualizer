import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { totalConfirmedSavings } from '../../domain/decisions'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { seedCompletedOnboarding } from '../../test/seed'
import type { Achievement, Decision } from '../../types/domain'

function renderHistory() {
  return render(
    <MemoryRouter initialEntries={['/history']}>
      <App />
    </MemoryRouter>,
  )
}

function readStoredData(): StoredData {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('保存データが見つかりません')
  return JSON.parse(raw) as StoredData
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: crypto.randomUUID(),
    amount: 500,
    categoryId: 'convenience',
    itemName: undefined,
    outcome: 'skipped',
    createdAt: '2026-08-15T00:00:00.000Z',
    resolvedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('履歴画面', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('記録が0件でもクラッシュせず、空状態の文言が出る', () => {
    seedCompletedOnboarding()
    renderHistory()
    expect(screen.getByText('記録がありません。')).toBeInTheDocument()
  })

  it('月別・日付の新しい順に表示される', () => {
    seedCompletedOnboarding({
      decisions: [
        makeDecision({
          id: 'd1',
          itemName: '7月の判断',
          createdAt: '2026-07-10T00:00:00.000Z',
          resolvedAt: '2026-07-10T00:00:00.000Z',
        }),
        makeDecision({
          id: 'd2',
          itemName: '8月の新しい判断',
          createdAt: '2026-08-20T00:00:00.000Z',
          resolvedAt: '2026-08-20T00:00:00.000Z',
        }),
        makeDecision({
          id: 'd3',
          itemName: '8月の古い判断',
          createdAt: '2026-08-05T00:00:00.000Z',
          resolvedAt: '2026-08-05T00:00:00.000Z',
        }),
      ],
    })
    renderHistory()

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['2026年8月', '2026年7月'])

    const names = screen.getAllByText(/判断$/).map((el) => el.textContent)
    expect(names).toEqual(['8月の新しい判断', '8月の古い判断', '7月の判断'])
  })

  it('判断結果で絞り込める', () => {
    seedCompletedOnboarding({
      decisions: [
        makeDecision({ id: 'd1', itemName: 'やめた方', outcome: 'skipped' }),
        makeDecision({ id: 'd2', itemName: '買った方', outcome: 'purchased' }),
      ],
    })
    renderHistory()

    fireEvent.click(screen.getByRole('button', { name: '買った' }))
    expect(screen.getByText('買った方')).toBeInTheDocument()
    expect(screen.queryByText('やめた方')).not.toBeInTheDocument()
  })

  it('行をタップすると詳細が展開し、編集・削除ボタンが現れる', () => {
    seedCompletedOnboarding({
      decisions: [makeDecision({ id: 'd1', itemName: 'アイス', purchaseReason: undefined })],
    })
    renderHistory()

    fireEvent.click(screen.getByText('アイス'))
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('編集すると内容とホームの集計値の両方に反映される', () => {
    seedCompletedOnboarding({
      decisions: [
        makeDecision({ id: 'd1', itemName: 'アイス', amount: 500, outcome: 'skipped' }),
      ],
    })
    renderHistory()

    fireEvent.click(screen.getByText('アイス'))
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    const amountInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(amountInput, { target: { value: '800' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    const data = readStoredData()
    expect(data.decisions[0].amount).toBe(800)
    expect(totalConfirmedSavings(data.decisions)).toBe(800)
  })

  it('削除は確認ステップを挟み、確定するとホームの集計値が正しく減る', () => {
    seedCompletedOnboarding({
      decisions: [
        makeDecision({ id: 'd1', itemName: 'アイス', amount: 500 }),
        makeDecision({ id: 'd2', itemName: 'ラーメン', amount: 300 }),
      ],
    })
    renderHistory()

    fireEvent.click(screen.getByText('アイス'))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(screen.getByText('削除しますか？')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
    expect(totalConfirmedSavings(data.decisions)).toBe(300)
  })

  it('編集で累計が節目を下回ると、実績が再計算される', () => {
    const achievement: Achievement = {
      id: 'amount-1000',
      kind: { type: 'amount', threshold: 1000 },
      unlockedAt: '2026-08-01T00:00:00.000Z',
    }
    seedCompletedOnboarding({
      decisions: [makeDecision({ id: 'd1', amount: 1000, outcome: 'skipped' })],
      achievements: [achievement],
    })
    renderHistory()

    fireEvent.click(screen.getByText('コンビニ'))
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    const amountInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(amountInput, { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    const data = readStoredData()
    expect(data.achievements).toEqual([])
  })
})

describe('履歴画面: 展開行のキーボード操作', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  /**
   * 行全体が role="button" の展開トグルになっているため、内側の「編集」「削除」上で
   * Enter / Space を押すと、keydown が外側までバブルして行が閉じてしまっていた。
   * さらに外側が preventDefault を呼ぶことで、ボタン本来のクリック生成も打ち消され、
   * キーボードからは編集も削除も実行できない状態だった（第10ループのレビュー指摘）。
   */
  it('「編集」上でEnterを押しても行が閉じない', () => {
    seedCompletedOnboarding({ decisions: [makeDecision({ id: 'd1', itemName: 'テスト' })] })
    renderHistory()

    fireEvent.click(screen.getByText('テスト'))
    const editButton = screen.getByRole('button', { name: '編集' })

    fireEvent.keyDown(editButton, { key: 'Enter', bubbles: true })

    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
  })

  it('「削除」上でSpaceを押しても行が閉じない', () => {
    seedCompletedOnboarding({ decisions: [makeDecision({ id: 'd1', itemName: 'テスト' })] })
    renderHistory()

    fireEvent.click(screen.getByText('テスト'))
    const deleteButton = screen.getByRole('button', { name: '削除' })

    fireEvent.keyDown(deleteButton, { key: ' ', bubbles: true })

    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('行そのものの上でEnterを押したときは、これまでどおり開閉できる', () => {
    seedCompletedOnboarding({ decisions: [makeDecision({ id: 'd1', itemName: 'テスト' })] })
    renderHistory()

    const row = screen.getByText('テスト').closest('[role="button"]')
    if (!row) throw new Error('行が見つかりません')

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument()
  })
})
