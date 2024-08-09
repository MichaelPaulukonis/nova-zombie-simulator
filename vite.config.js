// vite.config.js
const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  base: process.env.DEPLOY_ENV === 'GH_PAGES' ? '/nova-zombie-simulator/' : '',
  assetsInclude: ['**/**/*.wav'],
  build: {
    target: 'esnext', //browsers can handle the latest ES features
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  }
})