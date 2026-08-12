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
  file_data?: string
  file_type?: string
  label?: string
  doc_type?: string
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
  claim_date?: string
  notice_1_due?: string
  notice_1_sent?: boolean
  notice_2_due?: string
  notice_2_sent?: boolean
  next_monthly_due?: string
  source?: string   // 'contract' | 'programme' | 'manual'
  created_at: string
}

export interface VariationInput {
  title?: string
  description?: string
  value?: string
  status?: string
  deadline?: string
  notice_drafted?: string
  claim_date?: string
  notice_1_due?: string
  notice_1_sent?: boolean
  notice_2_due?: string
  notice_2_sent?: boolean
  next_monthly_due?: string
  source?: string
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
  fileData?: string,
  fileType?: string,
  label?: string,
  docType?: string
): Promise<Contract> {
  const row: Record<string, unknown> = {
    project_id: projectId,
    user_id: userId,
    filename,
    content,
    label: label ?? filename,
    doc_type: docType ?? 'Main Contract',
  }
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
  // Returns the most recently uploaded contract (for backwards compat)
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

export async function getContracts(projectId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: true })
  if (error) return []
  return data ?? []
}

export async function deleteContract(projectId: string): Promise<void> {
  await supabase.from('contracts').delete().eq('project_id', projectId)
}

export async function deleteContractById(contractId: string): Promise<void> {
  await supabase.from('contracts').delete().eq('id', contractId)
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
  const row = { ...input, project_id: projectId, user_id: userId }

  const { data, error } = await supabase
    .from('variations')
    .insert(row)
    .select()
    .single()

  if (error) {
    // If deadline columns don't exist yet, retry without them
    if (error.message?.includes('column') || error.code === '42703') {
      const { claim_date, notice_1_due, notice_1_sent, notice_2_due, notice_2_sent, next_monthly_due, ...safeRow } = row
      void claim_date; void notice_1_due; void notice_1_sent; void notice_2_due; void notice_2_sent; void next_monthly_due
      const { data: data2, error: error2 } = await supabase
        .from('variations')
        .insert({ ...safeRow, project_id: projectId, user_id: userId })
        .select()
        .single()
      if (error2) throw error2
      return data2
    }
    throw error
  }
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

export async function updateVariation(variationId: string, patch: Partial<VariationInput>): Promise<void> {
  await supabase.from('variations').update(patch).eq('id', variationId)
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
