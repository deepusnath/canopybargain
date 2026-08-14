/**
 * Privacy-friendly analytics (Plausible), off by default. Set
 * VITE_PLAUSIBLE_DOMAIN (e.g. "canopybargain.com") to enable — no cookies,
 * no personal data, and zero third-party requests while unset.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void
  }
}

const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN

export function initAnalytics(): void {
  if (!domain) return
  window.plausible =
    window.plausible ||
    function (...args: unknown[]) {
      // queue until the script loads
      ;((window.plausible as unknown as { q?: unknown[] }).q =
        (window.plausible as unknown as { q?: unknown[] }).q || []).push(args)
    }
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://plausible.io/js/script.manual.js'
  s.setAttribute('data-domain', domain)
  document.head.appendChild(s)
}

export function trackPageview(path: string): void {
  if (!domain) return
  window.plausible?.('pageview', { props: { path } })
}

export function track(
  event: 'view_product' | 'open_studio' | 'add_to_cart' | 'begin_checkout' | 'place_order',
  props?: Record<string, string | number>,
): void {
  if (!domain) return
  window.plausible?.(event, props ? { props } : undefined)
}
