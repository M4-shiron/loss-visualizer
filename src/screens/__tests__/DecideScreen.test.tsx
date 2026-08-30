import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { pendingAmount, totalConfirmedSavings } from '../../domain/decisions'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { seedCompletedOnboarding } from '../../test/seed'

function renderDecideScreen() {
  return render(
    <MemoryRouter initialEntries={['/decide']}>
      <App />
    </MemoryRouter>,
  )
}

function readStoredData(): StoredData {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error('保存データが見つかりません')
  return JSON.parse(raw) as StoredData
}

/** 入力ステップでカテゴリと金額を選び、「次へ」で判断ステップへ進む。 */
function fillInputAndProceed(amountDigits: string, categoryName = 'コンビニ') {
  fireEvent.click(screen.getByRole('button', { name: categoryName }))
  fireEvent.change(screen.getByLabelText('金額'), { target: { value: amountDigits } })
  fireEvent.click(screen.getByRole('button', { name: '次へ' }))
}

describe('購入判断フロー', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedCompletedOnboarding()
  })

  afterEach(() => {
    cleanup()
  })

  it('「やめる」を選ぶと履歴に1件記録され、確定節約額に含まれる', () => {
    renderDecideScreen()
    fillInputAndProceed('180')

    expect(screen.getByText('180円')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))

    expect(screen.getByText('守れました')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
    expect(data.decisions[0].outcome).toBe('skipped')
    expect(data.decisions[0].amount).toBe(180)
    expect(totalConfirmedSavings(data.decisions)).toBe(180)
  })

  it('「買う」を選び理由をスキップしても記録され、確定節約額には含まれない', () => {
    renderDecideScreen()
    fillInputAndProceed('500')
    fireEvent.click(screen.getByRole('button', { name: '買う' }))

    expect(screen.getByText('よければ、理由を教えてください')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }))

    expect(screen.getByText('記録しました')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
    expect(data.decisions[0].outcome).toBe('purchased')
    expect(data.decisions[0].purchaseReason).toBeUndefined()
    expect(totalConfirmedSavings(data.decisions)).toBe(0)
  })

  it('「買う」を選び理由を選択すると、その理由が記録される', () => {
    renderDecideScreen()
    fillInputAndProceed('500')
    fireEvent.click(screen.getByRole('button', { name: '買う' }))
    fireEvent.click(screen.getByRole('button', { name: 'ご褒美' }))

    const data = readStoredData()
    expect(data.decisions[0].purchaseReason).toBe('reward')
    expect(screen.getByText('理由：ご褒美')).toBeInTheDocument()
  })

  it('「あとで考える」を選ぶと保留として記録され、確定節約額には含まれない', () => {
    renderDecideScreen()
    fillInputAndProceed('1200')
    fireEvent.click(screen.getByRole('button', { name: 'あとで考える' }))

    expect(screen.getByText('保留にしました')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
    expect(data.decisions[0].outcome).toBe('pending')
    expect(totalConfirmedSavings(data.decisions)).toBe(0)
    expect(pendingAmount(data.decisions)).toBe(1200)
  })

  it('価値尺度・節約目標が未登録でも、一般比較のカードが1枚以上表示される', () => {
    renderDecideScreen()
    fillInputAndProceed('180')

    expect(screen.getAllByText('目安').length).toBeGreaterThan(0)
  })

  it('金額1,000円ちょうどで実績が解除され、結果画面に表示される', () => {
    renderDecideScreen()
    fillInputAndProceed('1000')
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))

    expect(screen.getByText('実績を解除しました')).toBeInTheDocument()
    expect(screen.getByText('累計1,000円達成')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.achievements).toHaveLength(1)
    expect(data.achievements[0].kind).toEqual({ type: 'amount', threshold: 1000 })
  })

  it('判断ステップから戻ると入力ステップに戻り、何も記録されない', () => {
    renderDecideScreen()
    fillInputAndProceed('300')
    expect(screen.getByText('300円')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '前の画面へ戻る' }))

    expect(screen.getByText('何に迷っていますか？')).toBeInTheDocument()
    expect(readStoredData().decisions).toHaveLength(0)
  })

  it('入力ステップでの戻るは何も記録せず前の画面へ遷移する', () => {
    renderDecideScreen()
    fireEvent.click(screen.getByRole('button', { name: '前の画面へ戻る' }))

    expect(readStoredData().decisions).toHaveLength(0)
  })

  it('金額が未入力のままでは「次へ」に進めない', () => {
    renderDecideScreen()
    fireEvent.click(screen.getByRole('button', { name: 'コンビニ' }))
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })

  it('再読み込み後も記録済みのデータが残る（新しいAppインスタンスでも累積する）', () => {
    renderDecideScreen()
    fillInputAndProceed('100')
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))
    cleanup()

    renderDecideScreen()
    fillInputAndProceed('200')
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }))

    const data = readStoredData()
    expect(data.decisions).toHaveLength(2)
    expect(totalConfirmedSavings(data.decisions)).toBe(300)
  })

  it('再描画前に連続でタップされても記録は1件だけになる', () => {
    renderDecideScreen()
    fillInputAndProceed('180')

    const skipButton = screen.getByRole('button', { name: 'やめる' })
    // 1つのactブロック内で2回発火させ、再描画（ボタンの消失）が挟まらない
    // 状態で連続タップされた場合を再現する。
    act(() => {
      fireEvent.click(skipButton)
      fireEvent.click(skipButton)
    })

    const data = readStoredData()
    expect(data.decisions).toHaveLength(1)
  })
})

describe('カテゴリの表示・非表示', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedCompletedOnboarding()
  })
  afterEach(() => cleanup())

  it('非表示にしたカテゴリは選択肢から消える', () => {
    seedCompletedOnboarding({
      settings: {
        onboardingCompleted: true,
        notifications: { pendingReminder: true, weeklySummary: false, monthlySummary: false },
        hiddenCategoryIds: ['game-charge'],
      },
    })
    renderDecideScreen()

    expect(screen.queryByRole('button', { name: 'ゲーム課金' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'コンビニ' })).toBeInTheDocument()
  })
})
