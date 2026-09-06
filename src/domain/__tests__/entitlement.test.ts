import { describe, expect, it } from 'vitest'
import type { Settings } from '../../types/domain'
import { canUse, FEATURE_LABELS, planOf, PRO_FEATURE_IDS } from '../entitlement'

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    onboardingCompleted: true,
    notifications: { pendingReminder: true, weeklySummary: false, monthlySummary: false },
    ...overrides,
  }
}

describe('planOf', () => {
  it('未設定なら無料（旧データも新規ユーザーも無料から始まる）', () => {
    expect(planOf(settings())).toBe('free')
  })

  it('proPreviewEnabled が true のときだけ Pro', () => {
    expect(planOf(settings({ proPreviewEnabled: true }))).toBe('pro')
    expect(planOf(settings({ proPreviewEnabled: false }))).toBe('free')
  })
})

describe('canUse', () => {
  it('Pro機能は無料では使えない', () => {
    expect(canUse('free', 'laborTime')).toBe(false)
    expect(canUse('free', 'historyIntervention')).toBe(false)
  })

  it('Proではすべて使える', () => {
    expect(canUse('pro', 'laborTime')).toBe(true)
    expect(canUse('pro', 'historyIntervention')).toBe(true)
  })
})

describe('Pro機能の一覧', () => {
  it('設定画面に出す表示名が、Pro機能すべてに用意されている', () => {
    expect(PRO_FEATURE_IDS.length).toBeGreaterThan(0)
    for (const id of PRO_FEATURE_IDS) {
      expect(FEATURE_LABELS[id]).toBeTruthy()
    }
  })
})
