import { useState, useEffect, useRef } from 'react'
import { DEFAULT_WATCHLIST, ITEM_CATEGORIES } from '../data/flipperItems'
import { analyseFlips, rankFlips } from '../services/flipperService'
import { loadItemIndex, searchItems } from '../services/itemSearchService'

const SAFE_CITIES = ['Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch', 'Fort Sterling', 'Brecilien']
const ALL_CITIES  = [...SAFE_CITIES, 'Caerleon']
const RENDER_URL  = 'https://render.albiononline.com/v1/item/'
//const SEARCH_URL  = 'https://gameinfo.albiononline.com/api/gameinfo/search?q='

function fmt(n)    { return (n ?? 0).toLocaleString() }
function pct(n)    { return `${(n * 100).toFixed(1)}%` }
function silver(n) { return `${fmt(Math.round(n))} ` }

function AgeTag({ hours }) {
  if (!hours || hours > 200) return <span className="text-gray-700 text-xs">No data</span>
  const color = hours < 12 ? 'text-green-400' : hours < 24 ? 'text-amber-400' : 'text-red-400'
  const label = hours < 1  ? `${Math.round(hours * 60)}m`
    : hours < 24 ? `${Math.round(hours)}h`
    : `${Math.round(hours / 24)}d`
  return <span className={`text-xs ${color}`}>{label} ago</span>
}

function MarginBar({ margin }) {
  const pctVal = Math.min(100, margin * 100)
  const color  = margin >= 0.3 ? 'bg-green-500' : margin >= 0.15 ? 'bg-yellow-500' : 'bg-orange-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${pctVal}%` }} />
      </div>
      <span className={`text-xs font-bold ${margin >= 0.3 ? 'text-green-400' : margin >= 0.15 ? 'text-yellow-400' : 'text-orange-400'}`}>
        {pct(margin)}
      </span>
    </div>
  )
}

export default function MarketFlipper({ allowRedBlack, onToggleZones }) {
  const [startCity,    setStartCity]    = useState('Lymhurst')
  const [watchlist,    setWatchlist]    = useState(DEFAULT_WATCHLIST)
  const [results,      setResults]      = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [sortBy,       setSortBy]       = useState('margin')
  const [activeTab,    setActiveTab]    = useState('inter')
  const [filterCat,    setFilterCat]    = useState('All')
  const [showWatchlist,setShowWatchlist]= useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults,setSearchResults]= useState([])
  const [searching,    setSearching]    = useState(false)
  const [lastFetched,  setLastFetched]  = useState(null)
  const debounceRef = useRef(null)

  const cities = allowRedBlack ? ALL_CITIES : SAFE_CITIES

// Pre-load on mount:
useEffect(() => { loadItemIndex() }, [])

// Replace handleSearch:
const handleSearch = (val) => {
  setSearchQuery(val)
  if (val.length < 2) { setSearchResults([]); return }
  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    setSearchResults(searchItems(val, 8).map(i => ({
      UniqueName: i.id,
      LocalizedNames: { 'EN-US': i.name },
    })))
  }, 150)
}

  const handleAddItem = (item) => {
    const newItem = {
      id:       item.UniqueName,
      name:     item.LocalizedNames?.['EN-US'] ?? item.UniqueName,
      category: 'Custom',
    }
    if (!watchlist.find(w => w.id === newItem.id)) {
      setWatchlist(prev => [...prev, newItem])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemoveItem = (id) => {
    setWatchlist(prev => prev.filter(i => i.id !== id))
  }

  const handleResetWatchlist = () => setWatchlist(DEFAULT_WATCHLIST)

  // Run analysis
  const handleAnalyse = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const data = await analyseFlips(watchlist, allowRedBlack, startCity)
      setResults(data)
      setLastFetched(new Date())
    } catch (err) {
      setError('Could not fetch market data. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const top = results ? rankFlips(
    activeTab === 'inter' ? results.interCity : results.intraCity,
    sortBy, 10
  ) : []

  const filteredTop = filterCat === 'All'
    ? top
    : top.filter(r => r.item.category === filterCat)

  return (
    <div className="space-y-6">

      {/* Settings panel */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-yellow-400 mb-1">💹 Market Flipper</h2>
        <p className="text-xs text-gray-400 mb-5">
          Analyse price differences across cities to find the best flip opportunities.
          Prices fetched live — results reflect current market conditions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Start city */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Your current city
            </label>
            <div className="flex flex-wrap gap-2">
              {cities.map(city => (
                <button key={city} onClick={() => setStartCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    startCity === city
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Zone toggle */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Zone safety
            </label>
            <button onClick={onToggleZones}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors w-full ${
                allowRedBlack
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-green-500/20 border-green-500/40 text-green-400'
              }`}>
              {allowRedBlack ? '⚔️ Red/Black zones included' : '🛡️ Safe zones only (Blue/Yellow)'}
            </button>
            {!allowRedBlack && (
              <p className="text-xs text-gray-600 mt-1">Caerleon excluded</p>
            )}
          </div>

          {/* Watchlist summary */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Watchlist ({watchlist.length} items)
            </label>
            <button onClick={() => setShowWatchlist(prev => !prev)}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors text-left flex items-center justify-between">
              <span>⚙️ Manage watchlist</span>
              <span className="text-gray-500">{showWatchlist ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Watchlist manager */}
        {showWatchlist && (
          <div className="mt-5 pt-5 border-t border-gray-700 space-y-4">

            {/* Search to add */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                Add items to watchlist
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search any item..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm"
                />
                {searching && <span className="absolute right-3 top-2.5 text-gray-400 text-sm animate-spin">⟳</span>}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {searchResults.map(item => (
                      <button key={item.UniqueName}
                        onClick={() => handleAddItem(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-700 transition-colors text-left border-b border-gray-700/50 last:border-0">
                        <img src={`${RENDER_URL}${item.UniqueName}.png`} alt=""
                          className="w-7 h-7 rounded object-contain flex-shrink-0"
                          onError={e => { e.target.style.display = 'none' }} />
                        <div>
                          <div className="text-gray-200 text-sm">{item.LocalizedNames?.['EN-US'] ?? item.UniqueName}</div>
                          <div className="text-gray-600 text-xs font-mono">{item.UniqueName}</div>
                        </div>
                        <span className="ml-auto text-green-400 text-xs">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category filter + item list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider">
                  Current watchlist
                </label>
                <button onClick={handleResetWatchlist}
                  className="text-xs text-gray-500 hover:text-gray-300 underline">
                  Reset to defaults
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 mb-3">
                {['All', ...ITEM_CATEGORIES, 'Custom'].map(cat => {
                  const count = cat === 'All'
                    ? watchlist.length
                    : watchlist.filter(i => i.category === cat).length
                  if (count === 0 && cat !== 'All') return null
                  return (
                    <button key={cat}
                      onClick={() => setFilterCat(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                        filterCat === cat
                          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Item chips */}
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {watchlist
                  .filter(i => filterCat === 'All' || i.category === filterCat)
                  .map(item => (
                    <div key={item.id}
                      className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1">
                      <img src={`${RENDER_URL}${item.id}.png`} alt=""
                        className="w-5 h-5 object-contain"
                        onError={e => { e.target.style.display = 'none' }} />
                      <span className="text-xs text-gray-300">{item.name}</span>
                      <button onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-600 hover:text-red-400 ml-1 leading-none font-bold">
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Analyse button */}
        <div className="flex items-center gap-4 mt-5 pt-5 border-t border-gray-700">
          <button onClick={handleAnalyse} disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
            {loading ? <><span className="animate-spin">⟳</span> Analysing {watchlist.length} items...</> : '💹 Find Flip Opportunities'}
          </button>
          {lastFetched && (
            <span className="text-xs text-gray-500">
              Last fetched: {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Items analysed',       value: watchlist.length,             color: 'text-gray-200' },
              { label: 'Inter-city opps',       value: results.interCity.length,     color: 'text-yellow-400' },
              { label: 'Intra-city opps',       value: results.intraCity.length,     color: 'text-blue-400' },
              { label: 'Best margin',
                value: results.interCity[0]
                  ? pct(Math.max(...results.interCity.map(r => r.margin)))
                  : '—',
                color: 'text-green-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Tab + sort controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[
                { id: 'inter', label: '🏙️ Inter-city',  count: results.interCity.length },
                { id: 'intra', label: '🏪 Intra-city',  count: results.intraCity.length },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    activeTab === tab.id
                      ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort by:</span>
              {[
                { id: 'margin',     label: '📊 Margin %' },
                { id: 'profit',     label: '💰 Profit' },
                { id: 'efficiency', label: '⚡ Efficiency' },
              ].map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    sortBy === s.id
                      ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intra-city estimate warning */}
          {activeTab === 'intra' && (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg px-4 py-3 text-xs text-amber-400">
              ⚠️ Intra-city buy order prices are <strong>estimated</strong> at 90% of the sell price.
              Check in-game buy orders for exact figures before committing.
            </div>
          )}

          {/* Top 10 table */}
          {filteredTop.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-3xl mb-2">📊</div>
              <p>No flip opportunities found with current settings.</p>
              <p className="text-xs mt-1 text-gray-600">
                Try enabling red/black zones or adjusting your watchlist.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-700 bg-gray-800/40">
                <h3 className="text-sm font-semibold text-yellow-400">
                  Top {filteredTop.length} {activeTab === 'inter' ? 'Inter-city' : 'Intra-city'} Opportunities
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800/20 text-xs text-gray-500">
                      <th className="text-left px-4 py-3 w-8">#</th>
                      <th className="text-left px-4 py-3">Item</th>
                      {activeTab === 'inter' ? (
                        <>
                          <th className="text-center px-4 py-3">Buy in</th>
                          <th className="text-center px-4 py-3">Sell in</th>
                        </>
                      ) : (
                        <th className="text-center px-4 py-3">City</th>
                      )}
                      <th className="text-right px-4 py-3 text-blue-400">Buy price</th>
                      <th className="text-right px-4 py-3 text-green-400">Sell price</th>
                      <th className="text-right px-4 py-3 text-yellow-400">Net profit</th>
                      <th className="text-right px-4 py-3">Margin</th>
                      <th className="text-right px-4 py-3 text-gray-400">Data age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredTop.map((row, idx) => (
                      <tr key={`${row.item.id}-${idx}`}
                        className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${
                            idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img src={`${RENDER_URL}${row.item.id}.png`} alt=""
                              className="w-8 h-8 rounded object-contain flex-shrink-0"
                              onError={e => { e.target.style.display = 'none' }} />
                            <div>
                              <div className="text-gray-200 font-medium text-xs">{row.item.name}</div>
                              <div className="text-gray-600 text-xs">{row.item.category}</div>
                            </div>
                          </div>
                        </td>
                        {activeTab === 'inter' ? (
                          <>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                row.buyCity === startCity
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
                                {row.buyCity === startCity ? '📍 ' : ''}{row.buyCity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs font-medium text-gray-300 bg-gray-700 px-2 py-0.5 rounded-full">
                                {row.sellCity}
                              </span>
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-gray-300">{row.city}</span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <span className="text-blue-400 font-mono">{silver(row.buyPrice)}</span>
                          {activeTab === 'intra' && row.estimated && (
                            <div className="text-gray-600 text-xs">estimated</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-green-400 font-mono">{silver(row.sellPrice)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-yellow-400 font-mono font-bold">{silver(row.profit)}</span>
                          <div className="text-gray-600 text-xs">after 4% fee</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MarginBar margin={row.margin} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {activeTab === 'inter'
                            ? <AgeTag hours={Math.max(row.buyAge, row.sellAge)} />
                            : <AgeTag hours={row.age} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-xs text-gray-600 text-center">
            Prices are snapshots — verify in-game before trading. Profit shown is after 4% market fee.
            Volume and buy order data not included — high margin doesn't guarantee quick sales.
          </div>
        </div>
      )}
    </div>
  )
}