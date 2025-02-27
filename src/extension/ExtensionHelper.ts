/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ExtensionAPIs } from './ExtensionWidgetCapability'

type NxType = {
  caniuse(
    identifier: string,
  ): { available: boolean; version: string } | undefined
} & {
  [k in keyof ExtensionAPIs]: (
    ...args: Parameters<ExtensionAPIs[k]>
  ) => Promise<Awaited<ReturnType<ExtensionAPIs[k]>>>
}
declare global {
  interface WindowOrWorkerGlobalScope {
    nx: NxType
  }
}
let exportedNxObj: NxType
;((
  self: Window = globalThis.self,
  parent: Pick<Window, 'postMessage'> = globalThis.parent,
  targetOrigin: string = '*',
  customMethods: { newTraceId?(): string } = {},
) => {
  function postParent(data: any) {
    return parent.postMessage(data, targetOrigin)
  }
  let traceId = 0
  // 使用解构的customMethods的值时，注意用.call(customMethods)避免丢失this指向
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { newTraceId = () => (++traceId).toString() } = customMethods
  const availableAPIs = { ping: '0.1.0', setWidgetHeight: '0.1.0' } as const
  const nxObj = {
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
          const traceId = newTraceId.call(customMethods)
          traceMap.set(traceId, { resolve, reject })
          postParent({ traceId, call: apiName, arg })
        })
      },
    })
  }
  //目前Proxy为noop
  const proxyedNxObj = new Proxy(nxObj, {})
  Reflect.defineProperty(self, 'nx', { value: proxyedNxObj })
  exportedNxObj = proxyedNxObj as any
})()
export { exportedNxObj as nx }
