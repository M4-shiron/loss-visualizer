import { useState } from 'react'
import { useAppState } from '../store/useAppState'

/**
 * 保存に関する重要な状態を、どの画面からでも必ず気づける形で知らせる。
 *
 * - 保存が使えない環境（プライベートブラウジング等）：継続的なリスクのため閉じられない。
 * - 保存データの破損からの復旧：このセッションの最初の読み込み時のみtrueになる過去の事実
 *   なので、閉じてよい（次回の読み込みでは自然にfalseへ戻る）。
 */
export function SystemNotices() {
  const { persistenceUnavailable, recoveredFromCorruption } = useAppState()
  const [corruptionNoticeClosed, setCorruptionNoticeClosed] = useState(false)

  if (!persistenceUnavailable && !(recoveredFromCorruption && !corruptionNoticeClosed)) {
    return null
  }

  return (
    <div className="space-y-1 px-3 pt-3" role="status">
      {persistenceUnavailable ? (
        <div className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
          この環境では記録を保存できません（プライベートブラウジングなど）。アプリを閉じると入力内容が失われます。
        </div>
      ) : null}

      {recoveredFromCorruption && !corruptionNoticeClosed ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
          <span>保存データに問題が見つかったため、安全のため初期状態で起動しました。</span>
          <button
            type="button"
            onClick={() => setCorruptionNoticeClosed(true)}
            aria-label="このお知らせを閉じる"
            className="shrink-0 text-amber-600"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
