# Planning Guide

Zecchino è un gestore di finanze personali completo e accessibile che permette agli utenti di tracciare le proprie entrate e uscite su conti multipli, con sicurezza avanzata tramite PIN e completa accessibilità per screen reader e TalkBack.

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
- **Functionality**: Full keyboard navigation and quick actions throughout the app (Ctrl+N for new transaction, Ctrl+M for new account, Ctrl+D/T/R for tab navigation, Ctrl+E for export, Ctrl+U to unlock private account, arrow keys for list navigation, ? to show help)
- **Purpose**: Enable power users and accessibility users to navigate and perform actions without mouse interaction
- **Trigger**: Keyboard combinations pressed anywhere in the app (except when typing in input fields)
- **Progression**: Press shortcut → Action executes immediately → Toast confirms action → UI updates
- **Success criteria**: All shortcuts work reliably; arrow keys navigate transaction lists with visual focus; keyboard help dialog (?) displays complete reference; visual badges on buttons show shortcuts; no conflicts with browser shortcuts

### List Keyboard Navigation
- **Functionality**: Navigate transaction lists using arrow keys (↑/↓), jump to first/last with Home/End, edit with Enter or E key, delete with Delete key
- **Purpose**: Provide efficient, accessible navigation for screen reader users and keyboard-only users through transaction lists
- **Trigger**: Arrow keys, Home, End, Enter, E, or Delete pressed when viewing transaction lists (Recent Transactions or All Transactions)
- **Progression**: Press arrow key → Focus moves to next/previous item with visual highlight → Press Enter/E → Edit dialog opens → Or press Delete → Confirmation dialog appears
- **Success criteria**: Visual focus indicator clearly shows selected transaction; navigation wraps from last to first; actions work on focused item; keyboard hints displayed above lists; focus state persists during navigation

### Keyboard Focus Visual Indicators
- **Functionality**: Automatic tooltip system that displays contextual information when navigating with keyboard (Tab, arrows), showing element purpose and available shortcuts
- **Purpose**: Provide clear visual feedback for keyboard navigation state, especially valuable for screen reader users and keyboard-only navigation
- **Trigger**: Any keyboard navigation action (Tab, arrow keys) that moves focus to an interactive element
- **Progression**: Press Tab/Arrow key → Focus moves to element → Animated tooltip appears above/below element showing description and keyboard shortcut → Tooltip follows focus as user navigates → Disappears on mouse interaction
- **Success criteria**: Tooltips appear for all interactive elements (buttons, tabs, transaction rows, category filters); tooltip text is descriptive and includes shortcuts; tooltip positioning adapts to avoid screen edges; only appears during keyboard navigation, not mouse hover

### Comprehensive Reporting
- **Functionality**: Generate financial insights by period, category, and account with interactive tooltips, visual charts showing detailed statistics, monthly comparison charts comparing current vs previous period, budget tracking with progress visualization, and full screen reader support with automatic announcements
- **Purpose**: Visualize financial health, trends, spending patterns, and track progress against spending goals with instant access to breakdowns, income vs expense trends over time, month-over-month comparisons, budget performance, and complete accessibility for visually impaired users
- **Trigger**: Navigate to Reports section or hover/focus on stat cards or view income/expense chart or monthly comparison or create/view budgets
- **Progression**: View monthly comparison chart showing current vs previous month → Screen reader announces income, expenses, and net balance → See percentage changes in income, expenses, and net balance with visual indicators → Select period filter for trend chart (week, month, 3 months, 6 months, year) → View total income/expenses → View visual trend chart with area graphs → Hover/focus on cards for detailed breakdowns with ARIA labels → Analyze by category → Review monthly trends → Create budget → Set target amount and period (monthly, quarterly, annual) → Choose scope (general, by category, or by account) → Monitor budget progress with visual progress bars and verbal progress announcements → See warnings when approaching or exceeding budget limits with screen reader alerts → Export data with confirmation announcement
- **Success criteria**: Reports show accurate calculations, clear visualizations with interactive area charts showing income vs expense trends, monthly comparison bar charts with percentage change indicators, interactive tooltips with top categories and transaction counts, period selector for customizable time ranges, budget cards showing spent amount vs target with progress percentage and color-coded status (green: under 50%, yellow: 75-90%, amber: 90-100%, red: over budget), export to CSV/text, full screen reader accessibility with automatic announcements of all data changes and navigation events, all interactive elements properly labeled with ARIA attributes, keyboard navigation fully supported

### Screen Reader & Accessibility Support
- **Functionality**: Complete screen reader support with automatic voice announcements, live regions for dynamic content, semantic HTML structure, comprehensive ARIA attributes, keyboard-only navigation, skip links, and focus management
- **Purpose**: Enable users with visual impairments or motor disabilities to fully access and use all features of Zecchino independently, ensuring compliance with WCAG 2.1 Level AA standards
- **Trigger**: Any user interaction - authentication, navigation, data entry, viewing reports, filtering, exporting
- **Progression**: Screen reader announces application context → User navigates with keyboard (Tab, arrows, shortcuts) → Focus indicators show current position → Actions trigger automatic voice announcements (e.g., "Movimento aggiunto: uscita 50 euro su Carta prepagata, categoria Spesa alimentare") → Live regions announce dynamic changes (balance updates, budget alerts, filter activations) → All dialogs announce title on open and confirmation on close → Lists announce position and total count → Errors announce clearly with specific guidance
- **Success criteria**: All functionality accessible via keyboard alone, no keyboard traps exist, all interactive elements have proper ARIA labels and roles, screen reader announces all page transitions and state changes, live regions update appropriately, focus is always visible and logically sequenced, skip link allows bypassing repeated content, all images and icons have text alternatives, color is not the only means of conveying information, all form fields have persistent labels, error messages are specific and actionable, screen reader announces: authentication success/failure, account creation with details, transaction with type/amount/category, deletions, budget status with percentage and remaining amount, filter state changes, tab navigation with element counts, export confirmations with item counts

### Budget Planning & Tracking with Real-Time Alerts and Forecasting
- **Functionality**: Create spending budgets with target amounts for specific time periods (monthly, quarterly, annual) that can be scoped to all expenses, a specific category, or a specific account, with pre-built templates for common expense categories to enable quick budget setup. System automatically monitors spending and shows prominent alert banners when budgets reach warning thresholds (75%, 90%) or are exceeded, with instant toast notifications when adding transactions that push budgets over limits. Advanced forecasting analyzes historical spending patterns and current trends to predict end-of-period spending, helping users understand whether they'll stay within budget or need to adjust their habits.
- **Purpose**: Help users set financial goals, control spending, stay aware of their budget limits through real-time progress tracking with minimal setup effort using intelligent templates, combined with proactive multi-level alerts that prevent overspending by warning users before and when limits are reached. Budget forecasting provides forward-looking insights based on actual behavior, enabling proactive financial planning rather than reactive adjustments.
- **Trigger**: Click "Nuovo Budget" button in Reports tab → Choose from template gallery or create custom → Add expense transaction that impacts an active budget → View alert banner at top of dashboard → Receive toast notification when threshold crossed → View forecast card to see projected spending
- **Progression**: Open budget dialog → View template gallery with 11 pre-configured budgets (Spesa Alimentare, Ristoranti, Trasporti, Casa, Svago, Salute, Abbonamenti, Abbigliamento, Istruzione, Animali, Budget Totale) → Select template to auto-fill name, amount, period, and category OR skip templates → Enter budget name → Set target amount → Choose period (monthly/quarterly/annual) → Select scope (general, by category, or by account) → Save → Budget appears as progress card → Forecasting system analyzes last 6 periods of historical data and current spending pace → Forecast card displays projected spending at period end with confidence level (high/medium/low based on data availability) → View days elapsed/remaining, current vs historical daily averages → See comparison with historical average spending → Receive early warnings if projected to exceed budget → Monitor spending against budget → Visual progress bar shows percentage used → Color changes from green → yellow → amber → red as budget is consumed → Alert banner appears at 75%, 90%, and 100% thresholds → Toast notifications appear immediately when adding transactions that cross thresholds → Click "Visualizza Budget" on alert to jump to budget details → Dismiss individual alerts when acknowledged → Adjust spending habits based on forecast insights
- **Success criteria**: Templates automatically populate budget fields with sensible defaults for common categories, each template displays descriptive icon and color coding, suggested amounts are editable, budget automatically tracks relevant expenses based on scope, calculates accurate percentage and remaining amount, displays intuitive visual progress with color coding, shows prominent alert banners at top of dashboard when budgets reach 75%, 90%, or exceed 100%, alerts can be individually dismissed and persist until dismissed, clicking "Visualizza Budget" on alert navigates to Reports tab and opens budget dialog, toast notifications appear immediately when adding transactions that push budgets across warning thresholds (75%, 90%, 100%), budget percentage state persists to prevent duplicate notifications, alerts show spending summary with target amount and remaining balance, animated card entrance and exit, alerts sorted by severity (exceeded > critical > warning), can be temporarily disabled without deletion. Forecast cards display accurate projections using weighted algorithm (historical average for early period, current trend for mid-to-late period), confidence badges clearly indicate reliability (high/medium/low), forecast method is explained in card description, comparison with historical average shows whether spending is above/below normal with percentage difference, projected end-of-period spending highlights budget risk with warning badges, forecast updates as new transactions are added, handles edge cases (completed periods, insufficient historical data) gracefully, integrates seamlessly with existing budget display in Reports tab

### Budget Spending History & Trends Over Multiple Periods
- **Functionality**: Automatically track and visualize budget spending across multiple historical periods (up to 6 periods) with trend analysis comparing recent spending to historical patterns. Shows historical bar chart for each budget with spending amounts, percentages, and visual indicators for periods that exceeded budget. Displays period-over-period comparison card showing current vs previous period with change percentage and amount, along with trend indicators (increasing/decreasing/stable).
- **Purpose**: Enable users to understand their spending patterns over time, identify trends (improving or worsening adherence to budgets), and make data-driven decisions about future budget adjustments based on historical performance.
- **Trigger**: Navigate to Reports tab → View active budgets → Scroll to "Analisi Storica Budget" section
- **Progression**: View budget progress cards → Scroll down to historical analysis section → See horizontal bar chart showing last 6 periods (months/quarters/years depending on budget period type) → Each bar shows spending amount, percentage of budget, and color coding → Visual reference line indicates budget target → Hover/click bars for detailed tooltip showing exact amounts, transaction count, and remaining/exceeded amounts → View period comparison card showing current vs previous period → See trend icon (up/down/stable) with percentage change → Review calculated metrics: average spending across periods, number of periods over budget, spending trend direction
- **Success criteria**: Historical chart displays accurate data for previous 6 periods with appropriate period labels (e.g., "Gen 2024", "Q1 2024", "2024" depending on budget period type), bars are color-coded consistently with current budget card (green < 75%, yellow 75-90%, amber 90-100%, red > 100%), visual target line clearly marks budget limit, tooltips provide comprehensive details on hover, comparison card shows accurate calculations with intuitive trend indicators, trend analysis correctly identifies increasing/decreasing/stable patterns based on 10% threshold, average spending calculation is accurate, system handles budgets with less than full history gracefully, period labels are localized in Italian, works seamlessly for all three budget period types (monthly/quarterly/annual)

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

## Sound Design

Professional audio feedback reinforces user actions and provides accessibility for screen reader users through synthesized Web Audio API sounds.

- **PIN Authentication**: Ascending melodic chords for successful unlock, descending tones for errors
- **Transaction Types**: Distinct sounds for income (bright chord), expense (single note), transfer (two-note sequence)
- **Budget Alerts**: Progressive severity - gentle warning at 75%, urgent at 90%, critical when exceeded
- **Navigation**: Subtle click for UI interactions, smooth transition tone for tab changes
- **Actions**: Success chimes for saves, delete descending sequence, notification pings
- **Keyboard Shortcuts**: Immediate audio feedback for all shortcuts to confirm activation
- **Focus Navigation**: Soft tone when navigating lists with arrow keys

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
