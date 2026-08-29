/**
 * アプリのドメイン型。PRODUCT_SPEC.md §20 の保存対象に対応する。
 * 金額はすべて整数の円（小数を扱わないため誤差が出ない）。
 */

export type CategoryId =
  | 'convenience'
  | 'restaurant-cafe'
  | 'game-charge'
  | 'fashion'
  | 'hobby'
  | 'daily'
  | 'subscription'
  | 'other'

/** 「買う」を選んだ際の任意の理由（§10）。 */
export type PurchaseReason =
  | 'necessary'
  | 'reward'
  | 'planned'
  | 'impulse'
  | 'other'

export type Outcome = 'skipped' | 'purchased' | 'pending'

/**
 * 購入判断1件。アプリの中心データ（§3, §10, §13）。
 *
 * - `outcome: 'pending'` は「あとで考える」で保留中の状態。
 *   `resolvedAt` が入るまでは確定節約額に含めない。
 * - `archivedAt` は保留のまま48時間が経過し、未対応でアーカイブされた日時。
 */
export type Decision = {
  id: string
  amount: number
  categoryId: CategoryId
  itemName?: string
  outcome: Outcome
  purchaseReason?: PurchaseReason
  createdAt: string
  /** 保留から「やめる」「買う」へ確定した日時。集計はこちらを基準にする。 */
  resolvedAt?: string
  archivedAt?: string
}

/** 個人の価値尺度（§5）。例：ゲームソフト7,000円。 */
export type ValueItem = {
  id: string
  name: string
  price: number
  createdAt: string
}

/** 節約目標（§6）。複数登録可、優先目標は1つ。 */
export type Goal = {
  id: string
  title: string
  targetAmount: number
  isPriority: boolean
  createdAt: string
}

/** 実績の節目（§15）。金額・回数のいずれかの節目で解除される。 */
export type AchievementKind =
  | { type: 'amount'; threshold: number }
  | { type: 'count'; threshold: number }

export type Achievement = {
  id: string
  kind: AchievementKind
  unlockedAt: string
}

export type NotificationSettings = {
  pendingReminder: boolean
  weeklySummary: boolean
  monthlySummary: boolean
}

/** アプリ全体の設定（§17, §19）。 */
export type Settings = {
  onboardingCompleted: boolean
  notifications: NotificationSettings
}
