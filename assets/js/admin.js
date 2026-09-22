/* ==========================================
   KR-Dict — Admin Dashboard v8.6 (FINAL)
   + FIXED: close() refresh semua user view (PATCH A)
   + FIXED: debug log + verify di semua save functions (PATCH C)
   + FIXED: typo "contohs" → "contohs" (crash saat hapus contoh grammar)
   + FIXED: reset sekarang berfungsi (restore dari __KR_ORIGINAL__)
   + FIXED: collect() race condition (bind synchronous)
   + FIXED: null safety pada querySelector
   + FIXED: file input di-clear setelah upload
   ========================================== */
window.KR = window.KR || {};

KR.admin = (function () {
  'use strict';
  const STORAGE = KR.auth.STORAGE;

  let els = {};
  let activeTab = 'overview';
  const state = {
    quiz: { view: 'list', pkgId: null, secId: null },
    vocab: { search: '', bab: '', page: 0, perPage: 30 },
    grammar: { search: '' },
    culture: { search: '' },
    downloads: { search: '', category: '' },
  };

  const KEYS = {
    vocab: 'vocabOverride',
    grammar: 'grammarOverride',
    culture: 'cultureOverride',
    downloads: 'downloadsOverride',
  };

  const DEFAULT_BABS = [
    'BAB 1','BAB 2','BAB 3','BAB 4','BAB 5','BAB 6','BAB 7','BAB 8',
    'BAB 9','BAB 10','BAB 11','BAB 12','BAB 13','BAB 14','BAB 15',
    'BAB 16','BAB 17','BAB 18','BAB 19','BAB 20','BAB 21','BAB 22',
    'BAB 23','BAB 24','BAB 25','BAB 26','BAB 27','BAB 28','BAB 29','BAB 30'
  ];

  /* ==========================================
     PATCH A: Refresh semua user view
     Dipanggil setiap kali admin close
     ========================================== */
  function refreshAllUserViews() {
    try {
      console.log('[Admin] Refreshing all user views...');

      if (typeof window.filterVocabTextbook === 'function') {
        window.filterVocabTextbook();
      }
      if (typeof window.renderGrammar === 'function') {
        window.renderGrammar(window.grammarData || []);
      }
      if (typeof window.renderDownloads === 'function') {
        window.renderDownloads();
      }
      if (typeof window.renderCultureList === 'function') {
        const cultureEl = document.getElementById('culture');
        if (cultureEl && !cultureEl.classList.contains('hidden')) {
          const isDetailView = cultureEl.querySelector('.culture-page') !== null;
          if (!isDetailView) {
            window.renderCultureList();
          }
        }
      }

      if (window.lucide) lucide.createIcons();
      console.log('[Admin] ✅ User views refreshed');
    } catch (e) {
      console.error('[Admin] Error refreshing user views:', e);
    }
  }

  /* ==========================================
     IMAGE COMPRESS HELPER
     ========================================== */
  function compressImage(file, maxDim = 900, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ==========================================
     DATA GETTERS
     ========================================== */
  function getVocab() {
    const override = STORAGE.get(KEYS.vocab);
    if (override && Array.isArray(override)) return override.slice();
    if (window.vocabTextbookData && window.vocabTextbookData.length) return window.vocabTextbookData.slice();
    return [];
  }

  function getBabList() {
    const vocab = getVocab();
    const fromData = [...new Set(vocab.map(v => v.bab).filter(Boolean))];
    if (fromData.length) {
      return fromData.sort((a, b) => {
        const na = parseInt(String(a).replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b).replace(/\D/g, '')) || 0;
        return na - nb;
      });
    }
    return DEFAULT_BABS.slice();
  }

  /* ==========================================
     PATCH C: Debug log + verify di save functions
     ========================================== */
  function saveVocab(data) {
    console.log('[Admin] 💾 Saving vocab:', data.length, 'items');
    STORAGE.set(KEYS.vocab, data);
    const verify = STORAGE.get(KEYS.vocab);
    if (verify && verify.length === data.length) {
      console.log('[Admin] ✅ Vocab saved & verified:', verify.length, 'items');
    } else {
      console.error('[Admin] ❌ Vocab save FAILED! Expected:', data.length, 'Got:', verify?.length);
      KR.toast?.error('Gagal menyimpan! Kuota browser mungkin penuh.');
    }
    window.vocabTextbookData = data;
    window.dispatchEvent(new Event('vocab:updated'));
    syncGitHub('assets/data/vocab.json', { items: data }, 'chore: update vocab');
  }

  function getGrammar() {
    const override = STORAGE.get(KEYS.grammar);
    if (override && Array.isArray(override)) return override.slice();
    return (window.grammarData || []).slice();
  }

  function saveGrammar(data) {
    console.log('[Admin] 💾 Saving grammar:', data.length, 'items');
    STORAGE.set(KEYS.grammar, data);
    const verify = STORAGE.get(KEYS.grammar);
    if (verify && verify.length === data.length) {
      console.log('[Admin] ✅ Grammar saved & verified:', verify.length, 'items');
    } else {
      console.error('[Admin] ❌ Grammar save FAILED!');
      KR.toast?.error('Gagal menyimpan grammar!');
    }
    window.grammarData = data;
    window.dispatchEvent(new Event('grammar:updated'));
    syncGitHub('assets/data/grammar.json', { items: data }, 'chore: update grammar');
  }

  function getCulture() {
    const override = STORAGE.get(KEYS.culture);
    if (override && override.babs) return override;
    return JSON.parse(JSON.stringify(window.CULTURE_DATA || { babs: [] }));
  }

  function saveCulture(data) {
    console.log('[Admin] 💾 Saving culture:', data.babs?.length || 0, 'babs');
    STORAGE.set(KEYS.culture, data);
    const verify = STORAGE.get(KEYS.culture);
    if (verify && verify.babs && verify.babs.length === (data.babs?.length || 0)) {
      console.log('[Admin] ✅ Culture saved & verified');
    } else {
      console.error('[Admin] ❌ Culture save FAILED!');
      KR.toast?.error('Gagal menyimpan budaya!');
    }
    window.CULTURE_DATA = data;
    window.dispatchEvent(new Event('culture:updated'));
    syncGitHub('assets/data/culture.json', data, 'chore: update culture');
  }

  function getDownloads() {
    const override = STORAGE.get(KEYS.downloads);
    if (override && Array.isArray(override)) return override.slice();
    return (window.downloadsData || []).slice();
  }

  function saveDownloads(data) {
    console.log('[Admin] 💾 Saving downloads:', data.length, 'items');
    STORAGE.set(KEYS.downloads, data);
    const verify = STORAGE.get(KEYS.downloads);
    if (verify && verify.length === data.length) {
      console.log('[Admin] ✅ Downloads saved & verified:', verify.length, 'items');
    } else {
      console.error('[Admin] ❌ Downloads save FAILED!');
      KR.toast?.error('Gagal menyimpan materi!');
    }
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

  function resetKey(key) { STORAGE.remove(KEYS[key]); }
  function uid(prefix) { return (prefix || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function debounce(fn, wait = 250) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
  }
  function esc(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /* ==========================================
     INIT
     ========================================== */
  function init() {
    els = {
      screen: document.getElementById('adminDashboard'),
      close: document.getElementById('adminCloseBtn'),
      tabs: document.querySelectorAll('[data-admin-tab]'),
      panels: document.querySelectorAll('[data-admin-panel]'),
      statQuiz: document.getElementById('statQuizCount'),
      statQuestion: document.getElementById('statQuestionCount'),
      statVocab: document.getElementById('statVocabCount'),
      statGh: document.getElementById('statGhStatus'),
      ghOwner: document.getElementById('ghOwner'),
      ghRepo: document.getElementById('ghRepo'),
      ghBranch: document.getElementById('ghBranch'),
      ghToken: document.getElementById('ghToken'),
      ghSaveBtn: document.getElementById('ghSaveBtn'),
      ghTestBtn: document.getElementById('ghTestBtn'),
      ghClearBtn: document.getElementById('ghClearBtn'),
      ghStatus: document.getElementById('ghStatus'),
      passOld: document.getElementById('adminPassOld'),
      passNew: document.getElementById('adminPassNew'),
      passChangeBtn: document.getElementById('adminPassChangeBtn'),
      qzBreadcrumb: document.getElementById('qzBreadcrumb'),
      qzContainer: document.getElementById('qzContainer'),
      qzBackBtn: document.getElementById('qzBackBtn'),
      qzAddBtn: document.getElementById('qzAddBtn'),
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
    if (!els.screen) return;
    bindEvents();
    loadGithubConfig();
  }

  function open() {
    if (!KR.auth.isAdmin()) { KR.toast?.error('Hanya admin'); return; }
    els.screen.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchTab('overview');
    if (window.lucide) lucide.createIcons();
  }

  /* PATCH A: close() refresh semua user view */
  function close() {
    console.log('[Admin] Closing admin, refreshing user views...');
    els.screen.classList.add('hidden');
    document.body.style.overflow = '';
    refreshAllUserViews();
  }

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

  /* ---------- MODAL ---------- */
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

  /* ==========================================
     QUIZ CRUD
     ========================================== */
  function renderQuiz() {
    renderBreadcrumb();
    if (state.quiz.view === 'list') renderPkgList();
    else if (state.quiz.view === 'pkg') renderSecList();
    else if (state.quiz.view === 'sec') renderQuestionList();
  }

  function renderBreadcrumb() {
    if (!els.qzBreadcrumb) return;
    const quizzes = KR.quiz.getQuizzes();
    let html = `<button class="crumb" data-nav="list">Paket</button>`;
    if (state.quiz.pkgId) {
      const pkg = quizzes.find(p => p.id === state.quiz.pkgId);
      if (pkg) html += `<span class="crumb-sep">/</span><button class="crumb ${state.quiz.view === 'pkg' ? 'current' : ''}" data-nav="pkg">${esc(pkg.name)}</button>`;
    }
    if (state.quiz.secId && state.quiz.pkgId) {
      const pkg = quizzes.find(p => p.id === state.quiz.pkgId);
      const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
      if (sec) html += `<span class="crumb-sep">/</span><span class="crumb current">${esc(sec.name)}</span>`;
    }
    els.qzBreadcrumb.innerHTML = html;
    els.qzBreadcrumb.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.nav === 'list') state.quiz = { view: 'list', pkgId: null, secId: null };
        if (btn.dataset.nav === 'pkg') { state.quiz.view = 'pkg'; state.quiz.secId = null; }
        renderQuiz();
      });
    });
    if (els.qzBackBtn) els.qzBackBtn.classList.toggle('hidden', state.quiz.view === 'list');
  }

  function renderPkgList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Paket Baru';
    const quizzes = KR.quiz.getQuizzes();
    if (!quizzes.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="package-open"></i><div>Belum ada paket latihan</div></div>`;
    } else {
      els.qzContainer.innerHTML = quizzes.map(pkg => {
        const totalQ = (pkg.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
        return `
          <div class="admin-row" data-id="${pkg.id}">
            <div class="admin-row-icon"><i data-lucide="book-open-check"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(pkg.name)}</div>
              <div class="admin-row-sub">${esc(pkg.description || '—')}</div>
              <div class="admin-row-chips">
                <span class="chip neutral"><i data-lucide="clock"></i>${pkg.duration || 30}m</span>
                <span class="chip primary"><i data-lucide="list"></i>${totalQ} soal</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs primary" data-act="open" title="Kelola"><i data-lucide="folder-open"></i></button>
              <button class="btn-icon-xs" data-act="edit" title="Edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs danger" data-act="del" title="Hapus"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="open"]')?.addEventListener('click', () => { state.quiz = { view: 'pkg', pkgId: id, secId: null }; renderQuiz(); });
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editPackage(id));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deletePackage(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderSecList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Section Baru';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    if (!pkg) { state.quiz.view = 'list'; return renderQuiz(); }
    if (!pkg.sections?.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="layers"></i><div>Belum ada section</div></div>`;
    } else {
      els.qzContainer.innerHTML = pkg.sections.map(sec => {
        const isL = sec.type === 'listening';
        return `
          <div class="admin-row" data-id="${sec.id}">
            <div class="admin-row-icon ${isL ? 'admin-icon-accent' : ''}" style="${isL ? 'background: var(--accent-soft); color: var(--accent);' : ''}">
              <i data-lucide="${isL ? 'headphones' : 'book-open'}"></i>
            </div>
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(sec.name)}</div>
              <div class="admin-row-chips">
                <span class="chip ${isL ? 'accent' : 'primary'}">${isL ? '🎧 Listening' : '📖 Reading'}</span>
                <span class="chip neutral">${(sec.questions || []).length} soal</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs primary" data-act="open"><i data-lucide="folder-open"></i></button>
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="open"]')?.addEventListener('click', () => { state.quiz.view = 'sec'; state.quiz.secId = id; renderQuiz(); });
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editSection(id));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteSection(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderQuestionList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Soal Baru';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    if (!sec) { state.quiz.view = 'pkg'; return renderQuiz(); }
    const isL = sec.type === 'listening';
    if (!sec.questions?.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="file-question"></i><div>Belum ada soal</div></div>`;
    } else {
      els.qzContainer.innerHTML = sec.questions.map((q, i) => {
        const previewText = (q.text || q.audioText || '(tanpa teks)').replace(/\n+/g, ' · ').slice(0, 100);
        return `
          <div class="admin-row" data-id="${i}">
            <div class="admin-row-icon" style="background: var(--bg-subtle); color: var(--text); font-weight: 800; font-size: 0.85rem;">${i + 1}</div>
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(previewText)}</div>
              <div class="admin-row-chips">
                <span class="chip neutral">${(q.options || []).length} opsi</span>
                ${q.correct ? `<span class="chip success">✓ ${q.correct}</span>` : ''}
                ${q.image ? `<span class="chip accent"><i data-lucide="image" style="width:10px;height:10px"></i> Gambar</span>` : ''}
                ${(q.options || []).some(o => o.image) ? `<span class="chip warning"><i data-lucide="image-plus" style="width:10px;height:10px"></i> Gambar opsi</span>` : ''}
                ${isL ? `<span class="chip accent">🎧 ${q.audioTarget || 'question'}</span>` : ''}
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }
    els.qzContainer.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.id);
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editQuestion(i));
      row.querySelector('[data-act="dup"]')?.addEventListener('click', () => dupQuestion(i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteQuestion(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- QUIZ PACKAGE / SECTION CRUD ---------- */
  function addPackage() {
    openModal({
      icon: 'plus', title: 'Paket Baru', subtitle: 'Buat paket latihan',
      body: `
        <div class="field"><label class="field-label">Nama Paket <span class="req">*</span></label>
        <input id="pkgName" class="input" placeholder="EPS-TOPIK Set 1"></div>
        <div class="field"><label class="field-label">Deskripsi</label>
        <textarea id="pkgDesc" class="textarea" rows="2" placeholder="Keterangan singkat"></textarea></div>
        <div class="field"><label class="field-label">Durasi (menit)</label>
        <input id="pkgDur" type="number" class="input" value="30" min="1"></div>
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
        <div class="field"><label class="field-label">Nama</label>
        <input id="pkgName" class="input" value="${esc(pkg.name)}"></div>
        <div class="field"><label class="field-label">Deskripsi</label>
        <textarea id="pkgDesc" class="textarea" rows="2">${esc(pkg.description || '')}</textarea></div>
        <div class="field"><label class="field-label">Durasi (menit)</label>
        <input id="pkgDur" type="number" class="input" value="${pkg.duration || 30}"></div>
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
      message: `Paket <strong>${esc(pkg?.name)}</strong> dan semua soalnya akan dihapus.`,
      okText: 'Ya, Hapus',
      onOk: () => { KR.quiz.setQuizzes(KR.quiz.getQuizzes().filter(p => p.id !== id)); renderQuiz(); },
    });
  }
  function addSection() {
    openModal({
      icon: 'plus', title: 'Section Baru',
      body: `
        <div class="field"><label class="field-label">Nama Section <span class="req">*</span></label>
        <input id="secName" class="input" placeholder="Contoh: Reading Part 1"></div>
        <div class="field"><label class="field-label">Tipe</label>
        <select id="secType" class="select">
          <option value="reading">📖 Reading</option>
          <option value="listening">🎧 Listening</option>
        </select></div>
        <div class="field"><label class="field-label">Durasi (menit)</label>
        <input id="secDur" type="number" class="input" value="10"></div>
      `,
      onSubmit: () => {
        const name = document.getElementById('secName').value.trim();
        if (!name) return KR.toast?.error('Nama wajib');
        const list = KR.quiz.getQuizzes();
        const pkg = list.find(p => p.id === state.quiz.pkgId);
        if (!pkg) return KR.toast?.error('Paket tidak ditemukan');
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
        <div class="field"><label class="field-label">Nama</label>
        <input id="secName" class="input" value="${esc(sec.name)}"></div>
        <div class="field"><label class="field-label">Tipe</label>
        <select id="secType" class="select">
          <option value="reading" ${sec.type === 'reading' ? 'selected' : ''}>📖 Reading</option>
          <option value="listening" ${sec.type === 'listening' ? 'selected' : ''}>🎧 Listening</option>
        </select></div>
        <div class="field"><label class="field-label">Durasi (menit)</label>
        <input id="secDur" type="number" class="input" value="${sec.duration || 10}"></div>
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
    if (!sec) return;
    showConfirm({
      title: 'Hapus Section?', subtitle: sec.name,
      message: `Section <strong>${esc(sec.name)}</strong> dan ${sec.questions?.length || 0} soal akan dihapus.`,
      onOk: () => { pkg.sections = pkg.sections.filter(s => s.id !== id); KR.quiz.setQuizzes(KR.quiz.getQuizzes()); renderQuiz(); },
    });
  }

  /* ==========================================
     LIVE PREVIEW untuk Textarea Pertanyaan
     ========================================== */
  function updateQTextPreview() {
    const textarea = document.getElementById('qText');
    const countEl = document.getElementById('qTextLineCount');
    const previewContent = document.getElementById('qTextPreviewContent');
    if (!textarea || !countEl || !previewContent) return;

    const text = textarea.value || '';
    const lines = text.split(/\r?\n/);
    const lineCount = lines.length;

    if (lineCount <= 1) {
      countEl.textContent = '1 baris';
      countEl.style.color = '#94a3b8';
    } else {
      countEl.textContent = `${lineCount} baris ✓`;
      countEl.style.color = '#059669';
    }

    if (!text.trim()) {
      previewContent.innerHTML = '<span style="font-style:italic;color:#94a3b8;">Ketik pertanyaan untuk melihat preview...</span>';
    } else {
      const escaped = text
        .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, '<br>');
      previewContent.innerHTML = escaped;
    }
  }

  /* ==========================================
     QUESTION FORM
     ========================================== */
  function questionFormHtml(q = {}) {
    const type = q.type || 'reading';
    const audioTarget = q.audioTarget || 'question';
    return `
      <div class="field">
        <label class="field-label">Tipe Soal</label>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-secondary btn-sm adm-type-btn ${type === 'reading' ? 'btn-primary' : ''}" data-qtype="reading" style="flex:1">
            <i data-lucide="book-open"></i> Reading
          </button>
          <button type="button" class="btn btn-secondary btn-sm adm-type-btn ${type === 'listening' ? 'btn-primary' : ''}" data-qtype="listening" style="flex:1">
            <i data-lucide="headphones"></i> Listening
          </button>
        </div>
        <input type="hidden" id="qType" value="${type}">
      </div>

      <div class="field">
        <label class="field-label">Teks Pertanyaan</label>
        <textarea id="qText" class="textarea" rows="5" placeholder="Pertanyaan yang ditampilkan&#10;Tekan Enter untuk baris baru" oninput="KR.admin.updateQTextPreview()">${esc(q.text || '')}</textarea>
        <p style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;display:flex;align-items:center;gap:8px;">
          <i data-lucide="corner-down-left" style="width:11px;height:11px;"></i>
          <span>Tekan <strong>Enter</strong> untuk baris baru</span>
          <span id="qTextLineCount" style="margin-left:auto;font-weight:800;color:#6366f1;">1 baris</span>
        </p>
        <div id="qTextPreview" style="margin-top:8px;padding:10px 12px;background:var(--bg-subtle);border-radius:8px;border-left:3px solid #8b5cf6;font-size:0.85rem;line-height:1.55;color:var(--text-secondary);font-family:'Noto Sans KR',sans-serif;">
          <div style="font-size:0.65rem;font-weight:800;color:#8b5cf6;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Live Preview</div>
          <div id="qTextPreviewContent"></div>
        </div>
      </div>

      <div class="field">
        <label class="field-label"><i data-lucide="image" style="width:12px;height:12px;display:inline"></i> Gambar Pertanyaan (opsional)</label>
        <div id="qImageArea"></div>
        <input type="file" id="qImageInput" accept="image/*" class="hidden">
      </div>

      <div id="qAudioWrap" class="${type === 'listening' ? '' : 'hidden'}">
        <div class="field"><label class="field-label"><i data-lucide="volume-2" style="width:12px;height:12px;display:inline"></i> Teks Audio (TTS)</label>
          <textarea id="qAudioText" class="textarea" rows="2" placeholder="Contoh: 안녕하세요">${esc(q.audioText || '')}</textarea>
          <p style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">Tidak ditampilkan, hanya dibaca oleh sistem</p>
        </div>
        <div class="field"><label class="field-label">Audio Muncul Di</label>
          <select id="qAudioTarget" class="select">
            <option value="question" ${audioTarget === 'question' ? 'selected' : ''}>Di Pertanyaan</option>
            <option value="options" ${audioTarget === 'options' ? 'selected' : ''}>Di Pilihan Jawaban</option>
            <option value="both" ${audioTarget === 'both' ? 'selected' : ''}>Keduanya</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Pilihan Jawaban</label>
        <div id="qOptionsList"></div>
        <button type="button" class="btn btn-secondary btn-sm btn-block" id="qAddOpt" style="margin-top:8px">
          <i data-lucide="plus"></i> Tambah Opsi
        </button>
      </div>
      <div class="field"><label class="field-label">Jawaban Benar</label>
        <select id="qCorrect" class="select"></select>
      </div>
    `;
  }

  function bindQuestionForm(q) {
    let options = q.options ? JSON.parse(JSON.stringify(q.options)) : [
      { id: 'A', text: '', audioText: '', image: '' }, { id: 'B', text: '', audioText: '', image: '' },
      { id: 'C', text: '', audioText: '', image: '' }, { id: 'D', text: '', audioText: '', image: '' },
    ];
    options.forEach(o => { if (o.image === undefined) o.image = ''; });
    let questionImage = q.image || '';

    function renderQuestionImage() {
      const area = document.getElementById('qImageArea');
      if (!area) return;
      if (questionImage) {
        area.innerHTML = `
          <div class="img-preview-card">
            <img src="${questionImage}" alt="preview">
            <button type="button" class="img-preview-remove" data-act="remove-q-img" title="Hapus gambar">
              <i data-lucide="x"></i>
            </button>
          </div>`;
      } else {
        area.innerHTML = `
          <button type="button" class="img-upload-btn" data-act="add-q-img">
            <i data-lucide="image-plus"></i>
            <span>Upload Gambar</span>
          </button>`;
      }
      area.querySelector('[data-act="add-q-img"]')?.addEventListener('click', () => {
        document.getElementById('qImageInput').click();
      });
      area.querySelector('[data-act="remove-q-img"]')?.addEventListener('click', () => {
        questionImage = '';
        renderQuestionImage();
      });
      if (window.lucide) lucide.createIcons();
    }

    document.getElementById('qImageInput')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        if (KR.toast) KR.toast.info('Memproses gambar...', 1200);
        questionImage = await compressImage(file);
        renderQuestionImage();
        if (KR.toast) KR.toast.success('Gambar ditambahkan');
      } catch (err) {
        console.error(err);
        if (KR.toast) KR.toast.error('Gagal memproses gambar');
      }
    });

    renderQuestionImage();
    setTimeout(() => updateQTextPreview(), 50);

    function renderOpts() {
      const list = document.getElementById('qOptionsList');
      if (!list) return;
      const showAudio = document.getElementById('qType')?.value === 'listening' &&
        ['options', 'both'].includes(document.getElementById('qAudioTarget')?.value);
      list.innerHTML = options.map((o, i) => `
        <div class="opt-item">
          <div class="opt-head">
            <span class="opt-badge">${String.fromCharCode(65 + i)}</span>
            <button type="button" class="btn-icon-xs danger" data-del="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="input" data-i="${i}" value="${esc(o.text || '')}" placeholder="Teks pilihan" style="margin-bottom:6px">
          ${showAudio ? `<input type="text" class="input" data-audio="${i}" value="${esc(o.audioText || '')}" placeholder="🎧 Teks audio (opsional)" style="margin-bottom:6px">` : ''}
          <div class="opt-img-area" data-img="${i}"></div>
          <input type="file" class="hidden opt-img-input" data-img-input="${i}" accept="image/*">
        </div>
      `).join('');
      const sel = document.getElementById('qCorrect');
      if (sel) {
        const cur = q.correct || 'A';
        sel.innerHTML = options.map((o, i) => {
          const L = String.fromCharCode(65 + i);
          const preview = (o.text || '').slice(0, 40) || (o.image ? '[gambar]' : '(kosong)');
          return `<option value="${L}" ${cur === L ? 'selected' : ''}>${L}. ${esc(preview)}</option>`;
        }).join('');
      }

      options.forEach((o, i) => {
        const area = list.querySelector(`[data-img="${i}"]`);
        if (!area) return;
        if (o.image) {
          area.innerHTML = `
            <div class="img-preview-card img-preview-sm">
              <img src="${o.image}" alt="preview">
              <button type="button" class="img-preview-remove" data-act="remove-opt-img" data-idx="${i}">
                <i data-lucide="x"></i>
              </button>
            </div>`;
        } else {
          area.innerHTML = `
            <button type="button" class="img-upload-btn img-upload-btn-sm" data-act="add-opt-img" data-idx="${i}">
              <i data-lucide="image-plus"></i>
              <span>Upload Gambar Opsi</span>
            </button>`;
        }
      });

      list.querySelectorAll('input[data-i]').forEach(inp => {
        inp.addEventListener('input', e => { options[Number(e.target.dataset.i)].text = e.target.value; });
      });
      list.querySelectorAll('input[data-audio]').forEach(inp => {
        inp.addEventListener('input', e => { options[Number(e.target.dataset.audio)].audioText = e.target.value; });
      });
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (options.length <= 2) return KR.toast?.warn('Min 2 opsi');
          options.splice(Number(btn.dataset.del), 1);
          options.forEach((o, i) => o.id = String.fromCharCode(65 + i));
          renderOpts();
        });
      });
      list.querySelectorAll('[data-act="add-opt-img"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.idx);
          list.querySelector(`[data-img-input="${idx}"]`)?.click();
        });
      });
      list.querySelectorAll('[data-act="remove-opt-img"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.idx);
          options[idx].image = '';
          renderOpts();
        });
      });
      list.querySelectorAll('input[data-img-input]').forEach(inp => {
        inp.addEventListener('change', async (e) => {
          const idx = Number(inp.dataset.imgInput);
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            if (KR.toast) KR.toast.info('Memproses gambar...', 1200);
            options[idx].image = await compressImage(file);
            renderOpts();
            if (KR.toast) KR.toast.success('Gambar opsi ditambahkan');
          } catch (err) {
            console.error(err);
            if (KR.toast) KR.toast.error('Gagal memproses gambar');
          }
        });
      });

      if (window.lucide) lucide.createIcons();
    }
    renderOpts();

    document.getElementById('qAddOpt')?.addEventListener('click', () => {
      if (options.length >= 6) return KR.toast?.warn('Maks 6 opsi');
      options.push({ id: String.fromCharCode(65 + options.length), text: '', audioText: '', image: '' });
      renderOpts();
    });

    document.querySelectorAll('.adm-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.qtype;
        document.getElementById('qType').value = t;
        document.querySelectorAll('.adm-type-btn').forEach(b => {
          b.classList.toggle('btn-primary', b === btn);
          b.classList.toggle('btn-secondary', b !== btn);
        });
        document.getElementById('qAudioWrap').classList.toggle('hidden', t !== 'listening');
        renderOpts();
      });
    });
    document.getElementById('qAudioTarget')?.addEventListener('change', renderOpts);

    return () => ({
      type: document.getElementById('qType').value,
      text: document.getElementById('qText').value.trim(),
      image: questionImage || '',
      audioText: document.getElementById('qAudioText')?.value.trim() || '',
      audioTarget: document.getElementById('qAudioTarget')?.value || 'question',
      options: options.map(o => ({ id: o.id, text: o.text || '', audioText: o.audioText || '', image: o.image || '' })),
      correct: document.getElementById('qCorrect')?.value || 'A',
    });
  }

  /* ==========================================
     QUESTION CRUD — bind synchronous (FIXED)
     ========================================== */
  function addQuestion() {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    if (!sec) return;
    const qType = sec.type === 'listening' ? 'listening' : 'reading';

    openModal({
      icon: 'plus', title: 'Soal Baru', subtitle: sec.name,
      body: questionFormHtml({ type: qType }),
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText && !v.image) return KR.toast?.error('Isi pertanyaan minimal teks/gambar/audio');
        sec.questions = sec.questions || [];
        sec.questions.push({ id: uid('q'), ...v });
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
        KR.toast?.success('Soal ditambahkan');
      },
    });
    const collect = bindQuestionForm({ type: qType });
  }

  function editQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === state.quiz.pkgId);
    const sec = pkg?.sections?.find(s => s.id === state.quiz.secId);
    const q = sec?.questions?.[i];
    if (!q) return;

    openModal({
      icon: 'pencil', title: 'Edit Soal', subtitle: sec.name,
      body: questionFormHtml(q),
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText && !v.image) return KR.toast?.error('Isi pertanyaan minimal teks/gambar/audio');
        Object.assign(q, v);
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal(); renderQuiz();
        KR.toast?.success('Soal diperbarui');
      },
    });
    const collect = bindQuestionForm(q);
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
    if (!sec) return;
    showConfirm({
      title: 'Hapus Soal?', message: 'Soal akan dihapus.',
      onOk: () => { sec.questions.splice(i, 1); KR.quiz.setQuizzes(KR.quiz.getQuizzes()); renderQuiz(); },
    });
  }

  /* ==========================================
     VOCAB CRUD
     ========================================== */
  function renderVocab() {
    const container = document.getElementById('vocabAdminContainer');
    const toolbar = document.getElementById('vocabAdminToolbar');
    if (!container || !toolbar) return;

    const vocab = getVocab();
    const babs = getBabList();
    const total = vocab.length;

    const filtered = vocab.filter(v => {
      if (state.vocab.bab && v.bab !== state.vocab.bab) return false;
      if (state.vocab.search) {
        const q = state.vocab.search.toLowerCase();
        return (v.hangeul || '').includes(q) || (v.rom || '').toLowerCase().includes(q) || (v.arti || '').toLowerCase().includes(q);
      }
      return true;
    });

    toolbar.innerHTML = `
      <div class="input-group admin-search">
        <i data-lucide="search"></i>
        <input type="text" id="admVocabSearch" class="input" placeholder="Cari kosakata..." value="${esc(state.vocab.search)}">
      </div>
      <select id="admVocabBab" class="select" style="max-width:180px">
        <option value="">Semua Bab (${total})</option>
        ${babs.map(b => `<option value="${esc(b)}" ${state.vocab.bab === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}
      </select>
      <button id="admVocabAdd" class="btn btn-primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admVocabReset" class="btn btn-secondary" title="Reset"><i data-lucide="rotate-ccw"></i></button>
    `;

    const start = state.vocab.page * state.vocab.perPage;
    const paged = filtered.slice(start, start + state.vocab.perPage);
    if (!paged.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="search-x"></i><div>${vocab.length ? 'Tidak ada hasil' : 'Belum ada kosakata'}</div></div>`;
    } else {
      container.innerHTML = paged.map(v => {
        const realIdx = vocab.indexOf(v);
        return `
          <div class="admin-row" data-idx="${realIdx}">
            <div class="admin-row-icon"><i data-lucide="book"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title" style="font-family:'Noto Sans KR',sans-serif; font-size:1rem;">${esc(v.hangeul)}</div>
              <div class="admin-row-sub">${esc(v.rom || '—')} · ${esc(v.arti || '—')}</div>
              <div class="admin-row-chips">
                <span class="chip neutral"><i data-lucide="bookmark"></i>${esc(v.bab || '—')}</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('') + renderPagination(filtered.length, state.vocab.page, state.vocab.perPage);
    }

    document.getElementById('admVocabSearch')?.addEventListener('input', debounce(e => {
      state.vocab.search = e.target.value; state.vocab.page = 0; renderVocab();
    }, 250));
    document.getElementById('admVocabBab')?.addEventListener('change', e => {
      state.vocab.bab = e.target.value; state.vocab.page = 0; renderVocab();
    });
    document.getElementById('admVocabAdd')?.addEventListener('click', addVocab);
    document.getElementById('admVocabReset')?.addEventListener('click', () => resetCategory('vocab'));

    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editVocab(i));
      row.querySelector('[data-act="dup"]')?.addEventListener('click', () => dupVocab(i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteVocab(i));
    });
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.vocab.page = Number(btn.dataset.page);
        renderVocab();
        document.querySelector('.admin-body')?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderPagination(total, page, perPage) {
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) return '';
    let html = '<div class="admin-pagination">';
    html += `<button class="page-btn" data-page="${Math.max(0, page - 1)}" ${page === 0 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>`;
    const start = Math.max(0, page - 2);
    const end = Math.min(pages, start + 5);
    for (let i = start; i < end; i++) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
    }
    html += `<button class="page-btn" data-page="${Math.min(pages - 1, page + 1)}" ${page >= pages - 1 ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button>`;
    html += `<span class="page-info">${total} item · ${pages} hal</span>`;
    html += '</div>';
    return html;
  }

  function vocabFormHtml(v = {}) {
    const babs = getBabList();
    const currentBab = v.bab || (state.vocab.bab || babs[0] || 'BAB 1');
    return `
      <div class="field"><label class="field-label">Hangeul <span class="req">*</span></label>
        <input id="vHangeul" class="input" value="${esc(v.hangeul || '')}" placeholder="안녕하세요" style="font-family:'Noto Sans KR',sans-serif"></div>
      <div class="field"><label class="field-label">Romanisasi <span class="req">*</span></label>
        <input id="vRom" class="input" value="${esc(v.rom || '')}" placeholder="annyeonghaseyo"></div>
      <div class="field"><label class="field-label">Arti <span class="req">*</span></label>
        <input id="vArti" class="input" value="${esc(v.arti || '')}" placeholder="Halo / Selamat"></div>
      <div class="field"><label class="field-label">Bab</label>
        <select id="vBab" class="select">
          ${babs.map(b => `<option value="${esc(b)}" ${currentBab === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}
          <option value="__new__">+ Tambah bab baru...</option>
        </select>
        <input id="vBabNew" class="input hidden" placeholder="Contoh: BAB 31 (nama bab baru)" style="margin-top:8px">
      </div>
    `;
  }

  function bindVocabForm() {
    const sel = document.getElementById('vBab');
    const newInput = document.getElementById('vBabNew');
    sel?.addEventListener('change', () => {
      newInput?.classList.toggle('hidden', sel.value !== '__new__');
      if (sel.value === '__new__') newInput?.focus();
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
        if (!bab) return KR.toast?.error('Pilih atau isi bab');
        const vocab = getVocab();
        const newId = Math.max(0, ...vocab.map(v => Number(v.id) || 0)) + 1;
        vocab.push({ id: newId, bab, hangeul, rom: rom || '-', arti });
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
        KR.toast?.success('Diperbarui');
      },
    });
    setTimeout(bindVocabForm, 60);
  }

  function dupVocab(idx) {
    const vocab = getVocab();
    const v = vocab[idx];
    if (!v) return;
    const copy = { ...v, id: Math.max(0, ...vocab.map(x => Number(x.id) || 0)) + 1, hangeul: v.hangeul + ' (copy)' };
    vocab.splice(idx + 1, 0, copy);
    saveVocab(vocab); renderVocab();
    KR.toast?.success('Duplikat dibuat');
  }

  function deleteVocab(idx) {
    const vocab = getVocab();
    const v = vocab[idx];
    if (!v) return;
    showConfirm({
      title: 'Hapus Kosakata?', subtitle: v.hangeul + ' — ' + v.arti,
      message: 'Kosakata ini akan dihapus permanen.',
      onOk: () => { vocab.splice(idx, 1); saveVocab(vocab); renderVocab(); },
    });
  }

  /* ==========================================
     GRAMMAR CRUD
     ========================================== */
  function renderGrammar() {
    const container = document.getElementById('grammarAdminContainer');
    const toolbar = document.getElementById('grammarAdminToolbar');
    if (!container || !toolbar) return;

    const list = getGrammar();
    const filtered = list.filter(g => {
      if (!state.grammar.search) return true;
      const q = state.grammar.search.toLowerCase();
      return (g.struktur || '').toLowerCase().includes(q) || (g.arti || '').toLowerCase().includes(q);
    });

    toolbar.innerHTML = `
      <div class="input-group admin-search">
        <i data-lucide="search"></i>
        <input type="text" id="admGramSearch" class="input" placeholder="Cari grammar..." value="${esc(state.grammar.search)}">
      </div>
      <button id="admGramAdd" class="btn btn-primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admGramReset" class="btn btn-secondary"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="search-x"></i><div>${list.length ? 'Tidak ada hasil' : 'Belum ada grammar'}</div></div>`;
    } else {
      container.innerHTML = filtered.map(g => {
        const idx = list.indexOf(g);
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="sparkles"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title" style="font-family:'Noto Sans KR',sans-serif">${esc(g.struktur)}</div>
              <div class="admin-row-sub">${esc(g.arti)}</div>
              <div class="admin-row-chips">
                <span class="chip neutral"><i data-lucide="list"></i>${(g.contoh || []).length} contoh</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admGramSearch')?.addEventListener('input', debounce(e => {
      state.grammar.search = e.target.value; renderGrammar();
    }, 250));
    document.getElementById('admGramAdd')?.addEventListener('click', addGrammar);
    document.getElementById('admGramReset')?.addEventListener('click', () => resetCategory('grammar'));
    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editGrammar(i));
      row.querySelector('[data-act="dup"]')?.addEventListener('click', () => dupGrammar(i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteGrammar(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  function grammarFormHtml(g = {}) {
    const fungsiStr = Array.isArray(g.fungsi) ? g.fungsi.join('\n') : (g.fungsi || '');
    return `
      <div class="field"><label class="field-label">Struktur / Pola <span class="req">*</span></label>
        <input id="gStruktur" class="input" value="${esc(g.struktur || '')}" placeholder="~입니다 / ~입니까?" style="font-family:'Noto Sans KR',sans-serif"></div>
      <div class="field"><label class="field-label">Arti Singkat <span class="req">*</span></label>
        <input id="gArti" class="input" value="${esc(g.arti || '')}" placeholder="Adalah / Apakah"></div>
      <div class="field"><label class="field-label">Fungsi (satu per baris)</label>
        <textarea id="gFungsi" class="textarea" rows="3">${esc(fungsiStr)}</textarea></div>
      <div class="field">
        <label class="field-label">Contoh Kalimat</label>
        <div id="gContohList"></div>
        <button type="button" class="btn btn-secondary btn-sm btn-block" id="gAddContoh" style="margin-top:8px">
          <i data-lucide="plus"></i> Tambah Contoh
        </button>
      </div>
    `;
  }

  /* FIXED: typo "contohs" → "contohs" */
  function bindGrammarForm(initial) {
    let contohs = (initial && initial.length) ? JSON.parse(JSON.stringify(initial)) : [{ kalimat: '', arti: '' }];
    const renderContoh = () => {
      const list = document.getElementById('gContohList');
      if (!list) return;
      list.innerHTML = contohs.map((c, i) => `
        <div class="opt-item">
          <div class="opt-head">
            <span class="opt-badge">${i + 1}</span>
            <button type="button" class="btn-icon-xs danger" data-del="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="input" data-k="${i}" value="${esc(c.kalimat || '')}" placeholder="Kalimat Korea" style="margin-bottom:6px;font-family:'Noto Sans KR',sans-serif">
          <input type="text" class="input" data-a="${i}" value="${esc(c.arti || '')}" placeholder="Terjemahan Indonesia">
        </div>
      `).join('');
      list.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('input', e => { contohs[Number(e.target.dataset.k)].kalimat = e.target.value; }));
      list.querySelectorAll('input[data-a]').forEach(inp => inp.addEventListener('input', e => { contohs[Number(e.target.dataset.a)].arti = e.target.value; }));
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (contohs.length <= 1) return KR.toast?.warn('Min 1 contoh');
          contohs.splice(Number(btn.dataset.del), 1);
          renderContoh();
        });
      });
      if (window.lucide) lucide.createIcons();
    };
    renderContoh();
    document.getElementById('gAddContoh')?.addEventListener('click', () => { contohs.push({ kalimat: '', arti: '' }); renderContoh(); });
    return () => ({
      struktur: document.getElementById('gStruktur').value.trim(),
      arti: document.getElementById('gArti').value.trim(),
      fungsi: document.getElementById('gFungsi').value.split('\n').map(s => s.trim()).filter(Boolean),
      contoh: contohs.filter(c => c.kalimat),
    });
  }

  function addGrammar() {
    openModal({
      icon: 'plus', title: 'Grammar Baru',
      body: grammarFormHtml(),
      submitText: 'Tambah',
      onSubmit: () => {
        const v = collect();
        if (!v.struktur || !v.arti) return KR.toast?.error('Struktur & arti wajib');
        const list = getGrammar();
        list.push(v);
        saveGrammar(list); closeModal(); renderGrammar();
        KR.toast?.success('Grammar ditambahkan');
      },
    });
    const collect = bindGrammarForm();
  }

  function editGrammar(idx) {
    const list = getGrammar();
    const g = list[idx];
    if (!g) return;
    openModal({
      icon: 'pencil', title: 'Edit Grammar', subtitle: g.struktur,
      body: grammarFormHtml(g),
      onSubmit: () => {
        const v = collect();
        if (!v.struktur || !v.arti) return KR.toast?.error('Wajib diisi');
        Object.assign(g, v);
        saveGrammar(list); closeModal(); renderGrammar();
      },
    });
    const collect = bindGrammarForm(g.contoh);
  }

  function dupGrammar(idx) {
    const list = getGrammar();
    const g = list[idx];
    if (!g) return;
    const copy = JSON.parse(JSON.stringify(g));
    copy.struktur = g.struktur + ' (copy)';
    list.splice(idx + 1, 0, copy);
    saveGrammar(list); renderGrammar();
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

  /* ==========================================
     CULTURE CRUD
     ========================================== */
  function renderCulture() {
    const container = document.getElementById('cultureAdminContainer');
    const toolbar = document.getElementById('cultureAdminToolbar');
    if (!container || !toolbar) return;

    const data = getCulture();
    const list = data.babs || [];
    const filtered = list.filter(b => {
      if (!state.culture.search) return true;
      const q = state.culture.search.toLowerCase();
      return (b.title || '').toLowerCase().includes(q) || ('bab ' + b.id).toLowerCase().includes(q);
    });

    toolbar.innerHTML = `
      <div class="input-group admin-search">
        <i data-lucide="search"></i>
        <input type="text" id="admCulSearch" class="input" placeholder="Cari bab..." value="${esc(state.culture.search)}">
      </div>
      <button id="admCulAdd" class="btn btn-primary"><i data-lucide="plus"></i> Bab Baru</button>
      <button id="admCulReset" class="btn btn-secondary"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="globe"></i><div>Belum ada bab budaya</div></div>`;
    } else {
      container.innerHTML = filtered.map(b => {
        const idx = list.indexOf(b);
        const pageCount = (b.pages || []).length;
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="globe"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">BAB ${b.id} — ${esc(b.title)}</div>
              <div class="admin-row-chips">
                <span class="chip neutral"><i data-lucide="file-text"></i>${pageCount} halaman</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs primary" data-act="open" title="Kelola Halaman"><i data-lucide="folder-open"></i></button>
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admCulSearch')?.addEventListener('input', debounce(e => {
      state.culture.search = e.target.value; renderCulture();
    }, 250));
    document.getElementById('admCulAdd')?.addEventListener('click', addCultureBab);
    document.getElementById('admCulReset')?.addEventListener('click', () => resetCategory('culture'));
    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="open"]')?.addEventListener('click', () => editCulturePages(i));
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editCultureBab(i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteCultureBab(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  function addCultureBab() {
    const data = getCulture();
    const maxId = Math.max(0, ...(data.babs || []).map(x => Number(x.id) || 0));
    openModal({
      icon: 'plus', title: 'Bab Budaya Baru',
      body: `
        <div class="field"><label class="field-label">Nomor Bab <span class="req">*</span></label>
        <input id="cId" type="number" class="input" value="${maxId + 1}" min="1"></div>
        <div class="field"><label class="field-label">Judul <span class="req">*</span></label>
        <input id="cTitle" class="input" placeholder="한국의 인사 예절 (Etika Salam di Korea)"></div>
      `,
      submitText: 'Tambah',
      onSubmit: () => {
        const id = parseInt(document.getElementById('cId').value) || 1;
        const title = document.getElementById('cTitle').value.trim();
        if (!title) return KR.toast?.error('Judul wajib');
        data.babs = data.babs || [];
        data.babs.push({ id, title, pages: [] });
        data.babs.sort((a, b) => a.id - b.id);
        saveCulture(data); closeModal(); renderCulture();
      },
    });
  }

  function editCultureBab(idx) {
    const data = getCulture();
    const b = data.babs[idx];
    if (!b) return;
    openModal({
      icon: 'pencil', title: 'Edit Bab', subtitle: b.title,
      body: `
        <div class="field"><label class="field-label">Nomor Bab</label>
        <input id="cId" type="number" class="input" value="${b.id}" min="1"></div>
        <div class="field"><label class="field-label">Judul</label>
        <input id="cTitle" class="input" value="${esc(b.title)}"></div>
      `,
      onSubmit: () => {
        b.id = parseInt(document.getElementById('cId').value) || b.id;
        b.title = document.getElementById('cTitle').value.trim() || b.title;
        data.babs.sort((a, b) => a.id - b.id);
        saveCulture(data); closeModal(); renderCulture();
      },
    });
  }

  function deleteCultureBab(idx) {
    const data = getCulture();
    const b = data.babs[idx];
    if (!b) return;
    showConfirm({
      title: 'Hapus Bab?', subtitle: 'BAB ' + b.id + ' — ' + b.title,
      message: `Bab ini dan ${(b.pages || []).length} halaman akan dihapus.`,
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
    if (!container || !toolbar) return;
    const pages = bab.pages || [];

    toolbar.innerHTML = `
      <button id="admCulBack" class="btn btn-secondary btn-sm"><i data-lucide="arrow-left"></i> Kembali</button>
      <div class="crumb-bar">
        <span class="crumb current">BAB ${bab.id} — ${esc(bab.title)}</span>
      </div>
      <button id="admCulPageAdd" class="btn btn-primary"><i data-lucide="plus"></i> Halaman</button>
    `;

    if (!pages.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="file-text"></i><div>Belum ada halaman</div></div>`;
    } else {
      container.innerHTML = pages.map((p, i) => `
        <div class="admin-row" data-idx="${i}">
          <div class="admin-row-icon" style="background:var(--bg-subtle);color:var(--text);font-weight:800;font-size:0.85rem;">${i + 1}</div>
          <div class="admin-row-body">
            <div class="admin-row-title" style="font-family:'Noto Sans KR',sans-serif">${esc((p.korean || '').slice(0, 80))}${(p.korean || '').length > 80 ? '…' : ''}</div>
            <div class="admin-row-sub">${esc((p.arti_full || '').slice(0, 100))}</div>
            <div class="admin-row-chips">
              <span class="chip neutral"><i data-lucide="list"></i>${(p.arti_per_kata || []).length} kosakata</span>
            </div>
          </div>
          <div class="admin-row-actions">
            <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-xs warn" data-act="dup"><i data-lucide="copy"></i></button>
            <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`).join('');
    }

    document.getElementById('admCulBack')?.addEventListener('click', renderCulture);
    document.getElementById('admCulPageAdd')?.addEventListener('click', () => addCulturePage(babIdx));
    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editCulturePage(babIdx, i));
      row.querySelector('[data-act="dup"]')?.addEventListener('click', () => dupCulturePage(babIdx, i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteCulturePage(babIdx, i));
    });
    if (window.lucide) lucide.createIcons();
  }

  function culturePageFormHtml(p = {}) {
    return `
      <div class="field"><label class="field-label">Teks Korea <span class="req">*</span></label>
        <textarea id="cpKorean" class="textarea" rows="3" style="font-family:'Noto Sans KR',sans-serif">${esc(p.korean || '')}</textarea></div>
      <div class="field"><label class="field-label">Terjemahan Lengkap <span class="req">*</span></label>
        <textarea id="cpArtiFull" class="textarea" rows="3">${esc(p.arti_full || '')}</textarea></div>
      <div class="field">
        <label class="field-label">Rincian Per Kata</label>
        <div id="cpDetailsList"></div>
        <button type="button" class="btn btn-secondary btn-sm btn-block" id="cpAddDetail" style="margin-top:8px">
          <i data-lucide="plus"></i> Tambah Rincian
        </button>
      </div>
    `;
  }

  function bindCulturePageForm(initial) {
    let details = (initial && initial.length) ? JSON.parse(JSON.stringify(initial)) : [{ bagian: '', fungsi: '', arti: '' }];
    const render = () => {
      const list = document.getElementById('cpDetailsList');
      if (!list) return;
      list.innerHTML = details.map((d, i) => `
        <div class="opt-item">
          <div class="opt-head">
            <span class="opt-badge">${i + 1}</span>
            <button type="button" class="btn-icon-xs danger" data-del="${i}"><i data-lucide="x"></i></button>
          </div>
          <input type="text" class="input" data-b="${i}" value="${esc(d.bagian || '')}" placeholder="Bagian kalimat" style="margin-bottom:6px;font-family:'Noto Sans KR',sans-serif">
          <input type="text" class="input" data-f="${i}" value="${esc(d.fungsi || '')}" placeholder="Fungsi / grammar" style="margin-bottom:6px">
          <input type="text" class="input" data-a="${i}" value="${esc(d.arti || '')}" placeholder="Arti">
        </div>
      `).join('');
      list.querySelectorAll('input[data-b]').forEach(inp => inp.addEventListener('input', e => { details[Number(e.target.dataset.b)].bagian = e.target.value; }));
      list.querySelectorAll('input[data-f]').forEach(inp => inp.addEventListener('input', e => { details[Number(e.target.dataset.f)].fungsi = e.target.value; }));
      list.querySelectorAll('input[data-a]').forEach(inp => inp.addEventListener('input', e => { details[Number(e.target.dataset.a)].arti = e.target.value; }));
      list.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (details.length <= 1) return KR.toast?.warn('Min 1');
          details.splice(Number(btn.dataset.del), 1);
          render();
        });
      });
      if (window.lucide) lucide.createIcons();
    };
    render();
    document.getElementById('cpAddDetail')?.addEventListener('click', () => { details.push({ bagian: '', fungsi: '', arti: '' }); render(); });
    return () => ({
      korean: document.getElementById('cpKorean').value.trim(),
      arti_full: document.getElementById('cpArtiFull').value.trim(),
      arti_per_kata: details.filter(d => d.bagian || d.arti),
    });
  }

  function addCulturePage(babIdx) {
    openModal({
      icon: 'plus', title: 'Halaman Baru', subtitle: 'Bab ' + getCulture().babs[babIdx].id,
      body: culturePageFormHtml(),
      onSubmit: () => {
        const v = collect();
        if (!v.korean || !v.arti_full) return KR.toast?.error('Teks & terjemahan wajib');
        const data = getCulture();
        data.babs[babIdx].pages = data.babs[babIdx].pages || [];
        data.babs[babIdx].pages.push({ id: data.babs[babIdx].pages.length + 1, ...v });
        saveCulture(data); closeModal();
        renderCulturePagesView(data.babs[babIdx], babIdx);
      },
    });
    const collect = bindCulturePageForm();
  }

  function editCulturePage(babIdx, pageIdx) {
    const data = getCulture();
    const p = data.babs[babIdx].pages[pageIdx];
    if (!p) return;
    openModal({
      icon: 'pencil', title: 'Edit Halaman', subtitle: 'Bab ' + data.babs[babIdx].id,
      body: culturePageFormHtml(p),
      onSubmit: () => {
        const v = collect();
        if (!v.korean || !v.arti_full) return KR.toast?.error('Wajib diisi');
        Object.assign(p, v);
        saveCulture(data); closeModal();
        renderCulturePagesView(data.babs[babIdx], babIdx);
      },
    });
    const collect = bindCulturePageForm(p.arti_per_kata);
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
    showConfirm({
      title: 'Hapus Halaman?',
      message: 'Halaman ini akan dihapus.',
      onOk: () => {
        data.babs[babIdx].pages.splice(pageIdx, 1);
        saveCulture(data);
        renderCulturePagesView(data.babs[babIdx], babIdx);
      },
    });
  }

  /* ==========================================
     DOWNLOADS CRUD
     ========================================== */
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
      <div class="input-group admin-search">
        <i data-lucide="search"></i>
        <input type="text" id="admDlSearch" class="input" placeholder="Cari materi..." value="${esc(state.downloads.search)}">
      </div>
      <select id="admDlCat" class="select" style="max-width:160px">
        <option value="">Semua Kategori</option>
        ${categories.map(c => `<option value="${c}" ${state.downloads.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button id="admDlAdd" class="btn btn-primary"><i data-lucide="plus"></i> Tambah</button>
      <button id="admDlReset" class="btn btn-secondary"><i data-lucide="rotate-ccw"></i></button>
    `;

    if (!filtered.length) {
      container.innerHTML = `<div class="admin-empty"><i data-lucide="download"></i><div>${list.length ? 'Tidak ada hasil' : 'Belum ada materi'}</div></div>`;
    } else {
      container.innerHTML = filtered.map(d => {
        const idx = list.indexOf(d);
        return `
          <div class="admin-row" data-idx="${idx}">
            <div class="admin-row-icon"><i data-lucide="${esc(d.icon || 'file')}"></i></div>
            <div class="admin-row-body">
              <div class="admin-row-title">${esc(d.title)}</div>
              <div class="admin-row-sub">${esc(d.desc || '')}</div>
              <div class="admin-row-chips">
                <span class="chip neutral"><i data-lucide="tag"></i>${esc(d.category)}</span>
              </div>
            </div>
            <div class="admin-row-actions">
              <button class="btn-icon-xs" data-act="edit"><i data-lucide="pencil"></i></button>
              <button class="btn-icon-xs warn" data-act="dup"><i data-lucide="copy"></i></button>
              <button class="btn-icon-xs danger" data-act="del"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');
    }

    document.getElementById('admDlSearch')?.addEventListener('input', debounce(e => {
      state.downloads.search = e.target.value; renderDownloads();
    }, 250));
    document.getElementById('admDlCat')?.addEventListener('change', e => {
      state.downloads.category = e.target.value; renderDownloads();
    });
    document.getElementById('admDlAdd')?.addEventListener('click', addDownload);
    document.getElementById('admDlReset')?.addEventListener('click', () => resetCategory('downloads'));
    container.querySelectorAll('.admin-row').forEach(row => {
      const i = Number(row.dataset.idx);
      row.querySelector('[data-act="edit"]')?.addEventListener('click', () => editDownload(i));
      row.querySelector('[data-act="dup"]')?.addEventListener('click', () => dupDownload(i));
      row.querySelector('[data-act="del"]')?.addEventListener('click', () => deleteDownload(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  function downloadFormHtml(d = {}) {
    const icons = ['book', 'book-open', 'scroll', 'languages', 'file-question', 'file-text', 'download', 'music', 'video', 'headphones'];
    return `
      <div class="field"><label class="field-label">Judul <span class="req">*</span></label>
        <input id="dTitle" class="input" value="${esc(d.title || '')}"></div>
      <div class="field"><label class="field-label">Deskripsi</label>
        <textarea id="dDesc" class="textarea" rows="2">${esc(d.desc || '')}</textarea></div>
      <div class="field"><label class="field-label">Link <span class="req">*</span></label>
        <input id="dLink" class="input" value="${esc(d.link || '')}" placeholder="https://..."></div>
      <div class="field"><label class="field-label">Kategori</label>
        <select id="dCat" class="select">
          <option value="textbook" ${d.category === 'textbook' ? 'selected' : ''}>Textbook</option>
          <option value="grammar" ${d.category === 'grammar' ? 'selected' : ''}>Grammar</option>
          <option value="vocab" ${d.category === 'vocab' ? 'selected' : ''}>Vocab</option>
          <option value="exam" ${d.category === 'exam' ? 'selected' : ''}>Exam</option>
        </select></div>
      <div class="field"><label class="field-label">Icon</label>
        <select id="dIcon" class="select">
          ${icons.map(ic => `<option value="${ic}" ${d.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}
        </select></div>
    `;
  }

  function addDownload() {
    openModal({
      icon: 'plus', title: 'Materi Baru',
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
        saveDownloads(list); closeModal(); renderDownloads();
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
        saveDownloads(list); closeModal(); renderDownloads();
      },
    });
  }

  function dupDownload(idx) {
    const list = getDownloads();
    const d = list[idx];
    if (!d) return;
    list.splice(idx + 1, 0, { ...d, title: d.title + ' (copy)' });
    saveDownloads(list); renderDownloads();
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

  /* ==========================================
     RESET (restore dari __KR_ORIGINAL__)
     ========================================== */
  function resetCategory(key) {
    const labels = { vocab: 'Kosakata', grammar: 'Grammar', culture: 'Budaya', downloads: 'Materi' };
    showConfirm({
      title: `Reset ${labels[key]}?`,
      subtitle: 'Kembalikan ke data awal',
      message: `Semua perubahan pada ${labels[key]} akan dihapus dan kembali ke data default.`,
      okText: 'Ya, Reset',
      onOk: () => {
        resetKey(key);
        const orig = window.__KR_ORIGINAL__ || {};
        if (key === 'vocab') {
          window.vocabTextbookData = (orig.vocab || []).slice();
        } else if (key === 'grammar') {
          window.grammarData = (orig.grammar || []).slice();
        } else if (key === 'culture') {
          window.CULTURE_DATA = JSON.parse(JSON.stringify(orig.culture || { babs: [] }));
        } else if (key === 'downloads') {
          window.downloadsData = (orig.downloads || []).slice();
        }
        KR.toast?.success(`${labels[key]} direset`);
        window.dispatchEvent(new Event(key + ':updated'));
        if (key === 'vocab') renderVocab();
        if (key === 'grammar') renderGrammar();
        if (key === 'culture') renderCulture();
        if (key === 'downloads') renderDownloads();
      },
    });
  }

  /* ==========================================
     GITHUB
     ========================================== */
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
        ? `<i data-lucide="check-circle"></i><span>Terhubung ke <strong>${esc(cfg.owner)}/${esc(cfg.repo)}</strong></span>`
        : `<i data-lucide="alert-triangle"></i><span>Belum dikonfigurasi</span>`;
    }
    if (els.statGh) {
      els.statGh.innerHTML = ok ? '✓ OK' : '⚠ Setup';
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
    KR.toast?.info('Testing...');
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
        ['ghOwner', 'ghRepo', 'ghBranch', 'ghToken'].forEach(id => {
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

  /* ==========================================
     BIND
     ========================================== */
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

  return {
    init,
    open,
    close,
    switchTab,
    getVocab,
    getGrammar,
    getCulture,
    getDownloads,
    getBabList,
    updateQTextPreview,
    refreshAllUserViews
  };
})();
