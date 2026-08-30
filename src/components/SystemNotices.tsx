import { useState } from 'react'
import { useAppState } from '../store/useAppState'

/**
 * 保存に関する重要な状態を、どの画面からでも必ず気づける形で知らせる。
 *
 * - 保存が使えない環境（プライベートブラウジング、容量超過など）：継続的なリスクのため閉じられない。
 * - 保存データの破損からの復旧：このセッションの最初の読み込み時のみtrueになる過去の事実
 *   なので、閉じてよい（次回の読み込みでは自然にfalseへ戻る）。
 *
 * 外枠は常に描画する。ライブリージョンは「先に存在していて、あとから中身が変わる」ときに
 * 読み上げられるため、中身ごと挿入すると支援技術に気づいてもらえない。
 * 横幅は本文（AppLayout）と揃えて、大きな画面で左右がずれないようにする。
 */
export function SystemNotices() {
  const { persistenceUnavailable, recoveredFromCorruption } = useAppState()
  const [corruptionNoticeClosed, setCorruptionNoticeClosed] = useState(false)

  const showCorruptionNotice = recoveredFromCorruption && !corruptionNoticeClosed
  const hasNotice = persistenceUnavailable || showCorruptionNotice

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        hasNotice ? 'mx-auto w-full max-w-md space-y-1 px-4 pt-3' : 'sr-only'
      }
    >
      {persistenceUnavailable ? (
        <div className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
          この環境では記録を保存できません（プライベートブラウジングなど）。アプリを閉じると入力内容が失われます。
        </div>
      ) : null}

      {showCorruptionNotice ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">
          <span>保存データに問題が見つかったため、安全のため初期状態で起動しました。</span>
          <button
            type="button"
            onClick={() => setCorruptionNoticeClosed(true)}
            aria-label="このお知らせを閉じる"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base text-amber-700"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
