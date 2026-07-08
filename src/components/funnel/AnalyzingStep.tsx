import { useEffect, useState } from 'react'

const MESSAGES = [
  'Reading your contract…',
  'Identifying variation clauses…',
  'Calculating entitlements…',
  'Drafting your report…',
]

interface Props {
  done: boolean
  onComplete: () => void
}

export default function AnalyzingStep({ done, onComplete }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [minElapsed, setMinElapsed] = useState(false)

  // Cycle messages every 1.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  // Enforce minimum 4-second display
  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  // Advance when both done and min elapsed
  useEffect(() => {
    if (done && minElapsed) onComplete()
  }, [done, minElapsed, onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mx-auto mb-8" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          We're analysing your contract…
        </h2>
        <p className="text-gray-500 text-sm">This usually takes 20–40 seconds</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-8 py-5 min-w-[260px]">
        {MESSAGES.map((msg, i) => (
          <div
            key={msg}
            className={`flex items-center gap-3 py-2 transition-all text-sm ${
              i < msgIndex
                ? 'text-green-600'
                : i === msgIndex
                ? 'text-gray-900 font-semibold'
                : 'text-gray-300'
            }`}
          >
            <span className="w-4 text-center flex-shrink-0">
              {i < msgIndex ? '✓' : i === msgIndex ? '›' : '·'}
            </span>
            {msg}
          </div>
        ))}
      </div>
    </div>
  )
}
