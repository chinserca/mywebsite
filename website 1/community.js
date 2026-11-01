(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const products = window.HawkCatalog;
  const money = cents => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
  let currentUser = null, topic = null, sequence = 0, cursor = null, commentBusy = false, commentTouched = false;
  const key = () => currentUser ? 'hawk-inventory:' + currentUser.id : null;
  function readCart() {
    if (!key()) return [];
    try {
      const raw = JSON.parse(localStorage.getItem(key()) || '[]');
      if (!Array.isArray(raw)) return [];
      return products.map(p => ({ id: p.id, quantity: Number(raw.find(x => x?.id === p.id)?.quantity || 0) }))
        .filter(x => Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 20);
    } catch { return []; }
  }
  function writeCart(items) {
    if (!key()) throw new Error('Log in to save your inventory.');
    localStorage.setItem(key(), JSON.stringify(items));
    updateCount(); window.dispatchEvent(new Event('hawk:cart'));
  }
  function updateCount() {
    const count = readCart().reduce((a,x) => a + x.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = String(count); });
  }
  async function api(action, body, authenticated = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (authenticated) {
      await window.HawkAuth.requireUser();
      const { data } = await window.HawkClient.auth.getSession();
      if (!data.session) throw new Error('Log in to continue.');
      headers.Authorization = 'Bearer ' + data.session.access_token;
    }
    const response = await fetch('/api/hawk?action=' + encodeURIComponent(action), {
      method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('This feature couldn’t load. Please tell your organizer and try again later.'); }
    if (!response.ok) throw new Error(data.error || 'That didn’t work. Please try again.');
    return data;
  }
  function node(tag, text, className) {
    const el = document.createElement(tag); if (text !== undefined) el.textContent = text;
    if (className) el.className = className; return el;
  }
  window.Hawk = { products, money, readCart, writeCart, api, node, get user() { return currentUser; } };
  window.addEventListener('hawk:auth', event => { currentUser = event.detail; updateCount(); });
  window.addEventListener('storage', () => { updateCount(); window.dispatchEvent(new Event('hawk:cart')); });
  window.HawkAuth.ready.then(() => { currentUser = window.HawkAuth.user; updateCount(); });

  document.querySelectorAll('.catalog .card').forEach((card, i) => {
    const product = products[i]; if (!product) return;
    const summary = node('p', 'No ratings yet', 'product-rating'); summary.dataset.ratingTopic = product.id;
    const actions = node('div', undefined, 'product-actions');
    const add = node('button', 'Add to inventory', 'button'); add.type = 'button';
    add.setAttribute('aria-label', 'Add ' + product.name + ' to inventory');
    const comment = node('button', 'Comment / rate', 'account-button'); comment.type = 'button'; comment.dataset.commentTopic = product.id;
    const status = node('p', '', 'action-status'); status.setAttribute('role', 'status');
    add.addEventListener('click', async () => {
      add.disabled = true;
      try {
        await window.HawkAuth.requireUser(); currentUser = window.HawkAuth.user;
        const cart = readCart();
        if (cart.reduce((a,x) => a+x.quantity,0) >= 20) throw new Error('Your inventory can hold up to 20 items at a time.');
        const item = cart.find(x => x.id === product.id);
        if (item) item.quantity++; else cart.push({ id: product.id, quantity: 1 });
        writeCart(cart); status.textContent = 'Added! Open your inventory to review it.';
      } catch (error) { status.textContent = error.message; }
      finally { add.disabled = false; }
    });
    actions.append(add, comment); card.append(summary,actions,status);
  });
  async function loadRatings() {
    if (!document.querySelector('[data-rating-topic]')) return;
    try {
      const result = await api('ratings');
      for (const el of document.querySelectorAll('[data-rating-topic]')) {
        const rating = result[el.dataset.ratingTopic];
        el.textContent = rating?.count ? '★ ' + rating.average + ' / 5 · ' + rating.count + ' rating' + (rating.count === 1 ? '' : 's') : 'No ratings yet';
      }
    } catch {
      document.querySelectorAll('[data-rating-topic]').forEach(el => { el.textContent = 'Ratings couldn’t load yet'; });
    }
  }
  function renderComments(comments, append = false) {
    const list = $('commentList'); if (!append) list.replaceChildren();
    if (!comments.length && !append) list.append(node('p', 'No comments yet. What would you like to share?'));
    for (const comment of comments) {
      const article = node('article',undefined,'public-comment');
      article.append(node('strong',comment.display_name));
      const date = new Date(comment.updated_at);
      article.append(node('span', ' · ' + date.toLocaleDateString()));
      if (comment.rating !== null) article.append(node('p', '★'.repeat(comment.rating) + ' · ' + comment.rating + '/5','review-stars'));
      if (comment.body) article.append(node('p',comment.body));
      list.append(article);
    }
  }
  async function loadComments(append = false) {
    const request = ++sequence, requestedTopic = topic;
    $('moreComments').disabled = $('refreshComments').disabled = true;
    try {
      const data = await api('comments', { topic, before: append ? cursor : null });
      if (request !== sequence || requestedTopic !== topic) return;
      renderComments(data.comments,append);
      const last = data.comments.at(-1); cursor = last ? { time: last.updated_at, id: last.id } : null;
      $('moreComments').hidden = data.comments.length < 50;
      $('ratingSummary').textContent = topic === 'ideas' ? '' : data.rating?.count ? '★ ' + data.rating.average + ' / 5 from ' + data.rating.count + ' ratings' : 'No star ratings yet. Unrated comments don’t affect the average.';
    } catch (error) { if (request === sequence) $('commentMessage').textContent = error.message; }
    finally { if (request === sequence) $('moreComments').disabled = $('refreshComments').disabled = false; }
  }
  async function openComments(nextTopic, button) {
    topic = nextTopic; cursor = null; commentTouched = false;
    const product = products.find(p => p.id === topic);
    $('commentTitle').textContent = product ? product.name + ' · comments' : 'Ideas for the next print';
    $('commentForm').reset(); $('commentMessage').textContent = '';
    $('ratingField').hidden = topic === 'ideas'; $('commentList').replaceChildren(node('p','Loading comments…'));
    $('ratingSummary').textContent = '';
    $('commentDialog').showModal(); $('commentDialog')._opener = button;
    loadComments();
    const requestedTopic = topic;
    try {
      await window.HawkAuth.ready;
      if (window.HawkAuth.user) {
        const own = await api('my-comment',{ topic },true);
        if (topic !== requestedTopic || commentBusy || commentTouched) return;
        if (own) {
          $('commentForm').elements.body.value = own.body || '';
          $('commentForm').elements.rating.value = own.rating === null ? '' : String(own.rating);
        }
      }
    } catch { /* Public comments stay available when account details cannot load. */ }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-comment-topic]');
    if (button) openComments(button.dataset.commentTopic,button);
  });
  $('commentForm').addEventListener('input', () => { commentTouched = true; });
  $('commentForm').addEventListener('submit', async event => {
    event.preventDefault(); if (commentBusy) return;
    commentBusy = true; const button = event.submitter; button.disabled = true;
    try {
      const form = event.currentTarget;
      const body = form.elements.body.value.trim(), value = form.elements.rating.value;
      const rating = topic === 'ideas' || value === '' ? null : Number(value);
      if (!body && rating === null) throw new Error('Write a comment or choose a star rating first.');
      await api('save-comment',{ topic, body, rating },true);
      $('commentMessage').textContent = 'Saved. Everyone can see your post now.';
      await loadComments(); await loadRatings();
    } catch (error) { $('commentMessage').textContent = error.message; }
    finally { commentBusy = false; button.disabled = false; }
  });
  $('refreshComments').addEventListener('click', () => loadComments());
  $('moreComments').addEventListener('click', () => loadComments(true));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', () => dialog._opener?.focus());
  $('adminButton').addEventListener('click', async () => {
    $('adminDialog')._opener = $('adminButton'); $('adminDialog').showModal(); $('adminMessage').textContent = '';
    try { const state = await api('admin-session'); showAdmin(state.admin); }
    catch (error) { $('adminMessage').textContent = error.message; }
  });
  function showAdmin(admin) { $('adminForm').hidden = admin; $('adminPanel').hidden = !admin; $('adminButton').textContent = admin ? 'Admin · signed in' : 'Admin'; }
  $('adminForm').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter, form = event.currentTarget; button.disabled = true;
    try {
      const data = new FormData(form);
      await api('admin-login',{ email: data.get('email'), password: data.get('password') });
      form.reset(); showAdmin(true);
    } catch (error) { $('adminMessage').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('adminDialog').addEventListener('close', () => $('adminForm').reset());
  $('adminLogout').addEventListener('click', async () => { try { await api('admin-logout',{}); showAdmin(false); } catch (error) { $('adminMessage').textContent = error.message; } });
  loadRatings();
})();
