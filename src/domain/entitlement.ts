import type { Settings } from '../types/domain'

/**
 * 無料/Pro境界の唯一の正本（改善方針4）。機能がどちら側かを決めるのはこのファイルだけで、
 * 各画面・ドメインは`canUse`を呼ぶだけにする。
 *
 * **課金は実装しない。** 現時点でProになる手段は設定画面のプレビュー切り替えだけであり、
 * 支払い導線も課金SDKも存在しない。将来ここへ購入状態を足すときも、
 * 判定の入口は`planOf`のままにする。
 *
 * 境界の考え方：Proの軸は「機能を塞ぐこと」ではなく「パーソナライズの深さ」。
 * 購入判断フロー・価値尺度・節約目標・履歴・基本グラフ・実績・保留、および
 * 価値尺度／目標を使った介入文は無料に残す。無料だけで「衝動買いを止める」
 * 核心体験が成立することを崩さない。
 */

export type Plan = 'free' | 'pro'

/** プランで出し分ける機能。無料側にしかない機能はここに載せない。 */
export type FeatureId =
  /** 金額を「約◯時間働いた分」として見せる（比較カード・介入文の組み合わせ表現）。 */
  | 'laborTime'
  /** 過去の行動から作る介入文（同カテゴリの購入回数、見送りの流れ）。 */
  | 'historyIntervention'

/**
 * 機能ごとの必要プラン。`Record`にしているため、`FeatureId`を増やすと
 * ここへの追記を型チェックが強制する。
 */
const REQUIRED_PLAN: Record<FeatureId, Plan> = {
  laborTime: 'pro',
  historyIntervention: 'pro',
}

/** 設定画面でProの内容を示すための表示名。境界と一緒に置いて食い違いを防ぐ。 */
export const FEATURE_LABELS: Record<FeatureId, string> = {
  laborTime: '労働時間換算（約◯時間働いた分）',
  historyIntervention: '過去の行動をもとにした問いかけ',
}

export const PRO_FEATURE_IDS: FeatureId[] = (Object.keys(REQUIRED_PLAN) as FeatureId[]).filter(
  (id) => REQUIRED_PLAN[id] === 'pro',
)

export function canUse(plan: Plan, feature: FeatureId): boolean {
  return REQUIRED_PLAN[feature] === 'free' || plan === 'pro'
}

/**
 * 保存済み設定から現在のプランを求める。未設定（旧データを含む）は無料。
 * 新規ユーザーが無料から始まる将来の実態と揃えている。
 */
export function planOf(settings: Settings): Plan {
  return settings.proPreviewEnabled === true ? 'pro' : 'free'
}
