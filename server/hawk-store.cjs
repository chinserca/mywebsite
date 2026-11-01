'use strict';
const crypto = require('node:crypto');
// Private Blob storage is read only by this server; public responses omit owner keys.
function createStore(blob) {
  async function read(path) {
    const result = await blob.get(path,{ access: 'private',useCache: false });
    if (!result) return { value: null,etag: null };
    return { value: await new Response(result.stream).json(),etag: result.blob.etag };
  }
  async function mutate(path,change) {
    for (let i=0;i<5;i++) {
      const current = await read(path), next = change(current.value);
      try {
        await blob.put(path,JSON.stringify(next),{ access: 'private',addRandomSuffix: false,contentType: 'application/json',cacheControlMaxAge: 60,allowOverwrite: !!current.etag,...(current.etag ? { ifMatch: current.etag } : {}) });
        return next;
      } catch (error) {
        if (!/Precondition|already exists|conflict/i.test(error.name + ' ' + error.message) || i===4) throw error;
      }
    }
  }
  const ownerKey = id => crypto.createHash('sha256').update(id).digest('hex');
  const topicPath = topic => 'hawk/community/' + topic + '.json';
  function summary(comments) {
    const ratings = comments.filter(c => Number.isInteger(c.rating));
    return { average: ratings.length ? Math.round(ratings.reduce((sum,c) => sum+c.rating,0)/ratings.length*10)/10 : null,count: ratings.length };
  }
  return {
    async ratings(topics) {
      const rows = await Promise.all(topics.map(async topic => [topic,summary((await read(topicPath(topic))).value || [])]));
      return Object.fromEntries(rows);
    },
    async comments(topic,before) {
      const all = (await read(topicPath(topic))).value || [];
      const sorted = all.filter(c => !before || c.updated_at < before.time || (c.updated_at === before.time && c.id < before.id)).sort((a,b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id)).slice(0,50);
      return { comments: sorted.map(({ id,display_name,body,rating,updated_at }) => ({ id,display_name,body,rating,updated_at })),rating: topic === 'ideas' ? null : summary(all) };
    },
    async myComment(topic,userId) {
      const all = (await read(topicPath(topic))).value || [];
      const own = all.find(c => c.owner === ownerKey(userId));
      return own ? { body: own.body,rating: own.rating } : null;
    },
    async saveComment(topic,user,body,rating) {
      const owner = ownerKey(user.id);
      await mutate(topicPath(topic),current => {
        const all = current || [], own = all.find(c => c.owner === owner);
        if (own && Date.now()-Date.parse(own.updated_at)<10000) { const error = new Error('Wait ten seconds before updating your comment.'); error.status=429; throw error; }
        if (!own && all.length >= 2000) { const error = new Error('This discussion is full. Please share your idea with the organizer.'); error.status=409; throw error; }
        const next = { id: own?.id || crypto.randomUUID(),owner,display_name: user.user_metadata.name.trim().split(/\s+/)[0],body,rating,updated_at: new Date().toISOString() };
        return [...all.filter(c => c.owner !== owner),next];
      });
    },
    async adminAttempt(key) {
      let allowed = false;
      await mutate('hawk/private/admin-attempts.json',current => {
        const now=Date.now(), attempts=Object.fromEntries(Object.entries(current || {}).filter(([,v]) => now-v.start < 900000));
        if (!attempts[key] && Object.keys(attempts).length >= 2000) { allowed=false; return attempts; }
        const entry=attempts[key] || { count: 0,start: now }; entry.count++; attempts[key]=entry; allowed=entry.count<=5; return attempts;
      });
      return allowed;
    }
  };
}
module.exports = { createStore };
