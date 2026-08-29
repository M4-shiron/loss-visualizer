import type { Decision } from '../types/domain'

const HOUR_MS = 60 * 60 * 1000

/** 保留から24時間経過で再判断を促す（§10, §16）。 */
export const PENDING_REMINDER_HOURS = 24

/** 保留から48時間経過で未対応ならアーカイブする（§10）。再確認からさらに24時間の猶予。 */
export const PENDING_ARCHIVE_HOURS = 48

function hoursSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / HOUR_MS
}

/** 再判断を促す対象になっているか（24時間以上・48時間未満の未対応の保留）。 */
export function needsPendingReminder(decision: Decision, now: Date): boolean {
  if (decision.outcome !== 'pending' || decision.archivedAt !== undefined) return false
  const hours = hoursSince(new Date(decision.createdAt), now)
  return hours >= PENDING_REMINDER_HOURS && hours < PENDING_ARCHIVE_HOURS
}

/** アーカイブすべきか（48時間以上、未対応のまま）。 */
export function shouldArchive(decision: Decision, now: Date): boolean {
  if (decision.outcome !== 'pending' || decision.archivedAt !== undefined) return false
  return hoursSince(new Date(decision.createdAt), now) >= PENDING_ARCHIVE_HOURS
}

/** 48時間経過した未対応の保留をアーカイブ済みにして返す。 */
export function archiveExpiredPending(decisions: Decision[], now: Date): Decision[] {
  return decisions.map((d) =>
    shouldArchive(d, now) ? { ...d, archivedAt: now.toISOString() } : d,
  )
}
