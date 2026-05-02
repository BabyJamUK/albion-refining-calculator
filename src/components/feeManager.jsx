import { useState, useEffect } from 'react'
import { loadFees, getFeesByCity, formatLastUpdated, buildIssueUrl } from '../services/feeService'
import { MATERIAL_TYPES, ALL_CITIES } from '../data/materials'

const REGIONS = ['Europe', 'Americas', 'Asia']

const REGION_NOTE = {
  Europe:   '✅ Maintained by site owner — updated weekly',
  Americas: '⚠️ Community submitted — may be outdated',
  Asia:     '⚠️ Community submitted — may be outdated',
}

function fmt(n) { return (n ?? 0).toLocaleString() }

export default function FeeManager() {
  const [feesData,       setFeesData]       = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [activeRegion,   setActiveRegion]   = useState('Europe')
  const [showForm,       setShowForm]       = useState(false)
  const [form,           setForm]           = useState({
    region: 'Europe', city: ALL_CITIES[0], material: 'logs',
    stationName: '', fee: '', submittedBy: '',
  })

  useEffect(() => {
    loadFees().then(data => {
      setFeesData(data)
      setLoading(false)
    })
  }, [])

  const handleFormChange = (field, val) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const handleSubmit = () => {
    if (!form.fee || isNaN(Number(form.fee))) {
      alert('Please enter a valid fee amount')
      return
    }
    const url = buildIssueUrl({ ...form, fee: Number(form.fee) })
    window.open(url, '_blank')
  }

  if (loading) return (
    <div className="text-center py-16 text-gray-500 animate-pulse">
      Loading fee data...
    </div>
  )

  return (
    <div className="space-y-8">

      {/* ── Header + last updated ─────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-yellow-400 mb-1">
              🏭 Refining Station Fee Database
            </h2>
            <p className="text-xs text-gray-400 max-w-xl">
              Player-owned station fees for each city and material type.
              Europe fees are maintained by the site owner.
              Americas and Asia fees are community submitted.
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-right">
            <div className="text-xs text-gray-500 mb-0.5">Last updated</div>
            <div className="text-yellow-400 font-mono text-sm font-bold">
              {formatLastUpdated(feesData?.lastUpdated)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {feesData?.maintainedRegions?.map(r => (
                <span key={r} className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full mr-1">
                  {r} ✅
                </span>
              ))}
            </div>
          </div>
        </div>

        {feesData?.note && (
          <div className="mt-4 bg-amber-900/20 border border-amber-700/30 rounded-lg px-4 py-3 text-xs text-amber-400">
            ℹ️ {feesData.note}
          </div>
        )}
      </div>

      {/* ── Region tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-700">
        {REGIONS.map(region => (
          <button key={region} onClick={() => setActiveRegion(region)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeRegion === region
                ? 'bg-gray-900 border border-b-gray-900 border-gray-700 text-yellow-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}>
            {region === 'Europe' ? '🌍' : region === 'Americas' ? '🌎' : '🌏'} {region}
          </button>
        ))}
      </div>

      {/* ── Region note ───────────────────────────────────────────────── */}
      <div className={`text-xs px-4 py-2 rounded-lg border ${
        activeRegion === 'Europe'
          ? 'bg-green-900/20 border-green-700/30 text-green-400'
          : 'bg-amber-900/20 border-amber-700/30 text-amber-400'
      }`}>
        {REGION_NOTE[activeRegion]}
      </div>

      {/* ── Fee table ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/60">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Material</th>
                {ALL_CITIES.map(city => (
                  <th key={city} className="text-center px-4 py-3 text-gray-400 font-medium whitespace-nowrap">
                    {city}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {MATERIAL_TYPES.map(mat => {
                const feesByCity = getFeesByCity(feesData, activeRegion, mat.id)
                return (
                  <tr key={mat.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`font-medium ${mat.color} flex items-center gap-2`}>
                        {mat.emoji} {mat.label}
                      </span>
                      <span className="text-xs text-gray-500">Bonus: {mat.bonusCity}</span>
                    </td>
                    {ALL_CITIES.map(city => {
                      const entry = feesByCity[city]
                      return (
                        <td key={city} className="px-4 py-4 text-center">
                          {entry ? (
                            <div>
                              <div className="text-yellow-400 font-mono font-bold">
                                {fmt(entry.fee)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {entry.stationName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {entry.lastVerified}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">No data</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Submit suggestion ─────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-yellow-400">📝 Submit a Fee</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Suggestions are reviewed before going live. Opens a GitHub issue — a GitHub account is required.
            </p>
          </div>
          <button onClick={() => setShowForm(prev => !prev)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm transition-colors">
            {showForm ? 'Cancel' : '+ Add Fee'}
          </button>
        </div>

        {showForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Region */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Region</label>
                <select value={form.region} onChange={e => handleFormChange('region', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-yellow-500">
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {form.region !== 'Europe' && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠️ Only Europe fees are actively maintained by the site owner
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">City</label>
                <select value={form.city} onChange={e => handleFormChange('city', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-yellow-500">
                  {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Material */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Material</label>
                <select value={form.material} onChange={e => handleFormChange('material', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-yellow-500">
                  {MATERIAL_TYPES.map(m => (
                    <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </div>

              {/* Station name */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Station Name</label>
                <input type="text" placeholder="e.g. Bob's Sawmill"
                  value={form.stationName}
                  onChange={e => handleFormChange('stationName', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Fee */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                  Fee (silver per 100 nutrition)
                </label>
                <input type="number" min="0" max="9999" placeholder="e.g. 440"
                  value={form.fee}
                  onChange={e => handleFormChange('fee', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-yellow-400 font-mono font-bold placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Submitted by */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
                  Your In-Game Name (optional)
                </label>
                <input type="text" placeholder="Anonymous"
                  value={form.submittedBy}
                  onChange={e => handleFormChange('submittedBy', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button onClick={handleSubmit}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-6 py-2.5 rounded-lg transition-colors">
                🔗 Open GitHub Issue
              </button>
              <p className="text-xs text-gray-500">
                This will open GitHub in a new tab with your fee pre-filled. Submit the issue there to send it for review.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}