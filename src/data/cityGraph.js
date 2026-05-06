// ─── Albion Online City Connection Graph ──────────────────────────────────────
// Based on Royal Continent geography — connections are fixed game data
// Zone counts = approximate number of clusters to cross between cities
// Zone types = the danger level of zones you pass through

export const ZONE_TYPES = {
  BLUE:   { id: 'blue',   label: 'Blue',   color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   dangerScore: 0,  pvp: 'No PvP'           },
  YELLOW: { id: 'yellow', label: 'Yellow', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', dangerScore: 1,  pvp: 'Non-lethal PvP'   },
  RED:    { id: 'red',    label: 'Red',    color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    dangerScore: 5,  pvp: 'Full loot PvP'    },
  BLACK:  { id: 'black',  label: 'Black',  color: 'text-gray-300',   bg: 'bg-gray-500/20',   border: 'border-gray-500/40',   dangerScore: 10, pvp: 'Unrestricted PvP' },
}

// Cities and their properties
export const CITIES = {
  Lymhurst:      { id: 'Lymhurst',      emoji: '🌿', bonusMaterial: 'logs',   safeToReach: true  },
  Thetford:      { id: 'Thetford',      emoji: '🐊', bonusMaterial: 'ore',    safeToReach: true  },
  Martlock:      { id: 'Martlock',      emoji: '🐻', bonusMaterial: 'hide',   safeToReach: true  },
  'Fort Sterling':{ id: 'Fort Sterling', emoji: '⛰️', bonusMaterial: 'stone',  safeToReach: true  },
  Bridgewatch:   { id: 'Bridgewatch',   emoji: '🦂', bonusMaterial: 'fibre',  safeToReach: true  },
  Caerleon:      { id: 'Caerleon',      emoji: '👑', bonusMaterial: null,     safeToReach: false },
  Brecilien:     { id: 'Brecilien',     emoji: '🍄', bonusMaterial: 'essence',safeToReach: true  },
}

// Direct connections between cities
// Each edge: { zoneType, zoneCrossings, note }
// Bidirectional — add both directions
export const CITY_EDGES = [
  // Lymhurst connections
  { from: 'Lymhurst',       to: 'Thetford',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Faerie Cross'          },
  { from: 'Lymhurst',       to: 'Fort Sterling',  zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Forest Cross'          },
  { from: 'Lymhurst',       to: 'Caerleon',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Swamp / Forest roads'  },
  { from: 'Lymhurst',       to: 'Bridgewatch',    zoneType: 'YELLOW', zoneCrossings: 6, note: 'Via Faerie / Steppe Cross' },

  // Thetford connections
  { from: 'Thetford',       to: 'Bridgewatch',    zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Steppe Cross'          },
  { from: 'Thetford',       to: 'Caerleon',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Swamp roads'           },
  { from: 'Thetford',       to: 'Lymhurst',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Faerie Cross'          },

  // Martlock connections
  { from: 'Martlock',       to: 'Fort Sterling',  zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Highland Cross'        },
  { from: 'Martlock',       to: 'Bridgewatch',    zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Steppe Cross'          },
  { from: 'Martlock',       to: 'Caerleon',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Highland roads'        },

  // Fort Sterling connections
  { from: 'Fort Sterling',  to: 'Martlock',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Highland Cross'        },
  { from: 'Fort Sterling',  to: 'Lymhurst',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Forest Cross'          },
  { from: 'Fort Sterling',  to: 'Caerleon',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Highland roads'        },

  // Bridgewatch connections
  { from: 'Bridgewatch',    to: 'Thetford',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Steppe Cross'          },
  { from: 'Bridgewatch',    to: 'Martlock',       zoneType: 'YELLOW', zoneCrossings: 4, note: 'Via Steppe Cross'          },
  { from: 'Bridgewatch',    to: 'Fort Sterling',  zoneType: 'YELLOW', zoneCrossings: 6, note: 'Via Steppe / Highland'     },
  { from: 'Bridgewatch',    to: 'Caerleon',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Steppe roads'          },

  // Caerleon connections (all red)
  { from: 'Caerleon',       to: 'Lymhurst',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Forest/Swamp roads'    },
  { from: 'Caerleon',       to: 'Thetford',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Swamp roads'           },
  { from: 'Caerleon',       to: 'Martlock',       zoneType: 'RED',    zoneCrossings: 3, note: 'Via Highland roads'        },
  { from: 'Caerleon',       to: 'Fort Sterling',  zoneType: 'RED',    zoneCrossings: 3, note: 'Via Highland roads'        },
  { from: 'Caerleon',       to: 'Bridgewatch',    zoneType: 'RED',    zoneCrossings: 3, note: 'Via Steppe roads'          },

  // Brecilien — accessible from all cities via mixed zones
  { from: 'Brecilien',      to: 'Lymhurst',       zoneType: 'YELLOW', zoneCrossings: 5, note: 'Via Mist portals'         },
  { from: 'Brecilien',      to: 'Thetford',       zoneType: 'YELLOW', zoneCrossings: 5, note: 'Via Mist portals'         },
  { from: 'Brecilien',      to: 'Martlock',       zoneType: 'YELLOW', zoneCrossings: 5, note: 'Via Mist portals'         },
  { from: 'Brecilien',      to: 'Fort Sterling',  zoneType: 'YELLOW', zoneCrossings: 5, note: 'Via Mist portals'         },
  { from: 'Brecilien',      to: 'Bridgewatch',    zoneType: 'YELLOW', zoneCrossings: 5, note: 'Via Mist portals'         },
]

// Build adjacency map for quick lookup
export const CITY_GRAPH = {}
for (const city of Object.keys(CITIES)) {
  CITY_GRAPH[city] = []
}
for (const edge of CITY_EDGES) {
  CITY_GRAPH[edge.from].push(edge)
  // Add reverse direction
  CITY_GRAPH[edge.to].push({
    ...edge,
    from: edge.to,
    to:   edge.from,
  })
}

// Find shortest path between two cities using BFS
// Returns array of edges forming the path, or null if no path exists
export function findPath(from, to, allowedZoneTypes = ['BLUE', 'YELLOW', 'RED', 'BLACK']) {
  if (from === to) return []

  const queue   = [{ city: from, path: [] }]
  const visited = new Set([from])

  while (queue.length) {
    const { city, path } = queue.shift()
    const edges = CITY_GRAPH[city] ?? []

    for (const edge of edges) {
      if (!allowedZoneTypes.includes(edge.zoneType)) continue
      if (visited.has(edge.to)) continue

      const newPath = [...path, edge]

      if (edge.to === to) return newPath

      visited.add(edge.to)
      queue.push({ city: edge.to, path: newPath })
    }
  }
  return null  // no path found with allowed zones
}

// Score a full route (array of city stops) including paths between them
export function scoreRoute(stops, allowedZoneTypes) {
  let totalCrossings  = 0
  let totalDanger     = 0
  const legs          = []

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i].city
    const to   = stops[i + 1].city
    if (from === to) continue

    const path = findPath(from, to, allowedZoneTypes)
    if (!path) return null  // route not possible with these zone restrictions

    const crossings = path.reduce((sum, e) => sum + e.zoneCrossings, 0)
    const danger    = path.reduce((sum, e) => sum + (ZONE_TYPES[e.zoneType]?.dangerScore ?? 0) * e.zoneCrossings, 0)

    totalCrossings += crossings
    totalDanger    += danger
    legs.push({ from, to, path, crossings, danger })
  }

  return { totalCrossings, totalDanger, legs }
}

// Generate all permutations of waypoints (cities to visit, excluding start)
export function permutations(arr) {
  if (arr.length <= 1) return [arr]
  const result = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm])
    }
  }
  return result
}