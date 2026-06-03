import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const applicationName = 'SC.WorkLog.WebApp'
const certDirectory =
  process.env.APPDATA !== undefined && process.env.APPDATA !== ''
    ? join(process.env.APPDATA, 'ASP.NET', 'https')
    : join(homedir(), '.aspnet', 'https')

const certFilePath = join(certDirectory, `${applicationName}.pem`)
const keyFilePath = join(certDirectory, `${applicationName}.key`)

if (!existsSync(certFilePath) || !existsSync(keyFilePath)) {
  mkdirSync(dirname(certFilePath), { recursive: true })

  const result = spawnSync(
    'dotnet',
    [
      'dev-certs',
      'https',
      '--trust',
      '--export-path',
      certFilePath,
      '--format',
      'Pem',
      '--no-password',
    ],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(certFilePath) || !existsSync(keyFilePath)) {
  console.error(`Unable to find ASP.NET Core HTTPS certificate files in ${certDirectory}.`)
  process.exit(1)
}
