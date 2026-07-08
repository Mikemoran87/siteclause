import { supabase } from './supabase'

export async function saveLead(data: {
  name: string
  email: string
  contractValueBand: string
  workType: string
  answers: Record<string, string>
  analysisResult: unknown
}) {
  const { error } = await supabase.from('leads').insert({
    name: data.name,
    email: data.email,
    contract_value_band: data.contractValueBand,
    work_type: data.workType,
    answers: data.answers,
    analysis_result: data.analysisResult,
  })
  if (error) console.error('Failed to save lead:', error)
}
