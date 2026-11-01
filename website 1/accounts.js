(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('accountDialog');
  if (!dialog) return;
  const form = $('accountForm'), message = $('accountMessage');
  let mode = 'login', busy = false, opener, currentUser = null;
  const ready = new Promise(resolve => {
    if (!window.supabase) { $('accountStatus').textContent = 'Accounts couldn’t load. Refresh the page and try again.'; resolve(null); return; }
    const client = window.supabase.createClient('https://hvlsmytdbxoczikpipli.supabase.co', 'sb_publishable_pFWihcQNl1GvVCq2P32LIw_5NYHylQH');
    window.HawkClient = client;
    const render = user => {
      currentUser = user;
      $('loginButton').hidden = $('signupButton').hidden = !!user;
      $('logoutButton').hidden = $('accountName').hidden = !user;
      $('accountName').textContent = user ? 'Hi, ' + (user.user_metadata?.name?.split(' ')[0] || 'there') : '';
      window.dispatchEvent(new CustomEvent('hawk:auth', { detail: user }));
    };
    client.auth.onAuthStateChange((event, session) => {
      render(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') setTimeout(() => open('recovery', $('loginButton')), 0);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      render(data.session?.user || null);
      $('loginButton').disabled = $('signupButton').disabled = false;
      $('accountStatus').textContent = '';
      resolve(client);
    }).catch(() => { $('accountStatus').textContent = 'Accounts couldn’t load. Refresh and try again.'; resolve(null); });
  });
  function setMode(next) {
    mode = next;
    const profile = mode === 'signup' || mode === 'profile' || mode === 'login', recovery = mode === 'recovery';
    $('accountTitle').textContent = ({ signup: 'Join HawkTech3D', login: 'Welcome back', profile: 'Your order details', recovery: 'Choose a new password' })[mode];
    $('submitAccount').textContent = ({ signup: 'Create account', login: 'Log in', profile: 'Save details', recovery: 'Save password' })[mode];
    for (const id of ['accountStudentName', 'accountGrade', 'accountClass']) {
      $(id).closest('label').hidden = !profile; $(id).required = profile; $(id).disabled = !profile;
    }
    $('accountEmail').closest('label').hidden = recovery || mode === 'profile';
    $('accountEmail').disabled = recovery || mode === 'profile';
    $('accountPassword').closest('label').hidden = mode === 'profile';
    $('accountPassword').disabled = mode === 'profile';
    $('accountPassword').minLength = mode === 'signup' || recovery ? 12 : 1;
    $('accountPassword').autocomplete = mode === 'signup' || recovery ? 'new-password' : 'current-password';
    $('accountPassword').value = '';
    $('switchAccount').hidden = recovery || mode === 'profile';
    $('switchAccount').textContent = mode === 'signup' ? 'Already joined? Log in' : 'Create an account';
    $('resetPassword').hidden = mode !== 'login';
    $('accountPrivacy').hidden = !profile;
    message.textContent = '';
    if (profile && currentUser) {
      $('accountStudentName').value = currentUser.user_metadata?.name || '';
      $('accountGrade').value = currentUser.user_metadata?.grade || '';
      $('accountClass').value = currentUser.user_metadata?.class_name || '';
    }
  }
  function open(next = 'login', source) {
    opener = source; setMode(next); if (!dialog.open) dialog.showModal();
  }
  function errorText(error) {
    if (/email.*not.*authorized|email_address_not_authorized/i.test(error.code || error.message || '')) return 'Email confirmations aren’t ready yet. Please tell your fundraiser organizer.';
    if (/rate|too many/i.test(error.message || '')) return 'A few too many tries. Wait a little, then try again.';
    return error.message || 'That didn’t work. Please try again.';
  }
  function details() { return { name: $('accountStudentName').value.trim(), grade: Number($('accountGrade').value), class_name: $('accountClass').value.trim() }; }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const client = await ready; if (!client) return;
    busy = true; $('submitAccount').disabled = true; $('switchAccount').disabled = true;
    message.textContent = 'One moment…';
    try {
      const returnUrl = new URL('index.html', location.href).href;
      if (mode === 'signup') {
        const email = $('accountEmail').value.trim().toLowerCase();
        if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(email)) throw new Error('Please use your Gmail address.');
        const { data, error } = await client.auth.signUp({ email, password: $('accountPassword').value, options: { data: details(), emailRedirectTo: returnUrl } });
        if (error) throw error;
        $('accountPassword').value = '';
        if (data.session) { dialog.close(); }
        else message.textContent = 'Check your Gmail for a confirmation link, then come back here and log in. Have a look in spam too.';
      } else if (mode === 'recovery') {
        const { error } = await client.auth.updateUser({ password: $('accountPassword').value });
        if (error) throw error;
        $('accountPassword').value = ''; message.textContent = 'Your password is saved. You can close this window.';
      } else if (mode === 'profile') {
        const d = details();
        const updated = await client.auth.updateUser({ data: d });
        if (updated.error) throw updated.error;
        dialog.close(); window.dispatchEvent(new Event('hawk:profile'));
      } else {
        const { error } = await client.auth.signInWithPassword({ email: $('accountEmail').value.trim(), password: $('accountPassword').value });
        if (error) throw error;
        const updated = await client.auth.updateUser({ data: details() });
        if (updated.error) throw updated.error;
        dialog.close();
      }
    } catch (error) { message.textContent = errorText(error); }
    finally { busy = false; $('submitAccount').disabled = $('switchAccount').disabled = false; }
  });
  $('loginButton').addEventListener('click', () => open('login', $('loginButton')));
  $('signupButton').addEventListener('click', () => open('signup', $('signupButton')));
  $('closeAccount').addEventListener('click', () => { if (!busy) dialog.close(); });
  dialog.addEventListener('close', () => { $('accountPassword').value = ''; if (opener && !opener.hidden) opener.focus(); });
  $('switchAccount').addEventListener('click', () => { if (!busy) setMode(mode === 'signup' ? 'login' : 'signup'); });
  $('resetPassword').addEventListener('click', async () => {
    if (busy || !$('accountEmail').reportValidity()) return;
    busy = true; $('resetPassword').disabled = true;
    try {
      const client = await ready; if (!client) throw new Error('Refresh and try again.');
      const { error } = await client.auth.resetPasswordForEmail($('accountEmail').value.trim(), { redirectTo: new URL('index.html', location.href).href });
      if (error) throw error;
      message.textContent = 'If this email has an account, a reset link will arrive in your inbox.';
    } catch (error) { message.textContent = errorText(error); }
    finally { busy = false; $('resetPassword').disabled = false; }
  });
  $('logoutButton').addEventListener('click', async () => {
    $('logoutButton').disabled = true;
    try { const client = await ready; const { error } = await client.auth.signOut(); if (error) throw error; }
    catch (error) { $('accountStatus').textContent = errorText(error); }
    finally { $('logoutButton').disabled = false; }
  });
  window.HawkAuth = { ready, open, get user() { return currentUser; }, async requireUser() {
    const client = await ready;
    if (!client) throw new Error('Accounts couldn’t load. Refresh and try again.');
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) { open('login'); throw new Error('Log in or create an account to continue.'); }
    return data.user;
  } };
})();
