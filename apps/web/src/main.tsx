import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted so no request leaves the private network.
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/500.css'
import '@fontsource/atkinson-hyperlegible-next/600.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/screens.css'
import './styles/uni.css'
import App from './App.tsx'
import { AuthGate } from './components/AuthGate.tsx'
import { Pad } from './components/Icon.tsx'
import { DialogProvider, ToastProvider } from './components/ui.tsx'
import { registerServiceWorker } from './lib/pwa.ts'
import { HopProvider } from './store/HopStore.tsx'

registerServiceWorker()

const loading = (
  <div className="page" aria-busy="true">
    <span className="skeleton" style={{ height: 28, width: 240 }} />
    <span className="skeleton sk-line" style={{ width: 360, maxWidth: '100%' }} />
    <div className="rows" aria-hidden="true">
      {[60, 53, 46, 39].map((width) => <div className="sk-row" key={width}><span className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} /><div style={{ display: 'grid', gap: 8, flex: 1 }}><span className="skeleton sk-line" style={{ width: `${width}%` }} /><span className="skeleton sk-line" style={{ width: '30%', height: 10 }} /></div></div>)}
    </div>
  </div>
)

const failed = (retry: () => void) => (
  <main className="auth">
    <div className="auth-card">
      <div className="auth-brand"><Pad size={40} /><span className="brand-name">Hop</span></div>
      <div className="banner banner-danger" role="alert"><div className="banner-body"><strong>Your workspace could not be loaded.</strong><span>Your data is safe on the server. Check that Hop is running, then try again.</span></div></div>
      <button className="btn btn-primary btn-lg btn-block" onClick={retry} type="button">Try again</button>
    </div>
  </main>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthGate>
        {(signOut) => (
          <HopProvider failed={failed} loading={loading}>
            <DialogProvider>
              <App onSignOut={signOut} />
            </DialogProvider>
          </HopProvider>
        )}
      </AuthGate>
    </ToastProvider>
  </StrictMode>,
)
