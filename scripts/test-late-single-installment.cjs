const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'../app.html'),'utf8');
const s={num:x=>Number(x)||0,mfFlagTrue:Boolean};vm.createContext(s);
vm.runInContext(html.slice(html.indexOf('function mfLateDaysValue('),html.indexOf('function mfAllocationRows(')),s);
let checks=0;
for(const [amount,late,due] of [[200,true,true],[100,false,true],[0,false,false]]){
const c={arrears:amount,dueAmount:amount,netToPay:1000,installment:100,lateDays:40,paymentCount:0};
assert.equal(s.mfIsLate30to60(c),late);assert.equal(s.mfIsLate(c),late);assert.equal(s.mfIsDue(c),due);checks+=3;
}
assert.equal(s.mfIsLate30to60({arrears:200,installment:100,lateDays:40,paymentCount:9}),true);checks++;
assert.equal(s.mfIsLate30to60({arrears:150,installment:100,lateDays:40}),true);checks++;
assert.equal(s.mfIsLate30to60({arrears:200,installments_due_count:1,lateDays:40}),false);checks++;
for(const [baseline,amount,inst,want] of [[60,60,60,true],[60,59.26,60,true],[44.64,44.64,51,true],[200,100,100,false],[200,200,100,true],[200,150,100,true],[200,0,100,false]]){assert.equal(s.mfIsLate30to60({lateSourceOverdueAmount:baseline,arrears:amount,installment:inst,lateDays:40}),want);checks++;}
console.log(JSON.stringify({checks,passed:true}));
