import rawComparisons from '../../seed/general_comparisons.json'

export type GeneralComparison = {
  id: string
  name: string
  price: number
  category: string
  /** 助数詞（個／回／本／杯など）。表示文はこのデータではなく比較ロジック側で組み立てる。 */
  unit: string
}

/** `seed/general_comparisons.json` を型付きで公開する（§8）。 */
export const GENERAL_COMPARISONS: GeneralComparison[] = rawComparisons.items
