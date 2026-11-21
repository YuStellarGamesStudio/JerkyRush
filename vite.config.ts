/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // .deps/ 內的 XYZ.js 原始碼自帶測試，不屬於本專案。
  test: { include: ['tests/**/*.test.ts'] },
});
