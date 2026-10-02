import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { seedCompletedOnboarding } from '../../test/seed'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('このアプリについて', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    cleanup()
  })

  it('オンボーディング前でも、データの扱いを読める（誘導されない）', () => {
    renderAt('/about')
    expect(screen.getByRole('heading', { name: 'このアプリについて' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'データとプライバシー' })).toHaveTextContent(
      'この端末のブラウザの中',
    )
  })

  it('「守れた金額」が実際の預金ではないことを明記している', () => {
    renderAt('/about')
    expect(screen.getByRole('region', { name: '表示についての注意' })).toHaveTextContent(
      '実際の預金残高ではありません',
    )
  })

  it('オンボーディング画面からデータの扱いへ移動できる', () => {
    renderAt('/onboarding')
    fireEvent.click(screen.getByRole('link', { name: 'データの扱いについて' }))
    expect(screen.getByRole('heading', { name: 'このアプリについて' })).toBeInTheDocument()
  })

  it('設定画面から開き、戻るで設定画面へ戻れる', () => {
    seedCompletedOnboarding()
    renderAt('/settings')
    fireEvent.click(screen.getByRole('link', { name: /このアプリについて・データの扱い/ }))
    expect(screen.getByRole('heading', { name: 'このアプリについて' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '← 戻る' }))
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
  })

  it('直接開いた場合（戻る先がない）は、戻るでホームへ移動する', () => {
    seedCompletedOnboarding()
    renderAt('/about')
    fireEvent.click(screen.getByRole('button', { name: '← 戻る' }))
    expect(screen.queryByRole('heading', { name: 'このアプリについて' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
