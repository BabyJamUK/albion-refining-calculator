const GOLD_URL = 'https://europe.albion-online-data.com/api/v2/stats/gold?count=1'

/**
 * Fetch current gold price in silver
 * Returns { price, timestamp } or null
 */
export async function fetchGoldPrice() {
  try {
    const res  = await fetch(GOLD_URL)
    if (!res.ok) throw new Error(`Gold API ${res.status}`)
    const data = await res.json()
    if (!data?.length) return null
    return {
      price:     data[0].price,
      timestamp: data[0].timestamp,
    }
  } catch (err) {
    console.error('Gold fetch error:', err)
    return null
  }
}

export function formatGoldAge(timestamp) {
  if (!timestamp) return ''
  const mins = Math.round((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (mins < 60)  return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}