import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API reads PORT from the repository root .env, so the dev proxy follows the same value.
// parseEnv has no side effects: Vite's loadEnv would also copy the root NODE_ENV=development
// into the build and turn `vite build` into a development build.
function apiPort() {
  const envFile = new URL('../../.env', import.meta.url)
  const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}
  return process.env.PORT || fileEnv.PORT || '4321'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Keep the browser's Host header so the API's same-origin check sees the page's own origin.
      '/api': { target: `http://127.0.0.1:${apiPort()}`, changeOrigin: false },
    },
  },
})
