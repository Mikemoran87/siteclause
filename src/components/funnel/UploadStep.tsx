import { useRef, useState } from 'react'
import { DEMO_CONTRACT } from '../../lib/demo-data'

interface Props {
  onFile: (file: File) => void
}

export default function UploadStep({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setLoaded(file.name)
    onFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const loadDemo = () => {
    const file = new File([DEMO_CONTRACT], 'demo-jct-subcontract.txt', { type: 'text/plain' })
    handleFile(file)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
        See how much money<br className="hidden md:block" /> you're owed
      </h1>
      <p className="text-gray-500 text-base md:text-lg mb-10 max-w-md leading-relaxed">
        Upload your subcontract. We'll find every variation claim<br className="hidden md:block" /> you're entitled to. No account needed.
      </p>

      {/* Upload area */}
      <div
        onClick={() => !loaded && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`w-full max-w-md border-2 border-dashed rounded-2xl p-10 transition-colors cursor-pointer ${
          loaded
            ? 'border-amber-400 bg-amber-50 cursor-default'
            : dragging
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-200 hover:border-amber-300 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loaded ? (
          <div>
            <div className="text-3xl mb-3">📄</div>
            <div className="font-bold text-gray-800 text-sm mb-1">{loaded}</div>
            <div className="text-xs text-amber-600">
              Ready — scroll down to continue
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📋</div>
            <div className="font-semibold text-gray-700 mb-2">Drop your contract here or click to browse</div>
            <div className="text-sm text-gray-400">PDF or .txt — no account needed</div>
          </div>
        )}
      </div>

      {loaded ? (
        <p className="mt-4 text-xs text-gray-400">
          Wrong file?{' '}
          <button onClick={() => { setLoaded(null); inputRef.current?.click() }} className="underline">
            Replace it
          </button>
        </p>
      ) : (
        <button
          onClick={loadDemo}
          className="mt-5 text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700 transition-colors"
        >
          Or try with a demo contract →
        </button>
      )}
    </div>
  )
}
