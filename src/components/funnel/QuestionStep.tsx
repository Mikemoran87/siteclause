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
  stepIndex: number   // 0-based among questions (0,1,2)
  totalSteps: number  // total question count
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
  // Progress: questions are steps 1–3 out of 1–4 overall (upload already done)
  // We show progress within the questions phase: (stepIndex+1)/totalSteps
  // But visually represent as 25%→50%→75% for 3 questions
  const progressPct = Math.round(((stepIndex + 1) / (totalSteps + 1)) * 100)

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
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              selected === opt.value
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-[#F5F5F5] text-gray-800 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back
      </button>
    </div>
  )
}
