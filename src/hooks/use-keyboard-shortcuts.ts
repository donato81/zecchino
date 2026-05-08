import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  callback: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        //const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        //const altMatch = shortcut.alt ? event.altKey : !event.altKey
        //const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true
        const altMatch = shortcut.alt ? event.altKey : true
        const shiftMatch = shortcut.shift ? event.shiftKey : true
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          const target = event.target as HTMLElement
          const isInputField = target.tagName === 'INPUT' || 
                               target.tagName === 'TEXTAREA' || 
                               target.isContentEditable

          if (!isInputField) {
            event.preventDefault()
            shortcut.callback()
            return
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}
