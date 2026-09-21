/* ==========================================
   KR-Dict — GitHub Integration
   Sync data (vocab, quiz) via GitHub API
   ========================================== */
window.KR = window.KR || {};

KR.github = (function () {
  'use strict';

  const API = 'https://api.github.com';
  const CONFIG_KEY = 'github:config';

  const STORAGE = KR.auth.STORAGE;

  function getConfig() { return STORAGE.get(CONFIG_KEY, null); }
  function setConfig(cfg) { STORAGE.set(CONFIG_KEY, cfg); }
  function clearConfig() { STORAGE.remove(CONFIG_KEY); }
  function isConfigured() {
    const c = getConfig();
    return !!(c && c.owner && c.repo && c.token && c.branch);
  }

  function headers() {
    const c = getConfig();
    return {
      'Authorization': `Bearer ${c.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  async function testConnection() {
    if (!isConfigured()) return { ok: false, msg: 'Konfigurasi belum lengkap' };
    try {
      const c = getConfig();
      const res = await fetch(`${API}/repos/${c.owner}/${c.repo}`, { headers: headers() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, msg: err.message || `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, msg: `Terhubung ke ${data.full_name}`, data };
    } catch (e) {
      return { ok: false, msg: e.message || 'Gagal koneksi' };
    }
  }

  async function getFileSha(path) {
    try {
      const c = getConfig();
      const res = await fetch(`${API}/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(path)}?ref=${c.branch}&t=${Date.now()}`, { headers: headers() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.sha || null;
    } catch { return null; }
  }

  async function getFileContent(path) {
    try {
      const c = getConfig();
      const res = await fetch(`${API}/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(path)}?ref=${c.branch}&t=${Date.now()}`, { headers: headers() });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.content) return null;
      return decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
    } catch { return null; }
  }

  async function uploadFile(path, content, message) {
    if (!isConfigured()) throw new Error('GitHub belum dikonfigurasi');
    const c = getConfig();
    const sha = await getFileSha(path);
    const body = {
      message: message || `Update ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: c.branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(`${API}/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  return { getConfig, setConfig, clearConfig, isConfigured, testConnection, getFileContent, uploadFile, getFileSha };
})();
