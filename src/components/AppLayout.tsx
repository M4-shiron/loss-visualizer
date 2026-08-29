import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

/**
 * ナビゲーションを持つ通常画面の外枠。
 * スマートフォンでの利用を基準にし、大きな画面では中央に寄せて幅を制限する。
 */
export function AppLayout() {
  return (
    <div className="min-h-dvh">
      {/* pb-24: 固定ナビの高さぶん、内容が隠れないよう余白を確保する */}
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
