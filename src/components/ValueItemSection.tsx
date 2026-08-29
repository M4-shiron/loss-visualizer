import type { ValueItem } from '../types/domain'
import { EditableListSection } from './EditableListSection'

type Props = {
  valueItems: ValueItem[]
  onAdd: (name: string, price: number) => void
  onUpdate: (id: string, name: string, price: number) => void
  onRemove: (id: string) => void
}

/** 価値尺度（§5）の一覧・追加・編集・削除。 */
export function ValueItemSection({ valueItems, onAdd, onUpdate, onRemove }: Props) {
  return (
    <EditableListSection
      ariaLabel="価値尺度"
      title="価値尺度"
      description="お金を払う価値があると思うもの"
      items={valueItems}
      nameLabel="名前"
      amountLabel="金額"
      getName={(item) => item.name}
      getAmount={(item) => item.price}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />
  )
}
