/* ==========================================
   KR-Dict — Authentication Module v3.1
   User & Admin login dengan SHA-256 hash
   + Badge styling fix
   ========================================== */
window.KR = window.KR || {};

KR.auth = (function () {
  'use strict';

  const STORAGE = {
    get(k, d = null) { try { const v = localStorage.getItem('krdict:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('krdict:' + k, JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem('krdict:' + k); } catch {} }
  };

  const ROLE_KEY = 'role';
  const PASS_KEY = 'adminHash';
  const USER_KEY = 'userData';
  const DEFAULT_PASS = 'admin123';

  /* ---------- Hashing ---------- */
  async function hashPassword(pwd) {
    if (window.crypto?.subtle) {
      const buf = new TextEncoder().encode(pwd + '::krdict');
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return btoa(pwd + '::krdict');
  }

  async function ensureDefaultPassword() {
    if (!STORAGE.get(PASS_KEY)) {
      STORAGE.set(PASS_KEY, await hashPassword(DEFAULT_PASS));
    }
  }

  async function verifyPassword(pwd) {
    const saved = STORAGE.get(PASS_KEY);
    if (!saved) { await ensureDefaultPassword(); return pwd === DEFAULT_PASS; }
    return (await hashPassword(pwd)) === saved;
  }

  async function changePassword(oldPwd, newPwd) {
    if (!(await verifyPassword(oldPwd))) return { ok: false, msg: 'Password lama salah' };
    if (!newPwd || newPwd.length < 4) return { ok: false, msg: 'Password minimal 4 karakter' };
    STORAGE.set(PASS_KEY, await hashPassword(newPwd));
    return { ok: true };
  }

  /* ---------- Role ---------- */
  function getRole() { return STORAGE.get(ROLE_KEY, null); }
  function isAdmin() { return getRole() === 'admin'; }
  function isUser() { return getRole() === 'user'; }
  function getUserData() { return STORAGE.get(USER_KEY, null); }

  function logout() {
    STORAGE.remove(ROLE_KEY);
    STORAGE.remove(USER_KEY);
    location.reload();
  }

  /* ---------- Login ---------- */
  function loginAsUser(name = 'Tamu') {
    STORAGE.set(ROLE_KEY, 'user');
    STORAGE.set(USER_KEY, { name, joinedAt: Date.now() });
    hideLogin();
    updateBadge();
    if (KR.toast) KR.toast.success('Selamat datang, ' + name + '! 👋');
  }

  async function loginAsAdmin(pwd) {
    if (await verifyPassword(pwd)) {
      STORAGE.set(ROLE_KEY, 'admin');
      hideLogin();
      updateBadge();
      if (KR.toast) KR.toast.success('Login admin berhasil! 🔓');
      if (KR.admin) KR.admin.open();
      return true;
    }
    if (KR.toast) KR.toast.error('Password salah');
    return false;
  }

  /* ---------- UI ---------- */
  function showLogin() {
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.remove('hidden');
    const app = document.getElementById('app');
    if (app) app.style.visibility = 'hidden';
  }

  function hideLogin() {
    const screen = document.getElementById('loginScreen');
    if (screen) screen.classList.add('hidden');
    const app = document.getElementById('app');
    if (app) app.style.visibility = 'visible';
  }

  /* ==========================================
     ✅ FIX: Update badge pakai class .badge-btn baru
     ========================================== */
  function updateBadge() {
    const badge = document.getElementById('roleBadge');
    if (!badge) return;

    const role = getRole();

    if (role === 'admin') {
      badge.innerHTML = `
        <button id="openAdminBtn" class="badge-btn badge-admin" title="Dashboard Admin">
          <i data-lucide="shield-check"></i>
          <span class="hidden sm:inline">Admin</span>
        </button>
        <button id="logoutBtn" class="badge-btn badge-logout" title="Logout">
          <i data-lucide="log-out"></i>
        </button>`;

      document.getElementById('openAdminBtn')?.addEventListener('click', () => KR.admin?.open());
      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Logout dari sesi?')) logout();
      });

    } else if (role === 'user') {
      const user = getUserData();
      const safeName = (user?.name || 'User').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      badge.innerHTML = `
        <button class="badge-btn badge-user" title="${safeName}">
          <i data-lucide="user"></i>
          <span class="hidden sm:inline">${safeName}</span>
        </button>
        <button id="logoutBtn" class="badge-btn badge-logout" title="Logout">
          <i data-lucide="log-out"></i>
        </button>`;

      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Logout dari sesi?')) logout();
      });

    } else {
      badge.innerHTML = '';
    }

    if (window.lucide) lucide.createIcons();
  }

  /* ---------- Init ---------- */
  async function init() {
    await ensureDefaultPassword();

    // Bind login buttons
    document.getElementById('loginUserBtn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('loginUserName');
      const name = nameInput?.value.trim() || 'Tamu';
      loginAsUser(name);
    });

    document.getElementById('loginAdminBtn')?.addEventListener('click', () => {
      document.getElementById('loginUserForm')?.classList.add('hidden');
      document.getElementById('loginAdminForm')?.classList.remove('hidden');
      setTimeout(() => document.getElementById('loginAdminPass')?.focus(), 100);
    });

    document.getElementById('adminBackBtn')?.addEventListener('click', () => {
      document.getElementById('loginAdminForm')?.classList.add('hidden');
      document.getElementById('loginUserForm')?.classList.remove('hidden');
      const pass = document.getElementById('loginAdminPass');
      if (pass) pass.value = '';
    });

    const submitAdmin = async () => {
      const pwd = document.getElementById('loginAdminPass')?.value || '';
      const ok = await loginAsAdmin(pwd);
      if (!ok) {
        const el = document.getElementById('loginAdminPass');
        if (el) { el.value = ''; el.focus(); }
      }
    };
    document.getElementById('adminSubmitBtn')?.addEventListener('click', submitAdmin);
    document.getElementById('loginAdminPass')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdmin();
    });

    // Check session
    const role = getRole();
    if (role === 'admin' || role === 'user') {
      hideLogin();
      updateBadge();
    } else {
      showLogin();
    }

    if (window.lucide) lucide.createIcons();
  }

  return { init, isAdmin, isUser, getRole, getUserData, logout, changePassword, updateBadge, STORAGE };
})();
