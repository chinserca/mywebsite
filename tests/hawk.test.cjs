'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const core = require('../server/hawk-core.cjs');
const { createStore } = require('../server/hawk-store.cjs');
const { createHandler } = require('../server/hawk-handler.cjs');
function memoryBlob() {
  const rows = new Map(); let version=0;
  return {
    rows,
    async get(path) { const row=rows.get(path); return row ? { stream: new Response(JSON.stringify(row.value)).body,blob: { etag: row.etag } } : null; },
    async put(path,text,opts) {
      const old=rows.get(path);
      if ((old && !opts.allowOverwrite) || (opts.ifMatch && opts.ifMatch!==old?.etag)) { const e=new Error('conflict'); e.name='BlobPreconditionFailedError'; throw e; }
      const etag=String(++version); rows.set(path,{ value: JSON.parse(text),etag }); return { etag };
    }
  };
}
const user = { id: 'student-a',email: 'student@gmail.com',user_metadata: { name: 'Sam Student',grade: 8,class_name: '8A' } };
const order = () => ({ id: crypto.randomUUID(),items: [{ id: 'infinity-cube',quantity: 2 }],terms: '2026-11-01',accepted: true });
test('email uses verified account details, all quantities, authoritative catalog costs, and 50% rule', () => {
  const result=core.prepareEmail(user,order());
  assert.equal(result.to,'leocoobie@gmail.com');
  for (const text of ['Sam Student','student@gmail.com','Grade: 8','Class: 8A','2 × Infinity cube','$5.00','50%','will not receive the item']) assert.ok(result.body.includes(text),text);
  assert.throws(() => core.prepareEmail({ ...user,user_metadata: {} },order()),/name, grade, and class/);
});
test('invalid products, duplicate products, fractional/oversized quantities and missing terms are rejected', () => {
  for (const change of [{accepted:false},{terms:'old'},{items:[{id:'fake',quantity:1}]},{items:[{id:'castle',quantity:1.5}]},{items:[{id:'castle',quantity:21}]},{items:[{id:'castle',quantity:1},{id:'castle',quantity:2}]}]) assert.throws(() => core.validateOrder({...order(),...change}));
});
test('ratings exclude unrated comments and editing removes the previous rating', async () => {
  const blob=memoryBlob(),store=createStore(blob);
  await store.saveComment('castle',user,'Great',5);
  await store.saveComment('castle',{...user,id:'student-b'},'No rating from me',null);
  let result=await store.comments('castle'); assert.deepEqual(result.rating,{average:5,count:1});
  await store.saveComment('castle',{...user,id:'student-c'},'',2);
  result=await store.comments('castle'); assert.deepEqual(result.rating,{average:3.5,count:2});
  const rows=blob.rows.get('hawk/community/castle.json'); rows.value[0].updated_at=new Date(Date.now()-20000).toISOString();
  await store.saveComment('castle',user,'Updated',null);
  result=await store.comments('castle'); assert.deepEqual(result.rating,{average:2,count:1}); assert.equal(result.comments.length,3);
});
test('public feed omits private profile and owner fields, while own comment is scoped by user', async () => {
  const store=createStore(memoryBlob()); await store.saveComment('castle',user,'Hello',null);
  const result=await store.comments('castle');
  assert.equal(result.comments[0].display_name,'Sam');
  for (const field of ['owner','email','grade','class_name','user_id']) assert.equal(result.comments[0][field],undefined);
  assert.equal(await store.myComment('castle','other-user'),null);
  assert.deepEqual(await store.myComment('castle',user.id),{body:'Hello',rating:null});
});
test('concurrent comment saves retain both students', async () => {
  const store=createStore(memoryBlob());
  await Promise.all([store.saveComment('castle',user,'First',4),store.saveComment('castle',{...user,id:'student-b'},'Second',2)]);
  assert.equal((await store.comments('castle')).comments.length,2);
});
test('admin attempts are shared, stop after five, and sessions reject tampering', async () => {
  const store=createStore(memoryBlob()); for(let i=0;i<5;i++) assert.equal(await store.adminAttempt('one-ip'),true);
  assert.equal(await store.adminAttempt('one-ip'),false);
  assert.equal(core.adminSession({headers:{cookie:'hawk_admin=forged.forged'}}),false);
});
test('API requires account authorization for orders and rejects cross-site posts', async () => {
  const handler=createHandler({store:createStore(memoryBlob())});
  async function run(req) {
    const result={status:200,headers:{}};
    const res={setHeader(k,v){result.headers[k]=v;},status(s){result.status=s;return this;},json(data){result.data=data;}};
    await handler(req,res); return result;
  }
  let result=await run({method:'POST',url:'/?action=prepare-order',headers:{host:'site.test',origin:'https://evil.test'},body:order()}); assert.equal(result.status,403);
  result=await run({method:'POST',url:'/?action=prepare-order',headers:{host:'site.test',origin:'https://site.test'},body:order()}); assert.equal(result.status,401);
  result=await run({method:'GET',url:'/?action=ratings',headers:{host:'site.test'}}); assert.equal(result.status,200); assert.equal(Object.keys(result.data).length,6);
});
test('server reads identity from Supabase instead of trusting client-supplied identity', async () => {
  const original=global.fetch;
  global.fetch=async url => { assert.ok(String(url).endsWith('/auth/v1/user')); return new Response(JSON.stringify({...user,email_confirmed_at:'2026-01-01'}),{status:200}); };
  try {
    const auth=await core.authenticate({headers:{authorization:'Bearer test-token'}});
    const email=core.prepareEmail(auth.user,{...order(),email:'fake@gmail.com',name:'Fake'});
    assert.ok(email.body.includes('Sam Student')); assert.ok(!email.body.includes('fake@gmail.com'));
  } finally { global.fetch=original; }
});
