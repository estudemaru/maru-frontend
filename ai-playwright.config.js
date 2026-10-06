import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'ai.spec.js',use:{baseURL:'http://127.0.0.1:5187'},webServer:{command:'PORT=5187 node scripts/dev-server.js',url:'http://127.0.0.1:5187'}});
