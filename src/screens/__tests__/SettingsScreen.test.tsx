import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { STORAGE_KEY, type StoredData } from '../../storage/schema'
import { seedCompletedOnboarding } from '../../test/seed'

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>,
  )
}

function renderDecide() {
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

function valueItemSection() {
  return within(screen.getByRole('region', { name: '価値尺度' }))
}

function goalSection() {
  return within(screen.getByRole('region', { name: '節約目標' }))
}

describe('設定画面: 価値尺度', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedCompletedOnboarding()
  })
  afterEach(() => cleanup())

  it('追加すると一覧に表示され、再読み込み後も残る', () => {
    renderSettings()
    const section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    fireEvent.change(section.getByLabelText('名前'), { target: { value: '焼肉' } })
    fireEvent.change(section.getByLabelText('金額'), { target: { value: '4000' } })
    fireEvent.click(section.getByRole('button', { name: '追加する' }))

    expect(section.getByText('焼肉')).toBeInTheDocument()
    expect(section.getByText('4,000円')).toBeInTheDocument()

    cleanup()
    renderSettings()
    expect(valueItemSection().getByText('焼肉')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.valueItems).toHaveLength(1)
  })

  it('編集すると内容が更新される', () => {
    renderSettings()
    let section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    fireEvent.change(section.getByLabelText('名前'), { target: { value: '焼肉' } })
    fireEvent.change(section.getByLabelText('金額'), { target: { value: '4000' } })
    fireEvent.click(section.getByRole('button', { name: '追加する' }))

    section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '編集' }))
    const nameInput = section.getByLabelText('名前')
    fireEvent.change(nameInput, { target: { value: '焼肉(更新)' } })
    fireEvent.click(section.getByRole('button', { name: '保存する' }))

    expect(valueItemSection().getByText('焼肉(更新)')).toBeInTheDocument()
  })

  it('削除は確認ステップを挟み、確定すると一覧から消える', () => {
    renderSettings()
    let section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    fireEvent.change(section.getByLabelText('名前'), { target: { value: '焼肉' } })
    fireEvent.change(section.getByLabelText('金額'), { target: { value: '4000' } })
    fireEvent.click(section.getByRole('button', { name: '追加する' }))

    section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '削除' }))
    expect(section.getByText('削除しますか？')).toBeInTheDocument()

    fireEvent.click(section.getByRole('button', { name: '削除する' }))
    expect(valueItemSection().queryByText('焼肉')).not.toBeInTheDocument()

    const data = readStoredData()
    expect(data.valueItems).toHaveLength(0)
  })

  it('名前が空、または金額が0円では追加できない', () => {
    renderSettings()
    const section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    expect(section.getByRole('button', { name: '追加する' })).toBeDisabled()

    fireEvent.change(section.getByLabelText('名前'), { target: { value: 'アイス' } })
    expect(section.getByRole('button', { name: '追加する' })).toBeDisabled()

    fireEvent.change(section.getByLabelText('金額'), { target: { value: '0' } })
    expect(section.getByRole('button', { name: '追加する' })).toBeDisabled()
  })
})

describe('設定画面: 節約目標', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedCompletedOnboarding()
  })
  afterEach(() => cleanup())

  function addGoal(title: string, targetAmount: string) {
    const section = goalSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    fireEvent.change(section.getByLabelText('目標名'), { target: { value: title } })
    fireEvent.change(section.getByLabelText('目標額'), { target: { value: targetAmount } })
    fireEvent.click(section.getByRole('button', { name: '追加する' }))
  }

  it('追加すると一覧に表示され、再読み込み後も残る', () => {
    renderSettings()
    addGoal('旅行資金', '50000')

    expect(goalSection().getByText('旅行資金')).toBeInTheDocument()

    cleanup()
    renderSettings()
    expect(goalSection().getByText('旅行資金')).toBeInTheDocument()

    const data = readStoredData()
    expect(data.goals).toHaveLength(1)
  })

  it('達成率が表示される', () => {
    renderSettings()
    addGoal('旅行資金', '50000')
    expect(goalSection().getByText('達成率 0%')).toBeInTheDocument()
  })

  it('優先目標にすると、他の目標の優先が自動的に外れる', () => {
    renderSettings()
    addGoal('旅行資金', '50000')
    addGoal('PC', '150000')

    let section = goalSection()
    const priorityButtons = section.getAllByRole('button', { name: '優先目標にする' })
    fireEvent.click(priorityButtons[0])

    section = goalSection()
    expect(section.getAllByText('優先目標')).toHaveLength(1)
    expect(section.getByRole('button', { name: '優先目標を解除する' })).toBeInTheDocument()

    fireEvent.click(section.getAllByRole('button', { name: '優先目標にする' })[0])
    section = goalSection()
    expect(section.getAllByText('優先目標')).toHaveLength(1)

    const data = readStoredData()
    expect(data.goals.filter((g) => g.isPriority)).toHaveLength(1)
  })

  it('優先目標を削除しても、他の目標が自動で優先に繰り上がらない', () => {
    renderSettings()
    addGoal('旅行資金', '50000')
    addGoal('PC', '150000')

    let section = goalSection()
    fireEvent.click(section.getAllByRole('button', { name: '優先目標にする' })[0])

    section = goalSection()
    const deleteButtons = section.getAllByRole('button', { name: '削除' })
    fireEvent.click(deleteButtons[0])
    section = goalSection()
    fireEvent.click(section.getByRole('button', { name: '削除する' }))

    const data = readStoredData()
    expect(data.goals).toHaveLength(1)
    expect(data.goals.every((g) => !g.isPriority)).toBe(true)
    expect(goalSection().queryByText('優先目標')).not.toBeInTheDocument()
  })

  it('目標が0件でもクラッシュせず表示できる', () => {
    renderSettings()
    expect(goalSection().getByText('まだ登録されていません。')).toBeInTheDocument()
  })
})

describe('設定で登録した価値尺度が購入判断画面に反映される', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedCompletedOnboarding()
  })
  afterEach(() => cleanup())

  it('登録した価値尺度が比較カードに使われる', () => {
    renderSettings()
    const section = valueItemSection()
    fireEvent.click(section.getByRole('button', { name: '＋追加' }))
    fireEvent.change(section.getByLabelText('名前'), { target: { value: '焼肉' } })
    fireEvent.change(section.getByLabelText('金額'), { target: { value: '4000' } })
    fireEvent.click(section.getByRole('button', { name: '追加する' }))
    cleanup()

    renderDecide()
    fireEvent.click(screen.getByRole('button', { name: 'コンビニ' }))
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '800' } })
    fireEvent.click(screen.getByRole('button', { name: '次へ' }))

    expect(screen.getByText('焼肉4,000円の20%')).toBeInTheDocument()
    expect(screen.getByText('あなたの価値尺度')).toBeInTheDocument()
  })
})
