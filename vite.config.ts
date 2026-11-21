/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/**
 * 正式版只允許同源資源（安全規則 1、4）。託管端（例如 Cloudflare 自動注入的分析 beacon）
 * 加入的外部腳本與連線會被瀏覽器擋下。開發伺服器需要注入樣式與 HMR，因此只在建置時加上。
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  plugins: [{
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
      injectTo: 'head-prepend',
    }],
  }],
  // .deps/ 內的 XYZ.js 原始碼自帶測試，不屬於本專案。
  test: { include: ['tests/**/*.test.ts'] },
});
