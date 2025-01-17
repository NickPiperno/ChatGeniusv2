import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'Safari',
      use: { browserName: 'webkit' }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.NEXT_PUBLIC_API_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  reporter: [
    ['html'],
    ['list']
  ],
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000
}

export default config 