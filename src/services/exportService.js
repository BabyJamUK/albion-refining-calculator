// CSV export service
// Generates CSV content for selected data sections

export const EXPORT_SECTIONS = [
  { id: 'inventory',  label: 'Inventory (raw quantities)' },
  { id: 'cascade',    label: 'Cascade planner (refining output)' },
  { id: 'profit',     label: 'Profit breakdown (per city)' },
  { id: 'optimiser',  label: 'Optimiser results' },
]

function escapeCell(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(...cells) {
  return cells.map(escapeCell).join(',')
}

function section(title, headers, rows) {
  return [
    title,
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
  ].join('\n')
}

// ── Inventory section ─────────────────────────────────────────────────────────
function exportInventory(inventory, materialTypes, tiers) {
  const headers = ['Material', ...tiers.map(t => `T${t}`)]
  const rows = materialTypes.map(mat => [
    mat.label,
    ...tiers.map(t => parseInt(inventory[mat.id]?.[t]) || 0),
  ])
  return section('=== INVENTORY ===', headers, rows)
}

// ── Cascade section ───────────────────────────────────────────────────────────
function exportCascade(cascadeBase, cascadeBonus) {
  if (!cascadeBase) return ''
  const headers = [
    'Material', 'Tier', 'Raw Input', 'Raw Name',
    'Ingredient Used', 'Ingredient Name',
    'Base Output', 'Base Sellable',
    'Bonus Output', 'Bonus Sellable',
    'Refined Name',
  ]
  const rows = []
  for (const mat of cascadeBase) {
    const bonusMat = cascadeBonus?.find(m => m.id === mat.id)
    for (let i = 0; i < mat.tiers.length; i++) {
      const base  = mat.tiers[i]
      const bonus = bonusMat?.tiers[i]
      rows.push([
        mat.label,
        `T${base.tier}`,
        base.raw,
        base.rawName,
        base.lowerRefinedUsed || 0,
        base.lowerRefinedName || 'None',
        base.refinedOutput,
        base.sellableRefined,
        bonus?.refinedOutput ?? '',
        bonus?.sellableRefined ?? '',
        base.refinedName,
      ])
    }
  }
  return section('=== CASCADE PLANNER ===', headers, rows)
}

// ── Profit section ────────────────────────────────────────────────────────────
function exportProfit(cascadeBase, cascadeBonus, prices, allCities) {
  if (!cascadeBase || !prices) return ''
  const headers = [
    'Material', 'Tier', 'Raw Name', 'Refined Name',
    'City', 'Raw Price', 'Raw Total',
    'Refined Price (Base)', 'Refined Total (Base)',
    'Refined Price (Bonus)', 'Refined Total (Bonus)',
    'Recommendation',
  ]
  const rows = []
  for (const mat of cascadeBase) {
    const bonusMat = cascadeBonus?.find(m => m.id === mat.id)
    for (let i = 0; i < mat.tiers.length; i++) {
      const base  = mat.tiers[i]
      const bonus = bonusMat?.tiers[i]
      for (const city of allCities) {
        const rawPrice     = prices[base.rawApiId]?.[city]?.price     ?? 0
        const refinedPrice = prices[base.refinedApiId]?.[city]?.price ?? 0
        const rawTotal     = rawPrice * base.raw
        const baseTotal    = refinedPrice * (base.sellableRefined ?? 0)
        const bonusTotal   = refinedPrice * (bonus?.sellableRefined ?? 0)
        const rec = bonusTotal >= rawTotal ? 'Refine (bonus city)' : 'Sell raw'
        rows.push([
          mat.label, `T${base.tier}`,
          base.rawName, base.refinedName,
          city, rawPrice, rawTotal,
          refinedPrice, baseTotal,
          refinedPrice, bonusTotal,
          rec,
        ])
      }
    }
  }
  return section('=== PROFIT BREAKDOWN ===', headers, rows)
}

// ── Optimiser section ─────────────────────────────────────────────────────────
function exportOptimiser(optimised) {
  if (!optimised) return ''
  const headers = [
    'Material', 'Rate', 'Tier', 'Raw Name',
    'Action', 'Raw to Sell', 'Raw to Refine',
    'Refined Output', 'Sellable Refined',
    'Raw Silver', 'Refined Silver', 'Tier Total',
    'Grand Total',
  ]
  const rows = []
  for (const { mat, base, bonus } of optimised) {
    for (const [label, result] of [['Base 15.2%', base], ['Bonus 43.5%', bonus]]) {
      if (!result) continue
      for (const r of result.breakdown.filter(x => x.raw > 0)) {
        const action = r.fractionRef === 0 ? 'Sell all raw'
          : r.fractionRef === 1 ? 'Refine all'
          : `${Math.round(r.fractionRef * 100)}% refine`
        rows.push([
          mat.label, label, `T${r.tier}`, r.rawName,
          action, r.rawToSell, r.rawToRefine,
          r.refinedOutput, r.sellableRefined ?? '',
          r.rawSilver, r.refinedSilver, r.tierSilver,
          r === result.breakdown.filter(x => x.raw > 0).at(-1)
            ? result.totalSilver : '',
        ])
      }
    }
  }
  return section('=== OPTIMISER RESULTS ===', headers, rows)
}

// ── Main export function ──────────────────────────────────────────────────────
export function generateCSV({
  selectedSections,
  inventory, materialTypes, tiers,
  cascadeBase, cascadeBonus,
  prices, allCities,
  optimised,
}) {
  const parts = []

  parts.push(`Albion Refining Calculator Export`)
  parts.push(`Generated: ${new Date().toLocaleString('en-GB')}`)
  parts.push('')

  if (selectedSections.includes('inventory')) {
    parts.push(exportInventory(inventory, materialTypes, tiers))
  }
  if (selectedSections.includes('cascade')) {
    parts.push(exportCascade(cascadeBase, cascadeBonus))
  }
  if (selectedSections.includes('profit')) {
    parts.push(exportProfit(cascadeBase, cascadeBonus, prices, allCities))
  }
  if (selectedSections.includes('optimiser')) {
    parts.push(exportOptimiser(optimised))
  }

  return parts.join('\n')
}

export function downloadCSV(content, filename = 'albion-refining-export.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}