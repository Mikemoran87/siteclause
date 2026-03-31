import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  contractText: string
  projectName: string
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

const SUGGESTED_QUESTIONS = [
  "If the MC is late delivering materials, can I claim delay damages?",
  "What does the variation notice clause mean in plain English?",
  "Can the main contractor back-charge me without notice?",
  "How long do I have to submit a payment application?",
  "What happens if I do extra work without a written instruction?",
]

export default function ContractChat({ contractText, projectName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I've read your ${projectName} contract. Ask me anything about it — your entitlements, notice requirements, payment terms, or what any clause means in plain English.`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are SiteClause, an expert AI construction contract advisor. You have read the following subcontract and can answer any question about it clearly and precisely.

Your job is to help contractors and subcontractors understand their rights, obligations, and entitlements under this contract. Always:
- Answer in plain English — no legal jargon unless asked
- Reference specific clause numbers when relevant
- Be direct and practical — tell them what they can actually do
- If they ask about claiming something, tell them the exact steps and deadlines
- Always add a brief disclaimer at the end: "Note: This is AI-generated guidance, not legal advice."

CONTRACT:
${contractText.slice(0, 10000)}`
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text }
          ],
          temperature: 0.3,
        }),
      })

      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      const reply = data.choices[0].message.content
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble answering that. Please check your OpenAI credits and try again.'
      }])
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">SC</div>
        <div>
          <div className="font-bold text-gray-900 text-sm">Ask Your Contract</div>
          <div className="text-xs text-gray-400">AI contract advisor — plain English answers, no jargon</div>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-5 pt-4 pb-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Suggested questions</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5">SC</div>
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
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-100">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about your contract..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-300 mt-2">AI-generated guidance only — not legal advice</p>
      </div>
    </div>
  )
}
