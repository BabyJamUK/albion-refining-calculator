import { MATERIAL_TYPES, TIERS, ENCHANTED_TIERS, ENCHANTABLE_MATERIALS, ENCHANTMENTS, ENCHANTMENT_SUFFIX, ENCHANTMENT_COLOR } from '../data/materials'
import { getPrice, formatPriceAge, getPriceAgeColor } from '../services/marketApi'

const BM_CITY = 'Black Market'

function fmt(n)    { return (n ?? 0).toLocaleString() }
function silver(n) { return `${(n ?? 0).toLocaleString()} ` }

function PriceAgeTag({ dateString }) {
  const label = formatPriceAge(dateString)
  const color = getPriceAgeColor(dateString)
  if (!label) return <span className="text-gray-700 text-xs">—</span>
  return <span className={`text-xs font-mono ${color}`}>{label}</span>
}

export default function BlackMarketTab({ cascadeBase, prices, enchantedPrices, inventory, enchantedInventory }) {

  if (!prices) return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">🏴</div>
      <p>Market prices not yet loaded.</p>
      <p className="text-sm mt-1">Hit <span className="text-yellow-400 font-bold">Calculate + Fetch Prices</span> first.</p>
    </div>
  )

  // Check if Black Market has any data
  const hasBMData = prices && Object.values(prices).some(cityMap =>
    Object.keys(cityMap).includes(BM_CITY)
  )

  if (!hasBMData) return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-4xl mb-3">🏴</div>
      <p className="text-sm">No Black Market price data available.</p>
      <p className="text-xs mt-2 text-gray-600">
        The Black Market only buys refined materials and crafted items — not raw resources.
        Data may not be uploaded by players recently.
      </p>
    </div>
  )

  const activeMats = MATERIAL_TYPES.filter(mat =>
    TIERS.some(t => parseInt(inventory[mat.id]?.[t]) > 0)
  )

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-xs text-gray-400">
        <p className="font-semibold text-gray-300 mb-1">🏴 Black Market</p>
        <p>The Black Market only purchases <strong className="text-gray-200">refined materials</strong> — not raw resources.
        It serves as a sink for refined goods, often offering competitive prices especially for higher tiers.
        Prices shown are sell order minimums — actual buy orders may differ.</p>
      </div>

      {/* Normal tier Black Market comparison */}
      {activeMats.map(mat => {
        const matRows = TIERS.map(tier => {
          const raw         = parseInt(inventory[mat.id]?.[tier]) || 0
          if (raw === 0) return null

          const refinedId   = mat.apiRefinedId(tier)
          const bmPrice     = prices[refinedId]?.[BM_CITY]?.price ?? 0
          const bmDate      = prices[refinedId]?.[BM_CITY]?.date

          // Best non-BM city for comparison
          const bestCity = Object.entries(prices[refinedId] ?? {})
            .filter(([city]) => city !== BM_CITY)
            .reduce((best, [city, data]) => {
              const p = data?.price ?? 0
              return p > (best?.price ?? 0) ? { city, price: p, date: data?.date } : best
            }, null)

          return { tier, raw, refinedId, bmPrice, bmDate, bestCity,
            refinedName: mat.tierNames.refined[tier] }
        }).filter(Boolean)

        if (!matRows.length) return null

        return (
          <div key={mat.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/60">
              <h3 className={`font-bold ${mat.color} flex items-center gap-2`}>
                {mat.emoji} {mat.label}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/30 text-xs text-gray-500">
                    <th className="text-left px-6 py-3">Tier</th>
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-right px-4 py-3 text-purple-400">Black Market</th>
                    <th className="text-right px-4 py-3 text-gray-400">Data age</th>
                    <th className="text-right px-4 py-3 text-yellow-400">Best city</th>
                    <th className="text-right px-4 py-3 text-yellow-400">City price</th>
                    <th className="text-right px-6 py-3">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {matRows.map(row => {
                    const bmBetter = row.bmPrice > (row.bestCity?.price ?? 0)
                    return (
                      <tr key={row.tier} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-3">
                          <span className="bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded text-xs">
                            T{row.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{row.refinedName}</td>
                        <td className="px-4 py-3 text-right">
                          {row.bmPrice > 0 ? (
                            <span className="text-purple-400 font-mono font-bold">
                              {fmt(row.bmPrice)}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">No data</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PriceAgeTag dateString={row.bmDate} />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                          {row.bestCity?.city ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.bestCity ? (
                            <span className="text-yellow-400 font-mono">
                              {fmt(row.bestCity.price)}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {row.bmPrice > 0 && row.bestCity ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              bmBetter
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {bmBetter ? '🏴 Black Market' : `🏙️ ${row.bestCity.city}`}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
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

      {/* Enchanted Black Market section */}
      {enchantedInventory && MATERIAL_TYPES
        .filter(m => ENCHANTABLE_MATERIALS.includes(m.id))
        .some(mat => ENCHANTED_TIERS.some(t =>
          ENCHANTMENTS.some(e => parseInt(enchantedInventory[mat.id]?.[t]?.[e]) > 0)
        )) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-purple-400 border-b border-gray-700 pb-2">
            ✨ Enchanted Refined — Black Market
          </h3>
          {MATERIAL_TYPES.filter(m => ENCHANTABLE_MATERIALS.includes(m.id)).map(mat => {
            const rows = []
            for (const tier of ENCHANTED_TIERS) {
              for (const enchant of ENCHANTMENTS) {
                const raw = parseInt(enchantedInventory[mat.id]?.[tier]?.[enchant]) || 0
                if (!raw) continue

                const refinedId = `${mat.apiRefinedId(tier)}@${enchant}`
                const bmPrice   = enchantedPrices?.[refinedId]?.[BM_CITY]?.price ?? 0
                const bmDate    = enchantedPrices?.[refinedId]?.[BM_CITY]?.date
                const bestCity  = Object.entries(enchantedPrices?.[refinedId] ?? {})
                  .filter(([city]) => city !== BM_CITY)
                  .reduce((best, [city, data]) => {
                    const p = data?.price ?? 0
                    return p > (best?.price ?? 0) ? { city, price: p } : best
                  }, null)

                rows.push({ tier, enchant, raw, refinedId, bmPrice, bmDate, bestCity,
                  refinedName: `${mat.tierNames.refined[tier]}${ENCHANTMENT_SUFFIX[enchant]}` })
              }
            }
            if (!rows.length) return null

            return (
              <div key={mat.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-700 bg-gray-800/60">
                  <h4 className={`font-bold text-sm ${mat.color}`}>{mat.emoji} {mat.label}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/20 text-gray-500">
                        <th className="text-left px-6 py-2">Tier</th>
                        <th className="text-left px-4 py-2">Ench</th>
                        <th className="text-left px-4 py-2">Item</th>
                        <th className="text-right px-4 py-2 text-purple-400">Black Market</th>
                        <th className="text-right px-4 py-2 text-yellow-400">Best city</th>
                        <th className="text-right px-6 py-2">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {rows.map(row => {
                        const bmBetter = row.bmPrice > (row.bestCity?.price ?? 0)
                        return (
                          <tr key={`${row.tier}-${row.enchant}`} className="hover:bg-gray-800/30">
                            <td className="px-6 py-2">
                              <span className="bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded text-xs">
                                T{row.tier}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`font-bold ${ENCHANTMENT_COLOR[row.enchant]}`}>
                                {ENCHANTMENT_SUFFIX[row.enchant]}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-300">{row.refinedName}</td>
                            <td className="px-4 py-2 text-right">
                              {row.bmPrice > 0
                                ? <span className="text-purple-400 font-mono font-bold">{fmt(row.bmPrice)}</span>
                                : <span className="text-gray-600">No data</span>}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {row.bestCity
                                ? <span className="text-yellow-400 font-mono">{fmt(row.bestCity.price)} <span className="text-gray-500">{row.bestCity.city}</span></span>
                                : <span className="text-gray-600">No data</span>}
                            </td>
                            <td className="px-6 py-2 text-right">
                              {row.bmPrice > 0 && row.bestCity ? (
                                <span className={`font-bold px-2 py-0.5 rounded-full ${
                                  bmBetter ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {bmBetter ? '🏴 BM' : `🏙️ ${row.bestCity.city}`}
                                </span>
                              ) : '—'}
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
      )}
    </div>
  )
}