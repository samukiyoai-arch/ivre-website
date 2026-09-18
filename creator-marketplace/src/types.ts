export type CreatorProfile = {
  id: string
  full_name: string
  email: string
  instagram_handle: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  niches: string[]
  content_formats: string[]
  audience_locations: string[]
  follower_count: number
  engagement_rate: number
  base_rate: number
  portfolio_url: string | null
  completed_campaigns: number
  total_earnings: number
  status: 'active' | 'suspended'
  created_at: string
  updated_at: string
}

export type Campaign = {
  company_id?: string | null
  id: string
  campaign_code: string
  name: string
  brand_name: string
  brand_logo_url: string | null
  description: string
  campaign_type: string
  location: string
  niche: string
  creator_type: string
  follower_min: number
  follower_max: number
  engagement_min: number
  required_creators: number
  deliverables: string[]
  budget_min: number
  budget_max: number
  application_deadline: string
  campaign_start: string | null
  campaign_end: string | null
  visibility: 'public' | 'private'
  status: 'draft' | 'published' | 'closed' | 'cancelled'
  featured: boolean
  created_at: string
}

export type MatchBreakdown = {
  overall: number
  niche: number
  location: number
  followers: number
  engagement: number
  budget: number
  experience: number
}

export type CampaignApplication = {
  lifecycle?: string
  content_deadline?: string | null
  id: string
  campaign_id: string
  creator_id: string
  why_fit: string
  content_idea: string
  proposed_price: number
  portfolio_url: string | null
  match_score: number
  match_breakdown: MatchBreakdown
  status: 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn' | 'completed'
  brand_note: string | null
  agreed_amount: number | null
  submitted_at: string
  campaigns?: Campaign
}

export type CampaignInvitation = {
  id: string
  campaign_id: string
  creator_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  campaigns?: Campaign
}
