import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AboutScreen } from './screens/AboutScreen'
import { RequireOnboarding } from './components/RequireOnboarding'
import { SystemNotices } from './components/SystemNotices'
import { DecideScreen } from './screens/DecideScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PendingScreen } from './screens/PendingScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ROUTES } from './routes'
import { AppStateProvider } from './store/AppStateContext'

export function App() {
  return (
    <AppStateProvider>
      {/* どの画面からでも必ず気づける位置に置く（保存に関する重要な状態のため）。 */}
      <SystemNotices />
      <Routes>
        {/* 初回オンボーディングが未完了なら、以下すべてから誘導する */}
        <Route element={<RequireOnboarding />}>
          {/* ナビゲーションを表示する通常画面 */}
          <Route element={<AppLayout />}>
            <Route path={ROUTES.home} element={<HomeScreen />} />
            <Route path={ROUTES.history} element={<HistoryScreen />} />
            <Route path={ROUTES.pending} element={<PendingScreen />} />
            <Route path={ROUTES.settings} element={<SettingsScreen />} />
          </Route>

          {/* 操作に集中させる全画面表示 */}
          <Route path={ROUTES.decide} element={<DecideScreen />} />
        </Route>

        <Route path={ROUTES.onboarding} element={<OnboardingScreen />} />
        {/* データの扱いの説明は、オンボーディング前でも読めるようにする */}
        <Route path={ROUTES.about} element={<AboutScreen />} />

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </AppStateProvider>
  )
}
