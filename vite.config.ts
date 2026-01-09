import { defineConfig } from 'vite'
import path from 'path'
import { execSync } from 'child_process'

// Capture git SHA at build time
const getGitSha = (): string => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    return 'dev'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __GIT_SHA__: JSON.stringify(getGitSha()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
})
