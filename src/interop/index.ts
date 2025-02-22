import { App } from '@capacitor/app'
import { Device, DeviceInfo } from '@capacitor/device'

/**平台信息。在初始化后才有效 */
export let appPlatform: DeviceInfo['platform'] = 'web'
export function initCapacitorApp() {
  void Device.getInfo().then((info) => {
    appPlatform = info.platform
    console.warn('platform:', appPlatform)

    if (info.platform === 'web') return

    void App.addListener('backButton', (ev) => {
      if (ev.canGoBack) window.history.back()
      else void App.exitApp()
    })
  })
}
