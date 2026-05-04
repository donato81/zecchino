import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'

import "./main.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <TooltipProvider delayDuration={200}>
      <App />
    </TooltipProvider>
   </ErrorBoundary>
)
