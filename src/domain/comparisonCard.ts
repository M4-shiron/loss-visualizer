/** 損失の可視化に使う比較カード（§7, §9）。 */

export type ComparisonCardKind = 'valueItem' | 'goal' | 'general'

export type ComparisonCard = {
  kind: ComparisonCardKind
  /** カード上部に出す対象名（価値尺度名・目標タイトル・一般比較の名前）。 */
  title: string
  /** メインの比較文。例：「焼肉4,000円の20%」 */
  text: string
  /** 補足の一言。例：「あと4回見送れば焼肉に届きます」 */
  subtext?: string
  /** ミニゲージ用の0〜100。 */
  progressPercent: number
}
