/**
 * Local-only card validation for the demo checkout. Card data entered here is
 * validated in the browser and then DISCARDED — it is never stored in any
 * order record and never leaves the page. Real charging goes through Stripe
 * once configured (see src/shop/payment.ts).
 */

export interface CardInfo {
  number: string
  expiry: string // MM/YY
  cvc: string
  nameOnCard: string
}

export const EMPTY_CARD: CardInfo = { number: '', expiry: '', cvc: '', nameOnCard: '' }

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function luhnValid(number: string): boolean {
  const digits = number.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

export function expiryValid(expiry: string): boolean {
  const m = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const month = Number(m[1])
  if (month < 1 || month > 12) return false
  const year = 2000 + Number(m[2])
  const now = new Date()
  const end = new Date(year, month, 0, 23, 59, 59)
  return end >= now
}

export function cvcValid(cvc: string): boolean {
  return /^\d{3,4}$/.test(cvc)
}

export function validateCard(card: CardInfo): string[] {
  const problems: string[] = []
  if (!luhnValid(card.number)) problems.push('Enter a valid card number.')
  if (!expiryValid(card.expiry)) problems.push('Enter a valid expiry date (MM/YY, not in the past).')
  if (!cvcValid(card.cvc)) problems.push('Enter the 3–4 digit security code.')
  if (card.nameOnCard.trim().length < 2) problems.push('Enter the name on the card.')
  return problems
}
