const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const root=path.resolve(__dirname,'..'),files=fs.readdirSync(root).filter(n=>n.endsWith('.html'));let scripts=0;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(html,fs.readFileSync(path.join(root,'app.html'),'utf8'));
for(const name of ['EMBEDDED_LATE_RECORDS','EMBEDDED_DUE_RECORDS'])assert(html.includes('const '+name+'=[];'));
for(const name of files){const text=fs.readFileSync(path.join(root,name),'utf8');assert(!/"clientNo"\s*:\s*"\d/.test(text),'Bundled client record in '+name);if(!['index.html','app.html'].includes(name)){assert(text.length<600);assert(text.includes('0;url=./index.html'));assert(!text.includes('<script'));}else for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1])&&m[2].trim()){new vm.Script(m[2]);scripts++;}}
console.log(JSON.stringify({htmlFilesChecked:files.length,emptyDatasets:2,legacyRedirects:files.length-2,inlineScriptsParsed:scripts}));
