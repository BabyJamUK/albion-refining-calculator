import { fetchPrices } from './marketApi'

const MARKET_FEE = 0.04  // 4% total (1% listing + 3% sales tax)
const SAFE_CITIES = ['Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch', 'Fort Sterling', 'Brecilien']
const ALL_CITIES  = [...SAFE_CITIES, 'Caerleon']

/**
 * Fetch all prices for watchlist items and compute flip opportunities
 */
export async function analyseFlips(watchlist, allowRedBlack, startCity) {
  const cities    = allowRedBlack ? ALL_CITIES : SAFE_CITIES
  const itemIds   = watchlist.map(i => i.id)

  // Fetch all prices in chunks
  const prices = await fetchPrices(itemIds, 'europe')

  const interCity = []
  const intraCity = []

  for (const item of watchlist) {
    const cityData = prices[item.id]
    if (!cityData) continue

    // ── Inter-city flipping ──────────────────────────────────────────────
    // Buy in one city, sell in another
    for (const buyCity of cities) {
      const buyData = cityData[buyCity]
      if (!buyData) continue
      const buyPrice = typeof buyData === 'object' ? buyData.price : buyData
      if (!buyPrice || buyPrice <= 0) continue

      for (const sellCity of cities) {
        if (sellCity === buyCity) continue
        const sellData = cityData[sellCity]
        if (!sellData) continue
        const sellPrice = typeof sellData === 'object' ? sellData.price : sellData
        if (!sellPrice || sellPrice <= 0) continue

        const netSell   = Math.floor(sellPrice * (1 - MARKET_FEE))
        const profit    = netSell - buyPrice
        const margin    = profit / buyPrice
        if (margin <= 0.02) continue  // skip < 2% margin — not worth it

        // Rough volume estimate from price age — fresher = more traded
        const buyAge    = buyData?.date  ? (Date.now() - new Date(buyData.date).getTime()) / 3600000  : 999
        const sellAge   = sellData?.date ? (Date.now() - new Date(sellData.date).getTime()) / 3600000 : 999
        const freshness = Math.max(0, 1 - ((buyAge + sellAge) / 2) / 48)  // 0-1 score

        // Efficiency — profit per zone crossed (rough estimate)
        const zoneCost  = buyCity === startCity ? 1 : 2  // already there = cheaper
        const efficiency = profit / zoneCost

        interCity.push({
          item,
          buyCity,
          sellCity,
          buyPrice,
          sellPrice,
          netSell,
          profit,
          margin,
          efficiency,
          freshness,
          type: 'inter',
          buyAge,
          sellAge,
        })
      }
    }

    // ── Intra-city flipping ──────────────────────────────────────────────
    // Buy order (bid) vs sell order (ask) in same city
    // We need buy_price_max — not in our standard fetch
    // Use sell_price_min spread as proxy: if data is fresh and spread exists
    for (const city of cities) {
      const data = cityData[city]
      if (!data) continue
      const sellMin = typeof data === 'object' ? data.price : data
      if (!sellMin || sellMin <= 0) continue

      // Estimate buy order as 85-95% of sell min (typical spread)
      // Real buy_price_max would require a separate fetch
      // Flag these as estimates
      const estimatedBuyOrder = Math.floor(sellMin * 0.9)
      const netSell           = Math.floor(sellMin * (1 - MARKET_FEE))
      const profit            = netSell - estimatedBuyOrder
      const margin            = profit / estimatedBuyOrder
      if (margin <= 0.02) continue

      const age = data?.date ? (Date.now() - new Date(data.date).getTime()) / 3600000 : 999

      intraCity.push({
        item,
        city,
        buyPrice:   estimatedBuyOrder,
        sellPrice:  sellMin,
        netSell,
        profit,
        margin,
        efficiency: profit,
        freshness:  Math.max(0, 1 - age / 48),
        type:       'intra',
        estimated:  true,
        age,
      })
    }
  }

  return { interCity, intraCity }
}

/**
 * Sort and return top N flip opportunities
 */
export function rankFlips(flips, sortBy = 'margin', limit = 10) {
  const sorted = [...flips].sort((a, b) => {
    if (sortBy === 'margin')     return b.margin     - a.margin
    if (sortBy === 'profit')     return b.profit     - a.profit
    if (sortBy === 'efficiency') return b.efficiency - a.efficiency
    return b.margin - a.margin
  })
  return sorted.slice(0, limit)
}