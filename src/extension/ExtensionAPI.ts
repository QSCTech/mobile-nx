import { z } from 'zod'
import { WidgetExtensionRuntime } from './WidgetExtensionRuntime'
import { ZjuamService } from '../services/ZjuamService'
import { ExtensionRuntime } from './ExtensionRuntime'

const apiMetadataKey = Symbol('APIMetadata')
type WithAPIMetadata = { [apiMetadataKey]: APIMetatdata }
type APIMetatdata = { version: string; schema: z.ZodType }

function exposedAPI<V extends string>(version: V, schema: z.ZodType) {
  return function <
    This,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Value extends (this: This, ...args: any) => unknown,
  >(
    value: Value,
    // context: ClassMethodDecoratorContext<This, Value>,
  ): Value & WithAPIMetadata {
    const checkedFunction = function (...args) {
      const parsedArgs = schema.parse(args) as Parameters<Value>
      return value.apply(this, parsedArgs)
    } as Value
    Object.assign(checkedFunction, { [apiMetadataKey]: { version, schema } })
    return Object.assign(checkedFunction, {
      [apiMetadataKey]: { version, schema },
    })
  }
}

export function isExposedAPI(value: unknown): value is WithAPIMetadata {
  return typeof value === 'function' && apiMetadataKey in value
}

export class ExtensionAPI {
  constructor(protected runtime: ExtensionRuntime) {}

  @exposedAPI('0.1.0', z.any())
  ping() {
    return 'pong'
  }

  @exposedAPI('0.1.0', z.tuple([z.string().min(1)]))
  caniuse(identifier: string) {
    const func = this[identifier as keyof this] as WithAPIMetadata | undefined,
      metadata = func?.[apiMetadataKey]
    if (!metadata) return undefined
    const { version } = metadata
    return { identifier, version, available: true }
  }

  @exposedAPI('0.1.0', ZjuamService.ctorSchema)
  newZjuamService(...args: ConstructorParameters<typeof ZjuamService>) {
    return this.runtime.borrowManager.borrow(new ZjuamService(...args))
  }

  @exposedAPI(
    '0.1.0',
    z.tuple([z.number(), z.string().optional(), z.array(z.unknown())]),
  )
  applyOnHandle(handleId: number, prop: string, args: unknown[]) {
    const p = prop || null
    return this.runtime.borrowManager.applyOn(handleId, p, undefined, args)
  }
}

export class WidgetExtensionAPI extends ExtensionAPI {
  constructor(protected runtime: WidgetExtensionRuntime) {
    super(runtime)
  }

  @exposedAPI('0.1.0', z.tuple([z.number().min(0).max(500)]))
  setWidgetHeight(height: number) {
    if (!this.runtime.iframeEle) throw new Error('No iframe element found')
    this.runtime.iframeEle.height = height.toString()
  }
}
