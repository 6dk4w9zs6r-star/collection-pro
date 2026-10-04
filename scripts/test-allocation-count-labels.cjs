const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const code=html.slice(html.indexOf('function mfIsDue(c)'),html.indexOf('function mfClientTabs()'));
function run(role,selected){
 const out={innerHTML:''},clients=Array.from({length:132},(_,i)=>({employee:i<34?'Wala':'Other',branchCode:'5120',team:'Team',inLate:true,name:'Client',clientNo:String(i),arrears:10}));
 const s={clients,mfAllocation:{mode:'late',branch:'5120',team:'Team',employee:selected},$:()=>out,mfRole:()=>role,mfVisibleEmployees:()=>[],mfInScope:c=>role==='founder'||c.employee==='Wala',mfIsLate30to60:c=>c.inLate,safe:String,mfAttr:String,mfPriority:()=>({score:0,cls:'',label:''}),mfClientIndex:c=>clients.indexOf(c),num:Number,money:String};
 vm.createContext(s);vm.runInContext(code,s);s.mfRenderAllocation();return out.innerHTML;
}
const founder=run('founder','Wala');assert(founder.includes('إجمالي Late ضمن صلاحياتك: 132'));assert(founder.includes('Wala — 34 عميل'));assert.equal((founder.match(/فتح ملف العميل/g)||[]).length,34);
const lo=run('lo','');assert(lo.includes('إجمالي Late ضمن صلاحياتك: 34'));assert(!lo.includes(': 132'));assert.equal((lo.match(/فتح ملف العميل/g)||[]).length,34);
assert.equal(fs.readFileSync('app.html','utf8'),html);
console.log(JSON.stringify({allocationScopeChecks:7,passed:true}));
