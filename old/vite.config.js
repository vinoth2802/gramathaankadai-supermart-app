import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',

  // 'mpa' tells Vite this is a Multi-Page App.
  // Without this, Vite serves index.html for every missing URL (SPA mode),
  // which causes the infinite redirect loop when navigating to pages
  // that haven't been created yet.
  appType: 'mpa',

  server: {
    port: 5173,
    watch: {
      ignored: ['**/server/**', '**/node_modules/**']
    }
  }
});
