import { useState, useMemo } from 'react'
import { CITIES, ZONE_TYPES, scoreRoute, permutations } from '../data/cityGraph'
import { MATERIAL_TYPES } from '../data/materials'

function ZoneBadge({ zoneType }) {
  const zone = ZONE_TYPES[zoneType]
  if (!zone) return null
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${zone.bg} ${zone.color} ${zone.border}`}>
      {zone.label}
    </span>
  )
}

function DangerBar({ score, max = 30 }) {
  const pct     = Math.min(100, (score / max) * 100)
  const color   = score === 0 ? 'bg-blue-500' : score < 5 ? 'bg-yellow-500' : score < 15 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6">{score}</span>
    </div>
  )
}

export default function RoutePlannerTab({ cascadeBase, cascadeBonus, prices, optimisedData, allowRedBlack }) {
  const [startCity,    setStartCity]    = useState('Lymhurst')
  const [sortMode,     setSortMode]     = useState('safest')  // fastest | safest | efficient

  const allowedZones = allowRedBlack
    ? ['BLUE', 'YELLOW', 'RED', 'BLACK']
    : ['BLUE', 'YELLOW']

  const availableCities = Object.values(CITIES).filter(c =>
    allowRedBlack ? true : c.safeToReach
  )

  // Build waypoints from optimiser results
  // Each material needs: refine city + best sell city
  const waypoints = useMemo(() => {
    if (!optimisedData || !prices) return []

    const points = []

    for (const { mat, base, bonus } of optimisedData) {
      const result = (bonus?.totalSilver ?? 0) >= (base?.totalSilver ?? 0) ? bonus : base
      if (!result) continue

      const hasRefining = result.breakdown.some(r => r.rawToRefine > 0)
      const hasRaw      = result.breakdown.some(r => r.rawToSell > 0)

      // Refine city — use the material's bonus city if refining is profitable
      if (hasRefining) {
        const refineCity = mat.bonusCity
        if (refineCity && (allowRedBlack || CITIES[refineCity]?.safeToReach)) {
          points.push({
            city:    refineCity,
            action:  'refine',
            label:   `Refine ${mat.label}`,
            material: mat,
            silver:  0,
            color:   mat.color,
            emoji:   mat.emoji,
          })
        }
      }

      // Best sell city — find highest price city for refined output
      let bestSellCity = null
      let bestPrice    = 0

      for (const row of result.breakdown) {
        if (!row.refinedApiId || !prices[row.refinedApiId]) continue
        for (const [city, data] of Object.entries(prices[row.refinedApiId])) {
          if (!allowRedBlack && !CITIES[city]?.safeToReach) continue
          const p = data?.price ?? 0
          if (p > bestPrice) {
            bestPrice    = p
            bestSellCity = city
          }
        }
      }

      if (bestSellCity && bestSellCity !== mat.bonusCity) {
        points.push({
          city:    bestSellCity,
          action:  'sell',
          label:   `Sell ${mat.label} refined`,
          material: mat,
          silver:  result.totalSilver,
          color:   mat.color,
          emoji:   mat.emoji,
        })
      }
    }

    // Deduplicate — merge actions at same city
    const merged = {}
    for (const p of points) {
      if (!merged[p.city]) merged[p.city] = { city: p.city, actions: [] }
      merged[p.city].actions.push(p)
    }

    return Object.values(merged)
  }, [optimisedData, prices, allowRedBlack])

  // Find best route ordering
  const routes = useMemo(() => {
    if (!waypoints.length) return []

    const waypointCities = waypoints.map(w => ({ city: w.city, actions: w.actions }))

    // Try all permutations of waypoint ordering
    const perms = permutations(waypointCities)
    const scored = []

    for (const perm of perms) {
      const stops  = [{ city: startCity, actions: [] }, ...perm]
      const result = scoreRoute(stops, allowedZones)
      if (!result) continue  // not reachable with zone restrictions

      const totalSilver = waypoints.reduce((sum, w) =>
        sum + w.actions.reduce((s, a) => s + (a.silver ?? 0), 0), 0)

      scored.push({
        stops,
        ...result,
        efficiency: result.totalDanger > 0
          ? Math.round(totalSilver / result.totalDanger)
          : totalSilver,
        totalSilver,
      })
    }

    // Sort all three ways and return top 1 of each
    const fastest    = [...scored].sort((a, b) => a.totalCrossings - b.totalCrossings)[0]
    const safest     = [...scored].sort((a, b) => a.totalDanger    - b.totalDanger)[0]
    const efficient  = [...scored].sort((a, b) => b.efficiency     - a.efficiency)[0]

    return { fastest, safest, efficient }
  }, [waypoints, startCity, allowRedBlack])

  // ── Render helpers ────────────────────────────────────────────────────────────

  function RouteCard({ route, label, icon, active, onClick }) {
    if (!route) return null
    return (
      <button onClick={onClick}
        className={`w-full text-left rounded-xl border p-4 transition-colors ${
          active
            ? 'bg-yellow-500/10 border-yellow-500/40'
            : 'bg-gray-800/40 border-gray-700 hover:border-gray-500'
        }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${active ? 'text-yellow-400' : 'text-gray-300'}`}>
            {icon} {label}
          </span>
          {active && <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">Selected</span>}
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>🗺️ {route.totalCrossings} zones</span>
          <span>⚔️ Danger: {route.totalDanger}</span>
          <span>🏙️ {route.stops.length - 1} stops</span>
        </div>
        <DangerBar score={route.totalDanger} />
      </button>
    )
  }

  function RouteDetails({ route }) {
    if (!route) return null
    return (
      <div className="space-y-3">
        {route.stops.map((stop, idx) => {
          const city    = CITIES[stop.city]
          const leg     = route.legs?.[idx]
          const isLast  = idx === route.stops.length - 1

          return (
            <div key={`${stop.city}-${idx}`}>
              {/* City stop */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm
                    ${idx === 0 ? 'border-yellow-500 bg-yellow-500/20' : 'border-gray-600 bg-gray-800'}`}>
                    {idx === 0 ? '📍' : city?.emoji ?? '🏙️'}
                  </div>
                  {!isLast && <div className="w-0.5 h-full min-h-8 bg-gray-700 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-200 font-medium">{stop.city}</span>
                    {idx === 0 && <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">Start</span>}
                    {isLast && stop.city !== route.stops[0].city && (
                      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">End</span>
                    )}
                  </div>
                  {stop.actions?.length > 0 && (
                    <div className="space-y-1">
                      {stop.actions.map((action, ai) => (
                        <div key={ai} className={`text-xs flex items-center gap-2 ${action.color}`}>
                          <span>{action.emoji}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                            action.action === 'refine'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {action.action === 'refine' ? '⚗️ Refine' : '💰 Sell'}
                          </span>
                          <span className="text-gray-300">{action.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Travel leg to next stop */}
              {leg && (
                <div className="ml-4 mb-2 pl-7 border-l-2 border-gray-700">
                  <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>Travel: {leg.from} → {leg.to}</span>
                      <span className="text-gray-600">·</span>
                      <span>{leg.crossings} zone{leg.crossings !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {leg.path.map((edge, ei) => (
                        <ZoneBadge key={ei} zoneType={edge.zoneType} />
                      ))}
                    </div>
                    {leg.path[0]?.note && (
                      <div className="text-gray-600">{leg.path[0].note}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Guard states ──────────────────────────────────────────────────────────────

  if (!optimisedData || optimisedData.length === 0) return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">🗺️</div>
      <p>No optimiser data yet.</p>
      <p className="text-sm mt-1">
        Run the <span className="text-yellow-400 font-bold">🧠 Optimiser</span> tab first, then come back here.
      </p>
    </div>
  )

  if (!waypoints.length) return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">🗺️</div>
      <p>No route waypoints could be determined.</p>
      <p className="text-sm mt-1 text-gray-600">
        This may be because all optimal actions are in the same city, or no price data is available.
      </p>
    </div>
  )

  const selectedRoute = routes[sortMode]

  return (
    <div className="space-y-6">

      {/* Zone safety warning if red/black allowed */}
      {allowRedBlack && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-xs text-red-400 flex items-center gap-2">
          ⚔️ <strong>Red/Black zones enabled</strong> — routes may pass through full-loot PvP zones.
          Death means losing all carried resources. Travel carefully.
        </div>
      )}

      {/* Settings row */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-yellow-400 mb-4">🗺️ Route Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Start city */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Your current city
            </label>
            <div className="flex flex-wrap gap-2">
              {availableCities.map(city => (
                <button key={city.id} onClick={() => setStartCity(city.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    startCity === city.id
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}>
                  {city.emoji} {city.id}
                </button>
              ))}
            </div>
          </div>

          {/* Waypoints summary */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Planned stops ({waypoints.length})
            </label>
            <div className="space-y-1">
              {waypoints.map(w => (
                <div key={w.city} className="flex items-center gap-2 text-xs text-gray-300">
                  <span>{CITIES[w.city]?.emoji ?? '🏙️'}</span>
                  <span className="font-medium">{w.city}</span>
                  <span className="text-gray-600">—</span>
                  <span className="text-gray-400">
                    {w.actions.map(a => a.action === 'refine' ? '⚗️' : '💰').join(' ')}
                    {' '}{w.actions.map(a => a.material.label).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Route options */}
      <div>
        <h3 className="text-sm font-semibold text-yellow-400 mb-3">Choose your route</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RouteCard
            route={routes.fastest}
            label="Fastest"
            icon="⚡"
            active={sortMode === 'fastest'}
            onClick={() => setSortMode('fastest')}
          />
          <RouteCard
            route={routes.safest}
            label="Safest"
            icon="🛡️"
            active={sortMode === 'safest'}
            onClick={() => setSortMode('safest')}
          />
          <RouteCard
            route={routes.efficient}
            label="Most Efficient"
            icon="📈"
            active={sortMode === 'efficient'}
            onClick={() => setSortMode('efficient')}
          />
        </div>
      </div>

      {/* Route details */}
      {selectedRoute && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-200">
              {sortMode === 'fastest' ? '⚡ Fastest' : sortMode === 'safest' ? '🛡️ Safest' : '📈 Most Efficient'} Route
            </h3>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>🗺️ {selectedRoute.totalCrossings} total zones</span>
              <span>⚔️ Danger score: {selectedRoute.totalDanger}</span>
            </div>
          </div>
          <RouteDetails route={selectedRoute} />

          {/* Albion map link */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <a
              href="https://albionfreemarket.com/albion-map"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
              🗺️ Open Albion Map tool for detailed pathfinding →
            </a>
            <p className="text-xs text-gray-600 mt-2">
              Use the interactive map for exact zone-by-zone navigation within each leg of your journey.
            </p>
          </div>
        </div>
      )}

      {/* No route found */}
      {!selectedRoute && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 text-amber-400 text-sm">
          ⚠️ No valid route found with current zone restrictions.
          {!allowRedBlack && ' Try enabling red/black zones in Settings to open up more routes.'}
        </div>
      )}
    </div>
  )
}