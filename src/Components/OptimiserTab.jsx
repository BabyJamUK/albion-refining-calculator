import { useMemo } from 'react'
import { MATERIAL_TYPES, TIERS, BASE_RETURN_RATE, CITY_RETURN_RATE, optimiseMaterial } from '../data/materials'

function fmt(n)    { return (n ?? 0).toLocaleString() }
function silver(n) { return `${(n ?? 0).toLocaleString()} ` }

function Tag({ children, color = 'yellow' }) {
  const map = {
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    green:  'bg-green-500/20  text-green-400  border-green-500/30',
    blue:   'bg-blue-500/20   text-blue-400   border-blue-500/30',
    amber:  'bg-amber-500/20  text-amber-400  border-amber-500/30',
    red:    'bg-red-500/20    text-red-400    border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }
  return (
    <span className={`${map[color]} border text-xs font-bold px-2 py-0.5 rounded-full`}>
      {children}
    </span>
  )
}

function SplitBar({ fraction, color = 'green' }) {
  const pct = Math.round(fraction * 100)
  const barColor = color === 'green' ? 'bg-green-500' : 'bg-blue-500'
  const rawColor = 'bg-gray-600'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-3 rounded-full bg-gray-700 overflow-hidden flex">
        <div className={`${barColor} h-full transition-all`} style={{ width: `${pct}%` }} />
        <div className={`${rawColor} h-full transition-all`} style={{ width: `${100 - pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-16 text-right">
        {pct}% refine
      </span>
    </div>
  )
}

function ActionBadge({ fraction }) {
  if (fraction === 0)   return <Tag color="blue">Sell all raw</Tag>
  if (fraction === 1)   return <Tag color="green">Refine all</Tag>
  if (fraction >= 0.75) return <Tag color="green">Mostly refine</Tag>
  if (fraction >= 0.5)  return <Tag color="amber">Half & half</Tag>
  return <Tag color="blue">Mostly raw</Tag>
}

function WinnerBadge({ baseTotal, bonusTotal }) {
  if (bonusTotal > baseTotal) {
    const diff = bonusTotal - baseTotal
    return (
      <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
        🏙️ City bonus wins by {silver(diff)}
      </span>
    )
  }
  if (baseTotal > bonusTotal) {
    const diff = baseTotal - bonusTotal
    return (
      <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
        📊 Base rate wins by {silver(diff)}
      </span>
    )
  }
  return <span className="text-xs text-gray-400">Equal returns</span>
}

export default function OptimiserTab({ cascadeBase, prices, inventory }) {
  // Run optimiser for both return rates across all materials
  const optimised = useMemo(() => {
    if (!prices || !cascadeBase) return null

    return MATERIAL_TYPES.map(mat => {
      const rawInv = Object.fromEntries(
        TIERS.map(t => [t, parseInt(inventory[mat.id]?.[t]) || 0])
      )
      const hasAny = TIERS.some(t => rawInv[t] > 0)
      if (!hasAny) return null

      const base  = optimiseMaterial(mat, rawInv, prices, BASE_RETURN_RATE)
      const bonus = optimiseMaterial(mat, rawInv, prices, CITY_RETURN_RATE)

      return { mat, base, bonus, rawInv }
    }).filter(Boolean)
  }, [prices, cascadeBase, inventory])

  if (!prices) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">📡</div>
        <p>Market prices not yet loaded.</p>
        <p className="text-sm mt-1">Hit <span className="text-yellow-400 font-bold">Calculate + Fetch Prices</span> first.</p>
      </div>
    )
  }

  if (!optimised || optimised.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">📦</div>
        <p>No materials entered yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-300">
        <p className="font-semibold text-yellow-400 mb-1">🧠 How the optimiser works</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          For each material, every possible combination of refine/sell splits across all your tiers is tested
          (in 25% steps). The cascade is fully respected — T4 refining consumes T3 planks, which reduces
          what you can sell at T3. The split that produces the highest total silver across all tiers wins.
          Only your own stock is used — no market purchases assumed.
        </p>
      </div>

      {optimised.map(({ mat, base, bonus, rawInv }) => {
        if (!base && !bonus) return null
        const baseTotal  = base?.totalSilver  ?? 0
        const bonusTotal = bonus?.totalSilver ?? 0
        const winner     = bonusTotal >= baseTotal ? bonus : base
        const winnerRate = bonusTotal >= baseTotal ? 'bonus' : 'base'

        return (
          <div key={mat.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">

            {/* ── Material header ── */}
            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/60">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className={`font-bold text-base ${mat.color} flex items-center gap-2`}>
                  {mat.emoji} {mat.label}
                </h3>
                <WinnerBadge baseTotal={baseTotal} bonusTotal={bonusTotal} />
              </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="p-6 border-b border-gray-700">
              <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-4">📊 Best outcome summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Base rate summary */}
                {base && (
                  <div className={`rounded-xl border p-4 ${winnerRate === 'base'
                    ? 'border-blue-500/50 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-blue-400 font-bold text-sm">Base Rate (15.2%)</span>
                      {winnerRate === 'base' && <Tag color="blue">⭐ Best option</Tag>}
                    </div>
                    <div className="text-2xl font-bold text-blue-300 font-mono mb-3">
                      {silver(base.totalSilver)}
                    </div>
                    <div className="space-y-2">
                      {base.breakdown.filter(r => r.raw > 0).map(row => (
                        <div key={row.tier} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-6">T{row.tier}</span>
                          <SplitBar fraction={row.fractionRef} color="blue" />
                          <ActionBadge fraction={row.fractionRef} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* City bonus summary */}
                {bonus && (
                  <div className={`rounded-xl border p-4 ${winnerRate === 'bonus'
                    ? 'border-green-500/50 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-green-400 font-bold text-sm">
                        City Bonus (43.5%) — {mat.bonusCity}
                      </span>
                      {winnerRate === 'bonus' && <Tag color="green">⭐ Best option</Tag>}
                    </div>
                    <div className="text-2xl font-bold text-green-300 font-mono mb-3">
                      {silver(bonus.totalSilver)}
                    </div>
                    <div className="space-y-2">
                      {bonus.breakdown.filter(r => r.raw > 0).map(row => (
                        <div key={row.tier} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-6">T{row.tier}</span>
                          <SplitBar fraction={row.fractionRef} color="green" />
                          <ActionBadge fraction={row.fractionRef} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Detailed breakdown ── */}
            <div className="p-6">
              <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-4">🔍 Detailed breakdown</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { result: base,  label: 'Base Rate',   color: 'blue',  rate: '15.2%' },
                  { result: bonus, label: 'City Bonus',  color: 'green', rate: '43.5%' },
                ].map(({ result, label, color, rate }) => {
                  if (!result) return null
                  const textColor   = color === 'green' ? 'text-green-400'  : 'text-blue-400'
                  const borderColor = color === 'green' ? 'border-green-700/30' : 'border-blue-700/30'
                  const bgColor     = color === 'green' ? 'bg-green-900/10'  : 'bg-blue-900/10'

                  return (
                    <div key={color} className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
                      <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                        <span className={`${textColor} font-bold text-sm`}>{label} ({rate})</span>
                        <span className={`${textColor} font-mono font-bold`}>{silver(result.totalSilver)} total</span>
                      </div>

                      <div className="divide-y divide-gray-800/50">
                        {result.breakdown.filter(r => r.raw > 0).map(row => (
                          <div key={row.tier} className="px-4 py-4">
                            {/* Tier label */}
                            <div className="flex items-center gap-2 mb-3">
                              <Tag color="yellow">T{row.tier}</Tag>
                              <span className="text-gray-300 text-sm font-medium">{row.rawName}</span>
                              <span className="ml-auto">
                                <ActionBadge fraction={row.fractionRef} />
                              </span>
                            </div>

                            {/* Split bar */}
                            <div className="mb-3">
                              <SplitBar fraction={row.fractionRef} color={color} />
                            </div>

                            {/* Maths grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-gray-800/60 rounded-lg p-2">
                                <div className="text-gray-500 mb-0.5">Raw to sell</div>
                                <div className="text-gray-200 font-mono font-bold">{fmt(row.rawToSell)}</div>
                                <div className="text-gray-500">{row.rawName}</div>
                              </div>

                              <div className="bg-gray-800/60 rounded-lg p-2">
                                <div className="text-gray-500 mb-0.5">Raw to refine</div>
                                <div className={`${textColor} font-mono font-bold`}>{fmt(row.rawToRefine)}</div>
                                <div className="text-gray-500">{row.rawName}</div>
                              </div>

                              {row.lowerRefinedName && (
                                <div className="bg-amber-900/20 border border-amber-700/20 rounded-lg p-2">
                                  <div className="text-amber-500 mb-0.5">Ingredient used</div>
                                  <div className="text-amber-400 font-mono font-bold">{fmt(row.lowerRefinedUsed)}</div>
                                  <div className="text-gray-500">{row.lowerRefinedName}</div>
                                </div>
                              )}

                              <div className={`${row.lowerRefinedName ? '' : 'col-span-1'} bg-gray-800/60 rounded-lg p-2`}>
                                <div className="text-gray-500 mb-0.5">Refined output</div>
                                <div className={`${textColor} font-mono font-bold`}>{fmt(row.refinedOutput)}</div>
                                <div className="text-gray-500">{row.refinedName}</div>
                              </div>
                            </div>

                            {/* Silver breakdown */}
<div className="mt-3 bg-gray-800/40 rounded-lg p-3 space-y-1.5 text-xs">
  <div className="text-gray-500 font-semibold mb-2">Silver breakdown</div>

  {row.rawToSell > 0 && (
    <div className="flex justify-between">
      <span className="text-gray-400">
        {fmt(row.rawToSell)} raw × {fmt(row.bestRawPrice)} ({row.bestRawCity})
      </span>
      <span className="text-gray-200 font-mono">{silver(row.rawSilver)}</span>
    </div>
  )}

  {row.sellableRefined > 0 && (
    <div className="flex justify-between">
      <span className="text-gray-400">
        {fmt(row.sellableRefined)} {row.refinedName} × {fmt(row.bestRefinedPrice)} ({row.bestRefinedCity})
      </span>
      <span className={`${textColor} font-mono`}>{silver(row.refinedSilver)}</span>
    </div>
  )}

  {row.lowerRefinedUsed > 0 && (
    <div className="flex justify-between text-gray-600">
      <span>↳ used {fmt(row.lowerRefinedUsed)} {row.lowerRefinedName} as ingredient</span>
    </div>
  )}

  <div className="flex justify-between border-t border-gray-700 pt-1.5 mt-1.5">
    <span className="text-gray-300 font-semibold">Tier total</span>
    <span className={`${textColor} font-mono font-bold`}>{silver(row.tierSilver)}</span>
  </div>
</div>
                          </div>
                        ))}

                        {/* Grand total */}
                        <div className="px-4 py-4 bg-gray-800/30">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-200 font-bold">Grand Total</span>
                            <span className={`${textColor} font-mono text-xl font-bold`}>
                              {silver(result.totalSilver)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}