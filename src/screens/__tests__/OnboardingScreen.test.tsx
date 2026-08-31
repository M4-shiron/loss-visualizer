import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { stubNonSecureContextCrypto } from '../../test/nonSecureContext'

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <App />
    </MemoryRouter>,
  )
}

function readStoredData(): StoredData {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('保存データが見つかりません')
  return JSON.parse(raw) as StoredData
}

describe('オンボーディング', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('価値尺度を1件も選ばないと次へ進めない', () => {
    renderOnboarding()
    expect(screen.getByRole('button', { name: /次へ/ })).toBeDisabled()
  })

  it('候補を1件選ぶと次へ進める', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    expect(screen.getByRole('button', { name: /次へ/ })).not.toBeDisabled()
  })

  it('候補から選んだ価値尺度が保存され、目標をスキップして完了できる', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    fireEvent.click(screen.getByRole('button', { name: /ゲームソフト/ }))
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))

    expect(screen.getByText('節約目標（任意）')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'スキップして完了する' }))

    const data = readStoredData()
    expect(data.settings.onboardingCompleted).toBe(true)
    expect(data.valueItems.map((v) => v.name).sort()).toEqual(['ゲームソフト', '焼肉'])
    expect(data.goals).toHaveLength(0)

    // オンボーディング完了後はホームへ遷移し、ホームの導線が見える
    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()
  })

  it('自由入力でも価値尺度を追加できる', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: '＋自由に追加' }))
    fireEvent.change(screen.getByLabelText('名前'), { target: { value: '推し活グッズ' } })
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: '追加する' }))

    expect(screen.getByText(/推し活グッズ/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /次へ/ })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))
    fireEvent.click(screen.getByRole('button', { name: 'スキップして完了する' }))

    const data = readStoredData()
    expect(data.valueItems.map((v) => v.name)).toEqual(['推し活グッズ'])
    expect(data.valueItems[0].price).toBe(5000)
  })

  it('目標を登録すると、その目標が優先目標になる', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))

    fireEvent.change(screen.getByLabelText('目標名'), { target: { value: '旅行資金' } })
    fireEvent.change(screen.getByLabelText('目標額'), { target: { value: '50000' } })
    fireEvent.click(screen.getByRole('button', { name: '登録して完了する' }))

    const data = readStoredData()
    expect(data.goals).toHaveLength(1)
    expect(data.goals[0].title).toBe('旅行資金')
    expect(data.goals[0].isPriority).toBe(true)
  })

  it('完了後は再度ホームを開いてもオンボーディングへ誘導されない', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))
    fireEvent.click(screen.getByRole('button', { name: 'スキップして完了する' }))
    cleanup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()
  })
})

describe('オンボーディング（http接続など、randomUUIDが使えない環境）', () => {
  beforeEach(() => {
    window.localStorage.clear()
    stubNonSecureContextCrypto()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('価値尺度を登録して完了すると、onboardingCompletedがtrueになりホームへ遷移する', () => {
    renderOnboarding()

    // 未完了状態ではオンボーディングが表示されている
    expect(screen.getByText('はじめる前に')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))
    fireEvent.click(screen.getByRole('button', { name: 'スキップして完了する' }))

    // React側の状態が更新され、ホームへ遷移している
    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()
    expect(screen.queryByText('はじめる前に')).not.toBeInTheDocument()

    // 保存側にも反映されている
    const data = readStoredData()
    expect(data.settings.onboardingCompleted).toBe(true)
    expect(data.valueItems.map((v) => v.name)).toEqual(['焼肉'])
  })

  it('目標も登録して完了できる', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: /焼肉/ }))
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }))

    fireEvent.change(screen.getByLabelText('目標名'), { target: { value: '旅行資金' } })
    fireEvent.change(screen.getByLabelText('目標額'), { target: { value: '50000' } })
    fireEvent.click(screen.getByRole('button', { name: '登録して完了する' }))

    expect(screen.getByRole('link', { name: '買うか迷っている' })).toBeInTheDocument()

    const data = readStoredData()
    expect(data.settings.onboardingCompleted).toBe(true)
    expect(data.goals).toHaveLength(1)
    expect(data.goals[0].isPriority).toBe(true)
  })
})
