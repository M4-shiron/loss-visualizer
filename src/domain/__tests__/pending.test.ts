import { describe, expect, it } from 'vitest'
import type { Decision } from '../../types/domain'
import { archiveExpiredPending, needsPendingReminder, shouldArchive } from '../pending'

function makePending(createdAt: string): Decision {
  return {
    id: 'd',
    amount: 500,
    categoryId: 'other',
    outcome: 'pending',
    createdAt,
  }
}

describe('保留の24時間・48時間判定', () => {
  const createdAt = '2026-08-01T00:00:00.000Z'

  it('23時間59分経過: どちらの対象にもならない', () => {
    const now = new Date('2026-08-01T23:59:00.000Z')
    const decision = makePending(createdAt)
    expect(needsPendingReminder(decision, now)).toBe(false)
    expect(shouldArchive(decision, now)).toBe(false)
  })

  it('ちょうど24時間経過: 再確認の対象になる', () => {
    const now = new Date('2026-08-02T00:00:00.000Z')
    const decision = makePending(createdAt)
    expect(needsPendingReminder(decision, now)).toBe(true)
    expect(shouldArchive(decision, now)).toBe(false)
  })

  it('47時間59分経過: まだ再確認の対象のまま', () => {
    const now = new Date('2026-08-02T23:59:00.000Z')
    const decision = makePending(createdAt)
    expect(needsPendingReminder(decision, now)).toBe(true)
    expect(shouldArchive(decision, now)).toBe(false)
  })

  it('ちょうど48時間経過: アーカイブ対象になり、再確認対象からは外れる', () => {
    const now = new Date('2026-08-03T00:00:00.000Z')
    const decision = makePending(createdAt)
    expect(needsPendingReminder(decision, now)).toBe(false)
    expect(shouldArchive(decision, now)).toBe(true)
  })

  it('すでにアーカイブ済みのものは、48時間経過していても対象にならない', () => {
    const now = new Date('2026-08-05T00:00:00.000Z')
    const decision: Decision = {
      ...makePending(createdAt),
      archivedAt: '2026-08-03T00:00:00.000Z',
    }
    expect(needsPendingReminder(decision, now)).toBe(false)
    expect(shouldArchive(decision, now)).toBe(false)
  })

  it('purchased/skipped の判断は対象にならない', () => {
    const now = new Date('2026-08-05T00:00:00.000Z')
    const skipped: Decision = { ...makePending(createdAt), outcome: 'skipped' }
    const purchased: Decision = { ...makePending(createdAt), outcome: 'purchased' }
    expect(shouldArchive(skipped, now)).toBe(false)
    expect(shouldArchive(purchased, now)).toBe(false)
  })

  it('archiveExpiredPending: 48時間経過したものだけ archivedAt を付与する', () => {
    const now = new Date('2026-08-03T00:00:00.000Z')
    const decisions = [
      makePending('2026-08-01T00:00:00.000Z'), // 48時間経過 → アーカイブ
      makePending('2026-08-02T12:00:00.000Z'), // 11.5時間 → 未対象
    ]
    const result = archiveExpiredPending(decisions, now)
    expect(result[0].archivedAt).toBe(now.toISOString())
    expect(result[1].archivedAt).toBeUndefined()
  })
})
