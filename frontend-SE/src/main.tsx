import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { StartupGate } from './app/guards/StartupGate'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupGate>
      <App />
    </StartupGate>
  </StrictMode>,
)
