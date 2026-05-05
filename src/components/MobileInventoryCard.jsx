import { TIERS, MATERIAL_TYPES } from '../data/materials'

export default function MobileInventoryCard({ inventory, onChange }) {
  return (
    <div className="space-y-4 md:hidden">
      {MATERIAL_TYPES.map(mat => (
        <div key={mat.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Material header */}
          <div className="px-4 py-3 bg-gray-800/80 border-b border-gray-700 flex items-center gap-3">
            <img
              src={`https://render.albiononline.com/v1/item/${mat.apiRawId(3)}.png`}
              alt={mat.label}
              className="w-8 h-8 rounded object-contain"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div>
              <span className={`font-bold ${mat.color}`}>{mat.label}</span>
              <div className="text-xs text-gray-500">Bonus: {mat.bonusCity}</div>
            </div>
          </div>

          {/* Tier inputs — 2 column grid */}
          <div className="grid grid-cols-2 gap-px bg-gray-700">
            {TIERS.map(tier => (
              <div key={tier} className="bg-gray-800 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.5 rounded text-xs">
                    T{tier}
                  </span>
                  <span className="text-xs text-gray-500 truncate ml-2">
                    {mat.tierNames.raw[tier]}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={inventory[mat.id][tier]}
                  onChange={e => onChange(mat.id, tier, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-2 text-center text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}