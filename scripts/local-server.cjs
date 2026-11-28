// Local-only playtesting: game presence stays in memory; no Vercel services are called.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const stores=new Map(),handlers=new Map();
function getCache({namespace}){
 if(!stores.has(namespace))stores.set(namespace,new Map());
 const rows=stores.get(namespace);
 return {
  async get(key){const row=rows.get(key);if(!row||row.expires<=Date.now()){rows.delete(key);return null;}return structuredClone(row.value);},
  async set(key,value,{ttl=60}={}){rows.set(key,{value:structuredClone(value),expires:Date.now()+ttl*1000});}
 };
}
function handler(name){
 const file=path.join(root,'api',name+'.js'),mtime=fs.statSync(file).mtimeMs;
 if(handlers.get(name)?.mtime!==mtime){
  const mod={exports:{}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:mod,require(id){if(id==='@vercel/functions')return {getCache};throw new Error('Unsupported local service');},Date,Number,JSON,Math,Set,Array,Promise},{filename:file});
  handlers.set(name,{mtime,run:mod.exports});
 }
 return handlers.get(name).run;
}
const types={'.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.mp4':'video/mp4','.glb':'model/gltf-binary','.zip':'application/zip'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname.startsWith('/api/')){
   const name=url.pathname.slice(5);
   if(!['simulator-presence','factory-presence'].includes(name)){res.writeHead(503);res.end('This service is disabled in local playtesting.');return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413);res.end();return;}}
   req.body=body;
   res.status=code=>{res.statusCode=code;return res};
   res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res};
   await handler(name)(req,res);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const name=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  const rel=path.relative(root,file);
  if(rel.startsWith('..')||path.isAbsolute(rel)||rel.split(path.sep).some(part=>part.startsWith('.'))||!types[path.extname(file)]){res.writeHead(403);res.end();return;}
  const stat=await fs.promises.stat(file);
  if(!stat.isFile())throw new Error('Not a file');
  let start=0,end=stat.size-1,code=200;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!match||(!match[1]&&!match[2])){res.writeHead(416);res.end();return;}
   start=match[1]?Number(match[1]):Math.max(0,stat.size-Number(match[2]));
   end=match[1]&&match[2]?Math.min(Number(match[2]),end):end;
   if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}
   code=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
  }
  res.writeHead(code,{'Content-Type':types[path.extname(file)],'Content-Length':end-start+1,'Accept-Ranges':'bytes'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
 }catch(error){if(!res.headersSent)res.writeHead(404);res.end('Local file unavailable');console.error(req.url,error.message);}
});
server.listen(Number(process.env.LOCAL_GAME_PORT||8777),'127.0.0.1',()=>console.log('Local AC playtest: http://127.0.0.1:'+server.address().port+' — multiplayer uses local memory only'));
