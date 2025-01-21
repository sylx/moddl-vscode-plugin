import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Webview用のビルド設定のみに簡素化
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode), //react.development.js内で使われているので
  },
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
      },
    },
    sourcemap: mode === 'development' ? 'inline' : false,
    emptyOutDir: false,
    minify: mode === 'production',
  }
})); 