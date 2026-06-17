import { supabase } from './supabase'

// ── Project types ──────────────────────────────────────────────────────────────

export interface Project {
  id: string
  user_id: string
  name: string
  main_contractor?: string
  contract_value?: string
  start_date?: string
  status: string
  notes?: string
  created_at: string
}

export interface ProjectInput {
  name: string
  main_contractor?: string
  contract_value?: string
  start_date?: string
  status?: string
  notes?: string
}

export interface Contract {
  id: string
  user_id: string
  project_id: string
  filename?: string
  content?: string
  uploaded_at: string
}

export interface Correspondence {
  id: string
  user_id: string
  project_id: string
  content?: string
  source?: string
  uploaded_at: string
}

export interface Variation {
  id: string
  user_id: string
  project_id: string
  title?: string
  description?: string
  value?: string
  status: string
  deadline?: string
  notice_drafted?: string
  created_at: string
}

export interface VariationInput {
  title?: string
  description?: string
  value?: string
  status?: string
  deadline?: string
  notice_drafted?: string
}

export interface ChatMessage {
  id: string
  user_id: string
  project_id: string
  role?: string
  content?: string
  created_at: string
}

// ── Projects ───────────────────────────────────────────────────────────────────

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(userId: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error) return null
  return data
}

export async function updateProject(projectId: string, input: Partial<ProjectInput>): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', projectId)
  if (error) throw error
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
  if (error) throw error
}

// ── Contracts ──────────────────────────────────────────────────────────────────

export async function saveContract(
  projectId: string,
  userId: string,
  filename: string,
  content: string
): Promise<Contract> {
  // Delete existing contract for this project first
  await supabase.from('contracts').delete().eq('project_id', projectId)

  const { data, error } = await supabase
    .from('contracts')
    .insert({ project_id: projectId, user_id: userId, filename, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getContract(projectId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}

// ── Correspondence ─────────────────────────────────────────────────────────────

export async function saveCorrespondence(
  projectId: string,
  userId: string,
  content: string,
  source: string
): Promise<Correspondence> {
  const { data, error } = await supabase
    .from('correspondence')
    .insert({ project_id: projectId, user_id: userId, content, source })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCorrespondence(projectId: string): Promise<Correspondence[]> {
  const { data, error } = await supabase
    .from('correspondence')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteCorrespondence(id: string): Promise<void> {
  const { error } = await supabase.from('correspondence').delete().eq('id', id)
  if (error) throw error
}

// ── Variations ─────────────────────────────────────────────────────────────────

export async function saveVariation(
  projectId: string,
  userId: string,
  input: VariationInput
): Promise<Variation> {
  const { data, error } = await supabase
    .from('variations')
    .insert({ ...input, project_id: projectId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getVariations(projectId: string): Promise<Variation[]> {
  const { data, error } = await supabase
    .from('variations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateVariationStatus(variationId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('variations')
    .update({ status })
    .eq('id', variationId)
  if (error) throw error
}

export async function deleteVariation(variationId: string): Promise<void> {
  const { error } = await supabase.from('variations').delete().eq('id', variationId)
  if (error) throw error
}

// ── Chat Messages ──────────────────────────────────────────────────────────────

export async function saveChatMessage(
  projectId: string,
  userId: string,
  role: string,
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ project_id: projectId, user_id: userId, role, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getChatMessages(projectId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function clearChatMessages(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('project_id', projectId)
  if (error) throw error
}
