export const FREE_SHIPPING_THRESHOLD = 500
export const SHIPPING_FEE = 49.9

// Kargo ücreti: eşik ve üstü ücretsiz.
export function shippingCost(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}
