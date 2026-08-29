import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '../routes'
import { useAppState } from '../store/useAppState'

/**
 * 初回オンボーディングが未完了なら `/onboarding` へ誘導する（§17）。
 * この要素の下にネストした通常画面すべてに適用する。
 */
export function RequireOnboarding() {
  const { data } = useAppState()

  if (!data.settings.onboardingCompleted) {
    return <Navigate to={ROUTES.onboarding} replace />
  }

  return <Outlet />
}
