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

// ── URL chunking ──────────────────────────────────────────────────────────────
// API has a 4096 character URL limit — chunk requests to stay safe
const CHUNK_SIZE = 30

function chunkArray(arr, size) {
const chunks = []
for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
return chunks
}

/**

- Apply market fees to a gross silver amount
- Returns the net silver after listing + sales tax
  */
  export function applyMarketFees(grossSilver, includeListingFee = true) {
  if (!includeListingFee) return grossSilver
  return Math.floor(grossSilver * (1 - TOTAL_MARKET_FEE))
  }

/**

- Fetch current prices from the correct server
- Now returns { [itemId]: { [city]: { price, date } } }
- date = when the price was last recorded (for staleness indicator)
-
- @param {string[]} itemIds
- @param {string}   server - key from SERVERS object
  */
  export async function fetchPrices(itemIds, server = 'europe') {
  if (!itemIds?.length) return {}

const baseUrl   = SERVERS[server]?.url ?? SERVERS.europe.url
const locations = CITIES.join(',')
const chunks    = chunkArray([...new Set(itemIds)], CHUNK_SIZE)

console.log(`Fetching ${itemIds.length} items in ${chunks.length} chunk(s) from ${SERVERS[server]?.label}`)

const responses = await Promise.all(
chunks.map(async chunk => {
const url = `${baseUrl}/api/v2/stats/prices/${chunk.join(',')}?locations=${locations}&qualities=1`
console.log('Fetching chunk:', url)
const res = await fetch(url)
console.log('Response status:', res.status)
if (!res.ok) throw new Error(`API ${res.status}`)
return res.json()
})
)

const result = {}
for (const data of responses) {
for (const entry of data) {
const id    = entry.item_id
const city  = entry.city.replace('%20', ' ')
const price = entry.sell_price_min
const date  = entry.sell_price_min_date  // ← Phase 6: capture price date


  if (!result[id]) result[id] = {}
  if (price > 0)   result[id][city] = { price, date }
}


}
return result
}

/**

- Fetch 7-day price history for charting
- Returns { [itemId]: { [city]: [ { date, price, avg } ] } }
-
- @param {string[]} itemIds
- @param {number}   days   - how many days back to fetch
- @param {string}   server - key from SERVERS object
  */
  export async function fetchPriceHistory(itemIds, days = 7, server = 'europe') {
  if (!itemIds?.length) return {}

const baseUrl   = SERVERS[server]?.url ?? SERVERS.europe.url
const locations = CITIES.join(',')

const endDate   = new Date()
const startDate = new Date()
startDate.setDate(endDate.getDate() - days)

const fmtDate = d => d.toISOString().split('T')[0]
const chunks  = chunkArray([...new Set(itemIds)], 10)

const responses = await Promise.all(
  chunks.map(async chunk => {
    const url = `${baseUrl}/api/v2/stats/charts/${chunk.join(',')}.json?locations=${locations}&date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&time-scale=24&qualities=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Chart API ${res.status}`)
    const json = await res.json()
    console.log('Chart response sample:', JSON.stringify(json[0]))  // ← add this
    return json
  })
)

const result = {}
for (const data of responses) {
for (const entry of data) {
const id   = entry.item_id
const city = entry.location?.replace('%20', ' ')
if (!city || !entry.data?.timestamps) continue


  if (!result[id]) result[id] = {}

  result[id][city] = entry.data.timestamps
    .map((ts, i) => ({
      date:  new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      price: entry.data.prices_avg?.[i] ?? 0,
      avg:   entry.data.prices_avg?.[i]  ?? 0,
    }))
    .filter(d => d.price > 0)
}


}
return result
}

/**

- Build all item IDs needed for the given materials and tiers
  */
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

// ── Price age helpers ─────────────────────────────────────────────────────────

/**

- Returns how many hours old a price is
  */
  export function getPriceAge(dateString) {
  if (!dateString) return null
  const diff = Date.now() - new Date(dateString).getTime()
  return diff / (1000 * 60 * 60)
  }

/**

- Returns a human-readable age string e.g. “2h ago”, “3d ago”
  */
  export function formatPriceAge(dateString) {
  const hours = getPriceAge(dateString)
  if (hours === null) return null
  if (hours < 1)     return `${Math.round(hours * 60)}m ago`
  if (hours < 24)    return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
  }

/**

- Returns a Tailwind text colour class based on price staleness
- Green  = < 12h  (fresh)
- Amber  = 12-24h (getting stale)
- Red    = > 24h  (stale — treat with caution)
  */
  export function getPriceAgeColor(dateString) {
  const hours = getPriceAge(dateString)
  if (hours === null) return 'text-gray-600'
  if (hours < 12)    return 'text-green-400'
  if (hours < 24)    return 'text-amber-400'
  return 'text-red-400'
  }

/**

- Get the flat price number from the { price, date } structure
- Use this anywhere you need just the number for calculations
- Handles both old format (plain number) and new format ({ price, date })
  */
  export function getPrice(priceData, itemId, city) {
  const entry = priceData?.[itemId]?.[city]
  if (!entry) return 0
  return typeof entry === 'object' ? (entry.price ?? 0) : entry
  }

/**

- Get the best city price and its date for a given item
- Returns { city, price, date } or null
  */
  export function getBestCityPrice(priceData, itemId) {
  const cityData = priceData?.[itemId]
  if (!cityData) return null

return Object.entries(cityData).reduce((best, [city, entry]) => {
const price = typeof entry === 'object' ? (entry.price ?? 0) : entry
return price > (best?.price ?? 0) ? { city, price, date: entry?.date } : best
}, null)
}