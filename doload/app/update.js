// Installed app updates stay on its own host; loose ZIP files remain offline files.
(()=>{
 if(location.protocol==='file:'||!('serviceWorker' in navigator))return;
 let registration,checking=false,reloading=false;
 const wasControlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(wasControlled&&!reloading){reloading=true;location.reload();}
 });
 async function check(){
  if(!navigator.onLine||checking)return;
  checking=true;
  try{
   registration??=await navigator.serviceWorker.register('/doload/sw.js',{updateViaCache:'none'});
   await registration.update();
  }catch{
   // Keep playing the complete cached version if Wi-Fi cannot reach the server.
  }finally{checking=false;}
 }
 addEventListener('online',check);
 addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
 void check();
})();
