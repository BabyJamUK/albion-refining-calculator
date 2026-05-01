// ─── Material & Tier Names ───────────────────────────────────────────────────

export const MATERIAL_TYPES = [
  {
    id: 'logs',
    label: 'Wood / Logs',
    emoji: '🪵',
    color: 'text-yellow-400',
    tierNames: {
      raw:     { 2:'Birch Log',      3:'Chestnut Log',    4:'Pine Log',      5:'Cedar Log',      6:'Bloodoak Log',    7:'Ashenbark Log',   8:'Whitewood Log'    },
      refined: { 2:'Birch Plank',    3:'Chestnut Plank',  4:'Pine Plank',    5:'Cedar Plank',    6:'Bloodoak Plank',  7:'Ashenbark Plank', 8:'Whitewood Plank'  },
    },
    apiRawId:     tier => `T${tier}_WOOD`,
    apiRefinedId: tier => `T${tier}_PLANKS`,
    bonusCity: 'Lymhurst',
  },
  {
    id: 'ore',
    label: 'Ore',
    emoji: '⛏️',
    color: 'text-orange-400',
    tierNames: {
      raw:     { 2:'Tin Ore',        3:'Iron Ore',        4:'Titanium Ore',  5:'Runite Ore',     6:'Meteorite Ore',   7:'Adamantium Ore',  8:'Arcanium Ore'     },
      refined: { 2:'Bronze Bar',     3:'Steel Bar',       4:'Titanium Bar',  5:'Runite Bar',     6:'Meteorite Bar',   7:'Adamantium Bar',  8:'Arcanium Bar'     },
    },
    apiRawId:     tier => `T${tier}_ORE`,
    apiRefinedId: tier => `T${tier}_METALBAR`,
    bonusCity: 'Thetford',
  },
  {
    id: 'hide',
    label: 'Hide',
    emoji: '🐾',
    color: 'text-amber-400',
    tierNames: {
      raw:     { 2:'Rugged Hide',    3:'Thin Hide',       4:'Medium Hide',   5:'Heavy Hide',     6:'Robust Hide',     7:'Thick Hide',      8:'Resilient Hide'   },
      refined: { 2:'Stiff Leather',  3:'Thick Leather',   4:'Worked Leather',5:'Cured Leather',  6:'Hardened Leather',7:'Reinforced Leather',8:'Fortified Leather'},
    },
    apiRawId:     tier => `T${tier}_HIDE`,
    apiRefinedId: tier => `T${tier}_LEATHER`,
    bonusCity: 'Martlock',
  },
  {
    id: 'fibre',
    label: 'Fibre',
    emoji: '🌿',
    color: 'text-green-400',
    tierNames: {
      raw:     { 2:'Cotton',         3:'Flax',            4:'Hemp',          5:'Skyflower',      6:'Redleaf Cotton',  7:'Sunflax',         8:'Ghost Hemp'       },
      refined: { 2:'Simple Cloth',   3:'Neat Cloth',      4:'Fine Cloth',    5:'Ornate Cloth',   6:'Lavish Cloth',    7:'Opulent Cloth',   8:'Baroque Cloth'    },
    },
    apiRawId:     tier => `T${tier}_FIBER`,
    apiRefinedId: tier => `T${tier}_CLOTH`,
    bonusCity: 'Bridgewatch',
  },
  {
    id: 'stone',
    label: 'Stone / Rock',
    emoji: '🪨',
    color: 'text-slate-400',
    tierNames: {
      raw:     { 2:'Limestone',      3:'Sandstone',       4:'Travertine',    5:'Granite',        6:'Slate',           7:'Basalt',          8:'Marble'           },
      refined: { 2:'Limestone Block',3:'Sandstone Block', 4:'Travertine Block',5:'Granite Block', 6:'Slate Block',     7:'Basalt Block',    8:'Marble Block'     },
    },
    apiRawId:     tier => `T${tier}_ROCK`,
    apiRefinedId: tier => `T${tier}_STONEBLOCK`,
    bonusCity: 'Fort Sterling',
  },
]

export const TIERS     = [3, 4, 5, 6, 7, 8]
export const ALL_TIERS = [2, 3, 4, 5, 6, 7, 8]

export const BASE_RETURN_RATE = 0.152
export const CITY_RETURN_RATE = 0.435

export const ALL_CITIES = [
  'Lymhurst','Thetford','Martlock','Bridgewatch','Fort Sterling','Caerleon','Brecilien'
]

// ─── Core refining formula ────────────────────────────────────────────────────
// 2 raw → 1 refined (+ return rate bonus output)
// 1 lower-tier refined consumed per 2 raw used (except T3)
export function refineBatch(rawQty, lowerRefinedAvailable, tier, returnRate) {
  const maxBatchesByRaw     = Math.floor(rawQty / 2)
  const maxBatchesByLower   = tier <= 3 ? maxBatchesByRaw : lowerRefinedAvailable
  const batches             = Math.min(maxBatchesByRaw, maxBatchesByLower)
  const refinedOutput       = Math.floor(batches * (1 + returnRate))
  const lowerRefinedUsed    = batches   // 1 per batch
  return { batches, refinedOutput, lowerRefinedUsed }
}

// ─── Run full cascade for one material ───────────────────────────────────────
// allocation: { [tier]: number }  — how many refined from this tier to send UP
// Returns array of tier results
export function runCascade(materialType, rawInventory, allocation, returnRate) {
  // Track how many refined are available at each tier coming from below
  const refinedAvailableFromBelow = {}

  const tierResults = TIERS.map(tier => {
    const raw              = rawInventory[tier] ?? 0
    const lowerAvail       = tier <= 3 ? Infinity : (refinedAvailableFromBelow[tier - 1] ?? 0)
    const { refinedOutput, lowerRefinedUsed } = refineBatch(raw, lowerAvail, tier, returnRate)

    const lowerRefinedName    = tier > 3 ? materialType.tierNames.refined[tier - 1] : null
    const maxSendUp           = refinedOutput  // can't send more than you made
    const sendUp              = tier < 8 ? Math.min(allocation[tier] ?? 0, maxSendUp) : 0
    const sellableRefined     = refinedOutput - sendUp

    // What's available for the next tier up
    refinedAvailableFromBelow[tier] = refinedOutput

    return {
      tier,
      raw,
      rawName:           materialType.tierNames.raw[tier],
      refinedName:       materialType.tierNames.refined[tier],
      lowerRefinedName,
      lowerRefinedUsed,
      lowerRefinedAvail: tier <= 3 ? null : (refinedAvailableFromBelow[tier - 1] ?? 0),
      refinedOutput,
      maxSendUp,
      sendUp,
      sellableRefined,
      rawApiId:          materialType.apiRawId(tier),
      refinedApiId:      materialType.apiRefinedId(tier),
      lowerRefinedApiId: tier > 3 ? materialType.apiRefinedId(tier - 1) : null,
    }
  }).filter(r => r.raw > 0 || r.lowerRefinedUsed > 0 || r.refinedOutput > 0)

  return tierResults
}

// ─── Optimiser ────────────────────────────────────────────────────────────────
// Finds the best raw/refine split across all tiers for one material
// Only uses own stock — no market buying of missing ingredients

/**
 * Score one complete cascade configuration
 * rawSplits: { [tier]: fractionToRefine (0-1) }
 * prices:    { [apiId]: { [city]: price } }
 * Returns total silver and per-tier breakdown
 */
export function scoreCascade(materialType, rawInventory, rawSplits, prices, returnRate) {
  const tierBreakdown = []
  const refinedProduced = {}  // how many refined each tier actually produced
  const refinedConsumed = {}  // how many refined each tier consumed from below

  // ── Pass 1: run all refining, track produced & consumed ──────────────────
  for (const tier of TIERS) {
    const raw         = rawInventory[tier] ?? 0
    const fractionRef = rawSplits[tier]    ?? 0
    const rawToRefine = Math.floor(raw * fractionRef)
    const rawToSell   = raw - rawToRefine
    const lowerAvail  = tier <= 3 ? Infinity : (refinedProduced[tier - 1] ?? 0)

    const { refinedOutput, lowerRefinedUsed } = refineBatch(rawToRefine, lowerAvail, tier, returnRate)

    refinedProduced[tier] = refinedOutput
    refinedConsumed[tier] = lowerRefinedUsed

    tierBreakdown.push({
      tier,
      raw,
      rawToRefine,
      rawToSell,
      refinedOutput,
      lowerRefinedUsed,
      rawName:          materialType.tierNames.raw[tier],
      refinedName:      materialType.tierNames.refined[tier],
      lowerRefinedName: tier > 3 ? materialType.tierNames.refined[tier - 1] : null,
      fractionRef,
      rawApiId:         materialType.apiRawId(tier),
      refinedApiId:     materialType.apiRefinedId(tier),
    })
  }

  // ── Pass 2: calculate sellable quantities ─────────────────────────────────
  // sellable refined = produced at this tier MINUS consumed by the tier above
  for (let i = 0; i < tierBreakdown.length; i++) {
    const row         = tierBreakdown[i]
    const nextRow     = tierBreakdown[i + 1]
    // How many of THIS tier's refined did the next tier consume as ingredient?
    const sentUp      = nextRow?.lowerRefinedUsed ?? 0
    row.sellableRefined = Math.max(0, row.refinedOutput - sentUp)
  }

  // ── Pass 3: calculate silver using correct sellable quantities ────────────
  let totalSilver = 0

  for (const row of tierBreakdown) {
    const bestRawPrice     = bestPrice(prices, row.rawApiId)
    const bestRefinedPrice = bestPrice(prices, row.refinedApiId)

    row.bestRawPrice      = bestRawPrice?.price  ?? 0
    row.bestRawCity       = bestRawPrice?.city   ?? null
    row.bestRefinedPrice  = bestRefinedPrice?.price ?? 0
    row.bestRefinedCity   = bestRefinedPrice?.city  ?? null

    // ✅ Raw silver: just what you didn't refine
    row.rawSilver     = row.rawToSell      * row.bestRawPrice
    // ✅ Refined silver: only what's left to sell after feeding next tier
    row.refinedSilver = row.sellableRefined * row.bestRefinedPrice
    row.tierSilver    = row.rawSilver + row.refinedSilver

    totalSilver += row.tierSilver
  }

  return { totalSilver, tierBreakdown }
}


function bestPrice(prices, apiId) {
  const cityPrices = prices?.[apiId]
  if (!cityPrices) return null
  return Object.entries(cityPrices)
    .reduce((best, [city, price]) =>
      price > (best?.price ?? 0) ? { city, price } : best, null)
}

/**
 * Run the optimiser for one material + return rate
 * Tries combinations in steps of 10% per tier
 * Returns the best split found and its breakdown
 */
export function optimiseMaterial(materialType, rawInventory, prices, returnRate) {
  const activeTiers = TIERS.filter(t => (rawInventory[t] ?? 0) > 0)
  if (activeTiers.length === 0) return null

  // Generate all combinations of splits across active tiers
  // Steps: 0, 0.25, 0.5, 0.75, 1.0  (5 options per tier)
  // For 6 tiers: 5^6 = 15625 combinations — fast enough
  const STEPS = [0, 0.25, 0.5, 0.75, 1.0]

  let bestScore   = -Infinity
  let bestSplits  = null
  let bestBreakdown = null

  function recurse(tierIdx, currentSplits) {
    if (tierIdx === activeTiers.length) {
      const { totalSilver, tierBreakdown } = scoreCascade(
        materialType, rawInventory, currentSplits, prices, returnRate
      )
      if (totalSilver > bestScore) {
        bestScore     = totalSilver
        bestSplits    = { ...currentSplits }
        bestBreakdown = tierBreakdown
      }
      return
    }
    const tier = activeTiers[tierIdx]
    for (const step of STEPS) {
      currentSplits[tier] = step
      recurse(tierIdx + 1, currentSplits)
    }
  }

  recurse(0, {})
  return { totalSilver: bestScore, splits: bestSplits, breakdown: bestBreakdown }
}