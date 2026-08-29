import rawComparisons from '../../seed/general_comparisons.json'

export type GeneralComparison = {
  id: string
  name: string
  price: number
  category: string
}

/** `seed/general_comparisons.json` を型付きで公開する（§8）。 */
export const GENERAL_COMPARISONS: GeneralComparison[] = rawComparisons.items
