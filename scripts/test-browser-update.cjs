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
   await page.addInitScript(()=>{localStorage.setItem('collection_clients',JSON.stringify([{id:'previous-account',name:'OLD_ACCOUNT_CLIENT'}]));localStorage.setItem('collection_meta_v3',JSON.stringify({payments:[{id:'previous-payment'}]}));});
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
   assert.equal(await page.title(),'NEXA-MF');assert.equal(await page.evaluate(()=>window.MF_NEXA_RELEASE),'2026-09-17-r10');
   const initial=await page.evaluate(()=>({clients:clients.length,payments:meta.payments.length,locked:document.body.classList.contains('secureLocked'),preserved:localStorage.getItem('collection_clients').includes('OLD_ACCOUNT_CLIENT')}));assert.deepEqual(initial,{clients:0,payments:0,locked:true,preserved:true});
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
   const output=path.resolve(process.env.MF_NEXA_TEST_OUTPUT||path.join(root,'../output/verification'));fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,`report-${viewport.width}.png`),fullPage:true});
   const reconciliation=await page.evaluate(()=>{
    // Synthetic financial values mirror the read-only SQL aggregate, not customer identities.
    clients=[{id:901,clientNo:'DEMO-901',name:'عميل توضيحي',employee:'موظف توضيحي',assignedUserId:'E1',branchCode:'B1',inLate:true,inDue:true,arrears:100,netToPay:100,dueAmount:100,lateDays:40},{id:902,clientNo:'DEMO-902',name:'عميل توضيحي ثان',employee:'موظف ثان',assignedUserId:'E2',branchCode:'B1',inLate:true,inDue:false,arrears:100,netToPay:100,dueAmount:0,lateDays:35}];
    meta.payments=[{id:'fixture',dbId:'fixture',clientId:'901',clientNo:'DEMO-901',name:'عميل توضيحي',employee:'موظف توضيحي',employeeId:'E1',branch:'B1',amount:50,date:'2026-09-14',type:'partial',status:'successful',balanceBefore:150,balanceAfter:100}];
    ensureLegacyLOs();renderPaid();mfRenderDashboard();mfPaymentReportFilter={date:'2026-09-14',branch:'B1',employee:'E1'};document.getElementById('mfReportType').value='payments';mfPreviewReport();
    const historic=mfReportRows('payments');mfPaymentReportFilter.date='2026-09-16';const current=mfReportRows('payments');mfPaymentReportFilter.date='2026-09-14';
    return {employeeTotal:mfEmployeeMetrics(mfEmployeeCatalog().find(e=>e.id==='E1')).collected,paidCount:Number(document.getElementById('paymentsCount').textContent),total:mfCollectionTotal(),paidCustomers:mfPaidReportRows().length,late:mfReportRows('late').length,due:mfReportRows('due').length,historic:historic.reduce((n,p)=>n+p.Amount,0),current:current.length,dashboard:document.getElementById('mfDashboardBody').textContent};
   });
   assert.equal(reconciliation.employeeTotal,50);assert.equal(reconciliation.total,50);assert.equal(reconciliation.paidCount,1);assert.equal(reconciliation.paidCustomers,1);assert.equal(reconciliation.late,2);assert.equal(reconciliation.due,1);assert.equal(reconciliation.historic,50);assert.equal(reconciliation.current,0);assert(reconciliation.dashboard.includes('كل الأيام'));
   await page.screenshot({path:path.join(output,`reconciled-report-${viewport.width}.png`),fullPage:true});
   const collaboration=await page.evaluate(()=>{
    mfClose('mfReportsModal');const s=mfState();
    s.announcements=[{id:'fixture-ann',dbId:'fixture-ann',title:'إعلان توضيحي',text:'محتوى منشور للاختبار المحلي',isPublished:true,authorId:CURRENT_PROFILE.id,createdAt:new Date().toISOString(),attachment:{storagePath:'fixture/path',type:'image/png'}}];
    s.morningContent=[];s.teamSpiritContent=[];s.clientNotes=[{id:'fixture-note',clientId:'901',text:'ملاحظة توضيحية محفوظة',createdAt:new Date().toISOString()}];
    mfRenderCommunications();mfOpen('mfCommsModal');const body=document.getElementById('mfCommsBody').innerText;
    const timeline=mfTimelineRows(clients[0]);mfOpenAnnouncementForm('morning');
    const form=!!document.getElementById('mfCommPublish')&&!!document.getElementById('mfCommStarts')&&!!document.getElementById('mfCommTeam');mfFormClose();
    return {body,notes:timeline.filter(x=>x.type==='note').length,form};
   });
   assert(collaboration.body.includes('إعلان توضيحي')&&collaboration.body.includes('عرض المرفق')&&collaboration.body.includes('إدارة المحتوى والمسودات'));assert.equal(collaboration.notes,1);assert(collaboration.form);
   await page.screenshot({path:path.join(output,`communications-${viewport.width}.png`),fullPage:true});
   const recovery=await page.evaluate(()=>{
    mfClose('mfCommsModal');mfOpenBackupRestore();return {password:document.getElementById('mfArchivePassword')?.type,confirm:!!document.getElementById('mfArchivePasswordAgain'),verify:!!document.getElementById('mfArchiveOpenPassword'),dangerousRestore:!!document.getElementById('mfRestoreConfirmBtn')};
   });
   assert.equal(recovery.password,'password');assert(recovery.confirm&&recovery.verify);assert(!recovery.dangerousRestore);
   await page.screenshot({path:path.join(output,`recovery-${viewport.width}.png`),fullPage:true});
   const messaging=await page.evaluate(()=>{
    mfFormClose();mfCurrentChatRoom='general';mfState().chat=[{id:'chat-fixture',dbId:'chat-fixture',roomId:'general',roomType:'general',senderId:'fixture-other',senderName:'موظف توضيحي',text:'رسالة توضيحية محلية',createdAt:new Date().toISOString()}];mfRenderChat();mfOpen('mfChatModal');document.getElementById('mfChatText').value='مسودة تبقى عند التحديث';
    mfMergeChatMessage({id:'chat-fixture-2',room_id:'general',room_type:'general',sender_id:'fixture-other',sender_name:'موظف توضيحي',message_text:'تحديث محلي',created_at:new Date().toISOString()});mfRenderChat();
    return {draft:document.getElementById('mfChatText').value,text:document.getElementById('mfChatBody').innerText,rooms:mfChatRooms().map(r=>r.id)};
   });
   assert.equal(messaging.draft,'مسودة تبقى عند التحديث');assert(messaging.text.includes('رسالة توضيحية محلية')&&messaging.text.includes('تحديث محلي'));assert(!messaging.rooms.includes('team:general-team'));
   await page.screenshot({path:path.join(output,`chat-${viewport.width}.png`),fullPage:true});
   const signedOut=await page.evaluate(()=>{mfInvalidateSessionView();return {clients:clients.length,payments:meta.payments.length,profile:CURRENT_PROFILE,locked:document.body.classList.contains('secureLocked'),chat:document.getElementById('mfChatBody').innerHTML};});assert.deepEqual(signedOut,{clients:0,payments:0,profile:null,locked:true,chat:''});
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({browserChecks:'PASS',viewports:['desktop 1366','mobile 390'],databaseRequests:'blocked',authenticatedProductionE2E:false}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
