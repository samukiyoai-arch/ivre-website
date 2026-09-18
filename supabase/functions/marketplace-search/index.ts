import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8';
const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const encoder=new TextEncoder();
const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const hex=(buf:ArrayBuffer)=>Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
async function signature(id:string){return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('ivre-trial-v2:'+id)))}
async function tokenId(token:unknown){if(typeof token!=='string'||!/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token))return null;const [id,sig]=token.split('.');const bytes=new Uint8Array(sig.match(/../g)!.map(x=>parseInt(x,16)));return await crypto.subtle.verify('HMAC',key,bytes,encoder.encode('ivre-trial-v2:'+id))?id:null;}
function criteriaFor(prompt:string){
 const q=prompt.toLowerCase(),out:Record<string,unknown>={};
 const niche=['Fitness','Beauty','Food','Fashion','Lifestyle','Travel','Technology','Finance','Parenting'].find(n=>q.includes(n.toLowerCase()));if(niche)out.niche=niche;
 if(!niche&&/\b(gym|fitness)\b/.test(q))out.niche='Fitness';if(!niche&&/\btech\b/.test(q))out.niche='Technology';
 const platform=['Instagram','YouTube','TikTok','Facebook','LinkedIn','UGC'].find(n=>q.includes(n.toLowerCase()));if(platform)out.platform=platform;
 const city=prompt.match(/\b(?:in|from|based in)\s+([a-z][a-z ]*?)(?=\s+(?:with|under|between|for|who|charging|and|creators|influencers)|[,.;]|$)/i);if(city)out.location=city[1].trim();
 const num=(n:string,u?:string)=>Number(n.replaceAll(',',''))*(u==='k'?1000:u==='m'?1000000:1);
 const range=q.match(/([\d,.]+)\s*([km]?)\s*(?:-|–|to|and)\s*([\d,.]+)\s*([km]?)\s*followers/);if(range){out.follower_min=num(range[1],range[2]);out.follower_max=num(range[3],range[4]);}
 const price=q.match(/(?:under|budget(?: of| around| under)?|up to|₹|rs\.?|inr)\s*₹?\s*([\d,.]+)\s*([km]?)/);if(price)out.budget_max=num(price[1],price[2]);return out;
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const permitted=['https://ivre.in','https://www.ivre.in','https://ivre-company-dashboard.vercel.app','http://127.0.0.1:4190','http://127.0.0.1:4192'];
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(permitted.includes(origin))headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization, apikey, content-type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try {
  const raw=await req.text();if(raw.length>5000)return reply({error:'Request too large'},413);const body=JSON.parse(raw);
  let id=await tokenId(body.token);
  if(body.action==='claim'){
   if(!id)return reply({error:'Invalid trial token'},400);
   const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!bearer)return reply({error:'Sign in to continue'},401);
   const {data:{user},error}=await db.auth.getUser(bearer);if(error||!user)return reply({error:'Sign in to continue'},401);
   const gkey=hex(await crypto.subtle.digest('SHA-256',encoder.encode(id)));
   const result=await db.rpc('marketplace_claim_trial',{gkey,cid:body.company_id,actor:user.id});if(result.error)return reply({error:'Unable to link this trial to the selected company'},403);return reply({claimed:result.data});
  }
  if(body.action!=='search')return reply({error:'Invalid action'},400);
  if(typeof body.prompt!=='string'||body.prompt.trim().length<3||body.prompt.length>1500)return reply({error:'Describe your creator in 3–1,500 characters.'},400);
  if(body.token&&!id)return reply({error:'Invalid trial token. Sign in to continue.'},400);
  id ||= crypto.randomUUID();const token=id+'.'+await signature(id);
  const gkey=hex(await crypto.subtle.digest('SHA-256',encoder.encode(id)));
  const {data,error}=await db.rpc('marketplace_guest_search',{gkey,query_text:body.prompt.trim(),criteria:criteriaFor(body.prompt)});
  if(error)return reply({error:'Creator search is temporarily unavailable. Please try again.'},503);
  return reply({...data,token});
 }catch{return reply({error:'Unable to process this request.'},400)}
});
