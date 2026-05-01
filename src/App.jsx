import InventoryInput from './components/InventoryInput'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-yellow-600/40 bg-gray-900 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <h1 className="text-xl font-bold text-yellow-400">Albion Refining Calculator</h1>
              <p className="text-xs text-gray-400">Raw vs Refined market profit analyser</p>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <InventoryInput />
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App