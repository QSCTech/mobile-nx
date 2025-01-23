import { env } from './env'
import { ZjuamService } from './zjuam'

export type Credential = {
  username: string
  password: string
}
export async function requestCredential(
  service: ZjuamService,
): Promise<Credential> {
  if (!service) console.warn('requestCredential:', service)

  const username = env('VITE_USERNAME')
  const password = env('VITE_PASSWORD')
  if (!(username && password))
    throw new ReferenceError('未设置(开发时)用户名密码')
  return { username, password }
}
