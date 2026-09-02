const Auth = (() => {
  const USERS_KEY = "petBuddyUsers";
  const SESSION_KEY = "petBuddySession";

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function currentUser() {
    return localStorage.getItem(SESSION_KEY);
  }

  async function signup(username, password) {
    const cleanName = username.trim().toLowerCase();
    if (cleanName.length < 3) {
      return { ok: false, error: "Username needs at least 3 letters." };
    }
    if (!/^[a-z0-9_]+$/.test(cleanName)) {
      return { ok: false, error: "Use letters, numbers, or _ only." };
    }
    if (password.length < 4) {
      return { ok: false, error: "Password needs at least 4 characters." };
    }

    const users = getUsers();
    if (users[cleanName]) {
      return { ok: false, error: "That username is already taken." };
    }

    users[cleanName] = {
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
      save: null,
    };
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, cleanName);
    return { ok: true, username: cleanName };
  }

  async function login(username, password) {
    const cleanName = username.trim().toLowerCase();
    const users = getUsers();
    const user = users[cleanName];
    if (!user) {
      return { ok: false, error: "Account not found." };
    }

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
      return { ok: false, error: "Wrong password." };
    }

    localStorage.setItem(SESSION_KEY, cleanName);
    return { ok: true, username: cleanName, save: user.save || null };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function saveGame(data) {
    const username = currentUser();
    if (!username) return;
    const users = getUsers();
    if (!users[username]) return;
    users[username].save = data;
    saveUsers(users);
  }

  function loadSave() {
    const username = currentUser();
    if (!username) return null;
    const users = getUsers();
    return users[username]?.save || null;
  }

  return {
    signup,
    login,
    logout,
    currentUser,
    saveGame,
    loadSave,
  };
})();
