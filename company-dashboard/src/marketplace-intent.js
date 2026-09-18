// Keep only local marketplace intent across email confirmation; never accept redirect URLs.
const key='ivre-marketplace-intent-v2';
export function restoreMarketplaceIntent() {
 try {
  const url=new URL(location.href);
  if(url.searchParams.has('trial')||url.searchParams.has('creator')) {
   sessionStorage.setItem(key,JSON.stringify(Object.fromEntries(['page','creator','trial'].map(k=>[k,url.searchParams.get(k)]))));
  } else if(!url.searchParams.has('page')&&!url.searchParams.has('recovery')) {
   const saved=JSON.parse(sessionStorage.getItem(key)||'null');
   if(saved){for(const k of ['page','creator','trial'])if(typeof saved[k]==='string')url.searchParams.set(k,saved[k]);history.replaceState(null,'',url.href);}
  }
 }catch{/* Storage restrictions must not prevent login. */}
}
export async function claimTrial(session,companyId) {
 const trial=new URLSearchParams(location.search).get('trial');if(!trial)return;
 const response=await fetch(import.meta.env.VITE_SUPABASE_URL+'/functions/v1/marketplace-search',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
  body:JSON.stringify({action:'claim',token:trial,company_id:companyId}),
 });
 if(!response.ok)throw new Error('Your free search could not be linked. Please retry the original creator profile link.');
 const clean=new URL(location.href);clean.searchParams.delete('trial');history.replaceState(null,'',clean.href);
 try{sessionStorage.removeItem(key)}catch{}
}
