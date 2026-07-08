import { useState, useCallback, useEffect } from 'react'
import type { AnalysisResult } from '../types'
import { analyseDocuments } from '../lib/analyse'
import UploadStep from '../components/funnel/UploadStep'
import QuestionStep from '../components/funnel/QuestionStep'
import AnalyzingStep from '../components/funnel/AnalyzingStep'
import EmailCaptureStep from '../components/funnel/EmailCaptureStep'
import PreviewStep from '../components/funnel/PreviewStep'

type Stage = 'upload' | 'q1' | 'q2' | 'q3' | 'q4' | 'analyzing' | 'email' | 'preview'

const QUESTIONS = [
  {
    id: 'q1',
    question: "What's the approximate contract value?",
    options: [
      { label: '€100k – €500k', value: '100k-500k' },
      { label: '€500k – €2m', value: '500k-2m' },
      { label: '€2m – €5m', value: '2m-5m' },
      { label: '€5m+', value: '5m+' },
    ],
    next: 'q2' as Stage,
  },
  {
    id: 'q2',
    question: 'What type of work?',
    options: [
      { label: 'Groundworks / Civil', value: 'groundworks-civil' },
      { label: 'Mechanical & Electrical', value: 'mechanical-electrical' },
      { label: 'Fit-Out', value: 'fit-out' },
      { label: 'Structural', value: 'structural' },
      { label: 'Other', value: 'other' },
    ],
    next: 'q3' as Stage,
  },
  {
    id: 'q3',
    question: 'Have you raised any variation orders on this job?',
    options: [
      { label: 'Yes — some', value: 'yes-some' },
      { label: 'Yes — many', value: 'yes-many' },
      { label: "No — I'm not sure what I'm entitled to", value: 'no-unsure' },
      { label: 'No — the MC handles it', value: 'no-mc-handles' },
    ],
    next: 'q4' as Stage,
  },
  {
    id: 'q4',
    question: 'How do you currently track variations?',
    options: [
      { label: 'Spreadsheet', value: 'spreadsheet' },
      { label: 'WhatsApp / emails only', value: 'whatsapp-email' },
      { label: 'A QS handles it', value: 'qs' },
      { label: "I don't track them", value: 'none' },
    ],
    next: 'analyzing' as Stage,
  },
]

const PREV_STAGE: Record<Stage, Stage | null> = {
  upload: null,
  q1: 'upload',
  q2: 'q1',
  q3: 'q2',
  q4: 'q3',
  analyzing: 'q4',
  email: 'analyzing',
  preview: 'email',
}

// Progress bar percentage per stage
const PROGRESS: Record<Stage, number> = {
  upload: 0,
  q1: 25,
  q2: 45,
  q3: 65,
  q4: 80,
  analyzing: 90,
  email: 95,
  preview: 100,
}

export default function LeadFunnel() {
  const [stage, setStage] = useState<Stage>('upload')
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [analysisDone, setAnalysisDone] = useState(false)
  const [leadName, setLeadName] = useState('')

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [stage])

  // Fire analysis when we hit the analyzing stage
  useEffect(() => {
    if (stage !== 'analyzing') return
    if (!contractFile) { setStage('upload'); return }

    setAnalysisDone(false)
    setAnalysisError('')

    analyseDocuments(contractFile, [], '')
      .then((r) => {
        setResults(r)
        setAnalysisDone(true)
      })
      .catch((e) => {
        setAnalysisError(e.message || 'Analysis failed')
        setAnalysisDone(true)
      })
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = (file: File) => {
    setContractFile(file)
    setStage('q1')
  }

  const handleAnswer = (qId: string, value: string, next: Stage) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
    setStage(next)
  }

  const handleBack = useCallback(() => {
    const prev = PREV_STAGE[stage]
    if (prev) setStage(prev)
  }, [stage])

  const handleAnalysisDone = () => {
    if (analysisError || !results) {
      // Still go to email capture — we'll show a fallback
      setStage('email')
    } else {
      setStage('email')
    }
  }

  const handleEmailSubmit = (name: string, _email: string) => {
    setLeadName(name)
    setStage('preview')
  }

  const showProgress = stage !== 'preview'
  const progress = PROGRESS[stage]

  // Find active question config
  const activeQuestion = QUESTIONS.find((q) => q.id === stage)

  return (
    <div className="min-h-screen bg-white">
      {/* Amber progress bar at very top */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-100">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-black tracking-tight select-none">
          <span className="text-amber-500">Site</span>
          <span className="text-gray-900">Clause</span>
        </a>
        <a
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Log in →
        </a>
      </nav>

      {/* Stages */}
      {stage === 'upload' && (
        <UploadStep onFile={handleUpload} />
      )}

      {activeQuestion && (
        <QuestionStep
          question={activeQuestion.question}
          options={activeQuestion.options}
          selected={answers[activeQuestion.id] ?? null}
          onSelect={(val) => handleAnswer(activeQuestion.id, val, activeQuestion.next)}
          onBack={handleBack}
          stepIndex={QUESTIONS.findIndex((q) => q.id === stage)}
          totalSteps={QUESTIONS.length}
        />
      )}

      {stage === 'analyzing' && (
        <AnalyzingStep
          done={analysisDone}
          onComplete={handleAnalysisDone}
        />
      )}

      {stage === 'email' && results && (
        <EmailCaptureStep
          results={results}
          contractValueBand={answers['q1'] ?? ''}
          workType={answers['q2'] ?? ''}
          answers={answers}
          onSubmit={handleEmailSubmit}
        />
      )}

      {stage === 'email' && !results && (
        // Fallback: analysis failed — still capture email
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          <div className="text-2xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Something went wrong with the analysis</h2>
          <p className="text-gray-500 text-sm mb-6">{analysisError || 'Please try again.'}</p>
          <button
            onClick={() => setStage('upload')}
            className="bg-[#111] text-white font-bold px-6 py-3 rounded-full text-sm"
          >
            ← Start again
          </button>
        </div>
      )}

      {stage === 'preview' && results && (
        <PreviewStep results={results} name={leadName} />
      )}
    </div>
  )
}
