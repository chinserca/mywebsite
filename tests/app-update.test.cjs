const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../doload/update.js'),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page({online=true,controlled=true,fail=false,protocol='http:'}={}){
 const events={},workerEvents={},docEvents={};let checks=0,reloads=0,registrations=0;
 const navigator={onLine:online,serviceWorker:{controller:controlled?{}:null,addEventListener:(name,fn)=>workerEvents[name]=fn,register:async()=>{registrations++;return {update:async()=>{checks++;if(fail)throw Error('Offline')}}}}};
 vm.runInNewContext(source,{navigator,location:{protocol,reload:()=>reloads++},document:{hidden:false,addEventListener:(name,fn)=>docEvents[name]=fn},addEventListener:(name,fn)=>events[name]=fn});
 return {navigator,events,workerEvents,docEvents,get checks(){return checks},get reloads(){return reloads},get registrations(){return registrations}};
}
test('an online app checks on launch and on reconnection',async()=>{
 const app=page();await settle();assert.equal(app.checks,1);
 app.events.online();await settle();assert.equal(app.checks,2);assert.equal(app.registrations,1);
});
test('an offline launch keeps working and checks when internet returns',async()=>{
 const app=page({online:false});await settle();assert.equal(app.checks,0);
 app.navigator.onLine=true;app.events.online();await settle();assert.equal(app.checks,1);
});
test('a ready replacement reloads once while first installation does not loop',async()=>{
 const app=page();await settle();app.workerEvents.controllerchange();app.workerEvents.controllerchange();assert.equal(app.reloads,1);
 const first=page({controlled:false});await settle();first.workerEvents.controllerchange();assert.equal(first.reloads,0);
});
test('network errors preserve the current app and allow a later retry',async()=>{
 const app=page({fail:true});await settle();assert.equal(app.reloads,0);app.events.pageshow();await settle();assert.equal(app.checks,2);
});
test('loose ZIP files do not attempt unsupported service worker updates',async()=>{
 const app=page({protocol:'file:'});await settle();assert.equal(app.registrations,0);
});
