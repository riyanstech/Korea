/* ==========================================
   KR-Dict — Admin Dashboard
   Kelola: Kosakata, Quiz (Reading+Listening), GitHub, Password
   ========================================== */
window.KR = window.KR || {};

KR.admin = (function () {
  'use strict';
  const STORAGE = KR.auth.STORAGE;

  let els = {};
  let activeTab = 'overview';
  let nav = { view: 'list', pkgId: null, secId: null };
  let editingPkg = null;
  let editingSec = null;

  /* ==========================================
     INIT
     ========================================== */
  function init() {
    els = {
      screen: document.getElementById('adminDashboard'),
      close: document.getElementById('adminCloseBtn'),
      tabs: document.querySelectorAll('[data-admin-tab]'),
      panels: document.querySelectorAll('[data-admin-panel]'),
      // Overview
      statQuiz: document.getElementById('statQuizCount'),
      statQuestion: document.getElementById('statQuestionCount'),
      statVocab: document.getElementById('statVocabCount'),
      statGh: document.getElementById('statGhStatus'),
      // GitHub settings
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
      // Quiz editor
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
    if (name === 'vocab') renderVocabInfo();
  }

  function renderOverview() {
    const quizzes = KR.quiz?.getQuizzes() || [];
    const totalQ = quizzes.reduce((s, p) => s + (p.sections || []).reduce((s2, sec) => s2 + (sec.questions?.length || 0), 0), 0);
    const totalVocab = window.vocabTextbookData?.length || 0;

    if (els.statQuiz) els.statQuiz.textContent = quizzes.length;
    if (els.statQuestion) els.statQuestion.textContent = totalQ;
    if (els.statVocab) els.statVocab.textContent = totalVocab;

    updateGhStatus();
  }

  function renderVocabInfo() {
    const grid = document.getElementById('adminVocabGrid');
    if (!grid) return;
    const data = window.vocabTextbookData || [];
    const byBab = {};
    data.forEach(v => { byBab[v.bab] = (byBab[v.bab] || 0) + 1; });
    grid.innerHTML = Object.entries(byBab).map(([bab, count]) => `
      <div class="admin-vocab-card">
        <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${count}</div>
        <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">${bab}</div>
      </div>`).join('');
  }

  /* ==========================================
     QUIZ EDITOR
     ========================================== */
  function renderQuiz() {
    renderBreadcrumb();
    if (nav.view === 'list') renderPkgList();
    else if (nav.view === 'pkg') renderSecList();
    else if (nav.view === 'sec') renderQuestionList();
  }

  function renderBreadcrumb() {
    if (!els.qzBreadcrumb) return;
    const quizzes = KR.quiz.getQuizzes();
    let html = `<button class="apk-crumb" data-nav="list">Paket</button>`;
    if (nav.pkgId) {
      const pkg = quizzes.find(p => p.id === nav.pkgId);
      if (pkg) html += ` <span class="apk-crumb-sep">/</span> <button class="apk-crumb ${nav.view === 'pkg' ? 'current' : ''}" data-nav="pkg">${pkg.name}</button>`;
    }
    if (nav.secId && nav.pkgId) {
      const pkg = quizzes.find(p => p.id === nav.pkgId);
      const sec = pkg?.sections?.find(s => s.id === nav.secId);
      if (sec) html += ` <span class="apk-crumb-sep">/</span> <span class="apk-crumb current">${sec.name}</span>`;
    }
    els.qzBreadcrumb.innerHTML = html;
    els.qzBreadcrumb.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.nav === 'list') nav = { view: 'list', pkgId: null, secId: null };
        if (btn.dataset.nav === 'pkg') nav.view = 'pkg';
        renderQuiz();
      });
    });
    if (els.qzBackBtn) els.qzBackBtn.classList.toggle('hidden', nav.view === 'list');
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
      row.querySelector('[data-act="open"]').addEventListener('click', () => { nav = { view: 'pkg', pkgId: id, secId: null }; renderQuiz(); });
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editPackage(id));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deletePackage(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderSecList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Tambah Section';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    if (!pkg) { nav.view = 'list'; return renderQuiz(); }
    if (!pkg.sections || !pkg.sections.length) {
      els.qzContainer.innerHTML = `<div class="admin-empty"><i data-lucide="layers" class="w-12 h-12"></i><div>Belum ada section</div></div>`;
    } else {
      els.qzContainer.innerHTML = pkg.sections.map(sec => {
        const isListening = sec.type === 'listening';
        return `
          <div class="admin-row" data-id="${sec.id}">
            <div class="admin-row-icon ${isListening ? 'admin-icon-pink' : ''}">
              <i data-lucide="${isListening ? 'headphones' : 'book-open'}"></i>
            </div>
            <div class="admin-row-body">
              <div class="admin-row-title">${sec.name}</div>
              <div class="admin-row-chips">
                <span class="admin-chip">${isListening ? '🎧 Listening' : '📖 Reading'}</span>
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
      row.querySelector('[data-act="open"]').addEventListener('click', () => { nav.view = 'sec'; nav.secId = id; renderQuiz(); });
      row.querySelector('[data-act="edit"]').addEventListener('click', () => editSection(id));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteSection(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function renderQuestionList() {
    if (els.qzAddBtn) els.qzAddBtn.innerHTML = '<i data-lucide="plus"></i> Tambah Soal';
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === nav.secId);
    if (!sec) { nav.view = 'pkg'; return renderQuiz(); }
    const isListening = sec.type === 'listening';
    if (!sec.questions || !sec.questions.length) {
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
              ${isListening ? `<span class="admin-chip">🎧 ${q.audioTarget || 'question'}</span>` : ''}
              ${q.audioText ? `<span class="admin-chip">"${q.audioText.slice(0, 20)}..."</span>` : ''}
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
      row.querySelector('[data-act="dup"]').addEventListener('click', () => duplicateQuestion(i));
      row.querySelector('[data-act="del"]').addEventListener('click', () => deleteQuestion(i));
    });
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     MODALS — Package / Section / Question
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

  /* ==========================================
     PACKAGE CRUD
     ========================================== */
  function addPackage() {
    openModal({
      icon: 'plus', title: 'Tambah Paket', subtitle: 'Buat paket latihan baru',
      body: `
        <label class="admin-label">Nama Paket *</label>
        <input id="pkgName" class="admin-input-field" placeholder="Contoh: EPS-TOPIK Set 1">
        <label class="admin-label">Deskripsi</label>
        <textarea id="pkgDesc" class="admin-input-field" rows="2" placeholder="Keterangan singkat"></textarea>
        <label class="admin-label">Durasi Total (menit)</label>
        <input id="pkgDur" type="number" class="admin-input-field" value="30" min="1">
      `,
      submitText: 'Tambah',
      onSubmit: () => {
        const name = document.getElementById('pkgName').value.trim();
        if (!name) return KR.toast?.error('Nama wajib diisi');
        const list = KR.quiz.getQuizzes();
        list.push({
          id: 'pkg-' + Date.now().toString(36),
          name, description: document.getElementById('pkgDesc').value.trim(),
          duration: parseInt(document.getElementById('pkgDur').value) || 30,
          sections: [],
        });
        KR.quiz.setQuizzes(list);
        closeModal();
        renderQuiz();
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
        <label class="admin-label">Nama Paket *</label>
        <input id="pkgName" class="admin-input-field" value="${pkg.name}">
        <label class="admin-label">Deskripsi</label>
        <textarea id="pkgDesc" class="admin-input-field" rows="2">${pkg.description || ''}</textarea>
        <label class="admin-label">Durasi Total (menit)</label>
        <input id="pkgDur" type="number" class="admin-input-field" value="${pkg.duration || 30}">
      `,
      onSubmit: () => {
        pkg.name = document.getElementById('pkgName').value.trim() || pkg.name;
        pkg.description = document.getElementById('pkgDesc').value.trim();
        pkg.duration = parseInt(document.getElementById('pkgDur').value) || 30;
        const list = KR.quiz.getQuizzes();
        KR.quiz.setQuizzes(list);
        closeModal();
        renderQuiz();
      },
    });
  }

  function deletePackage(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === id);
    showConfirm({
      title: 'Hapus Paket?', subtitle: pkg?.name,
      message: `Paket <strong>${pkg?.name}</strong> beserta semua soal akan dihapus.`,
      okText: 'Ya, Hapus',
      onOk: () => {
        const list = KR.quiz.getQuizzes().filter(p => p.id !== id);
        KR.quiz.setQuizzes(list);
        renderQuiz();
      },
    });
  }

  /* ==========================================
     SECTION CRUD
     ========================================== */
  function addSection() {
    openModal({
      icon: 'plus', title: 'Tambah Section', subtitle: 'Reading atau Listening',
      body: `
        <label class="admin-label">Nama Section *</label>
        <input id="secName" class="admin-input-field" placeholder="Contoh: Reading Part 1">
        <label class="admin-label">Tipe</label>
        <select id="secType" class="admin-input-field">
          <option value="reading">📖 Reading</option>
          <option value="listening">🎧 Listening</option>
        </select>
        <label class="admin-label">Durasi (menit)</label>
        <input id="secDur" type="number" class="admin-input-field" value="10">
      `,
      onSubmit: () => {
        const name = document.getElementById('secName').value.trim();
        if (!name) return KR.toast?.error('Nama wajib');
        const list = KR.quiz.getQuizzes();
        const pkg = list.find(p => p.id === nav.pkgId);
        pkg.sections = pkg.sections || [];
        pkg.sections.push({
          id: 'sec-' + Date.now().toString(36),
          name,
          type: document.getElementById('secType').value,
          duration: parseInt(document.getElementById('secDur').value) || 10,
          questions: [],
        });
        KR.quiz.setQuizzes(list);
        closeModal();
        renderQuiz();
      },
    });
  }

  function editSection(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === id);
    if (!sec) return;
    openModal({
      icon: 'pencil', title: 'Edit Section', subtitle: sec.name,
      body: `
        <label class="admin-label">Nama Section</label>
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
        closeModal();
        renderQuiz();
      },
    });
  }

  function deleteSection(id) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === id);
    showConfirm({
      title: 'Hapus Section?', subtitle: sec?.name,
      message: `Section <strong>${sec?.name}</strong> dan ${sec?.questions?.length || 0} soal akan dihapus.`,
      onOk: () => {
        pkg.sections = pkg.sections.filter(s => s.id !== id);
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        renderQuiz();
      },
    });
  }

  /* ==========================================
     QUESTION CRUD
     ========================================== */
  function questionFormHtml(q = {}, isListening = false) {
    const type = q.type || (isListening ? 'listening' : 'reading');
    const audioTarget = q.audioTarget || 'question';
    return `
      <label class="admin-label">Tipe Soal</label>
      <div class="admin-type-tabs">
        <button type="button" class="admin-type-btn ${type === 'reading' ? 'active' : ''}" data-qtype="reading">
          <i data-lucide="book-open"></i> Reading
        </button>
        <button type="button" class="admin-type-btn ${type === 'listening' ? 'active' : ''}" data-qtype="listening">
          <i data-lucide="headphones"></i> Listening
        </button>
      </div>
      <input type="hidden" id="qType" value="${type}">

      <label class="admin-label">Teks Pertanyaan</label>
      <textarea id="qText" class="admin-input-field" rows="2" placeholder="Pertanyaan yang ditampilkan ke user">${q.text || ''}</textarea>

      <div id="qAudioWrap" class="${type === 'listening' ? '' : 'hidden'}">
        <label class="admin-label">
          <i data-lucide="volume-2"></i> Teks untuk Audio (TTS)
          <span class="admin-help">Tidak ditampilkan, hanya dibaca sistem</span>
        </label>
        <textarea id="qAudioText" class="admin-input-field" rows="2" placeholder="Contoh: 안녕하세요, 만나서 반갑습니다">${q.audioText || ''}</textarea>

        <label class="admin-label">Audio Muncul Di</label>
        <select id="qAudioTarget" class="admin-input-field">
          <option value="question" ${audioTarget === 'question' ? 'selected' : ''}>Di Pertanyaan</option>
          <option value="options" ${audioTarget === 'options' ? 'selected' : ''}>Di Pilihan Jawaban</option>
          <option value="both" ${audioTarget === 'both' ? 'selected' : ''}>Keduanya</option>
        </select>
      </div>

      <label class="admin-label">Pilihan Jawaban (A, B, C, D)</label>
      <div id="qOptionsList"></div>
      <button type="button" class="admin-add-opt-btn" id="qAddOpt"><i data-lucide="plus"></i> Tambah Opsi</button>

      <label class="admin-label">Jawaban Benar</label>
      <select id="qCorrect" class="admin-input-field"></select>
    `;
  }

  function bindQuestionForm(q, isListening) {
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
          const letter = String.fromCharCode(65 + i);
          return `<option value="${letter}" ${cur === letter ? 'selected' : ''}>${letter}. ${(o.text || '').slice(0, 40) || '(kosong)'}</option>`;
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
          if (options.length <= 2) return KR.toast?.warn('Minimal 2 opsi');
          options.splice(Number(btn.dataset.i), 1);
          options.forEach((o, i) => o.id = String.fromCharCode(65 + i));
          renderOpts();
        });
      });
      if (window.lucide) lucide.createIcons();
    }

    renderOpts();

    document.getElementById('qAddOpt')?.addEventListener('click', () => {
      if (options.length >= 6) return KR.toast?.warn('Maks 6 opsi');
      options.push({ id: String.fromCharCode(65 + options.length), text: '', audioText: '' });
      renderOpts();
    });

    // Tipe soal toggle
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
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === nav.secId);
    if (!sec) return;
    const isListening = sec.type === 'listening';
    let collect;

    openModal({
      icon: 'plus', title: 'Tambah Soal', subtitle: sec.name,
      body: questionFormHtml({ type: isListening ? 'listening' : 'reading' }, isListening),
      submitText: 'Tambah',
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText) return KR.toast?.error('Isi pertanyaan atau audio');
        sec.questions = sec.questions || [];
        sec.questions.push({ id: 'q-' + Date.now().toString(36), ...v });
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal();
        renderQuiz();
      },
    });
    setTimeout(() => { collect = bindQuestionForm({ type: isListening ? 'listening' : 'reading' }, isListening); }, 60);
  }

  function editQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === nav.secId);
    const q = sec?.questions?.[i];
    if (!q) return;
    const isListening = sec.type === 'listening';
    let collect;

    openModal({
      icon: 'pencil', title: 'Edit Soal', subtitle: sec.name,
      body: questionFormHtml(q, isListening), submitText: 'Simpan',
      onSubmit: () => {
        const v = collect();
        if (!v.text && !v.audioText) return KR.toast?.error('Isi pertanyaan');
        Object.assign(q, v);
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        closeModal();
        renderQuiz();
      },
    });
    setTimeout(() => { collect = bindQuestionForm(q, isListening); }, 60);
  }

  function duplicateQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === nav.secId);
    const q = sec?.questions?.[i];
    if (!q) return;
    const dup = JSON.parse(JSON.stringify(q));
    dup.id = 'q-' + Date.now().toString(36);
    sec.questions.push(dup);
    KR.quiz.setQuizzes(KR.quiz.getQuizzes());
    renderQuiz();
  }

  function deleteQuestion(i) {
    const pkg = KR.quiz.getQuizzes().find(p => p.id === nav.pkgId);
    const sec = pkg?.sections?.find(s => s.id === nav.secId);
    showConfirm({
      title: 'Hapus Soal?', subtitle: '',
      message: 'Soal akan dihapus.',
      onOk: () => {
        sec.questions.splice(i, 1);
        KR.quiz.setQuizzes(KR.quiz.getQuizzes());
        renderQuiz();
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
        ? `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Terhubung ke <strong>${cfg.owner}/${cfg.repo}</strong></span>`
        : `<i data-lucide="alert-triangle" class="w-4 h-4"></i><span>Belum dikonfigurasi</span>`;
    }
    if (els.statGh) {
      els.statGh.innerHTML = ok ? `<span class="text-green-600 dark:text-green-400">✓ Terhubung</span>` : `<span class="text-amber-600 dark:text-amber-400">⚠ Belum setup</span>`;
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
    if (r.ok) KR.toast?.success('✅ ' + r.msg);
    else KR.toast?.error('❌ ' + r.msg);
    updateGhStatus();
  }

  async function testGithub() {
    const r = await KR.github.testConnection();
    KR.toast?.[r.ok ? 'success' : 'error'](r.msg);
  }

  function clearGithub() {
    showConfirm({
      title: 'Hapus Config?', message: 'Konfigurasi GitHub akan dihapus.',
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

  /* ==========================================
     PASSWORD
     ========================================== */
  async function changePassword() {
    const oldP = els.passOld?.value || '';
    const newP = els.passNew?.value || '';
    const r = await KR.auth.changePassword(oldP, newP);
    if (r.ok) {
      KR.toast?.success('Password diganti');
      els.passOld.value = '';
      els.passNew.value = '';
    } else {
      KR.toast?.error(r.msg);
    }
  }

  /* ==========================================
     BIND EVENTS
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

    // Quiz nav
    els.qzAddBtn?.addEventListener('click', () => {
      if (nav.view === 'list') addPackage();
      else if (nav.view === 'pkg') addSection();
      else if (nav.view === 'sec') addQuestion();
    });
    els.qzBackBtn?.addEventListener('click', () => {
      if (nav.view === 'sec') { nav.view = 'pkg'; nav.secId = null; renderQuiz(); }
      else if (nav.view === 'pkg') { nav = { view: 'list', pkgId: null, secId: null }; renderQuiz(); }
    });
  }

  return { init, open, close, renderQuiz, switchTab };
})();
