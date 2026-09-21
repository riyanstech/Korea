/* ==========================================
   KR-Dict — Admin Dashboard v2 (FULL CRUD)
   Kelola: Quiz, Kosakata, Grammar, Budaya, Materi, GitHub, Password
   ========================================== */
window.KR = window.KR || {};

KR.admin = (function () {
  'use strict';
  const STORAGE = KR.auth.STORAGE;

  let els = {};
  let activeTab = 'overview';

  // Store state per kategori
  const state = {
    quiz: { view: 'list', pkgId: null, secId: null },
    vocab: { search: '', bab: '', page: 0, perPage: 30 },
    grammar: { search: '' },
    culture: { search: '' },
    downloads: { search: '', category: '' },
  };

  // Override keys
  const KEYS = {
    vocab: 'vocabOverride',
    grammar: 'grammarOverride',
    culture: 'cultureOverride',
    downloads: 'downloadsOverride',
  };

  /* ==========================================
     INIT
     ========================================== */
  function init() {
    els = {
      screen: document.getElementById('adminDashboard'),
      close: document.getElementById('adminCloseBtn'),
      tabs: document.querySelectorAll('[data-admin-tab]'),
      panels: document.querySelectorAll('[data-admin-panel]'),
      // Stats
      statQuiz: document.getElementById('statQuizCount'),
      statQuestion: document.getElementById('statQuestionCount'),
      statVocab: document.getElementById('statVocabCount'),
      statGh: document.getElementById('statGhStatus'),
      // GitHub
      ghOwner: document.getElementById('ghOwner'),
      ghRepo: document.getElementById('ghRepo'),
      ghBranch: document.getElementById('ghBranch'),
      ghToken: document.getElementById('ghToken'),
      ghSaveBtn: document.getElementById('ghSaveBtn'),
      ghTestBtn: document.getElementById('ghTestBtn'),
      ghClearBtn: document.getElementById('ghClearBtn'),
      ghStatus: document.getElementById('ghStatus'),
      // Password
      passOld: document.getElementById('adminPassOld'),
      passNew: document.getElementById('adminPassNew'),
      passChangeBtn: document.getElementById('adminPassChangeBtn'),
      // Quiz
      qzBreadcrumb: document.getElementById('qzBreadcrumb'),
      qzContainer: document.getElementById('qzContainer'),
      qzBackBtn: document.getElementById('qzBackBtn'),
      qzAddBtn: document.getElementById('qzAddBtn'),
      // Modal
      modal: document.getElementById('adminModal'),
      modalIcon: document.getElementById('adminModalIcon'),
      modalTitle: document.getElementById('adminModalTitle'),
      modalSubtitle: document.getElementById('adminModalSubtitle'),
      modalBody: document.getElementById('adminModalBody'),
      modalSubmit: document.getElementById('adminModalSubmit'),
      confirmModal: document.getElementById('adminConfirmModal'),
      confirmTitle: document.getElementById('adminConfirmTitle'),
      confirmSubtitle: document.getElementById('adminConfirmSubtitle'),
      confirmMessage: document.getElementById('adminConfirmMessage'),
      confirmOk: document.getElementById('adminConfirmOk'),
    };

    if (!els.screen) { console.warn('[Admin] not found'); return; }

    bindEvents();
    loadGithubConfig();
  }

  /* ==========================================
     DATA GETTERS (dengan override)
     ========================================== */
  function getVocab() {
    const override = STORAGE.get(KEYS.vocab);
    return (override && Array.isArray(override)) ? override : (window.vocabTextbookData || []).slice();
  }
  function saveVocab(data) {
    STORAGE.set(KEYS.vocab, data);
    window.vocabTextbookData = data;
    window.dispatchEvent(new Event('vocab:updated'));
    syncGitHub('assets/data/vocab.json', { items: data }, 'chore: update vocab');
  }

  function getGrammar() {
    const override = STORAGE.get(KEYS.grammar);
    return (override && Array.isArray(override)) ? override : (window.grammarData || []).slice();
  }
  function saveGrammar(data) {
    STORAGE.set(KEYS.grammar, data);
    window.grammarData = data;
    window.dispatchEvent(new Event('grammar:updated'));
    syncGitHub('assets/data/grammar.json', { items: data }, 'chore: update grammar');
  }

  function getCulture() {
    const override = STORAGE.get(KEYS.culture);
    return (override && override.babs) ? override : JSON.parse(JSON.stringify(window.CULTURE_DATA || { babs: [] }));
  }
  function saveCulture(data) {
    STORAGE.set(KEYS.culture, data);
    window.CULTURE_DATA = data;
    window.dispatchEvent(new Event('culture:updated'));
    syncGitHub('assets/data/culture.json', data, 'chore: update culture');
  }

  function getDownloads() {
    const override = STORAGE.get(KEYS.downloads);
    return (override && Array.isArray(override)) ? override : (window.downloadsData || []).slice();
  }
  function saveDownloads(data) {
    STORAGE.set(KEYS.downloads, data);
    window.downloadsData = data;
    window.dispatchEvent(new Event('downloads:updated'));
    syncGitHub('assets/data/downloads.json', { items: data }, 'chore: update downloads');
  }

  function syncGitHub(path, data, msg) {
    if (KR.github && KR.github.isConfigured()) {
      KR.github.uploadFile(path, JSON.stringify(data, null, 2), msg)
        .then(() => KR.toast?.success('✅ Sync ke GitHub'))
        .catch(e => console.warn('[GitHub]', e));
    }
  }

  function resetKey(key) {
    STORAGE.remove(KEYS[key]);
  }

  function uid(prefix) {
    return (prefix || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ==========================================
     OPEN / CLOSE
     ========================================== */
  function open() {
    if (!KR.auth.isAdmin()) { KR.toast?.error('Hanya admin'); return; }
    els.screen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchTab('overview');
    if (window.lucide) lucide.createIcons();
  }
  function close() {
    els.screen.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* ==========================================
     TABS
     ========================================== */
  function switchTab(name) {
    activeTab = name;
    els.tabs.forEach(t => t.classList.toggle('active', t.dataset.adminTab === name));
    els.panels.forEach(p => p.classList.toggle('hidden', p.dataset.adminPanel !== name));

    if (name === 'overview') renderOverview();
    if (name === 'quiz') renderQuiz();
    if (name === 'vocab') renderVocab();
    if (name === 'grammar') renderGrammar();
    if (name === 'culture') renderCulture();
    if (name === 'downloads') renderDownloads();
    if (name === 'settings') updateGhStatus();

    if (window.lucide) lucide.createIcons();
  }

  function renderOverview() {
    const quizzes = KR.quiz?.getQuizzes() || [];
    const totalQ = quizzes.reduce((s, p) => s + (p.sections || []).reduce((s2, sec) => s2 + (sec.questions?.length || 0), 0), 0);

    if (els.statQuiz) els.statQuiz.textContent = quizzes.length;
    if (els.statQuestion) els.statQuestion.textContent = totalQ;
    if (els.statVocab) els.statVocab.textContent = getVocab().length;
    updateGhStatus();
  }

  /* ==========================================
     MODAL HELPERS
     ========================================== */
  function openModal(opts) {
    const { icon = 'pencil', title = 'Edit', subtitle = '', body = '', submitText = 'Simpan', onSubmit } = opts;
    if (els.modalIcon) els.modalIcon.innerHTML = `<i data-lucide="${icon}"></i>`;
    if (els.modalTitle) els.modalTitle.textContent = title;
    if (els.modalSubtitle) els.modalSubtitle.textContent = subtitle;
    if (els.modalBody) els.modalBody.innerHTML = body;
    if (els.modalSubmit) els.modalSubmit.innerHTML = `<i data-lucide="check"></i> ${submitText}`;
    els.modal.classList.remove('hidden');

    const fresh = els.modalSubmit.cloneNode(true);
    els.modalSubmit.parentNode.replaceChild(fresh, els.modalSubmit);
    els.modalSubmit = fresh;
    els.modalSubmit.addEventListener('click', onSubmit);

    if (window.lucide) lucide.createIcons();
    setTimeout(() => els.modalBody?.querySelector('input, textarea, select')?.focus(), 100);
  }
  function closeModal() { els.modal.classList.add('hidden'); }
  function showConfirm(opts) {
    const { title = 'Konfirmasi', subtitle = '', message = '', okText = 'Ya', onOk } = opts;
    els.confirmTitle.textContent = title;
    els.confirmSubtitle.textContent = subtitle;
    els.confirmMessage.innerHTML = message;
    els.confirmOk.innerHTML = `<i data-lucide="check"></i> ${okText}`;
    els.confirmModal.classList.remove('hidden');
    const fresh = els.confirmOk.cloneNode(true);
    els.confirmOk.parentNode.replaceChild(fresh, els.confirmOk);
    els.confirmOk = fresh;
    els.confirmOk.addEventListener('click', () => { els.confirmModal.classList.add('hidden'); onOk?.(); });
    if (window.lucide) lucide.createIcons();
  }
  function closeConfirm() { els.confirmModal.classList.add('hidden'); }

  /* ═══════════════════════════════════════════
     QUIZ (sudah ada sebelumnya)
     ═══════════════════════════════════════════ */
  function renderQuiz() {
    renderBreadcrumb();
    if (state.quiz.view === 'list') renderPkgList();
    else if (state.quiz.view === 'pkg') renderSecList();
    else if (state.quiz.view === 'sec') renderQuestionList();
  }
  function renderBreadcrumb() {
    if (!els.qzBreadcrumb) return;
    const quizzes = KR.quiz.getQuizzes();
    let html = `<button class="apk-crumb" data-nav="list">Paket</button>`;
    if (state.quiz.pkgId) {
      const pkg = quizzes.find(p => p.id === state.quiz.pkgId);
      if (pkg) html += ` <span class="apk-crumb-sep">/</span> <button class="apk-crumb ${state.quiz.view === 'pkg' ? 'current' : ''}" data-nav="pkg">${pkg.name}</button>`;
    }
    if (state.quiz.secId && state.quiz.pkgId) {
      const pkg = quizzes.find(p => p.id === state.quiz.pkgId);
      const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
      if (sec) html += ` <span class="apk-crumb-sep">/</span> <span class="apk-crumb current">${sec.name}</span>`;
    }
    els.qzBreadcrumb.innerHTML = html;
    els.qzBreadcrumb.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.nav === 'list') state.quiz = { view: 'list', pkgId: null, secId: null };
        if (btn.dataset.nav === 'pkg') state.quiz.view = 'pkg';
        renderQuiz();
      });
    });
    if (els.qzBackBtn) els.qzBackBtn.classList.toggle('hidden', state.quiz.view === 'list');
  }

  function renderPkgList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Tambah Paket';
    const quizzes = KR.quiz.getQuizzes();
    if (!quizzes.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="package-open" class="w-12 h-12"></i><div>Belum ada paket</div></div>`;
    } else {
      els.qzContainer.innerHTML = quizzes.map(pkg => {
        const totalQ = (pkg.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
        return `
          <div class="admin-row" data-id="${pkg.id}">
            <div class="admin-row-icon"><i data-lucide="book-open-check"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">${pkg.name}</div>
              <div class="admin-row-sub">${pkg.description || ''}</div>
              <div class="admin-row-chips">
                <span class="admin-chip"><i data-lucide="clock"></i> ${pkg.duration || 30}m</span>
                <span class="admin-chip"><i data-lucide="list"></i> ${totalQ} soal</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon primary" data-act="open"><i data-lucide="folder-open"></i></button>
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="open"]').addEventListener('click', () => { state.quiz = { view: 'pkg', pkgId: id, secId: null }; renderQuiz(); });
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editPackage(id));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deletePackage(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderSecList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Tambah Section';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    if (!pkg) { state.quiz.view = 'list'; return renderQuiz(); }
    if (!pkg.sections?.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="layers" class="w-12 h-12"></i><div>Belum ada section</div></div>`;
    } else {
      els.qzContainer.innerHTML = pkg.sections.map(sec => {
        const isL = sec.type === 'listening';
        return `
          <div class="admin-row" data-id="${sec.id}">
            <div class="admin-row-icon ${isL ? 'admin-icon-pink' : ''}"><i data-lucide="${isL ? 'headphones' : 'book-open'}"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">${sec.name}</div>
              <div class="admin-row-chips">
                <span class="admin-chip">${isL ? '🎧 Listening' : '📖 Reading'}</span>
                <span class="admin-chip">${(sec.questions || []).length} soal</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon primary" data-act="open"><i data-lucide="folder-open"></i></button>
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="open"]').addEventListener('click', () => { state.quiz.view = 'sec'; state.quiz.secId = id; renderQuiz(); });
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editSection(id));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteSection(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderQuestionList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Tambah Soal';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    if (!sec) { state.quiz.view = 'pkg'; return renderQuiz(); }
    const isL = sec.type === 'listening';
    if (!sec.questions?.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="file-question" class="w-12 h-12"></i><div>Belum ada soal</div></div>`;
    } else {
      els.qzContainer.innerHTML = sec.questions.map((q, i) => `
        <div class="admin-row" data-id="${i}">
          <div class="admin-row-icon"><span class="font-bold text-sm">${i + 1}</span></div>
          <div class="admin-row-body">
            <div class="admin-row-title">${q.text || q.audioText || '(tanpa teks)'}</div>
            <div class="admin-row-chips">
              <span class="admin-chip">${(q.options || []).length} opsi</span>
              ${q.correct ? `<span class="admin-chip admin-chip-correct">✓ ${q.correct}</span>` : ''}
              ${isL ? `<span class="admin-chip">🎧 ${q.audioTarget || 'question'}</span>` : ''}
            </div>
          </div>
          <div class="admin-row-actions">
            <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
            <button class="admin-btn-icon warn" data-act="dup"><i data-lucide="copy"></i></button>
            <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.id);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editQuestion(i));
      row.querySelector('[data-act="dup"]').addEventListener('click', () => dupQuestion(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteQuestion(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  /* Quiz CRUD */
  function addPackage() {
    openModal({
      icon: 'plus', title: 'Tambah Paket', subtitle: 'Buat paket latihan baru',
      body: `
        <label class="admin-label">Nama Paket *</label>
        <input id="pkgName" class="admin-input-field" placeholder="EPS-TOPIK Set 1">
        <label class="admin-label">Deskripsi</label>
        <textarea id="pkgDesc" class="admin-input-field" rows="2"></textarea>
        <label class="admin-label">Durasi (menit)</label>
        <input id="pkgDur" type="number" class="admin-input-field" value="30">
      `,
      submitText: 'Tambah',
      onSubmit: () => {
        const name = document.getElementById('pkgName').value.trim();
        if (!name) return KR.toast?.error('Nama wajib');
        const list = KR.quiz.getQuizzes();
        list.push({ id: uid('pkg'), name, description: document.getElementById('pkgDesc').value.trim(), duration: parseInt(document.getElementById('pkgDur').value) || 30, sections: [] });
        KR.quiz.setQuizzes(list);
        closeModal(); renderQuiz();
        KR.toast?.success('Paket ditambahkan');
      },
    });
  }
  function editPackage(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === id);
    if (!pkg) return;
    openModal({
      icon: 'pencil', title: 'Edit Paket', subtitle: pkg.name,
      body: `
        <label class="admin-label">Nama</label>
        <input id="pkgName" class="admin-input-field" value="${pkg.name}">
        <label class="admin-label">Deskripsi</label>
        <textarea id="pkgDesc" class="admin-input-field" rows="2">${pkg.description || ''}</textarea>
        <label class="admin-label">Durasi (menit)</label>
        <input id="pkgDur" type="number" class="admin-input-field" value="${pkg.duration || 30}">
      `,
      onSubmit: () => {
        pkg.name = document.getElementById('pkgName').value.trim() || pkg.name;
        pkg.description = document.getElementById('pkgDesc').value.trim();
        pkg.duration = parseInt(document.getElementById('pkgDur').value) || 30;
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
      },
    });
  }
  function deletePackage(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === id);
    showConfirm({
      title: 'Hapus Paket?', subtitle: pkg?.name,
      message: `Paket <strong>${pkg?.name}</strong> + semua soalnya akan dihapus.`,
      onOk: () => { KR.quiz.setQuizzes(KR.quiz.getQuizzes().filter(p => p.id !== id)); renderQuiz(); },
    });
  }
  function addSection() {
    openModal({
      icon: 'plus', title: 'Tambah Section',
      body: `
        <label class="admin-label">Nama *</label>
        <input id="secName" class="admin-input-field">
        <label class="admin-label">Tipe</label>
        <select id="secType" class="admin-input-field"><option value="reading">📖 Reading</option><option value="listening">🎧 Listening</option></select>
        <label class="admin-label">Durasi (menit)</label>
        <input id="secDur" type="number" class="admin-input-field" value="10">
      `,
      onSubmit: () => {
        const name = document.getElementById('secName').value.trim();
        if (!name) return KR.toast?.error('Nama wajib');
        const list = KR.quiz.getQuizzes();
        const pkg = list.find(p => p.id === state.quiz.pkgId);
        pkg.sections = pkg.sections || [];
        pkg.sections.push({ id: uid('sec'), name, type: document.getElementById('secType').value, duration: parseInt(document.getElementById('secDur').value) || 10, questions: [] });
        KR.quiz.setQuizzes(list);
        closeModal(); renderQuiz();
      },
    });
  }
  function editSection(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === id);
    if (!sec) return;
    openModal({
      icon: 'pencil', title: 'Edit Section', subtitle: sec.name,
      body: `
        <label class="admin-label">Nama</label>
        <input id="secName" class="admin-input-field" value="${sec.name}">
        <label class="admin-label">Tipe</label>
        <select id="secType" class="admin-input-field">
          <option value="reading" ${sec.type === 'reading' ? 'selected' : ''}>📖 Reading</option>
          <option value="listening" ${sec.type === 'listening' ? 'selected' : ''}>🎧 Listening</option>
        </select>
        <label class="admin-label">Durasi (menit)</label>
        <input id="secDur" type="number" class="admin-input-field" value="${sec.duration || 10}">
      `,
      onSubmit: () => {
        sec.name = document.getElementById('secName').value.trim() || sec.name;
        sec.type = document.getElementById('secType').value;
        sec.duration = parseInt(document.getElementById('secDur').value) || 10;
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
      },
    });
  }
  function deleteSection(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === id);
    showConfirm({
      title: 'Hapus Section?', subtitle: sec?.name,
      message: `Section <strong>${sec?.name}</strong> + ${sec?.questions?.length || 0} soal akan dihapus.`,
      onOk: () => { pkg.sections = pkg.sections.filter(s => s.id !== id); KR.quiz.setQuizzes(KR.quiz.getQuizzes()); renderQuiz(); },
    });
  }

  function questionFormHtml(q = {}, isListening = false) {
    const type = q.type || (isListening ? 'listening' : 'reading');
    const audioTarget = q.audioTarget || 'question';
    return `
      <label class="admin-label">Tipe Soal</label>
      <div class="admin-type-tabs">
        <button type="button" class="admin-type-btn ${type === 'reading' ? 'active' : ''}" data-qtype="reading"><i data-lucide="book-open"></i> Reading</button>
        <button type="button" class="admin-type-btn ${type === 'listening' ? 'active' : ''}" data-qtype="listening"><i data-lucide="headphones"></i> Listening</button>
      </div>
      <input type="hidden" id="qType" value="${type}">
      <label class="admin-label">Teks Pertanyaan</label>
      <textarea id="qText" class="admin-input-field" rows="2">${q.text || ''}</textarea>
      <div id="qAudioWrap" class="${type === 'listening' ? '' : 'hidden'}">
        <label class="admin-label"><i data-lucide="volume-2"></i> Teks Audio (TTS)</label>
        <textarea id="qAudioText" class="admin-input-field" rows="2">${q.audioText || ''}</textarea>
        <label class="admin-label">Audio Muncul Di</label>
        <select id="qAudioTarget" class="admin-input-field">
          <option value="question" ${audioTarget === 'question' ? 'selected' : ''}>Pertanyaan</option>
          <option value="options" ${audioTarget === 'options' ? 'selected' : ''}>Pilihan Jawaban</option>
          <option value="both" ${audioTarget === 'both' ? 'selected' : ''}>Keduanya</option>
        </select>
      </div>
      <label class="admin-label">Pilihan Jawaban</label>
      <div id="qOptionsList"></div>
      <button type="button" class="admin-add-opt-btn" id="qAddOpt"><i data-lucide="plus"></i> Tambah Opsi</button>
      <label class="admin-label">Jawaban Benar</label>
      <select id="qCorrect" class="admin-input-field"></select>
    `;
  }
  function bindQuestionForm(q) {
    let options = q.options ? JSON.parse(JSON.stringify(q.options)) : [
      { id: 'A', text: '', audioText: '' }, { id: 'B', text: '', audioText: '' },
      { id: 'C', text: '', audioText: '' }, { id: 'D', text: '', audioText: '' },
    ];
    function renderOpts() {
      const list = document.getElementById('qOptionsList');
      const showAudio = document.getElementById('qType')?.value === 'listening' &&
        ['options', 'both'].includes(document.getElementById('qAudioTarget')?.value);
      list.innerHTML = options.map((o, i) => `
        <div class="admin-opt-item">
          <div class="admin-opt-head">
            <span class="admin-opt-letter">${String.fromCharCode(65 + i)}</span>
            <button type="button" class="admin-opt-del" data-i="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="admin-input-field admin-opt-text" data-i="${i}" value="${o.text || ''}" placeholder="Teks pilihan">
          ${showAudio ? `<input type="text" class="admin-input-field admin-opt-text" data-audio="${i}" value="${o.audioText || ''}" placeholder="🎧 Teks audio (opsional)">` : ''}
        </div>
      `).join('');
      const sel = document.getElementById('qCorrect');
      if (sel) {
        const cur = q.correct || 'A';
        sel.innerHTML = options.map((o, i) => {
          const L = String.fromCharCode(65 + i);
          return `<option value="${L}" ${cur === L ? 'selected' : ''}>${L}. ${(o.text || '').slice(0, 40) || '(kosong)'}</option>`;
        }).join('');
      }
      list.querySelectorAll('.admin-opt-text').forEach(inp => {
        inp.addEventListener('input', e => {
          const i = Number(e.target.dataset.i);
          if (e.target.dataset.audio != null) options[i].audioText = e.target.value;
          else options[i].text = e.target.value;
        });
      });
      list.querySelectorAll('.admin-opt-del').forEach(btn => {
        btn.addEventListener('click', () => {
          if (options.length <= 2) return KR.toast?.warn('Min 2 opsi');
          options.splice(Number(btn.dataset.i), 1);
          options.forEach((o, i) => o.id = String.fromCharCode(65 + i));
          renderOpts();
        });
      });
      if (window.lucide) lucide.createIcons();
    }
    renderOpts();
    document.getElementById('qAddOpt')?.addEventListener('click', () => {
      if (options.length >= 6) return;
      options.push({ id: String.fromCharCode(65 + options.length), text: '', audioText: '' });
      renderOpts();
    });
    document.querySelectorAll('.admin-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.qtype;
        document.getElementById('qType').value = t;
        document.querySelectorAll('.admin-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('qAudioWrap').classList.toggle('hidden', t !== 'listening');
        renderOpts();
      });
    });
    document.getElementById('qAudioTarget')?.addEventListener('change', renderOpts);
    return () => ({
      type: document.getElementById('qType').value,
      text: document.getElementById('qText').value.trim(),
      audioText: document.getElementById('qAudioText')?.value.trim() || '',
      audioTarget: document.getElementById('qAudioTarget')?.value || 'question',
      options,
      correct: document.getElementById('qCorrect')?.value || 'A',
    });
  }
  function addQuestion() {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    if (!sec) return;
    let collect;
    openModal({
      icon: 'plus', title: 'Tambah Soal', subtitle: sec.name,
      body: questionFormHtml({ type: sec.type === 'listening' ? 'listening' : 'reading' }),
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText) return KR.toast?.error('Isi pertanyaan');
        sec.questions = sec.questions || [];
        sec.questions.push({ id: uid('q'), ...v });
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
      },
    });
    setTimeout(() => { collect = bindQuestionForm({ type: sec.type === 'listening' ? 'listening' : 'reading' }); }, 60);
  }
  function editQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    const q = sec?.questions?.[i];
    if (!q) return;
    let collect;
    openModal({
      icon: 'pencil', title: 'Edit Soal', subtitle: sec.name,
      body: questionFormHtml(q),
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText) return KR.toast?.error('Isi pertanyaan');
        Object.assign(q, v);
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
      },
    });
    setTimeout(() => { collect = bindQuestionForm(q); }, 60);
  }
  function dupQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    const q = sec?.questions?.[i];
    if (!q) return;
    const dup = JSON.parse(JSON.stringify(q));
    dup.id = uid('q');
    sec.questions.push(dup);
    KR.quiz.setQuizzes(KR.quiz.getQuizzes());
    renderQuiz();
  }
  function deleteQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    showConfirm({ title: 'Hapus Soal?', message: 'Soal akan dihapus.', onOk: () => { sec.questions.splice(i, 1); KR.quiz.setQuizzes(KR.quiz.getQuizzes()); renderQuiz(); } });
  }

  /* ═══════════════════════════════════════════
     KOSAKATA CRUD (NEW)
     ═══════════════════════════════════════════ */
  function renderVocab() {
    const container = document.getElementById('vocabAdminContainer');
    const toolbar = document.getElementById('vocabAdminToolbar');
    if (!container || !toolbar) return;

    const vocab = getVocab();
    const total = vocab.length;
    const filtered = vocab.filter(v => {
      if (state.vocab.bab && v.bab !== state.vocab.bab) return false;
      if (state.vocab.search) {
        const q = state.vocab.search.toLowerCase();
        return (v.hangeul || '').includes(q) || (v.rom || '').toLowerCase().includes(q) || (v.arti || '').toLowerCase().includes(q);
      }
      return true;
    });

    // Ambil daftar bab unik
    const babs = [...new Set(vocab.map(v => v.bab))].sort();

    // Toolbar
    toolbar.innerHTML = `
      <div class="admin-toolbar-search">
        <i data-lucide="search"></i>
        <input type="text" id="admVocabSearch" placeholder="Cari kosakata..." value="${state.vocab.search}">
      </div>
      <select id="admVocabBab" class="admin-select">
        <option value="">Semua Bab (${total})</option>
        ${babs.map(b => `<option value="${b}" ${state.vocab.bab === b ? 'selected' : ''}>${b}</option>`).join('')}
      </select>
      <button id="admVocabAdd" class="admin-btn primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admVocabReset" class="admin-btn secondary" title="Reset ke data awal"><i data-lucide="rotate-ccw"></i></button>
    `;

    // List (dengan pagination)
    const start = state.vocab.page * state.vocab.perPage;
    const paged = filtered.slice(start, start + state.vocab.perPage);
    if (!paged.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="search-x" class="w-12 h-12"></i><div>Tidak ada hasil</div></div>`;
    } else {
      container.innerHTML = paged.map((v, idx) => {
        const realIdx = vocab.indexOf(v);
        return `
          <div class="admin-row" data-idx="${realIdx}">
            <div class="admin-row-icon"><i data-lucide="book"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title" style="font-family: 'Noto Sans KR', sans-serif; font-size:15px;">${v.hangeul}</div>
              <div class="admin-row-sub">${v.rom} — ${v.arti}</div>
              <div class="admin-row-chips">
                <span class="admin-chip"><i data-lucide="bookmark"></i> ${v.bab}</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('') + renderPagination(filtered.length, state.vocab.page, state.vocab.perPage);
    }

    // Bind events
    document.getElementById('admVocabSearch')?.addEventListener('input', debounce(e => {
      state.vocab.search = e.target.value;
      state.vocab.page = 0;
      renderVocab();
    }, 250));

    document.getElementById('admVocabBab')?.addEventListener('change', e => {
      state.vocab.bab = e.target.value;
      state.vocab.page = 0;
      renderVocab();
    });

    document.getElementById('admVocabAdd')?.addEventListener('click', addVocab);
    document.getElementById('admVocabReset')?.addEventListener('click', () => resetCategory('vocab'));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editVocab(i));
      row.querySelector('[data-act="dup"]').addEventListener('click', () => dupVocab(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteVocab(i));
    });

    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.vocab.page = Number(btn.dataset.page);
        renderVocab();
        document.querySelector('#adminDashboard .admin-body')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderPagination(total, page, perPage) {
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) return '';
    let html = '<div class="admin-pagination">';
    html += `<button class="admin-page-btn" data-page="${Math.max(0, page - 1)}" ${page === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>`;
    const start = Math.max(0, page - 2);
    const end = Math.min(pages, start + 5);
    for (let i = start; i < end; i++) {
      html += `<button class="admin-page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
    }
    html += `<button class="admin-page-btn" data-page="${Math.min(pages - 1, page + 1)}" ${page >= pages - 1 ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;
    html += `<span class="admin-page-info">${total} item · ${pages} hal</span>`;
    html += '</div>';
    return html;
  }

  function vocabFormHtml(v = {}) {
    const vocab = getVocab();
    const babs = [...new Set(vocab.map(x => x.bab))].sort();
    const currentBab = v.bab || (babs[0] || 'BAB 1');
    return `
      <label class="admin-label">Hangeul *</label>
      <input id="vHangeul" class="admin-input-field" value="${v.hangeul || ''}" placeholder="안녕하세요" style="font-family: 'Noto Sans KR', sans-serif;">
      <label class="admin-label">Romanisasi *</label>
      <input id="vRom" class="admin-input-field" value="${v.rom || ''}" placeholder="annyeonghaseyo">
      <label class="admin-label">Arti *</label>
      <input id="vArti" class="admin-input-field" value="${v.arti || ''}" placeholder="Halo / Selamat">
      <label class="admin-label">Bab</label>
      <select id="vBab" class="admin-input-field">
        ${babs.map(b => `<option value="${b}" ${currentBab === b ? 'selected' : ''}>${b}</option>`).join('')}
        <option value="__new__">+ Tambah bab baru</option>
      </select>
      <input id="vBabNew" class="admin-input-field hidden" placeholder="BAB 31 (nama bab baru)" style="margin-top:6px;">
    `;
  }

  function bindVocabForm() {
    document.getElementById('vBab')?.addEventListener('change', e => {
      const newInput = document.getElementById('vBabNew');
      newInput?.classList.toggle('hidden', e.target.value !== '__new__');
    });
  }

  function addVocab() {
    openModal({
      icon: 'plus', title: 'Tambah Kosakata',
      body: vocabFormHtml(),
      submitText: 'Tambah',
      onSubmit: () => {
        const hangeul = document.getElementById('vHangeul').value.trim();
        const rom = document.getElementById('vRom').value.trim();
        const arti = document.getElementById('vArti').value.trim();
        let bab = document.getElementById('vBab').value;
        if (bab === '__new__') bab = document.getElementById('vBabNew').value.trim();
        if (!hangeul || !arti) return KR.toast?.error('Hangeul & arti wajib');
        const vocab = getVocab();
        const newId = Math.max(0, ...vocab.map(v => v.id || 0)) + 1;
        vocab.push({ id: newId, bab: bab || 'BAB 1', hangeul, rom: rom || '-', arti });
        saveVocab(vocab);
        closeModal(); renderVocab();
        KR.toast?.success('Kosakata ditambahkan');
      },
    });
    setTimeout(bindVocabForm, 60);
  }

  function editVocab(idx) {
    const vocab = getVocab();
    const v = vocab[idx];
    if (!v) return;
    openModal({
      icon: 'pencil', title: 'Edit Kosakata', subtitle: v.hangeul,
      body: vocabFormHtml(v),
      onSubmit: () => {
        const hangeul = document.getElementById('vHangeul').value.trim();
        const rom = document.getElementById('vRom').value.trim();
        const arti = document.getElementById('vArti').value.trim();
        let bab = document.getElementById('vBab').value;
        if (bab === '__new__') bab = document.getElementById('vBabNew').value.trim();
        if (!hangeul || !arti) return KR.toast?.error('Wajib diisi');
        v.hangeul = hangeul; v.rom = rom || '-'; v.arti = arti; v.bab = bab || v.bab;
        saveVocab(vocab);
        closeModal(); renderVocab();
        KR.toast?.success('Kosakata diperbarui');
      },
    });
    setTimeout(bindVocabForm, 60);
  }

  function dupVocab(idx) {
    const vocab = getVocab();
    const v = vocab[idx];
    if (!v) return;
    const copy = { ...v, id: Math.max(0, ...vocab.map(x => x.id || 0)) + 1, hangeul: v.hangeul + ' (copy)' };
    vocab.splice(idx + 1, 0, copy);
    saveVocab(vocab);
    renderVocab();
    KR.toast?.success('Duplikat dibuat');
  }

  function deleteVocab(idx) {
    const vocab = getVocab();
    const v = vocab[idx];
    if (!v) return;
    showConfirm({
      title: 'Hapus Kosakata?', subtitle: v.hangeul + ' — ' + v.arti,
      message: 'Kosakata ini akan dihapus permanen.',
      onOk: () => {
        vocab.splice(idx, 1);
        saveVocab(vocab);
        renderVocab();
      },
    });
  }

  /* ═══════════════════════════════════════════
     GRAMMAR CRUD (NEW)
     ═══════════════════════════════════════════ */
  function renderGrammar() {
    const container = document.getElementById('grammarAdminContainer');
    const toolbar = document.getElementById('grammarAdminToolbar');
    if (!container || !toolbar) return;

    const list = getGrammar();
    const filtered = list.filter(g => {
      if (state.grammar.search) {
        const q = state.grammar.search.toLowerCase();
        return (g.struktur || '').toLowerCase().includes(q) || (g.arti || '').toLowerCase().includes(q);
      }
      return true;
    });

    toolbar.innerHTML = `
      <div class="admin-toolbar-search">
        <i data-lucide="search"></i>
        <input type="text" id="admGramSearch" placeholder="Cari grammar..." value="${state.grammar.search}">
      </div>
      <button id="admGramAdd" class="admin-btn primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admGramReset" class="admin-btn secondary" title="Reset ke data awal"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="search-x" class="w-12 h-12"></i><div>Tidak ada hasil</div></div>`;
    } else {
      container.innerHTML = filtered.map(g => {
        const idx = list.indexOf(g);
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="sparkles"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title" style="font-family: 'Noto Sans KR', sans-serif;">${g.struktur}</div>
              <div class="admin-row-sub">${g.arti}</div>
              <div class="admin-row-chips">
                <span class="admin-chip"><i data-lucide="list"></i> ${(g.contoh || []).length} contoh</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admGramSearch')?.addEventListener('input', debounce(e => {
      state.grammar.search = e.target.value;
      renderGrammar();
    }, 250));
    document.getElementById('admGramAdd')?.addEventListener('click', addGrammar);
    document.getElementById('admGramReset')?.addEventListener('click', () => resetCategory('grammar'));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editGrammar(i));
      row.querySelector('[data-act="dup"]').addEventListener('click', () => dupGrammar(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteGrammar(i));
    });

    if (window.lucide) lucide.createIcons();
  }

  function grammarFormHtml(g = {}) {
    const fungsiStr = Array.isArray(g.fungsi) ? g.fungsi.join('\n') : (g.fungsi || '');
    const contoh = g.contoh || [{ kalimat: '', arti: '' }];
    return `
      <label class="admin-label">Struktur / Pola *</label>
      <input id="gStruktur" class="admin-input-field" value="${g.struktur || ''}" placeholder="~입니다 / ~입니까?" style="font-family: 'Noto Sans KR', sans-serif;">
      <label class="admin-label">Arti Singkat *</label>
      <input id="gArti" class="admin-input-field" value="${g.arti || ''}" placeholder="Adalah / Apakah">
      <label class="admin-label">Fungsi (satu per baris)</label>
      <textarea id="gFungsi" class="admin-input-field" rows="3" placeholder="Baris 1&#10;Baris 2">${fungsiStr}</textarea>
      <label class="admin-label">Contoh Kalimat</label>
      <div id="gContohList"></div>
      <button type="button" class="admin-add-opt-btn" id="gAddContoh"><i data-lucide="plus"></i> Tambah Contoh</button>
    `;
  }

  function bindGrammarForm(initial) {
    let contohs = (initial && initial.length) ? initial : [{ kalimat: '', arti: '' }];
    const renderContoh = () => {
      const list = document.getElementById('gContohList');
      list.innerHTML = contohs.map((c, i) => `
        <div class="admin-opt-item">
          <div class="admin-opt-head">
            <span class="admin-opt-letter">${i + 1}</span>
            <button type="button" class="admin-opt-del" data-i="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="admin-input-field" data-c-k="${i}" value="${c.kalimat || ''}" placeholder="Kalimat Korea" style="margin-bottom:6px;">
          <input type="text" class="admin-input-field" data-c-a="${i}" value="${c.arti || ''}" placeholder="Terjemahan Indonesia">
        </div>
      `).join('');
      list.querySelectorAll('[data-c-k]').forEach(inp => {
        inp.addEventListener('input', e => { contohs[Number(e.target.dataset.cK)].kalimat = e.target.value; });
      });
      list.querySelectorAll('[data-c-a]').forEach(inp => {
        inp.addEventListener('input', e => { contohs[Number(e.target.dataset.cA)].arti = e.target.value; });
      });
      list.querySelectorAll('.admin-opt-del').forEach(btn => {
        btn.addEventListener('click', () => {
          if (contohs.length <= 1) return KR.toast?.warn('Min 1 contoh');
          contohs.splice(Number(btn.dataset.i), 1);
          renderContoh();
        });
      });
      if (window.lucide) lucide.createIcons();
    };
    renderContoh();
    document.getElementById('gAddContoh')?.addEventListener('click', () => {
      contohs.push({ kalimat: '', arti: '' });
      renderContoh();
    });
    return () => ({
      struktur: document.getElementById('gStruktur').value.trim(),
      arti: document.getElementById('gArti').value.trim(),
      fungsi: document.getElementById('gFungsi').value.split('\n').map(s => s.trim()).filter(Boolean),
      contoh: contohs.filter(c => c.kalimat),
    });
  }

  function addGrammar() {
    let collect;
    openModal({
      icon: 'plus', title: 'Tambah Grammar',
      body: grammarFormHtml(),
      submitText: 'Tambah',
      onSubmit: () => {
        const v = collect();
        if (!v.struktur || !v.arti) return KR.toast?.error('Struktur & arti wajib');
        const list = getGrammar();
        list.push(v);
        saveGrammar(list);
        closeModal(); renderGrammar();
        KR.toast?.success('Grammar ditambahkan');
      },
    });
    setTimeout(() => { collect = bindGrammarForm(); }, 60);
  }

  function editGrammar(idx) {
    const list = getGrammar();
    const g = list[idx];
    if (!g) return;
    let collect;
    openModal({
      icon: 'pencil', title: 'Edit Grammar', subtitle: g.struktur,
      body: grammarFormHtml(g),
      onSubmit: () => {
        const v = collect();
        if (!v.struktur || !v.arti) return KR.toast?.error('Wajib diisi');
        Object.assign(g, v);
        saveGrammar(list);
        closeModal(); renderGrammar();
        KR.toast?.success('Grammar diperbarui');
      },
    });
    setTimeout(() => { collect = bindGrammarForm(g.contoh); }, 60);
  }

  function dupGrammar(idx) {
    const list = getGrammar();
    const g = list[idx];
    if (!g) return;
    const copy = JSON.parse(JSON.stringify(g));
    copy.struktur = g.struktur + ' (copy)';
    list.splice(idx + 1, 0, copy);
    saveGrammar(list);
    renderGrammar();
    KR.toast?.success('Duplikat dibuat');
  }

  function deleteGrammar(idx) {
    const list = getGrammar();
    const g = list[idx];
    if (!g) return;
    showConfirm({
      title: 'Hapus Grammar?', subtitle: g.struktur,
      message: 'Grammar ini akan dihapus permanen.',
      onOk: () => { list.splice(idx, 1); saveGrammar(list); renderGrammar(); },
    });
  }

  /* ═══════════════════════════════════════════
     CULTURE CRUD (NEW)
     ═══════════════════════════════════════════ */
  function renderCulture() {
    const container = document.getElementById('cultureAdminContainer');
    const toolbar = document.getElementById('cultureAdminToolbar');
    if (!container || !toolbar) return;

    const data = getCulture();
    const list = data.babs || [];
    const filtered = list.filter(b => {
      if (state.culture.search) {
        const q = state.culture.search.toLowerCase();
        return (b.title || '').toLowerCase().includes(q) || ('bab ' + b.id).toLowerCase().includes(q);
      }
      return true;
    });

    toolbar.innerHTML = `
      <div class="admin-toolbar-search">
        <i data-lucide="search"></i>
        <input type="text" id="admCulSearch" placeholder="Cari bab budaya..." value="${state.culture.search}">
      </div>
      <button id="admCulAdd" class="admin-btn primary"><i data-lucide="plus"></i> Tambah Bab</button>
      <button id="admCulReset" class="admin-btn secondary"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="globe" class="w-12 h-12"></i><div>Tidak ada bab</div></div>`;
    } else {
      container.innerHTML = filtered.map(b => {
        const idx = list.indexOf(b);
        const pageCount = (b.pages || []).length;
        const pageItems = (b.pages || []).reduce((s, p) => s + (p.arti_per_kata?.length || 0), 0);
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="globe"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">BAB ${b.id} — ${b.title}</div>
              <div class="admin-row-chips">
                <span class="admin-chip"><i data-lucide="file-text"></i> ${pageCount} halaman</span>
                <span class="admin-chip"><i data-lucide="list"></i> ${pageItems} kosakata</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon primary" data-act="open"><i data-lucide="folder-open"></i></button>
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admCulSearch')?.addEventListener('input', debounce(e => {
      state.culture.search = e.target.value;
      renderCulture();
    }, 250));
    document.getElementById('admCulAdd')?.addEventListener('click', addCultureBab);
    document.getElementById('admCulReset')?.addEventListener('click', () => resetCategory('culture'));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="open"]').addEventListener('click', () => editCulturePages(i));
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editCultureBab(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteCultureBab(i));
    });

    if (window.lucide) lucide.createIcons();
  }

  function cultureBabFormHtml(b = {}) {
    const data = getCulture();
    const maxId = Math.max(0, ...(data.babs || []).map(x => x.id || 0));
    return `
      <label class="admin-label">Nomor Bab *</label>
      <input id="cId" type="number" class="admin-input-field" value="${b.id || (maxId + 1)}" min="1">
      <label class="admin-label">Judul *</label>
      <input id="cTitle" class="admin-input-field" value="${b.title || ''}" placeholder="한국의 인사 예절 (Etika Salam di Korea)">
    `;
  }

  function addCultureBab() {
    openModal({
      icon: 'plus', title: 'Tambah Bab Budaya',
      body: cultureBabFormHtml(),
      submitText: 'Tambah',
      onSubmit: () => {
        const id = parseInt(document.getElementById('cId').value) || 1;
        const title = document.getElementById('cTitle').value.trim();
        if (!title) return KR.toast?.error('Judul wajib');
        const data = getCulture();
        data.babs = data.babs || [];
        data.babs.push({ id, title, pages: [] });
        data.babs.sort((a, b) => a.id - b.id);
        saveCulture(data);
        closeModal(); renderCulture();
        KR.toast?.success('Bab ditambahkan');
      },
    });
  }

  function editCultureBab(idx) {
    const data = getCulture();
    const b = data.babs[idx];
    if (!b) return;
    openModal({
      icon: 'pencil', title: 'Edit Bab Budaya', subtitle: b.title,
      body: cultureBabFormHtml(b),
      onSubmit: () => {
        const id = parseInt(document.getElementById('cId').value) || b.id;
        const title = document.getElementById('cTitle').value.trim();
        if (!title) return KR.toast?.error('Judul wajib');
        b.id = id; b.title = title;
        data.babs.sort((a, b) => a.id - b.id);
        saveCulture(data);
        closeModal(); renderCulture();
      },
    });
  }

  function deleteCultureBab(idx) {
    const data = getCulture();
    const b = data.babs[idx];
    if (!b) return;
    showConfirm({
      title: 'Hapus Bab?', subtitle: 'BAB ' + b.id + ' — ' + b.title,
      message: `Bab ini + ${(b.pages || []).length} halaman akan dihapus.`,
      onOk: () => { data.babs.splice(idx, 1); saveCulture(data); renderCulture(); },
    });
  }

  function editCulturePages(babIdx) {
    const data = getCulture();
    const b = data.babs[babIdx];
    if (!b) return;
    renderCulturePagesView(b, babIdx);
  }

  function renderCulturePagesView(bab, babIdx) {
    const container = document.getElementById('cultureAdminContainer');
    const toolbar = document.getElementById('cultureAdminToolbar');
    const pages = bab.pages || [];

    toolbar.innerHTML = `
      <button id="admCulBack" class="admin-btn secondary"><i data-lucide="arrow-left"></i> Kembali</button>
      <div class="apk-breadcrumb flex-1">
        <span class="apk-crumb current">BAB ${bab.id} — ${bab.title}</span>
      </div>
      <button id="admCulPageAdd" class="admin-btn primary"><i data-lucide="plus"></i> Tambah Halaman</button>
    `;

    if (!pages.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="file-text" class="w-12 h-12"></i><div>Belum ada halaman</div></div>`;
    } else {
      container.innerHTML = pages.map((p, i) => `
        <div class="admin-row" data-idx="${i}">
          <div class="admin-row-icon"><span class="font-bold text-sm">${i + 1}</span></div>
          <div class="admin-row-body">
            <div class="admin-row-title" style="font-family: 'Noto Sans KR', sans-serif;">${p.korean?.slice(0, 80) || '(kosong)'}${(p.korean || '').length > 80 ? '...' : ''}</div>
            <div class="admin-row-sub">${p.arti_full?.slice(0, 100) || ''}</div>
            <div class="admin-row-chips">
              <span class="admin-chip"><i data-lucide="list"></i> ${(p.arti_per_kata || []).length} kosakata</span>
            </div>
          </div>
          <div class="admin-row-actions">
            <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
            <button class="admin-btn-icon warn" data-act="dup"><i data-lucide="copy"></i></button>
            <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('admCulBack')?.addEventListener('click', renderCulture);
    document.getElementById('admCulPageAdd')?.addEventListener('click', () => addCulturePage(babIdx));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editCulturePage(babIdx, i));
      row.querySelector('[data-act="dup"]').addEventListener('click', () => dupCulturePage(babIdx, i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteCulturePage(babIdx, i));
    });

    if (window.lucide) lucide.createIcons();
  }

  function culturePageFormHtml(p = {}) {
    return `
      <label class="admin-label">Teks Korea *</label>
      <textarea id="cpKorean" class="admin-input-field" rows="3" style="font-family: 'Noto Sans KR', sans-serif;">${p.korean || ''}</textarea>
      <label class="admin-label">Terjemahan Lengkap *</label>
      <textarea id="cpArtiFull" class="admin-input-field" rows="3">${p.arti_full || ''}</textarea>
      <label class="admin-label">Rincian Per Kata</label>
      <div id="cpDetailsList"></div>
      <button type="button" class="admin-add-opt-btn" id="cpAddDetail"><i data-lucide="plus"></i> Tambah Rincian</button>
    `;
  }

  function bindCulturePageForm(initialDetails) {
    let details = (initialDetails && initialDetails.length) ? initialDetails : [{ bagian: '', fungsi: '', arti: '' }];
    const render = () => {
      const list = document.getElementById('cpDetailsList');
      list.innerHTML = details.map((d, i) => `
        <div class="admin-opt-item">
          <div class="admin-opt-head">
            <span class="admin-opt-letter">${i + 1}</span>
            <button type="button" class="admin-opt-del" data-i="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="admin-input-field" data-d-b="${i}" value="${d.bagian || ''}" placeholder="Bagian kalimat" style="margin-bottom:6px; font-family: 'Noto Sans KR', sans-serif;">
          <input type="text" class="admin-input-field" data-d-f="${i}" value="${d.fungsi || ''}" placeholder="Fungsi / grammar" style="margin-bottom:6px;">
          <input type="text" class="admin-input-field" data-d-a="${i}" value="${d.arti || ''}" placeholder="Arti">
        </div>
      `).join('');
      list.querySelectorAll('[data-d-b]').forEach(inp => inp.addEventListener('input', e => details[Number(e.target.dataset.dB)].bagian = e.target.value));
      list.querySelectorAll('[data-d-f]').forEach(inp => inp.addEventListener('input', e => details[Number(e.target.dataset.dF)].fungsi = e.target.value));
      list.querySelectorAll('[data-d-a]').forEach(inp => inp.addEventListener('input', e => details[Number(e.target.dataset.dA)].arti = e.target.value));
      list.querySelectorAll('.admin-opt-del').forEach(btn => {
        btn.addEventListener('click', () => {
          if (details.length <= 1) return KR.toast?.warn('Min 1 rincian');
          details.splice(Number(btn.dataset.i), 1);
          render();
        });
      });
      if (window.lucide) lucide.createIcons();
    };
    render();
    document.getElementById('cpAddDetail')?.addEventListener('click', () => {
      details.push({ bagian: '', fungsi: '', arti: '' });
      render();
    });
    return () => ({
      korean: document.getElementById('cpKorean').value.trim(),
      arti_full: document.getElementById('cpArtiFull').value.trim(),
      arti_per_kata: details.filter(d => d.bagian || d.arti),
    });
  }

  function addCulturePage(babIdx) {
    let collect;
    openModal({
      icon: 'plus', title: 'Tambah Halaman', subtitle: 'Bab ' + getCulture().babs[babIdx].id,
      body: culturePageFormHtml(),
      onSubmit: () => {
        const v = collect();
        if (!v.korean || !v.arti_full) return KR.toast?.error('Teks & terjemahan wajib');
        const data = getCulture();
        data.babs[babIdx].pages = data.babs[babIdx].pages || [];
        data.babs[babIdx].pages.push({ id: (data.babs[babIdx].pages.length + 1), ...v });
        saveCulture(data);
        closeModal();
        renderCulturePagesView(data.babs[babIdx], babIdx);
        KR.toast?.success('Halaman ditambahkan');
      },
    });
    setTimeout(() => { collect = bindCulturePageForm(); }, 60);
  }

  function editCulturePage(babIdx, pageIdx) {
    const data = getCulture();
    const p = data.babs[babIdx].pages[pageIdx];
    if (!p) return;
    let collect;
    openModal({
      icon: 'pencil', title: 'Edit Halaman', subtitle: 'Bab ' + data.babs[babIdx].id,
      body: culturePageFormHtml(p),
      onSubmit: () => {
        const v = collect();
        if (!v.korean || !v.arti_full) return KR.toast?.error('Wajib diisi');
        Object.assign(p, v);
        saveCulture(data);
        closeModal();
        renderCulturePagesView(data.babs[babIdx], babIdx);
      },
    });
    setTimeout(() => { collect = bindCulturePageForm(p.arti_per_kata); }, 60);
  }

  function dupCulturePage(babIdx, pageIdx) {
    const data = getCulture();
    const p = data.babs[babIdx].pages[pageIdx];
    if (!p) return;
    const copy = JSON.parse(JSON.stringify(p));
    data.babs[babIdx].pages.splice(pageIdx + 1, 0, copy);
    saveCulture(data);
    renderCulturePagesView(data.babs[babIdx], babIdx);
  }

  function deleteCulturePage(babIdx, pageIdx) {
    const data = getCulture();
    const p = data.babs[babIdx].pages[pageIdx];
    showConfirm({
      title: 'Hapus Halaman?', subtitle: p?.korean?.slice(0, 40),
      message: 'Halaman ini akan dihapus.',
      onOk: () => {
        data.babs[babIdx].pages.splice(pageIdx, 1);
        saveCulture(data);
        renderCulturePagesView(data.babs[babIdx], babIdx);
      },
    });
  }

  /* ═══════════════════════════════════════════
     DOWNLOADS CRUD (NEW)
     ═══════════════════════════════════════════ */
  function renderDownloads() {
    const container = document.getElementById('downloadsAdminContainer');
    const toolbar = document.getElementById('downloadsAdminToolbar');
    if (!container || !toolbar) return;

    const list = getDownloads();
    const categories = ['textbook', 'grammar', 'vocab', 'exam'];
    const filtered = list.filter(d => {
      if (state.downloads.category && d.category !== state.downloads.category) return false;
      if (state.downloads.search) {
        const q = state.downloads.search.toLowerCase();
        return (d.title || '').toLowerCase().includes(q) || (d.desc || '').toLowerCase().includes(q);
      }
      return true;
    });

    toolbar.innerHTML = `
      <div class="admin-toolbar-search">
        <i data-lucide="search"></i>
        <input type="text" id="admDlSearch" placeholder="Cari materi..." value="${state.downloads.search}">
      </div>
      <select id="admDlCat" class="admin-select">
        <option value="">Semua Kategori</option>
        ${categories.map(c => `<option value="${c}" ${state.downloads.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button id="admDlAdd" class="admin-btn primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admDlReset" class="admin-btn secondary"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="download" class="w-12 h-12"></i><div>Tidak ada materi</div></div>`;
    } else {
      container.innerHTML = filtered.map(d => {
        const idx = list.indexOf(d);
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="${d.icon || 'file'}"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">${d.title}</div>
              <div class="admin-row-sub">${d.desc || ''}</div>
              <div class="admin-row-chips">
                <span class="admin-chip"><i data-lucide="tag"></i> ${d.category}</span>
                <span class="admin-chip"><i data-lucide="link"></i> ${(d.link || '').slice(0, 30)}</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="admin-btn-icon" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="admin-btn-icon warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="admin-btn-icon danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admDlSearch')?.addEventListener('input', debounce(e => {
      state.downloads.search = e.target.value;
      renderDownloads();
    }, 250));
    document.getElementById('admDlCat')?.addEventListener('change', e => {
      state.downloads.category = e.target.value;
      renderDownloads();
    });
    document.getElementById('admDlAdd')?.addEventListener('click', addDownload);
    document.getElementById('admDlReset')?.addEventListener('click', () => resetCategory('downloads'));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editDownload(i));
      row.querySelector('[data-act="dup"]').addEventListener('click', () => dupDownload(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteDownload(i));
    });

    if (window.lucide) lucide.createIcons();
  }

  function downloadFormHtml(d = {}) {
    const icons = ['book', 'book-open', 'scroll', 'languages', 'file-question', 'file-text', 'download', 'music', 'video', 'headphones'];
    return `
      <label class="admin-label">Judul *</label>
      <input id="dTitle" class="admin-input-field" value="${d.title || ''}" placeholder="TEXTBOOK 2024">
      <label class="admin-label">Deskripsi</label>
      <textarea id="dDesc" class="admin-input-field" rows="2">${d.desc || ''}</textarea>
      <label class="admin-label">Link Download *</label>
      <input id="dLink" class="admin-input-field" value="${d.link || ''}" placeholder="https://...">
      <label class="admin-label">Kategori</label>
      <select id="dCat" class="admin-input-field">
        <option value="textbook" ${d.category === 'textbook' ? 'selected' : ''}>Textbook</option>
        <option value="grammar" ${d.category === 'grammar' ? 'selected' : ''}>Grammar</option>
        <option value="vocab" ${d.category === 'vocab' ? 'selected' : ''}>Vocab</option>
        <option value="exam" ${d.category === 'exam' ? 'selected' : ''}>Exam</option>
      </select>
      <label class="admin-label">Icon</label>
      <select id="dIcon" class="admin-input-field">
        ${icons.map(ic => `<option value="${ic}" ${d.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}
      </select>
    `;
  }

  function addDownload() {
    openModal({
      icon: 'plus', title: 'Tambah Materi',
      body: downloadFormHtml(),
      submitText: 'Tambah',
      onSubmit: () => {
        const title = document.getElementById('dTitle').value.trim();
        const link = document.getElementById('dLink').value.trim();
        if (!title || !link) return KR.toast?.error('Judul & link wajib');
        const list = getDownloads();
        list.push({
          title, link,
          desc: document.getElementById('dDesc').value.trim(),
          category: document.getElementById('dCat').value,
          icon: document.getElementById('dIcon').value,
          color: 'blue',
        });
        saveDownloads(list);
        closeModal(); renderDownloads();
        KR.toast?.success('Materi ditambahkan');
      },
    });
  }

  function editDownload(idx) {
    const list = getDownloads();
    const d = list[idx];
    if (!d) return;
    openModal({
      icon: 'pencil', title: 'Edit Materi', subtitle: d.title,
      body: downloadFormHtml(d),
      onSubmit: () => {
        d.title = document.getElementById('dTitle').value.trim() || d.title;
        d.link = document.getElementById('dLink').value.trim() || d.link;
        d.desc = document.getElementById('dDesc').value.trim();
        d.category = document.getElementById('dCat').value;
        d.icon = document.getElementById('dIcon').value;
        saveDownloads(list);
        closeModal(); renderDownloads();
      },
    });
  }

  function dupDownload(idx) {
    const list = getDownloads();
    const d = list[idx];
    if (!d) return;
    list.splice(idx + 1, 0, { ...d, title: d.title + ' (copy)' });
    saveDownloads(list);
    renderDownloads();
  }

  function deleteDownload(idx) {
    const list = getDownloads();
    const d = list[idx];
    showConfirm({
      title: 'Hapus Materi?', subtitle: d?.title,
      message: 'Materi ini akan dihapus.',
      onOk: () => { list.splice(idx, 1); saveDownloads(list); renderDownloads(); },
    });
  }

  /* ═══════════════════════════════════════════
     RESET CATEGORY
     ═══════════════════════════════════════════ */
  function resetCategory(key) {
    const labels = { vocab: 'Kosakata', grammar: 'Grammar', culture: 'Budaya', downloads: 'Materi' };
    showConfirm({
      title: `Reset ${labels[key]}?`,
      subtitle: 'Kembalikan ke data awal (data.js)',
      message: `Semua perubahan pada ${labels[key]} akan dihapus dan kembali ke data default.`,
      okText: 'Ya, Reset',
      onOk: () => {
        resetKey(key);
        KR.toast?.success(`${labels[key]} direset`);
        if (key === 'vocab') renderVocab();
        if (key === 'grammar') renderGrammar();
        if (key === 'culture') renderCulture();
        if (key === 'downloads') renderDownloads();
      },
    });
  }

  /* ═══════════════════════════════════════════
     UTILS
     ═══════════════════════════════════════════ */
  function debounce(fn, wait = 250) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
  }

  /* ═══════════════════════════════════════════
     GITHUB & PASSWORD (sama seperti sebelumnya)
     ═══════════════════════════════════════════ */
  function loadGithubConfig() {
    const cfg = KR.github.getConfig();
    if (!cfg) return;
    if (els.ghOwner) els.ghOwner.value = cfg.owner || '';
    if (els.ghRepo) els.ghRepo.value = cfg.repo || '';
    if (els.ghBranch) els.ghBranch.value = cfg.branch || 'main';
    if (els.ghToken) els.ghToken.value = cfg.token || '';
    updateGhStatus();
  }
  function updateGhStatus() {
    const cfg = KR.github.getConfig();
    const ok = !!(cfg && cfg.owner && cfg.repo && cfg.token);
    if (els.ghStatus) {
      els.ghStatus.className = 'gh-status ' + (ok ? 'ok' : 'warn');
      els.ghStatus.innerHTML = ok
        ? `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Terhubung ke <strong>${cfg.owner}/${cfg.repo}</strong></span>`
        : `<i data-lucide="alert-triangle" class="w-4 h-4"></i><span>Belum dikonfigurasi</span>`;
    }
    if (els.statGh) {
      els.statGh.innerHTML = ok ? `<span class="text-green-600 dark:text-green-400">✓ OK</span>` : `<span class="text-amber-600">⚠ Setup</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }
  async function saveGithub() {
    const owner = els.ghOwner.value.trim();
    const repo = els.ghRepo.value.trim();
    const branch = els.ghBranch.value.trim() || 'main';
    const token = els.ghToken.value.trim();
    if (!owner || !repo || !token) return KR.toast?.error('Semua field wajib');
    KR.github.setConfig({ owner, repo, branch, token });
    KR.toast?.info('Testing koneksi...');
    const r = await KR.github.testConnection();
    KR.toast?.[r.ok ? 'success' : 'error'](r.msg);
    updateGhStatus();
  }
  async function testGithub() {
    const r = await KR.github.testConnection();
    KR.toast?.[r.ok ? 'success' : 'error'](r.msg);
  }
  function clearGithub() {
    showConfirm({
      title: 'Hapus Config GitHub?',
      message: 'Konfigurasi akan dihapus.',
      onOk: () => {
        KR.github.clearConfig();
        ['ghOwner','ghRepo','ghBranch','ghToken'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = id === 'ghBranch' ? 'main' : '';
        });
        updateGhStatus();
      },
    });
  }
  async function changePassword() {
    const r = await KR.auth.changePassword(els.passOld?.value || '', els.passNew?.value || '');
    if (r.ok) { KR.toast?.success('Password diganti'); els.passOld.value = ''; els.passNew.value = ''; }
    else KR.toast?.error(r.msg);
  }

  /* ═══════════════════════════════════════════
     BIND EVENTS
     ═══════════════════════════════════════════ */
  function bindEvents() {
    els.close?.addEventListener('click', close);
    els.tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.adminTab)));

    document.querySelectorAll('[data-admin-close]').forEach(el => el.addEventListener('click', closeModal));
    document.querySelectorAll('[data-confirm-close]').forEach(el => el.addEventListener('click', closeConfirm));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!els.modal.classList.contains('hidden')) closeModal();
        else if (!els.confirmModal.classList.contains('hidden')) closeConfirm();
        else if (!els.screen.classList.contains('hidden')) close();
      }
    });

    els.ghSaveBtn?.addEventListener('click', saveGithub);
    els.ghTestBtn?.addEventListener('click', testGithub);
    els.ghClearBtn?.addEventListener('click', clearGithub);
    els.passChangeBtn?.addEventListener('click', changePassword);

    els.qzAddBtn?.addEventListener('click', () => {
      if (state.quiz.view === 'list') addPackage();
      else if (state.quiz.view === 'pkg') addSection();
      else if (state.quiz.view === 'sec') addQuestion();
    });
    els.qzBackBtn?.addEventListener('click', () => {
      if (state.quiz.view === 'sec') { state.quiz.view = 'pkg'; state.quiz.secId = null; renderQuiz(); }
      else if (state.quiz.view === 'pkg') { state.quiz = { view: 'list', pkgId: null, secId: null }; renderQuiz(); }
    });
  }

  return { init, open, close, switchTab, getVocab, getGrammar, getCulture, getDownloads };
})();
