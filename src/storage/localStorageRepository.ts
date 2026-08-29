import { createEmptyData, STORAGE_KEY, STORAGE_QUARANTINE_KEY, type StoredData } from './schema'
import { validateStoredData } from './validate'

export type LoadResult = {
  data: StoredData
  /** 保存が使えない環境（プライベートブラウジング等）で true になる。 */
  persistenceUnavailable: boolean
  /** 壊れたデータを検出し、初期状態へフォールバックした場合に true になる。 */
  recoveredFromCorruption: boolean
}

/**
 * ブラウザ内保存の唯一の窓口。永続化方式を変える場合はこのファイルだけを差し替える。
 * `storage` を引数で受け取れるようにし、テストで異常系（例外を投げる実装）を注入できる。
 */
export class LocalStorageRepository {
  private readonly storage: Storage

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage
  }

  load(): LoadResult {
    let raw: string | null
    try {
      raw = this.storage.getItem(STORAGE_KEY)
    } catch {
      return { data: createEmptyData(), persistenceUnavailable: true, recoveredFromCorruption: false }
    }

    if (raw === null) {
      return { data: createEmptyData(), persistenceUnavailable: false, recoveredFromCorruption: false }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      this.quarantine(raw)
      return { data: createEmptyData(), persistenceUnavailable: false, recoveredFromCorruption: true }
    }

    if (!validateStoredData(parsed)) {
      this.quarantine(raw)
      return { data: createEmptyData(), persistenceUnavailable: false, recoveredFromCorruption: true }
    }

    return { data: parsed, persistenceUnavailable: false, recoveredFromCorruption: false }
  }

  /** 読み込めなかった元データを退避する。次回の破損時は上書きしてよい（調査用の最新1件で十分）。 */
  private quarantine(raw: string): void {
    try {
      this.storage.setItem(STORAGE_QUARANTINE_KEY, raw)
    } catch {
      // 退避も保存自体もできない環境。データは失われるが、アプリの起動は継続する。
    }
  }

  /** @returns 保存に成功したか。失敗してもアプリはメモリ上の状態で動作を続けられる。 */
  save(data: StoredData): boolean {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  }
}
