# Planning Guide

Zecchino is a comprehensive personal finance manager that empowers users to track their money across multiple accounts with military-grade security and complete keyboard accessibility for screen reader users.

**Experience Qualities**: 
1. **Secure** - Every interaction reinforces trust through PIN protection, encryption, and clear security states
2. **Empowering** - Users feel in control of their finances with detailed tracking, categories, and insightful reports
3. **Accessible** - Every feature is fully navigable by keyboard with proper ARIA labels and semantic HTML for screen readers

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a full-featured financial management system with multiple account types, transaction tracking, recurring payments, encrypted private accounts, comprehensive reporting, category management, and data export capabilities - all requiring sophisticated state management and multi-view navigation.

## Essential Features

### PIN Authentication System
- **Functionality**: Global PIN protection that locks the entire application
- **Purpose**: Prevents unauthorized access to sensitive financial data
- **Trigger**: App launch or session timeout
- **Progression**: PIN entry dialog → Validation → Main dashboard (or error message with retry)
- **Success criteria**: Only correct PIN grants access; first-time users create PIN through setup wizard

### Multi-Account Management
- **Functionality**: Create and manage 10 types of accounts (bank, prepaid card, cash, savings, investments, credit card, PayPal, crypto wallet, pension fund, private encrypted)
- **Purpose**: Track money across different financial instruments with appropriate security levels and distinct visual identity
- **Trigger**: "Add Account" button or setup wizard
- **Progression**: Account type selection → Name and initial balance input → Account created → Appears in dashboard
- **Success criteria**: Each account displays current balance, transaction history, and unique type-specific icon with custom coloring

### Private Encrypted Account
- **Functionality**: Special account type that requires separate PIN and encrypts all data
- **Purpose**: Ultimate privacy for sensitive transactions (hidden until unlocked)
- **Trigger**: "Unlock Private Account" button
- **Progression**: Private PIN entry → Validation → Account appears in lists → Full access granted for session
- **Success criteria**: Account completely invisible until unlocked; remains unlocked until app restart

### Transaction Recording
- **Functionality**: Record income, expenses, and transfers between accounts with categorization
- **Purpose**: Track all money movement with context and organization
- **Trigger**: "Add Transaction" button or quick-add shortcut
- **Progression**: Transaction type selection → Amount and account → Category selection → Optional description → Date → Save → Balance updates instantly
- **Success criteria**: Transaction appears in list, affects account balance, and can be filtered/searched

### Recurring Transactions
- **Functionality**: Mark transactions as recurring with frequency (daily, weekly, monthly, annual)
- **Purpose**: Automatically track predictable income/expenses without manual re-entry
- **Trigger**: Checkbox in transaction dialog
- **Progression**: Create transaction → Enable recurring → Set frequency → System tracks future occurrences
- **Success criteria**: Recurring transactions show distinct badge and are included in future projections

### Category Management
- **Functionality**: Organize transactions into predefined or custom categories (income/expense)
- **Purpose**: Understand spending patterns and generate category-based reports
- **Trigger**: Category selector in transaction form or Settings → Categories
- **Progression**: View categories → Add/rename/delete → Categories available in transaction forms
- **Success criteria**: 18 default Italian categories exist; users can customize fully

### Account Category Filtering with Keyboard Shortcuts
- **Functionality**: Quick filter account display by category using keyboard shortcuts (1-5 for categories, Ctrl+A for toggle all)
- **Purpose**: Enable rapid, keyboard-accessible filtering for screen reader users and power users
- **Trigger**: Number keys 1-5 (Banking, Digital, Savings, Investments, Private) or Ctrl+A on dashboard
- **Progression**: Press key → Category visibility toggles → Toast notification confirms action → Accounts update instantly
- **Success criteria**: All category filters respond to keyboard input; shortcuts shown as visual badges on filter buttons; works only on dashboard tab to avoid conflicts

### Comprehensive Keyboard Shortcuts
- **Functionality**: Full keyboard navigation and quick actions throughout the app (Ctrl+N for new transaction, Ctrl+M for new account, Ctrl+D/T/R for tab navigation, Ctrl+E for export, Ctrl+U to unlock private account, ? to show help)
- **Purpose**: Enable power users and accessibility users to navigate and perform actions without mouse interaction
- **Trigger**: Keyboard combinations pressed anywhere in the app (except when typing in input fields)
- **Progression**: Press shortcut → Action executes immediately → Toast confirms action → UI updates
- **Success criteria**: All shortcuts work reliably; keyboard help dialog (?) displays complete reference; visual badges on buttons show shortcuts; no conflicts with browser shortcuts

### Comprehensive Reporting
- **Functionality**: Generate financial insights by period, category, and account
- **Purpose**: Visualize financial health, trends, and spending patterns
- **Trigger**: Navigate to Reports section
- **Progression**: Select period filter → View total income/expenses → Analyze by category → Review monthly trends → Export data
- **Success criteria**: Reports show accurate calculations, clear visualizations, and export to CSV/text

### Data Export & Backup
- **Functionality**: Export transactions as CSV or backup entire database
- **Purpose**: Enable external analysis and protect against data loss
- **Trigger**: Export buttons in Reports or Settings
- **Progression**: Choose export type → Select date range (if applicable) → Download file → Confirmation
- **Success criteria**: Generated files contain complete, accurate data in standard formats

## Edge Case Handling

- **Empty States** - Clear guidance when no accounts/transactions exist with prominent "Get Started" actions
- **Invalid PIN Entry** - Retry mechanism with helpful error messages; no account lockout to avoid accessibility barriers
- **Negative Balances** - Visual warning indicators but allow (overdrafts happen)
- **Transfer to Same Account** - Validation prevents circular transfers with clear error message
- **Delete Account with Transactions** - Confirmation dialog warns about data loss with transaction count
- **Private Account in Transfers** - Only visible as transfer destination when unlocked
- **Export with No Data** - Informative message explaining no data available for selected period
- **Category Deletion** - Reassign transactions to "Uncategorized" before deletion with confirmation
- **Recurring Transaction Deletion** - Clarify whether to delete single instance or entire series

## Design Direction

The design should evoke **confidence, clarity, and financial empowerment** - like a professional banking app meets a personal journal. Users should feel they're using sophisticated financial software that respects their privacy and accessibility needs. Every interaction should be crisp, direct, and reassuring.

## Color Selection

A professional financial palette with warm trust-building accents and clear status indicators.

- **Primary Color**: Deep Navy Blue (oklch(0.35 0.08 250)) - Represents financial stability, professionalism, and trustworthiness; used for primary actions and headers
- **Secondary Colors**: 
  - Slate Gray (oklch(0.55 0.02 240)) - Supporting UI elements, subtle backgrounds
  - Warm Gold (oklch(0.75 0.12 85)) - Income/positive indicators, success states
  - Terracotta Red (oklch(0.55 0.15 25)) - Expense/negative indicators, alerts
- **Accent Color**: Vibrant Teal (oklch(0.65 0.15 190)) - CTAs, active states, unlock indicators
- **Foreground/Background Pairings**: 
  - Primary Navy (oklch(0.35 0.08 250)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Warm Gold (oklch(0.75 0.12 85)): Deep Navy text (oklch(0.25 0.08 250)) - Ratio 7.5:1 ✓
  - Terracotta (oklch(0.55 0.15 25)): White text (oklch(1 0 0)) - Ratio 5.1:1 ✓
  - Accent Teal (oklch(0.65 0.15 190)): Deep Navy text (oklch(0.25 0.08 250)) - Ratio 6.8:1 ✓
  - Light Background (oklch(0.98 0.01 240)): Dark text (oklch(0.25 0.02 240)) - Ratio 14.3:1 ✓

## Font Selection

Typography should project financial precision while maintaining warmth and excellent readability for extended use by all users including those with screen magnification.

- **Primary Font**: IBM Plex Sans - Technical precision meets approachability; excellent legibility at all sizes
- **Monospace Font**: JetBrains Mono - For currency amounts, dates, and numerical data; tabular figures for alignment
- **Typographic Hierarchy**: 
  - H1 (Section Titles): IBM Plex Sans SemiBold / 32px / -0.02em letter spacing
  - H2 (Subsections): IBM Plex Sans Medium / 24px / -0.01em letter spacing
  - H3 (Card Headings): IBM Plex Sans Medium / 18px / normal spacing
  - Body Text: IBM Plex Sans Regular / 16px / 1.6 line height
  - Currency Amounts: JetBrains Mono Medium / 20-24px / tabular-nums
  - Small Labels: IBM Plex Sans Regular / 14px / 500 font weight
  - Button Text: IBM Plex Sans Medium / 16px / 0.01em letter spacing

## Animations

Animations should feel like smooth financial transitions - confident, professional, never frivolous. Use motion to reinforce hierarchies, guide attention to balance changes, and provide reassuring feedback for security actions.

- **Balance Updates**: Smooth number transitions when transactions affect totals (200ms ease-out)
- **Account Unlock**: Gentle slide-in reveal when private account becomes visible (300ms with slight scale)
- **Transaction Add**: Quick fade-in for new list items with subtle vertical slide (250ms)
- **Dialog Entry/Exit**: Modal dialogs scale from 0.95 to 1.0 with backdrop fade (200ms ease-out)
- **Error States**: Subtle shake animation for invalid inputs (300ms with 3-4 iterations)
- **Navigation**: Smooth crossfade between major sections (250ms)
- **Hover States**: Instant color shifts (100ms) for immediate tactile feedback

## Component Selection

- **Components**: 
  - Dialog for PIN entry, account creation, transaction forms (modal focus)
  - Card for account displays with balance, type icon, and quick actions
  - Table for transaction lists with sortable columns and row actions
  - Tabs for Reports section (by period, by category, trends)
  - Select for account/category pickers with search
  - Input with proper labels and validation states
  - Button with variants (primary for actions, destructive for deletes, ghost for secondary)
  - Badge for transaction types, recurring indicators, account types
  - Alert for confirmations and warnings before destructive actions
  - Sheet/Drawer for mobile-optimized transaction entry
  - Separator for visual section breaks
  - Tooltip for icon-only buttons to ensure accessibility
  
- **Customizations**: 
  - Custom currency input component with proper localization (EUR) and tabular number formatting
  - Date picker with keyboard navigation and quick presets (today, yesterday, month start)
  - Account selector with colored type indicators and current balance preview
  - PIN input with masked characters and optional visibility toggle
  - Transaction type switcher (Income/Expense/Transfer) with clear visual states
  
- **States**: 
  - Buttons: Distinct hover (slight scale + color shift), active (pressed scale), focus (ring), disabled (opacity + cursor)
  - Inputs: Default border, focus ring, error state (red border + icon), success (green border), disabled (muted)
  - Cards: Subtle hover elevation, selectable state with border highlight, locked state (opacity + lock icon)
  
- **Icon Selection**: 
  - Bank (Conto Bancario) - Traditional bank account icon
  - CreditCard (Carta Prepagata & Carta di Credito) - Card-based payment methods
  - Wallet (Contanti) - Physical cash icon
  - PiggyBank (Salvadanaio) - Savings icon
  - LockKey (Conto Privato) - Encrypted private account
  - TrendUp (Investimenti) - Investment portfolio icon
  - Money (PayPal) - Digital payment service
  - CurrencyBtc (Crypto Wallet) - Cryptocurrency holdings
  - Briefcase (Fondo Pensione) - Retirement/pension fund
  - Plus/Minus/ArrowsLeftRight for transaction types
  - Lock/LockOpen for private account states
  - FunnelSimple for filters
  - DownloadSimple for exports
  - ChartLine for reports
  - Gear for settings
  - Eye/EyeSlash for PIN visibility
  - CalendarBlank for date selection
  
- **Spacing**: 
  - Section padding: p-6 (24px)
  - Card internal: p-4 (16px)
  - Element gaps: gap-4 for related items, gap-6 for distinct groups
  - Form fields: space-y-4 within forms
  - Button groups: gap-2 for related actions
  
- **Mobile**: 
  - Stack account cards vertically on mobile vs. grid on desktop
  - Bottom sheet for transaction entry instead of center modal
  - Simplified table on mobile (hide less critical columns, show details on tap)
  - Sticky header with navigation simplified to hamburger menu
  - Touch-friendly tap targets (min 44px)
  - Swipe gestures for transaction actions (swipe left to delete)
