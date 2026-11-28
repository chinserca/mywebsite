const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const esbuild=require('esbuild');
const {zipSync}=require('fflate');
const root=path.resolve(__dirname,'..');
const site='https://mywebsite-one-beta-41.vercel.app';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ac-offline-'));
const source=path.join(temp,'source');
const output=path.join(__dirname,'app');
const allowed=/^(index\.html|styles\.css|credits\.html|assets\/|game [1-4]\/|website [12]\/|simulater\/|roblox game test\/)/;
const webFile=/\.(html|js|css|svg|png|jpe?g|webp|mp3|mp4|wav|glb|gif|ico|json)$/i;
const excluded=/(^|\/)(\.cursor|roblox-studio|node_modules)\//;
const tracked=execFileSync('git',['ls-tree','-r','--name-only','origin/main'],{cwd:root,encoding:'utf8'}).trim().split('\n');
const files=tracked.filter(file=>allowed.test(file)&&webFile.test(file)&&!excluded.test(file));
function write(file,data,base=source){
 const destination=path.join(base,file);
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,data);
}
for(const file of files){
 const data=execFileSync('git',['show','origin/main:'+file],{cwd:root,maxBuffer:50*1024*1024});
 write(file,data);
}
// Include current work on the hub and the two actively maintained games.
for(const folder of ['simulater','roblox game test','website 2']){
 for(const item of fs.readdirSync(path.join(root,folder),{recursive:true})){
  const file=folder+'/'+item;
  const full=path.join(root,file);
  if(fs.statSync(full).isFile()&&webFile.test(file)&&!excluded.test(file))write(file,fs.readFileSync(full));
 }
}
for(const file of ['index.html','styles.css','credits.html'])write(file,fs.readFileSync(path.join(root,file)));
const offlineNetwork=`<script>
if(location.protocol==='file:'){
 const originalFetch=window.fetch.bind(window);
 window.fetch=(input,options)=>{
  if(typeof input==='string'&&input.startsWith('/api/'))input='${site}'+input;
  return originalFetch(input,options);
 };
}
</script>`;
const modulePlugin={
 name:'offline-dependencies',
 setup(build){
  build.onResolve({filter:/^https:\/\/cdn\.jsdelivr\.net\/npm\/fflate@/},()=>({path:require.resolve('fflate')}));
  build.onResolve({filter:/^https:\/\/cdn\.jsdelivr\.net\/npm\/@gradio\//},args=>({path:args.path,external:true}));
  build.onResolve({filter:/^\..*\?v=/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));
  build.onLoad({filter:/roblox game test\/game\.js$/},args=>{
   let contents=fs.readFileSync(args.path,'utf8');
   const data=fs.readFileSync(path.join(source,'roblox game test/3d files/spaistaison.glb')).toString('base64');
   contents=contents.replace('./3d%20files/spaistaison.glb','data:model/gltf-binary;base64,'+data);
   return {contents,loader:'js',resolveDir:path.dirname(args.path)};
  });
 }
};
async function bundle(entry){
 const result=await esbuild.build({
  entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'es2020',
  minify:true,legalComments:'eof',nodePaths:[path.join(root,'node_modules')],plugins:[modulePlugin]
 });
 return result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
}
async function main(){
 fs.mkdirSync(output,{recursive:true});
 for(const file of fs.readdirSync(source,{recursive:true})){
  const full=path.join(source,file);
  if(fs.statSync(full).isFile())write(file,fs.readFileSync(full),output);
 }
 for(const folder of ['simulater','roblox game test','website 2']){
  const htmlFile=path.join(output,folder,'index.html');
  let html=fs.readFileSync(htmlFile,'utf8');
  const entry=html.match(/<script type="module" src="([^"]+)"[^>]*><\/script>/);
  if(!entry)throw new Error('Missing module entry in '+folder);
  const code=await bundle(path.join(source,folder,entry[1].split('?')[0]));
  html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/g,'');
  html=html.replace(entry[0],()=>'<script>'+code+'</script>');
  html=html.replace('</head>',offlineNetwork+'</head>');
  write(folder+'/index.html',html,output);
 }
 // Supabase is bundled locally so catalog pages can open without fetching a CDN.
 const supabase=await bundle(path.join(root,'doload/supabase-entry.js'));
 write('website 1/supabase.js',supabase,output);
 for(const file of fs.readdirSync(path.join(output,'website 1'))){
  if(!file.endsWith('.html'))continue;
  const target=path.join(output,'website 1',file);
  let html=fs.readFileSync(target,'utf8').replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase.js/g,'supabase.js');
  html=html.replace('</head>',offlineNetwork+'</head>');
  const notice=`<aside style="padding:12px;background:#edf2ed;color:#18382c;font:14px system-ui">Accounts, orders and community updates need internet. <a href="${site}/website%201/${file}" target="_blank" rel="noopener">Open the live page</a></aside>`;
  html=html.replace(/<body[^>]*>/,match=>match+notice);
  fs.writeFileSync(target,html);
 }
 let hub=fs.readFileSync(path.join(output,'index.html'),'utf8');
 hub=hub.replaceAll('href="doload/index.html"','href="'+site+'/doload/index.html"');
 hub=hub.replace(/\s+target="_blank"/g,'');
 hub=hub.replace('<img src="assets/the-invasion.png" alt="The Invasion" />','<span style="font:700 26px system-ui;text-align:center;padding:28px">The Invasion<br><small style="font-size:14px">Online · Scratch</small></span>');

 write('index.html',hub,output);
 write('THREE-LICENSE.txt',fs.readFileSync(path.join(root,'node_modules/three/LICENSE')),output);
 // Bootstrap update checks on every installed app entry, including saved subpages.
 write('update.js',fs.readFileSync(path.join(__dirname,'update.js')),output);
 for(const file of fs.readdirSync(output,{recursive:true})){
  if(!file.endsWith('.html'))continue;
  const target=path.join(output,file);
  const relative=path.relative(path.dirname(target),path.join(output,'update.js')).split(path.sep).join('/');
  const html=fs.readFileSync(target,'utf8').replace('</head>','<script defer src="'+relative+'"></script></head>');
  fs.writeFileSync(target,html);
 }

 const appFiles=fs.readdirSync(output,{recursive:true}).filter(file=>fs.statSync(path.join(output,file)).isFile()).sort();
 const archive={};
 for(const file of appFiles)archive['AC Website/'+file]=new Uint8Array(fs.readFileSync(path.join(output,file)));
 write('ac-website-offline.zip',zipSync(archive,{level:6}),__dirname);
 const paths=appFiles.map(file=>'/doload/app/'+file.split('/').map(encodeURIComponent).join('/'));
 write('offline-files.json',JSON.stringify(paths),__dirname);
 const digest=crypto.createHash('sha256');
 for(const file of appFiles)digest.update(fs.readFileSync(path.join(output,file)));
 const revision=digest.digest('hex').slice(0,12);
 const workerFile=path.join(__dirname,'sw.js');
 const worker=fs.readFileSync(workerFile,'utf8').replace(/const CACHE='ac-website-offline-[^']+'/,"const CACHE='ac-website-offline-"+revision+"'");
 fs.writeFileSync(workerFile,worker);

 console.log('Built complete website app: '+appFiles.length+' files.');
 console.log('Download size: '+(fs.statSync(path.join(__dirname,'ac-website-offline.zip')).size/1024/1024).toFixed(1)+' MB');
}
main().catch(error=>{console.error(error);process.exitCode=1});
