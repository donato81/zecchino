import { useEffect, useState, useCallback, useRef, RefObject } from 'react'

interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onMenu?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  disabled?: boolean
  containerRef?: RefObject<HTMLElement | null>
}

export function useListNavigation({
  itemCount,
  onEnter,
  onMenu,
  onDelete,
  onEdit,
  enabled = true,
  disabled = false,
  containerRef
}: UseListNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  const callbacksRef = useRef({ onEnter, onMenu, onDelete, onEdit })

  useEffect(() => {
    callbacksRef.current = { onEnter, onMenu, onDelete, onEdit }
  })

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return
    if (document.querySelector('[data-state="open"][aria-modal="true"]')) return
    if (!enabled || itemCount === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        const next = prev + 1
        return next >= itemCount ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        const next = prev - 1
        return next < 0 ? itemCount - 1 : next
      })
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusedIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusedIndex(itemCount - 1)
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault()
      if (callbacksRef.current.onMenu) {
        callbacksRef.current.onMenu(focusedIndex)
      } else {
        callbacksRef.current.onEnter?.(focusedIndex)
      }
    } else if (e.key === 'Delete' && focusedIndex >= 0 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      callbacksRef.current.onDelete?.(focusedIndex)
    } else if ((e.key === 'e' || e.key === 'E') && focusedIndex >= 0 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      callbacksRef.current.onEdit?.(focusedIndex)
    }
  }, [disabled, enabled, itemCount, focusedIndex])

  useEffect(() => {
    const target = containerRef?.current || document

    target.addEventListener('keydown', handleKeyDown as EventListener)
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener)
    }
  }, [handleKeyDown, containerRef])

  useEffect(() => {
    if (itemCount === 0) {
      setFocusedIndex(-1)
    } else if (focusedIndex >= itemCount) {
      setFocusedIndex(itemCount - 1)
    }
  }, [itemCount, focusedIndex])

  useEffect(() => {
    if (!containerRef?.current || focusedIndex < 0) return
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-list-item][data-index="${focusedIndex}"]`
    )
    el?.focus()
  }, [focusedIndex, containerRef])

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1)
  }, [])

  const setFocus = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      setFocusedIndex(index)
    }
  }, [itemCount])

  return {
    focusedIndex,
    setFocusedIndex: setFocus,
    resetFocus,
    isFocused: (index: number) => index === focusedIndex
  }
}
