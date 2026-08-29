import { useState, type ReactNode } from 'react'
import { formatYen } from '../domain/format'
import { NameAmountForm } from './NameAmountForm'

type OpenForm = 'add' | { editId: string } | null

type Props<T extends { id: string }> = {
  ariaLabel: string
  title: string
  description: string
  items: T[]
  nameLabel: string
  amountLabel: string
  getName: (item: T) => string
  getAmount: (item: T) => number
  /** 名前の右側に表示する追加要素（例：優先目標バッジ）。 */
  renderNameSuffix?: (item: T) => ReactNode
  /** 名前・金額の行の下に表示する追加要素（例：進捗バー）。 */
  renderExtra?: (item: T) => ReactNode
  onAdd: (name: string, amount: number) => void
  onUpdate: (id: string, name: string, amount: number) => void
  onRemove: (id: string) => void
}

/**
 * 「名前＋金額」を持つ項目の一覧・追加・編集・削除に共通する画面構造。
 * 価値尺度（§5）と節約目標（§6）の設定UIはほぼ同じ操作なので、ここに集約する。
 * 項目固有の表示（優先目標バッジ、進捗バーなど）は render props で差し込む。
 */
export function EditableListSection<T extends { id: string }>({
  ariaLabel,
  title,
  description,
  items,
  nameLabel,
  amountLabel,
  getName,
  getAmount,
  renderNameSuffix,
  renderExtra,
  onAdd,
  onUpdate,
  onRemove,
}: Props<T>) {
  const [openForm, setOpenForm] = useState<OpenForm>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  return (
    <section aria-label={ariaLabel} className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        {openForm === null ? (
          <button
            type="button"
            onClick={() => setOpenForm('add')}
            className="min-h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
          >
            ＋追加
          </button>
        ) : null}
      </div>

      {items.length === 0 && openForm === null ? (
        <p className="mt-4 text-sm text-slate-400">まだ登録されていません。</p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          if (openForm !== null && typeof openForm === 'object' && openForm.editId === item.id) {
            return (
              <li key={item.id}>
                <NameAmountForm
                  nameLabel={nameLabel}
                  amountLabel={amountLabel}
                  initialName={getName(item)}
                  initialAmount={getAmount(item)}
                  submitLabel="保存する"
                  onSubmit={(name, amount) => {
                    onUpdate(item.id, name, amount)
                    setOpenForm(null)
                  }}
                  onCancel={() => setOpenForm(null)}
                />
              </li>
            )
          }

          return (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              {confirmingDeleteId === item.id ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-700">削除しますか？</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="min-h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(item.id)
                        setConfirmingDeleteId(null)
                      }}
                      className="min-h-8 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900">{getName(item)}</p>
                        {renderNameSuffix ? renderNameSuffix(item) : null}
                      </div>
                      <p className="text-xs text-slate-500">{formatYen(getAmount(item))}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenForm({ editId: item.id })}
                        className="min-h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(item.id)}
                        className="min-h-8 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  {renderExtra ? renderExtra(item) : null}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {openForm === 'add' ? (
        <div className="mt-3">
          <NameAmountForm
            nameLabel={nameLabel}
            amountLabel={amountLabel}
            submitLabel="追加する"
            onSubmit={(name, amount) => {
              onAdd(name, amount)
              setOpenForm(null)
            }}
            onCancel={() => setOpenForm(null)}
          />
        </div>
      ) : null}
    </section>
  )
}
