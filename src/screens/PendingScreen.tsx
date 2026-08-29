import { Placeholder } from '../components/Placeholder'
import { ScreenHeader } from '../components/ScreenHeader'

export function PendingScreen() {
  return (
    <>
      <ScreenHeader
        title="保留中"
        description="「あとで考える」を選んだもの。確定節約額には含まれません。"
      />
      <Placeholder
        loop={5}
        items={[
          '保留中の一覧と回避中の金額',
          '24時間経過後の再判断うながし',
          '未対応のままの項目をアーカイブ',
        ]}
      />
    </>
  )
}
