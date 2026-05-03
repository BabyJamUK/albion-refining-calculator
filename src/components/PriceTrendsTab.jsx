import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { MATERIAL_TYPES, TIERS, ALL_CITIES } from '../data/materials'
import { fetchPriceHistory } from '../services/marketApi'

const CITY_COLORS = {
  'Lymhurst':     '#4ade80',
  'Thetford':     '#f87171',
  'Martlock':     '#60a5fa',
  'Bridgewatch':  '#fb923c',
  'Fort Sterling':'#e2e8f0',
  'Caerleon':     '#c084fc',
  'Brecilien':    '#34d399',
}

function fmt(n) { return (n ?? 0).toLocaleString() }

export default function PriceTrendsTab({ inventory }) {
  const [history,       setHistory]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [selectedMat,   setSelectedMat]   = useState(null)
  const [selectedTier,  setSelectedTier]  = useState(null)
  const [showRaw,       setShowRaw]       = useState(true)
  const [showRefined,   setShowRefined]   = useState(true)
  const [selectedCities,setSelectedCities]= useState(
    Object.fromEntries(ALL_CITIES.map(c => [c, true]))
  )

  // Work out which materials/tiers were actually entered
  const activeMats = MATERIAL_TYPES.map(mat => {
    const tiers = TIERS.filter(t => parseInt(inventory[mat.id]?.[t]) > 0)
    return { ...mat, activeTiers: tiers }
  }).filter(m => m.activeTiers.length > 0)

  // Set default selection
  useEffect(() => {
    if (activeMats.length > 0 && !selectedMat) {
      setSelectedMat(activeMats[0].id)
      setSelectedTier(activeMats[0].activeTiers[0])
    }
  }, [activeMats.length])

  // Fetch history when selection changes
  useEffect(() => {
    if (!selectedMat || !selectedTier) return
    const mat = MATERIAL_TYPES.find(m => m.id === selectedMat)
    if (!mat) return

    const ids = [
      mat.apiRawId(selectedTier),
      mat.apiRefinedId(selectedTier),
    ]

    setLoading(true)
    setError(null)

    fetchPriceHistory(ids, 7)
      .then(setHistory)
      .catch(() => setError('Could not load price history — try again shortly.'))
      .finally(() => setLoading(false))
  }, [selectedMat, selectedTier])

  const mat = MATERIAL_TYPES.find(m => m.id === selectedMat)

  // Build chart data — merge raw + refined by date
  function buildChartData(type) {
    if (!history || !mat) return []
    const apiId = type === 'raw'
      ? mat.apiRawId(selectedTier)
      : mat.apiRefinedId(selectedTier)

    const cityData = history[apiId]
    if (!cityData) return []

    // Collect all dates
    const dateSet = new Set()
    for (const city of ALL_CITIES) {
      if (!selectedCities[city]) continue
      cityData[city]?.forEach(d => dateSet.add(d.date))
    }

    const dates = [...dateSet].sort((a, b) =>
      new Date(a.split(' ').reverse().join(' ')) - new Date(b.split(' ').reverse().join(' '))
    )

    return dates.map(date => {
      const point = { date }
      for (const city of ALL_CITIES) {
        if (!selectedCities[city]) continue
        const entry = cityData[city]?.find(d => d.date === date)
        if (entry) point[city] = entry.price
      }
      return point
    })
  }

  if (activeMats.length === 0) return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">📈</div>
      <p>No materials entered yet.</p>
      <p className="text-sm mt-1">Enter quantities above and hit Calculate first.</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Selectors ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-yellow-400 mb-4">📈 7-Day Price History</h3>

        <div className="flex flex-wrap gap-4 mb-4">
          {/* Material selector */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Material</label>
            <div className="flex flex-wrap gap-2">
              {activeMats.map(m => (
                <button key={m.id} onClick={() => {
                  setSelectedMat(m.id)
                  setSelectedTier(m.activeTiers[0])
                  setHistory(null)
                }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    selectedMat === m.id
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier selector */}
          {selectedMat && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Tier</label>
              <div className="flex gap-2">
                {activeMats.find(m => m.id === selectedMat)?.activeTiers.map(tier => (
                  <button key={tier} onClick={() => {
                    setSelectedTier(tier)
                    setHistory(null)
                  }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
                      selectedTier === tier
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}>
                    T{tier}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Type toggles */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setShowRaw(p => !p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showRaw
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}>
            {showRaw ? '✅' : '⬜'} Raw prices
          </button>
          <button onClick={() => setShowRefined(p => !p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showRefined
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}>
            {showRefined ? '✅' : '⬜'} Refined prices
          </button>
        </div>

        {/* City toggles */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Cities</label>
          <div className="flex flex-wrap gap-2">
            {ALL_CITIES.map(city => (
              <button key={city}
                onClick={() => setSelectedCities(prev => ({ ...prev, [city]: !prev[city] }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedCities[city]
                    ? 'bg-gray-800 border-gray-600 text-gray-200'
                    : 'bg-gray-900 border-gray-800 text-gray-600'
                }`}
                style={{ borderColor: selectedCities[city] ? CITY_COLORS[city] : undefined }}>
                <span style={{ color: CITY_COLORS[city] }}>●</span> {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-12 text-yellow-400 animate-pulse">
          📡 Loading price history...
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {history && !loading && mat && (
        <div className="space-y-6">
          {[
            { type: 'raw',     label: `Raw — ${mat.tierNames.raw[selectedTier]}`,     show: showRaw     },
            { type: 'refined', label: `Refined — ${mat.tierNames.refined[selectedTier]}`, show: showRefined },
          ].filter(c => c.show).map(({ type, label }) => {
            const data = buildChartData(type)

            if (!data.length) return (
              <div key={type} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">{label}</h4>
                <p className="text-gray-600 text-sm">No historical data available for this item.</p>
              </div>
            )

            return (
              <div key={type} className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-6">{label}</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#f3f4f6', marginBottom: 4 }}
                      formatter={(value, name) => [fmt(value) + ' ', name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                    />
                    {ALL_CITIES.filter(c => selectedCities[c]).map(city => (
                      <Line
                        key={city}
                        type="monotone"
                        dataKey={city}
                        stroke={CITY_COLORS[city]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CITY_COLORS[city] }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Min/max summary */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ALL_CITIES.filter(c => selectedCities[c]).map(city => {
                    const cityPoints = data.map(d => d[city]).filter(Boolean)
                    if (!cityPoints.length) return null
                    const min = Math.min(...cityPoints)
                    const max = Math.max(...cityPoints)
                    const latest = cityPoints[cityPoints.length - 1]
                    const trend = cityPoints.length > 1
                      ? latest > cityPoints[0] ? '📈' : latest < cityPoints[0] ? '📉' : '➡️'
                      : '➡️'
                    return (
                      <div key={city} className="bg-gray-800/60 rounded-lg p-3 text-xs"
                        style={{ borderLeft: `3px solid ${CITY_COLORS[city]}` }}>
                        <div className="font-medium text-gray-300 mb-1">{city} {trend}</div>
                        <div className="text-gray-400">Latest: <span className="text-gray-200 font-mono">{fmt(latest)}</span></div>
                        <div className="text-gray-500">Low: <span className="font-mono">{fmt(min)}</span></div>
                        <div className="text-gray-500">High: <span className="font-mono">{fmt(max)}</span></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
