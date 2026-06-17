import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProjects, createProject, deleteProject, getVariations } from '../lib/db'
import type { Project, ProjectInput } from '../lib/db'

interface Props {
  userId: string
  onSelectProject: (projectId: string) => void
}

interface ProjectWithCount extends Project {
  variationCount: number
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  'On Hold': 'bg-gray-100 text-gray-600',
  Disputed: 'bg-red-100 text-red-700',
}

export default function Dashboard({ userId, onSelectProject }: Props) {
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState<ProjectInput>({
    name: '',
    main_contractor: '',
    contract_value: '',
    start_date: '',
    status: 'Active',
    notes: '',
  })

  useEffect(() => {
    loadProjects()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [userId])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const raw = await getProjects(userId)
      const enriched: ProjectWithCount[] = await Promise.all(
        raw.map(async (p) => {
          const variations = await getVariations(p.id)
          return { ...p, variationCount: variations.length }
        })
      )
      setProjects(enriched)
    } catch (e) {
      console.error('Failed to load projects', e)
    }
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Project name is required.')
      return
    }
    setSubmitting(true)
    try {
      await createProject(userId, form)
      setShowNewForm(false)
      setForm({ name: '', main_contractor: '', contract_value: '', start_date: '', status: 'Active', notes: '' })
      await loadProjects()
    } catch (e: any) {
      setFormError(e.message || 'Failed to create project.')
    }
    setSubmitting(false)
  }

  const handleDelete = async (projectId: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) return
    try {
      await deleteProject(projectId)
      await loadProjects()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ── */}
      <nav className="bg-[#111] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="text-xl font-black tracking-tight select-none">
          <span className="text-[#F59E0B]">Site</span>
          <span className="text-white">Clause</span>
        </div>
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-gray-400 text-sm hidden sm:block">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-gray-300 hover:text-white text-sm border border-gray-600 hover:border-gray-400 rounded-full px-4 py-1.5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Projects</h1>
            <p className="text-sm text-gray-400 mt-1">Track variations, deadlines, and contract claims</p>
          </div>
          <button
            onClick={() => { setShowNewForm(true); setFormError('') }}
            className="bg-[#111] hover:bg-[#333] text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
          >
            + New Project
          </button>
        </div>

        {/* ── New Project Form ── */}
        {showNewForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">New Project</h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Oakfield Rise — Civil Works"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Main Contractor
                  </label>
                  <input
                    type="text" value={form.main_contractor}
                    onChange={e => setForm(f => ({ ...f, main_contractor: e.target.value }))}
                    placeholder="e.g. Bradstone Construction"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Contract Value
                  </label>
                  <input
                    type="text" value={form.contract_value}
                    onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))}
                    placeholder="e.g. £2,850,000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Start Date
                  </label>
                  <input
                    type="date" value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option>Active</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                    <option>Disputed</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button" onClick={() => setShowNewForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="bg-[#111] hover:bg-[#333] disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-full text-sm transition-colors"
                >
                  {submitting ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Projects List ── */}
        {loading ? (
          <div className="text-center py-24 text-gray-400 text-sm">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🏗️</div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">No projects yet</h2>
            <p className="text-gray-400 text-sm mb-8">Create your first project to start tracking contract claims.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="bg-[#111] hover:bg-[#333] text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-gray-400 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    className="text-gray-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete project"
                  >×</button>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1 leading-tight">{p.name}</h3>

                {p.main_contractor && (
                  <p className="text-xs text-gray-400 mb-3">{p.main_contractor}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                  {p.contract_value && <span>{p.contract_value}</span>}
                  <span className="ml-auto">{p.variationCount} variation{p.variationCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
