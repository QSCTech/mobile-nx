import { ZjuamService } from './zjuam'

export type Credential = {
  username: string
  password: string
}
export async function requestCredential(
  service: ZjuamService,
): Promise<Credential> {
  console.warn('requestCredential:', service)

  const username =
    import.meta.env?.VITE_USERNAME ?? globalThis.process?.env?.VITE_USERNAME
  const password =
    import.meta.env?.VITE_PASSWORD ?? globalThis.process?.env?.VITE_PASSWORD
  if (!(username && password))
    throw new ReferenceError('未设置(开发时)用户名密码')
  return { username, password }
}
