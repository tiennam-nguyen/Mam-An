import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',fullyParallel:false,workers:1,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',trace:'retain-on-failure'},webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},reporter:'list'});
