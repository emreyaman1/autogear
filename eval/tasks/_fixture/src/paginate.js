// Sayfalar 1'den başlar.
export function paginate(items, page, size) {
  const start = page * size
  return items.slice(start, start + size)
}
