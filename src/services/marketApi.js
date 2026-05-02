// Albion Online Data Project — https://www.albion-online-data.com/
// Server endpoints:
//   Europe:   https://europe.albion-online-data.com
//   Americas: https://west.albion-online-data.com
//   Asia:     https://east.albion-online-data.com

export const SERVERS = {
  europe:   { label: '🌍 Europe',   url: 'https://europe.albion-online-data.com' },
  americas: { label: '🌎 Americas', url: 'https://west.albion-online-data.com'   },
  asia:     { label: '🌏 Asia',     url: 'https://east.albion-online-data.com'   },
}

const CITIES = [
  'Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch',
  'Fort%20Sterling', 'Caerleon', 'Brecilien'
]

// Albion market fees deducted from sale proceeds:
// 1% listing fee (paid upfront, non-refundable)
// 3% sales tax (deducted when item sells)
// Total effective deduction: 4% of sale price
export const LISTING_FEE_RATE = 0.01  // 1%
export const SALES_TAX_RATE   = 0.03  // 3%
export const TOTAL_MARKET_FEE = LISTING_FEE_RATE + SALES_TAX_RATE  // 4%

/**
 * Apply market fees to a gross silver amount
 * Returns the net silver after listing + sales tax
 */
export function applyMarketFees(grossSilver, includeListingFee = true) {
  if (!includeListingFee) return grossSilver
  return Math.floor(grossSilver * (1 - TOTAL_MARKET_FEE))
}

/**
 * Fetch prices from the correct server
 * @param {string[]} itemIds
 * @param {string} server - key from SERVERS object
 */
export async function fetchPrices(itemIds, server = 'europe') {
  console.log('Item Count: ', itemIds.length)
  if (!itemIds?.length) return {}

  const baseUrl   = SERVERS[server]?.url ?? SERVERS.europe.url
  const ids       = itemIds.join(',')
  const locations = CITIES.join(',')
  const url       = `${baseUrl}/api/v2/stats/prices/${ids}?locations=${locations}&qualities=1`

  console.log('fetching: ', url)

  const res = await fetch(url)
  console.log('Response Status: ', res)

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
      if (tier > 2) ids.push(mat.apiRefinedId(tier - 1))
    }
  }
  return [...new Set(ids)]
}