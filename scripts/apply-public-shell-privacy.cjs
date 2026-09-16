const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),backup=path.resolve(root,'../output/pre-r7-static-files');
fs.mkdirSync(backup,{recursive:true});
const files=fs.readdirSync(root).filter(n=>n.endsWith('.html')),manifest=[];
for(const name of files){const data=fs.readFileSync(path.join(root,name));const target=path.join(backup,name);if(!fs.existsSync(target))fs.writeFileSync(target,data);const saved=fs.readFileSync(target);manifest.push({name,bytes:saved.length,sha256:crypto.createHash('sha256').update(saved).digest('hex')});}
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const name of ['EMBEDDED_LATE_RECORDS','EMBEDDED_DUE_RECORDS']){const re=new RegExp('const '+name+'=\\[[^\\r\\n]*\\];');if(!re.test(html))throw Error('Missing embedded data boundary: '+name);html=html.replace(re,'const '+name+'=[];');}
html=html.replace("window.MF_NEXA_RELEASE='2026-09-16-r6'","window.MF_NEXA_RELEASE='2026-09-16-r7'");
for(const name of ['index.html','app.html'])fs.writeFileSync(path.join(root,name),html);
const redirect='<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=./index.html"><meta name="robots" content="noindex"><title>NEXA-MF</title></head><body><a href="./index.html">فتح NEXA-MF</a></body></html>\n';
for(const name of files.filter(n=>!['index.html','app.html'].includes(n)))fs.writeFileSync(path.join(root,name),redirect);
for(const name of ['sw.js','mf-loading-20260916.js','scripts/test-browser-update.cjs']){const file=path.join(root,name);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('20260916-r6','20260916-r7').replaceAll('2026-09-16-r6','2026-09-16-r7'));}
console.log(JSON.stringify({backedUpHtmlFiles:manifest.length,legacyRedirects:files.length-2,embeddedDatasetsRemoved:2}));
