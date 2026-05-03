import { formatPriceAge, getPriceAgeColor } from '../services/marketApi'

export default function PriceAgeTag({ dateString, showIcon = true }) {
  const label = formatPriceAge(dateString)
  const color = getPriceAgeColor(dateString)

  if (!label) return <span className="text-gray-700 text-xs">No data</span>

  return (
    <span className={`text-xs font-mono ${color} flex items-center gap-1`}>
      {showIcon && (
        <span>{color === 'text-green-400' ? '🟢' : color === 'text-amber-400' ? '🟡' : '🔴'}</span>
      )}
      {label}
    </span>
  )
}