// orders: [{ date: 'YYYY-MM-DD', amount (TL, KDV hariç) }]
// Aylık KDV dahil (%20) toplamlar, kuruşa yuvarlanmış.
export function monthlyTotals(orders) {
  const totals = {}
  for (const order of orders) {
    const month = order.date.slice(0, 7)
    const withTax = Math.floor(order.amount * 1.2 * 100) / 100
    totals[month] = (totals[month] ?? 0) + withTax
  }
  for (const month of Object.keys(totals)) {
    totals[month] = Math.round(totals[month] * 100) / 100
  }
  return totals
}
