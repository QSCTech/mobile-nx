import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zjuqsc.nx',
  appName: 'mobile-nx',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true, //替换window.fetch和XMLHttpRequest
    },
  },
}

export default config
