import { useState, useRef, useEffect } from 'react'
import { analyseDocuments } from '../lib/analyse'
import { DEMO_CONTRACT, DEMO_CORRESPONDENCE } from '../lib/demo-data'
import type { AnalysisResult } from '../types'

interface Props {
  onBack: () => void
  onResults: (r: AnalysisResult) => void
}

interface FileItem {
  file: File
  role: 'contract' | 'correspondence'
}

export default function Upload({ onBack, onResults }: Props) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  const [files, setFiles] = useState<FileItem[]>([])
  const [pastedText, setPastedText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('')
  const [demoLoaded, setDemoLoaded] = useState(false)
  const contractRef = useRef<HTMLInputElement>(null)
  const corrRef = useRef<HTMLInputElement>(null)

  const loadDemo = () => {
    const contractFile = new File([DEMO_CONTRACT], 'Oakfield-Rise-JCT-Subcontract.txt', { type: 'text/plain' })
    setFiles([{ file: contractFile, role: 'contract' }])
    setPastedText(DEMO_CORRESPONDENCE)
    setDemoLoaded(true)
    setError('')
  }

  const addFiles = (incoming: FileList | null, role: 'contract' | 'correspondence') => {
    if (!incoming) return
    const items: FileItem[] = Array.from(incoming).map(f => ({ file: f, role }))
    setFiles(prev => [...prev.filter(f => f.role !== role), ...items])
  }

  const contract = files.find(f => f.role === 'contract')
  const correspondence = files.filter(f => f.role === 'correspondence')
  const hasCorrespondence = correspondence.length > 0 || pastedText.trim().length > 0

  const handleAnalyse = async () => {
    if (!contract) { setError('Please upload your subcontract first.'); return }
    if (!hasCorrespondence) { setError('Please upload emails or paste your site messages.'); return }
    setError('')
    setAnalysing(true)
    setStep('Reading your contract...')
    try {
      setStep('Identifying variation events...')
      const result = await analyseDocuments(contract.file, correspondence.map(f => f.file), pastedText)
      setStep('Drafting notices...')
      await new Promise(r => setTimeout(r, 600))
      onResults(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed. Please try again.'
      setError(msg)
      setAnalysing(false)
      setStep('')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — matches homepage */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <button onClick={onBack} className="text-2xl font-black text-amber-500 tracking-tight hover:opacity-80 transition-opacity">
          Site<span className="text-gray-900">Clause</span>
        </button>
        <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          ← Back
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10 text-xs">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-bold">1</span>
          <span className="font-bold text-gray-800">Upload</span>
          <span className="text-gray-300 mx-1">→</span>
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400 font-bold">2</span>
          <span className="text-gray-400">Analysis</span>
          <span className="text-gray-300 mx-1">→</span>
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400 font-bold">3</span>
          <span className="text-gray-400">Your Claims</span>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Upload your documents</h1>
        <p className="text-gray-500 mb-8">Upload your subcontract and site correspondence. The AI reads everything and finds every claim you're entitled to.</p>

        {/* Demo banner */}
        {!demoLoaded ? (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-gray-900 mb-1">Not ready to upload real documents?</div>
              <div className="text-xs text-gray-500">Try a sample JCT subcontract. Fictional project, real AI analysis. See exactly what SiteClause finds.</div>
            </div>
            <button onClick={loadDemo} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap">
              Load Demo
            </button>
          </div>
        ) : (
          <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <span className="text-green-500 text-xl flex-shrink-0">✓</span>
            <div>
              <div className="text-sm font-bold text-gray-900">Demo documents loaded</div>
              <div className="text-xs text-gray-500 mt-0.5">Oakfield Rise — JCT groundworks subcontract + 3 months of site emails and WhatsApp. Hit Analyse to see what SiteClause finds.</div>
            </div>
          </div>
        )}

        {/* Contract upload */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Subcontract <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => contractRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              contract ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
            }`}
          >
            <input ref={contractRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={e => addFiles(e.target.files, 'contract')} />
            {contract ? (
              <div>
                <div className="text-2xl mb-2">📄</div>
                <div className="font-bold text-gray-800 text-sm">{contract.file.name}</div>
                <div className="text-xs text-amber-600 mt-1">Click to replace</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-3">📋</div>
                <div className="font-semibold text-gray-700 text-sm mb-1">Drop your contract here or click to browse</div>
                <div className="text-xs text-gray-400">PDF, Word, or text file</div>
              </div>
            )}
          </div>
        </div>

        {/* Correspondence upload */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Site Emails, WhatsApp, Diary Notes <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => corrRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              correspondence.length > 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
            }`}
          >
            <input ref={corrRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.txt,.eml,.msg" onChange={e => addFiles(e.target.files, 'correspondence')} />
            {correspondence.length > 0 ? (
              <div>
                <div className="text-2xl mb-2">📬</div>
                <div className="font-bold text-gray-800 text-sm">{correspondence.length} file{correspondence.length > 1 ? 's' : ''} uploaded</div>
                <div className="text-xs text-gray-500 mt-1 truncate">{correspondence.map(f => f.file.name).join(', ')}</div>
                <div className="text-xs text-amber-600 mt-1">Click to add more</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-3">📬</div>
                <div className="font-semibold text-gray-700 text-sm mb-1">Drop emails and site documents here</div>
                <div className="text-xs text-gray-400">PDF, Word, .txt, .eml — multiple files accepted</div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Export your WhatsApp group as a .txt file and upload it here.</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or paste directly</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Paste box */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-800 mb-2">Paste emails, WhatsApp, or site notes</label>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            rows={7}
            placeholder={'Paste anything here — emails, WhatsApp, site diary notes, instructions...\n\nExample:\n"WhatsApp 21 Oct — Gary: Can you move the drainage run 3 metres north? We\'ll sort the VO later."\n"Email 12 Nov — please re-route 180m of 150mm pipe per new drawings."'}
            className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none leading-relaxed"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {analysing ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-8 py-5">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <div className="font-bold text-gray-800 text-sm">{step}</div>
                <div className="text-xs text-gray-400 mt-0.5">Takes about 30 seconds</div>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={handleAnalyse} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-100">
            Analyse My Contract →
          </button>
        )}
      </div>
    </div>
  )
}
