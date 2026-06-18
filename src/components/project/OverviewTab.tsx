import { useState } from 'react'
import { updateProject } from '../../lib/db'
import type { Project, ProjectInput } from '../../lib/db'

interface Props {
  project: Project
  onUpdated: () => void
}

export default function OverviewTab({ project, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProjectInput>({
    name: project.name,
    main_contractor: project.main_contractor ?? '',
    contract_value: project.contract_value ?? '',
    start_date: project.start_date ?? '',
    status: project.status,
    notes: project.notes ?? '',
  })

  const handleSave = async () => {
    setSaving(true)
    await updateProject(project.id, form)
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Project Details</h2>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-[#1B4332] font-semibold border border-[#1B4332] rounded-lg px-3 py-2 hover:bg-green-50 transition-colors min-h-[44px] flex items-center"
            >
              Edit
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Project Name</dt>
              <dd className="mt-1 font-semibold text-gray-900">{project.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status</dt>
              <dd className="mt-1 font-semibold text-gray-900">{project.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Main Contractor</dt>
              <dd className="mt-1 text-gray-700">{project.main_contractor || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Contract Value</dt>
              <dd className="mt-1 text-gray-700">{project.contract_value || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Start Date</dt>
              <dd className="mt-1 text-gray-700">{project.start_date || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide">Created</dt>
              <dd className="mt-1 text-gray-700">{new Date(project.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
          {project.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Notes</dt>
              <dd className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</dd>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <h2 className="font-bold text-gray-900 mb-4">Edit Project Details</h2>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Project Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Main Contractor</label>
          <input
            type="text"
            value={form.main_contractor}
            onChange={e => setForm(f => ({ ...f, main_contractor: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Contract Value</label>
          <input
            type="text"
            value={form.contract_value}
            onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Start Date</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          >
            <option>Active</option>
            <option>On Hold</option>
            <option>Completed</option>
            <option>Disputed</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col md:flex-row gap-3 md:justify-end">
        <button
          onClick={() => setEditing(false)}
          className="w-full md:w-auto text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-3 min-h-[44px]"
        >Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-sm min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
