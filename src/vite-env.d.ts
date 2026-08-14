/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORDER_WEBHOOK_URL?: string
  readonly VITE_STRIPE_PAYMENT_LINK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
