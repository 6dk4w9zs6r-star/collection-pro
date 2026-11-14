const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','app.html'),'utf8');
const start=source.indexOf('const reportRowsBeforeDailyFilters=window.mfReportRows;');
const end=source.indexOf('const renderReportsBeforeDailyFilters=window.mfRenderReports;',start);
assert(start>=0&&end>start,'daily payment filtering wrapper exists');
const rows=[
  {Date:'2026-11-13T09:15:00',Branch:'B1',Employee:'A',Amount:50},
  {Date:'2026-11-13',Branch:'B1',Employee:'B',Amount:20},
  {Date:'2026-11-13',Branch:'B2',Employee:'A',Amount:30},
  {Date:'2026-11-12',Branch:'B1',Employee:'A',Amount:10}
];
const nodes={mfPaymentsReportDate:{value:'2026-11-13'},mfPaymentsReportBranch:{value:'B1'},mfPaymentsReportEmployee:{value:'A'}};
const context={window:null,$f:id=>nodes[id],mfReportRows:type=>type==='payments'?rows:[{untouched:true}]};
context.window=context;vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
let filtered=context.mfReportRows('payments');
assert.deepEqual(JSON.parse(JSON.stringify(filtered)),[rows[0]],'date, branch and employee filters apply together');
nodes.mfPaymentsReportBranch.value='';
filtered=context.mfReportRows('payments');
assert.equal(filtered.length,2,'all branches keeps selected date and employee');
nodes.mfPaymentsReportDate.value='';nodes.mfPaymentsReportEmployee.value='';
filtered=context.mfReportRows('payments');
assert.equal(filtered.length,4,'blank filters show all permission-scoped report rows');
assert.deepEqual(JSON.parse(JSON.stringify(context.mfReportRows('due'))),[{untouched:true}],'other reports remain unaffected');
for(const label of ['تاريخ الدفعات','الفرع','الموظف','كل الفروع ضمن صلاحيتك','كل الموظفين ضمن صلاحيتك'])assert(source.includes(label),`UI includes ${label}`);
assert(source.includes('type="date"'),'UI includes date selector');
console.log(JSON.stringify({dailyPaymentFilterChecks:9,permissionScopedInput:true}));
