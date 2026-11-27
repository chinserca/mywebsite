const CACHE='ac-website-offline-b794a312f5db';
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const response=await fetch('/doload/offline-files.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Offline file list unavailable');
  const files=await response.json();
  const cache=await caches.open(CACHE);
  // Sequential groups keep the offline download from flooding the connection.
  for(let i=0;i<files.length;i+=8)await cache.addAll(files.slice(i,i+8));
  await cache.addAll(['/doload/manifest.webmanifest','/doload/icon-192.png','/doload/icon-512.png','/doload/install.js']);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('ac-website-offline-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
  for(const client of await self.clients.matchAll())client.postMessage('offline-ready');
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith('/doload/app/'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const response=await cache.match(event.request,{ignoreSearch:true});
  if(!response)return fetch(event.request);
  const range=event.request.headers.get('range');
  if(!range)return response;
  const bytes=await response.arrayBuffer();
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match)return new Response(null,{status:416});
  const start=match[1]?Number(match[1]):Math.max(0,bytes.byteLength-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(Number(match[2]),bytes.byteLength-1):bytes.byteLength-1;
  if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.byteLength}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{
   'Content-Type':response.headers.get('Content-Type')||'application/octet-stream',
   'Content-Range':'bytes '+start+'-'+end+'/'+bytes.byteLength,
   'Accept-Ranges':'bytes','Content-Length':String(end-start+1)
  }});
 })());
});
