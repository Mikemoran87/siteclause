import WaitlistForm from '../components/WaitlistForm'

interface Props {
  onStart: () => void
}

export default function Landing({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-2xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <button
          onClick={onStart}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          Try Free →
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-wide">
          ⚖️ JCT · NEC · FIDIC · RIAI Contracts
        </div>

        <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
          Your subcontract is full of money<br />
          <span className="text-amber-500">you don't know you're owed.</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Upload your contract and site emails. SiteClause finds every variation claim, tracks every deadline, and drafts your notices — in under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStart}
            className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-amber-200"
          >
            Analyse My Contract — It's Free →
          </button>
          <button
            onClick={onStart}
            className="border-2 border-amber-500 text-amber-600 hover:bg-amber-50 text-base font-bold px-8 py-4 rounded-xl transition-colors"
          >
            Try the Demo →
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-4">No signup. No credit card. No documents needed for the demo.</p>
      </section>

      {/* Waitlist strip */}
      <section className="bg-gray-900 py-10 px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Early Access</div>
          <h3 className="text-xl font-black text-white mb-2">Want SiteClause on every project?</h3>
          <p className="text-gray-400 text-sm mb-6">Leave your email and be first to know when full project tracking, deadline alerts, and the CC email intake go live.</p>
          <WaitlistForm />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '1+', label: 'unclaimed variation on every project — most subcontractors never recover it' },
            { value: '< 2 min', label: 'from upload to full claim analysis and drafted notices' },
            { value: '0', label: 'lawyers or QS needed to get your full entitlement' },
          ].map((s) => (
            <div key={s.value}>
              <div className="text-4xl font-black text-amber-500 mb-2">{s.value}</div>
              <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-gray-900 text-center mb-12">
          What happens without SiteClause
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Before */}
          <div className="rounded-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <span className="text-xs font-bold text-red-700 uppercase tracking-widest">⚠️ Without SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                'Main contractor says "we\'ll sort the VO later" — it never happens',
                'Variation emails pile up, nobody submits a formal claim',
                'Notice deadline passes — entitlement is lost',
                'Final account comes in 15% short — no paperwork to fight it',
                'You absorb the loss and move on',
              ].map((t) => (
                <div key={t} className="flex gap-3 items-start">
                  <span className="text-red-400 mt-0.5 text-sm flex-shrink-0">✗</span>
                  <span className="text-sm text-gray-600">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-50 border-t border-red-100 px-5 py-3 text-center text-xs font-bold text-red-700">
              Industry estimate: 3–5% of contract value lost to unclaimed variations
            </div>
          </div>

          {/* After */}
          <div className="rounded-2xl border-2 border-amber-400 overflow-hidden shadow-lg shadow-amber-100">
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">✓ With SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                'Upload contract + emails — AI reads everything in seconds',
                'Every variation event identified, valued, and categorised',
                'Deadline tracker shows exactly what\'s urgent and what\'s safe',
                'Draft notices generated, ready to send with one click',
                'Full entitlement recovered at final account',
              ].map((t) => (
                <div key={t} className="flex gap-3 items-start">
                  <span className="text-amber-500 mt-0.5 text-sm flex-shrink-0">✓</span>
                  <span className="text-sm text-gray-600">{t}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border-t border-amber-200 px-5 py-3 text-center text-xs font-bold text-amber-800">
              Full entitlement recovered — in 2 minutes
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-10">Built for people on the ground</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '🏗️', title: 'Subcontractors', desc: 'Stop leaving money on the table. Know your entitlement before final account.' },
              { icon: '📋', title: 'Project Managers', desc: 'Track every contractual obligation across your projects. No surprises at handover.' },
              { icon: '💼', title: 'Quantity Surveyors', desc: 'AI-drafted notices and valuations ready to review, not start from scratch.' },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className="font-bold text-gray-900 mb-2">{c.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Ready to find your money?</h2>
        <p className="text-gray-500 mb-8">Upload your contract and emails. See what you're owed in under 2 minutes.</p>
        <button
          onClick={onStart}
          className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-amber-200"
        >
          Start Free Analysis →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-black text-amber-500">Site<span className="text-gray-900">Clause</span></div>
          <div className="text-sm text-gray-400">hello@siteclause.io · siteclause.io</div>
        </div>
      </footer>
    </div>
  )
}
