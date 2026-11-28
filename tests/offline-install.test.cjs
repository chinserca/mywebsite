const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../doload/install.js'),'utf8');
function page({ready=Promise.resolve({}),register=()=>Promise.resolve({})}={}){
 const status={textContent:'Install instructions'},button={hidden:true},events={};
 vm.runInNewContext(source,{
  document:{getElementById:id=>id==='installStatus'?status:button},
  location:{protocol:'http:'},
  navigator:{serviceWorker:{register,ready,addEventListener:(name,callback)=>{events[name]=callback}}},
  window:{addEventListener:()=>{}}
 });
 return {status,events};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('revisiting an already cached app reports offline readiness without a new worker message',async()=>{
 const {status}=page();await settle();
 assert.match(status.textContent,/whole app is saved for offline use/);
});
test('the page does not claim offline readiness before files finish installing',async()=>{
 let finish;const ready=new Promise(resolve=>{finish=resolve});
 const {status}=page({ready});await settle();
 assert.equal(status.textContent,'Install instructions');
 finish({});await settle();assert.match(status.textContent,/saved for offline use/);
});
test('an unavailable service worker leaves usable ZIP download guidance',async()=>{
 const {status}=page({register:()=>Promise.reject(new Error('Unavailable'))});
 await settle();assert.match(status.textContent,/download the ZIP/);
});
