(function () {
  "use strict";
  const login = document.getElementById("loginButton");
  const signup = document.getElementById("signupButton");
  const logout = document.getElementById("logoutButton");
  const name = document.getElementById("accountName");
  const status = document.getElementById("accountStatus");
  const dialog = document.getElementById("accountDialog");
  const form = document.getElementById("accountForm");
  const title = document.getElementById("accountTitle");
  const usernameField = document.getElementById("usernameField");
  const username = document.getElementById("accountUsername");
  const email = document.getElementById("accountEmail");
  const password = document.getElementById("accountPassword");
  const message = document.getElementById("accountMessage");
  const submit = document.getElementById("submitAccount");
  const switcher = document.getElementById("switchAccount");
  const reset = document.getElementById("resetPassword");
  const returnUrl = "https://mywebsite-one-beta-41.vercel.app/website%201/index.html";
  let mode = "login", busy = false, opener;
  if (!window.supabase) {
    status.textContent = "Accounts could not load. Please refresh and try again.";
    return;
  }
  const client = window.supabase.createClient(
    "https://hvlsmytdbxoczikpipli.supabase.co",
    "sb_publishable_pFWihcQNl1GvVCq2P32LIw_5NYHylQH",
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  function setMode(next) {
    mode = next;
    const signingUp = mode === "signup";
    const recovering = mode === "recovery";
    title.textContent = signingUp ? "Create your account" : recovering ? "Set a new password" : "Welcome back";
    submit.textContent = signingUp ? "Sign up" : recovering ? "Save new password" : "Log in";
    usernameField.hidden = !signingUp;
    username.required = signingUp;
    username.disabled = !signingUp;
    email.closest("label").hidden = recovering;
    email.required = !recovering;
    password.autocomplete = signingUp || recovering ? "new-password" : "current-password";
    password.minLength = signingUp || recovering ? 12 : 1;
    switcher.hidden = recovering;
    reset.hidden = signingUp || recovering;
    switcher.textContent = signingUp ? "Already have an account? Log in" : "Create an account";
    message.textContent = "";
    password.value = "";
  }
  function open(next, source) {
    opener = source;
    setMode(next);
    if (!dialog.open) dialog.showModal();
  }
  function render(user) {
    login.hidden = signup.hidden = Boolean(user);
    logout.hidden = name.hidden = !user;
    name.textContent = user ? "Hi, " + (user.user_metadata?.username || "there") : "";
  }
  function readable(error) {
    if (/email.*not.*authorized|email_address_not_authorized/i.test(error.code || error.message || "")) return "Email signup is not ready yet. Please contact the school; the confirmation email service still needs setup.";
    if (/rate|too many/i.test(error.message || "")) return "Too many attempts. Please wait a little and try again.";
    return error.message || "Something went wrong. Please try again.";
  }
  login.addEventListener("click", () => open("login", login));
  signup.addEventListener("click", () => open("signup", signup));
  document.getElementById("closeAccount").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { password.value = ""; if (opener && !opener.hidden) opener.focus(); });
  switcher.addEventListener("click", () => { if (!busy) setMode(mode === "signup" ? "login" : "signup"); });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true; submit.disabled = switcher.disabled = reset.disabled = true;
    message.textContent = "Please wait…";
    try {
      if (mode === "signup") {
        const { error } = await client.auth.signUp({ email: email.value.trim(), password: password.value,
          options: { data: { username: username.value.trim() }, emailRedirectTo: returnUrl } });
        if (error) throw error;
        password.value = "";
        message.textContent = "If this email can be registered, a confirmation link will arrive in your inbox. Open it, then return here to log in. Check your spam folder too.";
      } else if (mode === "recovery") {
        const { error } = await client.auth.updateUser({ password: password.value });
        if (error) throw error;
        password.value = "";
        message.textContent = "Your password has been updated.";
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        if (error) throw error;
        render(data.user); dialog.close();
      }
    } catch (error) { message.textContent = readable(error); }
    finally { busy = false; submit.disabled = switcher.disabled = reset.disabled = false; }
  });
  reset.addEventListener("click", async function () {
    if (busy) return;
    if (!email.reportValidity() || !email.value) { email.focus(); return; }
    busy = true; submit.disabled = switcher.disabled = reset.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: returnUrl });
      if (error) throw error;
      message.textContent = "If an account exists for this email, a password reset link will arrive in your inbox.";
    } catch (error) { message.textContent = readable(error); }
    finally { busy = false; submit.disabled = switcher.disabled = reset.disabled = false; }
  });
  logout.addEventListener("click", async function () {
    logout.disabled = true;
    try { const { error } = await client.auth.signOut(); if (error) throw error; render(null); }
    catch (error) { status.textContent = readable(error); }
    finally { logout.disabled = false; }
  });
  client.auth.onAuthStateChange((event, session) => {
    render(session?.user);
    if (event === "PASSWORD_RECOVERY") setTimeout(() => open("recovery", login), 0);
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    render(data.session?.user);
    status.textContent = "";
    login.disabled = signup.disabled = false;
  }).catch(() => { status.textContent = "Accounts could not load. Please refresh and try again."; });
})();
