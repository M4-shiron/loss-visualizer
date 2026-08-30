import { ToggleRow } from '../../components/ToggleRow'
import { useAppState } from '../../store/useAppState'

/**
 * アプリ内のお知らせの設定（§16, §19）。
 * Web版はOSのプッシュ通知を使わないため、「通知」ではなく具体的な機能名で表現する。
 */
export function NotificationSection() {
  const { data, updateNotificationSettings } = useAppState()
  const { notifications } = data.settings

  return (
    <section aria-label="アプリ内のお知らせ" className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">アプリ内のお知らせ</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        端末のOS通知は使いません。アプリを開いたときにホームで知らせます。
      </p>
      <div className="mt-3 divide-y divide-slate-100">
        <ToggleRow
          label="保留リマインダー"
          description="24時間以上たった保留を、ホームで知らせます"
          checked={notifications.pendingReminder}
          onChange={() => updateNotificationSettings({ pendingReminder: !notifications.pendingReminder })}
        />
        <ToggleRow
          label="週次まとめを表示"
          description="週が変わったら、先週の成果をホームで知らせます"
          checked={notifications.weeklySummary}
          onChange={() => updateNotificationSettings({ weeklySummary: !notifications.weeklySummary })}
        />
        <ToggleRow
          label="月次まとめを表示"
          description="月が変わったら、先月の成果をホームで知らせます"
          checked={notifications.monthlySummary}
          onChange={() => updateNotificationSettings({ monthlySummary: !notifications.monthlySummary })}
        />
      </div>
    </section>
  )
}
