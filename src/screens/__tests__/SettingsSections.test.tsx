import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { seedCompletedOnboarding } from '../../test/seed'
import type { Decision } from '../../types/domain'

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
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
    outcome: 'pending',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('設定画面: アプリ内のお知らせ', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('通知トグルを切り替えると保存され、再読み込み後も保持される', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: 'アプリ内のお知らせ' }))
    fireEvent.click(section.getByRole('switch', { name: '週次まとめを表示' }))

    let data = readStoredData()
    expect(data.settings.notifications.weeklySummary).toBe(true)

    cleanup()
    renderSettings()
    data = readStoredData()
    expect(data.settings.notifications.weeklySummary).toBe(true)
    const reopened = within(screen.getByRole('region', { name: 'アプリ内のお知らせ' }))
    expect(reopened.getByRole('switch', { name: '週次まとめを表示' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('保留リマインダーは初期状態でON、週次・月次まとめは初期状態でOFF', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: 'アプリ内のお知らせ' }))
    expect(section.getByRole('switch', { name: '保留リマインダー' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(section.getByRole('switch', { name: '週次まとめを表示' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(section.getByRole('switch', { name: '月次まとめを表示' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})

describe('設定画面: カテゴリ設定', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('カテゴリを非表示にすると、購入判断の選択肢から消える', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: 'カテゴリ設定' }))
    fireEvent.click(section.getByRole('switch', { name: 'ゲーム課金' }))

    const data = readStoredData()
    expect(data.settings.hiddenCategoryIds).toEqual(['game-charge'])
  })

  it('最後の1カテゴリは非表示にできない', () => {
    seedCompletedOnboarding({
      settings: {
        onboardingCompleted: true,
        notifications: { pendingReminder: true, weeklySummary: false, monthlySummary: false },
        hiddenCategoryIds: [
          'restaurant-cafe',
          'game-charge',
          'fashion',
          'hobby',
          'daily',
          'subscription',
          'other',
        ],
      },
    })
    renderSettings()

    const section = within(screen.getByRole('region', { name: 'カテゴリ設定' }))
    fireEvent.click(section.getByRole('switch', { name: 'コンビニ' }))

    const data = readStoredData()
    expect(data.settings.hiddenCategoryIds).toHaveLength(7)
    expect(data.settings.hiddenCategoryIds).not.toContain('convenience')
  })
})

describe('設定画面: アーカイブの確認', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('アーカイブ件数が表示され、履歴の絞り込みへ導線がある', () => {
    seedCompletedOnboarding({
      decisions: [makeDecision({ archivedAt: '2026-08-05T00:00:00.000Z' })],
    })
    renderSettings()

    const section = within(screen.getByRole('region', { name: 'アーカイブの確認' }))
    expect(section.getByText(/現在1件/)).toBeInTheDocument()

    fireEvent.click(section.getByRole('link', { name: '履歴で確認する' }))
    expect(screen.getByRole('button', { name: '保留・アーカイブ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('設定画面: 全データのリセット', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('2段階の確認を経てリセットされ、オンボーディングに戻る', () => {
    seedCompletedOnboarding({ decisions: [makeDecision()] })
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: '全データを削除する' }))
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '削除する' }))
    expect(screen.getByText('最終確認です。本当によろしいですか？')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '完全に削除する' }))

    expect(screen.getByRole('heading', { name: 'はじめる前に' })).toBeInTheDocument()
    const data = readStoredData()
    expect(data.decisions).toHaveLength(0)
    expect(data.settings.onboardingCompleted).toBe(false)
  })

  it('キャンセルすると何も削除しない', () => {
    seedCompletedOnboarding({ decisions: [makeDecision()] })
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: '全データを削除する' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
  })
})

describe('設定画面: 時給の目安（改善方針3）', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('未登録のときは登録ボタンが表示される', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: '時給の目安' }))
    expect(section.getByRole('button', { name: '＋時給を登録する' })).toBeInTheDocument()
  })

  it('登録すると保存され、再読み込み後も保持される', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: '時給の目安' }))
    fireEvent.click(section.getByRole('button', { name: '＋時給を登録する' }))
    fireEvent.change(section.getByLabelText('時給の目安'), { target: { value: '1200' } })
    fireEvent.click(section.getByRole('button', { name: '保存する' }))

    expect(section.getByText('1,200円 / 時間')).toBeInTheDocument()
    let data = readStoredData()
    expect(data.settings.hourlyWage).toBe(1200)

    cleanup()
    renderSettings()
    const reloaded = within(screen.getByRole('region', { name: '時給の目安' }))
    expect(reloaded.getByText('1,200円 / 時間')).toBeInTheDocument()
  })

  it('削除すると未登録に戻る', () => {
    seedCompletedOnboarding({
      settings: {
        onboardingCompleted: true,
        notifications: { pendingReminder: true, weeklySummary: false, monthlySummary: false },
        hourlyWage: 1200,
      },
    })
    renderSettings()

    const section = within(screen.getByRole('region', { name: '時給の目安' }))
    fireEvent.click(section.getByRole('button', { name: '削除' }))

    expect(section.getByRole('button', { name: '＋時給を登録する' })).toBeInTheDocument()
    const data = readStoredData()
    expect(data.settings.hourlyWage).toBeUndefined()
  })

  it('未入力のままでは保存できない', () => {
    seedCompletedOnboarding()
    renderSettings()

    const section = within(screen.getByRole('region', { name: '時給の目安' }))
    fireEvent.click(section.getByRole('button', { name: '＋時給を登録する' }))
    expect(section.getByRole('button', { name: '保存する' })).toBeDisabled()
  })
})
