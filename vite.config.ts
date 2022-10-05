import fs from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type ResolvedConfig, type Plugin, type ConfigEnv, type UserConfig } from 'vite'

interface BexOptions {
  content_script?: string
}

function bex(options?: BexOptions): Plugin {
  let _env: ConfigEnv // command: build | serve // mode: 'chromium', firefox, firefox-desktop, firefox-android
  let _config: ResolvedConfig
  let building: boolean = false
  let outDir: string
  // outDir = resolve(config.root, config.build.outDir)
  let multiExtensionRunner: { exit(): Promise<void> } | undefined

  interface Emitter {
    readonly browser: 'chromium' | 'firefox'
  }

  let _emitter: Emitter | undefined

  return {
    name: 'web-ext',
    config(config, { mode, command }) {
      _env = { mode, command }

      // run on build only
      if (command === 'build') {
        // if watch, run as development
        const watch = !!config.build?.watch

        if (watch) {
          const isChromium = mode.toLowerCase() === 'chromium'
          const isFirefox = mode.toLowerCase().startsWith('firefox')

          if (isChromium || isFirefox) {
            _emitter = {
              browser: isChromium ? 'chromium' : 'firefox'
            }

            const cfg: UserConfig = {}

            process.env.NODE_ENV = 'development'

            return cfg
          }
        }
      }
    },
    configResolved(config) {
      _config = config
    },
    buildStart() {
      let manifestFile: string | undefined = undefined
      const manifestFileLocations: string[] = []

      const isChromium = _env.mode.toLowerCase() === 'chromium'
      const isFirefox = _env.mode.toLowerCase().startsWith('firefox')

      if (isFirefox) {
        manifestFileLocations.push(
          ...[
            resolve(_config.root, 'manifest_firefox.json'),
            resolve(_config.root, 'public/manifest_firefox.json'),
            resolve(_config.root, 'manifest.json'),
            resolve(_config.root, 'public/manifest.json')
          ]
        )
      }

      if (isChromium) {
        manifestFileLocations.push(
          ...[
            resolve(_config.root, 'manifest_chromium.json'),
            resolve(_config.root, 'public/manifest_chromium.json'),
            resolve(_config.root, 'manifest.json'),
            resolve(_config.root, 'public/manifest.json')
          ]
        )
      }

      for (const manifestFileLocation of manifestFileLocations) {
        if (fs.existsSync(manifestFileLocation)) {
          manifestFile = manifestFileLocation
          break
        }
      }

      if (manifestFile) {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: fs.readFileSync(manifestFile, 'utf8')
        })
      }
    },
    async writeBundle() {
      if (_emitter && !multiExtensionRunner) {
        const outDir = resolve(_config.root, _config.build.outDir)

        process.once('SIGINT', function (code) {
          multiExtensionRunner!.exit()
        })
        process.once('SIGTERM', function (code) {
          multiExtensionRunner!.exit()
        })

        try {
          const webExt = await import('web-ext')
          multiExtensionRunner = await webExt.cmd.run(
            {
              noInput: true,
              sourceDir: outDir,
              target: _emitter.browser === 'chromium' ? 'chromium' : 'firefox-desktop',
              startUrl: _emitter.browser === 'chromium' ? 'chrome://extensions/' : 'about:debugging#/runtime/this-firefox'
            },
            {
              shouldExitProgram: true
            }
          )
        } catch (ex) {
          console.error(ex)
          process.exit(1)
        }
      }
    }
  }
}

export default defineConfig(function (env) {
  const { mode } = env

  return {
    plugins: [bex()],
    build: {
      outDir: 'dist/dev',
      minify: false,
      rollupOptions: {
        input: {
          content_script: mode === 'firefox' ? 'src/content_script_firefox.ts' : 'src/content_script_chromium.ts'
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      }
    }
  }
})
