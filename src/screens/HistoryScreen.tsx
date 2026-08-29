import { Placeholder } from '../components/Placeholder'
import { ScreenHeader } from '../components/ScreenHeader'

export function HistoryScreen() {
  return (
    <>
      <ScreenHeader title="履歴" description="判断の記録と、積み上がった成果。" />
      <Placeholder
        loop={5}
        items={[
          '判断履歴の一覧と詳細（編集・削除）',
          '今月・累計の節約額と思いとどまった回数',
          'カテゴリ別の内訳',
          '節約額の時系列グラフ',
          '実績・バッジ',
        ]}
      />
    </>
  )
}
