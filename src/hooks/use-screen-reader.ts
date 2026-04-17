import { useEffect, useCallback } from 'react'
import { screenReader, type AnnouncementPriority } from '@/lib/screen-reader'

export function useScreenReader() {
  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    screenReader.announce(message, priority)
  }, [])

  const announceNavigation = useCallback((destination: string) => {
    screenReader.announceNavigation(destination)
  }, [])

  const announceAction = useCallback((action: string) => {
    screenReader.announceAction(action)
  }, [])

  const announceError = useCallback((error: string) => {
    screenReader.announceError(error)
  }, [])

  const announceSuccess = useCallback((message: string) => {
    screenReader.announceSuccess(message)
  }, [])

  const announceCount = useCallback((items: string, count: number) => {
    screenReader.announceCount(items, count)
  }, [])

  const announceBalance = useCallback((accountName: string, balance: number) => {
    screenReader.announceBalance(accountName, balance)
  }, [])

  const announceTransaction = useCallback((type: string, amount: number, account: string, category?: string) => {
    screenReader.announceTransaction(type, amount, account, category)
  }, [])

  const announceDialogOpen = useCallback((title: string) => {
    screenReader.announceDialogOpen(title)
  }, [])

  const announceDialogClose = useCallback(() => {
    screenReader.announceDialogClose()
  }, [])

  const announceProgress = useCallback((current: number, total: number, label: string) => {
    screenReader.announceProgress(current, total, label)
  }, [])

  const announceBudgetStatus = useCallback((name: string, spent: number, target: number, percentage: number) => {
    screenReader.announceBudgetStatus(name, spent, target, percentage)
  }, [])

  const announceFocus = useCallback((elementDescription: string) => {
    screenReader.announceFocus(elementDescription)
  }, [])

  const announceListNavigation = useCallback((position: number, total: number, itemDescription: string) => {
    screenReader.announceListNavigation(position, total, itemDescription)
  }, [])

  const announceFilter = useCallback((filterName: string, active: boolean) => {
    screenReader.announceFilter(filterName, active)
  }, [])

  const announceSort = useCallback((columnName: string, direction: 'ascending' | 'descending') => {
    screenReader.announceSort(columnName, direction)
  }, [])

  return {
    announce,
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess,
    announceCount,
    announceBalance,
    announceTransaction,
    announceDialogOpen,
    announceDialogClose,
    announceProgress,
    announceBudgetStatus,
    announceFocus,
    announceListNavigation,
    announceFilter,
    announceSort
  }
}

export function useAnnouncePage(pageName: string) {
  const { announceNavigation } = useScreenReader()

  useEffect(() => {
    announceNavigation(pageName)
  }, [pageName, announceNavigation])
}
