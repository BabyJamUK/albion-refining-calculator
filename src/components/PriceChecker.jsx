import { loadItemIndex, searchItems } from '../services/itemSearchService'
import { useState, useEffect, useRef } from 'react'
import { fetchPrices, formatPriceAge, getPriceAgeColor } from '../services/marketApi'
import { ALL_CITIES } from '../data/materials'

//const SEARCH_URL  = 'https://gameinfo.albiononline.com/api/gameinfo/search?q='
const RENDER_URL  = 'https://render.albiononline.com/v1/item/'
const ALL_LOCATIONS = [...ALL_CITIES, 'Black Market']

const QUALITY_LABELS = {
  1: 'Normal', 2: 'Good', 3: 'Outstanding', 4: 'Excellent', 5: 'Masterpiece'
}

function fmt(n) { return (n ?? 0).toLocaleString() }

function PriceAgeTag({ dateString }) {
  if (!dateString) return <span className="text-gray-700 text-xs">—</span>
  const hours = (Date.now() - new Date(dateString).getTime()) / 3600000
  const color = hours < 12 ? 'text-green-400' : hours < 24 ? 'text-amber-400' : 'text-red-400'
  const label = hours < 1
    ? `${Math.round(hours * 60)}m ago`
    : hours < 24 ? `${Math.round(hours)}h ago`
    : `${Math.round(hours / 24)}d ago`
  return <span className={`text-xs font-mono ${color}`}>{label}</span>
}

export default function PriceChecker({ server = 'europe' }) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [searching,   setSearching]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [quality,     setQuality]     = useState(1)
  const [prices,      setPrices]      = useState(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [priceError,  setPriceError]  = useState(null)
  const debounceRef = useRef(null)

// Inside the component, add index loading on mount:
useEffect(() => {
  loadItemIndex()  // pre-load in background so first search is instant
}, [])

// Replace handleSearch with:
const handleSearch = (val) => {
  setQuery(val)
  if (val.length < 2) { setResults([]); return }

  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    const found = searchItems(val, 12)
    // Map to same shape the rest of the component expects
    setResults(found.map(i => ({
      UniqueName: i.id,
      LocalizedNames: { 'EN-US': i.name },
    })))
  }, 150)  // much faster than API — purely local
}

  // Fetch prices for selected item
  const handleSelectItem = async (item) => {
    setSelected(item)
    setResults([])
    setQuery(item.LocalizedNames?.['EN-US'] ?? item.UniqueName)
    await loadPrices(item.UniqueName, quality)
  }

  const loadPrices = async (itemId, q) => {
    setLoadingPrices(true)
    setPriceError(null)
    setPrices(null)
    try {
      // Fetch across all cities + black market
      const cities = ALL_LOCATIONS.join(',').replace('Fort Sterling', 'Fort%20Sterling').replace('Black Market', 'Black%20Market')
      const url    = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemId}?locations=${cities}&qualities=${q}`
      const res    = await fetch(url)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data   = await res.json()

      // Build city → { price, date } map
      const result = {}
      for (const entry of data) {
        const city = entry.city.replace('%20', ' ')
        if (entry.sell_price_min > 0) {
          result[city] = {
            sellMin:     entry.sell_price_min,
            sellMinDate: entry.sell_price_min_date,
            buyMax:      entry.buy_price_max,
            buyMaxDate:  entry.buy_price_max_date,
          }
        }
      }
      setPrices(result)
    } catch (err) {
        console.log("Error: " + err)
      setPriceError('Could not load prices. The item may not be traded on the market.')
    } finally {
      setLoadingPrices(false)
    }
  }

  const handleQualityChange = async (q) => {
    setQuality(q)
    if (selected) await loadPrices(selected.UniqueName, q)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSelected(null)
    setPrices(null)
    setPriceError(null)
  }

  // Best sell price across all cities
  const bestSell = prices
    ? Object.entries(prices).reduce((best, [city, data]) =>
        data.sellMin > (best?.price ?? 0) ? { city, price: data.sellMin } : best, null)
    : null

  const bestBuy = prices
    ? Object.entries(prices).reduce((best, [city, data]) =>
        data.buyMax > (best?.price ?? 0) ? { city, price: data.buyMax } : best, null)
    : null

  return (
    <div className="space-y-6">

      {/* Search box */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-yellow-400 mb-1">🔍 Item Price Checker</h2>
        <p className="text-xs text-gray-400 mb-4">
          Search any item by name to see current prices across all cities — Europe server.
        </p>

        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search items... e.g. 'Demon Cape', 'T5 Bag', 'Avalonian Shard'"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-3.5 text-gray-400 animate-spin">⟳</div>
              )}
            </div>
            {(selected || query) && (
              <button onClick={handleClear}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-3 rounded-lg text-sm transition-colors">
                Clear
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-20 overflow-hidden">
              {results.map(item => (
                <button key={item.UniqueName}
                  onClick={() => handleSelectItem(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left border-b border-gray-700/50 last:border-0">
                  <img
                    src={`${RENDER_URL}${item.UniqueName}.png`}
                    alt=""
                    className="w-8 h-8 rounded object-contain flex-shrink-0"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 text-sm font-medium truncate">
                      {item.LocalizedNames?.['EN-US'] ?? item.UniqueName}
                    </div>
                    <div className="text-gray-500 text-xs font-mono">{item.UniqueName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quality selector */}
        {selected && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Quality:</span>
            {Object.entries(QUALITY_LABELS).map(([q, label]) => (
              <button key={q}
                onClick={() => handleQualityChange(Number(q))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  quality === Number(q)
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected item header */}
      {selected && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
          <img
            src={`${RENDER_URL}${selected.UniqueName}.png`}
            alt={selected.LocalizedNames?.['EN-US']}
            className="w-14 h-14 rounded-lg object-contain bg-gray-800 p-1"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div className="flex-1">
            <h3 className="text-gray-100 font-bold text-base">
              {selected.LocalizedNames?.['EN-US'] ?? selected.UniqueName}
            </h3>
            <div className="text-gray-500 text-xs font-mono mt-0.5">{selected.UniqueName}</div>
            <div className="text-xs text-gray-400 mt-1">
              Quality: <span className="text-yellow-400">{QUALITY_LABELS[quality]}</span>
            </div>
          </div>
          {bestSell && (
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Best sell price</div>
              <div className="text-green-400 font-mono font-bold text-lg">{fmt(bestSell.price)}</div>
              <div className="text-xs text-gray-400">{bestSell.city}</div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loadingPrices && (
        <div className="text-center py-8 text-yellow-400 animate-pulse">
          📡 Fetching prices across all cities...
        </div>
      )}

      {/* Error */}
      {priceError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
          ⚠️ {priceError}
        </div>
      )}

      {/* Price table */}
      {prices && !loadingPrices && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">

          {/* Summary strip */}
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/40 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Best sell (lowest ask)</div>
              {bestSell ? (
                <>
                  <span className="text-green-400 font-mono font-bold text-xl">{fmt(bestSell.price)}</span>
                  <span className="text-gray-400 text-sm ml-2">in {bestSell.city}</span>
                </>
              ) : <span className="text-gray-600 text-sm">No data</span>}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Best buy order (highest bid)</div>
              {bestBuy ? (
                <>
                  <span className="text-blue-400 font-mono font-bold text-xl">{fmt(bestBuy.price)}</span>
                  <span className="text-gray-400 text-sm ml-2">in {bestBuy.city}</span>
                </>
              ) : <span className="text-gray-600 text-sm">No data</span>}
            </div>
          </div>

          {/* Per-city breakdown */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/20 text-xs text-gray-500">
                  <th className="text-left px-6 py-3">City</th>
                  <th className="text-right px-4 py-3 text-green-400">Sell price (ask)</th>
                  <th className="text-right px-4 py-3 text-gray-400">Age</th>
                  <th className="text-right px-4 py-3 text-blue-400">Buy order (bid)</th>
                  <th className="text-right px-6 py-3 text-gray-400">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ALL_LOCATIONS.map(city => {
                  const data     = prices[city]
                  const isBestSell = bestSell?.city === city
                  const isBestBuy  = bestBuy?.city  === city
                  return (
                    <tr key={city}
                      className={`hover:bg-gray-800/30 transition-colors ${
                        isBestSell || isBestBuy ? 'bg-gray-800/20' : ''
                      }`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium">{city}</span>
                          {isBestSell && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                              Best sell
                            </span>
                          )}
                          {isBestBuy && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                              Best buy
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data?.sellMin > 0
                          ? <span className="text-green-400 font-mono font-bold">{fmt(data.sellMin)}</span>
                          : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PriceAgeTag dateString={data?.sellMinDate} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data?.buyMax > 0
                          ? <span className="text-blue-400 font-mono">{fmt(data.buyMax)}</span>
                          : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <PriceAgeTag dateString={data?.buyMaxDate} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {Object.keys(prices).length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No market data found for this item. It may not be traded in these cities.
            </div>
          )}
        </div>
      )}
    </div>
  )
}