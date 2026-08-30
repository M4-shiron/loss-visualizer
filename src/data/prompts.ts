import rawPrompts from '../../seed/prompts.json'
import type { CategoryId } from '../types/domain'

export type PromptCategory = {
  id: CategoryId
  name: string
  prompts: string[]
}

/** `seed/prompts.json` を型付きで公開する。データそのものはコードに同梱し、書き換えない。 */
export const PROMPT_CATEGORIES: PromptCategory[] = rawPrompts.categories as PromptCategory[]

export const ALL_CATEGORY_IDS: CategoryId[] = PROMPT_CATEGORIES.map((c) => c.id)

export function getPromptsForCategory(categoryId: CategoryId): string[] {
  return PROMPT_CATEGORIES.find((c) => c.id === categoryId)?.prompts ?? []
}

export function getCategoryName(categoryId: CategoryId): string {
  return PROMPT_CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId
}

/** 非表示にされていないカテゴリだけを返す（§19）。購入判断の選択肢に使う。 */
export function visibleCategories(hiddenCategoryIds: CategoryId[]): PromptCategory[] {
  return PROMPT_CATEGORIES.filter((c) => !hiddenCategoryIds.includes(c.id))
}

/** カテゴリに対応する問いかけをランダムに1件返す（§4）。 */
export function pickRandomPrompt(categoryId: CategoryId): string | undefined {
  const prompts = getPromptsForCategory(categoryId)
  if (prompts.length === 0) return undefined
  return prompts[Math.floor(Math.random() * prompts.length)]
}
