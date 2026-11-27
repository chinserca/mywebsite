const key = 'factory-roblox-avatar';
const isImage = value => typeof value === 'string' && value.length < 300
 && /^https:\/\/[a-z0-9-]+\.rbxcdn\.com\//i.test(value);

export function attachAvatar(THREE, group, fallback) {
 const material = new THREE.SpriteMaterial({alphaTest:.25});
 const sprite = new THREE.Sprite(material);
 sprite.position.y = 1.35;
 sprite.scale.set(3.3,3.3,1);
 sprite.visible = false;
 group.add(sprite);
 let current = '';
 return {
  set(image) {
   image = isImage(image) ? image : '';
   if (image === current) return;
   current = image;
   sprite.visible = false;
   fallback.forEach(mesh => mesh.visible = true);
   material.map?.dispose();
   material.map = null;
   if (!image) return;
   new THREE.TextureLoader().load(image, texture => {
    if (current !== image) {
     texture.dispose();
     return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
    sprite.visible = true;
    fallback.forEach(mesh => mesh.visible = false);
   });
  },
  walk(stride) { sprite.position.y = 1.35 + Math.abs(stride)*.12; },
  dispose() {
   this.set('');
   material.dispose();
  }
 };
}

export function setupAvatar(appearance, dialog) {
 const form = dialog.querySelector('form');
 const input = form.elements.username;
 const status = dialog.querySelector('[role=status]');
 const submit = form.querySelector('[type=submit]');
 let selected;
 let lookup;
 try { selected = JSON.parse(localStorage.getItem(key)); } catch {}
 appearance.set(selected?.image);
 input.value = selected?.username ?? '';
 function save(avatar) {
  selected = avatar;
  appearance.set(avatar?.image);
  try {
   if (avatar) localStorage.setItem(key,JSON.stringify(avatar));
   else localStorage.removeItem(key);
  } catch {}
 }
 form.onsubmit = async event => {
  event.preventDefault();
  const request = new AbortController();
  lookup = request;
  submit.disabled = true;
  status.textContent = 'Looking up your Roblox avatar…';
  try {
   const response = await fetch('/api/factory-avatar?'+new URLSearchParams({username:input.value.trim()}),
    {signal:AbortSignal.any([request.signal,AbortSignal.timeout(6500)])});
   const result = await response.json();
   if (!response.ok || !isImage(result.image)) throw new Error(result.error || 'Avatar unavailable.');
   if (request.signal.aborted) return;
   save(result);
   input.value = result.username;
   status.textContent = 'Using the public Roblox avatar for '+result.username+'.';
  } catch (error) {
   if (request.signal.aborted) return;
   status.textContent = error.name === 'TimeoutError' ? 'Roblox took too long to respond. Try again.' : error.message;
  } finally {
   submit.disabled = false;
  }
 };
 dialog.querySelector('#defaultAvatar').onclick = () => {
  lookup?.abort();
  save(null);
  input.value = '';
  status.textContent = 'Using the Factory character.';
 };
 dialog.querySelector('#closeAvatar').onclick = () => dialog.close();
 return () => isImage(selected?.image) ? {skin:selected.image,username:selected.username} : {};
}
