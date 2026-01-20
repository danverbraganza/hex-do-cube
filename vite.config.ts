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
        // Remove hashes from filenames and use custom names
        entryFileNames: 'assets/hex-do-cube.js',
        chunkFileNames: (chunkInfo) => {
          // Name the three.js chunk
          if (chunkInfo.name === 'three') {
            return 'assets/three.js'
          }
          return 'assets/[name].js'
        },
        assetFileNames: (assetInfo) => {
          // Name the CSS file
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/hex-do-cube.css'
          }
          return 'assets/[name].[ext]'
        },
      },
    },
  },
})
