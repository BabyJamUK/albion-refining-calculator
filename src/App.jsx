import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InventoryInput from './components/InventoryInput'
import FeeManager from './components/FeeManager'
import { fetchGoldPrice, formatGoldAge } from './services/goldService'

const queryClient = new QueryClient()

const TABS = [
  { id: 'calculator', label: '⚗️ Calculator' },
  { id: 'fees',       label: '🏭 Station Fees' },
]

function App() {
  const [activePage, setActivePage] = useState('calculator')
  const [goldData,   setGoldData]   = useState(null)

  // Fetch gold price on load and every 10 minutes
  useEffect(() => {
    const load = () => fetchGoldPrice().then(d => { if (d) setGoldData(d) })
    load()
    const interval = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-950 text-gray-100">

        {/* Header */}
        <header className="border-b border-yellow-600/40 bg-gray-900 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <h1 className="text-xl font-bold text-yellow-400">Albion Refining Calculator</h1>
                <p className="text-xs text-gray-400">Raw vs Refined profit analyser — Europe server</p>
              </div>
            </div>

            {/* Gold ticker */}
            {goldData && (
              <div className="flex items-center gap-2 bg-gray-800 border border-yellow-600/30 rounded-lg px-4 py-2">
                <span className="text-yellow-400 text-sm">🪙 Gold</span>
                <span className="text-yellow-300 font-mono font-bold text-sm">
                  {goldData.price.toLocaleString()}
                </span>
                <span className="text-gray-500 text-xs">silver</span>
                <span className="text-gray-600 text-xs ml-1">
                  {formatGoldAge(goldData.timestamp)}
                </span>
              </div>
            )}

            {/* Nav */}
            <nav className="flex gap-2">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActivePage(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activePage === tab.id
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {activePage === 'calculator' && <InventoryInput />}
          {activePage === 'fees'       && <FeeManager />}
        </main>

        <footer className="border-t border-gray-800 mt-16 py-6 px-6 text-center text-xs text-gray-600">
          <p>
            Market data from{' '}
            <a href="https://www.albion-online-data.com" target="_blank" rel="noreferrer"
              className="text-gray-500 hover:text-gray-400 underline">
              Albion Online Data Project
            </a>{' '}
            — Europe server
          </p>
          <p className="mt-1">Not affiliated with Sandbox Interactive. Prices may be delayed.</p>
        </footer>
      </div>
    </QueryClientProvider>
  )
}

export default App