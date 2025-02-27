/**
 * 供小组件使用的运行时，APP本体不使用此文件。
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ExtensionAPIs } from '@/extension/ExtensionWidgetCapability'

const version = '0.1.0'
type NxType = {
  version: typeof version
} & {
  [k in keyof ExtensionAPIs]: (
    ...args: Parameters<ExtensionAPIs[k]>
  ) => Promise<Awaited<ReturnType<ExtensionAPIs[k]>>>
}
function postParent(data: any) {
  return parent.postMessage(data, '*')
}
let traceId = 0
function newTraceId() {
  return String(++traceId)
}
const nxObj = {
  version,
}
const traceMap = new Map<
  string,
  { resolve(data: any): void; reject(reason: any): void }
>()
self.addEventListener('message', ({ data, source }) => {
  if (!source || source !== parent) return
  const { traceId, return: returnValue, error } = data
  if (typeof traceId !== 'string') return
  if (!traceMap.has(traceId)) throw new Error('traceId not found: ' + traceId)
  const pair = traceMap.get(traceId)!
  if (error !== undefined) pair.reject(error)
  else pair.resolve(returnValue)
  traceMap.delete(traceId)
})

const proxyedNxObj = new Proxy(nxObj, {
  get(target, prop) {
    if (prop in target) return target[prop as keyof typeof target]
    if (typeof prop === 'symbol') return target[prop as never] // 不处理symbol属性
    //尝试调用API。如果没有这个API，parent会回传错误
    return (arg: any) => {
      return new Promise((resolve, reject) => {
        const traceId = newTraceId()
        traceMap.set(traceId, { resolve, reject })
        postParent({ traceId, call: prop, arg })
      })
    }
  },
})
Reflect.defineProperty(self, 'nx', { value: proxyedNxObj })

export default proxyedNxObj as NxType
