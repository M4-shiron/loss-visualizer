import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { createEmptyData, STORAGE_KEY } from '../../storage/schema'
import { AppStateContext, type AppStateContextValue } from '../../store/context'
import { seedCompletedOnboarding } from '../../test/seed'
import { SystemNotices } from '../SystemNotices'

/**
 * jsdomのlocalStorageはgetItem等をProxy経由で実装しており、vi.spyOn等での
 * 差し替えが効かない。そのため「保存が使えない」パターンはContextの値を
 * 直接注入して検証する（AppStateProvider・実際のlocalStorageは経由しない）。
 */
function renderWithContext(overrides: Partial<AppStateContextValue>) {
  const value: AppStateContextValue = {
    data: createEmptyData(),
    persistenceUnavailable: false,
    recoveredFromCorruption: false,
    recordDecision: vi.fn(),
    resolvePending: vi.fn(),
    updateDecision: vi.fn(),
    removeDecision: vi.fn(),
    addValueItem: vi.fn(),
    updateValueItem: vi.fn(),
    removeValueItem: vi.fn(),
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    removeGoal: vi.fn(),
    setPriorityGoal: vi.fn(),
    completeOnboarding: vi.fn(),
    archiveExpiredPending: vi.fn(),
    updateNotificationSettings: vi.fn(),
    updateHourlyWage: vi.fn(),
    setProPreview: vi.fn(),
    toggleCategoryVisibility: vi.fn(),
    dismissWeeklySummary: vi.fn(),
    dismissMonthlySummary: vi.fn(),
    resetAllData: vi.fn(),
    ...overrides,
  }
  return render(
    <AppStateContext.Provider value={value}>
      <SystemNotices />
    </AppStateContext.Provider>,
  )
}

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('保存に関する警告バナー（SystemNotices単体）', () => {
  afterEach(() => cleanup())

  it('保存が使えない環境では警告バナーが表示される', () => {
    renderWithContext({ persistenceUnavailable: true })
    expect(screen.getByText(/この環境では記録を保存できません/)).toBeInTheDocument()
  })

  it('保存データの破損から復旧した場合、その旨が表示される', () => {
    renderWithContext({ recoveredFromCorruption: true })
    expect(
      screen.getByText('保存データに問題が見つかったため、安全のため初期状態で起動しました。'),
    ).toBeInTheDocument()
  })

  it('破損復旧の通知は閉じられる', () => {
    renderWithContext({ recoveredFromCorruption: true })
    fireEvent.click(screen.getByRole('button', { name: 'このお知らせを閉じる' }))
    expect(
      screen.queryByText('保存データに問題が見つかったため、安全のため初期状態で起動しました。'),
    ).not.toBeInTheDocument()
  })

  it('保存が使えない警告バナーには閉じるボタンがない（継続的なリスクのため）', () => {
    renderWithContext({ persistenceUnavailable: true })
    expect(screen.queryByRole('button', { name: /閉じる/ })).not.toBeInTheDocument()
  })

  it('どちらの問題もない場合は何も表示しない', () => {
    const { container } = renderWithContext({})
    expect(container.textContent).toBe('')
  })
})

describe('保存データの破損復旧（実際のAppを通した結合テスト）', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('壊れた保存データがあると、どの画面でも初期状態で起動した旨が表示される', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ これは壊れたJSON')
    renderApp('/')
    expect(
      screen.getByText('保存データに問題が見つかったため、安全のため初期状態で起動しました。'),
    ).toBeInTheDocument()
  })

  it('正常に読み込めた場合はバナーが出ない', () => {
    seedCompletedOnboarding()
    renderApp('/')
    expect(
      screen.queryByText('保存データに問題が見つかったため、安全のため初期状態で起動しました。'),
    ).not.toBeInTheDocument()
  })
})
