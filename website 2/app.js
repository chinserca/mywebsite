import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {trianglesFrom,stl,threeMF,step} from './exporters.js';
const $=id=>document.getElementById(id);
let file, client, currentScene, originalGLB, waiting=false, job, canceled=false, imageURL;
const stage=$('preview'), scene=new THREE.Scene();scene.background=new THREE.Color('#e9edf4');
const camera=new THREE.PerspectiveCamera(40,1,.01,1000);camera.position.set(2,1.6,2.6);
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true});}catch{ $('status').textContent='Your browser needs WebGL for the 3D preview. Try a newer browser.';throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;stage.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x788399,3));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,4);scene.add(key);
const grid=new THREE.GridHelper(4,20,0xc6cfdf,0xdce2ec);grid.position.y=-.02;scene.add(grid);
new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(stage);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
$('resetView').onclick=()=>{camera.position.set(2,1.6,2.6);controls.target.set(0,.6,0);controls.update();};
function status(text){$('status').textContent=text;}
function ready(){ $('generate').disabled=waiting||!file||!$('consent').checked; }
function busy(value){waiting=value;ready();$('imageFile').disabled=value;$('consent').disabled=value;$('cancel').hidden=!value;}
function select(candidate){
 if(waiting)return;
 if(!candidate||!['image/png','image/jpeg','image/webp'].includes(candidate.type)){status('Choose a PNG, JPG, or WebP picture.');return;}
 if(candidate.size>10*1024*1024){status('Please choose a picture smaller than 10 MB.');return;}
 file=candidate; if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);
 $('sourceImage').src=imageURL;$('fileName').textContent=file.name;$('source').hidden=false;
 $('consent').checked=false;ready();status('Picture selected. Check the sharing box, then choose Generate.');
}
$('imageFile').onchange=e=>select(e.target.files[0]);$('consent').onchange=ready;
for(const type of ['dragover','dragleave','drop'])$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.toggle('dragging',type==='dragover');if(type==='drop')select(e.dataTransfer.files[0]);});
// Prepare a transparent PNG for the demo's image-state preprocessing.
async function prepareImage(input){
 const bitmap=await createImageBitmap(input), scale=Math.min(1,1022/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale)+2;canvas.height=Math.round(bitmap.height*scale)+2;
 const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,1,1,canvas.width-2,canvas.height-2);bitmap.close();
 // Transparent border is intentional: it also handles already-transparent source pictures.
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not read the image.')),'image/png'));
}
$('cancel').onclick=()=>{canceled=true;job?.cancel();status('Stopped waiting. A running remote job may still finish.');};
$('generate').onclick=async()=>{
 if(waiting||!file||!$('consent').checked)return;
 busy(true);canceled=false;job=null;
 try{
  status('Connecting to free AI compute…');
  const {Client,handle_file}=await import('https://cdn.jsdelivr.net/npm/@gradio/client@2.7.2/dist/index.min.js');
  client=await Client.connect('https://microsoft-trellis-2.hf.space',{events:['data','status']});
  if(canceled)throw new Error('Canceled.');
  const image=handle_file(await prepareImage(file));
  status('Preparing your picture on the AI service…');
  // State is kept within the same Gradio session for preprocessing and generation.
  await client.predict('/start_session',{});
  const prepared=await client.predict('/preprocess_image',{input:image});
  if(canceled)throw new Error('Canceled.');
  job=client.submit('/image_to_3d',{image:prepared.data[0],seed:Math.floor(Math.random()*1000000),resolution:'512',ss_sampling_steps:8,shape_slat_sampling_steps:8,tex_slat_sampling_steps:8});
  let output;
  for await(const event of job){
   if(canceled)break;
   if(event.type==='status'){
    if(event.stage==='error')throw new Error(event.message||'The AI service could not generate the model.');
    const progress=event.progress_data?.[0];
    status(progress?.desc?progress.desc+(progress.length?' · '+Math.round(progress.index/progress.length*100)+'%':''):event.stage==='generating'?'AI is building your 3D object…':`Waiting for free compute${Number.isFinite(event.position)?' · Queue position '+(event.position+1):''}…`);
   }
   if(event.type==='data')output=event.data;
  }
  if(canceled)throw new Error('Canceled.');
  status('Converting the generated object to a downloadable model…');
  const extracted=await client.predict('/extract_glb',{decimation_target:100000,texture_size:1024});
  if(canceled)throw new Error('Canceled.');
  const result=extracted.data?.[0]?.value??extracted.data?.[0];
  const url=typeof result==='string'?result:result?.url;
  if(!url)throw new Error('The free demo did not return a model. Please try again later.');
  const modelURL=new URL(url,'https://microsoft-trellis-2.hf.space');
  if(modelURL.protocol!=='https:'||!modelURL.hostname.endsWith('.hf.space'))throw new Error('Unexpected model download address.');
  status('Downloading your AI model for preview and export…');
  const response=await fetch(modelURL);if(!response.ok)throw new Error('Could not download the generated model.');
  const buffer=await response.arrayBuffer();
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'https://microsoft-trellis-2.hf.space/');
  if(currentScene){scene.remove(currentScene);currentScene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material)){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}});}
  originalGLB=buffer;currentScene=gltf.scene;
  const box=new THREE.Box3().setFromObject(currentScene), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const scale=1.8/Math.max(size.x,size.y,size.z);currentScene.scale.multiplyScalar(scale);currentScene.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
  scene.add(currentScene);controls.target.set(0,size.y*scale/2,0);$('empty').hidden=true;$('download').disabled=false;dimensions();status('Your AI model is ready. Check the shape before printing, then choose a format to download.');
 }catch(error){
  const text=String(error?.message||error);
  status(/quota|exceed|rate|429|GPU|limit/i.test(text)?'The free GPU allowance is unavailable or used up. Try again later. No paid fallback was used.':text.startsWith('Canceled')?'Stopped waiting.':`Generation failed: ${text.slice(0,350)} No charges were made. Try again later.`);
 }finally{busy(false);job=null;}
};
function dimensions(){if(!currentScene)return;const width=Number($('width').value);if(!Number.isFinite(width)||width<10||width>300)return;const size=new THREE.Box3().setFromObject(currentScene).getSize(new THREE.Vector3());const factor=width/size.x;$('dimensions').textContent=`${width} × ${(size.z*factor).toFixed(1)} × ${(size.y*factor).toFixed(1)} mm`;}
$('width').oninput=dimensions;
$('format').onchange=()=>{$('formatNote').textContent={stl:'STL stores geometry. Set your slicer’s units to millimeters.','3mf':'3MF stores mesh geometry in millimeters, without textures.',step:'STEP exports triangle faces as a CAD surface model; not a smooth solid.',stp:'STP is the same faceted STEP surface with a different extension.',glb:'Original AI model with textures. Size is unchanged by the width setting.'}[$('format').value];};
$('download').onclick=async()=>{
 if(!currentScene)return;const width=Number($('width').value);if(!Number.isFinite(width)||width<10||width>300){status('Choose a width between 10 and 300 mm.');return;}
 $('download').disabled=true;
 try{
  const format=$('format').value;status('Preparing your download…');await new Promise(r=>setTimeout(r,20));
  let blob;
  if(format==='glb')blob=new Blob([originalGLB],{type:'model/gltf-binary'});
  else{const triangles=trianglesFrom(currentScene,THREE,width);if(triangles.length>250000)throw new Error('This model is too large for browser conversion. Download GLB instead.');blob=format==='stl'?stl(triangles):format==='3mf'?await threeMF(triangles):step(triangles);}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_')||'ShapeLab')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Download prepared. Inspect the model in your slicer or CAD application.');
 }catch(error){status(error.message);}finally{$('download').disabled=false;}
};
