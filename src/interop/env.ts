import '../utils' //加载扩展原型方法
import './index' //平台相关初始化

export const isNode = !import.meta.env
if (isNode)
  // 当且仅当node环境下，手动加载环境变量
  await import('dotenv').then(({ config }) => {
    ;['.env', '.env.development']
      .map((f) => [f, f + '.local'])
      .flat(1)
      .forEach((file) => {
        const err = config({ path: file }).error as
          | (Error & { code?: string })
          | null
        if (err?.code === 'ENOENT') console.warn(`${file} 不存在`)
        else if (err) console.error(err)
        else console.log(`已加载 ${file}`)
      })
  })

/**获取环境变量，支持VITE和node环境，包括vite编译后。请注意，vite只暴露VITE_开头的环境变量。 */
export function env(key: string, autoPrefix = true): string | null {
  const viteKey = autoPrefix && !key.match(/^VITE_/i) ? `VITE_${key}` : key
  let result =
    (import.meta.env?.[key] as string | null) ??
    globalThis.process?.env?.[key] ??
    null
  if (result === null && viteKey !== key)
    result =
      (import.meta.env?.[viteKey] as string | null) ??
      globalThis.process?.env?.[viteKey] ??
      null
  return result
}
