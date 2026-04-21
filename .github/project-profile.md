---
initialized: true
scf_protected: true
scf_file_role: "config"
scf_merge_priority: 10
scf_merge_strategy: "user_protected"
active_plugins:
  - spark-base
  - scf-master-codecrafter
scf_version: "1.2.0"
framework_edit_mode: false
scf_owner: "spark-base"
spark: true
framework_version: "2.3.1"
---

# Project Profile — Zecchino

## Identificazione

- **Nome**: Zecchino
- **Repo**: donato81/zecchino
- **Descrizione**: Applicazione web per la gestione delle finanze personali con accessibilità totale per dispositivi Android e screen reader (TalkBack/VoiceView).

## Stack

- **Linguaggio**: TypeScript
- **Framework UI**: React 19 + Vite (plugin `@vitejs/plugin-react-swc`)
- **Styling**: TailwindCSS v4 (`@tailwindcss/vite`), shadcn/ui (`@radix-ui/*`, `class-variance-authority`)
- **State/Data**: TanStack Query v5
- **Grafici**: D3 v7, Recharts
- **Animazioni**: Framer Motion
- **Routing**: nessuno (SPA single-view con dialog stack)
- **Piattaforma**: GitHub Spark (`@github/spark`)

## Build & Tooling

- **Build system**: Vite
- **Bundler mode**: ESNext, `moduleResolution: bundler`
- **Linting**: ESLint
- **Test runner**: nessuno configurato
- **Path alias**: `@/` → `./src/`

## Vincoli principali

- Accessibilità: supporto completo TalkBack/VoiceView, ARIA labels, live regions, touch target ≥ 48×48 px
- Sicurezza: PIN doppio (globale + privato), cifratura AES-256 per account privato
- Mobile-first, PWA-ready
- Output navigabile con screen reader (NVDA-friendly)
- Nessun `console.log` su stdout nei contesti MCP

## Caratteristiche funzionali chiave

- Gestione conti multipli (10 tipologie)
- Transazioni: entrate, uscite, trasferimenti, ricorrenti
- Budget con alert, previsioni e confronti storici
- Obiettivi risparmio con progress tracking
- Feedback audio (40+ suoni) e feedback tattile (haptic)
- Scorciatoie tastiera per power user
- Gestione categorie personalizzabili
- Import/export dati