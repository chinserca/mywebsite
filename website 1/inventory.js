(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const { node, money, products, api } = window.Hawk;
  let busy = false;
  function message(text) { $('inventoryMessage').textContent = text; }
  function render() {
    const list = $('inventoryList'); list.replaceChildren();
    if (!window.Hawk.user) {
      $('inventoryIdentity').textContent = 'Log in or create an account to start your inventory.';
      list.append(node('p','Your picks are saved separately for each account in this browser.'));
      $('inventoryTotal').textContent = ''; $('submitInventory').disabled = true; return;
    }
    const user = window.Hawk.user;
    const meta = user.user_metadata || {};
    $('inventoryIdentity').textContent = [meta.name || 'Add your name',user.email,'Grade ' + (meta.grade || '—'),'Class ' + (meta.class_name || '—')].join(' · ');
    const cart = window.Hawk.readCart();
    if (!cart.length) list.append(node('p','Your inventory is empty. Head back to the collection and add a print you like.'));
    let total = 0;
    for (const item of cart) {
      const product = products.find(p => p.id === item.id); if (!product) continue;
      total += product.price * item.quantity;
      const row = node('article',undefined,'inventory-row');
      const description = node('div'); description.append(node('h3',product.name),node('p',money(product.price) + ' base cost each'));
      const quantity = node('input'); quantity.type = 'number'; quantity.min = '1'; quantity.max = '20'; quantity.step = '1'; quantity.value = item.quantity;
      quantity.setAttribute('aria-label','Quantity for ' + product.name); quantity.disabled = busy;
      quantity.addEventListener('change', () => {
        const next = Number(quantity.value), items = window.Hawk.readCart();
        if (!Number.isInteger(next) || next < 1 || next > 20 || items.reduce((sum,x) => sum + (x.id === item.id ? next : x.quantity),0) > 20) { message('Choose a whole quantity from 1 to 20, with no more than 20 items in total.'); render(); return; }
        items.find(x => x.id === item.id).quantity = next;
        try { window.Hawk.writeCart(items); message(''); } catch { message('Your browser couldn’t save that change.'); render(); }
      });
      const remove = node('button','Remove from inventory','account-button'); remove.type = 'button'; remove.disabled = busy;
      remove.setAttribute('aria-label','Remove ' + product.name + ' from inventory');
      remove.addEventListener('click', () => { try { window.Hawk.writeCart(window.Hawk.readCart().filter(x => x.id !== item.id)); message('Item removed.'); } catch { message('Your browser couldn’t save that change.'); } });
      row.append(description,quantity,node('strong',money(product.price*item.quantity)),remove); list.append(row);
    }
    $('inventoryTotal').textContent = 'Total base cost: ' + money(total);
    $('submitInventory').disabled = busy || !cart.length;
  }
  $('editProfile').addEventListener('click', async () => { try { await window.HawkAuth.requireUser(); window.HawkAuth.open('profile',$('editProfile')); } catch (error) { message(error.message); } });
  $('inventoryForm').addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !event.currentTarget.reportValidity()) return;
    busy = true; render(); message('Sending your inventory…');
    try {
      const user = await window.HawkAuth.requireUser();
      const items = window.Hawk.readCart(); if (!items.length) throw new Error('Add a print to your inventory first.');
      const storageKey = 'hawk-pending-order:' + user.id;
      let pending;
      try { pending = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { pending = null; }
      const snapshot = JSON.stringify(items);
      if (!pending || pending.snapshot !== snapshot) { pending = { id: crypto.randomUUID(), snapshot }; localStorage.setItem(storageKey,JSON.stringify(pending)); }
      const result = await api('prepare-order',{ id: pending.id, items, terms: '2026-11-01', accepted: true },true);
      const mailto = 'mailto:' + result.to + '?subject=' + encodeURIComponent(result.subject) + '&body=' + encodeURIComponent(result.body);
      const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(result.to) + '&su=' + encodeURIComponent(result.subject) + '&body=' + encodeURIComponent(result.body);
      $('emailDraft').hidden = false;
      $('emailDraftText').value = 'To: ' + result.to + '\nSubject: ' + result.subject + '\n\n' + result.body;
      $('openEmail').href = mailto; $('openGmail').href = gmail;
      message('Your email is ready. Review it and click Send in your email app or Gmail. Nothing has been sent by this website. Your inventory is kept until you clear it.');
      $('emailDraft').scrollIntoView({ behavior: 'smooth',block: 'center' });
      window.location.href = mailto;
    } catch (error) { message(error.message + ' Your inventory has been kept.'); }
    finally { busy = false; render(); }
  });
  window.addEventListener('hawk:auth', () => { $('emailDraft').hidden = true; $('emailDraftText').value = ''; render(); });
  window.addEventListener('hawk:profile', () => { $('emailDraft').hidden = true; render(); });
  window.addEventListener('hawk:cart', () => { $('emailDraft').hidden = true; $('emailDraftText').value = ''; render(); });
  window.HawkAuth.ready.then(render);
  $('clearAfterEmail').addEventListener('click', () => { try { window.Hawk.writeCart([]); localStorage.removeItem('hawk-pending-order:' + window.Hawk.user.id); $('emailDraft').hidden = true; $('acceptTerms').checked = false; message('Your inventory is cleared.'); } catch { message('Your browser couldn’t clear the inventory.'); } });
})();
