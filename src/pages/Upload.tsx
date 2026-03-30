import { useState, useRef } from 'react'
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
  const [files, setFiles] = useState<FileItem[]>([])
  const [pastedText, setPastedText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('')
  const [demoLoaded, setDemoLoaded] = useState(false)
  const contractRef = useRef<HTMLInputElement>(null)
  const corrRef = useRef<HTMLInputElement>(null)

  const loadDemo = () => {
    const contractFile = new File([DEMO_CONTRACT], 'demo-jct-subcontract.txt', { type: 'text/plain' })
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
    if (!hasCorrespondence) { setError('Please upload emails/documents or paste your site messages below.'); return }
    setError('')
    setAnalysing(true)
    setStep('Reading your contract...')
    try {
      setStep('Identifying variation events...')
      const result = await analyseDocuments(contract.file, correspondence.map(f => f.file), pastedText)
      setStep('Drafting notices...')
      await new Promise(r => setTimeout(r, 600))
      onResults(result)
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please try again.')
      setAnalysing(false)
      setStep('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium">
          ← Back
        </button>
        <div className="text-xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10 text-xs text-gray-400">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-bold text-xs">1</span>
          <span className="font-semibold text-gray-700">Upload Documents</span>
          <span className="text-gray-300 mx-1">→</span>
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-400 font-bold text-xs">2</span>
          <span>AI Analysis</span>
          <span className="text-gray-300 mx-1">→</span>
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-gray-400 font-bold text-xs">3</span>
          <span>Your Claims</span>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">Upload your documents</h1>
        <p className="text-gray-500 mb-6">Upload your subcontract and any site emails, WhatsApp exports, or diary notes. The AI reads everything.</p>

        {/* Demo banner */}
        {!demoLoaded ? (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-gray-800 mb-0.5">Not ready to upload real documents?</div>
              <div className="text-xs text-gray-500">Try our sample JCT subcontract — fictional project, real AI analysis. See exactly what SiteClause finds.</div>
            </div>
            <button
              onClick={loadDemo}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              Load Demo →
            </button>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <span className="text-green-500 text-xl">✓</span>
            <div>
              <div className="text-sm font-bold text-gray-800">Demo documents loaded</div>
              <div className="text-xs text-gray-500">Oakfield Rise — JCT subcontract + 3 months of site correspondence. Hit Analyse to see what SiteClause finds.</div>
            </div>
          </div>
        )}

        {/* Contract upload */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            1. Subcontract or Main Contract <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => contractRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              contract ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 bg-white'
            }`}
          >
            <input
              ref={contractRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={e => addFiles(e.target.files, 'contract')}
            />
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
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            2. Site Emails, WhatsApp Exports, Diary Notes <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => corrRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              correspondence.length > 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 bg-white'
            }`}
          >
            <input
              ref={corrRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.eml,.msg"
              onChange={e => addFiles(e.target.files, 'correspondence')}
            />
            {correspondence.length > 0 ? (
              <div>
                <div className="text-2xl mb-2">📬</div>
                <div className="font-bold text-gray-800 text-sm">{correspondence.length} file{correspondence.length > 1 ? 's' : ''} uploaded</div>
                <div className="text-xs text-gray-500 mt-1">{correspondence.map(f => f.file.name).join(', ')}</div>
                <div className="text-xs text-amber-600 mt-1">Click to add more</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-3">📬</div>
                <div className="font-semibold text-gray-700 text-sm mb-1">Drop emails and site docs here or click to browse</div>
                <div className="text-xs text-gray-400">PDF, Word, .txt, .eml — multiple files accepted</div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Tip: Export your WhatsApp group chat as a .txt file — SiteClause will read it
          </p>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or paste directly</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Paste text box */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Paste emails, WhatsApp messages, or site notes
          </label>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            rows={8}
            placeholder={`Paste anything here — emails, WhatsApp messages, site diary notes, instructions from the main contractor...\n\nExample:\n"WhatsApp 21 Oct — Declan: Can you move the drainage run 3 metres north? We'll sort the VO later"\n"Email 12 Nov — Re: Drainage Revision — please re-route 180m of 150mm pipe per new drawings..."`}
            className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-2">
            📱 Just copy and paste from your phone, email, or WhatsApp — no formatting needed
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {analysing ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-8 py-5">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <div className="font-bold text-gray-800 text-sm">{step}</div>
                <div className="text-xs text-gray-400 mt-0.5">This takes about 30–60 seconds</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleAnalyse}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-200"
          >
            Analyse My Contract →
          </button>
        )}
      </div>
    </div>
  )
}
