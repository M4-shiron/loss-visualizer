import { useContext } from 'react'
import { AppStateContext, type AppStateContextValue } from './context'

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState は AppStateProvider の内側で使ってください')
  }
  return context
}
