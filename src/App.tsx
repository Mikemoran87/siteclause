import { useState } from 'react'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Results from './pages/Results'
import type { AnalysisResult } from './types'

type Page = 'landing' | 'upload' | 'results'

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [results, setResults] = useState<AnalysisResult | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {page === 'landing' && <Landing onStart={() => setPage('upload')} />}
      {page === 'upload' && (
        <Upload
          onBack={() => setPage('landing')}
          onResults={(r) => { setResults(r); setPage('results') }}
        />
      )}
      {page === 'results' && results && (
        <Results
          results={results}
          onReset={() => { setResults(null); setPage('upload') }}
        />
      )}
    </div>
  )
}
