// Read-only live check using the public browser key. Never prints returned records.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const url=html.match(/const SB_URL="([^"]+)"/)[1],key=html.match(/const SB_KEY="([^"]+)"/)[1];assert(key.startsWith('sb_publishable_'));
(async()=>{const tables=['clients','profiles','payments','follow_ups','promises_to_pay','legal_cases','write_offs','deferrals','disbursements','locations','chat_messages','notifications','audit_log','call_invitations'];
 const checks=await Promise.all(tables.map(async table=>{const r=await fetch(url+'/rest/v1/'+table+'?select=id&limit=1',{headers:{apikey:key},signal:AbortSignal.timeout(20000)});let body;try{body=await r.json()}catch(_){}return {table,status:r.status,noRowsExposed:(r.ok&&Array.isArray(body)&&body.length===0)||[401,403].includes(r.status)};}));
 const result={checkedAt:new Date().toISOString(),kind:'live anonymous read-only REST',authenticatedE2E:false,checks,passed:checks.every(c=>c.noRowsExposed)};
 const output=path.resolve(root,'../output/verification/anonymous-access.json');fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
