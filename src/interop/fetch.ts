import { CapacitorHttp } from '@capacitor/core'
import { appPlatform } from '.'

const nxFetchExtend = {
  request: CapacitorHttp.request,
  get(url: string, init?: RequestInit) {
    return this(url, init)
  },
  postJson(
    url: string,
    init: Omit<RequestInit, 'body'> & { body: Record<string, any> },
  ) {
    let { body, headers, ...otherProps } = init
    headers = new Headers(headers)
    /** https://www.iana.org/assignments/media-types/application/json
     *  Note:  No "charset" parameter is defined for this registration.
     *  Adding one really has no effect on compliant recipients. */
    headers.set('Content-Type', 'application/json')
    return this(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...otherProps,
    })
  },
  /**发送POST请求，Content-Type: application/x-www-form-urlencoded */
  postUrlEncoded(
    url: string,
    init: Omit<RequestInit, 'body'> & { body: Record<string, any> },
  ) {
    let { body, headers, ...otherProps } = init
    headers = new Headers(headers)
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
    return this(url, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
      ...otherProps,
    })
  },
  /**发送POST请求，Content-Type: multipart/form-data */
  postFormData(
    url: string,
    init: Omit<RequestInit, 'body'> & { body: FormData },
  ) {
    let { body, headers, ...otherProps } = init
    headers = new Headers(headers)
    headers.set('Content-Type', 'multipart/form-data')
    return this(url, {
      method: 'POST',
      headers,
      body,
      ...otherProps,
    })
  },
} as const satisfies ThisType<typeof fetch>
/**http请求方法集合。直接调用其时，签名与web标准fetch一致。有native支持时无视跨域限制。
 *
 * 在所有平台上都会自动记录cookie并按标准附带，无法单独控制。
 */
export const nxFetch: typeof fetch & typeof nxFetchExtend = Object.assign(
  function (input, init) {
    if (typeof window !== 'object')
      console.warn('nxFetch: using native fetch', input)
    else if (appPlatform === 'web')
      //TODO 用本地开发服务器代理请求
      console.warn('nxFetch: using web fetch on web platform', input)
    init ??= {}
    const h = new Headers(init.headers)
    h.set('Accept', '*/*')
    h.set('Accept-Encoding', 'gzip, deflate')
    h.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8')
    h.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
    )
    init.headers = {}
    for (const [k, v] of h.entries()) init.headers[k] = v
    const result = globalThis.fetch(input, init)
    return result
  } satisfies typeof fetch,
  nxFetchExtend,
)

export function getRawUrl(interceptedUrl: string) {
  //解析http://192.168.0.100:8100/_capacitor_http_interceptor_?u=https%3A%2F%2Fzjuam.zju.edu.cn%2Fcas%2Flogin%3Fservice%3Dhttp%253A%252F%252Fzdbk.zju.edu.cn%252Fjwglxt%252Fxtgl%252Flogin_ssologin.html
  const url = new URL(interceptedUrl)
  if (url.pathname === '/_capacitor_http_interceptor_')
    return url.searchParams.get('u')!
  return interceptedUrl
}
