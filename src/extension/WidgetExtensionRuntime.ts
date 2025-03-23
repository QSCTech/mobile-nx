import { WidgetExtension } from './Extension'
import { z } from 'zod'
import { afterDone, applyOn, PromiseAwaited } from '../utils/func'
import { BorrowedHandle } from './BorrowManager'
import { encodeReturn, ExtensionRuntime } from './ExtensionRuntime'
import { isExposedAPI, WidgetExtensionAPI } from './ExtensionAPI'

type ResolveHandle<H> = H extends BorrowedHandle<infer O> ? O : H
type WidgetExtensionRuntimeExposedAPIs = WidgetExtensionRuntime['exposedAPIs']
export type WidgetExtensionExposedAPIs = {
  [k in keyof WidgetExtensionRuntimeExposedAPIs]: (
    ...args: Parameters<WidgetExtensionRuntimeExposedAPIs[k]>
  ) => Promise<
    ResolveHandle<
      PromiseAwaited<ReturnType<WidgetExtensionRuntimeExposedAPIs[k]>>
    >
  >
}

/**小组件插件的运行时管理类，负责管理跨文档通信。 */
export class WidgetExtensionRuntime extends ExtensionRuntime {
  public constructor(public readonly extension: WidgetExtension) {
    super(extension)
  }

  /**与此能力实例关联的iframe元素。仅该iframe发送的message会被处理 */
  iframeEle: HTMLIFrameElement | null = null

  /**@internal */
  static readonly widgetMessageDataBaseSchema = z
    .object({
      traceId: z.string(),
      call: z.string(),
      args: z.array(z.unknown()),
    })
    .passthrough()

  readonly exposedAPIs = new WidgetExtensionAPI(this)

  protected onMessage({ data, source }: MessageEvent) {
    if (!this.iframeEle || !source || source !== this.iframeEle?.contentWindow)
      return
    const traceId = String((data as { traceId?: unknown } | undefined)?.traceId)
    try {
      const { call, args } =
        WidgetExtensionRuntime.widgetMessageDataBaseSchema.parse(data)

      const f = this.exposedAPIs[call as keyof typeof this.exposedAPIs]
      if (!isExposedAPI(f)) throw new Error(`No exposed API named ${call}`)
      const result = applyOn(
        f as (this: typeof this.exposedAPIs, ...args: unknown[]) => unknown,
        this.exposedAPIs,
        args,
      )

      afterDone(result, async (data: unknown) =>
        source.postMessage({ traceId, return: await encodeReturn(data) }, '*'),
      )
    } catch (e) {
      source.postMessage({ error: e, traceId: traceId }, '*')
      throw e
    }
  }

  /**@internal */
  bindRender(iframeEle: HTMLIFrameElement) {
    this.iframeEle = iframeEle
    this.iframeEle.height = '0'
    const messageHandler = this.onMessage.bind(this)
    window.addEventListener('message', messageHandler)
    this.iframeEle.src = this.extension.widget.entryUrl
    return () => window.removeEventListener('message', messageHandler)
  }
}
