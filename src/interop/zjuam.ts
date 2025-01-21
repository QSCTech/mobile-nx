//TODO 优化依赖/逻辑
import axios, { Axios } from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import * as bigintModArith from 'bigint-mod-arith'
import { CookieJar } from 'tough-cookie'

interface GetPubKeyResp {
  exponent: string
  modulus: string
}

interface PubKey {
  N: bigint
  E: bigint
}

export class ZjuamClient {
  public http: Axios

  // NOTE: 在浏览器中不需要这个jar，但在nodejs中需要
  public cookieJar: CookieJar

  public constructor() {
    this.cookieJar = new CookieJar()
    //TODO 确认这些配置是否需要
    this.http = wrapper(
      axios.create({
        timeout: 20000,
        maxRedirects: 10,
        withCredentials: true,
        responseType: 'json',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36 Edg/94.0.992.50',
        },
        jar: this.cookieJar,
      }),
    )
  }

  public async login(zjuid: string, password: string, targetUrl: string) {
    const auth_url = `https://zjuam.zju.edu.cn/cas/login?service=${targetUrl}`
    const execution = await this.getExecutionStr(auth_url)
    if (!execution) throw new Error('获取execution失败')
    const key = await this.getPubKey()
    const encrypted_password = this.rsaEncrypt(password, key)
    const params = new URLSearchParams()
    params.append('username', zjuid)
    params.append('password', encrypted_password)
    params.append('_eventId', 'submit')
    params.append('execution', execution)
    params.append('authcode', '')
    params.append('rememberMe', 'true')
    const succeed = { ok: false }

    const resp = await this.http.post(auth_url, params, {
      responseType: 'text',
      validateStatus: () => true,
      beforeRedirect(_, details) {
        const target = details.headers.location as string
        if (!target.startsWith('https://zjuam.zju.edu.cn/cas/login')) {
          succeed.ok = true
        } else {
          console.log('error: redirect details=', details)
        }
      },
    })

    if (succeed.ok) {
      return
    }

    // else: parse html to get error message
    const text = resp.data as string

    if (text.includes('输错密码次数太多')) {
      const allow_login_time = /allowLoginTime = '(.*?)'/.exec(text)?.at(1)
      if (allow_login_time) {
        const d = new Date(allow_login_time)
        const waitSeconds = (d.getTime() - Date.now()) / 1000
        throw new Error(
          `输错密码次数太多，请在${waitSeconds.toFixed(0)}s之后再试`,
        )
      }
      throw new Error('输错密码次数太多，请稍后再试')
    }

    // const doc = new JSDOM(text).window.document
    //TODO 解析错误信息
    const errmsg = null //doc.getElementById('msg')?.textContent
    throw new Error(errmsg ?? '未知错误')
  }

  private async getPubKey() {
    const resp = await this.http.get(
      'https://zjuam.zju.edu.cn/cas/v2/getPubKey',
    )
    const data = resp.data as GetPubKeyResp
    const E = BigInt('0x' + data.exponent)
    const N = BigInt('0x' + data.modulus)
    return { N, E } as PubKey
  }

  private async getExecutionStr(auth_url: string) {
    const resp = await this.http.get(auth_url, { responseType: 'text' })
    const respText = resp.data as string
    const execution = respText.match(
      /<input type="hidden" name="execution" value="(?<execution>.+)"/,
    )?.groups?.execution
    return execution
  }

  private rsaEncrypt(s: string, key: PubKey) {
    let plainData = BigInt(0)

    const encoder = new TextEncoder()
    encoder.encode(s).forEach((byte) => {
      plainData <<= 8n
      plainData |= BigInt(byte)
    })

    const res = bigintModArith.modPow(plainData, key.E, key.N)
    const resStr = res.toString(16).padStart(128, '0')
    return resStr
  }
}

