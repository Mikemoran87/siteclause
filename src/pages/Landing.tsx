import WaitlistForm from '../components/WaitlistForm'

interface Props {
  onStart: () => void
  onLogin?: () => void
}

export default function Landing({ onStart, onLogin }: Props) {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-2xl font-black text-amber-500 tracking-tight">
          Site<span className="text-gray-900">Clause</span>
        </div>
        <div className="flex items-center gap-3">
          {onLogin && (
            <button onClick={onLogin} className="text-gray-600 hover:text-gray-900 font-semibold text-sm transition-colors">
              Log in
            </button>
          )}
          <button onClick={onStart} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
            Try Free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-wide">
          ⚖️ PW-CF3 · JCT · NEC · FIDIC · RIAI
        </div>

        <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
          Your subcontract is full of money<br />
          <span className="text-amber-500">you don't know you're owed.</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-4">
          Most subcontractors don't know what they're entitled to claim — until it's too late to claim it.
        </p>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          SiteClause reads your contract, finds every variation and compensation event, tracks every notice deadline, and drafts your formal notices. In under 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onStart} className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-amber-200">
            Analyse My Contract — Free →
          </button>
          <button onClick={onStart} className="border-2 border-amber-500 text-amber-600 hover:bg-amber-50 text-base font-bold px-8 py-4 rounded-xl transition-colors">
            See the Demo →
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-4">No signup. No credit card. No documents needed for the demo.</p>
      </section>

      {/* Positioning line */}
      <section className="bg-gray-900 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-black text-white leading-snug">
            Other tools help you <span className="text-amber-400">defend</span> claims you already know about.<br />
            SiteClause <span className="text-amber-400">finds</span> the ones you don't.
          </p>
          <p className="text-gray-400 text-sm mt-4 max-w-xl mx-auto">
            There's no ERF to fill in. No cause-and-effect workflow to complete. Just upload your contract and correspondence — SiteClause does the rest.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '3–5%', label: 'of contract value lost to unclaimed variations on a typical project' },
            { value: '< 2 min', label: 'from upload to full claim analysis and drafted notices' },
            { value: '0', label: 'QS or lawyers needed to get your full entitlement' },
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
        <h2 className="text-3xl font-black text-gray-900 text-center mb-4">The money is in your contract.</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">The only question is whether you claim it before the deadline passes.</p>
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-5 py-3">
              <span className="text-xs font-bold text-red-700 uppercase tracking-widest">⚠️ Without SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                'MC says "we\'ll sort the VO later" — it never gets agreed',
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
              Industry average: 3–5% of contract value lost to unclaimed variations
            </div>
          </div>

          <div className="rounded-2xl border-2 border-amber-400 overflow-hidden shadow-lg shadow-amber-100">
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">✓ With SiteClause</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                'Upload contract + emails — AI reads everything in seconds',
                'Every variation event found, valued and categorised automatically',
                'Deadline tracker shows exactly what\'s urgent and what\'s safe',
                'Draft notices generated, ready to send in one click',
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

      {/* Ask Your Contract */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide w-fit">
                AI Contract Chat
              </div>
              <h2 className="text-3xl font-black text-white leading-tight mb-4">Ask your contract anything.</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Once SiteClause reads your contract, ask it anything in plain English. What are my notice deadlines? Can the MC back-charge me without notice? What does Clause 10.3 actually mean?
              </p>
              <div className="space-y-2">
                {[
                  "If ESB are blocking my works, can I claim delay damages?",
                  "What happens if I do extra work without a written VO?",
                  "How long do I have to submit a compensation event notice?",
                ].map(q => (
                  <div key={q} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-amber-500 flex-shrink-0">→</span>
                    <span className="italic">"{q}"</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 p-8 flex flex-col justify-center gap-4">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
                <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 leading-relaxed">
                  I've read your PW-CF3 subcontract. I can see 9 unvalued compensation events. Ask me anything.
                </div>
              </div>
              <div className="flex gap-3 items-start justify-end">
                <div className="bg-amber-500 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed">
                  ESB has been blocking my works since March. What can I claim?
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">SC</div>
                <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 leading-relaxed">
                  Under <span className="text-amber-400 font-semibold">PW-CF3 Clause 10.3</span>, utility blockages are a Compensation Event. You must give written notice within <span className="text-amber-400 font-semibold">28 days</span>. Based on your programme, that's 42 calendar days of delay — <span className="text-amber-400 font-semibold">30 working days × your day rate</span>. I've drafted the notice ready to send.
                  <span className="block text-gray-500 text-xs mt-2">AI guidance only, not legal advice.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-4">Built for people running the job</h2>
          <p className="text-center text-gray-500 text-sm mb-10 max-w-xl mx-auto">Not for disputes lawyers. Not for adjudication consultants. For the subcontractor owner-manager who tracks variations on a spreadsheet and knows there's money he's not getting.</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '🏗️', title: 'Civil & Groundworks', desc: 'PW-CF3 compensation events, utility diversions, access delays. Every claim found and noticed on time.' },
              { icon: '⚡', title: 'M&E Subcontractors', desc: 'JCT and NEC variation orders. Out-of-sequence working, late drawings, verbal instructions — all captured.' },
              { icon: '🔨', title: 'Specialist Contractors', desc: 'RIAI and FIDIC contracts. From steel fixers to curtain wallers — SiteClause reads any contract type.' },
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

      {/* Waitlist */}
      <section className="bg-gray-900 py-10 px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Early Access</div>
          <h3 className="text-xl font-black text-white mb-2">Want SiteClause on every project?</h3>
          <p className="text-gray-400 text-sm mb-6">Leave your email to be first when full project tracking, deadline alerts, and WhatsApp intake go live.</p>
          <WaitlistForm />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Find out what you're owed.</h2>
        <p className="text-gray-500 mb-8">Upload your contract. SiteClause finds the claims. You send the notices.</p>
        <button onClick={onStart} className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold px-10 py-4 rounded-xl transition-colors shadow-lg shadow-amber-200">
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
