export default function AuthPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-xl md:text-2xl font-black tracking-tight select-none">
            <span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span>
          </div>
          <a
            href="/login"
            className="bg-[#111] hover:bg-[#333] text-white text-sm font-semibold px-4 md:px-5 py-2 md:py-2.5 rounded-full transition-colors min-h-[44px] flex items-center"
          >
            Log in →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #FFF8F5 0%, #F5F0FF 100%)' }} className="px-4 md:px-6 pt-12 pb-10 md:pt-24 md:pb-20 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 md:mb-6">
            Construction Contract Intelligence
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-5 md:mb-6">
            Your subcontract is full of money<br className="hidden md:block" />
            {' '}you don't know you're owed.
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-8 md:mb-10">
            Upload your contract and site correspondence. SiteClause finds every variation claim,
            tracks every deadline, and drafts your formal notices.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <a
              href="/analyse"
              className="w-full sm:w-auto bg-[#111] hover:bg-[#333] text-white font-semibold px-8 py-3.5 rounded-full text-base transition-colors min-h-[44px] flex items-center justify-center"
            >
              See What You're Owed →
            </a>
          </div>
          <p className="text-sm text-gray-400">No credit card needed. No account required.</p>

          {/* Product Mockup */}
          <div className="mt-10 md:mt-16 max-w-3xl mx-auto hidden sm:block">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Browser chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-left border border-gray-200">
                  app.siteclause.io/dashboard
                </div>
              </div>
              {/* Mock app content */}
              <div className="bg-white p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-black"><span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">mike@example.com</span>
                    <span className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-500">Sign Out</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-base font-black text-gray-900">My Projects</div>
                    <div className="text-xs text-gray-400 mt-0.5">Track variations, deadlines, and contract claims</div>
                  </div>
                  <div className="bg-[#111] text-white text-xs rounded-full px-4 py-2">+ New Project</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Oakfield Rise — Civil Works', mc: 'Bradstone Construction', value: '€2,850,000', vars: 7, status: 'Active' },
                    { name: 'Harbour Gate Tower B', mc: 'Connell Group', value: '€1,200,000', vars: 3, status: 'Active' },
                    { name: 'Westfield Retail Fit-Out', mc: 'Murphy & Sons', value: '€680,000', vars: 1, status: 'On Hold' },
                  ].map((p) => (
                    <div key={p.name} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-gray-900 leading-tight mb-1">{p.name}</div>
                      <div className="text-xs text-gray-400 mb-3">{p.mc}</div>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                        <span>{p.value}</span>
                        <span>{p.vars} variations</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="bg-white border-y border-gray-100 py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 md:px-6 grid grid-cols-1 sm:grid-cols-3 gap-0 sm:divide-x divide-gray-100 text-center">
          {[
            { value: '3–5%', label: 'of contract value lost to unclaimed variations' },
            { value: '< 2 min', label: 'from upload to full claim analysis' },
            { value: '0', label: 'lawyers or QS needed to get your entitlement' },
          ].map((s) => (
            <div key={s.value} className="px-6 md:px-8 py-5 md:py-4 border-b sm:border-b-0 border-gray-100 last:border-b-0">
              <div className="text-3xl md:text-4xl font-black text-gray-900 mb-2">{s.value}</div>
              <div className="text-sm text-gray-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white py-14 md:py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                label: 'Variation Tracking',
                heading: 'Every claim, automatically identified.',
                desc: 'SiteClause reads every page of your contract and correspondence, flagging variation events, valuing them, and tracking their status — so nothing slips through.',
              },
              {
                label: 'Notice Drafting',
                heading: 'Formal notices drafted in seconds.',
                desc: 'Generate contractually compliant variation notices, extension of time claims, and loss & expense letters — ready to review and send.',
              },
              {
                label: 'Ask Your Contract',
                heading: 'Plain English answers from your actual contract.',
                desc: 'Ask any question about your contract in plain language. What are my notice deadlines? Can I claim delay damages? What does clause 5.3 mean?',
              },
            ].map((f) => (
              <div key={f.label} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{f.label}</p>
                <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">{f.heading}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ── */}
      <section className="bg-[#FAFAFA] border-y border-gray-100 py-14 md:py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-8 md:mb-14">
            What happens without SiteClause
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Without */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Without SiteClause</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  "Main contractor says \"we'll sort the VO later\" — it never happens",
                  'Variation emails pile up, nobody submits a formal claim',
                  'Notice deadline passes — entitlement is lost',
                  'Final account comes in 15% short — no paperwork to fight it',
                  'You absorb the loss and move on',
                ].map((t) => (
                  <div key={t} className="flex gap-3 items-start">
                    <span className="text-gray-300 mt-0.5 text-sm flex-shrink-0">✗</span>
                    <span className="text-sm text-gray-600">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-center text-xs text-gray-500 font-medium">
                Industry estimate: 3–5% of contract value lost
              </div>
            </div>
            {/* With */}
            <div className="rounded-2xl border-2 border-gray-900 overflow-hidden shadow-md">
              <div className="bg-gray-900 border-b border-gray-800 px-5 py-3">
                <span className="text-xs font-bold text-white uppercase tracking-widest">With SiteClause</span>
              </div>
              <div className="p-5 space-y-3">
                {[
                  'Upload contract + emails — AI reads everything in seconds',
                  'Every variation event identified, valued, and categorised',
                  "Deadline tracker shows exactly what's urgent and what's safe",
                  'Draft notices generated, ready to send with one click',
                  'Full entitlement recovered at final account',
                ].map((t) => (
                  <div key={t} className="flex gap-3 items-start">
                    <span className="text-gray-900 mt-0.5 text-sm flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-600">{t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border-t border-gray-800 px-5 py-3 text-center text-xs text-white font-medium">
                Full entitlement recovered — in 2 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-white py-16 md:py-24 px-4 md:px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
            Ready to see what you're owed?
          </h2>
          <p className="text-gray-500 mb-8 text-base leading-relaxed">
            Upload your contract. Find your claims. No signup needed to get started.
          </p>
          <a
            href="/analyse"
            className="inline-block bg-[#111] hover:bg-[#333] text-white font-semibold px-10 py-4 rounded-full text-base transition-colors"
          >
            See What You're Owed →
          </a>
          <p className="text-sm text-gray-400 mt-4">Free. No credit card. Takes 2 minutes.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-black">
            <span className="text-[#F59E0B]">Site</span><span className="text-gray-900">Clause</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="/login" className="hover:text-gray-600">Log in</a>
            <span>hello@siteclause.io</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
