import { useEffect, useCallback, useMemo } from 'react'
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

  const announceAccountCreated = useCallback((name: string, type: string, initialBalance: number) => {
    screenReader.announceAccountCreated(name, type, initialBalance)
  }, [])

  const announceAccountDeleted = useCallback((name: string) => {
    screenReader.announceAccountDeleted(name)
  }, [])

  const announceBudgetCreated = useCallback((name: string, target: number, period: string) => {
    screenReader.announceBudgetCreated(name, target, period)
  }, [])

  const announceBudgetDeleted = useCallback((name: string) => {
    screenReader.announceBudgetDeleted(name)
  }, [])

  const announceSavingsGoalCreated = useCallback((name: string, target: number, deadline?: string) => {
    screenReader.announceSavingsGoalCreated(name, target, deadline)
  }, [])

  const announceSavingsGoalProgress = useCallback((name: string, current: number, target: number, percentage: number) => {
    screenReader.announceSavingsGoalProgress(name, current, target, percentage)
  }, [])

  const announceSavingsGoalDeleted = useCallback((name: string) => {
    screenReader.announceSavingsGoalDeleted(name)
  }, [])

  const announceVolumeChange = useCallback((level: number, muted: boolean) => {
    screenReader.announceVolumeChange(level, muted)
  }, [])

  const announcePresetApplied = useCallback((presetName: string) => {
    screenReader.announcePresetApplied(presetName)
  }, [])

  const announceTemplateSelected = useCallback((templateName: string) => {
    screenReader.announceTemplateSelected(templateName)
  }, [])

  const announceFormError = useCallback((fieldName: string, error: string) => {
    screenReader.announceFormError(fieldName, error)
  }, [])

  const announceFormFieldFilled = useCallback((fieldName: string, value: string) => {
    screenReader.announceFormFieldFilled(fieldName, value)
  }, [])

  const announceToggleState = useCallback((elementName: string, isEnabled: boolean) => {
    screenReader.announceToggleState(elementName, isEnabled)
  }, [])

  const announceCardAction = useCallback((action: string, itemName: string) => {
    screenReader.announceCardAction(action, itemName)
  }, [])

  const announceExport = useCallback((itemCount: number, format: string) => {
    screenReader.announceExport(itemCount, format)
  }, [])

  const announcePeriodChange = useCallback((periodName: string) => {
    screenReader.announcePeriodChange(periodName)
  }, [])

  const announceHelpOpened = useCallback(() => {
    screenReader.announceHelpOpened()
  }, [])

  const announceHelpClosed = useCallback(() => {
    screenReader.announceHelpClosed()
  }, [])

  const announcePrivateAccountLocked = useCallback(() => {
    screenReader.announcePrivateAccountLocked()
  }, [])

  const announceDataCleared = useCallback((dataType: string) => {
    screenReader.announceDataCleared(dataType)
  }, [])

  const announceImportComplete = useCallback((itemCount: number, dataType: string) => {
    screenReader.announceImportComplete(itemCount, dataType)
  }, [])

  return useMemo(() => ({
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
    announceSort,
    announceAccountCreated,
    announceAccountDeleted,
    announceBudgetCreated,
    announceBudgetDeleted,
    announceSavingsGoalCreated,
    announceSavingsGoalProgress,
    announceSavingsGoalDeleted,
    announceVolumeChange,
    announcePresetApplied,
    announceTemplateSelected,
    announceFormError,
    announceFormFieldFilled,
    announceToggleState,
    announceCardAction,
    announceExport,
    announcePeriodChange,
    announceHelpOpened,
    announceHelpClosed,
    announcePrivateAccountLocked,
    announceDataCleared,
    announceImportComplete
  }), [
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
    announceSort,
    announceAccountCreated,
    announceAccountDeleted,
    announceBudgetCreated,
    announceBudgetDeleted,
    announceSavingsGoalCreated,
    announceSavingsGoalProgress,
    announceSavingsGoalDeleted,
    announceVolumeChange,
    announcePresetApplied,
    announceTemplateSelected,
    announceFormError,
    announceFormFieldFilled,
    announceToggleState,
    announceCardAction,
    announceExport,
    announcePeriodChange,
    announceHelpOpened,
    announceHelpClosed,
    announcePrivateAccountLocked,
    announceDataCleared,
    announceImportComplete,
  ])
}

export function useAnnouncePage(pageName: string) {
  const { announceNavigation } = useScreenReader()

  useEffect(() => {
    announceNavigation(pageName)
  }, [pageName, announceNavigation])
}
