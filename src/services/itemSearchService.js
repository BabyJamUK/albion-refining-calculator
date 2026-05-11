// Loads the item index once and provides fast client-side search
// Index is fetched from /items-index.json (generated at build time)

let itemIndex = null
let loadPromise = null

export async function loadItemIndex() {
  if (itemIndex) return itemIndex
  if (loadPromise) return loadPromise

  loadPromise = fetch('/items-index.json')
    .then(r => r.json())
    .then(data => {
      itemIndex = data
      return data
    })
    .catch(err => {
      console.error('Failed to load item index:', err)
      loadPromise = null
      return []
    })

  return loadPromise
}

/**
 * Search items by name — fast client-side filter
 * Returns up to `limit` matches
 */
export function searchItems(query, limit = 12) {
  if (!itemIndex || !query || query.length < 2) return []

  const q = query.toLowerCase().trim()

  // Prioritise items that START with the query, then items that CONTAIN it
  const starts   = []
  const contains = []

  for (const item of itemIndex) {
    const name = item.name.toLowerCase()
    if (name.startsWith(q))      starts.push(item)
    else if (name.includes(q))   contains.push(item)
    if (starts.length + contains.length >= limit * 3) break
  }

  return [...starts, ...contains].slice(0, limit)
}