import { MATERIAL_TYPES, ENCHANTED_TIERS, ENCHANTABLE_MATERIALS, ENCHANTMENTS, ENCHANTMENT_LABEL, ENCHANTMENT_COLOR, ENCHANTMENT_SUFFIX } from '../data/materials'

export default function EnchantedInventory({ enchantedInventory, onChange }) {

  const enchantableMats = MATERIAL_TYPES.filter(m => ENCHANTABLE_MATERIALS.includes(m.id))

  return (
    <div className="space-y-4">
      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg px-4 py-3 text-xs text-amber-400">
        ⚠️ Stone cannot be enchanted in Albion Online and is excluded here.
        T4.X enchanted uses normal T3 refined as ingredient — T5.X+ uses same enchantment level of tier below.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 pr-4 text-gray-400 font-medium w-44">Material</th>
              <th className="text-center py-2 px-2 text-gray-400 font-medium w-20">Ench.</th>
              {ENCHANTED_TIERS.map(t => (
                <th key={t} className="text-center py-2 px-2 text-gray-400 font-medium min-w-[110px]">
                  <span className="bg-gray-800 px-2 py-1 rounded text-yellow-500 font-bold">T{t}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {enchantableMats.map(mat => (
              ENCHANTMENTS.map((enchant, eIdx) => (
                <tr key={`${mat.id}-${enchant}`}
                  className={`hover:bg-gray-800/50 transition-colors ${eIdx === 0 ? 'border-t border-gray-700' : ''}`}>

                  {/* Material name — only show on first enchant row */}
                  {eIdx === 0 ? (
                    <td className="py-3 pr-4" rowSpan={3}>
                      <div className="flex items-center gap-2 mb-1">
                        <img
                          src={`https://render.albiononline.com/v1/item/${mat.apiRawId(4)}@1.png`}
                          alt={mat.label}
                          className="w-8 h-8 rounded object-contain"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        <span className={`font-medium ${mat.color}`}>{mat.label}</span>
                      </div>
                      <span className="text-xs text-gray-500">Bonus: {mat.bonusCity}</span>
                    </td>
                  ) : null}

                  {/* Enchantment label */}
                  <td className="py-2 px-2">
                    <span className={`text-xs font-bold ${ENCHANTMENT_COLOR[enchant]}`}>
                      {ENCHANTMENT_SUFFIX[enchant]}
                    </span>
                    <div className={`text-xs ${ENCHANTMENT_COLOR[enchant]} opacity-70`}>
                      {ENCHANTMENT_LABEL[enchant]}
                    </div>
                  </td>

                  {/* Input per tier */}
                  {ENCHANTED_TIERS.map(tier => (
                    <td key={tier} className="py-2 px-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600 text-center truncate">
                          {mat.tierNames.raw[tier]}{ENCHANTMENT_SUFFIX[enchant]}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={enchantedInventory[mat.id]?.[tier]?.[enchant] ?? ''}
                          onChange={e => onChange(mat.id, tier, enchant, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-center text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-colors text-sm"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}