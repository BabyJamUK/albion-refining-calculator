const BASE_URL = 'https://west.albion-online-data.com/api/v2/stats/prices'
const CITIES   = ['Lymhurst','Thetford','Martlock','Bridgewatch','Fort%20Sterling','Caerleon','Brecilien']

export async function fetchPrices(itemIds) {
  if (!itemIds?.length) return {}
  const url = `${BASE_URL}/${itemIds.join(',')}?locations=${CITIES.join(',')}&qualities=1`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}`)
  const data = await res.json()

  const result = {}
  for (const entry of data) {
    const id    = entry.item_id
    const city  = entry.city.replace('%20', ' ')
    const price = entry.sell_price_min
    if (!result[id]) result[id] = {}
    if (price > 0)   result[id][city] = price
  }
  return result
}

export function buildItemIds(materials, tiers) {
  const ids = []
  for (const mat of materials) {
    for (const tier of tiers) {
      ids.push(mat.apiRawId(tier))
      ids.push(mat.apiRefinedId(tier))
      if (tier > 3) ids.push(mat.apiRefinedId(tier - 1))
    }
  }
  return [...new Set(ids)]
}
