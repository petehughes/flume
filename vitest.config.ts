import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Jest-like globals
    globals: true,
    // Environment
    environment: 'jsdom',
    // Include below if you want code coverage
    setupFiles: './src/tests/setupTests.ts',
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    }
  },
})