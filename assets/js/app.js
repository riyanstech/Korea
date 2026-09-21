// ==========================================
// KR-Dict — Main App
// ==========================================

/* ---------- LOAD OVERRIDE DARI ADMIN ---------- */
(function loadOverrides() {
  const get = (k) => { try { const v = localStorage.getItem('krdict:' + k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const vocabOvr = get('vocabOverride');
  const grammarOvr = get('grammarOverride');
  const cultureOvr = get('cultureOverride');
  const downloadsOvr = get('downloadsOverride');
  if (vocabOvr) window.vocabTextbookData = vocabOvr;
  if (grammarOvr) window.grammarData = grammarOvr;
  if (cultureOvr) window.CULTURE_DATA = cultureOvr;
  if (downloadsOvr) window.downloadsData = downloadsOvr;
})();

/* ---------- TOAST SYSTEM ---------- */
window.KR = window.KR || {};
KR.toast = (function () {
  let container;
  function show(msg, type = 'info', duration = 3000) {
    if (!container) container = document.getElementById('toastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'toast-item toast-' + type;
    div.innerHTML = `<div class="flex-1">${msg}</div>`;
    container.appendChild(div);
    setTimeout(() => {
      div.style.transition = 'opacity 0.3s, transform 0.3s';
      div.style.opacity = '0';
      div.style.transform = 'translateX(30px)';
      setTimeout(() => div.remove(), 300);
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
  if (savedKey) document.getElementById('api-key-input').value = savedKey;

  showTab('vocab-container', document.querySelector('.nav-link.active'));
  resetChat();

  const input = document.getElementById('user-input');
  const actionBtn = document.getElementById('action-btn');

  input?.addEventListener('input', () => {
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
});

/* ---------- THEME ---------- */
function initTheme() {
  if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
  if (!target) return;
  target.classList.remove('hidden');
  target.classList.remove('animate-slide-up');
  void target.offsetWidth;
  target.classList.add('animate-slide-up');

  document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(btn => btn.classList.remove('active'));
  if (element) {
    if (element.classList.contains('nav-link')) element.classList.add('active');
    if (element.classList.contains('nav-link-mobile')) element.classList.add('active');
  }

  const menu = document.getElementById('mobile-menu');
  if (menu.classList.contains('open')) toggleMenu();

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
    document.getElementById('quiz-chapter-filter').value = '';
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
  const grouped = hangeulData.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});
  let html = '';
  const order = ['Konsonan Dasar', 'Konsonan Rangkap', 'Vokal Dasar', 'Vokal Rangkap'];

  order.forEach(type => {
    if (grouped[type]) {
      html += `<div class="col-span-full mt-6 mb-3"><h3 class="text-xl font-bold text-gray-800 dark:text-gray-200 border-b-2 border-indigo-100 dark:border-gray-700 pb-2 inline-block">${type}</h3></div>`;
      grouped[type].forEach(item => {
        const details = item.awal
          ? `<div class="grid grid-cols-2 gap-1 w-full text-[10px] mt-2 bg-gray-50 dark:bg-gray-800 rounded p-1.5 border border-gray-100 dark:border-gray-700">
              <div class="text-center border-r border-gray-200 dark:border-gray-700">
                <span class="block text-[9px] text-gray-400">Awal</span>
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${item.awal}</span>
              </div>
              <div class="text-center">
                <span class="block text-[9px] text-gray-400">Akhir</span>
                <span class="font-bold text-pink-600 dark:text-pink-400">${item.akhir}</span>
              </div>
             </div>`
          : `<div class="mt-2 text-xs font-bold text-gray-400 tracking-widest">${item.rom}</div>`;

        html += `
          <div class="glass-card p-4 flex flex-col items-center justify-between cursor-pointer hover-lift group h-full relative overflow-hidden" onclick="speak('${item.hangeul}')">
            <div class="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-900/20 opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div class="flex-grow flex items-center justify-center z-10">
              <span class="text-4xl font-black text-gray-800 dark:text-white font-korean group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-pink-500 transition-all">${item.hangeul}</span>
            </div>
            <div class="z-10 w-full text-center">${details}</div>
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
  if (data.length === 0) {
    container.innerHTML = `<div class="p-10 text-center text-gray-400 glass-card border-dashed border-2 border-gray-300 dark:border-gray-700">Tidak ada data ditemukan.</div>`;
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
        <h3 class="font-bold text-lg text-indigo-600 dark:text-indigo-400 mb-3 flex items-center bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg w-fit">
          <i data-lucide="bookmark" class="w-4 h-4 mr-2"></i>${bab}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${items.map(item => `
            <div class="glass-card p-5 flex justify-between items-center hover-lift group border-l-4 border-l-transparent hover:border-l-indigo-500">
              <div>
                <div class="text-2xl font-black text-gray-900 dark:text-white font-korean mb-1 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${item.hangeul}</div>
                <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">${item.rom}</div>
                <div class="text-lg font-bold text-gray-700 dark:text-gray-300">${item.arti}</div>
              </div>
              <button class="btn-circle-soft shadow-sm" onclick="speak('${item.hangeul}')">
                <i data-lucide="volume-2" class="w-5 h-5"></i>
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
    const search = (document.getElementById('vocab-textbook-search')?.value || '').toLowerCase();
    const data = window.vocabTextbookData || [];
    const filtered = data.filter(item => {
      const matchBab = chapter === '' || item.bab === chapter;
      const matchText = (item.hangeul || '').includes(search) ||
                        (item.rom || '').toLowerCase().includes(search) ||
                        (item.arti || '').toLowerCase().includes(search);
      return matchBab && matchText;
    });
    // Limit render untuk performa
    const limited = filtered.slice(0, 100);
    renderVocab(limited);
    if (filtered.length > 100) {
      const container = document.getElementById('vocab-textbook-list');
      container?.insertAdjacentHTML('beforeend',
        `<div class="text-center text-sm text-gray-400 py-4 col-span-full">Menampilkan 100 dari ${filtered.length} hasil. Persempit pencarian untuk melihat lebih spesifik.</div>`);
    }
  }, 300);
}

/* ---------- GRAMMAR ---------- */
function renderGrammar(data) {
  const container = document.getElementById('grammar-list');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = `<div class="col-span-full p-10 text-center text-gray-400 glass-card border-dashed border-2 border-gray-300 dark:border-gray-700">Belum ada data grammar.</div>`;
    return;
  }
  container.innerHTML = data.map(item => {
    let fungsiHTML = Array.isArray(item.fungsi)
      ? item.fungsi.map(f => `<li class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-1 relative pl-4"><span class="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>${f}</li>`).join('')
      : `<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">${item.fungsi || ''}</p>`;

    let contohHTML = (item.contoh || []).map(c => `
      <div class="bg-indigo-50/50 dark:bg-gray-800 rounded-xl p-3 border border-indigo-100 dark:border-gray-700">
        <div class="flex justify-between items-start">
          <p class="text-indigo-800 dark:text-indigo-300 font-bold font-korean text-lg">${c.kalimat}</p>
          <button onclick="speak('${c.kalimat.replace(/'/g, "\\'")}')" class="text-gray-400 hover:text-indigo-600 transition"><i data-lucide="volume-2" class="w-4 h-4"></i></button>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 italic mt-1 border-t border-indigo-100 dark:border-gray-700 pt-1">${c.arti}</p>
      </div>`).join('');

    return `
      <div class="glass-card p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 to-transparent dark:from-indigo-900/30 rounded-bl-full -mr-10 -mt-10 opacity-60 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10">
          <span class="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-3">Tata Bahasa</span>
          <h3 class="text-2xl font-black text-gray-800 dark:text-white font-korean mb-1">${item.struktur}</h3>
          <p class="text-base font-bold text-gray-600 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">${item.arti}</p>
          <ul class="mb-5 space-y-1">${fungsiHTML}</ul>
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-gray-400 uppercase">Contoh Kalimat</h4>
            ${contohHTML}
          </div>
        </div>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function filterGrammar() {
  const query = (document.getElementById('grammar-search')?.value || '').toLowerCase();
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
    <div class="header-section glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
      <div class="text-center md:text-left">
        <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400">Budaya & Informasi</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Pelajari Budaya dan Informasi Textbook 2024</p>
      </div>
      <div class="glass-input-wrapper relative w-full md:w-80">
        <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"></i>
        <input type="text" id="culture-search" oninput="filterCulture()" placeholder="Cari bab budaya..." class="glass-input pl-10">
      </div>
    </div>
    <div id="culture-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">`;

  (data.babs || []).forEach(bab => {
    html += `
      <div class="glass-card p-6 flex flex-col justify-between h-full group hover-lift relative overflow-hidden cursor-pointer" onclick="renderCultureDetail(${bab.id})" data-title="${(bab.title || '').toLowerCase()}" data-id="${bab.id}">
        <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
        <div class="culture-card-top">
          <span class="chapter-badge">BAB ${bab.id}</span>
          <div class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
        <h3 class="font-bold text-gray-800 dark:text-white text-lg leading-tight line-clamp-3 mb-4">${bab.title}</h3>
        <div class="mt-auto flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          Mulai Belajar <i data-lucide="arrow-right" class="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"></i>
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
    const title = card.getAttribute('data-title');
    const id = card.getAttribute('data-id');
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
    <div class="max-w-3xl mx-auto animate-slide-up">
      <button onclick="renderCultureList()" class="btn-ghost mb-6 pl-0 hover:bg-transparent hover:text-indigo-500">
        <i data-lucide="arrow-left" class="w-5 h-5 mr-2"></i> Kembali ke Daftar
      </button>
      <div class="text-center mb-10">
        <span class="chapter-badge mb-2 inline-block">BAB ${bab.id}</span>
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">${bab.title}</h2>
      </div>`;

  (bab.pages || []).forEach((page, idx) => {
    const transId = `culture-trans-${bab.id}-${idx}`;
    const vocabId = `culture-vocab-${bab.id}-${idx}`;

    let vocabHtml = `
      <div class="vocab-grid vocab-header">
        <div class="v-term">Bagian Kalimat</div>
        <div class="v-func">Fungsi / Grammar</div>
        <div class="v-def">Arti</div>
      </div>`;

    if (page.arti_per_kata && page.arti_per_kata.length > 0) {
      page.arti_per_kata.forEach(v => {
        vocabHtml += `
          <div class="vocab-grid border-t border-dashed border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div class="v-term">${v.bagian}</div>
            <div class="v-func">${v.fungsi || '-'}</div>
            <div class="v-def">${v.arti}</div>
          </div>`;
      });
    } else {
      vocabHtml = `<p class="v-def text-center text-gray-500 italic py-4">Tidak ada detail kosakata.</p>`;
    }

    html += `
      <div class="glass-card p-6 md:p-8 mb-8 relative">
        <div class="text-2xl font-medium font-korean text-gray-800 dark:text-gray-100 leading-relaxed mb-6">
          ${page.korean}
        </div>
        <div class="flex flex-wrap gap-3 mb-4">
          <button class="pill-btn" onclick="playAudio('${(page.korean || '').replace(/'/g, "\\'")}', this)">
            <i data-lucide="volume-2" class="w-4 h-4"></i> Dengar
          </button>
          <button class="pill-btn" onclick="toggleCultureSection('${transId}', this)">
            <i data-lucide="languages" class="w-4 h-4"></i> Arti
          </button>
          <button class="pill-btn" onclick="toggleCultureSection('${vocabId}', this)">
            <i data-lucide="list-tree" class="w-4 h-4"></i> Rincian
          </button>
        </div>
        <div id="${transId}" class="reveal-box trans">
          <p class="font-medium text-gray-800 dark:text-gray-200">${page.arti_full}</p>
        </div>
        <div id="${vocabId}" class="reveal-box vocab overflow-x-auto">
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
  const filtered = currentDownloadFilter === 'all' ? data : data.filter(d => d.category === currentDownloadFilter);

  container.innerHTML = filtered.map(item => {
    let colorClass = 'text-indigo-600';
    if (item.color === 'purple') colorClass = 'text-purple-600';
    if (item.color === 'green') colorClass = 'text-emerald-600';
    if (item.color === 'orange') colorClass = 'text-orange-600';

    return `
      <div class="glass-card p-6 flex flex-col justify-between h-full group hover-lift relative overflow-hidden">
        <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gray-100 to-transparent dark:from-gray-700 rounded-bl-full -mr-12 -mt-12 transition-all duration-300 group-hover:scale-150"></div>
        <div>
          <div class="flex items-center gap-4 mb-5">
            <div class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center shadow-inner ${colorClass}">
              <i data-lucide="${item.icon}" class="w-7 h-7"></i>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md mb-1 inline-block">${item.category}</span>
              <h4 class="font-bold text-gray-800 dark:text-white text-lg leading-tight line-clamp-2">${item.title}</h4>
            </div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">${item.desc}</p>
        </div>
        <a href="${item.link}" target="_blank" class="mt-auto w-full bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg">
          Download <i data-lucide="download-cloud" class="w-4 h-4"></i>
        </a>
      </div>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function filterDownloads(category, btnElement) {
  currentDownloadFilter = category;
  document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderDownloads();
}

/* ---------- QUIZ KOSAKATA (LAMA) ---------- */
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function renderQuizSelection() {
  const chapter = document.getElementById('quiz-chapter-filter')?.value || '';
  const container = document.getElementById('vocab-selection-list');
  if (!container) return;
  const data = window.vocabTextbookData || [];
  const filteredData = chapter ? data.filter(item => item.bab === chapter) : data;

  if (filteredData.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-sm text-gray-400 italic">Tidak ada kosakata di bab ini.</div>`;
    updateQuizSelectionSummary();
    return;
  }

  const selectedIds = selectedVocabForQuiz.map(v => v.id);
  const showData = filteredData.slice(0, 200); // limit

  container.innerHTML = showData.map(item => `
    <label class="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700/50 transition cursor-pointer group">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-indigo-200 group-hover:text-indigo-700 transition-colors">
          ${item.id}
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-gray-800 dark:text-gray-200 font-korean text-lg leading-none mb-1">${item.hangeul}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">${item.arti}</span>
        </div>
      </div>
      <input type="checkbox" data-id="${item.id}" onchange="toggleVocabSelection(this, ${item.id})" class="form-checkbox h-5 w-5 text-indigo-600 rounded-md border-gray-300 focus:ring-indigo-500 transition" ${selectedIds.includes(item.id) ? 'checked' : ''}>
    </label>`).join('');

  if (filteredData.length > 200) {
    container.insertAdjacentHTML('beforeend',
      `<div class="p-3 text-center text-xs text-gray-400 italic">Menampilkan 200 dari ${filteredData.length} item. Pilih bab tertentu untuk lebih spesifik.</div>`);
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
        `<span class="inline-block bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold mr-1 mb-1 px-2 py-1 rounded-md shadow-sm">${v.hangeul}</span>`
      ).join('') + (count > 50 ? `<div class="text-xs text-gray-400 mt-2">+${count - 50} lainnya...</div>` : '');
    }
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = `Mulai Latihan (${count})`;
    }
  } else {
    if (summaryContainer) summaryContainer.innerHTML = '<span class="italic opacity-50">Belum ada kata yang dipilih.</span>';
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
  document.getElementById('total-questions-count').innerText = quizQuestions.length;
  showVocabSubTab('quiz-mode');
  renderQuestion(currentQuestionIndex);
}

function renderQuestion(index) {
  if (index >= quizQuestions.length) { showQuizFinishModal(); return; }
  document.getElementById('quiz-progress-bar').style.width = `${(index / quizQuestions.length) * 100}%`;
  const question = quizQuestions[index];

  document.getElementById('current-question-index').innerText = index + 1;
  document.getElementById('quiz-question').innerText = question.hangeul;

  const footerContainer = document.getElementById('quiz-footer-container');
  footerContainer.classList.add('translate-y-20', 'opacity-0');
  document.getElementById('next-question-btn').disabled = true;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = question.options.map((option, i) => `
    <button class="quiz-option w-full bg-white/50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 text-lg font-bold text-gray-700 dark:text-gray-200 text-left shadow-sm flex items-center group hover:bg-white dark:hover:bg-gray-700" data-answer="${option}" onclick="checkAnswer(this, '${question.correctAnswer}')">
      <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center font-bold text-sm mr-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
        ${['A', 'B', 'C', 'D'][i]}
      </div>
      <span class="flex-1">${option}</span>
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
    btn.classList.add('pointer-events-none', 'opacity-60');
    btn.onclick = null;
  });
  selectedElement.classList.remove('opacity-60');

  const feedbackEl = document.getElementById('quiz-feedback');
  const footerContainer = document.getElementById('quiz-footer-container');
  const nextBtn = document.getElementById('next-question-btn');

  if (isCorrect) {
    currentScore++;
    selectedElement.classList.add('correct');
    feedbackEl.innerHTML = '<span class="text-green-600 dark:text-green-400 flex items-center justify-center gap-2"><i data-lucide="check-circle-2" class="w-6 h-6"></i> Benar! Excellent.</span>';
  } else {
    selectedElement.classList.add('incorrect');
    feedbackEl.innerHTML = `<span class="text-red-600 dark:text-red-400 flex items-center justify-center gap-2"><i data-lucide="x-circle" class="w-6 h-6"></i> Salah. Jawaban: ${correctAnswer}</span>`;
    allOptions.forEach(btn => {
      if (btn.getAttribute('data-answer') === correctAnswer) {
        btn.classList.add('correct');
        btn.classList.remove('opacity-60');
      }
    });
  }

  nextBtn.disabled = false;
  footerContainer.classList.remove('translate-y-20', 'opacity-0');
  if (window.lucide) lucide.createIcons();
}

function nextQuestion() { renderQuestion(++currentQuestionIndex); }

function showQuizFinishModal() {
  document.getElementById('quiz-progress-bar').style.width = `100%`;
  const total = quizQuestions.length;
  const score = Math.round((currentScore / total) * 100);
  document.getElementById('final-score-number').innerText = score;
  document.getElementById('final-score-detail').innerText = `${currentScore} / ${total} Benar`;
  document.getElementById('quiz-finish-modal').classList.remove('hidden');
}
function hideQuizFinishModal() { document.getElementById('quiz-finish-modal').classList.add('hidden'); }
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
  const div = document.createElement('div');
  const time = getTimeString();
  const bubbleClass = sender === 'user' ? 'wa-bubble wa-bubble-user' : 'wa-bubble wa-bubble-ai';
  const checkIcon = sender === 'user' ? '<i data-lucide="check-check" class="inline w-3 h-3 text-white/70 ml-1"></i>' : '';
  let contentHtml = '';
  if (isImage) {
    contentHtml = `<div class="mb-2 rounded-xl overflow-hidden shadow-sm"><img src="${text}" class="w-full h-auto max-h-64 object-cover"></div><div class="text-sm opacity-90">Koreksi foto ini.</div>`;
  } else if (text.includes("[VOICE NOTE]")) {
    const cleanText = text.replace("[VOICE NOTE]", "").trim();
    contentHtml = `<div class="flex items-center gap-3 min-w-[200px] py-1"><div class="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0"><i data-lucide="play" class="w-4 h-4 ml-0.5 fill-current"></i></div><div class="flex flex-col w-full"><div class="h-1 bg-black/10 dark:bg-white/10 rounded-full w-full overflow-hidden"><div class="h-full bg-current w-1/3 opacity-50"></div></div><span class="text-[10px] opacity-70 mt-1 font-mono">Audio • ${cleanText.substring(0, 15)}...</span></div></div>`;
  } else {
    contentHtml = text.replace(/\n/g, '<br>');
  }
  div.className = bubbleClass;
  div.innerHTML = `<div class="font-korean">${contentHtml}</div><div class="wa-time">${time} ${checkIcon}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
  if (window.lucide) lucide.createIcons();
}
function toggleChatSettings() {
  const settings = document.getElementById('chat-settings');
  if (settings.classList.contains('translate-y-0')) {
    settings.classList.remove('translate-y-0');
    settings.classList.add('-translate-y-full');
  } else {
    settings.classList.remove('-translate-y-full');
    settings.classList.add('translate-y-0');
  }
}
function updateChatMode() {
  const mode = document.getElementById('chat-mode-select').value;
  const headerName = document.getElementById('ai-header-name');
  const status = document.getElementById('ai-status');
  const icon = document.getElementById('ai-avatar-icon');
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
    <div class="flex justify-center my-6">
      <span class="bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-gray-100 dark:border-gray-700">Hari Ini</span>
    </div>
    <div class="wa-bubble wa-bubble-ai">
      <div class="font-korean leading-relaxed">${welcomeMsg}</div>
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
  const text = manualText || input.value.trim();
  const btn = document.getElementById('action-btn');
  if (!text && !selectedImageBase64) return;

  isTyping = true;
  if (!manualText) input.value = '';
  btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
  btn.onclick = toggleVoiceRecording;
  if (window.lucide) lucide.createIcons();

  if (selectedImageBase64) {
    addMessage(selectedImageBase64, 'user', true);
  } else {
    addMessage(text, 'user');
  }
  document.getElementById('ai-status').innerText = 'Mengetik...';

  const mode = document.getElementById('chat-mode-select').value;
  const level = document.getElementById('chat-level-select').value;
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
    document.getElementById('ai-status').innerText = mode === 'casual' ? 'Mode Santai' : 'Mode Tutor';
    if (!manualText && window.innerWidth > 768) input.focus();
  }
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    selectedImageBase64 = ev.target.result;
    document.getElementById('preview-img').src = selectedImageBase64;
    document.getElementById('image-preview-modal').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function cancelImage() {
  selectedImageBase64 = null;
  document.getElementById('image-preview-modal').classList.add('hidden');
}
function sendImage() {
  document.getElementById('image-preview-modal').classList.add('hidden');
  sendMessage("Gambar terkirim");
}

function toggleVoiceRecording() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Browser tidak mendukung Voice Note. Gunakan Chrome.");
    return;
  }
  const btn = document.getElementById('action-btn');
  if (isRecording) {
    recognition.stop();
    isRecording = false;
    btn.classList.remove('animate-pulse', 'bg-red-500');
    btn.classList.add('bg-gradient-to-r', 'from-indigo-600', 'to-pink-600');
    btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
  } else {
    recognition = new webkitSpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      isRecording = true;
      btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-pink-600');
      btn.classList.add('animate-pulse', 'bg-red-500');
      btn.innerHTML = '<i data-lucide="square" class="w-5 h-5 fill-current"></i>';
      if (window.lucide) lucide.createIcons();
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(`[VOICE NOTE] ${transcript}`);
    };
    recognition.onerror = () => {
      isRecording = false;
      btn.classList.remove('animate-pulse', 'bg-red-500');
      btn.classList.add('bg-gradient-to-r', 'from-indigo-600', 'to-pink-600');
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
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
  modal.classList.remove('call-listening', 'call-thinking', 'call-speaking');
  if (state === 'listening') {
    statusEl.innerText = "MENDENGARKAN ANDA...";
    statusEl.className = "text-green-400 font-bold tracking-widest animate-pulse";
    modal.classList.add('call-listening');
  } else if (state === 'thinking') {
    statusEl.innerText = "AI SEDANG BERPIKIR...";
    statusEl.className = "text-yellow-400 font-bold tracking-widest animate-pulse";
    modal.classList.add('call-thinking');
  } else if (state === 'speaking') {
    statusEl.innerText = "AI BERBICARA...";
    statusEl.className = "text-pink-400 font-bold tracking-widest";
    modal.classList.add('call-speaking');
  } else {
    statusEl.innerText = "MENGHUBUNGKAN...";
    statusEl.className = "text-indigo-400 font-mono text-sm tracking-widest";
  }
}
function toggleMute() {
  userMuted = !userMuted;
  const btn = document.getElementById('mute-btn');
  if (userMuted) {
    btn.classList.add('bg-red-500', 'hover:bg-red-600');
    btn.classList.remove('bg-white/10', 'hover:bg-white/20');
    btn.innerHTML = '<i data-lucide="mic-off"></i>';
    if (callRecognition) callRecognition.stop();
  } else {
    btn.classList.remove('bg-red-500', 'hover:bg-red-600');
    btn.classList.add('bg-white/10', 'hover:bg-white/20');
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
  document.getElementById('call-modal').classList.remove('hidden');
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
    const mode = document.getElementById('chat-mode-select').value;
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
  const mode = document.getElementById('chat-mode-select').value;
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
  document.getElementById('call-modal').classList.add('hidden');
}

/* ---------- EVENT LISTENERS DARI ADMIN ---------- */
window.addEventListener('vocab:updated', () => filterVocabTextbook());
window.addEventListener('grammar:updated', () => renderGrammar(window.grammarData || []));
window.addEventListener('culture:updated', () => {
  const el = document.getElementById('culture');
  if (el && !el.classList.contains('hidden') && !document.getElementById('culture-grid')) return;
  if (el && !el.classList.contains('hidden')) renderCultureList();
});
window.addEventListener('downloads:updated', () => renderDownloads());

/* ---------- OPTIMIZATION: TAB VISIBILITY ---------- */
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('tab-hidden', document.hidden);
});
