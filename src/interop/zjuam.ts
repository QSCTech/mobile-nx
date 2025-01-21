//TODO 优化依赖/逻辑
import * as bigintModArith from 'bigint-mod-arith'
import { getRawUrl, nxFetch } from './fetch'
import { requestCredential } from './credential'

/**将字符串用utf-8编码，再将字节序列转为bigint，越靠前的字符处于越高位 */
function encodeAsBigInt(s: string) {
  let res = 0n
  new TextEncoder().encode(s).forEach((byte) => {
    res <<= 8n
    res |= BigInt(byte)
  })
  return res
}

type UpstreamPubKey = {
  /**RSA加密的指数。16进制(不含0x)，一般为"10001" */
  exponent: string
  /**RSA加密的模数。16进制(不含0x) */
  modulus: string
}

/**zjuam入口为https://zjuam.zju.edu.cn/cas/login?service=...的服务 */
type CasParams = { service: string }
/**zjuam入口为https://zjuam.zju.edu.cn/cas/oauth2.0/authorize?client_id=...&redirect_uri=...&response_type=code的服务 */
type Oauth2Params = {
  client_id: string
  redirect_uri: string
  response_type: 'code'
}
type SupportedParams = CasParams | Oauth2Params
/**对于不同服务，编码参数，获得入口点 */
function getEntryUrl(params: SupportedParams) {
  if ('service' in params)
    return `https://zjuam.zju.edu.cn/cas/login?${new URLSearchParams(params)}`
  else
    //oauth2会被重定向到https://zjuam.zju.edu.cn/cas/login?service=http%3A%2F%2Fzjuam.zju.edu.cn%2Fcas%2Foauth2.0%2FcallbackAuthorize
    return `https://zjuam.zju.edu.cn/cas/oauth2.0/authorize?${new URLSearchParams(
      params,
    )}`
}

/**一个zjuam服务。是对fetch的包装，登录过期后会自动刷新登录
 *
 * 由于原生层会自动保存cookie，登录一旦完成，对应用的所有HTTP请求都有效。
 */
export class ZjuamService {
  /**
   * 初始化一个服务，设置参数。调用构造方法不会进行登录。
   * @param params
   * @param refreshInSeconds
   */
  public constructor(
    public readonly params: SupportedParams,
    public readonly refreshInSeconds = 60 * 30,
  ) {
    const rawNxFetch = nxFetch
    const extendMethods: Record<string, any> = {}
    for (const [key, rawMethod] of Object.entries(nxFetch))
      extendMethods[key] = (...args: any[]) =>
        this.loginIfExpired().then(() => rawMethod(...args))
    this.nxFetch = Object.assign(
      (
        input: Parameters<typeof nxFetch>[0],
        init: Parameters<typeof nxFetch>[1],
      ) => {
        return this.loginIfExpired().then(() => rawNxFetch(input, init))
      },
      extendMethods as any,
    )
  }
  /**上次登录成功时间 */
  protected lastLoginTime?: Date
  public nxFetch: typeof nxFetch

  public async loginIfExpired(): Promise<string | null> {
    if (
      !this.lastLoginTime ||
      Date.now() - this.lastLoginTime.valueOf() >= this.refreshInSeconds * 1000
    )
      return await this.login()
    return null
  }

  /**登录成功判定 */
  static readonly loginSuccessRegex = /[?&]ticket=/
  /**立即重新登录。成功返回最终服务重定向地址（跟随zjuam登录成功302），失败异步抛出错误。 */
  public async login(): Promise<string> {
    const entryResp = await nxFetch.get(getEntryUrl(this.params), {
      headers: {
        Origin: 'https://zjuam.zju.edu.cn',
      },
      credentials: 'include',
    })
    const respText = await entryResp.text()
    const execution = respText.match(
      /<input type="hidden" name="execution" value="(?<execution>.+)"/,
    )?.groups?.execution
    if (!execution) throw new Error('获取execution失败')
    /**打开登录页面，zjuam重定向得到的最终地址 */
    const postUrl = getRawUrl(entryResp.url)

    if (postUrl.match(ZjuamService.loginSuccessRegex)) {
      // “记住我”生效，访问登录页面直接登录成功
      this.lastLoginTime = new Date()
      return postUrl
    }
    // 获取用户名密码
    const { username, password } = await requestCredential(this)

    // 获取公钥
    const { exponent, modulus } = (await (
      await nxFetch.get('https://zjuam.zju.edu.cn/cas/v2/getPubKey', {
        credentials: 'include',
        headers: { Referer: postUrl, Origin: 'https://zjuam.zju.edu.cn' },
      })
    ).json()) as UpstreamPubKey
    const exponentBigInt = BigInt('0x' + exponent)
    const modulusBigInt = BigInt('0x' + modulus)
    const rawPassword = encodeAsBigInt(password)
    const encPassword = bigintModArith
      .modPow(rawPassword, exponentBigInt, modulusBigInt)
      .toString(16)
      .padStart(128, '0')

    const loginResp = await nxFetch.postUrlEncoded(postUrl, {
      credentials: 'include',
      body: {
        username,
        password: encPassword,
        _eventId: 'submit',
        execution,
        authcode: '',
        rememberMe: 'false',
      },
      headers: {
        Referer: postUrl,
      },
    })
    const loginUrl = getRawUrl(loginResp.url)
    if (loginUrl.match(ZjuamService.loginSuccessRegex)) {
      this.lastLoginTime = new Date()
      return loginUrl
    }

    const errorHtml = await loginResp.text()
    let error = '未知错误'
    const { allowDate } =
      errorHtml.match(/allowLoginTime\s*=\s*'(?<allowDate>.+)'/)?.groups ?? {}
    if (allowDate) {
      const allowTimestamp = Date.parse(allowDate + '+0800').valueOf() //(上游)时区为UTC+8
      const nowTimestamp = Date.now()
      const waitSeconds = Math.ceil((allowTimestamp - nowTimestamp) / 1000)
      error = `失败次数太多，请在 ${waitSeconds}s 重试`
    } else
      error =
        errorHtml.match(/<span id="msg">(?<errMsg>.*)<\/span>/)?.groups
          ?.errMsg ?? error
    console.error('登录失败', this, error, errorHtml)
    throw new Error('登录失败: ' + error)
  }
}

