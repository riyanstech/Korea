// ==========================================
// KR-Dict — Main App v9.8 (FINAL)
// + FIXED CRITICAL: Fetch JSON files dari server
//   (agar update admin muncul di semua device)
// + FIXED: Expose functions ke window
// + FIXED: override kosong tidak lagi dihapus
// + FIXED: __KR_ORIGINAL__ update setelah fetch
// + FIXED: XSS prevention di toast
// + FIXED: safeOnclickString untuk onclick
// + FIXED: handleImageSelect clear input
// + FIXED: scroll target main.app-main
// + FIXED: formatHTTPError
// + FIXED: Network error handling
// + FIXED: testConnection dengan detail log
// + FIXED: Groq & Gemini models terbaru
// ==========================================

/* ==========================================
   SNAPSHOT DATA AWAL (dari data.js)
   Ini akan di-update setelah fetch JSON selesai
   ========================================== */
window.__KR_ORIGINAL__ = {
  vocab: (window.vocabTextbookData || []).slice(),
  grammar: (window.grammarData || []).slice(),
  culture: window.CULTURE_DATA ? JSON.parse(JSON.stringify(window.CULTURE_DATA)) : { babs: [] },
  downloads: (window.downloadsData || []).slice(),
};
/* ==========================================
   ✅ Helper: fetch dengan timeout
   ========================================== */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ==========================================
   LOAD REMOTE DATA (vocab, grammar, culture, downloads)
   Prioritas: localStorage override > JSON file > data.js
   ========================================== */
async function loadRemoteData() {
  console.log('[Load] Fetching remote data from JSON files...');

  const fetchJSON = async (path) => {
    try {
      const res = await fetchWithTimeout(path + '?t=' + Date.now(), {}, 12000);
      if (!res.ok) {
        console.warn('[Load] File not found:', path, '→ fallback ke data.js');
        return null;
      }
      const data = await res.json();
      console.log('[Load] ✅ Loaded:', path);
      return data;
    } catch (e) {
      console.warn('[Load] ❌ Gagal fetch', path, e);
      return null;
    }
  };

  // Fetch semua JSON paralel
  const [vocabData, grammarData, cultureData, downloadsData] = await Promise.all([
    fetchJSON('assets/data/vocab.json'),
    fetchJSON('assets/data/grammar.json'),
    fetchJSON('assets/data/culture.json'),
    fetchJSON('assets/data/downloads.json'),
  ]);

  // Terapkan JSON file jika ada (ini data dari server — paling terbaru)
  if (vocabData && Array.isArray(vocabData.items) && vocabData.items.length > 0) {
    window.vocabTextbookData = vocabData.items;
    console.log('[Load] vocab loaded from JSON:', vocabData.items.length, 'items');
  }
  if (grammarData && Array.isArray(grammarData.items) && grammarData.items.length > 0) {
    window.grammarData = grammarData.items;
    console.log('[Load] grammar loaded from JSON:', grammarData.items.length, 'items');
  }
  if (cultureData && cultureData.babs && Array.isArray(cultureData.babs) && cultureData.babs.length > 0) {
    window.CULTURE_DATA = cultureData;
    console.log('[Load] culture loaded from JSON:', cultureData.babs.length, 'babs');
  }
  if (downloadsData && Array.isArray(downloadsData.items) && downloadsData.items.length > 0) {
    window.downloadsData = downloadsData.items;
    console.log('[Load] downloads loaded from JSON:', downloadsData.items.length, 'items');
  }

  // ✅ PATCH: Simpan state server DULU sebagai __KR_ORIGINAL__ (untuk fitur Reset)
  //    sebelum override lokal di-apply, supaya Reset benar-benar kembali ke data JSON.
  window.__KR_ORIGINAL__ = {
    vocab: (window.vocabTextbookData || []).slice(),
    grammar: (window.grammarData || []).slice(),
    culture: window.CULTURE_DATA ? JSON.parse(JSON.stringify(window.CULTURE_DATA)) : { babs: [] },
    downloads: (window.downloadsData || []).slice(),
  };

  // Terapkan localStorage override (prioritas tertinggi — untuk device admin)
  const getOverride = (k) => {
    try {
      const v = localStorage.getItem('krdict:' + k);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  };

  const vocabOvr = getOverride('vocabOverride');
  if (vocabOvr && Array.isArray(vocabOvr) && vocabOvr.length > 0) {
    window.vocabTextbookData = vocabOvr;
    console.log('[Load] vocab override aktif (localStorage):', vocabOvr.length);
  }

  const grammarOvr = getOverride('grammarOverride');
  if (grammarOvr && Array.isArray(grammarOvr) && grammarOvr.length > 0) {
    window.grammarData = grammarOvr;
    console.log('[Load] grammar override aktif:', grammarOvr.length);
  }

  const cultureOvr = getOverride('cultureOverride');
  if (cultureOvr && cultureOvr.babs && Array.isArray(cultureOvr.babs) && cultureOvr.babs.length > 0) {
    window.CULTURE_DATA = cultureOvr;
    console.log('[Load] culture override aktif');
  }

  const downloadsOvr = getOverride('downloadsOverride');
  if (downloadsOvr && Array.isArray(downloadsOvr) && downloadsOvr.length > 0) {
    window.downloadsData = downloadsOvr;
    console.log('[Load] downloads override aktif:', downloadsOvr.length);
  }

  console.log('[Load] ✅ Semua data siap. Vocab:', window.vocabTextbookData?.length || 0);
  return true;
}

/* ---------- TOAST (whitelist tag aman) ---------- */
window.KR = window.KR || {};
KR.toast = (function () {
  let container;
  function show(msg, type = 'info', duration = 3000) {
    if (!container) container = document.getElementById('toastContainer');
    if (!container) { console.warn('[Toast]', msg); return; }
    const div = document.createElement('div');
    div.className = 'toast ' + type;
    const cleaned = String(msg).replace(/<(?!\/?(strong|em|br|code)\b)[^>]*>/gi, '');
    div.innerHTML = `<div style="flex:1">${cleaned}</div>`;
    container.appendChild(div);
    setTimeout(() => {
      div.classList.add('removing');
      setTimeout(() => div.remove(), 250);
    }, duration);
  }
  return {
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    warn: (m, d) => show(m, 'warn', d),
    info: (m, d) => show(m, 'info', d),
  };
})();

/* ---------- SAFE HELPERS ---------- */
function safeOnclickString(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ')
    .replace(/"/g, '&quot;')
    .replace(/</g, '\\x3c');
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/* ---------- STATE ---------- */
let selectedVocabForQuiz = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let currentScore = 0;
let chatHistory = [];
let isTyping = false;
let selectedImageBase64 = null;
let recognition = null;
let isRecording = false;
let currentQuickMode = 'tutor';

// Call feature
let isCallActive = false;
let callSpeechSynth = window.speechSynthesis;
let callRecognition = null;
let isAIThinking = false;
let isCallSpeaking = false;
let userMuted = false;

/* ==========================================
   AI PROVIDERS CONFIG
   ========================================== */
const AI_PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    models: [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest'
    ],
    defaultModel: 'gemini-3.6-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    desc: 'Free tier generous, support gambar',
    format: 'gemini',
  },
  groq: {
    name: 'Groq (Gratis & Cepat)',
    icon: '⚡',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'groq/compound-mini',
      'allam-2-7b'
    ],
    defaultModel: 'openai/gpt-oss-120b',
    keyUrl: 'https://console.groq.com/keys',
    desc: 'Gratis, sangat cepat, limit tinggi',
    format: 'openai',
  },
  openai: {
    name: 'OpenAI (GPT)',
    icon: '🤖',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    desc: 'Berbayar, kualitas premium',
    format: 'openai',
  },
  anthropic: {
    name: 'Anthropic Claude',
    icon: '🎭',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    defaultModel: 'claude-3-5-haiku-20241022',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    desc: 'Pintar & natural, support gambar',
    format: 'anthropic',
  },
  openrouter: {
    name: 'OpenRouter (Multi-Model)',
    icon: '🌐',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'google/gemini-flash-1.5',
      'google/gemini-2.0-flash-exp:free',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
    ],
    defaultModel: 'google/gemini-flash-1.5',
    keyUrl: 'https://openrouter.ai/keys',
    desc: 'Akses banyak model dari 1 API key',
    format: 'openai',
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🐋',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    desc: 'Murah, cocok untuk reasoning',
    format: 'openai',
  },
  mistral: {
    name: 'Mistral AI',
    icon: '🌪️',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
    defaultModel: 'mistral-small-latest',
    keyUrl: 'https://console.mistral.ai/api-keys/',
    desc: 'Eropa, cepat & murah',
    format: 'openai',
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    icon: '⚙️',
    endpoint: '',
    models: ['custom'],
    defaultModel: 'custom',
    keyUrl: '',
    desc: 'Gunakan endpoint sendiri (OpenAI-compatible API)',
    format: 'openai',
  },
};

/* ---------- FORMAT HTTP ERROR ---------- */
function formatHTTPError(status, data) {
  const serverMsg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : '');
  const hints = {
    400: 'Permintaan tidak valid (mungkin model deprecated atau format salah)',
    401: 'API Key tidak valid atau expired → cek di dashboard provider',
    403: 'Akses ditolak (API Key tidak punya izin, atau model tidak tersedia)',
    404: 'Model atau endpoint tidak ditemukan (mungkin model sudah deprecated atau API Key salah)',
    429: 'Rate limit tercapai → tunggu 1 menit atau ganti provider',
    500: 'Server provider error → coba lagi nanti',
    502: 'Bad gateway provider → coba lagi nanti',
    503: 'Provider sedang maintenance → coba lagi nanti',
  };
  const hint = hints[status] || 'Kesalahan tidak terduga';
  return `HTTP ${status}: ${hint}${serverMsg ? ' — ' + serverMsg : ''}`;
}

/* ---------- AI CONFIG STORAGE ---------- */
function getAIConfig() {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  const cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
  return {
    provider,
    model: localStorage.getItem('ai_model_' + provider) || cfg.defaultModel,
    apiKey: localStorage.getItem('ai_key_' + provider) || '',
    customEndpoint: localStorage.getItem('ai_custom_endpoint') || '',
  };
}
function saveAIConfig({ provider, model, apiKey, customEndpoint }) {
  if (provider) localStorage.setItem('ai_provider', provider);
  if (model && provider) localStorage.setItem('ai_model_' + provider, model);
  if (apiKey !== undefined && provider) localStorage.setItem('ai_key_' + provider, apiKey);
  // ✅ Selalu set endpoint (termasuk string kosong) supaya tidak menyisakan data lama
  if (customEndpoint !== undefined) {
    localStorage.setItem('ai_custom_endpoint', customEndpoint || '');
  }
}

/* ==========================================
   AI TUTOR MODULE
   ========================================== */
KR.ai = (function () {
  'use strict';

  const MODE_PROMPTS = {
    tutor: 'Anda adalah Tutor Bahasa Korea profesional & ramah. Koreksi grammar, ejaan, atau kosakata yang salah, lalu jelaskan dengan sopan & singkat.',
    correct: 'Anda adalah guru Bahasa Korea yang fokus MENGOREKSI tulisan Korea user. Format: 1) Tampilkan versi koreksi, 2) List kesalahan (minimal 1, maksimal 5) dengan penjelasan singkat, 3) Beri tips. Jika tulisan sudah benar, puji user.',
    explain: 'Anda adalah guru Bahasa Korea yang menjelaskan grammar/kosakata dengan DETAIL. Gunakan format: 1) Arti singkat, 2) Fungsi/penggunaan, 3) Rumus/pola, 4) 3 contoh kalimat (Hangul + romanisasi + arti), 5) Catatan penting.',
    translate: 'Anda adalah penerjemah profesional Korea↔Indonesia↔English. Terjemahkan dengan akurat, berikan juga romanisasi, dan jelaskan nuansa jika perlu.',
    practice: 'Anda adalah teman Korea (banmal, santai) untuk latihan ngobrol. Topik bebas. Selalu balas dengan Korea + romanisasi + arti Indonesia. Jika user salah, koreksi singkat di akhir dengan tanda 💡.',
    quiz: 'Anda adalah pembuat kuis Bahasa Korea. Buat 1 soal pilihan ganda (A-D) atau isian. Setelah user jawab, beri feedback + skor. Lanjutkan dengan soal baru.',
    casual: 'Anda adalah Ji-eun, teman Korea yang ramah & gaul. Jawab santai dengan banmal. Selalu sertakan romanisasi + arti Indonesia.',
  };

  const LEVEL_HINT = {
    pemula: 'Level user: PEMULA. Gunakan kalimat sederhana, selalu beri romanisasi & arti Indonesia untuk setiap kata Korea. Jelaskan dengan bahasa Indonesia yang mudah.',
    menengah: 'Level user: MENENGAH. Bisa pakai kalimat sedang, terkadang tanpa romanisasi.',
    lanjut: 'Level user: LANJUT. Gunakan bahasa Korea natural, minim romanisasi, bahas grammar detail.',
  };

  let els = {};
  let _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;

    try {
      els = {
        chatBox: document.getElementById('chat-box'),
        userInput: document.getElementById('user-input'),
        actionBtn: document.getElementById('action-btn'),
        providerSelect: document.getElementById('ai-provider-select'),
        modelSelect: document.getElementById('ai-model-select'),
        keyInput: document.getElementById('ai-key-input'),
        keyHelp: document.getElementById('ai-key-help'),
        providerDesc: document.getElementById('ai-provider-desc'),
        customEndpointGroup: document.getElementById('custom-endpoint-group'),
        customEndpoint: document.getElementById('ai-custom-endpoint'),
        headerName: document.getElementById('ai-header-name'),
        status: document.getElementById('ai-status'),
        statusDot: document.getElementById('ai-status-dot'),
        avatar: document.getElementById('ai-avatar-icon'),
        setupWarning: document.getElementById('ai-setup-warning'),
      };

      console.log('[AI] Init module...');
      populateProviderSelect();
      loadCurrentConfig();
      updateHeaderByPersona();
      resetChat();
      updateStatusFromConfig();
      console.log('[AI] Init OK');
    } catch (err) {
      console.error('[AI Init Error]', err);
    }
  }

  function populateProviderSelect() {
    if (!els.providerSelect) return;
    els.providerSelect.innerHTML = Object.entries(AI_PROVIDERS).map(([id, p]) =>
      `<option value="${id}">${p.icon} ${p.name}</option>`
    ).join('');
  }

  function loadCurrentConfig() {
    const cfg = getAIConfig();
    if (els.providerSelect) els.providerSelect.value = cfg.provider;
    populateModelSelect(cfg.provider, cfg.model);
    if (els.keyInput) els.keyInput.value = cfg.apiKey;
    if (els.customEndpoint) els.customEndpoint.value = cfg.customEndpoint;
    updateProviderUI(cfg.provider);
  }

  function populateModelSelect(providerId, selectedModel) {
    const p = AI_PROVIDERS[providerId];
    if (!p || !els.modelSelect) return;
    els.modelSelect.innerHTML = p.models.map(m =>
      `<option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>`
    ).join('');
  }

  function updateProviderUI(providerId) {
    const p = AI_PROVIDERS[providerId];
    if (!p) return;
    if (els.providerDesc) els.providerDesc.textContent = p.desc || '';
    if (els.keyHelp) {
      if (p.keyUrl) {
        els.keyHelp.href = p.keyUrl;
        els.keyHelp.style.display = '';
      } else {
        els.keyHelp.style.display = 'none';
      }
    }
    if (els.customEndpointGroup) {
      els.customEndpointGroup.classList.toggle('hidden', providerId !== 'custom');
    }
  }

  function updateHeaderByPersona() {
    const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
    if (!els.headerName || !els.status || !els.avatar) return;
    if (mode === 'casual') {
      els.headerName.textContent = 'Ji-eun (Teman Korea)';
      els.avatar.setAttribute('data-lucide', 'smile-plus');
    } else {
      els.headerName.textContent = 'Tutor AI Korea';
      els.avatar.setAttribute('data-lucide', 'bot');
    }
    if (window.lucide) lucide.createIcons();
    updateStatusFromConfig();
  }

  function updateStatusFromConfig() {
    const cfg = getAIConfig();
    const statusEl = els.status || document.getElementById('ai-status');
    const dotEl = els.statusDot || document.getElementById('ai-status-dot');
    const warning = els.setupWarning || document.getElementById('ai-setup-warning');

    if (!statusEl) return;

    if (cfg.apiKey && cfg.apiKey.trim().length > 10) {
      const p = AI_PROVIDERS[cfg.provider];
      statusEl.innerHTML = `<span style="color:#10b981;font-weight:800;">● Online</span> • ${p?.name || cfg.provider}`;
      statusEl.style.color = '';
      if (dotEl) dotEl.style.background = '#10b981';
      if (warning) warning.classList.add('hidden');
    } else {
      statusEl.innerHTML = `<span style="color:#ef4444;font-weight:800;">● Offline</span> • Setup API Key`;
      statusEl.style.color = '';
      if (dotEl) dotEl.style.background = '#ef4444';
      if (warning) warning.classList.remove('hidden');
    }
  }

  async function testConnection() {
    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      KR.toast?.error('Isi API Key dulu');
      return;
    }
    if (cfg.provider === 'custom' && !cfg.customEndpoint) {
      KR.toast?.error('Isi Custom Endpoint URL dulu');
      return;
    }

    console.log('%c[AI Test] Memulai test koneksi...', 'color:#6366f1;font-weight:800;');
    console.log('[AI Test] Provider:', cfg.provider);
    console.log('[AI Test] Model:', cfg.model);
    console.log('[AI Test] Key length:', cfg.apiKey.length);
    console.log('[AI Test] Key prefix:', cfg.apiKey.slice(0, 6) + '...' + cfg.apiKey.slice(-4));
    console.log('[AI Test] Endpoint:', cfg.provider === 'custom' ? cfg.customEndpoint : AI_PROVIDERS[cfg.provider]?.endpoint);

    KR.toast?.info(`Testing ${cfg.provider}...`, 5000);
    const t0 = Date.now();

    try {
      const result = await callAIProvider({
        provider: cfg.provider,
        apiKey: cfg.apiKey.trim(),
        model: cfg.model,
        customEndpoint: cfg.customEndpoint,
        systemPrompt: 'Balas dengan satu kata: OK',
        messages: [{ role: 'user', content: 'Test' }],
      });
      const dt = Date.now() - t0;
      console.log('%c[AI Test] ✅ BERHASIL', 'color:#10b981;font-weight:800;', `(${dt}ms)`, 'Respons:', result);
      KR.toast?.success(`✅ Koneksi berhasil! (${dt}ms)`, 4000);
      updateStatusFromConfig();
    } catch (err) {
      console.error('%c[AI Test] ❌ GAGAL', 'color:#ef4444;font-weight:800;', err);
      console.error('[AI Test] Error message:', err.message);
      console.error('[AI Test] Error stack:', err.stack);
      KR.toast?.error('❌ ' + escapeHtml(err.message), 10000);
    }
  }

  function setQuickMode(mode) {
    currentQuickMode = mode;
    document.querySelectorAll('.chat-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.mode === mode);
    });
    const modeNames = {
      tutor: '🎓 Mode Tutor aktif — kirim kalimat Korea atau tanya apa saja',
      correct: '✏️ Mode Koreksi aktif — kirim tulisan Korea Anda untuk dikoreksi',
      explain: '📖 Mode Penjelasan aktif — tanya grammar/kosakata',
      translate: '🌐 Mode Terjemahan aktif — kirim teks untuk diterjemahkan',
      practice: '💬 Mode Ngobrol aktif — ayo latihan percakapan!',
      quiz: '🎯 Mode Kuis aktif — mari uji kosakata Anda!',
    };
    addSystemHint(modeNames[mode] || '');
  }

  function addSystemHint(text) {
    if (!text || !els.chatBox) return;
    const div = document.createElement('div');
    div.className = 'chat-system-hint';
    div.innerHTML = text;
    els.chatBox.appendChild(div);
    els.chatBox.scrollTo({ top: els.chatBox.scrollHeight, behavior: 'smooth' });
  }

  function buildSystemPrompt() {
    const persona = document.getElementById('chat-mode-select')?.value || 'tutor';
    const level = document.getElementById('chat-level-select')?.value || 'pemula';
    const modePrompt = MODE_PROMPTS[currentQuickMode] || MODE_PROMPTS.tutor;
    const levelHint = LEVEL_HINT[level];
    let prompt = `${modePrompt}\n${levelHint}\n\n`;
    if (persona === 'casual' && currentQuickMode === 'tutor') {
      prompt += MODE_PROMPTS.casual;
    }
    prompt += `\n\nFormat output: Gunakan formatting markdown ringan (**bold**, list dengan -). Untuk kalimat Korea, tulis dalam Hangul. Jangan pakai emoji berlebihan.`;
    return prompt;
  }

  function getTimeString() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  function formatAIResponse(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');

    // Convert bullet lines to <li>
    html = html.replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>');

    // ✅ PATCH: Gabungkan <li> berurutan (yang dipisah hanya oleh newline)
    //    menjadi satu <ul>, TANPA menelan elemen lain.
    html = html.replace(/(?:<li>.*?<\/li>\s*)+/gs, (match) => {
      return '<ul>' + match.replace(/\s+/g, ' ').trim() + '</ul>';
    });

    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function addMessage(text, sender, opts = {}) {
    const chatBox = els.chatBox;
    if (!chatBox) return;
    const div = document.createElement('div');
    const time = getTimeString();
    const bubbleClass = sender === 'user' ? 'wa-bubble wa-bubble-user' : 'wa-bubble wa-bubble-ai';
    let contentHtml = '';
    if (opts.isImage) {
      contentHtml = `<div class="chat-img-msg"><img src="${text}" alt="user image"></div>`;
    } else if (opts.isVoice) {
      const cleanText = text.replace("[VOICE NOTE]", "").trim();
      contentHtml = `<div class="chat-voice-msg"><div class="chat-voice-icon"><i data-lucide="play"></i></div><div class="chat-voice-body"><div class="chat-voice-wave"><span></span></div><div class="chat-voice-label">🎙️ ${escapeHtml(cleanText.substring(0, 40))}</div></div></div>`;
    } else if (sender === 'user') {
      contentHtml = escapeHtml(text).replace(/\n/g, '<br>');
    } else {
      contentHtml = formatAIResponse(text);
    }
    div.className = bubbleClass;
    div.innerHTML = `<div class="wa-bubble-content">${contentHtml}</div><div class="wa-time">${time}</div>`;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }

  function addTypingIndicator() {
    const chatBox = els.chatBox;
    if (!chatBox) return null;
    const div = document.createElement('div');
    div.className = 'wa-bubble wa-bubble-ai chat-typing';
    div.id = 'chatTypingIndicator';
    div.innerHTML = `<div class="chat-dots"><span></span><span></span><span></span></div>`;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    return div;
  }
  function removeTypingIndicator() {
    document.getElementById('chatTypingIndicator')?.remove();
  }

  function resetChat() {
    chatHistory = [];
    const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
    const cfg = getAIConfig();
    const hasKey = cfg.apiKey && cfg.apiKey.trim().length > 10;

    let welcomeMsg;
    if (!hasKey) {
      welcomeMsg = `👋 Selamat datang di <strong>AI Tutor Korea</strong>!<br><br>⚠️ Anda belum mengatur API Key.<br><br>Klik ikon <strong>⚙️ Pengaturan</strong> di kanan atas untuk:<br>1. Pilih AI Provider (rekomendasi: <strong>Gemini</strong> atau <strong>Groq</strong>)<br>2. Masukkan API Key<br>3. Test koneksi<br><br><em>Setelah itu Anda bisa mulai belajar!</em>`;
    } else if (mode === 'casual') {
      welcomeMsg = "안녕! 👋 Aku <strong>Ji-eun</strong>.<br>Mau cerita apa hari ini? Pakai <strong>banmal</strong> (santai) aja ya!";
    } else {
      welcomeMsg = "안녕하세요! 👋 Saya <strong>Tutor AI Korea</strong>.<br>Pilih <strong>mode</strong> di atas, atau langsung kirim:<br>- Kalimat Korea untuk dikoreksi<br>- Pertanyaan grammar/kosakata<br>- Topik untuk latihan ngobrol";
    }

    const chatBox = els.chatBox;
    if (!chatBox) return;
    chatBox.innerHTML = `
      <div class="chat-day-divider"><span>Hari Ini</span></div>
      <div class="wa-bubble wa-bubble-ai">
        <div class="wa-bubble-content">${welcomeMsg}</div>
        <div class="wa-time">${getTimeString()}</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function handleChatEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    const btn = document.getElementById('action-btn');
    if (!btn) return;
    if (el.value.trim().length > 0) {
      btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
      btn.onclick = () => sendMessage();
    } else {
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
      btn.onclick = toggleVoiceRecording;
    }
    if (window.lucide) lucide.createIcons();
  }

  async function sendMessage(manualText = null) {
    if (isTyping) return;
    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      KR.toast?.warn('Silakan isi API Key dulu di ⚙️ Pengaturan');
      toggleChatSettings();
      return;
    }
    if (cfg.provider === 'custom' && !cfg.customEndpoint) {
      KR.toast?.warn('Isi Custom Endpoint URL dulu');
      toggleChatSettings();
      return;
    }

    const input = els.userInput;
    const text = manualText || (input ? input.value.trim() : '');
    if (!text && !selectedImageBase64) return;

    isTyping = true;
    if (!manualText && input) {
      input.value = '';
      input.style.height = 'auto';
    }
    const btn = els.actionBtn;
    if (btn) {
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
      btn.onclick = toggleVoiceRecording;
    }
    if (window.lucide) lucide.createIcons();

    if (selectedImageBase64) {
      addMessage(selectedImageBase64, 'user', { isImage: true });
    } else if (text.includes('[VOICE NOTE]')) {
      addMessage(text, 'user', { isVoice: true });
    } else {
      addMessage(text, 'user');
    }

    addTypingIndicator();

    const userMsg = {
      role: 'user',
      content: selectedImageBase64
        ? { text: text || 'Lihat gambar ini dan koreksi/analisa', imageBase64: selectedImageBase64 }
        : text,
    };
    chatHistory.push(userMsg);

    try {
      const systemPrompt = buildSystemPrompt();
      const reply = await callAIProvider({
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        model: cfg.model,
        customEndpoint: cfg.customEndpoint,
        systemPrompt,
        messages: chatHistory,
      });
      removeTypingIndicator();
      chatHistory.push({ role: 'assistant', content: reply });
      addMessage(reply, 'ai');
    } catch (err) {
      console.error('[AI]', err);
      removeTypingIndicator();
      addMessage(`❌ **Error:** ${err.message || 'Koneksi gagal'}\n\n_Cek: API Key, Provider, atau koneksi internet._`, 'ai');
    } finally {
      isTyping = false;
      selectedImageBase64 = null;
      if (!manualText && input && window.innerWidth > 768) input.focus();
    }
  }

  async function callAIProvider({ provider, apiKey, model, customEndpoint, systemPrompt, messages }) {
    const cfg = AI_PROVIDERS[provider];
    if (!cfg) throw new Error('Provider tidak dikenal');
    let endpoint = provider === 'custom' ? customEndpoint : cfg.endpoint;
    if (!endpoint) throw new Error('Endpoint URL belum diatur');
    endpoint = endpoint.replace('{model}', model);

    switch (cfg.format) {
      case 'gemini': return callGemini(endpoint, apiKey, systemPrompt, messages);
      case 'anthropic': return callAnthropic(endpoint, apiKey, model, systemPrompt, messages);
      default: return callOpenAICompatible(endpoint, apiKey, model, systemPrompt, messages);
    }
  }

  async function callGemini(endpoint, apiKey, systemPrompt, messages) {
    const contents = messages.map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'object' && m.content.imageBase64) {
        const base64 = m.content.imageBase64.split(',')[1];
        return { role, parts: [{ text: m.content.text || '' }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }] };
      }
      return { role, parts: [{ text: String(m.content) }] };
    });

    let res;
    try {
      res = await fetchWithTimeout(endpoint + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });
    } catch (networkErr) {
      console.error('[Network Error - Gemini]', networkErr);
      throw new Error('Tidak bisa menghubungi Gemini. Cek: (1) koneksi internet, (2) API Key, (3) provider diblokir ISP/region.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatHTTPError(res.status, data));
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(Tidak ada respons)';
  }

  async function callOpenAICompatible(endpoint, apiKey, model, systemPrompt, messages) {
    const converted = messages.map(m => {
      if (typeof m.content === 'object' && m.content.imageBase64) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content.text || '' },
            { type: 'image_url', image_url: { url: m.content.imageBase64 } },
          ],
        };
      }
      return { role: m.role, content: String(m.content) };
    });
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
    if (endpoint.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = location.origin || 'https://localhost';
      headers['X-Title'] = 'KR-Dict Learning Hub';
    }

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...converted],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });
    } catch (networkErr) {
      console.error('[Network Error - OpenAI-compat]', networkErr);
      throw new Error('Tidak bisa menghubungi server. Cek: (1) koneksi internet, (2) API Key, (3) provider diblokir ISP/region.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatHTTPError(res.status, data));
    return data.choices?.[0]?.message?.content || '(Tidak ada respons)';
  }

  async function callAnthropic(endpoint, apiKey, model, systemPrompt, messages) {
    const converted = messages.map(m => {
      if (typeof m.content === 'object' && m.content.imageBase64) {
        const base64 = m.content.imageBase64.split(',')[1];
        return {
          role: m.role,
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: m.content.text || '' },
          ],
        };
      }
      return { role: m.role, content: [{ type: 'text', text: String(m.content) }] };
    });

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, messages: converted }),
      });
    } catch (networkErr) {
      console.error('[Network Error - Anthropic]', networkErr);
      throw new Error('Tidak bisa menghubungi Anthropic. Cek: (1) koneksi internet, (2) API Key, (3) provider diblokir ISP/region.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatHTTPError(res.status, data));
    return data.content?.[0]?.text || '(Tidak ada respons)';
  }

  function toggleVoiceRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      KR.toast?.error('Browser tidak mendukung Voice Note.');
      return;
    }
    const btn = els.actionBtn;
    if (!btn) return;
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      btn.classList.remove('chat-recording');
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
    } else {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        isRecording = true;
        btn.classList.add('chat-recording');
        btn.innerHTML = '<i data-lucide="square" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(`[VOICE NOTE] ${transcript}`);
      };
      recognition.onerror = () => {
        isRecording = false;
        btn.classList.remove('chat-recording');
        btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      };
      recognition.start();
    }
    if (window.lucide) lucide.createIcons();
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      KR.toast?.error('Gambar terlalu besar (max 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedImageBase64 = ev.target.result;
      const previewImg = document.getElementById('preview-img');
      if (previewImg) previewImg.src = selectedImageBase64;
      document.getElementById('image-preview-modal')?.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
  function cancelImage() {
    selectedImageBase64 = null;
    document.getElementById('image-preview-modal')?.classList.add('hidden');
  }
  function sendImage() {
    document.getElementById('image-preview-modal')?.classList.add('hidden');
    sendMessage("Koreksi/analisa gambar ini");
  }

  return {
    init, sendMessage, resetChat, setQuickMode, handleChatEnter,
    autoGrowTextarea, toggleVoiceRecording, handleImageSelect, cancelImage, sendImage,
    updateHeaderByPersona, getAIConfig, saveAIConfig, AI_PROVIDERS,
    populateModelSelect, updateProviderUI, addMessage,
    updateStatusFromConfig, testConnection,
  };
})();

/* ==========================================
   SETTINGS TOGGLE
   ========================================== */
function toggleChatSettings() {
  const sheet = document.getElementById('chat-settings');
  if (!sheet) {
    console.warn('[AI] #chat-settings not found');
    return;
  }
  const isOpen = sheet.classList.contains('open');
  if (isOpen) {
    sheet.classList.remove('open', 'show', 'active');
    console.log('[AI] Settings closed');
  } else {
    sheet.classList.add('open');
    console.log('[AI] Settings opened');
  }
  if (window.lucide) lucide.createIcons();
}

function onProviderChange() {
  const providerId = document.getElementById('ai-provider-select')?.value;
  if (!providerId) return;
  const cfg = AI_PROVIDERS[providerId];
  saveAIConfig({ provider: providerId, model: cfg.defaultModel });
  KR.ai.populateModelSelect(providerId, cfg.defaultModel);
  KR.ai.updateProviderUI(providerId);
  const keyInput = document.getElementById('ai-key-input');
  if (keyInput) keyInput.value = localStorage.getItem('ai_key_' + providerId) || '';
  const customInput = document.getElementById('ai-custom-endpoint');
  if (customInput) customInput.value = localStorage.getItem('ai_custom_endpoint') || '';
  KR.ai.updateStatusFromConfig();
}

function onModelChange() {
  const provider = document.getElementById('ai-provider-select')?.value;
  const model = document.getElementById('ai-model-select')?.value;
  if (provider && model) saveAIConfig({ provider, model });
}

function saveApiKeyMulti() {
  const provider = document.getElementById('ai-provider-select')?.value;
  const key = document.getElementById('ai-key-input')?.value.trim();
  const customEndpoint = document.getElementById('ai-custom-endpoint')?.value.trim();
  if (!provider) return;
  if (!key) {
    KR.toast?.error('API Key tidak boleh kosong');
    return;
  }
  saveAIConfig({ provider, apiKey: key, customEndpoint });
  KR.toast?.success('✅ API Key tersimpan untuk ' + (AI_PROVIDERS[provider]?.name || provider));
  KR.ai.updateStatusFromConfig();
  KR.ai.resetChat();
  setTimeout(() => toggleChatSettings(), 800);
}

function updateChatMode() {
  KR.ai.updateHeaderByPersona();
  KR.ai.resetChat();
}

function sendMessage(text) { return KR.ai.sendMessage(text); }
function resetChat() { return KR.ai.resetChat(); }
function setQuickMode(m) { return KR.ai.setQuickMode(m); }
function handleChatEnter(e) { return KR.ai.handleChatEnter(e); }
function autoGrowTextarea(el) { return KR.ai.autoGrowTextarea(el); }
function toggleVoiceRecording() { return KR.ai.toggleVoiceRecording(); }
function handleImageSelect(e) { return KR.ai.handleImageSelect(e); }
function cancelImage() { return KR.ai.cancelImage(); }
function sendImage() { return KR.ai.sendImage(); }

/* ---------- CALL FEATURE ---------- */
function updateCallUI(state) {
  const statusEl = document.getElementById('call-status');
  const modal = document.getElementById('call-modal');
  if (!statusEl || !modal) return;
  modal.classList.remove('call-listening', 'call-thinking', 'call-speaking');
  if (state === 'listening') {
    statusEl.innerText = "MENDENGARKAN ANDA...";
    statusEl.style.color = '#4ade80';
    modal.classList.add('call-listening');
  } else if (state === 'thinking') {
    statusEl.innerText = "AI SEDANG BERPIKIR...";
    statusEl.style.color = '#facc15';
    modal.classList.add('call-thinking');
  } else if (state === 'speaking') {
    statusEl.innerText = "AI BERBICARA...";
    statusEl.style.color = '#f472b6';
    modal.classList.add('call-speaking');
  } else {
    statusEl.innerText = "MENGHUBUNGKAN...";
    statusEl.style.color = '#818cf8';
  }
}
function toggleMute() {
  userMuted = !userMuted;
  const btn = document.getElementById('mute-btn');
  if (!btn) return;
  if (userMuted) {
    btn.style.background = '#ef4444';
    btn.innerHTML = '<i data-lucide="mic-off"></i>';
    if (callRecognition) callRecognition.stop();
  } else {
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.innerHTML = '<i data-lucide="mic"></i>';
    if (!isCallSpeaking && !isAIThinking) startListeningLoop();
  }
  if (window.lucide) lucide.createIcons();
}

async function startCall() {
  if (!('webkitSpeechRecognition' in window) || !('speechSynthesis' in window)) {
    KR.toast?.error('Browser tidak mendukung panggilan suara');
    return;
  }
  const cfg = getAIConfig();
  if (!cfg.apiKey) {
    KR.toast?.warn('Isi API Key dulu di ⚙️ Pengaturan');
    toggleChatSettings();
    return;
  }
  isCallActive = true;
  isCallSpeaking = false;
  isAIThinking = false;
  userMuted = false;
  document.getElementById('call-modal')?.classList.remove('hidden');
  updateCallUI('connecting');

  if (!callRecognition) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    callRecognition = new SR();
    callRecognition.lang = 'ko-KR';
    callRecognition.continuous = false;
    callRecognition.interimResults = false;
    callRecognition.onstart = () => {
      if (isCallActive && !isAIThinking && !isCallSpeaking) updateCallUI('listening');
    };
    callRecognition.onresult = async (event) => {
      if (userMuted) return;
      const transcript = event.results[0][0].transcript;
      if (transcript.trim().length > 0) await processCallResponse(transcript);
      else startListeningLoop();
    };
    callRecognition.onerror = (event) => {
      if (event.error !== 'no-speech') console.error("Speech Error", event.error);
    };
    callRecognition.onend = () => {
      if (isCallActive && !isAIThinking && !isCallSpeaking && !userMuted) startListeningLoop();
    };
  }
  setTimeout(() => {
    const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
    const greeting = mode === 'casual' ? "안녕! 잘 지냈어?" : "안녕하세요! 시작해볼까요?";
    speakInCall(greeting);
  }, 1000);
}
function startListeningLoop() {
  try { if (isCallActive && !userMuted) callRecognition.start(); } catch (e) {}
}
async function processCallResponse(userText) {
  isAIThinking = true;
  callRecognition.stop();
  updateCallUI('thinking');

  const cfg = getAIConfig();
  if (!cfg.apiKey) {
    isAIThinking = false;
    speakInCall("API Key belum diisi.");
    return;
  }
  const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
  const level = document.getElementById('chat-level-select')?.value || 'pemula';
  const systemPrompt = `${mode === 'casual' ? 'Jawab lisan pendek (max 2 kalimat) seperti teman Korea (banmal).' : 'Jawab lisan pendek (max 2 kalimat) sebagai tutor sopan.'} Level user: ${level}. WAJIB output dalam Bahasa Korea saja.`;

  try {
    const reply = await callAIDirect(cfg, systemPrompt, [{ role: 'user', content: userText }]);
    isAIThinking = false;
    speakInCall(reply);
  } catch (err) {
    console.error(err);
    isAIThinking = false;
    speakInCall("죄송합니다, 인터넷 오류.");
  }
}

async function callAIDirect(cfg, systemPrompt, messages) {
  const provider = AI_PROVIDERS[cfg.provider];
  if (!provider) throw new Error('Provider invalid');
  let endpoint = cfg.provider === 'custom' ? cfg.customEndpoint : provider.endpoint;
  endpoint = endpoint.replace('{model}', cfg.model);

  if (provider.format === 'gemini') {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));
    let res;
    try {
      res = await fetchWithTimeout(endpoint + '?key=' + cfg.apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      });
    } catch (e) {
      throw new Error('Network error');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatHTTPError(res.status, data));
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider.format === 'anthropic') {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 300,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: [{ type: 'text', text: String(m.content) }] })),
        }),
      });
    } catch (e) {
      throw new Error('Network error');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatHTTPError(res.status, data));
    return data.content?.[0]?.text || '';
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + cfg.apiKey,
  };
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = location.origin || 'https://localhost';
    headers['X-Title'] = 'KR-Dict Learning Hub';
  }
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 300,
      }),
    });
  } catch (e) {
    throw new Error('Network error');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(formatHTTPError(res.status, data));
  return data.choices?.[0]?.message?.content || '';
}

function speakInCall(text) {
  if (!isCallActive) return;
  isCallSpeaking = true;
  updateCallUI('speaking');
  callSpeechSynth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find(v => v.lang.startsWith('ko'));
  if (koVoice) utterance.voice = koVoice;
  utterance.onend = () => {
    isCallSpeaking = false;
    if (isCallActive) {
      updateCallUI('listening');
      startListeningLoop();
    }
  };
  callSpeechSynth.speak(utterance);
}
function endCall() {
  isCallActive = false;
  isCallSpeaking = false;
  if (callRecognition) callRecognition.stop();
  callSpeechSynth.cancel();
  document.getElementById('call-modal')?.classList.add('hidden');
}

/* ==========================================
   MAIN INIT — dengan Remote Data Loading
   ========================================== */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  if (window.lucide) lucide.createIcons();

  // Render initial dengan data.js (fallback)
  renderHangeul();
  renderGrammar(window.grammarData || []);

  const activeNav = document.querySelector('.nav-chip.active') || document.querySelector('.nav-link.active');
  showTab('vocab-container', activeNav);

  window.addEventListener('vocab:updated', filterVocabTextbook);
  window.addEventListener('grammar:updated', () => renderGrammar(window.grammarData || []));
  window.addEventListener('culture:updated', () => {
    const el = document.getElementById('culture');
    if (el && !el.classList.contains('hidden')) renderCultureList();
  });
  window.addEventListener('downloads:updated', renderDownloads);

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
  });

  // ✅ FETCH REMOTE DATA — update semua data dengan JSON dari server
  console.log('[Init] Loading remote data...');
  await loadRemoteData();
  console.log('[Init] ✅ Remote data loaded. Re-rendering UI...');

  // Re-render dengan data terbaru
  filterVocabTextbook();
  renderGrammar(window.grammarData || []);
  renderDownloads();

  console.log('[Init] ✅ App ready!');
});

/* ---------- THEME ---------- */
function initTheme() {
  if (localStorage.getItem('color-theme') === 'dark' ||
      (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-icon')?.setAttribute('data-lucide', 'sun');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('theme-icon')?.setAttribute('data-lucide', 'moon');
  }
  if (window.lucide) lucide.createIcons();
}

function toggleDarkMode() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('color-theme', 'light');
    document.getElementById('theme-icon')?.setAttribute('data-lucide', 'moon');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('color-theme', 'dark');
    document.getElementById('theme-icon')?.setAttribute('data-lucide', 'sun');
  }
  if (window.lucide) lucide.createIcons();
}

/* ---------- MENU ---------- */
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('burger-btn');
  if (!menu || !btn) return;
  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    btn.innerHTML = '<i data-lucide="menu" class="w-6 h-6"></i>';
  } else {
    menu.classList.add('open');
    btn.innerHTML = '<i data-lucide="x" class="w-6 h-6"></i>';
  }
  if (window.lucide) lucide.createIcons();
}

/* ==========================================
   NAVIGATION v9.8
   ========================================== */
function showTab(tabId, element) {
  document.body.classList.remove('chat-open');

  const chatShellEl = document.getElementById('chat-ai');
  if (chatShellEl && tabId !== 'chat-ai') {
    chatShellEl.classList.add('hidden');
  }

  const settingsEl = document.getElementById('chat-settings');
  if (settingsEl) {
    settingsEl.classList.remove('open', 'show', 'active');
    settingsEl.removeAttribute('style');
  }

  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(tabId);
  if (!target) {
    console.warn('[App] Tab not found:', tabId);
    return;
  }
  target.classList.remove('hidden');
  target.classList.remove('animate-slide-up');
  void target.offsetWidth;
  target.classList.add('animate-slide-up');

  document.querySelectorAll('.nav-chip, .nav-link, .nav-link-mobile, .nav-item, .mobile-nav-item').forEach(btn => btn.classList.remove('active'));
  if (element) {
    if (element.classList.contains('nav-chip')) element.classList.add('active');
    if (element.classList.contains('nav-link')) element.classList.add('active');
    if (element.classList.contains('nav-link-mobile')) element.classList.add('active');
    if (element.classList.contains('nav-item')) element.classList.add('active');
    if (element.classList.contains('mobile-nav-item')) element.classList.add('active');
  }

  const menu = document.getElementById('mobile-menu');
  if (menu && menu.classList.contains('open')) toggleMenu();

  if (tabId === 'chat-ai') {
    document.body.classList.add('chat-open');
  }

  if (tabId === 'vocab-container') {
    showVocabSubTab('vocab-textbook');
    filterVocabTextbook();
  } else if (tabId === 'downloads') {
    renderDownloads();
  } else if (tabId === 'culture') {
    renderCultureList();
  } else if (tabId === 'quiz-hub') {
    if (window.KR && KR.quiz) KR.quiz.init();
  } else if (tabId === 'chat-ai') {
    if (window.KR && KR.ai) KR.ai.init();
  }

  if (window.lucide) lucide.createIcons();
}

function showVocabSubTab(subTabId) {
  document.querySelectorAll('.vocab-sub-tab').forEach(el => el.classList.add('hidden'));
  const sub = document.getElementById(subTabId);
  if (!sub) return;
  sub.classList.remove('hidden');
  sub.classList.remove('animate-fade-in');
  void sub.offsetWidth;
  sub.classList.add('animate-fade-in');

  if (subTabId === 'vocab-selection') {
    const filter = document.getElementById('quiz-chapter-filter');
    if (filter) filter.value = '';
    renderQuizSelection();
  }
}

/* ---------- SPEAK ---------- */
function speak(text, lang = 'ko-KR', onEndCallback = null) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find(v => v.lang.startsWith('ko'));
  if (koVoice) utterance.voice = koVoice;
  if (onEndCallback) utterance.onend = onEndCallback;
  window.speechSynthesis.speak(utterance);
}

/* ---------- HANGEUL ---------- */
function renderHangeul() {
  const container = document.getElementById('hangeul-grid');
  if (!container) return;
  const data = window.hangeulData || [];
  const grouped = data.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});
  let html = '';
  const order = ['Konsonan Dasar', 'Konsonan Rangkap', 'Vokal Dasar', 'Vokal Rangkap'];

  order.forEach(type => {
    if (grouped[type]) {
      html += `<div class="col-span-full mt-6 mb-3">
        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200 border-b-2 border-indigo-100 dark:border-gray-700 pb-2 inline-block">${type}</h3>
      </div>`;
      grouped[type].forEach(item => {
        const details = item.awal
          ? `<div class="hangeul-sub" style="display:flex; gap:8px; justify-content:center; font-size:0.68rem; margin-top:8px;">
              <span><span style="color:var(--text-muted);">Awal:</span> <strong style="color:var(--primary);">${escapeHtml(item.awal)}</strong></span>
              <span><span style="color:var(--text-muted);">Akhir:</span> <strong style="color:var(--accent);">${escapeHtml(item.akhir)}</strong></span>
             </div>`
          : `<div class="hangeul-sub">${escapeHtml(item.rom)}</div>`;
        html += `
          <div class="hangeul-card" onclick="speak('${safeOnclickString(item.hangeul)}')">
            <div style="flex:1; display:flex; align-items:center; justify-content:center;">
              <span class="hangeul-char">${item.hangeul}</span>
            </div>
            ${details}
          </div>`;
      });
    }
  });
  container.innerHTML = html;
}

/* ---------- VOCAB ---------- */
function renderVocab(data) {
  const container = document.getElementById('vocab-textbook-list');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="search-x"></i></div>
        <div class="empty-title">Tidak ada kata ditemukan</div>
        <div class="empty-sub">Coba ubah filter atau kata kunci pencarian</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const grouped = data.reduce((acc, item) => {
    if (!acc[item.bab]) acc[item.bab] = [];
    acc[item.bab].push(item);
    return acc;
  }, {});

  const palettes = [
    { from: '#6366f1', to: '#a855f7' },
    { from: '#06b6d4', to: '#3b82f6' },
    { from: '#f43f5e', to: '#ec4899' },
    { from: '#f59e0b', to: '#f97316' },
    { from: '#10b981', to: '#14b8a6' },
    { from: '#8b5cf6', to: '#d946ef' },
  ];

  let html = '';
  let babIndex = 0;
  for (const [bab, items] of Object.entries(grouped)) {
    const p = palettes[babIndex % palettes.length];
    babIndex++;
    html += `
      <div class="bab-section">
        <div class="bab-header" style="--from:${p.from};--to:${p.to}">
          <div class="bab-header-left">
            <div class="bab-icon"><i data-lucide="bookmark"></i></div>
            <div>
              <div class="bab-label">${bab}</div>
              <div class="bab-count">${items.length} kata</div>
            </div>
          </div>
          <div class="bab-deco"></div>
        </div>
        <div class="vocab-modern-grid">
          ${items.map(item => `
            <div class="vocab-modern-card" style="--from:${p.from};--to:${p.to}">
              <div class="vocab-modern-accent"></div>
              <div class="vocab-modern-body">
                <div class="vocab-modern-hangeul">${escapeHtml(item.hangeul)}</div>
                <div class="vocab-modern-rom">${escapeHtml(item.rom || '')}</div>
                <div class="vocab-modern-arti">${escapeHtml(item.arti)}</div>
              </div>
              <button class="vocab-modern-speak" onclick="event.stopPropagation(); speak('${safeOnclickString(item.hangeul)}')" title="Dengarkan">
                <i data-lucide="volume-2"></i>
              </button>
            </div>`).join('')}
        </div>
      </div>`;
  }
  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

let vocabFilterTimer;
function filterVocabTextbook() {
  clearTimeout(vocabFilterTimer);
  vocabFilterTimer = setTimeout(() => {
    const chapter = document.getElementById('vocab-chapter-filter')?.value || '';
    const search = (document.getElementById('vocab-textbook-search')?.value || '').toLowerCase().trim();
    const data = window.vocabTextbookData || [];
    const filtered = data.filter(item => {
      const matchBab = chapter === '' || item.bab === chapter;
      if (!matchBab) return false;
      if (!search) return true;
      return (item.hangeul || '').toLowerCase().includes(search) ||
             (item.rom || '').toLowerCase().includes(search) ||
             (item.arti || '').toLowerCase().includes(search);
    });
    renderVocab(filtered);
  }, 200);
}

/* ---------- GRAMMAR ---------- */
function renderGrammar(data) {
  const container = document.getElementById('grammar-list');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="search-x"></i></div>
        <div class="empty-title">Belum ada data grammar</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }
  container.innerHTML = data.map(item => {
     const fungsiHTML = Array.isArray(item.fungsi)
        ? item.fungsi.map(f => `<li>${escapeHtml(f)}</li>`).join('')
        : `<li>${escapeHtml(item.fungsi || '')}</li>`;
     const contohHTML = (item.contoh || []).map(c => `
     <div class="example-item">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
           <div class="example-text">${escapeHtml(c.kalimat)}</div>
           <button onclick="speak('${safeOnclickString(c.kalimat)}')" style="color:var(--text-muted); background:none; border:none; cursor:pointer; padding:4px;" title="Dengarkan">
              <i data-lucide="volume-2" style="width:16px; height:16px;"></i>
          </button>
        </div>
       <div class="example-arti">${escapeHtml(c.arti)}</div>
     </div>`).join('');
    return `
      <div class="grammar-card">
        <div style="display:inline-block; padding:4px 12px; border-radius:999px; background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12)); color:#6366f1; font-size:0.68rem; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:10px;">Tata Bahasa</div>
        <div class="grammar-struktur">${escapeHtml(item.struktur)}</div>
        <div class="grammar-arti">${escapeHtml(item.arti)}</div>
        <ul class="grammar-list">${fungsiHTML}</ul>
        <div>
          <div style="font-size:0.68rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Contoh Kalimat</div>
          ${contohHTML}
        </div>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function filterGrammar() {
  const query = (document.getElementById('grammar-search')?.value || '').toLowerCase().trim();
  const data = window.grammarData || [];
  const filtered = data.filter(item =>
    (item.struktur || '').toLowerCase().includes(query) ||
    (item.arti || '').toLowerCase().includes(query)
  );
  renderGrammar(filtered);
}

/* ---------- CULTURE ---------- */
function renderCultureList() {
  const container = document.getElementById('culture');
  if (!container) return;
  const data = window.CULTURE_DATA || { babs: [] };
  let html = `
    <div class="page-header">
      <h2 class="display-2" style="font-weight: 800;">Budaya & Informasi</h2>
      <p>Pelajari Budaya dan Informasi Textbook 2024</p>
    </div>
    <div style="max-width:400px; margin:0 auto var(--sp-6);">
      <div class="glass-input-wrapper">
        <i data-lucide="search"></i>
        <input type="text" id="culture-search" oninput="filterCulture()" placeholder="Cari bab budaya..." class="glass-input">
      </div>
    </div>
    <div id="culture-grid" style="display:grid; grid-template-columns:1fr; gap:16px;">`;

  const palettes = [
    { from: '#6366f1', to: '#a855f7' }, { from: '#06b6d4', to: '#3b82f6' },
    { from: '#f43f5e', to: '#ec4899' }, { from: '#f59e0b', to: '#f97316' },
    { from: '#10b981', to: '#14b8a6' }, { from: '#8b5cf6', to: '#d946ef' },
  ];
  (data.babs || []).forEach((bab, i) => {
    const pageCount = (bab.pages || []).length;
    const p = palettes[i % palettes.length];
    html += `
      <div class="card hoverable" style="cursor:pointer; position:relative; overflow:hidden;" onclick="renderCultureDetail(${bab.id})" data-title="${escapeHtml((bab.title || '').toLowerCase())}" data-id="${bab.id}">
        <div style="position:absolute; top:-40px; right:-40px; width:140px; height:140px; border-radius:50%; background:radial-gradient(circle, ${p.from}, transparent 70%); opacity:0.12; filter:blur(20px); pointer-events:none;"></div>
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; position:relative; z-index:1;">
          <span class="chip" style="background:linear-gradient(135deg, ${p.from}, ${p.to}); color:#fff; border:none;"><i data-lucide="bookmark"></i>BAB ${bab.id}</span>
          <span class="chip neutral"><i data-lucide="file-text"></i>${pageCount} hal</span>
        </div>
        <h3 style="font-size:1.05rem; font-weight:800; color:var(--text); line-height:1.35; margin-bottom:16px; position:relative; z-index:1;">${escapeHtml(bab.title)}</h3>
        <div style="display:flex; align-items:center; gap:6px; font-weight:700; font-size:0.85rem; background:linear-gradient(135deg, ${p.from}, ${p.to}); -webkit-background-clip:text; background-clip:text; color:transparent; position:relative; z-index:1;">
          Mulai Belajar <i data-lucide="arrow-right" style="width:16px; height:16px; color:${p.from};"></i>
        </div>
      </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function filterCulture() {
  const query = (document.getElementById('culture-search')?.value || '').toLowerCase();
  document.querySelectorAll('#culture-grid > div').forEach(card => {
    const title = card.getAttribute('data-title') || '';
    const id = card.getAttribute('data-id') || '';
    if (title.includes(query) || id.includes(query)) card.classList.remove('hidden');
    else card.classList.add('hidden');
  });
}

function renderCultureDetail(babId) {
  const container = document.getElementById('culture');
  const data = window.CULTURE_DATA || { babs: [] };
  const bab = data.babs.find(b => b.id === babId);
  if (!bab) return;
  let html = `
    <div style="max-width:800px; margin:0 auto;">
      <button onclick="renderCultureList()" class="btn btn-ghost" style="margin-bottom:16px;">
        <i data-lucide="arrow-left"></i> Kembali ke Daftar
      </button>
      <div style="text-align:center; margin-bottom:32px;">
        <span class="chip primary" style="margin-bottom:8px; display:inline-flex;"><i data-lucide="bookmark"></i>BAB ${bab.id}</span>
        <h2 class="display-2">${bab.title}</h2>
      </div>`;
  (bab.pages || []).forEach((page, idx) => {
    const transId = `culture-trans-${bab.id}-${idx}`;
    const vocabId = `culture-vocab-${bab.id}-${idx}`;
    let vocabHtml = `
      <div class="vocab-header">
        <div>Bagian Kalimat</div>
        <div>Fungsi / Grammar</div>
        <div>Arti</div>
      </div>`;
    if (page.arti_per_kata && page.arti_per_kata.length > 0) {
      page.arti_per_kata.forEach(v => {
        vocabHtml += `
          <div class="vocab-grid">
            <div class="v-term">${escapeHtml(v.bagian)}</div>
            <div class="v-func">${escapeHtml(v.fungsi || '-')}</div>
            <div class="v-def">${escapeHtml(v.arti)}</div>
          </div>`;
      });
    } else {
      vocabHtml = `<p class="v-def" style="text-align:center; color:var(--text-muted); font-style:italic; padding:16px;">Tidak ada detail kosakata.</p>`;
    }
    html += `
      <div class="culture-page">
        <div class="culture-korean">${escapeHtml(page.korean)}</div>
        <div class="culture-actions">
          <button class="pill-btn" onclick="playAudio('${safeOnclickString(page.korean)}', this)">
            <i data-lucide="volume-2"></i> Dengar
          </button>
          <button class="pill-btn" onclick="toggleCultureSection('${transId}', this)">
            <i data-lucide="languages"></i> Arti
          </button>
          <button class="pill-btn" onclick="toggleCultureSection('${vocabId}', this)">
            <i data-lucide="list-tree"></i> Rincian
          </button>
        </div>
        <div id="${transId}" class="reveal-box trans">
          <p style="font-weight:500; color:var(--text); margin:0;">${escapeHtml(page.arti_full)}</p>
        </div>
        <div id="${vocabId}" class="reveal-box vocab" style="overflow-x:auto;">
          ${vocabHtml}
        </div>
      </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
  document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleCultureSection(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.style.display === 'block') {
    el.style.display = 'none';
    btn.classList.remove('active');
  } else {
    el.style.display = 'block';
    btn.classList.add('active');
  }
}

function playAudio(text, btn) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) u.voice = koVoice;
    if (btn) btn.classList.add('playing');
    u.onend = () => { if (btn) btn.classList.remove('playing'); };
    window.speechSynthesis.speak(u);
  }
}

/* ---------- DOWNLOADS ---------- */
let currentDownloadFilter = 'all';
function renderDownloads() {
  const container = document.getElementById('downloads-grid');
  if (!container) return;
  const data = window.downloadsData || [];
  const filtered = currentDownloadFilter === 'all'
    ? data
    : data.filter(d => d.category === currentDownloadFilter);
  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="download"></i></div>
        <div class="empty-title">Belum ada materi</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }
  container.innerHTML = filtered.map(item => `
    <div class="card hoverable" style="display:flex; flex-direction:column;">
      <div style="display:flex; gap:12px; margin-bottom:16px;">
        <div class="card-icon" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15)); color:#6366f1;">
          <i data-lucide="${item.icon || 'file'}"></i>
        </div>
        <div style="flex:1; min-width:0;">
          <span class="chip neutral" style="margin-bottom:6px;">${item.category}</span>
          <h4 style="font-size:1rem; font-weight:800; line-height:1.3; margin-top:4px;">{escapeHtml(item.title)}</h4>
        </div>
      </div>
      <p style="font-size:0.83rem; color:var(--text-tertiary); line-height:1.55; flex:1; margin-bottom:16px;">{escapeHtml(item.desc)}</p>
      <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="text-decoration:none;">
        Download <i data-lucide="download-cloud"></i>
      </a>
    </div>`).join('');
  if (window.lucide) lucide.createIcons();
}

function filterDownloads(category, btnElement) {
  currentDownloadFilter = category;
  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderDownloads();
}

/* ---------- QUIZ KOSAKATA (LEGACY) ---------- */
function shuffle(array) {
  const a = array.slice();
  let currentIndex = a.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [a[currentIndex], a[randomIndex]] = [a[randomIndex], a[currentIndex]];
  }
  return a;
}

function renderQuizSelection() {
  const chapter = document.getElementById('quiz-chapter-filter')?.value || '';
  const container = document.getElementById('vocab-selection-list');
  if (!container) return;
  const data = window.vocabTextbookData || [];
  const filteredData = chapter ? data.filter(item => item.bab === chapter) : data;

  if (filteredData.length === 0) {
    container.innerHTML = `<div style="padding:24px; text-align:center; font-size:0.85rem; color:var(--text-muted); font-style:italic;">Tidak ada kosakata di bab ini.</div>`;
    updateQuizSelectionSummary();
    return;
  }

  const selectedIds = selectedVocabForQuiz.map(v => v.id);
  const showData = filteredData.slice(0, 200);
  container.innerHTML = showData.map(item => `
    <label style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:12px; border:1px solid var(--border); cursor:pointer; transition:all 0.15s; margin-bottom:6px;" onmouseover="this.style.background='var(--bg-subtle)'" onmouseout="this.style.background='var(--bg-elev)'">
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:32px; height:32px; border-radius:50%; background:var(--bg-subtle); display:grid; place-items:center; font-size:0.7rem; font-weight:800; color:var(--text-tertiary);">${item.id}</div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-family:'Noto Sans KR',sans-serif; font-weight:700; font-size:1rem; line-height:1; margin-bottom:4px; color:var(--text);">${item.hangeul}</span>
          <span style="font-size:0.75rem; color:var(--text-tertiary);">${item.arti}</span>
        </div>
      </div>
      <input type="checkbox" data-id="${item.id}" onchange="toggleVocabSelection(this, ${item.id})" style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;" ${selectedIds.includes(item.id) ? 'checked' : ''}>
    </label>`).join('');

  if (filteredData.length > 200) {
    container.insertAdjacentHTML('beforeend',
      `<div style="padding:12px; text-align:center; font-size:0.78rem; color:var(--text-muted); font-style:italic;">Menampilkan 200 dari ${filteredData.length} item.</div>`);
  }
  updateQuizSelectionSummary();
}

function toggleVocabSelection(checkbox, id) {
  const data = window.vocabTextbookData || [];
  if (checkbox.checked) {
    if (!selectedVocabForQuiz.some(v => v.id === id)) {
      const item = data.find(v => v.id === id);
      if (item) selectedVocabForQuiz.push(item);
    }
  } else {
    selectedVocabForQuiz = selectedVocabForQuiz.filter(v => v.id !== id);
  }
  updateQuizSelectionSummary();
}

function bulkSelectVocab(shouldSelect) {
  const container = document.getElementById('vocab-selection-list');
  const data = window.vocabTextbookData || [];
  if (!container) return;
  const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
  const visibleIds = checkboxes.map(cb => parseInt(cb.getAttribute('data-id')));
  if (shouldSelect) {
    visibleIds.forEach(id => {
      if (!selectedVocabForQuiz.some(v => v.id === id)) {
        const item = data.find(v => v.id === id);
        if (item) selectedVocabForQuiz.push(item);
      }
    });
  } else {
    selectedVocabForQuiz = selectedVocabForQuiz.filter(v => !visibleIds.includes(v.id));
  }
  checkboxes.forEach(cb => cb.checked = shouldSelect);
  updateQuizSelectionSummary();
}

function updateQuizSelectionSummary() {
  const count = selectedVocabForQuiz.length;
  const countEl = document.getElementById('selection-count');
  if (countEl) countEl.innerText = count;
  const startBtn = document.getElementById('start-quiz-btn');
  const summaryContainer = document.getElementById('selected-vocab-summary');
  if (count > 0) {
    if (summaryContainer) {
      summaryContainer.innerHTML = selectedVocabForQuiz.slice(0, 50).map(v =>
        `<span class="chip primary" style="margin:2px;">${v.hangeul}</span>`
      ).join('') + (count > 50 ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:8px;">+${count - 50} lainnya...</div>` : '');
    }
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = `Mulai Latihan (${count})`;
    }
  } else {
    if (summaryContainer) summaryContainer.innerHTML = '<span style="font-style:italic; opacity:0.6;">Belum ada kata yang dipilih.</span>';
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerHTML = `Pilih Kata Dulu`;
    }
  }
}

function createQuestion(vocabItem) {
  const data = window.vocabTextbookData || [];
  const correctAnswer = vocabItem.arti;
  const allPossibleAnswers = data.filter(item => item.arti !== correctAnswer).map(item => item.arti);
  const wrongAnswers = shuffle(allPossibleAnswers).slice(0, 3);
  return { hangeul: vocabItem.hangeul, correctAnswer, options: shuffle([...wrongAnswers, correctAnswer]) };
}

function startQuiz() {
  if (selectedVocabForQuiz.length < 1) return;
  quizQuestions = shuffle(selectedVocabForQuiz.map(createQuestion));
  currentQuestionIndex = 0;
  currentScore = 0;
  const totalEl = document.getElementById('total-questions-count');
  if (totalEl) totalEl.innerText = quizQuestions.length;
  showVocabSubTab('quiz-mode');
  renderQuestion(currentQuestionIndex);
}

function renderQuestion(index) {
  if (index >= quizQuestions.length) { showQuizFinishModal(); return; }
  const progressBar = document.getElementById('quiz-progress-bar');
  if (progressBar) progressBar.style.width = `${(index / quizQuestions.length) * 100}%`;
  const question = quizQuestions[index];
  document.getElementById('current-question-index').innerText = index + 1;
  document.getElementById('quiz-question').innerText = question.hangeul;
  const footerContainer = document.getElementById('quiz-footer-container');
  footerContainer.classList.add('translate-y-20', 'opacity-0');
  document.getElementById('next-question-btn').disabled = true;
  const optionsContainer = document.getElementById('quiz-options');
  const safeAnswer = safeOnclickString(question.correctAnswer);
  optionsContainer.innerHTML = question.options.map((option, i) => `
    <button class="quiz-option" data-answer="${escapeHtml(option)}" onclick="checkAnswer(this, '${safeAnswer}')">
      <div>${['A', 'B', 'C', 'D'][i]}</div>
      <span style="flex:1; font-weight:600;">${option}</span>
    </button>`).join('');
  setTimeout(() => {
    document.querySelectorAll('#quiz-options .quiz-option').forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.touchAction = 'manipulation';
    });
  }, 100);
  speak(question.hangeul);
}

function checkAnswer(selectedElement, correctAnswer) {
  const selectedAnswer = selectedElement.getAttribute('data-answer');
  const isCorrect = selectedAnswer === correctAnswer;
  const allOptions = document.querySelectorAll('#quiz-options .quiz-option');
  allOptions.forEach(btn => {
    btn.classList.add('pointer-events-none');
    btn.style.opacity = '0.6';
    btn.onclick = null;
  });
  selectedElement.style.opacity = '1';
  const feedbackEl = document.getElementById('quiz-feedback');
  const footerContainer = document.getElementById('quiz-footer-container');
  const nextBtn = document.getElementById('next-question-btn');
  if (isCorrect) {
    currentScore++;
    selectedElement.classList.add('correct');
    feedbackEl.innerHTML = '<span style="color:#059669; display:flex; align-items:center; justify-content:center; gap:8px;"><i data-lucide="check-circle-2" style="width:20px; height:20px;"></i> Benar! Excellent.</span>';
  } else {
    selectedElement.classList.add('incorrect');
    feedbackEl.innerHTML = `<span style="color:#dc2626; display:flex; align-items:center; justify-content:center; gap:8px;"><i data-lucide="x-circle" style="width:20px; height:20px;"></i> Salah. Jawaban: ${escapeHtml(correctAnswer)}</span>`;
    allOptions.forEach(btn => {
      if (btn.getAttribute('data-answer') === correctAnswer) {
        btn.classList.add('correct');
        btn.style.opacity = '1';
      }
    });
  }
  nextBtn.disabled = false;
  footerContainer.classList.remove('translate-y-20', 'opacity-0');
  if (window.lucide) lucide.createIcons();
}

function nextQuestion() { renderQuestion(++currentQuestionIndex); }

function showQuizFinishModal() {
  const progressBar = document.getElementById('quiz-progress-bar');
  if (progressBar) progressBar.style.width = `100%`;
  const total = quizQuestions.length;
  const score = Math.round((currentScore / total) * 100);
  document.getElementById('final-score-number').innerText = score;
  document.getElementById('final-score-detail').innerText = `${currentScore} / ${total} Benar`;
  document.getElementById('quiz-finish-modal').classList.remove('hidden');
}
function hideQuizFinishModal() { document.getElementById('quiz-finish-modal').classList.add('hidden'); }
function restartQuiz() { hideQuizFinishModal(); startQuiz(); }

/* ==========================================
   Expose functions ke window untuk admin.js
   ========================================== */
window.filterVocabTextbook = filterVocabTextbook;
window.renderGrammar = renderGrammar;
window.renderDownloads = renderDownloads;
window.renderCultureList = renderCultureList;
window.renderHangeul = renderHangeul;
