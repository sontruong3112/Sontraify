import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
const hasValidClerkPublishableKey = /^(pk_test_|pk_live_)[A-Za-z0-9_\-]+$/.test(String(clerkPublishableKey).trim())

const appTree = (
  <HashRouter>
    <App />
  </HashRouter>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {hasValidClerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
        {appTree}
      </ClerkProvider>
    ) : appTree}
  </StrictMode>,
)
