import { useKV } from '@github/spark/hooks'

export interface DisplayPreferences {
  showBalances: boolean
  showAccountIcons: boolean
  compactMode: boolean
  showCategories: boolean
  animationsEnabled: boolean
  fontSize: number
  currencyDisplay: 'symbol' | 'code' | 'full'
  numberFormat: 'standard' | 'compact'
  highContrast: boolean
  showPercentages: boolean
  showTransactionIcons: boolean
  reduceMotion: boolean
}

export function useDisplayPreferences(): DisplayPreferences {
  const [showBalances] = useKV<boolean>('display-show-balances', true)
  const [showAccountIcons] = useKV<boolean>('display-show-account-icons', true)
  const [compactMode] = useKV<boolean>('display-compact-mode', false)
  const [showCategories] = useKV<boolean>('display-show-categories', true)
  const [animationsEnabled] = useKV<boolean>('display-animations-enabled', true)
  const [fontSize] = useKV<number>('display-font-size', 100)
  const [currencyDisplay] = useKV<'symbol' | 'code' | 'full'>('display-currency-display', 'symbol')
  const [numberFormat] = useKV<'standard' | 'compact'>('display-number-format', 'standard')
  const [highContrast] = useKV<boolean>('display-high-contrast', false)
  const [showPercentages] = useKV<boolean>('display-show-percentages', true)
  const [showTransactionIcons] = useKV<boolean>('display-show-transaction-icons', true)
  const [reduceMotion] = useKV<boolean>('display-reduce-motion', false)

  return {
    showBalances: showBalances ?? true,
    showAccountIcons: showAccountIcons ?? true,
    compactMode: compactMode ?? false,
    showCategories: showCategories ?? true,
    animationsEnabled: animationsEnabled ?? true,
    fontSize: fontSize ?? 100,
    currencyDisplay: currencyDisplay ?? 'symbol',
    numberFormat: numberFormat ?? 'standard',
    highContrast: highContrast ?? false,
    showPercentages: showPercentages ?? true,
    showTransactionIcons: showTransactionIcons ?? true,
    reduceMotion: reduceMotion ?? false,
  }
}
