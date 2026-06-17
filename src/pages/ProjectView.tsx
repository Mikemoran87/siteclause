import { useState, useEffect } from 'react'
import { getProject } from '../lib/db'
import type { Project } from '../lib/db'
import OverviewTab from '../components/project/OverviewTab'
import ContractTab from '../components/project/ContractTab'
import CorrespondenceTab from '../components/project/CorrespondenceTab'
import VariationsTab from '../components/project/VariationsTab'
import NoticesTab from '../components/project/NoticesTab'
import ChatTab from '../components/project/ChatTab'

type Tab = 'overview' | 'contract' | 'correspondence' | 'variations' | 'notices' | 'chat'

interface Props {
  projectId: string
  userId: string
  onBack: () => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏗️' },
  { id: 'contract', label: 'Contract', icon: '📄' },
  { id: 'correspondence', label: 'Correspondence', icon: '📧' },
  { id: 'variations', label: 'Variations', icon: '📋' },
  { id: 'notices', label: 'Notices', icon: '📬' },
  { id: 'chat', label: 'Chat', icon: '💬' },
]

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading project…</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Project not found.</div>
          <button onClick={onBack} className="text-[#1B4332] font-semibold">← Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#1B4332] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-green-300 hover:text-white transition-colors text-sm font-semibold flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <span className="text-green-700">|</span>
          <div className="text-white font-bold text-sm truncate max-w-xs">{project.name}</div>
        </div>
        <div className="text-xl font-black tracking-tight">
          <span className="text-amber-400">Site</span>
          <span className="text-white">Clause</span>
        </div>
      </nav>

      {/* Project title bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {project.main_contractor && <span>{project.main_contractor}</span>}
              {project.contract_value && <span>· {project.contract_value}</span>}
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
            project.status === 'Active' ? 'bg-green-100 text-green-700' :
            project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
            project.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#1B4332] text-[#1B4332]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab project={project} onUpdated={loadProject} />
        )}
        {activeTab === 'contract' && (
          <ContractTab projectId={projectId} userId={userId} />
        )}
        {activeTab === 'correspondence' && (
          <CorrespondenceTab projectId={projectId} userId={userId} />
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
    </div>
  )
}
