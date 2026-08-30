import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { useAppState } from '../../store/useAppState'

type Step = 'idle' | 'confirm1' | 'confirm2'

/** 全データのリセット（§19）。取り返しがつかないため、2段階の確認を挟む。 */
export function DataResetSection() {
  const { resetAllData } = useAppState()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('idle')

  function handleConfirmedReset() {
    resetAllData()
    navigate(ROUTES.onboarding, { replace: true })
  }

  return (
    <section aria-label="全データのリセット" className="rounded-2xl border border-red-200 bg-white p-4">
      <h2 className="text-sm font-bold text-red-700">全データのリセット</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        判断の記録・価値尺度・目標・実績をすべて削除します。この操作は取り消せません。
      </p>

      {step === 'idle' ? (
        <button
          type="button"
          onClick={() => setStep('confirm1')}
          className="mt-3 min-h-10 rounded-xl border border-red-300 bg-white px-3 text-sm font-bold text-red-600"
        >
          全データを削除する
        </button>
      ) : null}

      {step === 'confirm1' ? (
        <div className="mt-3 rounded-xl bg-red-50 p-3">
          <p className="text-sm font-bold text-red-800">本当に削除しますか？</p>
          <p className="mt-0.5 text-xs text-red-700">すべての記録が失われます。</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setStep('idle')}
              className="min-h-9 flex-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-600"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => setStep('confirm2')}
              className="min-h-9 flex-1 rounded-lg bg-red-600 text-xs font-bold text-white"
            >
              削除する
            </button>
          </div>
        </div>
      ) : null}

      {step === 'confirm2' ? (
        <div className="mt-3 rounded-xl bg-red-50 p-3">
          <p className="text-sm font-bold text-red-800">最終確認です。本当によろしいですか？</p>
          <p className="mt-0.5 text-xs text-red-700">
            削除後は元に戻せません。最初のオンボーディングからやり直しになります。
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setStep('idle')}
              className="min-h-9 flex-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-600"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirmedReset}
              className="min-h-9 flex-1 rounded-lg bg-red-600 text-xs font-bold text-white"
            >
              完全に削除する
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
