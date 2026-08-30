import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageRepository } from '../localStorageRepository'
import { createEmptyData, STORAGE_KEY, STORAGE_QUARANTINE_KEY } from '../schema'

describe('LocalStorageRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('初回起動時（キーが存在しない）は初期状態を返す', () => {
    const repo = new LocalStorageRepository()
    const result = repo.load()
    expect(result.data).toEqual(createEmptyData())
    expect(result.persistenceUnavailable).toBe(false)
    expect(result.recoveredFromCorruption).toBe(false)
  })

  it('保存したデータをそのまま再読込できる（往復一致）', () => {
    const repo = new LocalStorageRepository()
    const data = createEmptyData()
    data.valueItems.push({
      id: 'v1',
      name: 'ゲームソフト',
      price: 7000,
      createdAt: '2026-08-29T00:00:00.000Z',
    })
    data.decisions.push({
      id: 'd1',
      amount: 180,
      categoryId: 'convenience',
      outcome: 'skipped',
      createdAt: '2026-08-29T00:00:00.000Z',
    })

    const saved = repo.save(data)
    expect(saved).toBe(true)

    const result = repo.load()
    expect(result.data).toEqual(data)
    expect(result.recoveredFromCorruption).toBe(false)
  })

  it('壊れたJSONの場合は初期状態にフォールバックし、元データを退避する', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ this is not valid json')
    const repo = new LocalStorageRepository()
    const result = repo.load()

    expect(result.data).toEqual(createEmptyData())
    expect(result.recoveredFromCorruption).toBe(true)
    expect(window.localStorage.getItem(STORAGE_QUARANTINE_KEY)).toBe('{ this is not valid json')
  })

  it('スキーマとして不正な形のJSONは初期状態にフォールバックする', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, decisions: 'not-an-array' }))
    const repo = new LocalStorageRepository()
    const result = repo.load()

    expect(result.data).toEqual(createEmptyData())
    expect(result.recoveredFromCorruption).toBe(true)
  })

  it('id が重複したレコードを含む場合は初期状態にフォールバックする', () => {
    const duplicated = createEmptyData()
    duplicated.valueItems.push(
      { id: 'v1', name: 'ゲームソフト', price: 7000, createdAt: '2026-08-29T00:00:00.000Z' },
      { id: 'v1', name: '焼肉', price: 4000, createdAt: '2026-08-29T00:00:00.000Z' },
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(duplicated))
    const repo = new LocalStorageRepository()
    const result = repo.load()

    expect(result.data).toEqual(createEmptyData())
    expect(result.recoveredFromCorruption).toBe(true)
  })

  it('未知のスキーマバージョンは初期状態にフォールバックする', () => {
    const future = { ...createEmptyData(), schemaVersion: 999 }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(future))
    const repo = new LocalStorageRepository()
    const result = repo.load()

    expect(result.data).toEqual(createEmptyData())
    expect(result.recoveredFromCorruption).toBe(true)
  })

  it('localStorageが例外を投げる環境でもクラッシュせず、メモリ上の初期状態で動作する', () => {
    const brokenStorage: Storage = {
      getItem: () => {
        throw new Error('access denied')
      },
      setItem: () => {
        throw new Error('access denied')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    }
    const repo = new LocalStorageRepository(brokenStorage)

    const loadResult = repo.load()
    expect(loadResult.data).toEqual(createEmptyData())
    expect(loadResult.persistenceUnavailable).toBe(true)

    const saveResult = repo.save(createEmptyData())
    expect(saveResult).toBe(false)
  })

  it('第8ループより前の保存データ（新項目を持たない）も、壊れたデータ扱いにせずそのまま読める', () => {
    // 第7ループ以前のsettingsの形。hiddenCategoryIds等は存在しない。
    const legacyData = {
      schemaVersion: 1,
      decisions: [
        {
          id: 'd1',
          amount: 500,
          categoryId: 'convenience',
          outcome: 'skipped',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      valueItems: [],
      goals: [],
      achievements: [],
      settings: {
        onboardingCompleted: true,
        notifications: { pendingReminder: true, weeklySummary: false, monthlySummary: false },
      },
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyData))

    const repo = new LocalStorageRepository()
    const result = repo.load()

    expect(result.recoveredFromCorruption).toBe(false)
    expect(result.data).toEqual(legacyData)
    expect(result.data.settings.hiddenCategoryIds).toBeUndefined()
  })
})
