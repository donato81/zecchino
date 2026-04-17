import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard } from '@phosphor-icons/react'

export function FocusIndicator() {
  const [keyboardMode, setKeyboardMode] = useState(false)
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null)
  const [tooltipText, setTooltipText] = useState<string>('')
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
        setKeyboardMode(true)
      }
    }

    const handleMouseDown = () => {
      setKeyboardMode(false)
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('role') === 'button' ||
        target.getAttribute('tabindex') === '0' ||
        target.closest('[data-focus-info]')
      ) {
        setFocusedElement(target)
        
        const ariaLabel = target.getAttribute('aria-label')
        const dataFocusInfo = target.getAttribute('data-focus-info') || target.closest('[data-focus-info]')?.getAttribute('data-focus-info')
        const title = target.getAttribute('title')
        const buttonText = target.textContent?.trim()
        
        const tooltip = dataFocusInfo || ariaLabel || title || (buttonText && buttonText.length < 50 ? buttonText : '')
        setTooltipText(tooltip)
        
        updatePosition(target)
      }
    }

    const handleFocusOut = () => {
      setFocusedElement(null)
      setTooltipText('')
    }

    const updatePosition = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      setPosition({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      })
    }

    const handleResize = () => {
      if (focusedElement) {
        updatePosition(focusedElement)
      }
    }

    const handleScroll = () => {
      if (focusedElement) {
        updatePosition(focusedElement)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [focusedElement])

  if (!keyboardMode || !focusedElement || !tooltipText) {
    return null
  }

  const showBelow = position.y < 100
  const tooltipY = showBelow ? position.y + position.height + 8 : position.y - 8

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: position.x + position.width / 2,
          top: tooltipY,
          transform: showBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)'
        }}
      >
        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg flex items-center gap-2 max-w-xs">
          <Keyboard size={14} weight="duotone" className="flex-shrink-0" />
          <span className="text-sm font-medium line-clamp-2">{tooltipText}</span>
        </div>
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45"
          style={{
            [showBelow ? 'top' : 'bottom']: -4
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
