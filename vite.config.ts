import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'out',
    lib: {
      entry: resolve(__dirname, 'src/webview/main.tsx'),
      formats: ['iife'],
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
    sourcemap: true,
    emptyOutDir: false,
  },
}); 