const {Buffer}=require('node:buffer');
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const chunks=[];for await(const c of process.stdin)chunks.push(c);
 const {email,password,origin}=JSON.parse(Buffer.concat(chunks));
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath());
 const browser=await chromium.launch({executablePath,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://*.supabase.co/**',async route=>{
  try{const req=route.request();const response=await fetch(req.url(),{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()});
   const headers=Object.fromEntries(response.headers);delete headers['content-encoding'];delete headers['content-length'];
   await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});
  }catch{await route.abort('failed');}
 });
 await page.route('**/.netlify/functions/plan-intake',async route=>{
  try{const req=route.request();const response=await fetch('https://wedflowai.netlify.app/.netlify/functions/plan-intake',{method:'POST',headers:{...(await req.allHeaders()),origin:'https://wedflowai.netlify.app'},body:req.postDataBuffer(),signal:AbortSignal.timeout(35000)});
   const body=await response.text();let result;try{result=JSON.parse(body);}catch{result={code:'invalid_endpoint_response'};}
   console.log('Live AI endpoint:',response.status,result.source || result.code || 'unknown');
   await route.fulfill({status:response.status,contentType:'application/json',body});
  }catch{console.log('Live AI endpoint unavailable; testing labelled fallback');await route.fulfill({status:503,contentType:'application/json',body:'{"code":"unavailable"}'});}
 });
 await page.goto(origin);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Create your wedding',exact:true}).click();
 await page.getByLabel('Your display name',{exact:true}).fill('UI acceptance');
 await page.getByLabel('Wedding name',{exact:true}).fill('A celebration together');
 await page.getByLabel('Wedding date',{exact:true}).fill('12/12/2027');
 await page.getByLabel('City (optional)',{exact:true}).fill('Indore');
 await page.getByRole('button',{name:'Create wedding',exact:true}).click();
 await page.getByLabel('Your wedding brief (optional)',{exact:true}).fill('300 guests, venue booked, reception');
 await page.screenshot({path:'/tmp/wedflow-stitch-intake-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Generate my timeline',exact:true}).click();
 await page.getByText('Your proposed wedding plan',{exact:true}).waitFor();
 if(await page.getByLabel('Suggested task name',{exact:true}).count())throw new Error('Task-entry fields should start collapsed');
 const expand=page.getByRole('button',{name:/^Expand /}).first();
 await expand.click();
 if(!await page.getByRole('button',{name:/^Collapse /}).count())throw new Error('Review accordion did not expand');
 await page.screenshot({path:'/tmp/wedflow-stitch-review-desktop.png',fullPage:true});
 const accept=page.getByRole('button',{name:/^Accept plan · \d+ tasks$/}).first();
 const acceptedCount=Number((await accept.getAttribute('aria-label')).match(/· (\d+)/)[1]);
 if(acceptedCount<10)throw new Error('Expected a real generated plan');
 await accept.click();
 await page.getByText(`${acceptedCount} active visible tasks`,{exact:false}).waitFor();
 await page.getByRole('button',{name:'Complete Compare photography options',exact:true}).click();
 await page.getByRole('radio',{name:'completed',exact:true}).click();
 await page.getByRole('button',{name:'Reopen Compare photography options',exact:true}).click();
 await page.getByRole('radio',{name:'Active',exact:true}).click();
 console.log('PASS: actual sign-in, setup, grouped proposal, atomic acceptance and completion/reopening');
 await page.getByRole('tab',{name:'Timeline',exact:true}).click();
 await page.getByText('Master planning timeline',{exact:true}).waitFor();
 await page.getByText('Loading your plan…',{exact:true}).waitFor({state:'hidden'});
 await page.getByRole('checkbox',{name:'Monthly view',exact:true}).click();
 await page.getByRole('button',{name:'Next month',exact:true}).click();
 await page.getByRole('button',{name:'Previous month',exact:true}).click();
 const eventDay=page.getByRole('button',{name:/, [1-9]\d* entries$/}).first();
 await eventDay.click();await page.getByRole('button',{name:/clear selection$/}).click();
 await page.screenshot({path:'/tmp/wedflow-stitch-calendar-desktop.png',fullPage:true});
 await page.getByRole('checkbox',{name:'Timeline list',exact:true}).click();
 await page.getByRole('button',{name:'Open task: Compare photography options',exact:true}).click();
 await page.getByLabel('Task name',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 console.log('PASS: month/date navigation and task deep-link editor with cancel');
 await page.getByRole('tab',{name:'Home',exact:true}).click();
 await page.getByText('Your planning progress',{exact:true}).waitFor();
 await page.getByText('Reviewing your visible plan…',{exact:true}).waitFor({state:'hidden'});
 await page.evaluate(()=>{document.querySelectorAll('*').forEach(e=>{if(e.scrollTop)e.scrollTop=0;});});
 await page.screenshot({path:'/tmp/wedflow-stitch-dashboard-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByText('Your planning progress',{exact:true}).waitFor();
 await page.screenshot({path:'/tmp/wedflow-stitch-dashboard-mobile.png',fullPage:true});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('Page overflows phone width');
 if(!await page.evaluate(()=>document.fonts.check('14px Inter_400Regular') && document.fonts.check('24px PlayfairDisplay_600SemiBold')))throw new Error('Brand fonts were not loaded');
 await page.reload();await page.getByText('Your planning progress',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Timeline',exact:true}).click();await page.getByText('Master planning timeline',{exact:true}).waitFor();
 await page.getByRole('checkbox',{name:'Monthly view',exact:true}).click();
 await page.getByRole('button',{name:'Next month',exact:true}).waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('Mobile calendar overflows page');
 await page.screenshot({path:'/tmp/wedflow-stitch-calendar-mobile.png',fullPage:true});
 if(errors.length)throw new Error('Browser runtime errors: '+errors.join('; '));
 console.log('PASS: responsive navigation, real-data dashboard, bundled fonts, mobile calendar and session reload; no runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error('UI check failed:',e.message);process.exitCode=1;});
