/* Live marketplace previews. Full profiles and company carts require sign-in. */
const IVRE_API = 'https://jbkpxjabnknjazwnnlwb.supabase.co';
const IVRE_PUBLIC_KEY = 'sb_publishable_uKg40FgIhmziSIQLSYjekw_ZWsn1hRV';
const TRIAL_STORAGE = 'ivre-marketplace-trial-v2';
const tokenRead = () => { try{return localStorage.getItem(TRIAL_STORAGE)||''}catch{return ''} };
const tokenSave = token => {try{localStorage.setItem(TRIAL_STORAGE,token)}catch{/* Browser storage is unavailable. */}};
function companyLink(creator, page='Marketplace') {
 const u=new URL('https://ivre-company-dashboard.vercel.app/');u.searchParams.set('page',page);
 if(creator)u.searchParams.set('creator',creator);if(tokenRead())u.searchParams.set('trial',tokenRead());return u.href;
}
function element(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function profileCard(c){
 const card=element('article',null,'creator-card');
 try{const u=new URL(c.avatar_url);if(u.protocol==='https:'){const img=element('img');img.src=u.href;img.alt=c.full_name;img.loading='lazy';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px';card.append(img)}}catch{}
 card.append(element('small',(c.niches||[]).join(' · ')),element('h3',c.full_name),element('p',c.location||'Location not supplied'));
 if(c.follower_count!==undefined)card.append(element('p',`${Number(c.follower_count).toLocaleString('en-IN')} followers · ${c.engagement_rate}% engagement`),element('small','Statistics supplied by the creator'));
 if(c.display_price!=null)card.append(element('strong','From '+new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(c.display_price)));
 const link=element('a','View creator profile →','button button-dark');link.href=companyLink(c.id);card.append(link);return card;
}
const home=document.querySelector('#featuredCreators');
if(home){fetch(IVRE_API+'/rest/v1/rpc/marketplace_featured',{method:'POST',headers:{apikey:IVRE_PUBLIC_KEY,'Content-Type':'application/json'},body:'{}'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(rows=>{home.replaceChildren();if(!rows.length)home.append(element('p','Creator storefronts are opening. Publish your creator profile to appear here.'));else rows.forEach(c=>home.append(profileCard(c)))}).catch(()=>home.replaceChildren(element('p','Creator profiles could not load. Please try again shortly.')));}
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{const input=document.querySelector('#creatorPrompt');if(input)input.value=button.dataset.prompt}));
document.querySelectorAll('[data-company-cart]').forEach(link=>link.href=companyLink(null,'Cart'));
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');if(!link||!tokenRead())return;
 const u=new URL(link.href,location.href);
 if(u.origin==='https://ivre-company-dashboard.vercel.app'){u.searchParams.set('trial',tokenRead());link.href=u.href;}
});
const results=document.querySelector('#directoryResults');
if(results){
 const prompt=new URLSearchParams(location.search).get('search')||'';
 const input=document.querySelector('#directorySearchInput');if(input)input.value=prompt;
 const copy=document.querySelector('#directoryQuery');
 let rows=[],page=0;
 const render=()=>{results.replaceChildren();rows.slice(page*12,(page+1)*12).forEach(c=>results.append(profileCard(c)));const controls=document.querySelector('#resultPages');if(controls){controls.replaceChildren();if(page>0){const back=element('button','Previous');back.onclick=()=>{page--;render()};controls.append(back)}if((page+1)*12<rows.length){const next=element('button','Next');next.onclick=()=>{page++;render()};controls.append(next)}}};
 if(prompt.length<3){if(copy)copy.textContent='Describe the creator you need to start your free search.';}
 else{if(copy)copy.textContent='Finding matching published creators…';fetch(IVRE_API+'/functions/v1/marketplace-search',{method:'POST',headers:{'Content-Type':'application/json',apikey:IVRE_PUBLIC_KEY},body:JSON.stringify({action:'search',prompt,token:tokenRead()||undefined})}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||'Search unavailable.');return body}).then(data=>{
  if(data.token)tokenSave(data.token);
  if(data.login_required){if(copy)copy.textContent='Your free search is used. Sign in and choose a search plan to continue. Login does not reset your allowance.';const login=element('a','Sign in to choose a plan','button button-dark');login.href=companyLink(null,'Billing');results.replaceChildren(login);return;}
  rows=data.creators||[];if(copy)copy.textContent=rows.length?`${rows.length} matching creator${rows.length===1?'':'s'} for: ${prompt}`:'No published creators match this search yet. Try a broader niche or location. This search did not use your allowance.';render();
 }).catch(e=>{if(copy)copy.textContent=e.message+' Please retry the same search to recover its results.';});}
}
