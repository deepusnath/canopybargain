import type { Order } from './cartStore'

/**
 * Deployment-time integration points (set in .env or the host's env config):
 *
 * VITE_ORDER_WEBHOOK_URL   POST target that receives the full order payload
 *                          (order + per-item design JSON). Works with Zapier,
 *                          Make, n8n, a serverless function, or Formspree.
 * VITE_STRIPE_PAYMENT_LINK A Stripe Payment Link opened after the order is
 *                          recorded, carrying the order id as
 *                          client_reference_id. Dynamic per-cart Checkout
 *                          Sessions need a small backend — see issue #4.
 *
 * With neither set the store runs in demo mode: orders record locally only.
 */
export interface PaymentConfig {
  webhookUrl?: string
  stripeLink?: string
}

export function paymentConfig(): PaymentConfig {
  const env = import.meta.env
  return {
    webhookUrl: env.VITE_ORDER_WEBHOOK_URL || undefined,
    stripeLink: env.VITE_STRIPE_PAYMENT_LINK || undefined,
  }
}

export type DeliveryStatus = 'sent' | 'failed' | 'skipped'

/** POST the order to the shop's webhook with bounded retries. */
export async function deliverOrder(order: Order): Promise<DeliveryStatus> {
  const { webhookUrl } = paymentConfig()
  if (!webhookUrl) return 'skipped'
  const payload = JSON.stringify({ source: 'canopybargain', version: 1, order })
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
      })
      if (res.ok) return 'sent'
    } catch {
      /* network error — retry below */
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
  }
  return 'failed'
}

/** Open the configured Stripe Payment Link for this order, if any. */
export function openStripeLink(orderId: string): boolean {
  const { stripeLink } = paymentConfig()
  if (!stripeLink) return false
  const url = new URL(stripeLink)
  url.searchParams.set('client_reference_id', orderId)
  window.open(url.toString(), '_blank', 'noopener')
  return true
}
