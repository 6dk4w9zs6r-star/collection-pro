const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{stripTypeScriptTypes}=require('node:module'),path=require('path');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/mf-nexa-ai/index.ts'),'utf8'));
async function run({active=true,auth=true,provider=false,payload={prompt:'ملخص المحفظة',summary:{clients:99999}},inScope=true}={}){
 let handler,providerInput;const calls=[];
 const scope={Request,Response,URLSearchParams,console,Deno:{env:{get:k=>({SUPABASE_URL:'https://db.test',SUPABASE_ANON_KEY:'public',OPENAI_API_KEY:provider?'test-key':undefined})[k]},serve:f=>handler=f},fetch:async(url,opts={})=>{
  calls.push(url);if(url.endsWith('/auth/v1/user'))return Response.json(auth?{id:'user'}:{},{status:auth?200:401});
  if(url.includes('/profiles?'))return Response.json(active?[{id:'user',role:'lo'}]:[]);
  if(opts.method==='HEAD')return new Response(null,{headers:{'content-range':'0-0/1'}});
  if(url.includes('/clients?'))return Response.json(inScope?[{id:2,client_name:'Scoped',client_number:'T',overdue_amount:20,due_amount:0,days_overdue:40}]:[]);
  if(url==='https://api.openai.com/v1/responses'){providerInput=JSON.parse(opts.body);return Response.json({output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'جواب المزوّد'}]}]});}
  throw Error('Unexpected request '+url);
 }};vm.createContext(scope);vm.runInContext(source,scope);
 const response=await handler(new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify(payload)}));return {status:response.status,body:await response.json(),calls,providerInput};
}
(async()=>{
 assert.equal((await run({auth:false})).status,401);
 assert.equal((await run({active:false})).status,403);
 const normal=await run();assert.equal(normal.status,200);assert(!normal.body.answer.includes('99999'));assert(normal.body.answer.includes('1'));
 assert.equal((await run({payload:{prompt:'عميل',client:{id:9,name:'Forged'}},inScope:false})).status,403);
 const general=await run({provider:true,payload:{prompt:'سؤال عام',mode:'general_qa',summary:{secret:'forged'},client:{name:'forged'}}});assert.equal(general.body.answer,'جواب المزوّد');assert(!general.calls.some(x=>x.includes('/clients?')));assert.equal(general.providerInput.store,false);assert(!JSON.stringify(general.providerInput).includes('forged'));
 console.log(JSON.stringify({aiScopeChecks:5,providerCalls:'mocked'}));
})().catch(e=>{console.error(e);process.exitCode=1});
