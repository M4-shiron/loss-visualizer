import { useState } from 'react'
import { InsightsTab } from './history/InsightsTab'
import { RecordsTab } from './history/RecordsTab'

type Tab = 'records' | 'insights'

/** 履歴画面。「記録」（一覧・編集・削除）と「振り返り」（グラフ・実績）の2タブ。 */
export function HistoryScreen() {
  const [tab, setTab] = useState<Tab>('records')

  return (
    <>
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">履歴</h1>
        <p className="mt-1 text-sm text-slate-500">判断の記録と、積み上がった成果。</p>
      </header>

      <div className="mb-4 flex rounded-xl bg-slate-200/60 p-1" role="tablist">
        <button
          type="button"
          id="history-tab-records"
          role="tab"
          aria-selected={tab === 'records'}
          // 選択中のパネルしか描画しないため、非選択側にaria-controlsを付けると
          // 存在しないid を指してしまう。選択中のときだけ関連付ける。
          aria-controls={tab === 'records' ? 'history-panel-records' : undefined}
          onClick={() => setTab('records')}
          className={`min-h-9 flex-1 rounded-lg text-sm font-bold ${
            tab === 'records' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          記録
        </button>
        <button
          type="button"
          id="history-tab-insights"
          role="tab"
          aria-selected={tab === 'insights'}
          aria-controls={tab === 'insights' ? 'history-panel-insights' : undefined}
          onClick={() => setTab('insights')}
          className={`min-h-9 flex-1 rounded-lg text-sm font-bold ${
            tab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          振り返り
        </button>
      </div>

      {tab === 'records' ? (
        <div role="tabpanel" id="history-panel-records" aria-labelledby="history-tab-records" tabIndex={0}>
          <RecordsTab />
        </div>
      ) : (
        <div role="tabpanel" id="history-panel-insights" aria-labelledby="history-tab-insights" tabIndex={0}>
          <InsightsTab />
        </div>
      )}
    </>
  )
}
