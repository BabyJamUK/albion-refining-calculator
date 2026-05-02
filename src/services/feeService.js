// Reads fees.json from the public folder
// To update fees: edit public/fees.json and push to GitHub

export async function loadFees() {
  try {
    const res = await fetch('/fees.json')
    if (!res.ok) throw new Error(`Failed to load fees: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('Fee load error:', err)
    return null
  }
}

// Get the best (lowest) fee for a material in a given region and city
// Lower fee = cheaper to refine = more profit
export function getBestFee(feesData, region, material, city = null) {
  if (!feesData?.fees) return null

  const matches = feesData.fees.filter(f =>
    f.region === region &&
    f.material === material &&
    (city === null || f.city === city)
  )

  if (matches.length === 0) return null

  // Return lowest fee available (best for the refiner)
  return matches.reduce((best, f) => f.fee < (best?.fee ?? Infinity) ? f : best, null)
}

// Get all fees for a material in a region, grouped by city
export function getFeesByCity(feesData, region, material) {
  if (!feesData?.fees) return {}

  const result = {}
  for (const f of feesData.fees) {
    if (f.region === region && f.material === material) {
      if (!result[f.city] || f.fee < result[f.city].fee) {
        result[f.city] = f
      }
    }
  }
  return result
}

// Format the lastUpdated timestamp nicely
export function formatLastUpdated(isoString) {
  if (!isoString) return 'Unknown'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

// Build a pre-filled GitHub issue URL for fee submissions
export function buildIssueUrl({ region, city, material, stationName, fee, submittedBy }) {
  const title = encodeURIComponent(`[Fee Submission] ${region} - ${city} - ${material}`)
  const body  = encodeURIComponent(
`## Fee Submission

| Field | Value |
|---|---|
| Region | ${region} |
| City | ${city} |
| Material | ${material} |
| Station Name | ${stationName || 'Unknown'} |
| Fee (per 100 nutrition) | ${fee} |
| Submitted By | ${submittedBy || 'Anonymous'} |

> Please verify this fee is current before approving.`
  )
  return `https://github.com/BabyJamUK/albion-refining-calculator/issues/new?title=${title}&body=${body}&labels=fee-submission`
}