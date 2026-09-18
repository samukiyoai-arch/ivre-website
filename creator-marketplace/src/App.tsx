import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Compass,
  Eye,
  EyeOff,
  FileText,
  Filter,
  IndianRupee,
  Instagram,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Target,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Storefront } from './Storefront'
import { CreatorDeliveries, CreatorMessages, CreatorPaymentRecords } from './CreatorCollaboration'
import type {
  Campaign,
  CampaignApplication,
  CampaignInvitation,
  CreatorProfile,
  MatchBreakdown,
} from './types'

type Page = 'discover' | 'applications' | 'invitations' | 'active' | 'earnings' | 'messages' | 'profile'

const nicheOptions = ['Fitness', 'Beauty', 'Food', 'Fashion', 'Lifestyle', 'Travel', 'Technology', 'Finance', 'Parenting']

const formatMoney = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value)

const formatFollowers = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 ? 1 : 0)}K`
  return String(value)
}

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  : 'To be announced'

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [applications, setApplications] = useState<CampaignApplication[]>([])
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [profileMissing, setProfileMissing] = useState(false)
  const [page, setPage] = useState<Page>('discover')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const loadWorkspace = useCallback(async (userId: string, background = false) => {
    if (!background) setLoading(true)
    const [profileResult, campaignsResult, applicationsResult, invitationsResult] = await Promise.all([
      supabase.from('creator_profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('campaigns').select('*').eq('status', 'published').order('featured', { ascending: false }).order('application_deadline'),
      supabase.from('campaign_applications').select('*, campaigns(*)').eq('creator_id', userId).order('submitted_at', { ascending: false }),
      supabase.from('campaign_invitations').select('*, campaigns(*)').eq('creator_id', userId).order('created_at', { ascending: false }),
    ])

    if (profileResult.error) {
      setNotice(profileResult.error.message)
    }

    const creator = profileResult.data as CreatorProfile | null
    setProfile(creator)
    setProfileMissing(!creator)
    setCampaigns((campaignsResult.data ?? []) as Campaign[])
    setApplications((applicationsResult.data ?? []) as unknown as CampaignApplication[])
    setInvitations((invitationsResult.data ?? []) as unknown as CampaignInvitation[])
    setLoading(false)
  }, [])

  useEffect(() => {
    document.title = 'IVRE Creator Marketplace'
    const requestedFreshSignup = new URLSearchParams(window.location.search).get('mode') === 'signup'
    let clearingOldSession = requestedFreshSignup

    supabase.auth.getSession().then(async ({ data }) => {
      if (requestedFreshSignup && data.session) {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        clearingOldSession = false
        if (error) {
          setNotice('The previous creator session could not be closed. Please sign out and try again.')
          setSession(data.session)
          loadWorkspace(data.session.user.id)
          return
        }
        setSession(null)
        setProfile(null)
        setProfileMissing(false)
        setLoading(false)
        return
      }

      clearingOldSession = false
      setSession(data.session)
      if (data.session) loadWorkspace(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (clearingOldSession && nextSession) return
      clearingOldSession = false
      setSession(nextSession)
      if (nextSession) loadWorkspace(nextSession.user.id)
      else {
        setProfile(null)
        setProfileMissing(false)
        setLoading(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [loadWorkspace])

  useEffect(() => {
    if (!session) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadWorkspace(session.user.id, true)
    }, 20000)
    return () => window.clearInterval(timer)
  }, [session?.user.id, loadWorkspace])

  if (loading) return <FullLoader />
  if (!session) return <AuthScreen notice={notice} setNotice={setNotice} />
  if (profileMissing) return <WrongPortalScreen email={session.user.email ?? ''} />
  if (!profile) return <FullLoader />
  if (profile.status === 'suspended') return <SuspendedScreen />

  const refresh = () => loadWorkspace(session.user.id)

  return (
    <div className="market-shell">
      <Sidebar
        page={page}
        profile={profile}
        invitations={invitations}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(nextPage) => {
          setPage(nextPage)
          setSidebarOpen(false)
          setNotice(null)
        }}
      />
      <main className="market-main">
        <Topbar
          page={page}
          profile={profile}
          onMenu={() => setSidebarOpen(true)}
          onRefresh={refresh}
          invitationCount={invitations.filter((item) => item.status === 'pending').length}
          onInvitations={() => setPage('invitations')}
        />
        {notice && <div className="toast"><Check size={17} />{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button></div>}
        <div className="page-body">
          {page === 'discover' && (
            <DiscoverPage
              profile={profile}
              campaigns={campaigns}
              applications={applications}
              onApplied={async () => {
                await refresh()
                setPage('applications')
                setNotice('Application submitted. The brand can now review your match and proposal.')
              }}
            />
          )}
          {page === 'applications' && <ApplicationsPage applications={applications} />}
          {page === 'invitations' && <InvitationsPage invitations={invitations} onOpenCampaign={() => setPage('discover')} />}
          {page === 'active' && <ActiveCampaignsPage applications={applications} />}
          {page === 'earnings' && <EarningsPage profile={profile} applications={applications} />}
          {page === 'messages' && <MessagesPage applications={applications} />}
          {page === 'profile' && (
            <ProfilePage
              profile={profile}
              onSaved={async () => {
                await refresh()
                setNotice('Profile updated. Your future campaign matches will use the new details.')
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function FullLoader() {
  return (
    <div className="full-loader">
      <BrandMark compact />
      <LoaderCircle className="spin" size={30} />
      <p>Preparing your opportunities…</p>
    </div>
  )
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? 'compact' : ''}`}>
      <span className="brand-box">ivre<small>MARKETING</small></span>
      {!compact && <span><strong>IVRE</strong><small>CREATOR MARKETPLACE</small></span>}
    </div>
  )
}

function AuthScreen({ notice, setNotice }: { notice: string | null; setNotice: (message: string | null) => void }) {
  const [prefill] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      mode: params.get('mode'),
      fullName: params.get('full_name') ?? '',
      email: params.get('creator_email') ?? params.get('email') ?? '',
      location: params.get('location') ?? '',
      instagramHandle: params.get('instagram_handle') ?? '',
      baseRate: params.get('base_rate') ?? '',
    }
  })
  const [mode, setMode] = useState<'signin' | 'signup'>(prefill.mode === 'signup' ? 'signup' : 'signin')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setNotice(error.message)
    } else {
      const niche = String(form.get('niche') ?? '')
      const emailRedirectTo = window.location.protocol === 'file:'
        ? 'https://ivre-creator-marketplace.vercel.app'
        : window.location.origin
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            requested_portal: 'creator',
            full_name: String(form.get('full_name') ?? '').trim(),
            instagram_handle: String(form.get('instagram_handle') ?? '').trim(),
            location: String(form.get('location') ?? '').trim(),
            niches: niche ? [niche] : [],
            follower_count: Number(form.get('follower_count') ?? 0),
            engagement_rate: Number(form.get('engagement_rate') ?? 0),
            base_rate: Number(form.get('base_rate') ?? 0),
            portfolio_url: String(form.get('portfolio_url') ?? '').trim(),
          },
        },
      })
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('already registered') || message.includes('already exists')) {
          setNotice('This email already has an IVRE account. Use Sign in, or register the creator profile with a different email.')
        } else if (message.includes('rate limit')) {
          setNotice('Supabase has temporarily limited confirmation emails. Wait a few minutes, then try again.')
        } else if (message.includes('database error')) {
          setNotice('Creator signup could not be saved. Please try again; the IVRE team has been notified.')
        } else {
          setNotice(error.message)
        }
      } else if (!data.session && data.user && (data.user.identities?.length ?? 0) === 0) {
        setNotice('This email already has an IVRE account. Choose Sign in and use your existing password—no new confirmation email will be sent.')
      } else if (!data.session) {
        setNotice('Account created. Check your email to confirm your creator account, then sign in.')
      }
    }
    setBusy(false)
  }

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <BrandMark />
        <div className="auth-copy">
          <span className="eyebrow light">OPPORTUNITY, MATCHED.</span>
          <h1>Campaigns that value your audience—not just your follower count.</h1>
          <p>Discover premium brand briefs, understand your fit, and apply at the rate your work deserves.</p>
          <div className="auth-points">
            <span><Sparkles size={17} />IVRE AI match insights</span>
            <span><Target size={17} />Curated brand campaigns</span>
            <span><IndianRupee size={17} />Apply at your stated rate</span>
          </div>
        </div>
        <div className="auth-quote">“YOUR CREATIVITY. THE RIGHT OPPORTUNITY.”</div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">CREATOR ACCESS</span>
          <h2>{mode === 'signin' ? 'Welcome back, creator.' : 'Build your creator profile.'}</h2>
          <p className="form-intro">{mode === 'signin' ? 'Sign in to discover your latest campaign matches.' : 'Join IVRE and start applying to curated opportunities.'}</p>
          <div className="auth-tabs">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(null) }}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(null) }}>Create account</button>
          </div>

          {mode === 'signup' && (
            <>
              <div className="form-grid two">
                <Field label="Full name"><input name="full_name" required defaultValue={prefill.fullName} placeholder="Your name" /></Field>
                <Field label="Instagram handle"><input name="instagram_handle" required defaultValue={prefill.instagramHandle} placeholder="@yourhandle" /></Field>
              </div>
            </>
          )}
          <Field label="Email"><input name="email" type="email" required defaultValue={prefill.email} placeholder="you@email.com" autoComplete="email" /></Field>
          <Field label="Password">
            <div className="password-field">
              <input name="password" type={showPassword ? 'text' : 'password'} required minLength={6} placeholder="At least 6 characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </Field>
          {mode === 'signup' && (
            <>
              <div className="form-grid two">
                <Field label="Primary niche">
                  <select name="niche" required defaultValue=""><option value="" disabled>Select niche</option>{nicheOptions.map((niche) => <option key={niche}>{niche}</option>)}</select>
                </Field>
                <Field label="Location"><input name="location" required defaultValue={prefill.location} placeholder="Mumbai, India" /></Field>
              </div>
              <div className="form-grid three">
                <Field label="Followers"><input name="follower_count" type="number" min="0" required placeholder="25000" /></Field>
                <Field label="Engagement %"><input name="engagement_rate" type="number" min="0" max="100" step="0.1" required placeholder="4.8" /></Field>
                <Field label="Base rate ₹"><input name="base_rate" type="number" min="0" required defaultValue={prefill.baseRate} placeholder="12000" /></Field>
              </div>
              <Field label="Portfolio link"><input name="portfolio_url" type="url" placeholder="https://…" /></Field>
            </>
          )}
          {notice && <div className="form-notice">{notice}</div>}
          <button className="primary-button" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={19} /> : mode === 'signin' ? <>Sign in <ArrowRight size={18} /></> : <>Create creator account <ArrowRight size={18} /></>}
          </button>
          <p className="terms-note">By joining, you agree to submit truthful audience and campaign information.</p>
        </form>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function WrongPortalScreen({ email }: { email: string }) {
  return (
    <div className="state-screen">
      <div className="state-card">
        <BrandMark compact />
        <UserRound size={38} />
        <span className="eyebrow">CREATOR PROFILE REQUIRED</span>
        <h1>This account belongs to another IVRE portal.</h1>
        <p>{email} does not have a creator marketplace profile. Sign out and create a creator account with a different email.</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}

function SuspendedScreen() {
  return (
    <div className="state-screen">
      <div className="state-card">
        <BrandMark compact />
        <Clock3 size={38} />
        <span className="eyebrow">ACCOUNT REVIEW</span>
        <h1>Your creator account is unavailable.</h1>
        <p>Contact IVRE support if you believe this is a mistake.</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}

function Sidebar({ page, profile, invitations, open, onClose, onNavigate }: {
  page: Page
  profile: CreatorProfile
  invitations: CampaignInvitation[]
  open: boolean
  onClose: () => void
  onNavigate: (page: Page) => void
}) {
  const nav: { id: Page; label: string; icon: ReactNode; badge?: number }[] = [
    { id: 'discover', label: 'Find campaigns', icon: <Compass size={19} /> },
    { id: 'applications', label: 'My applications', icon: <FileText size={19} /> },
    { id: 'invitations', label: 'Invitations', icon: <Mail size={19} />, badge: invitations.filter((item) => item.status === 'pending').length },
    { id: 'active', label: 'Active campaigns', icon: <BriefcaseBusiness size={19} /> },
    { id: 'earnings', label: 'Earnings', icon: <WalletCards size={19} /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={19} /> },
    { id: 'profile', label: 'Profile', icon: <UserRound size={19} /> },
  ]
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <BrandMark />
        <span className="nav-label">CREATOR WORKSPACE</span>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>
              {item.icon}<span>{item.label}</span>{Boolean(item.badge) && <b>{item.badge}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-profile">
          <div className="avatar">{initials(profile.full_name)}</div>
          <div><strong>{profile.full_name}</strong><span>{profile.instagram_handle || 'Creator'}</span></div>
          <button onClick={() => supabase.auth.signOut()} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
    </>
  )
}

function Topbar({ page, profile, onMenu, onRefresh, invitationCount, onInvitations }: {
  page: Page
  profile: CreatorProfile
  onMenu: () => void
  onRefresh: () => void
  invitationCount: number
  onInvitations: () => void
}) {
  const titles: Record<Page, string> = {
    discover: 'Open Campaigns',
    applications: 'My Applications',
    invitations: 'Invitations',
    active: 'Active Campaigns',
    earnings: 'Earnings',
    messages: 'Messages',
    profile: 'Creator Profile',
  }
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button>
      <div><span>IVRE CREATOR MARKETPLACE</span><h1>{titles[page]}</h1></div>
      <div className="topbar-actions">
        <button onClick={onRefresh} aria-label="Refresh"><Zap size={18} /></button>
        <button onClick={onInvitations} aria-label={`${invitationCount} campaign invitations`}><Bell size={18} />{invitationCount > 0 && <b>{invitationCount}</b>}</button>
        <div className="avatar pale">{initials(profile.full_name)}</div>
      </div>
    </header>
  )
}

function DiscoverPage({ profile, campaigns, applications, onApplied }: {
  profile: CreatorProfile
  campaigns: Campaign[]
  applications: CampaignApplication[]
  onApplied: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('All niches')
  const [location, setLocation] = useState('All locations')
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [match, setMatch] = useState<MatchBreakdown | null>(null)
  const [matchBusy, setMatchBusy] = useState(false)

  const appliedIds = useMemo(() => new Set(applications.map((item) => item.campaign_id)), [applications])
  const locations = ['All locations', ...Array.from(new Set(campaigns.map((item) => item.location)))]
  const niches = ['All niches', ...Array.from(new Set(campaigns.map((item) => item.niche)))]
  const filtered = campaigns.filter((campaign) => {
    const query = search.toLowerCase()
    return (!query || `${campaign.name} ${campaign.brand_name} ${campaign.niche}`.toLowerCase().includes(query))
      && (niche === 'All niches' || campaign.niche === niche)
      && (location === 'All locations' || campaign.location === location)
  })

  const openCampaign = async (campaign: Campaign) => {
    setSelected(campaign)
    setMatch(null)
    setMatchBusy(true)
    const { data } = await supabase.rpc('creator_campaign_match', { campaign_id: campaign.id })
    setMatch(data as MatchBreakdown | null)
    setMatchBusy(false)
  }

  return (
    <>
      <section className="discover-hero">
        <div>
          <span className="eyebrow light">MATCHED FOR {profile.niches[0]?.toUpperCase() || 'YOU'}</span>
          <h2>Find work that fits your voice.</h2>
          <p>Quality-led campaigns from brands looking for creators like you.</p>
        </div>
        <div className="hero-stat"><Sparkles size={25} /><strong>{campaigns.length}</strong><span>open opportunities</span></div>
        <div className="hero-orbit" />
      </section>

      <section className="profile-strip">
        <div><span>YOUR CREATOR SIGNAL</span><strong>{formatFollowers(profile.follower_count)} followers · {profile.engagement_rate}% engagement</strong></div>
        <div className="profile-meter"><i style={{ width: `${Math.min(100, 45 + (profile.bio ? 15 : 0) + (profile.portfolio_url ? 20 : 0) + (profile.niches.length ? 20 : 0))}%` }} /></div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Profile powers every match</button>
      </section>

      <div className="filter-row">
        <div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns or brands" /></div>
        <div className="select-wrap"><Filter size={17} /><select value={niche} onChange={(e) => setNiche(e.target.value)}>{niches.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="select-wrap"><MapPin size={17} /><select value={location} onChange={(e) => setLocation(e.target.value)}>{locations.map((item) => <option key={item}>{item}</option>)}</select></div>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">LIVE BRIEFS</span><h2>{filtered.length} campaigns accepting applications</h2></div>
        <span>Ranked by relevance and deadline</span>
      </div>

      <div className="campaign-grid">
        {filtered.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} applied={appliedIds.has(campaign.id)} onOpen={() => openCampaign(campaign)} />
        ))}
      </div>
      {!filtered.length && <EmptyState icon={<Search />} title="No campaigns match those filters" text="Try another niche, location or search term." />}

      {selected && (
        <CampaignDrawer
          campaign={selected}
          profile={profile}
          match={match}
          loading={matchBusy}
          applied={appliedIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onApplied={onApplied}
        />
      )}
    </>
  )
}

function CampaignCard({ campaign, applied, onOpen }: { campaign: Campaign; applied: boolean; onOpen: () => void }) {
  return (
    <article className={`campaign-card ${campaign.featured ? 'featured' : ''}`}>
      <div className="card-top">
        <div className="brand-avatar">{initials(campaign.brand_name)}</div>
        <div><span>{campaign.brand_name}</span><strong>{campaign.name}</strong></div>
        {campaign.featured && <em><Sparkles size={13} />FEATURED</em>}
      </div>
      <div className="campaign-tags"><span>{campaign.niche}</span><span>{campaign.location}</span><span>{campaign.creator_type}</span></div>
      <div className="campaign-metrics">
        <div><Users size={17} /><span>FOLLOWERS</span><strong>{formatFollowers(campaign.follower_min)}–{formatFollowers(campaign.follower_max)}</strong></div>
        <div><IndianRupee size={17} /><span>BUDGET</span><strong>{formatMoney(campaign.budget_min)}–{formatMoney(campaign.budget_max)}</strong></div>
      </div>
      <div className="card-footer">
        <span><CalendarDays size={16} />Apply by {formatDate(campaign.application_deadline)}</span>
        <button onClick={onOpen}>{applied ? 'View application' : 'View campaign'}<ArrowRight size={16} /></button>
      </div>
    </article>
  )
}

function CampaignDrawer({ campaign, profile, match, loading, applied, onClose, onApplied }: {
  campaign: Campaign
  profile: CreatorProfile
  match: MatchBreakdown | null
  loading: boolean
  applied: boolean
  onClose: () => void
  onApplied: () => Promise<void>
}) {
  const [applying, setApplying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const { error: submitError } = await supabase.rpc('submit_campaign_application', {
      target_campaign_id: campaign.id,
      application_why_fit: String(form.get('why_fit') ?? ''),
      application_content_idea: String(form.get('content_idea') ?? ''),
      application_price: Number(form.get('proposed_price') ?? 0),
      application_portfolio_url: String(form.get('portfolio_url') ?? ''),
    })
    if (submitError) {
      setError(submitError.message)
      setBusy(false)
      return
    }
    await onApplied()
    setBusy(false)
    onClose()
  }

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={campaign.name}>
      <button className="drawer-scrim" onClick={onClose} aria-label="Close campaign" />
      <aside className="campaign-drawer">
        <div className="drawer-header">
          <button onClick={onClose}><ArrowLeft size={18} />Back to campaigns</button>
          <span>{campaign.visibility === 'private' ? 'INVITED CAMPAIGN' : 'OPEN CAMPAIGN'}</span>
        </div>
        <div className="drawer-brand">
          <div className="brand-avatar large">{initials(campaign.brand_name)}</div>
          <div><span>{campaign.brand_name}</span><h2>{campaign.name}</h2></div>
        </div>
        <div className="drawer-tags"><span>{campaign.niche}</span><span><MapPin size={14} />{campaign.location}</span><span>{campaign.campaign_type}</span></div>

        <section className="match-card">
          {loading ? <><LoaderCircle className="spin" /><p>IVRE AI is evaluating your profile…</p></> : match ? (
            <>
              <div className="match-score"><div><strong>{match.overall}%</strong><span>campaign match</span></div><Sparkles size={24} /></div>
              <div className="score-list">
                <Score label="Niche match" value={match.niche} />
                <Score label="Audience size" value={match.followers} />
                <Score label="Location" value={match.location} />
                <Score label="Engagement" value={match.engagement} />
                <Score label="Budget fit" value={match.budget} />
                <Score label="Experience" value={match.experience} />
              </div>
              <p>Match results use your saved creator profile and this campaign’s requirements.</p>
            </>
          ) : <p>Complete your creator profile to unlock a match score.</p>}
        </section>

        <section className="brief-section"><span className="eyebrow">ABOUT THE CAMPAIGN</span><p>{campaign.description}</p></section>
        <div className="brief-columns">
          <section className="brief-section">
            <span className="eyebrow">WE'RE LOOKING FOR</span>
            <ul>
              <li><Check size={16} />{campaign.niche} content</li>
              <li><Check size={16} />{formatFollowers(campaign.follower_min)}–{formatFollowers(campaign.follower_max)} followers</li>
              <li><Check size={16} />At least {campaign.engagement_min}% engagement</li>
              <li><Check size={16} />{campaign.location}-based audience</li>
            </ul>
          </section>
          <section className="brief-section">
            <span className="eyebrow">DELIVERABLES</span>
            <ul>{campaign.deliverables.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
          </section>
        </div>
        <div className="brief-facts">
          <div><IndianRupee size={18} /><span>BUDGET</span><strong>{formatMoney(campaign.budget_min)}–{formatMoney(campaign.budget_max)}</strong></div>
          <div><Users size={18} /><span>CREATORS NEEDED</span><strong>{campaign.required_creators}</strong></div>
          <div><CalendarDays size={18} /><span>CAMPAIGN DATES</span><strong>{formatDate(campaign.campaign_start)} – {formatDate(campaign.campaign_end)}</strong></div>
        </div>

        {applied ? <div className="applied-banner"><Check size={19} /><div><strong>Application submitted</strong><span>You can track this campaign under My Applications.</span></div></div> : !applying ? (
          <button className="primary-button sticky-apply" onClick={() => setApplying(true)}>Apply to campaign <ArrowRight size={18} /></button>
        ) : (
          <form className="application-form" onSubmit={submit}>
            <span className="eyebrow">YOUR APPLICATION</span>
            <h3>Make your pitch count.</h3>
            <Field label="Why are you a good fit?"><textarea name="why_fit" required minLength={30} placeholder="Tell the brand why your audience and style fit this brief…" /></Field>
            <Field label="Proposed content idea"><textarea name="content_idea" required minLength={30} placeholder="Share a clear, platform-native concept…" /></Field>
            <div className="form-grid two">
              <Field label="Your price ₹"><input name="proposed_price" type="number" min="1" required defaultValue={profile.base_rate || campaign.budget_min} /></Field>
              <Field label="Portfolio link"><input name="portfolio_url" type="url" defaultValue={profile.portfolio_url ?? ''} placeholder="https://…" /></Field>
            </div>
            <p className="rate-note"><CircleDollarSign size={17} />Your price is evaluated alongside quality, audience and fit—this is not a lowest-bid auction.</p>
            {error && <div className="form-notice">{error}</div>}
            <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setApplying(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <>Submit application <Send size={17} /></>}</button></div>
          </form>
        )}
      </aside>
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return <div><span><Check size={14} />{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>
}

function ApplicationsPage({ applications }: { applications: CampaignApplication[] }) {
  const tabs = ['All', 'Submitted', 'Shortlisted', 'Accepted']
  const [filter, setFilter] = useState('All')
  const filtered = applications.filter((item) => filter === 'All' || item.status === filter.toLowerCase())
  return (
    <section>
      <PageIntro eyebrow="YOUR PIPELINE" title="Every opportunity, in one place." text="Track brand decisions and keep your best ideas moving." />
      <div className="status-tabs">{tabs.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<b>{item === 'All' ? applications.length : applications.filter((app) => app.status === item.toLowerCase()).length}</b></button>)}</div>
      <div className="application-list">
        {filtered.map((application) => <ApplicationRow key={application.id} application={application} />)}
      </div>
      {!filtered.length && <EmptyState icon={<FileText />} title="No applications here yet" text="Explore Open Campaigns and submit your first pitch." />}
    </section>
  )
}

function ApplicationRow({ application }: { application: CampaignApplication }) {
  const campaign = application.campaigns
  return (
    <article className="application-row">
      <div className="brand-avatar">{campaign ? initials(campaign.brand_name) : 'IV'}</div>
      <div className="application-title"><span>{campaign?.brand_name ?? 'IVRE campaign'}</span><strong>{campaign?.name ?? 'Campaign'}</strong><small>Applied {formatDate(application.submitted_at.slice(0, 10))}</small></div>
      <div className="match-pill"><Sparkles size={15} /><strong>{application.match_score}%</strong><span>match</span></div>
      <div className="quote-cell"><span>YOUR RATE</span><strong>{formatMoney(application.proposed_price)}</strong></div>
      <span className={`status ${application.status}`}>{application.status}</span>
      <ChevronRight size={18} />
    </article>
  )
}

function InvitationsPage({ invitations, onOpenCampaign }: { invitations: CampaignInvitation[]; onOpenCampaign: () => void }) {
  return (
    <section>
      <PageIntro eyebrow="DIRECT FROM BRANDS" title="Invitations chosen for you." text="Private campaigns appear here when a brand wants you specifically." />
      <div className="campaign-grid">
        {invitations.map((invitation) => invitation.campaigns && (
          <article className="invitation-card" key={invitation.id}>
            <div className="brand-avatar large">{initials(invitation.campaigns.brand_name)}</div>
            <span className="eyebrow">PRIVATE INVITATION</span>
            <h3>{invitation.campaigns.name}</h3>
            <p>{invitation.message || `${invitation.campaigns.brand_name} thinks your profile could be a strong fit.`}</p>
            <div className="campaign-tags"><span>{invitation.campaigns.niche}</span><span>{invitation.campaigns.location}</span></div>
            <button className="primary-button" onClick={onOpenCampaign}>Explore campaign <ArrowRight size={16} /></button>
          </article>
        ))}
      </div>
      {!invitations.length && <EmptyState icon={<Mail />} title="No private invitations yet" text="Keep your profile complete so brands can discover and invite you." />}
    </section>
  )
}

function ActiveCampaignsPage({ applications }: { applications: CampaignApplication[] }) {
  const active = applications.filter((item) => ['accepted', 'completed'].includes(item.status))
  return (
    <section>
      <PageIntro eyebrow="DELIVERY WORKSPACE" title="From acceptance to published work." text="Your accepted collaborations and deliverables will live here." />
      <div className="application-list">{active.map((item) => <ApplicationRow key={item.id} application={item} />)}</div>
      <CreatorDeliveries applications={active} />
      {!active.length && <EmptyState icon={<BriefcaseBusiness />} title="No active campaigns yet" text="Accepted applications will move here automatically." />}
    </section>
  )
}

function EarningsPage({ profile, applications }: { profile: CreatorProfile; applications: CampaignApplication[] }) {
  const pending = applications.filter((item) => item.status === 'accepted').reduce((sum, item) => sum + (item.agreed_amount ?? item.proposed_price), 0)
  return (
    <section>
      <PageIntro eyebrow="CREATOR FINANCE" title="Know what your work is earning." text="A clear view of completed and upcoming campaign value." />
      <div className="earnings-grid">
        <div className="earning-card dark"><CircleDollarSign /><span>TOTAL EARNINGS</span><strong>{formatMoney(profile.total_earnings)}</strong><small>Completed campaigns</small></div>
        <div className="earning-card"><Clock3 /><span>PENDING VALUE</span><strong>{formatMoney(pending)}</strong><small>Accepted, awaiting completion</small></div>
        <div className="earning-card"><BadgeIndianRupee /><span>BASE RATE</span><strong>{formatMoney(profile.base_rate)}</strong><small>Used for campaign match</small></div>
      </div>
      {!profile.total_earnings && !pending && <EmptyState icon={<WalletCards />} title="Your earnings story starts here" text="Accepted campaigns and completed payouts will be tracked automatically." />}
      <CreatorPaymentRecords />
    </section>
  )
}

function MessagesPage({ applications }: { applications: CampaignApplication[] }) {
  return (
    <section>
      <PageIntro eyebrow="BRAND CONVERSATIONS" title="Keep campaign conversations focused." text="Messages open when a brand shortlists or accepts your application." />
      <CreatorMessages applications={applications} />
    </section>
  )
}

function ProfilePage({ profile, onSaved }: { profile: CreatorProfile; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const niches = form.getAll('niches').map(String)
    const { error: updateError } = await supabase.from('creator_profiles').update({
      full_name: String(form.get('full_name') ?? '').trim(),
      instagram_handle: String(form.get('instagram_handle') ?? '').trim(),
      bio: String(form.get('bio') ?? '').trim() || null,
      location: String(form.get('location') ?? '').trim(),
      niches,
      follower_count: Number(form.get('follower_count') ?? 0),
      engagement_rate: Number(form.get('engagement_rate') ?? 0),
      base_rate: Number(form.get('base_rate') ?? 0),
      portfolio_url: String(form.get('portfolio_url') ?? '').trim() || null,
      avatar_url: String(form.get('avatar_url') ?? '').trim() || null,
    }).eq('id', profile.id)
    if (updateError) setError(updateError.message)
    else await onSaved()
    setBusy(false)
  }
  return (
    <section>
      <PageIntro eyebrow="YOUR CREATOR SIGNAL" title="Make every match more accurate." text="Brands only see the details you use to represent your work." />
      <form className="profile-form" onSubmit={save}>
        <div className="profile-form-head"><div className="avatar jumbo">{initials(profile.full_name)}</div><div><strong>{profile.full_name}</strong><span>{profile.email}</span><small>Creator since {formatDate(profile.created_at.slice(0, 10))}</small></div></div>
        <div className="form-grid two"><Field label="Full name"><input name="full_name" required defaultValue={profile.full_name} /></Field><Field label="Instagram handle"><input name="instagram_handle" required defaultValue={profile.instagram_handle ?? ''} /></Field></div>
        <Field label="Profile image URL"><input name="avatar_url" type="url" pattern="https://.*" defaultValue={profile.avatar_url ?? ''} placeholder="https://…" /></Field>
        <Field label="Bio"><textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Describe your content, audience and point of view…" /></Field>
        <div className="form-grid two"><Field label="Location"><input name="location" required defaultValue={profile.location ?? ''} /></Field><Field label="Portfolio link"><input name="portfolio_url" type="url" defaultValue={profile.portfolio_url ?? ''} /></Field></div>
        <div className="form-grid three"><Field label="Followers"><input name="follower_count" type="number" min="0" required defaultValue={profile.follower_count} /></Field><Field label="Engagement %"><input name="engagement_rate" type="number" min="0" max="100" step="0.1" required defaultValue={profile.engagement_rate} /></Field><Field label="Base rate ₹"><input name="base_rate" type="number" min="0" required defaultValue={profile.base_rate} /></Field></div>
        <Field label="Content niches"><div className="choice-grid">{nicheOptions.map((niche) => <label key={niche}><input type="checkbox" name="niches" value={niche} defaultChecked={profile.niches.includes(niche)} /><span>{niche}</span></label>)}</div></Field>
        {error && <div className="form-notice">{error}</div>}
        <div className="form-actions right"><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : 'Save profile'}</button></div>
      </form>
      <Storefront profile={profile} />
    </section>
  )
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><div>{icon}</div><strong>{title}</strong><p>{text}</p></div>
}

export default App
