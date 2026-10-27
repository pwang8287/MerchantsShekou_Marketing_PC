import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue()], build: { chunkSizeWarningLimit: 1800, rollupOptions: { output: { manualChunks: { charts: ['echarts'], ui: ['element-plus'] } } } } });
