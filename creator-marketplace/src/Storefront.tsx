import { FormEvent, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { CreatorProfile } from './types'

type Package = { id:string; title:string; platform:string; creator_amount:number; deliverables:string; delivery_days:number; requires_post:boolean; usage_rights:string; active:boolean }
type Asset = { id:string; kind:string; url:string; caption:string }
const safe = (value:string) => { try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password ? u.href : null } catch { return null } }
const rupees = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(n)

export function Storefront({ profile }: { profile:CreatorProfile }) {
 const [packages,setPackages]=useState<Package[]>([]),[assets,setAssets]=useState<Asset[]>([])
 const [published,setPublished]=useState(false),[languages,setLanguages]=useState(''),[work,setWork]=useState('')
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[ready,setReady]=useState(false)
 async function load() {
  const [s,p,a]=await Promise.all([supabase.from('creator_storefronts').select('*').eq('creator_id',profile.id).maybeSingle(),supabase.from('creator_packages').select('*').eq('creator_id',profile.id).order('created_at'),supabase.from('creator_portfolio_assets').select('*').eq('creator_id',profile.id).order('created_at')])
  for(const result of [s,p,a]) if(result.error) throw result.error
  setPublished(!!s.data?.published);setLanguages((s.data?.languages||[]).join(', '));setWork(s.data?.previous_work||'');setPackages(p.data||[]);setAssets(a.data||[]);setReady(true)
 }
 useEffect(()=>{load().catch(e=>setNotice(e.message))},[profile.id])
 async function run(action:()=>Promise<void>) {setBusy(true);setNotice('');try{await action()}catch(e){setNotice(e && typeof e==='object' && 'message' in e ? String(e.message) : 'Unable to save. Please try again.')}finally{setBusy(false)}}
 async function save(publish:boolean) {
  const {error}=await supabase.from('creator_storefronts').upsert({creator_id:profile.id,published:publish,languages:languages.split(',').map(x=>x.trim()).filter(Boolean),previous_work:work})
  if(error)throw error;setPublished(publish);setNotice(publish?'Your public profile is published.':'Draft saved. Your profile is not publicly listed.')
 }
 function addPackage(e:FormEvent<HTMLFormElement>) {e.preventDefault();const form=e.currentTarget;const f=new FormData(form);run(async()=>{
  const {error}=await supabase.from('creator_packages').insert({creator_id:profile.id,title:f.get('title'),platform:f.get('platform'),deliverables:f.get('deliverables'),creator_amount:Number(f.get('amount')),delivery_days:Number(f.get('days')),usage_rights:f.get('rights'),requires_post:f.get('posting')==='on'})
  if(error)throw error;form.reset();await load();setNotice('Package saved. Publish your profile when ready.')
 })}
 function addAsset(e:FormEvent<HTMLFormElement>) {e.preventDefault();const form=e.currentTarget;const f=new FormData(form);run(async()=>{
  const url=safe(String(f.get('url')));if(!url)throw new Error('Use a secure HTTPS media or portfolio URL.')
  const {error}=await supabase.from('creator_portfolio_assets').insert({creator_id:profile.id,kind:f.get('kind'),url,caption:f.get('caption')});if(error)throw error;form.reset();await load()
 })}
 return <section className="storefront-editor">
  <div className="page-intro"><span className="eyebrow">YOUR PUBLIC STOREFRONT</span><h2>Your work. Your packages. Your price.</h2><p>Publishing is free. Your email and payment details are never part of your public profile.</p></div>
  {notice&&<p className="form-notice" role="status">{notice}</p>}
  <div className="profile-form"><strong>{published?'Published':'Draft — not listed'}</strong><p>Save your basic profile above before publishing. Add a bio, location, niche, verified email and an active package.</p>
   <label className="field">Languages<input value={languages} onChange={e=>setLanguages(e.target.value)} placeholder="English, Hindi" maxLength={300}/></label>
   <label className="field">Previous brand work<textarea value={work} onChange={e=>setWork(e.target.value)} maxLength={6000} placeholder="Describe campaigns and collaborations you can substantiate."/></label>
   <div className="form-actions"><button type="button" className="secondary-button" disabled={busy||!ready} onClick={()=>run(()=>save(false))}>{published?'Unpublish and save':'Save draft'}</button><button type="button" className="primary-button" disabled={busy||!ready} onClick={()=>run(()=>save(true))}>Publish profile</button><a href={`https://ivre-company-dashboard.vercel.app/?page=Marketplace&creator=${profile.id}`} target="_blank" rel="noopener noreferrer">View profile in company portal</a></div>
  </div>
  <div className="profile-form"><h3>Service packages</h3><p>Enter what you earn before any applicable withholding. We add a 10% creator-side markup to the displayed package. Companies see a separate 10% fee at checkout. One revision is included.</p>
   {packages.map(p=><article className="store-package" key={p.id}><strong>{p.title} · {p.platform}</strong><p>{p.deliverables}</p><p>Your earnings {rupees(Number(p.creator_amount))} · Displayed {rupees(Number(p.creator_amount)+Math.round(Number(p.creator_amount)*10)/100)}</p><small>{p.delivery_days} days · {p.requires_post?'Posting required':'Asset delivery only'} · {p.active?'Active':'Paused'}</small><button type="button" className="secondary-button" disabled={busy} onClick={()=>run(async()=>{const {error}=await supabase.from('creator_packages').update({active:!p.active}).eq('id',p.id);if(error)throw error;await load()})}>{p.active?'Pause package':'Activate package'}</button></article>)}
   <form onSubmit={addPackage}><div className="form-grid two"><label className="field">Package title<input name="title" required minLength={3} maxLength={160}/></label><label className="field">Platform<select name="platform">{['Instagram','YouTube','TikTok','Facebook','LinkedIn','X','UGC'].map(p=><option key={p}>{p}</option>)}</select></label></div>
   <label className="field">Deliverables<textarea name="deliverables" required minLength={10} maxLength={4000} placeholder="One 30-second reel, edited captions and one revision."/></label>
   <div className="form-grid two"><label className="field">Your earnings (₹)<input name="amount" type="number" min={100} max={10000000} step="0.01" required/></label><label className="field">Delivery days<input name="days" type="number" min={1} max={180} defaultValue={7} required/></label></div>
   <label className="field">Usage rights<textarea name="rights" required minLength={3} maxLength={2000} placeholder="Organic use for 3 months; paid advertising excluded."/></label><label><input type="checkbox" name="posting" defaultChecked/> This package includes publishing on my account</label><div className="form-actions"><button className="primary-button" disabled={busy||!ready}>Add package</button></div></form>
  </div>
  <div className="profile-form"><h3>Portfolio gallery</h3><p>Add HTTPS images, videos or portfolio links you have permission to share. Direct file uploads are not available yet.</p><div className="store-gallery">{assets.map(a=><article key={a.id}>{a.kind==='image'&&safe(a.url)?<img src={a.url} alt={a.caption} loading="lazy" referrerPolicy="no-referrer"/>:a.kind==='video'&&safe(a.url)?<video src={a.url} controls preload="none"/>:<a href={safe(a.url)||undefined} target="_blank" rel="noopener noreferrer">Open portfolio</a>}<p>{a.caption}</p><button type="button" disabled={busy} onClick={()=>run(async()=>{const {error}=await supabase.from('creator_portfolio_assets').delete().eq('id',a.id);if(error)throw error;await load()})}>Remove asset</button></article>)}</div>
   <form onSubmit={addAsset}><label className="field">Asset type<select name="kind"><option value="image">Image</option><option value="video">Video file</option><option value="link">Reel or portfolio link</option></select></label><label className="field">HTTPS URL<input name="url" type="url" required maxLength={2000}/></label><label className="field">Caption<input name="caption" maxLength={300}/></label><button className="primary-button" disabled={busy||!ready}>Add portfolio asset</button></form>
  </div>
  <div className="profile-form premium-preview"><span className="eyebrow">OPTIONAL CREATOR PREMIUM</span><h3>Stand out. Stay independent.</h3><h2>₹199 / month</h2><p>Sponsored ranking in relevant searches, eligibility for a reviewed IVRE Recommended badge, and priority payouts after completed, approved work.</p><p>Free profiles still appear organically and can receive bookings. Payment never purchases verification or early release of unapproved work.</p><button className="primary-button" type="button" disabled>Premium checkout — not active yet</button><p>Premium billing and eligible payout timings are being configured. No payment is collected.</p></div>
 </section>
}
