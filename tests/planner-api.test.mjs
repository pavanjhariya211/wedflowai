import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleIntake } from '../netlify/functions/plan-intake.ts';
const base='https://kyoabyflvstsvvenmcot.supabase.co';
const env={ EXPO_PUBLIC_SUPABASE_URL:base, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test', OPENAI_API_KEY:'test-server-key' };
const facts={ guestCount:300, venueBooked:true, cateringBooked:null, photographyBooked:null, functions:['reception'], travelNeeded:null };
const body={ brief:'300 guests, venue booked, reception', wedding:'9d100000-0000-4000-8000-000000000001', workspace:'9d200000-0000-4000-8000-000000000001' };
function request(data=body,headers={}) { return new Request('https://wedflowai.netlify.app/.netlify/functions/plan-intake',{method:'POST',headers:{Authorization:'Bearer test-session','Content-Type':'application/json',...headers},body:JSON.stringify(data)}); }
function queue(responses) { const calls=[];return {calls,send:async (...args)=>{calls.push(args);assert.ok(responses.length);return responses.shift();}}; }
test('missing auth and disallowed browser origins never reach a provider',async()=>{
 const q=queue([]);const unauth=request(body,{Authorization:''});assert.equal((await handleIntake(unauth,env,q.send)).status,401);
 assert.equal((await handleIntake(request(body,{origin:'https://other.example'}),env,q.send)).status,403);assert.equal(q.calls.length,0);
});
test('missing server AI key returns honest unavailable after checking identity',async()=>{
 const q=queue([Response.json({id:'user'})]);const response=await handleIntake(request(),{...env,OPENAI_API_KEY:undefined},q.send);
 assert.equal(response.status,503);assert.equal((await response.json()).code,'ai_not_configured');assert.equal(q.calls.length,1);
});
test('workspace denial and atomic rate quota prevent provider calls',async()=>{
 for(const [code,status] of [['42501',403],['54000',429]]){
 const q=queue([Response.json({id:'user'}),Response.json({code},{status:403})]);assert.equal((await handleIntake(request(),env,q.send)).status,status);assert.equal(q.calls.length,2);
 }
});
test('successful AI output is validated; only a brief reaches OpenAI, never session or saved task data',async()=>{
 const q=queue([Response.json({id:'user'}),new Response(null,{status:204}),Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(facts)}]}]})]);
 const response=await handleIntake(request(),env,q.send);assert.equal(response.status,200);assert.deepEqual((await response.json()).facts,facts);
 const sent=JSON.parse(q.calls[2][1].body);assert.equal(sent.input,body.brief);assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);
 assert.ok(!q.calls[2][1].body.includes('test-session'));assert.ok(!q.calls[2][1].body.includes(body.workspace));
});
test('malformed, out-of-range, refused or incomplete output never becomes trusted facts',async()=>{
 for(const output of [JSON.stringify({...facts,guestCount:10001}),'{bad','null']){
 const q=queue([Response.json({id:'user'}),new Response(null,{status:204}),Response.json({status:'completed',output:[{content:[{type:'output_text',text:output}]}]})]);
 assert.equal((await handleIntake(request(),env,q.send)).status,502);
 }
 const q=queue([Response.json({id:'user'}),new Response(null,{status:204}),Response.json({status:'incomplete',output:[]})]);assert.equal((await handleIntake(request(),env,q.send)).status,502);
});
test('oversized and invalid intake is rejected before authentication requests',async()=>{
 const q=queue([]);assert.equal((await handleIntake(request({...body,brief:'x'.repeat(1501)}),env,q.send)).status,400);assert.equal(q.calls.length,0);
});
