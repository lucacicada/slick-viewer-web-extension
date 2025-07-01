import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import webExtension, { readJsonFile } from 'vite-plugin-web-extension'
import zip from 'vite-plugin-zip-pack'

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json')
  const pkg = readJsonFile('package.json')
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  }
}

// https://vitejs.dev/config/
export default defineConfig((env) => {
  return {
    plugins: [
      vue(),
      tailwindcss(),
      webExtension({
        browser: process.env.TARGET || 'chrome',
        manifest: generateManifest,
        watchFilePaths: ['package.json', 'manifest.json'],
      }),
      env.mode === 'development'
        ? null
        : zip({
            outFileName: `slick-viewer-${process.env.TARGET || 'chrome'}.zip`,
          }),
    ],
  }
})
