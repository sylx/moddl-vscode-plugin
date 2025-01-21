import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'out',
    lib: {
      entry: resolve(__dirname, 'src/webview/main.tsx'),
      formats: ['es'],
      name: 'moddl',
      fileName: () => 'webview/main.js',
    },
    rollupOptions: {
      external: ['vscode'],
      output: {
        globals: {
          vscode: 'acquireVsCodeApi',
        },
        format: 'es',
        entryFileNames: 'webview/[name].js',
        chunkFileNames: 'webview/chunks/[name].js',
        assetFileNames: 'webview/assets/[name].[ext]',
      },
    },
    sourcemap: 'inline',
    emptyOutDir: false,
    minify: mode === 'production',
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process': {
        env: {
          NODE_ENV: JSON.stringify(mode)
        }
      }
    },
  },
  server: {
    watch: {
      ignored: ['!**/node_modules/**'],
    },
  },
  esbuild: {
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  }
})); 