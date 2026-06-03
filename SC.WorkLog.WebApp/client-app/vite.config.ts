import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const applicationName = 'SC.WorkLog.WebApp'
const certDirectory =
  process.env.APPDATA !== undefined && process.env.APPDATA !== ''
    ? path.join(process.env.APPDATA, 'ASP.NET', 'https')
    : path.join(homedir(), '.aspnet', 'https')

const certFilePath = path.join(certDirectory, `${applicationName}.pem`)
const keyFilePath = path.join(certDirectory, `${applicationName}.key`)
const backendUrl = process.env.VITE_BACKEND_URL ?? 'https://localhost:7046'

if (!existsSync(certFilePath) || !existsSync(keyFilePath)) {
  throw new Error(
    `Missing ASP.NET Core HTTPS certificate. Run "npm start" once to generate ${certFilePath} and ${keyFilePath}.`,
  )
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: 'build',
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    forwardConsole: true,
    https: {
      cert: readFileSync(certFilePath),
      key: readFileSync(keyFilePath),
    },
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
