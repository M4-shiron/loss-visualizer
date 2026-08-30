import { NavLink } from 'react-router-dom'
import { ROUTES } from '../routes'

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
}

const iconClass = 'h-6 w-6'

const items: NavItem[] = [
  {
    to: ROUTES.home,
    label: 'ホーム',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 10.5 12 3l9 7.5M5.25 9.75V20a1 1 0 0 0 1 1h3.5v-5.5h4.5V21h3.5a1 1 0 0 0 1-1V9.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: ROUTES.history,
    label: '履歴',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 20V10m7 10V4m7 16v-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: ROUTES.pending,
    label: '保留',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7.5V12l2.75 2.25"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: ROUTES.settings,
    label: '設定',
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 3.5v2m0 13v2M20.5 12h-2m-13 0h-2m13.02-6.02-1.42 1.42M7.9 16.1l-1.42 1.42m12.04 0-1.42-1.42M7.9 7.9 6.48 6.48"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

/** 画面下部の主要ナビゲーション。親指が届く位置に固定する。 */
export function BottomNav() {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
                  isActive ? 'text-emerald-700' : 'text-slate-500',
                ].join(' ')
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
