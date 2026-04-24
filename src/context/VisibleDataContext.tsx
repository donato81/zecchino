import { createContext, useContext, type ReactNode } from 'react'
import { useVisibleData as useVisibleDataHook, type VisibleDataResult } from '@/hooks/use-visible-data'

type VisibleDataContextValue = VisibleDataResult

const VisibleDataContext = createContext<VisibleDataContextValue | null>(null)

export function useVisibleData(): VisibleDataContextValue {
  const ctx = useContext(VisibleDataContext)
  if (!ctx) throw new Error('useVisibleData deve essere usato dentro VisibleDataProvider')
  return ctx
}

export function VisibleDataProvider({ children }: { children: ReactNode }) {
  const data = useVisibleDataHook()

  return <VisibleDataContext.Provider value={data}>{children}</VisibleDataContext.Provider>
}