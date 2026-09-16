const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.route('**/*.supabase.co/**',route=>route.abort());
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
   assert.equal(await page.title(),'NEXA-MF');assert.equal(await page.evaluate(()=>window.MF_NEXA_RELEASE),'2026-09-16-r1');
   const result=await page.evaluate(()=>{
    // In-memory fixtures only; all database network requests are blocked.
    CURRENT_PROFILE={id:'browser-fixture',role:'founder',branch_code:'B1',full_name:'UI regression'};
    clients=[{id:901,clientNo:'DEMO-901',name:'عميل توضيحي',employee:'موظف توضيحي',branchCode:'B1',installment:20}];
    meta.payments=[{id:'fixture',dbId:'fixture',clientId:'901',clientNo:'DEMO-901',name:'عميل توضيحي',employee:'موظف توضيحي',employeeId:'E1',branch:'B1',amount:10,date:today(),type:'partial',status:'successful',balanceBefore:30,balanceAfter:20}];
    mfState().locations=[{dbId:'fixture-location',clientId:mfClientKey(clients[0]),type:'client_home',lat:31.95,lng:35.91,createdAt:'2026-09-16'}];
    mfActiveClientIndex=0;const actions=mfRenderClientOverview(clients[0]);
    document.body.classList.remove('secureLocked');document.getElementById('authGate').style.display='none';
    mfRenderReports();document.getElementById('mfReportType').value='payments';mfPreviewReport();mfOpen('mfReportsModal');
    return {send:actions.includes('إرسال الموقع'),open:actions.includes('فتح الموقع'),report:document.getElementById('mfReportPreview').innerText,source:!!document.getElementById('mfImportSource')};
   });
   assert(result.send&&result.open&&result.source);assert(result.report.includes('كشف الدفعات للفرع'));assert(result.report.includes('عميل توضيحي'));
   const output=path.resolve(root,'../output/verification');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`report-${viewport.width}.png`),fullPage:true});
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({browserChecks:'PASS',viewports:['desktop 1366','mobile 390'],databaseRequests:'blocked',authenticatedProductionE2E:false}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
