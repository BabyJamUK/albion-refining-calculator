// ─── Material & Tier Names ───────────────────────────────────────────────────

export const MATERIAL_TYPES = [
{
id: 'logs',
label: 'Wood / Logs',
emoji: '🪵',
color: 'text-yellow-400',
tierNames: {
raw:     { 2:'Birch Log',       3:'Chestnut Log',    4:'Pine Log',        5:'Cedar Log',      6:'Bloodoak Log',    7:'Ashenbark Log',   8:'Whitewood Log'    },
refined: { 2:'Birch Plank',     3:'Chestnut Plank',  4:'Pine Plank',      5:'Cedar Plank',    6:'Bloodoak Plank',  7:'Ashenbark Plank', 8:'Whitewood Plank'  },
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
raw:     { 2:'Tin Ore',         3:'Iron Ore',        4:'Titanium Ore',    5:'Runite Ore',     6:'Meteorite Ore',   7:'Adamantium Ore',  8:'Arcanium Ore'     },
refined: { 2:'Bronze Bar',      3:'Steel Bar',       4:'Titanium Bar',    5:'Runite Bar',     6:'Meteorite Bar',   7:'Adamantium Bar',  8:'Arcanium Bar'     },
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
raw:     { 2:'Rugged Hide',     3:'Thin Hide',       4:'Medium Hide',     5:'Heavy Hide',     6:'Robust Hide',     7:'Thick Hide',      8:'Resilient Hide'   },
refined: { 2:'Stiff Leather',   3:'Thick Leather',   4:'Worked Leather',  5:'Cured Leather',  6:'Hardened Leather',7:'Reinforced Leather',8:'Fortified Leather'},
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
raw:     { 2:'Cotton',          3:'Flax',            4:'Hemp',            5:'Skyflower',      6:'Redleaf Cotton',  7:'Sunflax',         8:'Ghost Hemp'       },
refined: { 2:'Simple Cloth',    3:'Neat Cloth',      4:'Fine Cloth',      5:'Ornate Cloth',   6:'Lavish Cloth',    7:'Opulent Cloth',   8:'Baroque Cloth'    },
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
raw:     { 2:'Limestone',       3:'Sandstone',       4:'Travertine',      5:'Granite',        6:'Slate',           7:'Basalt',          8:'Marble'           },
refined: { 2:'Limestone Block', 3:'Sandstone Block', 4:'Travertine Block',5:'Granite Block',  6:'Slate Block',     7:'Basalt Block',    8:'Marble Block'     },
},
apiRawId:     tier => `T${tier}_ROCK`,
apiRefinedId: tier => `T${tier}_STONEBLOCK`,
bonusCity: 'Fort Sterling',
},
]

export const TIERS     = [2, 3, 4, 5, 6, 7, 8]
export const ALL_TIERS = [2, 3, 4, 5, 6, 7, 8]

export const ALL_CITIES = [
'Lymhurst', 'Thetford', 'Martlock', 'Bridgewatch', 'Fort Sterling', 'Caerleon', 'Brecilien'
]

export const BASE_RETURN_RATE = 0.152
export const CITY_RETURN_RATE = 0.435

// ─── Usage fee ────────────────────────────────────────────────────────────────
// Item value doubles each tier — used to calculate nutrition cost
export const ITEM_VALUE = { 2: 8, 3: 16, 4: 32, 5: 64, 6: 128, 7: 256, 8: 512 }

// T2 refining is free — no usage fee
export function calcUsageFee(usageFeePerHundred, tier) {
if (tier <= 2) return 0
const nutritionCost = (ITEM_VALUE[tier] ?? 0) * 0.1125
return (usageFeePerHundred / 100) * nutritionCost
}

// ─── Core refining formula ────────────────────────────────────────────────────
// T2: needs only 2x T2 raw, no lower ingredient
// T3: needs 2x T3 raw, no lower ingredient (T2 refined not required)
// T4+: needs 2x TN raw + 1x T(N-1) refined per batch
export function refineBatch(rawQty, lowerRefinedAvailable, tier, returnRate) {
const maxBatchesByRaw   = Math.floor(rawQty / 2)
// T2 and T3 need no lower refined ingredient
const maxBatchesByLower = tier <= 3 ? maxBatchesByRaw : lowerRefinedAvailable
const batches           = Math.min(maxBatchesByRaw, maxBatchesByLower)
const refinedOutput     = Math.floor(batches * (1 + returnRate))
const lowerRefinedUsed  = tier <= 3 ? 0 : batches
return { batches, refinedOutput, lowerRefinedUsed }
}

// ─── Run full cascade for one material ───────────────────────────────────────
// allocation: { [tier]: number } — how many refined to send UP to next tier
export function runCascade(materialType, rawInventory, allocation, returnRate) {
const refinedBank = {}  // refined produced at each tier

const tierResults = TIERS.map(tier => {
const raw        = rawInventory[tier] ?? 0
const lowerAvail = tier <= 3 ? Infinity : (refinedBank[tier - 1] ?? 0)

const { refinedOutput, lowerRefinedUsed } = refineBatch(raw, lowerAvail, tier, returnRate)

const lowerRefinedName = tier > 3 ? materialType.tierNames.refined[tier - 1] : null
const sendUp           = tier < 8 ? Math.min(allocation?.[tier] ?? 0, refinedOutput) : 0
const sellableRefined  = refinedOutput - sendUp

refinedBank[tier] = refinedOutput

return {
  tier,
  raw,
  rawName:           materialType.tierNames.raw[tier],
  refinedName:       materialType.tierNames.refined[tier],
  lowerRefinedName,
  lowerRefinedUsed,
  lowerRefinedAvail: tier <= 3 ? null : (refinedBank[tier - 1] ?? 0),
  refinedOutput,
  maxSendUp:         refinedOutput,
  sendUp,
  sellableRefined,
  rawApiId:          materialType.apiRawId(tier),
  refinedApiId:      materialType.apiRefinedId(tier),
  lowerRefinedApiId: tier > 3 ? materialType.apiRefinedId(tier - 1) : null,
}

}).filter(r => r.raw > 0 || r.refinedOutput > 0)

return tierResults
}

// ─── Optimiser ────────────────────────────────────────────────────────────────

function bestPrice(prices, apiId) {
const cityPrices = prices?.[apiId]
if (!cityPrices) return null
return Object.entries(cityPrices)
.reduce((best, [city, price]) =>
price > (best?.price ?? 0) ? { city, price } : best, null)
}

export function scoreCascade(materialType, rawInventory, rawSplits, prices, returnRate, usageFee = 0, includeMarketFee = true) {

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

  // ── Pass 3: calculate silver ──────────────────────────────────────
  let totalSilver = 0

  for (const row of tierBreakdown) {
    const bestRawPrice     = bestPrice(prices, row.rawApiId)
    const bestRefinedPrice = bestPrice(prices, row.refinedApiId)

    row.bestRawPrice      = bestRawPrice?.price  ?? 0
    row.bestRawCity       = bestRawPrice?.city   ?? null
    row.bestRefinedPrice  = bestRefinedPrice?.price ?? 0
    row.bestRefinedCity   = bestRefinedPrice?.city  ?? null

    const feeMultiplier   = includeMarketFee ? (1 - 0.04) : 1
    const feePerItem      = calcUsageFee(usageFee, row.tier)
    const totalUsageFee   = feePerItem * row.sellableRefined

    // Market fee applies to both raw and refined sales
    row.rawSilver         = Math.floor(row.rawToSell * row.bestRawPrice * feeMultiplier)
    row.refinedSilver     = Math.floor(row.sellableRefined * row.bestRefinedPrice * feeMultiplier) - totalUsageFee
    row.usageFeeCost      = totalUsageFee
    row.feePerItem        = feePerItem
    row.marketFeeDeducted = includeMarketFee
      ? Math.floor((row.rawToSell * row.bestRawPrice + row.sellableRefined * row.bestRefinedPrice) * 0.04)
      : 0
    row.tierSilver        = row.rawSilver + row.refinedSilver

    totalSilver += row.tierSilver
  }

  return { totalSilver, tierBreakdown }
}

// ── Optimiser: try all split combinations, pick best ─────────────────────────
export function optimiseMaterial(materialType, rawInventory, prices, returnRate, usageFee = 0, includeMarketFee = true) {
const activeTiers = TIERS.filter(t => (rawInventory[t] ?? 0) > 0)
if (activeTiers.length === 0) return null

const STEPS = [0, 0.25, 0.5, 0.75, 1.0]

let bestScore     = -Infinity
let bestSplits    = null
let bestBreakdown = null

function recurse(tierIdx, currentSplits) {
if (tierIdx === activeTiers.length) {
const { totalSilver, tierBreakdown } = scoreCascade(
materialType, rawInventory, currentSplits, prices, returnRate, usageFee, includeMarketFee
)
if (totalSilver > bestScore) {
bestScore     = totalSilver
bestSplits    = {...currentSplits }
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