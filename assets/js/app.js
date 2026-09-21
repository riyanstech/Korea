// ==========================================
// KR-Dict — Main App
// ==========================================

/* ---------- LOAD OVERRIDE DARI ADMIN (FIXED) ---------- */
(function loadOverrides() {
  const get = (k) => {
    try {
      const v = localStorage.getItem('krdict:' + k);
      if (!v) return null;
      return JSON.parse(v);
    } catch { return null; }
  };

  // 🔧 FIX: Cek juga array tidak boleh kosong (bug: [] itu truthy!)
  const vocabOvr = get('vocabOverride');
  if (vocabOvr && Array.isArray(vocabOvr) && vocabOvr.length > 0) {
    window.vocabTextbookData = vocabOvr;
    console.log('[KR] ✅ Using vocab override:', vocabOvr.length, 'items');
  } else if (vocabOvr && Array.isArray(vocabOvr) && vocabOvr.length === 0) {
    console.warn('[KR] ⚠️ Empty vocab override detected, clearing...');
    try { localStorage.removeItem('krdict:vocabOverride'); } catch {}
  }

  const grammarOvr = get('grammarOverride');
  if (grammarOvr && Array.isArray(grammarOvr) && grammarOvr.length > 0) {
    window.grammarData = grammarOvr;
    console.log('[KR] ✅ Using grammar override:', grammarOvr.length, 'items');
  } else if (grammarOvr && Array.isArray(grammarOvr) && grammarOvr.length === 0) {
    try { localStorage.removeItem('krdict:grammarOverride'); } catch {}
  }

  const cultureOvr = get('cultureOverride');
  if (cultureOvr && cultureOvr.babs && Array.isArray(cultureOvr.babs) && cultureOvr.babs.length > 0) {
    window.CULTURE_DATA = cultureOvr;
    console.log('[KR] ✅ Using culture override:', cultureOvr.babs.length, 'babs');
  } else if (cultureOvr && cultureOvr.babs && cultureOvr.babs.length === 0) {
    try { localStorage.removeItem('krdict:cultureOverride'); } catch {}
  }

  const downloadsOvr = get('downloadsOverride');
  if (downloadsOvr && Array.isArray(downloadsOvr) && downloadsOvr.length > 0) {
    window.downloadsData = downloadsOvr;
    console.log('[KR] ✅ Using downloads override:', downloadsOvr.length, 'items');
  } else if (downloadsOvr && Array.isArray(downloadsOvr) && downloadsOvr.length === 0) {
    try { localStorage.removeItem('krdict:downloadsOverride'); } catch {}
  }

  // Log final data count untuk debug
  console.log('[KR] Final data loaded:');
  console.log('  - Vocab:', window.vocabTextbookData?.length || 0);
  console.log('  - Grammar:', window.grammarData?.length || 0);
  console.log('  - Culture Babs:', window.CULTURE_DATA?.babs?.length || 0);
  console.log('  - Downloads:', window.downloadsData?.length || 0);
})();

/* ---------- TOAST SYSTEM ---------- */
window.KR = window.KR || {};
KR.toast = (function () {
  let container;
  function show(msg, type = 'info', duration = 3000) {
    if (!container) container = document.getElementById('toastContainer');
    if (!container) {
      console.warn('[Toast]', msg);
      return;
    }
    const div = document.createElement('div');
    div.className = 'toast ' + type;
    div.innerHTML = `<div style="flex:1">${msg}</div>`;
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

// Call feature
let isCallActive = false;
let callSpeechSynth = window.speechSynthesis;
let callRecognition = null;
let isAIThinking = false;
let isCallSpeaking = false;
let userMuted = false;

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (window.lucide) lucide.createIcons();

  renderHangeul();
  renderGrammar(window.grammarData || []);

  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    const el = document.getElementById('api-key-input');
    if (el) el.value = savedKey;
  }

  // Default tab
  const activeNav = document.querySelector('.nav-link.active') || document.querySelector('.nav-item.active');
  showTab('vocab-container', activeNav);
  resetChat();

  // Dynamic chat button
  const input = document.getElementById('user-input');
  const actionBtn = document.getElementById('action-btn');
  if (input && actionBtn) {
    input.addEventListener('input', () => {
      if (input.value.trim().length > 0) {
        actionBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5 ml-1 fill-none"></i>';
        actionBtn.onclick = () => sendMessage();
        actionBtn.classList.remove('animate-pulse');
      } else {
        actionBtn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
        actionBtn.onclick = toggleVoiceRecording;
      }
      if (window.lucide) lucide.createIcons();
    });
  }

  // Event listener untuk update dari admin
  window.addEventListener('vocab:updated', () => {
    console.log('[App] Vocab updated, re-rendering...');
    filterVocabTextbook();
  });
  window.addEventListener('grammar:updated', () => {
    console.log('[App] Grammar updated, re-rendering...');
    renderGrammar(window.grammarData || []);
  });
  window.addEventListener('culture:updated', () => {
    const el = document.getElementById('culture');
    if (el && !el.classList.contains('hidden')) renderCultureList();
  });
  window.addEventListener('downloads:updated', () => {
    renderDownloads();
  });

  // Tab visibility optimization
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
  });
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

/* ---------- NAVIGATION ---------- */
function showTab(tabId, element) {
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

  document.querySelectorAll('.nav-link, .nav-link-mobile, .nav-item, .mobile-nav-item').forEach(btn => btn.classList.remove('active'));
  if (element) {
    if (element.classList.contains('nav-link')) element.classList.add('active');
    if (element.classList.contains('nav-link-mobile')) element.classList.add('active');
    if (element.classList.contains('nav-item')) element.classList.add('active');
    if (element.classList.contains('mobile-nav-item')) element.classList.add('active');
  }

  const menu = document.getElementById('mobile-menu');
  if (menu && menu.classList.contains('open')) toggleMenu();

  if (tabId === 'vocab-container') {
    showVocabSubTab('vocab-textbook');
    filterVocabTextbook();
  } else if (tabId === 'downloads') {
    renderDownloads();
  } else if (tabId === 'culture') {
    renderCultureList();
  } else if (tabId === 'quiz-hub') {
    if (window.KR && KR.quiz) KR.quiz.init();
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
              <span><span style="color:var(--text-muted);">Awal:</span> <strong style="color:var(--primary);">${item.awal}</strong></span>
              <span><span style="color:var(--text-muted);">Akhir:</span> <strong style="color:var(--accent);">${item.akhir}</strong></span>
             </div>`
          : `<div class="hangeul-sub">${item.rom}</div>`;

        html += `
          <div class="hangeul-card" onclick="speak('${item.hangeul}')">
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
      <div class="admin-empty" style="padding: 60px 20px;">
        <i data-lucide="search-x" style="width:48px; height:48px; opacity:0.4;"></i>
        <div style="font-weight:700; color:var(--text-secondary);">Tidak ada data ditemukan</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">Coba ubah filter atau kata kunci pencarian</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const grouped = data.reduce((acc, item) => {
    if (!acc[item.bab]) acc[item.bab] = [];
    acc[item.bab].push(item);
    return acc;
  }, {});

  let html = '';

  for (const [bab, items] of Object.entries(grouped)) {
    html += `
      <div class="mb-6">
        <div class="bab-heading">
          <i data-lucide="bookmark"></i>
          ${bab} <span style="opacity:0.7; font-weight:600;">· ${items.length} kata</span>
        </div>
        <div class="vocab-grid-cards">
          ${items.map(item => `
            <div class="vocab-card">
              <div class="vocab-card-body">
                <div class="vocab-hangeul">${item.hangeul}</div>
                <div class="vocab-rom">${item.rom || ''}</div>
                <div class="vocab-arti">${item.arti}</div>
              </div>
              <button class="speak-btn" onclick="speak('${item.hangeul}')" title="Dengarkan">
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

    console.log('[Vocab Filter] Total:', data.length, '| Chapter:', chapter || 'all', '| Search:', search || '-');

    const filtered = data.filter(item => {
      const matchBab = chapter === '' || item.bab === chapter;
      if (!matchBab) return false;
      if (!search) return true;
      const matchText = (item.hangeul || '').toLowerCase().includes(search) ||
                        (item.rom || '').toLowerCase().includes(search) ||
                        (item.arti || '').toLowerCase().includes(search);
      return matchText;
    });

    console.log('[Vocab Filter] Filtered:', filtered.length);
    renderVocab(filtered);
  }, 200);
}

/* ---------- GRAMMAR ---------- */
function renderGrammar(data) {
  const container = document.getElementById('grammar-list');
  if (!container) return;

  if (!data || !data.length) {
    container.innerHTML = `
      <div class="admin-empty" style="grid-column:1/-1; padding:60px 20px;">
        <i data-lucide="search-x" style="width:48px; height:48px; opacity:0.4;"></i>
        <div style="font-weight:700; color:var(--text-secondary);">Belum ada data grammar</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = data.map(item => {
    const fungsiHTML = Array.isArray(item.fungsi)
      ? item.fungsi.map(f => `<li>${f}</li>`).join('')
      : `<li>${item.fungsi || ''}</li>`;

    const contohHTML = (item.contoh || []).map(c => `
      <div class="example-item">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div class="example-text">${c.kalimat}</div>
          <button onclick="speak('${c.kalimat.replace(/'/g, "\\'")}')" style="color:var(--text-muted); background:none; border:none; cursor:pointer; padding:4px;" title="Dengarkan">
            <i data-lucide="volume-2" style="width:16px; height:16px;"></i>
          </button>
        </div>
        <div class="example-arti">${c.arti}</div>
      </div>`).join('');

    return `
      <div class="grammar-card">
        <div style="display:inline-block; padding:4px 12px; border-radius:999px; background:var(--primary-soft); color:var(--primary); font-size:0.68rem; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:10px;">Tata Bahasa</div>
        <div class="grammar-struktur">${item.struktur}</div>
        <div class="grammar-arti">${item.arti}</div>
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
    <div class="page-header" style="text-align:center;">
      <h2 class="display-2">Budaya & Informasi</h2>
      <p>Pelajari Budaya dan Informasi Textbook 2024</p>
    </div>
    <div style="max-width:400px; margin:0 auto var(--sp-6);">
      <div class="glass-input-wrapper">
        <i data-lucide="search"></i>
        <input type="text" id="culture-search" oninput="filterCulture()" placeholder="Cari bab budaya..." class="glass-input">
      </div>
    </div>
    <div id="culture-grid" style="display:grid; grid-template-columns:1fr; gap:16px;">`;

  (data.babs || []).forEach(bab => {
    const pageCount = (bab.pages || []).length;
    html += `
      <div class="card hoverable" style="cursor:pointer;" onclick="renderCultureDetail(${bab.id})" data-title="${(bab.title || '').toLowerCase()}" data-id="${bab.id}">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <span class="chip primary"><i data-lucide="bookmark"></i>BAB ${bab.id}</span>
          <span class="chip neutral"><i data-lucide="file-text"></i>${pageCount} hal</span>
        </div>
        <h3 style="font-size:1.05rem; font-weight:800; color:var(--text); line-height:1.35; margin-bottom:16px;">${bab.title}</h3>
        <div style="display:flex; align-items:center; gap:6px; color:var(--primary); font-weight:700; font-size:0.85rem;">
          Mulai Belajar <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
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
            <div class="v-term">${v.bagian}</div>
            <div class="v-func">${v.fungsi || '-'}</div>
            <div class="v-def">${v.arti}</div>
          </div>`;
      });
    } else {
      vocabHtml = `<p class="v-def" style="text-align:center; color:var(--text-muted); font-style:italic; padding:16px;">Tidak ada detail kosakata.</p>`;
    }

    html += `
      <div class="culture-page">
        <div class="culture-korean">${page.korean}</div>
        <div class="culture-actions">
          <button class="pill-btn" onclick="playAudio('${(page.korean || '').replace(/'/g, "\\'")}', this)">
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
          <p style="font-weight:500; color:var(--text); margin:0;">${page.arti_full}</p>
        </div>
        <div id="${vocabId}" class="reveal-box vocab" style="overflow-x:auto;">
          ${vocabHtml}
        </div>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  } else {
    alert('Browser tidak mendukung suara.');
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
      <div class="admin-empty" style="grid-column:1/-1; padding:60px 20px;">
        <i data-lucide="download" style="width:48px; height:48px; opacity:0.4;"></i>
        <div style="font-weight:700; color:var(--text-secondary);">Belum ada materi</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="card hoverable" style="display:flex; flex-direction:column;">
      <div style="display:flex; gap:12px; margin-bottom:16px;">
        <div class="card-icon" style="background:var(--primary-soft); color:var(--primary);">
          <i data-lucide="${item.icon || 'file'}"></i>
        </div>
        <div style="flex:1; min-width:0;">
          <span class="chip neutral" style="margin-bottom:6px;">${item.category}</span>
          <h4 style="font-size:1rem; font-weight:800; line-height:1.3; margin-top:4px;">${item.title}</h4>
        </div>
      </div>
      <p style="font-size:0.83rem; color:var(--text-tertiary); line-height:1.55; flex:1; margin-bottom:16px;">${item.desc}</p>
      <a href="${item.link}" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="text-decoration:none;">
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
      `<div style="padding:12px; text-align:center; font-size:0.78rem; color:var(--text-muted); font-style:italic;">Menampilkan 200 dari ${filteredData.length} item. Pilih bab tertentu untuk lebih spesifik.</div>`);
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
    if (summaryContainer) {
      summaryContainer.innerHTML = '<span style="font-style:italic; opacity:0.6;">Belum ada kata yang dipilih.</span>';
    }
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
  optionsContainer.innerHTML = question.options.map((option, i) => `
    <button class="quiz-option" data-answer="${option}" onclick="checkAnswer(this, '${question.correctAnswer.replace(/'/g, "\\'")}')">
      <div>${['A', 'B', 'C', 'D'][i]}</div>
      <span style="flex:1; font-weight:600;">${option}</span>
    </button>`).join('');

  setTimeout(() => {
    document.querySelectorAll('#quiz-options .quiz-option').forEach(btn => {
      btn.style.pointerEvents = 'auto';
      btn.style.touchAction = 'manipulation';
    });
    if (window.innerWidth < 768) {
      optionsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    feedbackEl.innerHTML = `<span style="color:#dc2626; display:flex; align-items:center; justify-content:center; gap:8px;"><i data-lucide="x-circle" style="width:20px; height:20px;"></i> Salah. Jawaban: ${correctAnswer}</span>`;
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
function hideQuizFinishModal() {
  document.getElementById('quiz-finish-modal').classList.add('hidden');
}
function restartQuiz() { hideQuizFinishModal(); startQuiz(); }

/* ---------- CHAT AI ---------- */
function getApiKey() { return localStorage.getItem('gemini_api_key') || ""; }
function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    alert("API Key berhasil disimpan!");
    toggleChatSettings();
  } else {
    alert("API Key tidak boleh kosong.");
  }
}
function getTimeString() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}
function addMessage(text, sender, isImage = false) {
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  const div = document.createElement('div');
  const time = getTimeString();
  const bubbleClass = sender === 'user' ? 'wa-bubble wa-bubble-user' : 'wa-bubble wa-bubble-ai';
  const checkIcon = sender === 'user' ? '<i data-lucide="check-check" style="display:inline; width:12px; height:12px; margin-left:4px; opacity:0.7;"></i>' : '';
  let contentHtml = '';
  if (isImage) {
    contentHtml = `<div style="margin-bottom:8px; border-radius:12px; overflow:hidden;"><img src="${text}" style="width:100%; height:auto; max-height:256px; object-fit:cover; display:block;"></div><div style="font-size:0.85rem; opacity:0.9;">Koreksi foto ini.</div>`;
  } else if (text.includes("[VOICE NOTE]")) {
    const cleanText = text.replace("[VOICE NOTE]", "").trim();
    contentHtml = `<div style="display:flex; align-items:center; gap:12px; min-width:200px; padding:4px 0;"><div style="width:40px; height:40px; border-radius:50%; background:rgba(0,0,0,0.1); display:grid; place-items:center; flex-shrink:0;"><i data-lucide="play" style="width:16px; height:16px; margin-left:2px;"></i></div><div style="flex:1;"><div style="height:4px; background:rgba(0,0,0,0.1); border-radius:999px; overflow:hidden;"><div style="height:100%; width:33%; background:currentColor; opacity:0.5;"></div></div><span style="font-size:0.65rem; opacity:0.7; margin-top:4px; display:block;">Audio • ${cleanText.substring(0, 15)}...</span></div></div>`;
  } else {
    contentHtml = text.replace(/\n/g, '<br>');
  }
  div.className = bubbleClass;
  div.innerHTML = `<div style="font-family:'Noto Sans KR',sans-serif;">${contentHtml}</div><div class="wa-time">${time} ${checkIcon}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
  if (window.lucide) lucide.createIcons();
}
function toggleChatSettings() {
  const settings = document.getElementById('chat-settings');
  if (!settings) return;
  settings.classList.toggle('translate-y-0');
}
function updateChatMode() {
  const mode = document.getElementById('chat-mode-select')?.value;
  const headerName = document.getElementById('ai-header-name');
  const status = document.getElementById('ai-status');
  const icon = document.getElementById('ai-avatar-icon');
  if (!headerName || !status || !icon) return;
  if (mode === 'casual') {
    headerName.innerText = "Ji-eun (Teman Korea)";
    status.innerText = "Mode Santai";
    icon.setAttribute('data-lucide', 'smile-plus');
  } else {
    headerName.innerText = "Tutor AI Korea";
    status.innerText = "Mode Tutor";
    icon.setAttribute('data-lucide', 'bot');
  }
  if (window.lucide) lucide.createIcons();
  resetChat();
}
function resetChat() {
  chatHistory = [];
  const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
  const welcomeMsg = mode === 'casual'
    ? "Annyeong! 👋 Aku Ji-eun.<br>Mau cerita apa hari ini? Pakai banmal (santai) aja ya!"
    : "Annyeonghaseyo! 👋<br>Saya Tutor AI. Silakan kirim kalimat untuk dikoreksi atau bertanya grammar.";
  const chatBox = document.getElementById('chat-box');
  if (!chatBox) return;
  chatBox.innerHTML = `
    <div style="display:flex; justify-content:center; margin:24px 0 12px;">
      <span style="background:var(--bg-subtle); color:var(--text-tertiary); font-size:0.65rem; padding:4px 12px; border-radius:999px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">Hari Ini</span>
    </div>
    <div class="wa-bubble wa-bubble-ai">
      <div style="font-family:'Noto Sans KR',sans-serif; line-height:1.6;">${welcomeMsg}</div>
      <div class="wa-time">${getTimeString()}</div>
    </div>`;
}
function handleChatEnter(e) { if (e.key === 'Enter') sendMessage(); }

async function sendMessage(manualText = null) {
  if (isTyping) return;
  const apiKey = getApiKey();
  if (!apiKey) {
    alert("Mohon masukkan API Key Gemini di menu pengaturan chat (ikon slider) agar AI bisa merespons.");
    toggleChatSettings();
    return;
  }
  const input = document.getElementById('user-input');
  const text = manualText || (input ? input.value.trim() : '');
  const btn = document.getElementById('action-btn');
  if (!text && !selectedImageBase64) return;

  isTyping = true;
  if (!manualText && input) input.value = '';
  if (btn) {
    btn.innerHTML = '<i data-lucide="mic" style="width:20px; height:20px;"></i>';
    btn.onclick = toggleVoiceRecording;
  }
  if (window.lucide) lucide.createIcons();

  if (selectedImageBase64) {
    addMessage(selectedImageBase64, 'user', true);
  } else {
    addMessage(text, 'user');
  }
  const statusEl = document.getElementById('ai-status');
  if (statusEl) statusEl.innerText = 'Mengetik...';

  const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
  const level = document.getElementById('chat-level-select')?.value || 'pemula';
  let systemPrompt = mode === 'casual'
    ? `Anda adalah 'Ji-eun', teman Korea yang ramah dan gaul. Level teman: ${level}. Jangan kaku, gunakan banmal jika diajak santai. Koreksi hanya jika diminta.`
    : `Anda adalah Tutor Bahasa Korea profesional. Level murid: ${level}. Koreksi grammar/spelling yang salah, jelaskan sopan.`;

  let parts = [];
  if (selectedImageBase64) {
    const base64Data = selectedImageBase64.split(',')[1];
    parts.push({ text: "Lihat gambar ini: " + (text || "") });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
  } else {
    parts.push({ text: text });
  }
  chatHistory.push({ role: "user", parts: parts });

  try {
    const response = await fetch(GEMINI_API_URL + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatHistory,
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, AI sedang istirahat.";
    chatHistory.push({ role: "model", parts: [{ text: reply }] });
    addMessage(reply, 'ai');
  } catch (err) {
    console.error(err);
    addMessage("Koneksi error atau API Key salah.", 'ai');
  } finally {
    isTyping = false;
    selectedImageBase64 = null;
    if (statusEl) statusEl.innerText = mode === 'casual' ? 'Mode Santai' : 'Mode Tutor';
    if (!manualText && input && window.innerWidth > 768) input.focus();
  }
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    selectedImageBase64 = ev.target.result;
    const previewImg = document.getElementById('preview-img');
    if (previewImg) previewImg.src = selectedImageBase64;
    document.getElementById('image-preview-modal')?.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function cancelImage() {
  selectedImageBase64 = null;
  document.getElementById('image-preview-modal')?.classList.add('hidden');
}
function sendImage() {
  document.getElementById('image-preview-modal')?.classList.add('hidden');
  sendMessage("Gambar terkirim");
}

function toggleVoiceRecording() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Browser tidak mendukung Voice Note. Gunakan Chrome.");
    return;
  }
  const btn = document.getElementById('action-btn');
  if (!btn) return;

  if (isRecording) {
    recognition.stop();
    isRecording = false;
    btn.classList.remove('animate-pulse');
    btn.style.background = 'linear-gradient(135deg, #4f46e5, #f43f5e)';
    btn.innerHTML = '<i data-lucide="mic" style="width:20px; height:20px;"></i>';
  } else {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      isRecording = true;
      btn.style.background = '#ef4444';
      btn.classList.add('animate-pulse');
      btn.innerHTML = '<i data-lucide="square" style="width:20px; height:20px;"></i>';
      if (window.lucide) lucide.createIcons();
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(`[VOICE NOTE] ${transcript}`);
    };
    recognition.onerror = () => {
      isRecording = false;
      btn.classList.remove('animate-pulse');
      btn.style.background = 'linear-gradient(135deg, #4f46e5, #f43f5e)';
      btn.innerHTML = '<i data-lucide="mic" style="width:20px; height:20px;"></i>';
      if (window.lucide) lucide.createIcons();
    };
    recognition.start();
  }
  if (window.lucide) lucide.createIcons();
}

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
function startCall() {
  if (!('webkitSpeechRecognition' in window) || !('speechSynthesis' in window)) {
    alert("Browser Anda tidak mendukung fitur panggilan suara penuh. Gunakan Chrome/Edge terbaru.");
    return;
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    alert("Masukkan API Key Gemini di Pengaturan Chat terlebih dahulu.");
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
    callRecognition = new webkitSpeechRecognition();
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
    const greeting = mode === 'casual' ? "Annyeong! Jal jinaesseo?" : "Annyeonghaseyo! Sijak haebolkkayo?";
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
  const apiKey = getApiKey();
  const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
  const systemPrompt = mode === 'casual'
    ? "Jawab lisan yang pendek (max 2 kalimat) seperti teman Korea (Banmal)."
    : "Jawab lisan yang pendek (max 2 kalimat) sebagai tutor (Formal/Sopan).";
  const callHistory = [{ role: "user", parts: [{ text: userText }] }];
  try {
    const response = await fetch(GEMINI_API_URL + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: callHistory,
        systemInstruction: { parts: [{ text: systemPrompt + " (Strictly Korean output)" }] }
      })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Mianhaeyo, dasi malhae juseyo?";
    isAIThinking = false;
    speakInCall(reply);
  } catch (err) {
    console.error(err);
    isAIThinking = false;
    speakInCall("Joesonghamnida, Internet error.");
  }
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
