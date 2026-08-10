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
  email_prefix?: string
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
  file_data?: string  // base64 data URL of original file
  file_type?: string  // MIME type e.g. 'application/pdf'
  uploaded_at: string
}

export interface Correspondence {
  id: string
  user_id: string
  project_id: string
  content?: string
  source?: string
  file_data?: string  // base64 data URL of original file
  file_type?: string  // MIME type
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
  const id = crypto.randomUUID()
  const email_prefix = `sc-${id.slice(0, 8)}`
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, id, user_id: userId, email_prefix })
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
  content: string,
  fileData?: string,  // base64 data URL
  fileType?: string
): Promise<Contract> {
  // Delete existing contract for this project first
  await supabase.from('contracts').delete().eq('project_id', projectId)

  const row: Record<string, unknown> = { project_id: projectId, user_id: userId, filename, content }
  if (fileData) row.file_data = fileData
  if (fileType) row.file_type = fileType

  const { data, error } = await supabase
    .from('contracts')
    .insert(row)
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

export async function deleteContract(projectId: string): Promise<void> {
  await supabase.from('contracts').delete().eq('project_id', projectId)
}

// ── Correspondence ─────────────────────────────────────────────────────────────

export async function saveCorrespondence(
  projectId: string,
  userId: string,
  content: string,
  source: string,
  fileData?: string,  // base64 data URL
  fileType?: string
): Promise<Correspondence> {
  const row: Record<string, unknown> = { project_id: projectId, user_id: userId, content, source }
  if (fileData) row.file_data = fileData
  if (fileType) row.file_type = fileType

  const { data, error } = await supabase
    .from('correspondence')
    .insert(row)
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

export async function clearVariations(projectId: string): Promise<void> {
  await supabase.from('variations').delete().eq('project_id', projectId)
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

// ── Rate Cards ─────────────────────────────────────────────────────────────────

export interface Rate {
  category: string
  description: string
  unit: string
  rate: number
}

export async function getRateCard(projectId: string): Promise<Rate[]> {
  const { data, error } = await supabase
    .from('rate_cards')
    .select('rates')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return []
  return (data?.rates as Rate[]) ?? []
}

export async function saveRateCard(projectId: string, userId: string, rates: Rate[]): Promise<void> {
  // Upsert: delete existing then insert
  await supabase.from('rate_cards').delete().eq('project_id', projectId)
  const { error } = await supabase
    .from('rate_cards')
    .insert({ project_id: projectId, user_id: userId, rates, updated_at: new Date().toISOString() })
  if (error) throw error
}
