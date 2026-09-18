// Browser-only fixture. All Supabase requests are intercepted; no production writes.
async (page) => {
 const uid='11111111-1111-4111-8111-111111111111',cid='22222222-2222-4222-8222-222222222222',pid='33333333-3333-4333-8333-333333333333';
 const user={id:uid,email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const company={id:cid,owner_id:uid,company_name:'IVRE QA — browser fixture',plan:'free',search_limit:1,campaign_limit:1};
 const profile={id:uid,full_name:'QA Creator',email:'qa@example.invalid',bio:'Fitness stories and practical training videos for everyday athletes.',location:'Mumbai',niches:['Fitness'],follower_count:18400,engagement_rate:7.8,availability:'available',instagram_handle:'@qa',base_rate:10000,avatar_url:null,portfolio_url:null,status:'active',published:true,languages:['English','Hindi'],previous_work:'Example portfolio description for browser testing only.',assets:[],created_at:'2026-01-01T00:00:00Z',content_formats:['Reels'],audience_locations:['India'],total_earnings:0,completed_campaigns:0,packages:[{id:pid,title:'One Instagram reel',platform:'Instagram',creator_amount:10000,display_price:11000,deliverables:'One edited reel with captions and one revision.',delivery_days:7,requires_post:true,usage_rights:'Organic use for 3 months.'}]};
 const cart={items:[{...profile.packages[0],package_id:pid,creator_id:uid,creator_name:profile.full_name,quantity:1,available:true}],package_total:11000,company_fee:1000,subtotal:12000,payment_enabled:false,payment_notice:'Online booking payments are not active. No money will be collected.'};
 await page.route('https://jbkpxjabnknjazwnnlwb.supabase.co/**',async route=>{
  const u={pathname:route.request().url().split('?')[0]};let body=[];
  if(u.pathname.includes('/auth/'))body={user};
  if(u.pathname.endsWith('/company_members'))body=[{company_id:cid,user_id:uid,role:'owner',company_profiles:{company_name:company.company_name}}];
  if(u.pathname.endsWith('/company_profiles'))body=company;
  if(u.pathname.endsWith('/creator_profiles'))body=profile;
  if(u.pathname.endsWith('/creator_storefronts'))body={creator_id:uid,published:false,languages:['English'],previous_work:'Example'};
  if(u.pathname.endsWith('/creator_packages'))body=profile.packages.map(p=>({...p,active:true}));
  if(u.pathname.endsWith('/marketplace_profile'))body=profile;
  if(u.pathname.endsWith('/marketplace_featured'))body=[{...profile,display_price:11000}];
  if(u.pathname.endsWith('/marketplace_cart'))body=cart;
  if(u.pathname.endsWith('/marketplace_cart_briefs'))body=null;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const token='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6NDcwMDAwMDAwMH0.test-signature';
 const session={access_token:token,refresh_token:'browser-fixture-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 await page.context().addInitScript(({session})=>{localStorage.setItem('ivre-company-auth',JSON.stringify(session));localStorage.setItem('sb-jbkpxjabnknjazwnnlwb-auth-token',JSON.stringify(session));},{session});
 await page.setViewportSize({width:1280,height:900});
 await page.goto('http://127.0.0.1:4190/?page=Marketplace&creator='+uid);
 await page.getByRole('heading',{name:'QA Creator',exact:true}).waitFor();
 await page.getByRole('button',{name:'Add to cart',exact:true}).click();
 await page.getByText('Added to your campaign cart.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'View cart',exact:true}).click();
 await page.getByRole('button',{name:'Continue to checkout →',exact:true}).click();
 await page.getByRole('heading',{name:'Your campaign brief',exact:true}).waitFor();
 if(!await page.getByRole('button',{name:'Pay securely with Razorpay',exact:true}).isDisabled())throw Error('Unconfigured payment must remain disabled');
 await page.screenshot({path:'/tmp/ivre-r2-checkout-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
 await page.screenshot({path:'/tmp/ivre-r2-checkout-mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:4180/');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Profile',exact:true}).click();
 await page.getByRole('heading',{name:'Your work. Your packages. Your price.',exact:true}).waitFor();
 await page.getByRole('button',{name:'Publish profile',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);
 const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('main *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,8));
 if(overflow.length)throw Error('Creator mobile overflow: '+JSON.stringify(overflow));
 await page.screenshot({path:'/tmp/ivre-r2-creator-mobile.png',fullPage:true});
 console.log('PASS: profile → add to cart → checkout, payment gate, mobile layout, creator storefront editor. Supabase requests mocked.');
}
