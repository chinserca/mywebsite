'use strict';
const core = require('./hawk-core.cjs');
function createHandler({ store }) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const action = String(req.query?.action || new URL(req.url,'https://localhost').searchParams.get('action') || '');
      const getActions = new Set(['products','ratings','admin-session']);
      if (req.method !== (getActions.has(action) ? 'GET' : 'POST')) { res.setHeader('Allow',getActions.has(action) ? 'GET' : 'POST'); throw new core.HttpError(405,'That request method is not supported.'); }
      if (req.method === 'POST') core.sameOrigin(req);
      let body = req.body || {};
      if (typeof body === 'string') { if (body.length > 12000) throw new core.HttpError(413,'That request is too large.'); try { body = JSON.parse(body); } catch { throw new core.HttpError(400,'Invalid request.'); } }
      if (!body || Array.isArray(body) || typeof body !== 'object' || JSON.stringify(body).length > 12000) throw new core.HttpError(400,'Invalid request.');
      let result;
      const catalog = ['products','ratings','comments','my-comment','save-comment','prepare-order'].includes(action) ? await store.products() : core.products;
      if (action === 'products') result = catalog;
      else if (action === 'add-product') {
        if (!core.adminSession(req)) throw new core.HttpError(403,'Sign in as admin to add items.');
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 || typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 1500 || !Number.isInteger(body.price) || body.price < 1 || body.price > 99999) throw new core.HttpError(400,'Enter a name, description, and a price from $0.01 to $999.99.');
        result = await store.addProduct({ name: body.name.trim(),description: body.description.trim(),price: body.price });
      }
      else if (action === 'ratings') result = await store.ratings(catalog.map(p => p.id));
      else if (action === 'comments') {
        const topic = core.validTopic(body.topic,catalog), before = body.before;
        if (before && (typeof before.time !== 'string' || !Number.isFinite(Date.parse(before.time)) || typeof before.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(before.id))) throw new core.HttpError(400,'Invalid comment page.');
        result = await store.comments(topic,before);
      } else if (action === 'my-comment' || action === 'save-comment') {
        const { user } = await core.authenticate(req);
        if (action === 'my-comment') result = await store.myComment(core.validTopic(body.topic,catalog),user.id);
        else { core.profile(user); const review = core.validateReview(body,catalog); await store.saveComment(review.p_topic,user,review.p_body,review.p_rating); result = { saved: true }; }
      } else if (action === 'prepare-order') {
        const { user } = await core.authenticate(req); result = core.prepareEmail(user,body,catalog);
      } else if (action === 'admin-session') result = { admin: core.adminSession(req) };
      else if (action === 'admin-login') { res.setHeader('Set-Cookie',await core.adminLogin(req,body,store)); result = { admin: true }; }
      else if (action === 'admin-logout') { res.setHeader('Set-Cookie','hawk_admin=; Path=/api/hawk; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); result = { admin: false }; }
      else throw new core.HttpError(404,'This feature wasn’t found.');
      res.status(200).json(result);
    } catch (error) {
      if (!error.status) console.error('Hawk request failed',error.name || 'Error');
      res.status(error.status || 503).json({ error: error.status ? error.message : 'The shared service couldn’t be reached. Please try again.' });
    }
  };
}
module.exports = { createHandler };
