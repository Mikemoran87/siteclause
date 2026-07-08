import { useState } from 'react'

interface Option {
  label: string
  value: string
}

interface Props {
  question: string
  options: Option[]
  selected: string | null
  onSelect: (value: string) => void
  onBack: () => void
  stepIndex: number
  totalSteps: number
}

export default function QuestionStep({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepIndex,
  totalSteps,
}: Props) {
  const [otherText, setOtherText] = useState('')
  const [showOther, setShowOther] = useState(false)

  const progressPct = Math.round(((stepIndex + 1) / (totalSteps + 1)) * 100)

  const handleOptionClick = (opt: Option) => {
    if (opt.value === 'other') {
      setShowOther(true)
    } else {
      setShowOther(false)
      onSelect(opt.value)
    }
  }

  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      onSelect(`other:${otherText.trim()}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-12">
      {/* Progress */}
      <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
        <span>Step {stepIndex + 2} of {totalSteps + 2}</span>
        <span>{progressPct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-10 overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 leading-tight">
        {question}
      </h2>

      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleOptionClick(opt)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              (selected === opt.value || (opt.value === 'other' && showOther))
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-[#F5F5F5] text-gray-800 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Other text input */}
      {showOther && (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            autoFocus
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleOtherSubmit()}
            placeholder="Type your type of work…"
            className="w-full border-2 border-gray-900 rounded-xl px-5 py-4 text-base font-semibold focus:outline-none"
          />
          <button
            onClick={handleOtherSubmit}
            disabled={!otherText.trim()}
            className="w-full bg-[#111] hover:bg-[#333] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-full text-sm transition-colors min-h-[56px]"
          >
            Continue →
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back
      </button>
    </div>
  )
}
