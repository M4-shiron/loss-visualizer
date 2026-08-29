import { Link } from 'react-router-dom'
import { Placeholder } from '../components/Placeholder'
import { ScreenHeader } from '../components/ScreenHeader'
import { ROUTES } from '../routes'

export function SettingsScreen() {
  return (
    <>
      <ScreenHeader title="設定" />
      <div className="space-y-4">
        <Placeholder
          loop={4}
          items={[
            '価値尺度の追加・編集・削除',
            '節約目標の追加・編集・削除、優先目標の変更',
          ]}
        />
        <Placeholder
          loop={6}
          items={[
            '通知設定（保留・週次・月次）',
            'カテゴリ設定',
            'アーカイブの確認',
            '全データのリセット',
          ]}
        />
        <p className="text-center text-xs text-slate-400">
          <Link to={ROUTES.onboarding} className="underline">
            初回設定の画面を確認する
          </Link>
        </p>
      </div>
    </>
  )
}
