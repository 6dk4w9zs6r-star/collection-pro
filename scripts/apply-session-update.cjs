const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function replace(a,b){if(html.includes(a))html=html.replace(a,b);else if(!html.includes(b))throw Error('Missing patch target '+a.slice(0,80));}
// Leave pre-existing browser records intact, but never load an unowned cache.
replace('  getItem(k){\n    try{return window.localStorage.getItem(k)}','  getItem(k){\n    if([CLIENTS_KEY,LATE_KEY,DUE_KEY,EMP_KEY,META_KEY].includes(k))return null;\n    try{return window.localStorage.getItem(k)}');
replace('  setItem(k,v){\n    let sv=String(v);','  setItem(k,v){\n    if([CLIENTS_KEY,LATE_KEY,DUE_KEY,EMP_KEY,META_KEY].includes(k)){let actor;try{actor=CURRENT_PROFILE?.id}catch(_){}if(!actor)return;k="mf-nexa-account:"+actor+":"+k;}\n    let sv=String(v);');
replace('  removeItem(k){\n    try{window.localStorage.removeItem(k)}','  removeItem(k){\n    if([CLIENTS_KEY,LATE_KEY,DUE_KEY,EMP_KEY,META_KEY].includes(k)){let actor;try{actor=CURRENT_PROFILE?.id}catch(_){}if(!actor)return;k="mf-nexa-account:"+actor+":"+k;}\n    try{window.localStorage.removeItem(k)}');
const unlock='document.body.classList.remove("secureLocked");if($("authGate"))$("authGate").style.display="none";';
replace(unlock+'await roleAwareBootstrap();','await roleAwareBootstrap();'+unlock);
// No inferred supervisor/employee record before authenticated loading.
html=html.replace(/^if\(!employees.length\)employees=\[.*\];\r?$/m,'');
const tag='<script src="./mf-session-20260916.js"></script>';if(!html.includes(tag))html=html.replace('</body>',tag+'\n</body>');
for(const name of ['index.html','app.html'])fs.writeFileSync(path.join(root,name),html);
let sw=fs.readFileSync(path.join(root,'sw.js'),'utf8').replaceAll('20260916-r7','20260916-r8');if(!sw.includes("'./mf-session-20260916.js'"))sw=sw.replace("'./mf-loading-20260916.js'","'./mf-loading-20260916.js','./mf-session-20260916.js'");fs.writeFileSync(path.join(root,'sw.js'),sw);
const test=path.join(root,'scripts/test-browser-update.cjs');fs.writeFileSync(test,fs.readFileSync(test,'utf8').replaceAll('2026-09-16-r7','2026-09-16-r8'));console.log('Session isolation installed');
