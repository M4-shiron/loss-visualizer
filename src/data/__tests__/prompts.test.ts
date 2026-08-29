import { describe, expect, it } from 'vitest'
import type { CategoryId } from '../../types/domain'
import { getPromptsForCategory, pickRandomPrompt, PROMPT_CATEGORIES } from '../prompts'

const EXPECTED_CATEGORY_IDS: CategoryId[] = [
  'convenience',
  'restaurant-cafe',
  'game-charge',
  'fashion',
  'hobby',
  'daily',
  'subscription',
  'other',
]

describe('seed/prompts.json の読み込み', () => {
  it('仕様どおり8カテゴリを持つ', () => {
    expect(PROMPT_CATEGORIES.map((c) => c.id).sort()).toEqual([...EXPECTED_CATEGORY_IDS].sort())
  })

  it.each(EXPECTED_CATEGORY_IDS)('カテゴリ「%s」に問いかけが1件以上ある', (categoryId) => {
    expect(getPromptsForCategory(categoryId).length).toBeGreaterThan(0)
  })

  it('存在しないカテゴリは空配列を返す', () => {
    expect(getPromptsForCategory('unknown' as CategoryId)).toEqual([])
  })

  it('pickRandomPrompt はそのカテゴリの問いかけの中から1件を返す', () => {
    const prompt = pickRandomPrompt('convenience')
    expect(getPromptsForCategory('convenience')).toContain(prompt)
  })
})
