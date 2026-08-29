type Props = {
  title: string
  description?: string
}

export function ScreenHeader({ title, description }: Props) {
  return (
    <header className="mb-5">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </header>
  )
}
