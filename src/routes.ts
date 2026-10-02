/** アプリ内のパス定義。画面追加時はここを起点にする。 */
export const ROUTES = {
  home: '/',
  onboarding: '/onboarding',
  decide: '/decide',
  history: '/history',
  pending: '/pending',
  settings: '/settings',
  about: '/about',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
