// vite.config.js
const { resolve } = require('path')
const { defineConfig } = require('vite')
const pkg = require('./package.json')

module.exports = defineConfig({
  base: process.env.DEPLOY_ENV === 'GH_PAGES' ? '/nova-zombie-simulator/' : '',
  assetsInclude: ['**/**/*.wav'],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 5173, // Vite's new default port (less likely to conflict)
    strictPort: false, // automatically find next available port if busy
    open: true, // automatically open browser
    host: true // listen on all addresses, helps with port detection
  },
  build: {
    target: 'esnext', //browsers can handle the latest ES features
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  }
})