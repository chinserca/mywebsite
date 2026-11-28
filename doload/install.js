let installPrompt;
const installButton=document.getElementById('installApp');
const status=document.getElementById('installStatus');
const offlineReady=()=>{
 if(status)status.textContent='The whole app is saved for offline use. You can also download a ZIP copy.';
};
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register('/doload/sw.js').then(()=>navigator.serviceWorker.ready).then(offlineReady).catch(()=>{
  if(status)status.textContent='You can still download the ZIP and open index.html to play offline.';
 });
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 installPrompt=event;
 if(installButton)installButton.hidden=false;
});
if(installButton)installButton.onclick=async()=>{
 if(!installPrompt)return;
 await installPrompt.prompt();
 const choice=await installPrompt.userChoice;
 if(choice.outcome==='accepted'&&status)status.textContent='AC is installed. Keep this page open while the offline files finish downloading.';
 installPrompt=null;
 installButton.hidden=true;
};
window.addEventListener('appinstalled',()=>{
 if(status)status.textContent='AC is installed on your computer.';
});
navigator.serviceWorker?.addEventListener('message',event=>{
 if(event.data==='offline-ready')offlineReady();
});
