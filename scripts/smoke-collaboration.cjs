// UI acceptance with explicitly simulated services; never creates hosted users or sends email.
const {Buffer}=require('node:buffer');
const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
(async()=>{
 const chunks=[];for await(const c of process.stdin)chunks.push(c);
 const {origin,width=390}=JSON.parse(Buffer.concat(chunks));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const ids={admin:'11111111-1111-4111-8111-111111111111',guest:'22222222-2222-4222-8222-222222222222',wrong:'33333333-3333-4333-8333-333333333333'};
 const wid='44444444-4444-4444-8444-444444444444',old='55555555-5555-4555-8555-555555555555',sid='66666666-6666-4666-8666-666666666666';
 const wedding=id=>({id,title:id===wid?'Together wedding':'My earlier wedding',creator_id:id===wid?ids.admin:ids.guest,main_date:'2027-12-12',planning_start:'2026-11-01',city:'Indore',sharing_mode:'shared',format:'single',timezone:'Asia/Kolkata',budget_paise:null,version:1});
 let invitations=[],joined=false,creates=0;
 const profiles={admin:{id:ids.admin,email:'admin@example.invalid'},guest:{id:ids.guest,email:'guest@example.invalid'},wrong:{id:ids.wrong,email:'wrong@example.invalid'}};
 const sessions=Object.fromEntries(Object.entries(profiles).map(([name,user])=>{
  const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  return [name,{access_token:b({alg:'HS256'})+'.'+b({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})+'.fixture',refresh_token:'fixture-'+name,expires_in:3600,token_type:'bearer',user:{...user,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}}];
 }));
 const errors=[];
 async function context(){
  const ctx=await browser.newContext({viewport:{width,height:844}});
  await ctx.route('https://*.supabase.co/**',async route=>{
   const req=route.request(),u=new URL(req.url()),endpoint=u.pathname.split('/').pop();
   const body=req.postData()?JSON.parse(req.postData()):{};
   const headers=await req.allHeaders();
   const who=Object.keys(sessions).find(k=>headers.authorization==='Bearer '+sessions[k].access_token);
   let data=[],status=200;
   if(endpoint==='token') data=sessions[Object.keys(profiles).find(k=>profiles[k].email===body.email)];
   else if(endpoint==='signup') data={user:sessions.guest.user};
   else if(endpoint==='logout'){await route.fulfill({status:204});return;}
   else if(!who){data={code:'42501',message:'Access denied'};status=401;}
   else if(endpoint==='user')data=sessions[who].user;
   else if(endpoint==='weddings')data=who==='admin'?[wedding(wid)]:who==='guest'?[wedding(old),...(joined?[wedding(wid)]:[])]:[];
   else if(endpoint==='wf_workspace_access')data=[{id:sid,name:'Our wedding',kind:'shared',can_edit:who==='admin',can_manage:who==='admin',bootstrap:false}];
   else if(endpoint==='workspace_memberships')data=[{workspace_id:sid,user_id:ids.admin,role:'admin',profiles:{display_name:'Organiser'}},...(joined?[{workspace_id:sid,user_id:ids.guest,role:'viewer',profiles:{display_name:'Relative'}}]:[])];
   else if(endpoint==='invitations')data=who==='admin'?invitations.map(({token:_token,...i})=>i):[];
   else if(endpoint==='wf_invite_whatsapp'){
    const i={id:randomBytes(16).toString('hex'),workspace_id:sid,email:null,channel:'whatsapp',role:body.p_role,token:randomBytes(32).toString('hex'),expires_at:new Date(Date.now()+86400000).toISOString(),accepted_at:null,revoked_at:null};invitations.push(i);data=i.token;
   }else if(endpoint==='wf_accept_invite'){
    const invite=invitations.find(i=>i.token===body.p_token && !i.revoked_at && new Date(i.expires_at).valueOf()>Date.now() && (!i.accepted_by || i.accepted_by===profiles[who].id));
    if(!invite){data={code:'42501',message:'Invitation invalid, expired or belongs to another email'};status=403;}
    else{invite.accepted_at=new Date().toISOString();invite.accepted_by=profiles[who].id;joined=true;data=wid;}
   }else if(endpoint==='wf_revoke_invite'){invitations.find(i=>i.id===body.p_id).revoked_at=new Date().toISOString();data=null;}
   else if(endpoint==='wf_create_wedding'){creates++;throw new Error('Joining must not create a wedding');}
   else if(!['ceremonies','planning_tasks','task_history'].includes(endpoint))throw new Error('Unhandled fixture request: '+endpoint);
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  if(origin.startsWith('https:'))await ctx.route(origin+'/**',async route=>{
   const r=await fetch(route.request().url());const headers=Object.fromEntries(r.headers);delete headers['content-encoding'];delete headers['content-length'];await route.fulfill({status:r.status,headers,body:Buffer.from(await r.arrayBuffer())});
  });
  const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));return {ctx,page};
 }
 async function login(page,email){await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('Synthetic-testing-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
 try{
  console.log('FIXTURE UI ACCEPTANCE: no hosted accounts, email, or database writes.');
  const admin=await context();await admin.page.goto(origin+'/auth/sign-in');await login(admin.page,profiles.admin.email);
  await admin.page.getByRole('button',{name:'Invite family',exact:true}).click();
  if(await admin.page.getByLabel('Invited email',{exact:true}).count())throw new Error('WhatsApp invites must not request recipient email');
  await admin.page.getByRole('radio',{name:'View only',exact:true}).first().click();
  await admin.page.getByRole('button',{name:'Create WhatsApp invite',exact:true}).click();
  const link=await admin.page.getByLabel('New invitation link',{exact:true}).textContent();
  if(!link.includes('/join#invite=')||new URL(link).search)throw new Error('Expected a fragment-based invitation link');
  await admin.page.getByText(/Pending: WhatsApp invite .* · View only/).waitFor();
  await admin.page.getByRole('button',{name:'Share on WhatsApp',exact:true}).waitFor();
  const guest=await context();await guest.page.goto(origin+'/join'+new URL(link).hash);
  await guest.page.getByRole('button',{name:'Create an account to join',exact:true}).click();
  await guest.page.getByLabel('Email',{exact:true}).fill(profiles.guest.email);
  await guest.page.getByLabel('Password',{exact:true}).fill('Synthetic-testing-password');
  await guest.page.getByLabel('Confirm password',{exact:true}).fill('Synthetic-testing-password');
  await guest.page.getByRole('button',{name:'Create account',exact:true}).click();
  await guest.page.getByText(/Check your email for a verification link/).waitFor();
  await guest.page.reload();await guest.page.getByRole('button',{name:'Back to sign in',exact:true}).click();
  await login(guest.page,profiles.wrong.email);
  await guest.page.getByRole('button',{name:'Use a different account',exact:true}).click();
  await login(guest.page,profiles.guest.email);
  await guest.page.locator('input[aria-label="Your display name"]:visible').fill('Relative');
  await guest.page.getByRole('button',{name:'Accept invitation and join',exact:true}).click();
  await guest.page.getByRole('button',{name:'Open wedding workspace',exact:true}).getByText('Together wedding',{exact:true}).waitFor();
  if(creates!==0)throw new Error('Unexpected wedding creation');
  await guest.page.getByRole('radio',{name:'My earlier wedding',exact:true}).click();
  await guest.page.getByRole('button',{name:'Open wedding workspace',exact:true}).getByText('My earlier wedding',{exact:true}).waitFor();
  await guest.page.getByRole('tab',{name:'Family',exact:true}).click();
  await guest.page.getByRole('tab',{name:'Home',exact:true}).click();
  await guest.page.getByRole('button',{name:'Open wedding workspace',exact:true}).getByText('My earlier wedding',{exact:true}).waitFor();
  await guest.page.getByRole('radio',{name:'Together wedding',exact:true}).click();
  await guest.page.getByRole('button',{name:'Open wedding workspace',exact:true}).getByText('Together wedding',{exact:true}).waitFor();

  if(await guest.page.evaluate(()=>!!localStorage.getItem('wedflow.pending-invitation')))throw new Error('Accepted token was not cleared');
  await guest.page.getByRole('tab',{name:'Plan',exact:true}).click();await guest.page.getByText('You have view-only access.',{exact:true}).waitFor();
  await guest.page.getByRole('button',{name:'Show my tasks',exact:true}).click();await guest.page.getByText('Showing active tasks assigned to you.',{exact:true}).waitFor();
  if(await guest.page.getByRole('button',{name:'Add a custom task',exact:true}).count())throw new Error('Viewer saw mutation controls');
  await admin.page.getByRole('button',{name:'Refresh family access',exact:true}).click();
  await admin.page.getByText('Relative · View only',{exact:false}).waitFor();
  await admin.page.getByRole('button',{name:'Create WhatsApp invite',exact:true}).click();
  await admin.page.getByText(/Pending: WhatsApp invite .* · View only/).waitFor();
  await admin.page.getByRole('button',{name:'Revoke invitation '+invitations.at(-1).id.slice(0,8),exact:true}).click();
  await admin.page.getByText('No pending invitations.',{exact:true}).waitFor();
  const replay=await context();await replay.page.goto(origin+'/join'+new URL(link).hash);
  await replay.page.getByRole('button',{name:'Sign in to accept',exact:true}).click();await login(replay.page,profiles.wrong.email);
  await replay.page.locator('input[aria-label="Your display name"]:visible').fill('Another person');
  await replay.page.getByRole('button',{name:'Accept invitation and join',exact:true}).click();
  await replay.page.getByText(/Access denied/).waitFor();
  if(errors.length)throw new Error(errors.join('; '));
  await admin.page.screenshot({path:'/tmp/wedflow-collaboration-family.png',fullPage:true});
  if(await admin.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
  console.log('PASS: WhatsApp-only invite link without recipient email, pending member, registration/verification guidance and reload persistence.');
  console.log('PASS: one-use link replay rejection, account switch, explicit acceptance into an existing wedding, no duplicate wedding and token cleanup.');
  console.log('PASS: viewer controls, joined/pending sections, revocation, mobile layout and no runtime errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error('Collaboration UI acceptance failed:',e.message);process.exitCode=1;});
