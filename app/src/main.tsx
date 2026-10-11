import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Zelf-gehost via @fontsource, geen CDN-aanroep: PRD §8 eist "volledig
// offline" — een lettertype dat bij elke start bij Google vandaan moet
// komen, past daar niet bij. Alleen de gewichten die het ontwerp
// daadwerkelijk gebruikt (W10, Stitch-briefing).
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/400-italic.css'
import '@fontsource/source-serif-4/700.css'
import '@fontsource/source-serif-4/700-italic.css'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
