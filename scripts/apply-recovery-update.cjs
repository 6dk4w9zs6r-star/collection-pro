const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');const tag='<script src="./mf-recovery-20260916.js"></script>';
if(!html.includes(tag))html=html.replace('</body>',tag+'\n</body>');
for(const file of ['index.html','app.html'])fs.writeFileSync(path.join(root,file),html);
let sw=fs.readFileSync(path.join(root,'sw.js'),'utf8').replace('mf-nexa-shell-20260916-r3','mf-nexa-shell-20260916-r4');
if(!sw.includes("'./mf-recovery-20260916.js'"))sw=sw.replace("'./mf-collaboration-20260916.js'","'./mf-collaboration-20260916.js','./mf-recovery-20260916.js'");fs.writeFileSync(path.join(root,'sw.js'),sw);
const test=path.join(root,'scripts/test-browser-update.cjs');fs.writeFileSync(test,fs.readFileSync(test,'utf8').replace('2026-09-16-r3','2026-09-16-r4'));
console.log('Recovery and consent runtime installed in both entry points.');
