/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
interface ImportMetaEnv {
  readonly VITE_API_PROXY_BASE?: string
  readonly VITE_HMR_CLIENT_PORT?: string
}
