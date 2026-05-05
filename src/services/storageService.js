// Persists inventory, allocation and settings to localStorage
// Wrapped in try/catch — localStorage can be blocked in some browsers

const KEY = 'albion-calculator-state'

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      inventory:        state.inventory,
      allocation:       state.allocation,
      enchantedInventory: state.enchantedInventory,
      usageFee:         state.usageFee,
      useSavedFees:     state.useSavedFees,
      includeMarketFee: state.includeMarketFee,
      server:           state.server,
      savedAt:          new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('Could not save state to localStorage:', err)
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Could not load state from localStorage:', err)
    return null
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY)
  } catch (err) {
    console.warn('Could not clear localStorage:', err)
  }
}

export function formatSavedAt(isoString) {
  if (!isoString) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return null
  }
}