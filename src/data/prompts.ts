import rawPrompts from '../../seed/prompts.json'
import type { CategoryId } from '../types/domain'

type PromptCategory = {
  id: CategoryId
  name: string
  prompts: string[]
}

/** `seed/prompts.json` を型付きで公開する。データそのものはコードに同梱し、書き換えない。 */
export const PROMPT_CATEGORIES: PromptCategory[] = rawPrompts.categories as PromptCategory[]

export function getPromptsForCategory(categoryId: CategoryId): string[] {
  return PROMPT_CATEGORIES.find((c) => c.id === categoryId)?.prompts ?? []
}

/** カテゴリに対応する問いかけをランダムに1件返す（§4）。 */
export function pickRandomPrompt(categoryId: CategoryId): string | undefined {
  const prompts = getPromptsForCategory(categoryId)
  if (prompts.length === 0) return undefined
  return prompts[Math.floor(Math.random() * prompts.length)]
}
