import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe('画面遷移', () => {
  it('ホームに購入判断への大きな導線が表示される', () => {
    renderApp()
    expect(
      screen.getByRole('link', { name: '買うか迷っている' }),
    ).toBeInTheDocument()
  })

  it('ホームの導線から購入判断画面へ移動できる', () => {
    renderApp()
    fireEvent.click(screen.getByRole('link', { name: '買うか迷っている' }))
    expect(screen.getByRole('heading', { name: '購入判断' })).toBeInTheDocument()
  })

  it.each([
    ['履歴', '履歴'],
    ['保留', '保留中'],
    ['設定', '設定'],
  ])('下部ナビの「%s」から該当画面へ移動できる', (navLabel, headingName) => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'メインナビゲーション' })
    fireEvent.click(within(nav).getByRole('link', { name: navLabel }))
    expect(screen.getByRole('heading', { name: headingName })).toBeInTheDocument()
  })

  it('初回設定の画面を開ける', () => {
    renderApp('/onboarding')
    expect(
      screen.getByRole('heading', { name: 'はじめる前に' }),
    ).toBeInTheDocument()
  })

  it('定義されていないパスはホームへ戻す', () => {
    renderApp('/unknown-path')
    expect(
      screen.getByRole('link', { name: '買うか迷っている' }),
    ).toBeInTheDocument()
  })
})
