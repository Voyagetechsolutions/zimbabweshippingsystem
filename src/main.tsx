
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { configureSecurityHeaders } from './utils/securityHeaders'
import { initializeSpeedInsights } from './utils/speedInsights'

// Initialize security headers
configureSecurityHeaders();

// Initialize Vercel Speed Insights for performance monitoring
initializeSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
