// No live credentials or database writes: exercise the shipped startup and entry functions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(root,'app.html'),'utf8'));
const extract=name=>{const match=html.match(new RegExp('(?:async )?function '+name+'\\([^\\n]*?\\)\\{[\\s\\S]*?\\n\\}'));assert(match,'Missing '+name);return match[0]};
const entry=html.split('\n').find(line=>line.startsWith('async function mfFinishAuthenticatedEntry('));
const startup=extract('secureInit'),remember=extract('initRememberMe');
async function run(options={},stored=new Map([['remember','1'],['email','test@example.org']])){
 const classes=new Set(['secureLocked']),nodes={authGate:{style:{display:'flex'}},authMsg:{textContent:''},rememberMe:{checked:false},loginEmail:{value:''}},button={disabled:false},calls=[];
 const user={id:'test-user'},state={epoch:0},context={console,document:{body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},querySelector:()=>button},$:id=>nodes[id],STORE:{getItem:key=>stored.get(key)},REMEMBER_ON_KEY:'remember',REMEMBER_EMAIL_KEY:'email',CURRENT_AUTH_USER:null,CURRENT_PROFILE:null,sb:null,
 mfSessionEpoch:()=>state.epoch,mfInvalidateSessionView(){state.epoch++;context.CURRENT_AUTH_USER=null;context.CURRENT_PROFILE=null;classes.add('secureLocked')},
 async getSecureClient(){return {auth:{async signOut(){calls.push('signOut')},async getSession(){calls.push('session');return {data:{session:options.absent?null:{user}},error:options.sessionError?Error('session read failed'):null}},async getUser(){calls.push('verify');return {data:{user:options.mismatch?{id:'other'}:user},error:options.revoked?Error('revoked'):null}}}}},
 async loadSecureProfile(){calls.push('profile');if(options.stale)state.epoch++;if(options.inactive)return false;context.CURRENT_PROFILE={id:user.id,role:'founder'};return true},
 mfInstallStage5Dom(){},mfState(){},async roleAwareBootstrap(){calls.push('bootstrap');assert(classes.has('secureLocked'));assert.equal(context.CURRENT_PROFILE.id,user.id);if(options.bootstrapError)throw Error('bootstrap failed')},
 async mfEnsureConsent(){calls.push('consent');return !options.consentMissing},loadCfmpName(){},mfAudit(){},async mfMaybeForcePasswordChange(){},mfSchedulePaymentSync(){},mfSubscribeChat(){},mfCheckReminders(){}};
 context.window=context;vm.createContext(context);vm.runInContext(remember+'\n'+entry+'\n'+startup,context);await context.secureInit();
 return {locked:classes.has('secureLocked'),nodes,button,calls,context};
}
(async()=>{
 let count=0;
 // Two new page contexts use the same saved opt-in, as on repeated Refresh.
 const stored=new Map([['remember','1'],['email','test@example.org']]);
 for(let refresh=0;refresh<2;refresh++){
  const r=await run({},stored);assert.equal(r.locked,false);assert.equal(r.nodes.authGate.style.display,'none');assert.equal(r.nodes.loginEmail.value,'test@example.org');assert.equal(r.context.CURRENT_PROFILE.role,'founder');assert.deepEqual(r.calls.slice(0,4),['session','verify','profile','bootstrap']);assert(!r.calls.includes('signOut'));assert.equal(r.button.disabled,false);count++;
 }
 const noOptIn=await run({},new Map());assert(noOptIn.locked);assert.deepEqual(noOptIn.calls,['signOut']);count++;
 for(const options of [{absent:true},{sessionError:true},{revoked:true},{mismatch:true},{inactive:true},{stale:true}]){
  const r=await run(options);assert(r.locked);assert(!r.calls.includes('bootstrap'));assert.equal(r.button.disabled,false);assert(!r.calls.includes('signOut'));count++;
 }
 const failed=await run({bootstrapError:true});assert(failed.locked);assert.equal(failed.context.CURRENT_PROFILE,null);assert.equal(failed.nodes.authGate.style.display,'flex');assert(failed.nodes.authMsg.textContent.includes('bootstrap failed'));count++;
 const consent=await run({consentMissing:true});assert(consent.locked);assert.equal(consent.nodes.authGate.style.display,'none');assert.equal(consent.context.CURRENT_PROFILE.role,'founder');count++;
 console.log(JSON.stringify({sessionRestoreChecks:count,entryCopiesIdentical:true,auth:'mocked',databaseWrites:0,liveRefreshVerified:false}));
})().catch(error=>{console.error(error);process.exitCode=1});

