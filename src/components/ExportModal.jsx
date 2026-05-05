import { useState } from 'react'
import { EXPORT_SECTIONS, generateCSV, downloadCSV } from '../services/exportService'
import { MATERIAL_TYPES, TIERS, ALL_CITIES } from '../data/materials'

export default function ExportModal({ onClose, cascadeBase, cascadeBonus, prices, inventory, optimised }) {
  const [selected, setSelected] = useState(
    Object.fromEntries(EXPORT_SECTIONS.map(s => [s.id, true]))
  )

  const toggleSection = id =>
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))

  const handleExport = () => {
    const selectedSections = EXPORT_SECTIONS.filter(s => selected[s.id]).map(s => s.id)
    if (!selectedSections.length) {
      alert('Please select at least one section to export.')
      return
    }
    const csv = generateCSV({
      selectedSections,
      inventory,
      materialTypes: MATERIAL_TYPES,
      tiers: TIERS,
      cascadeBase,
      cascadeBonus,
      prices,
      allCities: ALL_CITIES,
      optimised,
    })
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `albion-refining-${date}.csv`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-yellow-400">🖨️ Export to CSV</h2>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl font-bold leading-none">
            ×
          </button>
        </div>

        {/* Section checkboxes */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-gray-400 mb-4">
            Select which sections to include in the export:
          </p>
          {EXPORT_SECTIONS.map(sec => {
            const hasData = (() => {
              if (sec.id === 'inventory') return true
              if (sec.id === 'cascade')   return !!cascadeBase?.length
              if (sec.id === 'profit')    return !!prices && !!cascadeBase?.length
              if (sec.id === 'optimiser') return !!optimised?.length
              return false
            })()

            return (
              <label key={sec.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected[sec.id] && hasData
                    ? 'bg-yellow-500/10 border-yellow-500/40'
                    : 'bg-gray-800 border-gray-700'
                } ${!hasData ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected[sec.id] && hasData}
                  disabled={!hasData}
                  onChange={() => hasData && toggleSection(sec.id)}
                  className="accent-yellow-500 w-4 h-4"
                />
                <div>
                  <div className={`text-sm font-medium ${selected[sec.id] && hasData ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {sec.label}
                  </div>
                  {!hasData && (
                    <div className="text-xs text-gray-600 mt-0.5">
                      No data — calculate first
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleExport}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-5 py-2 rounded-lg text-sm transition-colors">
            ⬇️ Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
