export interface Claim {
  id: string
  title: string
  severity: 'urgent' | 'valid' | 'review'
  clause: string
  description: string
  estimatedValue: string
  deadlineStatus: string
  draftNotice: string
}

export interface DeadlineItem {
  clause: string
  description: string
  status: 'on-track' | 'urgent' | 'expired'
}

export interface AnalysisResult {
  projectName: string
  contractType: string
  totalClaimValue: string
  claims: Claim[]
  deadlines: DeadlineItem[]
  summary: string
  contractText?: string
}
