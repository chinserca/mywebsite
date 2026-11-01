'use strict';
const crypto = require('node:crypto');
const products = require('../website 1/catalog.js');
const SUPABASE_URL = 'https://hvlsmytdbxoczikpipli.supabase.co';
const PUBLIC_KEY = 'sb_publishable_pFWihcQNl1GvVCq2P32LIw_5NYHylQH';
const TERMS = '2026-11-01';
const ADMIN_EMAIL = 'leocoobie@gmail.com';
const topics = new Set(['ideas', ...products.map(p => p.id)]);
class HttpError extends Error { constructor(status,message) { super(message); this.status = status; } }
function validTopic(topic,catalog = products) { if (topic !== 'ideas' && !catalog.some(p => p.id === topic)) throw new HttpError(400,'Choose an item or the design-ideas discussion.'); return topic; }
function validateReview(body,catalog = products) {
  const topic = validTopic(body.topic,catalog);
  if (typeof body.body !== 'string' || body.body.trim().length > 1000) throw new HttpError(400,'Keep your comment under 1,000 characters.');
  const rating = body.rating;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new HttpError(400,'Choose 1–5 stars or no rating.');
  if (topic === 'ideas' && rating !== null) throw new HttpError(400,'Design ideas don’t have star ratings.');
  if (!body.body.trim() && rating === null) throw new HttpError(400,'Write a comment or choose a star rating.');
  return { p_topic: topic,p_body: body.body.trim(),p_rating: rating };
}
function validateOrder(body,catalog = products) {
  if (body.accepted !== true || body.terms !== TERMS) throw new HttpError(400,'Read and accept the current Terms of Service.');
  if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) throw new HttpError(400,'Invalid order reference. Refresh and try again.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > catalog.length) throw new HttpError(400,'Add at least one design to your inventory.');
  const seen = new Set(); let quantity = 0;
  const items = body.items.map(item => {
    if (!item || !catalog.some(p => p.id === item.id) || seen.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new HttpError(400,'Check your items and quantities.');
    seen.add(item.id); quantity += item.quantity; return { id: item.id,quantity: item.quantity };
  });
  if (quantity > 20) throw new HttpError(400,'Your inventory can contain at most 20 items.');
  return { p_id: body.id,p_items: items,p_terms: TERMS };
}
async function authenticate(req) {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match || match[1].length > 8192) throw new HttpError(401,'Log in before ordering or posting.');
  let response;
  try { response = await fetch(SUPABASE_URL + '/auth/v1/user',{ headers: { apikey: PUBLIC_KEY,Authorization: 'Bearer ' + match[1] },signal: AbortSignal.timeout(15000) }); }
  catch { throw new HttpError(503,'Accounts couldn’t be reached. Please try again.'); }
  const user = await response.json();
  if (!response.ok || !user.id || !user.email_confirmed_at || !/^[^@\s]+@gmail\.com$/i.test(user.email || '')) throw new HttpError(401,'Log in with a confirmed Gmail account first.');
  return { user,token: match[1] };
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new HttpError(403,'Open the form on the HawkTech3D website to continue.');
  let originHost; try { originHost = new URL(origin).host; } catch { throw new HttpError(403,'Invalid origin.'); }
  if (originHost !== req.headers.host || !/^https?:\/\//.test(origin)) throw new HttpError(403,'Open the form on the HawkTech3D website to continue.');
}
function adminSession(req) {
  const secret = process.env.HAWK_ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('hawk_admin='))?.slice(11);
  if (!value) return false;
  const [payload,signature,...extra] = value.split('.');
  if (!payload || !signature || extra.length) return false;
  const expected = crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return false;
  try { const data = JSON.parse(Buffer.from(payload,'base64url').toString()); return data.email === ADMIN_EMAIL && Number.isFinite(data.expires) && data.expires > Date.now(); } catch { return false; }
}
function cookie(secret) {
  const payload = Buffer.from(JSON.stringify({ email: ADMIN_EMAIL,expires: Date.now()+3600000,nonce: crypto.randomBytes(16).toString('hex') })).toString('base64url');
  const signature = crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  return 'hawk_admin=' + payload + '.' + signature + '; Path=/api/hawk; HttpOnly; Secure; SameSite=Strict; Max-Age=3600';
}
async function adminLogin(req,body,store) {
  const hash = process.env.HAWK_ADMIN_PASSWORD_HASH, secret = process.env.HAWK_ADMIN_SESSION_SECRET;
  if (!hash || !secret) throw new HttpError(503,'Admin sign-in is still being connected.');
  const ip = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const key = crypto.createHmac('sha256',secret).update(String(ip).slice(0,200)).digest('hex');
  const allowed = await store.adminAttempt(key);
  if (!allowed) throw new HttpError(429,'Too many admin sign-in attempts. Try again in 15 minutes.');
  const [salt,stored] = hash.split(':');
  if (!salt || !stored || !/^[a-f0-9]{128}$/.test(stored)) throw new HttpError(503,'Admin sign-in is not configured correctly.');
  const candidate = crypto.pbkdf2Sync(String(body.password || '').slice(0,128),salt,210000,64,'sha512');
  const matches = crypto.timingSafeEqual(candidate,Buffer.from(stored,'hex'));
  if (!matches || String(body.email || '').trim().toLowerCase() !== ADMIN_EMAIL) throw new HttpError(401,'The admin email or password is incorrect.');
  return cookie(secret);
}
function profile(user) {
  const data = user.user_metadata || {};
  if (typeof data.name !== 'string' || data.name.trim().length < 1 || data.name.trim().length > 80 || !Number.isInteger(Number(data.grade)) || Number(data.grade) < 2 || Number(data.grade) > 12 || typeof data.class_name !== 'string' || !data.class_name.trim() || data.class_name.trim().length > 40) throw new HttpError(400,'Add your name, grade, and class using “Add or update your details” first.');
  return { name: data.name.trim(),grade: Number(data.grade),class_name: data.class_name.trim(),email: user.email };
}
function prepareEmail(user,input,catalog = products) {
  const order = validateOrder(input,catalog), student = profile(user);
  const lines = order.p_items.map(item => { const p = catalog.find(p => p.id === item.id); return { ...p,quantity: item.quantity }; });
  const money = cents => '$' + (cents/100).toFixed(2);
  const total = lines.reduce((sum,p) => sum+p.price*p.quantity,0);
  const body = ['HawkTech3D inventory request','Reference: ' + input.id,'','Student name: ' + student.name,'Gmail: ' + student.email,'Grade: ' + student.grade,'Class: ' + student.class_name,'','Items:',...lines.map(p => p.quantity + ' × ' + p.name + ' — base cost ' + money(p.price) + ' each; ' + money(p.price*p.quantity) + ' total'),'','Total base cost: ' + money(total),'Final student price and availability to be confirmed by the fundraiser organizer. Payment is in person.','','Terms accepted: ' + TERMS,'If I buy an item and change my mind, I must still pay 50% of its original confirmed purchase price, and I will not receive the item.','','Please confirm my order details.'].join('\n');
  return { to: ADMIN_EMAIL,subject: 'HawkTech3D inventory — ' + student.name.replace(/[\r\n]/g,' ') + ' — Grade ' + student.grade,body,reference: input.id };
}
module.exports = { products,TERMS,ADMIN_EMAIL,HttpError,validTopic,validateReview,validateOrder,authenticate,sameOrigin,adminSession,adminLogin,profile,prepareEmail };
