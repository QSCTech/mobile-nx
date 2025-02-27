import { useEffect, useRef } from 'react'
import { ExtensionCapability } from './Extension'
import { z } from 'zod'
import { throwF } from '@/utils/functions'

type FuncOnCapability<K extends keyof ExtensionWidgetCapability['exposedAPI']> =
  ExtensionWidgetCapability['exposedAPI'][K]['f']
export type ExtensionAPIs = {
  caniuse: FuncOnCapability<'caniuse'>
  ping: FuncOnCapability<'ping'>
  setWidgetHeight: FuncOnCapability<'setWidgetHeight'>
}

/**插件能力-小组件。允许插件添加一个通过iframe加载的小组件。 */
export class ExtensionWidgetCapability extends ExtensionCapability {
  constructor(public readonly widgetEntry: string) {
    super()
  }

  /**与此能力实例关联的iframe元素。仅该iframe发送的message会被处理 */
  #iframeEle: HTMLIFrameElement | null = null

  static readonly maxWidgetHeight = 500
  static readonly widgetMessageDataBaseSchema = z
    .object({
      traceId: z.string(),
      call: z.string(),
      arg: z.unknown(),
    })
    .passthrough()
  /**向小组件暴露的API方法。如果f返回Promise，将在兑现后将(非Promise)兑现值回传给小组件；否则直接将返回值回传 */
  readonly exposedAPI = {
    caniuse: {
      version: '0.1.0',
      f: (identifier: string) => {
        const descriptor =
          this.exposedAPI[identifier as keyof typeof this.exposedAPI]
        if (!descriptor) return undefined
        return { identifier, available: true, version: descriptor.version }
      },
      argSchema: z.string().min(1),
    },
    ping: {
      version: '0.1.0',
      f: () => 'pong',
      argSchema: z.unknown(),
    },
    setWidgetHeight: {
      version: '0.1.0',
      f: this.setWidgetHeight.bind(this),
      argSchema: z
        .number()
        .min(0)
        .max(ExtensionWidgetCapability.maxWidgetHeight),
    },
  }
  /**更新小组件UI高度，单位为像素 */
  setWidgetHeight(height: number) {
    if (!this.#iframeEle) throw new Error('No iframe element found')
    this.#iframeEle.height = height.toString()
  }

  onMessage({ data, source }: MessageEvent) {
    if (
      !this.#iframeEle ||
      !source ||
      source !== this.#iframeEle?.contentWindow
    )
      return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const traceId = data.traceId as string
    try {
      const { call, arg } =
        ExtensionWidgetCapability.widgetMessageDataBaseSchema.parse(data)
      if (!(call in this.exposedAPI)) throw new Error(`未找到所需调用 ${call}`)
      const { f, argSchema } =
        this.exposedAPI[call as keyof typeof this.exposedAPI]
      const parsedArg = argSchema.parse(arg)
      const result = f(parsedArg as never) as unknown
      const responseToWidget = (data: unknown) =>
        source.postMessage({ traceId, return: data }, '*')
      if (result instanceof Promise) result.then(responseToWidget, throwF)
      else responseToWidget(result)
    } catch (e) {
      console.error('error while handling widget message', e)
      source.postMessage({ error: e, traceId: traceId }, '*')
    }
  }

  bindRender(iframeEle: HTMLIFrameElement) {
    this.#iframeEle = iframeEle
    iframeEle.height = '0'
    const messageHandler = this.onMessage.bind(this)
    window.addEventListener('message', messageHandler)
    return () => window.removeEventListener('message', messageHandler)
  }
}

/**
 * 构建一个插件的小组件。请勿修改props，以避免重绘iframe并丢失状态。
 */
export function ExtensionWidget({
  capability,
}: {
  capability: ExtensionWidgetCapability
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => capability.bindRender(iframeRef.current!))
  return (
    <iframe
      style={{ border: 'none', overflow: 'hidden' }}
      scrolling="no"
      allow={['geolocation'].map((k) => `${k} 'none'`).join('; ')}
      referrerPolicy="origin"
      sandbox="allow-scripts allow-forms allow-same-origin"
      src={capability.widgetEntry}
      ref={iframeRef}
    />
  )
}
