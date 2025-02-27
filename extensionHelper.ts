/**
 * 供小组件使用的运行时，APP本体不使用此文件。
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ExtensionAPIs } from '@/extension/ExtensionWidgetCapability'

const version = '0.1.0'
type NxType = {
  version: typeof version
  caniuse(
    identifier: string,
  ): { available: boolean; version: string } | undefined
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
const availableAPIs = { ping: '0.1.0', setWidgetHeight: '0.1.0' } as const
const nxObj = {
  version,
  caniuse(identifier: string) {
    if (identifier in availableAPIs)
      return {
        available: true,
        version: availableAPIs[identifier as keyof typeof availableAPIs],
      }
    return undefined
  },
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
for (const apiName in availableAPIs) {
  Reflect.defineProperty(nxObj, apiName, {
    value: function (arg: any) {
      return new Promise((resolve, reject) => {
        const traceId = newTraceId()
        traceMap.set(traceId, { resolve, reject })
        postParent({ traceId, call: apiName, arg })
      })
    },
  })
}

//目前Proxy为noop
const proxyedNxObj = new Proxy(nxObj, {})
Reflect.defineProperty(self, 'nx', { value: proxyedNxObj })

export default proxyedNxObj as NxType
