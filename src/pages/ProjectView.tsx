import { useState, useEffect } from 'react'
import { getProject } from '../lib/db'
import type { Project } from '../lib/db'
import OverviewTab from '../components/project/OverviewTab'
import ContractTab from '../components/project/ContractTab'
import CorrespondenceTab from '../components/project/CorrespondenceTab'
import RateCardTab from '../components/project/RateCardTab'
import VariationsTab from '../components/project/VariationsTab'
import NoticesTab from '../components/project/NoticesTab'
import ChatTab from '../components/project/ChatTab'
import BottomNav from '../components/BottomNav'

type Tab = 'overview' | 'contract' | 'correspondence' | 'rates' | 'variations' | 'notices' | 'chat'

interface Props {
  projectId: string
  userId: string
  onBack: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'contract', label: 'Contract' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'rates', label: 'Rates' },
  { id: 'variations', label: 'Variations' },
  { id: 'notices', label: 'Notices' },
  { id: 'chat', label: 'Chat' },
]

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-gray-100 text-gray-600',
  Disputed: 'bg-red-100 text-red-700',
}

export default function ProjectView({ projectId, userId, onBack }: Props) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    setLoading(true)
    const p = await getProject(projectId)
    setProject(p)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading project…</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4 text-sm">Project not found.</div>
          <button onClick={onBack} className="text-gray-700 font-semibold text-sm hover:text-gray-900">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Top Nav ── */}
      <nav className="bg-[#111] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="text-base md:text-lg font-black tracking-tight cursor-pointer">
            <span className="text-[#F59E0B]">Site</span>
            <span className="text-white">Clause</span>
          </a>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm transition-colors min-h-[44px] flex items-center"
        >
          ← Dashboard
        </button>
      </nav>

      {/* ── Breadcrumb + Project Title ── */}
      <div className="border-b border-gray-100 bg-white px-4 md:px-6 py-3 md:py-5">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb — hidden on mobile to save space */}
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 mb-3">
            <button onClick={onBack} className="hover:text-gray-600 transition-colors">SiteClause</button>
            <span>/</span>
            <span className="text-gray-700 font-medium">{project.name}</span>
          </div>
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-gray-900 leading-tight">{project.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 md:mt-1 text-xs md:text-sm text-gray-400 flex-wrap">
                {project.main_contractor && <span>{project.main_contractor}</span>}
                {project.contract_value && (
                  <>
                    {project.main_contractor && <span>·</span>}
                    <span>{project.contract_value}</span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab Bar — desktop only ── */}
      <div className="hidden md:block bg-white border-b border-gray-100 sticky top-[57px] z-40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">
        {activeTab === 'overview' && (
          <OverviewTab project={project} onUpdated={loadProject} />
        )}
        {activeTab === 'contract' && (
          <ContractTab projectId={projectId} userId={userId} />
        )}
        {activeTab === 'correspondence' && (
          <CorrespondenceTab
            projectId={projectId}
            userId={userId}
            emailPrefix={project.email_prefix ?? `sc-${project.id.slice(0, 8)}`}
          />
        )}
        {activeTab === 'rates' && (
          <RateCardTab projectId={projectId} userId={userId} />
        )}
        {activeTab === 'variations' && (
          <VariationsTab projectId={projectId} userId={userId} />
        )}
        {activeTab === 'notices' && (
          <NoticesTab projectId={projectId} />
        )}
        {activeTab === 'chat' && (
          <ChatTab projectId={projectId} userId={userId} projectName={project.name} />
        )}
      </div>

      {/* ── Bottom Nav — mobile only ── */}
      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} />
    </div>
  )
}
