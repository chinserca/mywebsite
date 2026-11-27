// Faceted mesh exports; no paid conversion service is used.
export function trianglesFrom(scene, THREE, width) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3());
  const factor = width / Math.max(size.x, 1e-8), center = box.getCenter(new THREE.Vector3());
  const triangles = [];
  scene.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry, positions = geometry.attributes.position, indices = geometry.index;
    const count = indices ? indices.count : positions.count;
    for (let i = 0; i < count; i += 3) {
      const tri = [0, 1, 2].map(k => {
        const v = new THREE.Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + k) : i + k).applyMatrix4(object.matrixWorld);
        // Rotate Y-up to Z-up and place the bottom on the print bed, in millimeters.
        return [(v.x - center.x) * factor, -(v.z - center.z) * factor, (v.y - box.min.y) * factor];
      });
      if (object.matrixWorld.determinant() < 0) [tri[1], tri[2]] = [tri[2], tri[1]];
      triangles.push(tri);
    }
  });
  return triangles;
}
export function stl(triangles) {
  const bytes = new ArrayBuffer(84 + triangles.length * 50), view = new DataView(bytes);
  view.setUint32(80, triangles.length, true);
  let offset = 84;
  for (const [a,b,c] of triangles) {
    const u = b.map((v,i) => v-a[i]), v = c.map((x,i) => x-a[i]);
    let n = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...n) || 1; n = n.map(x => x/length);
    for (const x of [...n,...a,...b,...c]) { view.setFloat32(offset,x,true); offset+=4; }
    view.setUint16(offset,0,true); offset+=2;
  }
  return new Blob([bytes],{type:'model/stl'});
}
export async function threeMF(triangles) {
  const {zipSync,strToU8} = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
  const vertices=[],faces=[],lookup=new Map();
  const index=p=>{const key=p.map(v=>v.toFixed(7)).join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(`<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`);}return lookup.get(key);};
  triangles.forEach(tri => { const ids=tri.map(index);faces.push(`<triangle v1="${ids[0]}" v2="${ids[1]}" v3="${ids[2]}"/>`); });
  const model=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${vertices.join('')}</vertices><triangles>${faces.join('')}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
  return new Blob([zipSync({
    '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model':strToU8(model)
  })],{type:'model/3mf'});
}
export function step(triangles) {
  const lines=[]; let id=0; const add=text=>{lines.push(`#${++id}=${text};`);return '#'+id;};
  const app=add("APPLICATION_CONTEXT('automotive_design')");
  add(`APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,${app})`);
  const pc=add(`PRODUCT_CONTEXT('',${app},'mechanical')`);
  const product=add(`PRODUCT('ShapeLab','ShapeLab','AI generated faceted surface',(${pc}))`);
  const formation=add(`PRODUCT_DEFINITION_FORMATION('','',${product})`);
  const dc=add(`PRODUCT_DEFINITION_CONTEXT('part definition',${app},'design')`);
  const definition=add(`PRODUCT_DEFINITION('design','',${formation},${dc})`);
  const shape=add(`PRODUCT_DEFINITION_SHAPE('','',${definition})`);
  const mm=add('(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.))');
  const rad=add('(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.))');
  const sr=add('(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT())');
  const uncertainty=add(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.000001),${mm},'distance_accuracy_value','')`);
  const context=add(`(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${uncertainty})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${mm},${rad},${sr})) REPRESENTATION_CONTEXT('',''))`);
  const points=new Map(), point=p=>{const key=p.map(x=>x.toFixed(7)).join(',');if(!points.has(key)){const nums=p.map(x=>{const s=x.toFixed(7);return s;});points.set(key,add(`CARTESIAN_POINT('',(${nums.join(',')}))`));}return points.get(key);};
  const faces=triangles.map(tri=>{const loop=add(`POLY_LOOP('',(${tri.map(point).join(',')}))`);const bound=add(`FACE_OUTER_BOUND('',${loop},.T.)`);return add(`FACE('',(${bound}))`);});
  const shell=add(`OPEN_SHELL('',(${faces.join(',')}))`);
  const surface=add(`SHELL_BASED_SURFACE_MODEL('Faceted AI mesh',(${shell}))`);
  const rep=add(`MANIFOLD_SURFACE_SHAPE_REPRESENTATION('',(${surface}),${context})`);
  add(`SHAPE_DEFINITION_REPRESENTATION(${shape},${rep})`);
  return new Blob([`ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Faceted triangle surface; millimeters'),'2;1');\nFILE_NAME('ShapeLab.step','${new Date().toISOString()}',('Alex'),('ShapeLab'),'ShapeLab','ShapeLab','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN'));\nENDSEC;\nDATA;\n${lines.join('\n')}\nENDSEC;\nEND-ISO-10303-21;\n`],{type:'application/step'});
}
