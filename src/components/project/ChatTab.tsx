import { useState, useEffect, useRef } from 'react'
import { getContracts, saveChatMessage, getChatMessages, getRateCard } from '../../lib/db'
import type { ChatMessage, Rate } from '../../lib/db'

interface Props {
  projectId: string
  userId: string
  projectName: string
}

const SUGGESTED_QUESTIONS = [
  'If the MC is late delivering materials, can I claim delay damages?',
  'What does the variation notice clause mean in plain English?',
  'Can the main contractor back-charge me without notice?',
  'How long do I have to submit a payment application?',
  'What happens if I do extra work without a written instruction?',
]

export default function ChatTab({ projectId, userId, projectName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [contractText, setContractText] = useState('')
  const [rateCard, setRateCard] = useState<Rate[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    init()
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const init = async () => {
    setInitialLoading(true)
    const [allDocs, history, rates] = await Promise.all([
      getContracts(projectId),
      getChatMessages(projectId),
      getRateCard(projectId),
    ])
    const combined = allDocs.map(c => `=== ${c.doc_type ?? 'Document'}: ${c.label ?? c.filename} ===\n${c.content ?? ''}`).join('\n\n')
    setContractText(combined)
    setMessages(history)
    setRateCard(rates)
    setInitialLoading(false)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: userId,
      project_id: projectId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    await saveChatMessage(projectId, userId, 'user', text)

    const history = [...messages, userMsg].map(m => ({ role: m.role ?? 'user', content: m.content ?? '' }))

    // Build rate card context string
    let rateContext = ''
    if (rateCard.length > 0) {
      const rows = rateCard.map(r =>
        `${r.category} | ${r.description} | ${r.unit} | ${r.unit === '%' ? r.rate + '%' : '€' + r.rate}`
      ).join('\n')
      rateContext = `\n\nProject Rate Card (use these rates when calculating variation values):\nCategory | Description | Unit | Rate\n${rows}`
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText: contractText + rateContext, messages: history }),
      })
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      const reply = data.reply ?? 'Sorry, no response.'

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        project_id: projectId,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      await saveChatMessage(projectId, userId, 'assistant', reply)
    } catch {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        project_id: projectId,
        role: 'assistant',
        content: 'Sorry, I had trouble with that. Please try again.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    }
    setLoading(false)
  }

  if (initialLoading) return <div className="py-10 text-center text-gray-400">Loading chat…</div>

  if (!contractText) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="font-bold text-gray-700 mb-1">No contract uploaded</h3>
        <p className="text-sm text-gray-400">Upload your contract in the Contract tab to enable AI chat.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">SC</div>
        <div>
          <div className="font-bold text-gray-900 text-sm">Ask Your Contract</div>
          <div className="text-xs text-gray-400">{projectName} · AI contract advisor</div>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-4 md:px-5 pt-4 pb-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Suggested questions</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-full hover:bg-amber-100 transition-colors text-left min-h-[36px]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Welcome message */}
      {messages.length === 0 && (
        <div className="px-4 md:px-5 py-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700">
              I've read your {projectName} contract. Ask me anything about your entitlements, notice requirements, payment terms, or what any clause means.
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-4 md:px-5 py-4 space-y-4 max-h-[60vh] md:max-h-96 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5">SC</div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-white rounded-tr-sm'
                  : 'bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-4 md:px-5 py-3 md:py-4 border-t border-gray-100">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex gap-2 md:gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your contract…"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332] min-h-[44px]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-40 text-white font-bold px-4 md:px-5 py-3 rounded-xl text-sm transition-colors min-h-[44px]"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-300 mt-2">AI-generated guidance only — not legal advice</p>
      </div>
    </div>
  )
}
