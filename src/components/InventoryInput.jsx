import { useState, useCallback } from 'react'
import {
MATERIAL_TYPES, TIERS, ALL_CITIES,
BASE_RETURN_RATE, CITY_RETURN_RATE,
runCascade, calcUsageFee
} from '../data/materials'
import { fetchPrices, buildItemIds, SERVERS, applyMarketFees, TOTAL_MARKET_FEE } from '../services/marketApi'
import OptimiserTab from './OptimiserTab'


// ─── Helpers ──────────────────────────────────────────────────────────────────
const EMPTY_INVENTORY = () =>
Object.fromEntries(MATERIAL_TYPES.map(m => [m.id, Object.fromEntries(TIERS.map(t => [t, '']))]))

const EMPTY_ALLOCATION = () =>
Object.fromEntries(MATERIAL_TYPES.map(m => [m.id, Object.fromEntries(TIERS.map(t => [t, 0]))]))

function fmt(n)    { return (n ?? 0).toLocaleString() }
function silver(n) { return n == null ? '—' : `${n.toLocaleString()} ` }

function PriceCell({ price }) {
if (!price) return <span className="text-gray-600">—</span>
return <span className="font-mono">{fmt(price)}</span>
}

function Tag({ children, color = 'yellow' }) {
const colours = {
yellow: 'bg-yellow-500/20 text-yellow-400',
green:  'bg-green-500/20  text-green-400',
blue:   'bg-blue-500/20   text-blue-400',
amber:  'bg-amber-500/20  text-amber-400',
red:    'bg-red-500/20    text-red-400',
}
return (
<span className={`${colours[color]} text-xs font-bold px-2 py-0.5 rounded-full`}>
{children}
</span>
)
}

function BestCityBadge({ city }) {
return (
<span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full border border-green-500/30">
🏆 {city}
</span>
)
}

// ─── Profit for one tier row across all cities ────────────────────────────────
function calcTierProfit(tierRow, prices) {
if (!prices) return []
const { rawApiId, refinedApiId, lowerRefinedApiId, raw, sellableRefined, lowerRefinedUsed } = tierRow

return ALL_CITIES.map(city => {
const rawPrice          = prices[rawApiId]?.[city]          ?? 0
const refinedPrice      = prices[refinedApiId]?.[city]      ?? 0
const lowerRefinedPrice = lowerRefinedApiId ? (prices[lowerRefinedApiId]?.[city] ?? 0) : 0

const rawValue     = rawPrice * raw
const lowerCost    = lowerRefinedPrice * lowerRefinedUsed
const refinedValue = refinedPrice * sellableRefined - lowerCost

return { city, rawPrice, refinedPrice, rawValue, lowerCost, refinedValue }

}).filter(r => r.rawPrice > 0 || r.refinedPrice > 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function InventoryInput() {
// ── State ────────────────────────────────────────────────────────────────────
const [inventory,    setInventory]    = useState(EMPTY_INVENTORY())
const [allocation,   setAllocation]   = useState(EMPTY_ALLOCATION())
const [cascadeBase,  setCascadeBase]  = useState(null)
const [cascadeBonus, setCascadeBonus] = useState(null)
const [prices,       setPrices]       = useState(null)
const [loading,      setLoading]      = useState(false)
const [priceError,   setPriceError]   = useState(null)
const [activeTab,    setActiveTab]    = useState('cascade')
const [calculated,   setCalculated]   = useState(false)
const [usageFee,     setUsageFee]     = useState(0)

const [server, setServer] = useState('europe')
const [includeMarketFee, setIncludeMarketFee] = useState(true)

// ── Input handlers ────────────────────────────────────────────────────────────
const handleInventoryChange = (matId, tier, val) =>
setInventory(prev => ({ ...prev, [matId]: { ...prev[matId], [tier]: val } }))

const handleAllocationChange = useCallback((matId, tier, val) => {
setAllocation(prev => {
const next = { ...prev, [matId]: { ...prev[matId], [tier]: Number(val) } }
if (calculated) rerunCascades(inventory, next)
return next
})
}, [calculated, inventory])

// ── Cascade runner ────────────────────────────────────────────────────────────
function rerunCascades(inv, alloc) {
  const rawInv = mat => Object.fromEntries(TIERS.map(t => [t, parseInt(inv[mat.id]?.[t]) || 0]))
  const base  = MATERIAL_TYPES.map(mat => ({ ...mat, tiers: runCascade(mat, rawInv(mat), alloc[mat.id], BASE_RETURN_RATE,  usageFee, includeMarketFee) })).filter(m => m.tiers.length)
  const bonus = MATERIAL_TYPES.map(mat => ({ ...mat, tiers: runCascade(mat, rawInv(mat), alloc[mat.id], CITY_RETURN_RATE, usageFee, includeMarketFee) })).filter(m => m.tiers.length)
  setCascadeBase(base)
  setCascadeBonus(bonus)
  return { base, bonus }
}

// ── Main calculate + fetch ────────────────────────────────────────────────────
const handleCalculate = async () => {
  console.log('1. Calculate Clicked')
  console.log(JSON.stringify(inventory))
const { base } = rerunCascades(inventory, allocation)
console.log('2. cascade complete')
setCalculated(true)
setLoading(true)
setPriceError(null)


try {
  const activeMats = MATERIAL_TYPES.filter(m => base.find(r => r.id === m.id))
  const ids = buildItemIds(activeMats, TIERS)
  console.log('Fine here:')
  console.log('Server: ', server)
  setPrices(await fetchPrices(ids, server))  
} catch(e) {
  console.log('Price Failed: ', e)
  setPriceError('Could not load market prices — Albion Data Project may be temporarily unavailable.')
} finally {
  setLoading(false)
}

}

const handleReset = () => {
setInventory(EMPTY_INVENTORY())
setAllocation(EMPTY_ALLOCATION())
setCascadeBase(null)
setCascadeBonus(null)
setPrices(null)
setCalculated(false)
setActiveTab('cascade')
setPriceError(null)
}

const activeMats = cascadeBase ?? []

return (
<div className="space-y-8">

 {/* ── Settings Panel ──────────────────────────────────────────────── */}
<div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
  <h2 className="text-lg font-semibold text-yellow-400 mb-1">⚙️ Settings</h2>
  <p className="text-xs text-gray-400 mb-5">Configure server, fees and taxes before calculating</p>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    {/* Server selector */}
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
        Game Server
      </label>
      <div className="flex flex-col gap-2">
        {Object.entries(SERVERS).map(([key, srv]) => (
          <button
            key={key}
            onClick={() => setServer(key)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors border ${
              server === key
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {srv.label}
          </button>
        ))}
      </div>
    </div>

    {/* Usage fee */}
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
        Refining Station Usage Fee
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Silver per 100 nutrition shown on the station. T2 is always free.
      </p>
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5">
        <input
          type="number"
          min="0"
          max="9999"
          placeholder="e.g. 440"
          value={usageFee || ''}
          onChange={e => setUsageFee(Number(e.target.value) || 0)}
          className="flex-1 bg-transparent text-yellow-400 font-mono font-bold text-lg focus:outline-none"
        />
        <span className="text-gray-500 text-sm">/ 100 nutrition</span>
      </div>
      {usageFee > 0 && (
        <div className="mt-2 space-y-1">
          {[3,4,5,6,7,8].map(tier => (
            <div key={tier} className="flex justify-between text-xs">
              <span className="text-gray-500">T{tier}</span>
              <span className="text-amber-400 font-mono">
                {calcUsageFee(usageFee, tier).toFixed(2)} silver/item
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Market listing fee */}
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
        Market Listing Fee
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Albion charges 1% to list + 3% on sale = 4% total deducted from sale proceeds.
      </p>
      <button
        onClick={() => setIncludeMarketFee(prev => !prev)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
          includeMarketFee
            ? 'bg-green-500/20 border-green-500/40 text-green-400'
            : 'bg-gray-800 border-gray-600 text-gray-400'
        }`}
      >
        <span className="text-sm font-medium">
          {includeMarketFee ? '✅ Included (4% deducted)' : '⬜ Not included'}
        </span>
        <span className="text-xs font-mono">
          {includeMarketFee ? `-${(TOTAL_MARKET_FEE * 100).toFixed(0)}%` : '±0%'}
        </span>
      </button>

      {includeMarketFee && (
        <div className="mt-3 bg-gray-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between text-gray-400">
            <span>Listing fee</span>
            <span className="text-red-400 font-mono">−1% upfront</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Sales tax</span>
            <span className="text-red-400 font-mono">−3% on sale</span>
          </div>
          <div className="flex justify-between text-gray-300 border-t border-gray-700 pt-1 mt-1 font-semibold">
            <span>Net received</span>
            <span className="text-yellow-400 font-mono">96% of price</span>
          </div>
        </div>
      )}
    </div>
  </div>
</div>

  {/* ── Inventory Input ──────────────────────────────────────────────────── */}
  <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
    <h2 className="text-lg font-semibold text-yellow-400 mb-1">📦 Raw Material Inventory</h2>
    <p className="text-xs text-gray-400 mb-6">Enter quantities for each material and tier</p>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 pr-4 text-gray-400 font-medium w-44">Material</th>
            {TIERS.map(t => (
              <th key={t} className="text-center py-2 px-2 text-gray-400 font-medium min-w-[110px]">
                <span className="bg-gray-800 px-2 py-1 rounded text-yellow-500 font-bold">T{t}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {MATERIAL_TYPES.map(mat => (
            <tr key={mat.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="py-3 pr-4">
                <span className={`font-medium ${mat.color} flex items-center gap-2`}>
                  {mat.emoji} {mat.label}
                </span>
                <span className="text-xs text-gray-500">Bonus: {mat.bonusCity}</span>
              </td>
              {TIERS.map(tier => (
                <td key={tier} className="py-3 px-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 text-center truncate">
                      {mat.tierNames.raw[tier]}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={inventory[mat.id][tier]}
                      onChange={e => handleInventoryChange(mat.id, tier, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-center text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-colors"
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="flex gap-3 mt-6">
      <button onClick={handleCalculate}
        className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-6 py-2.5 rounded-lg transition-colors">
        ⚗️ Calculate + Fetch Prices
      </button>
      <button onClick={handleReset}
        className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2.5 rounded-lg transition-colors">
        Reset
      </button>
    </div>
  </div>

  {/* ── Results ─────────────────────────────────────────────────────────── */}
  {calculated && activeMats.length > 0 && (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {[
          { id: 'cascade',  label: '⛓️ Cascade Planner' },
          { id: 'profit',   label: '💰 Profit Breakdown' },
          { id: 'optimise', label: '🧠 Optimiser' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-900 border border-b-gray-900 border-gray-700 text-yellow-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Cascade Planner ─────────────────────────────────────────────── */}
      {activeTab === 'cascade' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-gray-300">Base <span className="text-blue-400 font-bold">15.2%</span> return</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-gray-300">City bonus <span className="text-green-400 font-bold">43.5%</span> return</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-gray-300">Slider sends refined <strong>up</strong> to next tier</span>
            </div>
          </div>

          {activeMats.map(mat => {
            const bonusMat = cascadeBonus?.find(m => m.id === mat.id)
            return (
              <div key={mat.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/60 flex items-center justify-between">
                  <h3 className={`font-bold ${mat.color} flex items-center gap-2`}>
                    {mat.emoji} {mat.label}
                  </h3>
                  <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                    🏙️ Bonus city: <strong>{mat.bonusCity}</strong>
                  </span>
                </div>

                <div className="divide-y divide-gray-800">
                  {mat.tiers.map((row, idx) => {
                    const bonusRow  = bonusMat?.tiers[idx]
                    const hasNext   = row.tier < 8 && mat.tiers.some(r => r.tier === row.tier + 1)
                    const maxSendUp = row.refinedOutput

                    return (
                      <div key={row.tier} className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <Tag color="yellow">T{row.tier}</Tag>
                          <span className="text-sm text-gray-300 font-medium">{row.rawName}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-sm text-gray-300">{row.refinedName}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-gray-800/60 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Raw input</div>
                            <div className="text-gray-200 font-mono font-bold">{fmt(row.raw)}</div>
                            <div className="text-xs text-gray-500">{row.rawName}</div>
                          </div>
                          <div className="bg-gray-800/60 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">Ingredient used</div>
                            {row.lowerRefinedName ? (
                              <>
                                <div className="text-amber-400 font-mono font-bold">{fmt(row.lowerRefinedUsed)}</div>
                                <div className="text-xs text-gray-500">{row.lowerRefinedName}</div>
                              </>
                            ) : (
                              <div className="text-xs text-gray-600">None (T2/T3)</div>
                            )}
                          </div>
                          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                            <div className="text-xs text-blue-400 mb-1">Base output</div>
                            <div className="text-blue-300 font-mono font-bold">{fmt(row.refinedOutput)}</div>
                            <div className="text-xs text-gray-500">{row.refinedName}</div>
                          </div>
                          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                            <div className="text-xs text-green-400 mb-1">City bonus output</div>
                            <div className="text-green-300 font-mono font-bold">{fmt(bonusRow?.refinedOutput)}</div>
                            <div className="text-xs text-gray-500">{row.refinedName}</div>
                          </div>
                        </div>

                        {hasNext && maxSendUp > 0 && (
                          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-amber-400 font-medium">
                                ⬆️ Send to T{row.tier + 1} refining as ingredient
                              </span>
                              <span className="text-xs text-gray-400">
                                Max: <span className="text-amber-400 font-bold">{fmt(maxSendUp)}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <input
                                type="range" min="0" max={maxSendUp}
                                value={allocation[mat.id][row.tier]}
                                onChange={e => handleAllocationChange(mat.id, row.tier, e.target.value)}
                                className="flex-1 accent-amber-500 cursor-pointer"
                              />
                              <input
                                type="number" min="0" max={maxSendUp}
                                value={allocation[mat.id][row.tier]}
                                onChange={e => handleAllocationChange(mat.id, row.tier, Math.min(Number(e.target.value), maxSendUp))}
                                className="w-24 bg-gray-800 border border-amber-600/50 rounded px-2 py-1 text-center text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div className="flex gap-4 mt-3 text-xs">
                              <span className="text-gray-400">
                                Sellable (base): <span className="text-blue-400 font-bold">{fmt(row.sellableRefined)}</span>
                              </span>
                              <span className="text-gray-400">
                                Sellable (bonus): <span className="text-green-400 font-bold">{fmt(bonusRow?.sellableRefined)}</span>
                              </span>
                              <span className="text-gray-400">
                                Sent up: <span className="text-amber-400 font-bold">{fmt(allocation[mat.id][row.tier])}</span>
                              </span>
                            </div>
                          </div>
                        )}

                        {!hasNext && (
                          <div className="bg-gray-800/40 rounded-lg px-4 py-3 text-xs text-gray-400 flex gap-6">
                            <span>Sellable (base): <span className="text-blue-400 font-bold">{fmt(row.sellableRefined)}</span></span>
                            <span>Sellable (bonus): <span className="text-green-400 font-bold">{fmt(bonusRow?.sellableRefined)}</span></span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Profit Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          {loading && (
            <div className="text-center py-8 text-yellow-400 animate-pulse">
              📡 Fetching live prices from Albion Data Project...
            </div>
          )}
          {priceError && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
              ⚠️ {priceError}
            </div>
          )}

          {prices && !loading && activeMats.map(mat => {
            const bonusMat = cascadeBonus?.find(m => m.id === mat.id)
            return (
              <div key={mat.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/60 flex items-center justify-between">
                  <h3 className={`font-bold ${mat.color} flex items-center gap-2`}>
                    {mat.emoji} {mat.label}
                  </h3>
                  <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                    🏙️ Bonus city: <strong>{mat.bonusCity}</strong>
                  </span>
                </div>

                {mat.tiers.map((row, idx) => {
                  const bonusRow   = bonusMat?.tiers[idx]
                  const baseProfit = calcTierProfit(row, prices)
                  const bonusProfit= calcTierProfit(bonusRow ?? row, prices)

                  if (!baseProfit.length && !bonusProfit.length) return (
                    <div key={row.tier} className="px-6 py-3 text-gray-600 text-sm border-b border-gray-800">
                      T{row.tier} — No market data
                    </div>
                  )

                  const bestRawCity   = baseProfit.reduce((b, r)  => r.rawValue     > (b?.rawValue     ?? 0) ? r : b, null)
                  const bestBonusCity = bonusProfit.reduce((b, r) => r.refinedValue > (b?.refinedValue ?? 0) ? r : b, null)
                  const topValue      = Math.max(bestRawCity?.rawValue ?? 0, bestBonusCity?.refinedValue ?? 0)
                  const verdict       = (bestBonusCity?.refinedValue ?? 0) >= (bestRawCity?.rawValue ?? 0)
                    ? { label: '✅ Refine (bonus city)', color: 'green' }
                    : { label: '📦 Sell raw', color: 'blue' }

                  return (
                    <div key={row.tier} className="border-b border-gray-800 last:border-0">
                      <div className="px-6 py-3 bg-gray-800/30 flex flex-wrap items-center gap-3">
                        <Tag color="yellow">T{row.tier}</Tag>
                        <span className="text-gray-300 text-sm">{row.rawName} → {row.refinedName}</span>
                        {row.lowerRefinedName && (
                          <span className="text-amber-400 text-xs">
                            needs {fmt(row.lowerRefinedUsed)}× {row.lowerRefinedName}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          Selling: <span className="text-blue-400 font-bold">{fmt(row.sellableRefined)}</span> base /
                          <span className="text-green-400 font-bold ml-1">{fmt(bonusRow?.sellableRefined)}</span> bonus
                        </span>
                      </div>

                      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gray-800/40 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Best raw sell</div>
                          {bestRawCity ? (
                            <>
                              <BestCityBadge city={bestRawCity.city} />
                              <div className="text-gray-200 font-mono font-bold mt-1">{silver(bestRawCity.rawValue)}</div>
                            </>
                          ) : <span className="text-gray-600 text-xs">No data</span>}
                        </div>
                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                          <div className="text-xs text-green-400 mb-1">Best refined (city bonus)</div>
                          {bestBonusCity ? (
                            <>
                              <BestCityBadge city={bestBonusCity.city} />
                              <div className="text-green-300 font-mono font-bold mt-1">{silver(bestBonusCity.refinedValue)}</div>
                            </>
                          ) : <span className="text-gray-600 text-xs">No data</span>}
                        </div>
                        <div className={`rounded-lg p-3 ${verdict.color === 'green' ? 'bg-green-500/10 border border-green-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                          <div className="text-xs text-gray-400 mb-1">Recommendation</div>
                          <div className={`font-bold text-sm ${verdict.color === 'green' ? 'text-green-400' : 'text-blue-400'}`}>
                            {verdict.label}
                          </div>
                          {topValue > 0 && <div className="font-mono text-xs mt-1 text-gray-300">{silver(topValue)}</div>}
                        </div>
                      </div>

                      <div className="overflow-x-auto border-t border-gray-800/60">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-500 bg-gray-800/20">
                              <th className="text-left px-6 py-2">City</th>
                              <th className="text-right px-4 py-2">Raw/unit</th>
                              <th className="text-right px-4 py-2">Raw total</th>
                              <th className="text-right px-4 py-2">Refined/unit</th>
                              <th className="text-right px-4 py-2 text-blue-400">Refined (base)</th>
                              <th className="text-right px-4 py-2 text-green-400">Refined (bonus)</th>
                              <th className="text-right px-6 py-2 text-yellow-400">Best</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/40">
                            {ALL_CITIES.map(city => {
                              const b  = baseProfit.find(r => r.city === city)
                              const bn = bonusProfit.find(r => r.city === city)
                              if (!b && !bn) return null
                              const action = (bn?.refinedValue ?? 0) >= (b?.rawValue ?? 0) ? 'Refine' : 'Raw'
                              return (
                                <tr key={city} className="hover:bg-gray-800/30 transition-colors">
                                  <td className="px-6 py-2.5 text-gray-300 font-medium">{city}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-400 font-mono"><PriceCell price={b?.rawPrice} /></td>
                                  <td className="px-4 py-2.5 text-right text-gray-300 font-mono"><PriceCell price={b?.rawValue} /></td>
                                  <td className="px-4 py-2.5 text-right text-gray-400 font-mono"><PriceCell price={b?.refinedPrice} /></td>
                                  <td className="px-4 py-2.5 text-right text-blue-400 font-mono"><PriceCell price={b?.refinedValue} /></td>
                                  <td className="px-4 py-2.5 text-right text-green-400 font-mono"><PriceCell price={bn?.refinedValue} /></td>
                                  <td className="px-6 py-2.5 text-right">
                                    <Tag color={action === 'Refine' ? 'green' : 'blue'}>{action}</Tag>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Optimiser Tab ────────────────────────────────────────────────── */}
      {activeTab === 'optimise' && (
        <OptimiserTab
  cascadeBase={cascadeBase}
  prices={prices}
  inventory={inventory}
  usageFee={usageFee}
  includeMarketFee={includeMarketFee}
/>
      )}
    </div>
  )}
</div>
)
}