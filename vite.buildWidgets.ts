import { Plugin } from 'vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'
import { rollup } from 'rollup'
import rollupPluginDts from 'rollup-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

function removePrefix(str: string, prefix: string): string | false {
  if (str.startsWith(prefix)) return str.slice(prefix.length)
  return false
}

/**Vite Plugin，构建extHelper(包括dts)和内置widgets */
export default function buildWidgets(): Plugin {
  return {
    name: 'vite-plugin-build-widgets',
    config() {
      const extHelperKey = '__extHelper'
      const widgetPrefix = '__widget_'
      const rollupInput: Record<string, string> = {
        main: resolve(__dirname, 'index.html'),
        [extHelperKey]: resolve(__dirname, 'extHelper.ts'),
      }
      readdirSync(resolve(__dirname, 'widgets'), {
        encoding: 'utf-8',
        recursive: false,
        withFileTypes: true,
      })
        .filter((d) => d.isDirectory())
        .forEach(
          ({ name: dirName }) =>
            (rollupInput[`${widgetPrefix}${dirName}`] = resolve(
              __dirname,
              'widgets',
              dirName,
              'index.html',
            )),
        )
      return {
        build: {
          rollupOptions: {
            input: rollupInput,
            output: {
              entryFileNames({ name: entryName }) {
                if (entryName === extHelperKey) return 'extHelper.js'
                if (entryName === 'main') return 'assets/[name]-[hash:8].js'
                const widgetName = removePrefix(entryName, widgetPrefix)
                if (widgetName) return 'widgets/[name]/[name]-[hash:8].js'
                throw new Error(`Unexpected entry name: ${entryName}`)
              },
            },
          },
        },
      }
    },
    async generateBundle() {
      //TODO use vite's rollup
      console.log('\nBuilding extHelper.d.ts')
      await (
        await rollup({ input: 'extHelper.ts', plugins: [rollupPluginDts()] })
      ).write({ dir: 'dist' })
    },
  }
}
