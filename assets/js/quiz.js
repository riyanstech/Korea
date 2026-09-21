/* ==========================================
   KR-Dict — Quiz Module v4.0
   + Responsive layout fix
   + PDF result download
   + Certificate generation
   ========================================== */
window.KR = window.KR || {};

KR.quiz = (function () {
  'use strict';

  const STORAGE = KR.auth.STORAGE;
  const DATA_KEY = 'quizzes';
  const RESULT_KEY = 'quizResults';

  let quizzes = [];
  let activeSession = null;
  let lastResult = null; // simpan hasil terakhir untuk PDF & certificate
  let timerInterval = null;
  let els = {};

  /* ==========================================
     INIT
     ========================================== */
  async function init() {
    els = {
      list: document.getElementById('quizPackGrid'),
      empty: document.getElementById('quizPackEmpty'),
      loading: document.getElementById('quizPackLoading'),
      listWrap: document.getElementById('quizListWrap'),
      hubHeader: document.getElementById('quizHubHeader'),
      setupModal: document.getElementById('quizSetupModal'),
      setupTitle: document.getElementById('quizSetupTitle'),
      setupDesc: document.getElementById('quizSetupDesc'),
      setupInfo: document.getElementById('quizSetupInfo'),
      setupFooter: document.getElementById('quizSetupFooter'),
      setupBackdrop: document.getElementById('quizSetupBackdrop'),
      setupClose: document.getElementById('quizSetupClose'),
      setupCancel: document.getElementById('quizSetupCancel'),
      testWrap: document.getElementById('quizTestWrap'),
      testTitle: document.getElementById('quizTestTitle'),
      testSection: document.getElementById('quizTestSection'),
      testProgress: document.getElementById('quizTestProgress'),
      testProgressBar: document.getElementById('quizTestProgressBar'),
      testTimer: document.getElementById('quizTestTimer'),
      testExit: document.getElementById('quizTestExit'),
      testQ: document.getElementById('quizTestQuestion'),
      testPrev: document.getElementById('quizTestPrev'),
      testNext: document.getElementById('quizTestNext'),
      testSubmit: document.getElementById('quizTestSubmit'),
      testNav: document.getElementById('quizTestNav'),
      resultWrap: document.getElementById('quizResultWrap'),
      resultTitle: document.getElementById('quizResultTitle'),
      resultScore: document.getElementById('quizResultScore'),
      resultStats: document.getElementById('quizResultStats'),
      resultActions: document.getElementById('quizResultActions'),
      resultReview: document.getElementById('quizResultReview'),
      resultClose: document.getElementById('quizResultClose'),
      certModal: document.getElementById('certModal'),
      certPreview: document.getElementById('certPreviewContainer'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      loadingText: document.getElementById('loadingText'),
    };
    if (!els.list) return;

    bindEvents();
    await loadQuizzes();
    window.addEventListener('quizzes:updated', loadQuizzes);
  }

  /* ==========================================
     DATA
     ========================================== */
  async function loadQuizzes() {
    try {
      const override = STORAGE.get(DATA_KEY);
      if (override && Array.isArray(override)) {
        quizzes = override;
      } else {
        const res = await fetch('assets/data/quizzes.json?t=' + Date.now());
        if (!res.ok) throw new Error('quizzes.json tidak ditemukan');
        const data = await res.json();
        quizzes = data.packages || data || [];
      }
      renderList();
    } catch (e) {
      console.warn('[Quiz]', e);
      els.loading?.classList.add('hidden');
      els.empty?.classList.remove('hidden');
    }
  }

  function saveQuizzes() {
    STORAGE.set(DATA_KEY, quizzes);
    window.dispatchEvent(new Event('quizzes:updated'));
    if (KR.github && KR.github.isConfigured()) {
      KR.github.uploadFile('assets/data/quizzes.json', JSON.stringify({ packages: quizzes }, null, 2), 'chore: update quizzes')
        .then(() => KR.toast?.success('✅ Tersimpan ke GitHub'))
        .catch(e => console.warn('[GitHub]', e));
    }
  }

  /* ==========================================
     RENDER LIST
     ========================================== */
  function renderList() {
    els.loading?.classList.add('hidden');
    if (!quizzes.length) {
      els.empty?.classList.remove('hidden');
      return;
    }
    els.empty?.classList.add('hidden');
    els.list.innerHTML = '';

    quizzes.forEach(pkg => {
      const totalQ = (pkg.sections || []).reduce((s, sec) => s + (sec.questions?.length || 0), 0);
      const totalListening = (pkg.sections || []).reduce((s, sec) => s + (sec.questions || []).filter(q => q.type === 'listening').length, 0);
      const totalReading = totalQ - totalListening;

      const card = document.createElement('div');
      card.className = 'glass-card p-6 cursor-pointer hover-lift group relative overflow-hidden';
      card.innerHTML = `
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
        <div class="flex items-start gap-4 mb-4 relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shrink-0">
            <i data-lucide="book-open-check" class="w-7 h-7 text-white"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-1">${esc(pkg.name)}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${esc(pkg.description || '')}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mb-4 relative z-10">
          <span class="quiz-chip quiz-chip-blue"><i data-lucide="book-open" class="w-3 h-3"></i> ${totalReading} Reading</span>
          <span class="quiz-chip quiz-chip-pink"><i data-lucide="headphones" class="w-3 h-3"></i> ${totalListening} Listening</span>
          <span class="quiz-chip quiz-chip-gray"><i data-lucide="clock" class="w-3 h-3"></i> ${pkg.duration || 30} menit</span>
        </div>
        <div class="flex justify-end relative z-10">
          <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
            Mulai <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </span>
        </div>
      `;
      card.addEventListener('click', () => openSetup(pkg));
      els.list.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     SETUP MODAL
     ========================================== */
  function openSetup(pkg) {
    let mode = 'exam';
    let shuffleQ = false;
    let shuffleO = false;

    const sections = pkg.sections || [];
    els.setupTitle.textContent = pkg.name;
    els.setupDesc.textContent = pkg.description || '';

    let infoHtml = '';
    sections.forEach(sec => {
      const isListening = sec.type === 'listening';
      infoHtml += `
        <div class="setup-section-item">
          <div class="setup-section-icon ${isListening ? 'pink' : 'blue'}">
            <i data-lucide="${isListening ? 'headphones' : 'book-open'}" class="w-4 h-4"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm text-gray-800 dark:text-white">${esc(sec.name)}</div>
            <div class="text-xs text-gray-500">${(sec.questions || []).length} soal · ${sec.duration || 0} menit</div>
          </div>
        </div>`;
    });

    els.setupInfo.innerHTML = `
      ${infoHtml}
      <div class="setup-divider"></div>
      <div class="setup-box">
        <div class="setup-label">Mode</div>
        <div class="setup-modes">
          <button class="setup-mode ${mode === 'exam' ? 'active' : ''}" data-mode="exam">
            <i data-lucide="stopwatch"></i>
            <div><div class="setup-mode-title">Ujian</div><div class="setup-mode-desc">Dengan waktu</div></div>
          </button>
          <button class="setup-mode ${mode === 'practice' ? 'active' : ''}" data-mode="practice">
            <i data-lucide="graduation-cap"></i>
            <div><div class="setup-mode-title">Latihan</div><div class="setup-mode-desc">Feedback instan</div></div>
          </button>
        </div>
        <label class="setup-check">
          <input type="checkbox" id="quizSetupShuffleQ"><span class="setup-check-box"></span> Acak urutan soal
        </label>
        <label class="setup-check">
          <input type="checkbox" id="quizSetupShuffleO"><span class="setup-check-box"></span> Acak pilihan jawaban
        </label>
      </div>
    `;

    els.setupFooter.innerHTML = `
      <button id="quizStartBtn" class="btn-primary-gradient w-full py-4 text-base shadow-lg">
        <i data-lucide="play" class="w-5 h-5 mr-2"></i> Mulai Latihan
      </button>`;

    els.setupInfo.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        els.setupInfo.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    document.getElementById('quizStartBtn')?.addEventListener('click', () => {
      shuffleQ = document.getElementById('quizSetupShuffleQ')?.checked || false;
      shuffleO = document.getElementById('quizSetupShuffleO')?.checked || false;
      closeSetup();
      startQuiz(pkg, { mode, shuffleQ, shuffleO });
    });

    els.setupModal.classList.remove('hidden');
    els.setupModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
  }

  function closeSetup() {
    els.setupModal.classList.add('hidden');
    els.setupModal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  /* ==========================================
     HELPERS
     ========================================== */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function esc(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function speak(text, lang = 'ko-KR') {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) u.voice = koVoice;
    window.speechSynthesis.speak(u);
  }

  function formatDur(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /* ==========================================
     LAZY LOAD PDF LIBS
     ========================================== */
  function ensurePdfLibs() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas && window.jspdf) return resolve(true);
      const loadScript = (src) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = () => rej(new Error('Gagal memuat: ' + src));
        document.head.appendChild(s);
      });
      Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
      ]).then(() => resolve(true)).catch(reject);
    });
  }

  function showLoading(text = 'Memproses...') {
    if (els.loadingText) els.loadingText.textContent = text;
    els.loadingOverlay?.classList.remove('hidden');
    els.loadingOverlay?.classList.add('flex');
  }
  function hideLoading() {
    els.loadingOverlay?.classList.add('hidden');
    els.loadingOverlay?.classList.remove('flex');
  }

  /* ==========================================
     START QUIZ
     ========================================== */
  function startQuiz(pkg, config) {
    let flat = [];
    (pkg.sections || []).forEach(sec => {
      (sec.questions || []).forEach(q => {
        flat.push({ section: sec, question: q });
      });
    });

    if (config.shuffleQ) flat = shuffle(flat);
    if (!flat.length) { KR.toast?.warn('Paket belum punya soal'); return; }

    if (config.shuffleO) {
      flat = flat.map(item => {
        const q = item.question;
        if (!q.options || !q.options.length) return item;
        const origOpts = q.options;
        const shuffled = shuffle(origOpts);
        const newOpts = shuffled.map((opt, i) => ({
          ...opt,
          id: String.fromCharCode(65 + i),
          _origId: opt.id || String.fromCharCode(65 + i)
        }));
        let newCorrect = q.correct;
        if (q.correct) {
          const co = newOpts.find(o => o._origId === q.correct);
          if (co) newCorrect = co.id;
        }
        return { ...item, question: { ...q, options: newOpts, correct: newCorrect } };
      });
    }

    activeSession = {
      pkg, mode: config.mode,
      timeLeft: config.mode === 'exam' ? (pkg.duration || 30) * 60 : 0,
      currentIdx: 0,
      flatQuestions: flat,
      answers: {},
      revealed: {},
      startedAt: Date.now(),
    };

    showTestUI();
    if (config.mode === 'exam') startTimer();
    else els.testTimer.textContent = '∞';
    renderQuestion();
  }

  function showTestUI() {
    els.listWrap.classList.add('hidden');
    els.resultWrap.classList.add('hidden');
    els.hubHeader?.classList.add('hidden'); // hide page title
    els.testWrap.classList.remove('hidden');
    els.testWrap.classList.add('flex');
    els.testTitle.textContent = activeSession.pkg.name;
    // Scroll main to top
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'auto' });
  }

  function startTimer() {
    updateTimer();
    timerInterval = setInterval(() => {
      if (!activeSession) return;
      activeSession.timeLeft--;
      updateTimer();
      if (activeSession.timeLeft <= 0) {
        clearInterval(timerInterval);
        KR.toast?.warn('Waktu habis!');
        submitTest();
      }
    }, 1000);
  }

  function updateTimer() {
    if (!activeSession) return;
    const t = Math.max(0, activeSession.timeLeft);
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    els.testTimer.textContent = `${m}:${s}`;
    els.testTimer.classList.toggle('timer-warn', t <= 60);
  }

  /* ==========================================
     RENDER QUESTION
     ========================================== */
  function renderQuestion() {
    const { flatQuestions, currentIdx, answers, mode, revealed } = activeSession;
    const item = flatQuestions[currentIdx];
    if (!item) return;
    const { section, question } = item;
    const isListening = question.type === 'listening';
    const isPractice = mode === 'practice';
    const isRevealed = isPractice && revealed[currentIdx];
    const userAns = answers[currentIdx];

    els.testSection.innerHTML = `
      <span class="quiz-sec-badge ${isListening ? 'pink' : 'blue'}">
        <i data-lucide="${isListening ? 'headphones' : 'book-open'}" class="w-3 h-3"></i>
        ${esc(section.name)}
      </span>`;
    els.testProgress.textContent = `${currentIdx + 1} / ${flatQuestions.length}`;
    els.testProgressBar.style.width = ((currentIdx + 1) / flatQuestions.length * 100) + '%';

    let qHtml = '';

    if (isListening) {
      const audioTarget = question.audioTarget || 'question';
      if (audioTarget === 'question' || audioTarget === 'both') {
        qHtml += `
          <div class="audio-player-card">
            <button class="audio-play-btn" onclick="KR.quiz.playAudio(${currentIdx}, 'question')">
              <i data-lucide="play" class="w-6 h-6"></i>
            </button>
            <div class="audio-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <span class="audio-label">Tap untuk memutar</span>
          </div>`;
      }
    }

    if (question.text) {
      qHtml += `<div class="quiz-question-text">${esc(question.text)}</div>`;
    }
    if (question.image) {
      qHtml += `<div class="quiz-question-image"><img src="${question.image}" alt=""></div>`;
    }

    let optionsHtml = '<div class="quiz-options-grid">';
    (question.options || []).forEach(opt => {
      const selected = userAns === opt.id;
      let cls = 'quiz-option-card';
      if (selected) cls += ' selected';
      if (isRevealed) {
        if (opt.id === question.correct) cls += ' correct';
        else if (selected) cls += ' incorrect';
      }
      const optImg = opt.image ? `<div class="quiz-option-image"><img src="${opt.image}"></div>` : '';
      const optText = opt.text ? `<div class="quiz-option-text">${esc(opt.text)}</div>` : '';
      const optAudioBtn = (isListening && (question.audioTarget === 'options' || question.audioTarget === 'both') && opt.audioText)
        ? `<button class="quiz-opt-audio-btn" onclick="event.stopPropagation(); KR.quiz.playAudio(${currentIdx}, 'opt-${opt.id}')"><i data-lucide="volume-2" class="w-4 h-4"></i></button>`
        : '';
      optionsHtml += `
        <button class="${cls}" data-opt="${opt.id}" ${isRevealed ? 'disabled' : ''}>
          <div class="quiz-option-letter">${opt.id}</div>
          <div class="quiz-option-content">
            ${optText}
            ${optImg}
          </div>
          ${optAudioBtn}
          ${isRevealed && opt.id === question.correct ? '<i data-lucide="check-circle" class="w-5 h-5 text-green-500 shrink-0"></i>' : ''}
          ${isRevealed && selected && opt.id !== question.correct ? '<i data-lucide="x-circle" class="w-5 h-5 text-red-500 shrink-0"></i>' : ''}
        </button>`;
    });
    optionsHtml += '</div>';
    qHtml += optionsHtml;

    if (isPractice && isRevealed) {
      const isCorrect = userAns === question.correct;
      qHtml += `
        <div class="quiz-feedback ${isCorrect ? 'ok' : 'bad'}">
          <i data-lucide="${isCorrect ? 'check-circle' : 'x-circle'}" class="w-6 h-6"></i>
          <div>
            <div class="font-bold">${isCorrect ? 'Benar!' : 'Salah'}</div>
            ${!isCorrect ? `<div class="text-sm mt-1">Jawaban: <strong>${question.correct}</strong></div>` : ''}
          </div>
        </div>`;
    }

    els.testQ.innerHTML = qHtml;

    els.testQ.querySelectorAll('.quiz-option-card:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn.dataset.opt));
    });

    els.testPrev.disabled = currentIdx === 0;
    const isLast = currentIdx === flatQuestions.length - 1;
    els.testNext.classList.toggle('hidden', isLast);
    els.testSubmit.classList.toggle('hidden', !isLast);

    renderNav();
    // Scroll question area to top
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });

    if (isListening && !isRevealed && (question.audioTarget === 'question' || question.audioTarget === 'both') && question.audioText) {
      setTimeout(() => {
        if (activeSession && activeSession.currentIdx === currentIdx) playAudio(currentIdx, 'question');
      }, 400);
    }

    if (window.lucide) lucide.createIcons();
  }

  function playAudio(qIdx, source) {
    if (!activeSession) return;
    const item = activeSession.flatQuestions[qIdx];
    if (!item) return;
    const q = item.question;
    let text = '';
    if (source === 'question') {
      text = q.audioText || q.text || '';
    } else if (source.startsWith('opt-')) {
      const optId = source.slice(4);
      const opt = (q.options || []).find(o => o.id === optId);
      text = opt?.audioText || opt?.text || '';
    }
    if (!text) return;
    speak(text);
    KR.toast?.info('🔊 Memutar audio...', 1000);
  }

  function handleAnswer(optId) {
    const idx = activeSession.currentIdx;
    activeSession.answers[idx] = optId;
    if (activeSession.mode === 'practice') {
      activeSession.revealed[idx] = true;
    }
    renderQuestion();
  }

  function renderNav() {
    els.testNav.innerHTML = '';
    activeSession.flatQuestions.forEach((_, i) => {
      const btn = document.createElement('button');
      const answered = activeSession.answers[i] != null;
      btn.className = 'quiz-nav-dot' + (i === activeSession.currentIdx ? ' current' : '') + (answered ? ' answered' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => {
        activeSession.currentIdx = i;
        renderQuestion();
      });
      els.testNav.appendChild(btn);
    });
  }

  /* ==========================================
     SUBMIT
     ========================================== */
  function submitTest() {
    if (!activeSession) return;
    clearInterval(timerInterval);

    const { pkg, flatQuestions, answers, startedAt, mode } = activeSession;
    let correct = 0, wrong = 0, total = 0;
    const details = flatQuestions.map((item, i) => {
      const userAns = answers[i] || null;
      const isCorrect = userAns === item.question.correct;
      total++;
      if (isCorrect) correct++; else if (userAns) wrong++;
      return {
        sectionName: item.section.name,
        sectionType: item.section.type,
        questionText: item.question.text || '',
        questionType: item.question.type,
        audioText: item.question.audioText || null,
        audioTarget: item.question.audioTarget || null,
        options: (item.question.options || []).map(o => ({ id: o.id, text: o.text || '', audioText: o.audioText || null })),
        correct: item.question.correct,
        userAns,
        isCorrect,
      };
    });

    const duration = Math.round((Date.now() - startedAt) / 1000);
    const score = total ? Math.round((correct / total) * 100) : 0;

    const history = STORAGE.get(RESULT_KEY, []);
    history.unshift({
      id: Date.now().toString(36),
      packageId: pkg.id, packageName: pkg.name,
      mode, score, correct, wrong, total, duration,
      at: Date.now(), details,
    });
    if (history.length > 30) history.length = 30;
    STORAGE.set(RESULT_KEY, history);

    lastResult = { pkg, mode, score, correct, wrong, total, duration, details, at: Date.now() };
    showResults(lastResult);
  }

  /* ==========================================
     RESULTS
     ========================================== */
  function showResults(r) {
    els.testWrap.classList.add('hidden');
    els.testWrap.classList.remove('flex');
    els.resultWrap.classList.remove('hidden');
    els.hubHeader?.classList.add('hidden');

    els.resultTitle.textContent = r.pkg.name;

    const hasScored = r.total > 0;
    const pct = r.score;
    els.resultScore.innerHTML = hasScored ? `
      <div class="quiz-score-circle" style="--pct:${pct}">
        <div class="quiz-score-inner">
          <div class="quiz-score-num">${pct}<span>%</span></div>
          <div class="quiz-score-label">Skor</div>
        </div>
      </div>` : '<div class="text-4xl">🎓</div>';

    els.resultStats.innerHTML = `
      <div class="quiz-stat"><i data-lucide="clock" class="w-5 h-5 text-indigo-500"></i><div><div class="quiz-stat-num">${formatDur(r.duration)}</div><div class="quiz-stat-label">Waktu</div></div></div>
      <div class="quiz-stat"><i data-lucide="check-circle" class="w-5 h-5 text-green-500"></i><div><div class="quiz-stat-num">${r.correct}</div><div class="quiz-stat-label">Benar</div></div></div>
      <div class="quiz-stat"><i data-lucide="x-circle" class="w-5 h-5 text-red-500"></i><div><div class="quiz-stat-num">${r.wrong}</div><div class="quiz-stat-label">Salah</div></div></div>
      <div class="quiz-stat"><i data-lucide="list" class="w-5 h-5 text-purple-500"></i><div><div class="quiz-stat-num">${r.total}</div><div class="quiz-stat-label">Total</div></div></div>`;

    // ACTION BUTTONS
    els.resultActions.innerHTML = `
      <button class="quiz-action-btn primary" onclick="KR.quiz.downloadResultPDF()">
        <i data-lucide="file-down"></i>
        <div>
          <div class="quiz-action-btn-title">Download PDF</div>
          <div class="quiz-action-btn-sub">Rincian jawaban & skor</div>
        </div>
      </button>
      <button class="quiz-action-btn gold" onclick="KR.quiz.generateCertificate()">
        <i data-lucide="award"></i>
        <div>
          <div class="quiz-action-btn-title">Sertifikat</div>
          <div class="quiz-action-btn-sub">Bukti kelulusan resmi</div>
        </div>
      </button>
    `;

    // REVIEW — pisahkan benar/salah
    const wrongItems = r.details.filter(d => !d.isCorrect);
    const correctItems = r.details.filter(d => d.isCorrect);

    let reviewHtml = `
      <div class="quiz-review-tabs">
        <button class="quiz-review-tab active" data-tab="wrong">
          <i data-lucide="x-circle"></i> Salah (${wrongItems.length})
        </button>
        <button class="quiz-review-tab" data-tab="correct">
          <i data-lucide="check-circle"></i> Benar (${correctItems.length})
        </button>
        <button class="quiz-review-tab" data-tab="all">
          <i data-lucide="list"></i> Semua (${r.details.length})
        </button>
      </div>
      <div id="quizReviewContent"></div>
    `;

    els.resultReview.innerHTML = reviewHtml;

    function renderReviewTab(filter) {
      let items = filter === 'wrong' ? wrongItems : filter === 'correct' ? correctItems : r.details;
      if (!items.length) {
        document.getElementById('quizReviewContent').innerHTML = `
          <div class="quiz-review-empty">
            <i data-lucide="${filter === 'wrong' ? 'party-popper' : 'search-x'}"></i>
            <div>${filter === 'wrong' ? 'Sempurna! Tidak ada jawaban salah 🎉' : 'Tidak ada data'}</div>
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      let html = '';
      items.forEach((d, idx) => {
        const origIdx = r.details.indexOf(d);
        const isListening = d.questionType === 'listening';
        const cls = d.isCorrect ? 'correct' : (d.userAns ? 'incorrect' : 'skipped');
        const userOpt = (d.options || []).find(o => o.id === d.userAns);
        const correctOpt = (d.options || []).find(o => o.id === d.correct);
        html += `
          <div class="quiz-review-item ${cls}">
            <div class="quiz-review-head">
              <span class="quiz-review-num">Soal ${origIdx + 1}</span>
              <span class="quiz-review-badge ${cls}">
                <i data-lucide="${d.isCorrect ? 'check' : d.userAns ? 'x' : 'minus'}" class="w-3 h-3"></i>
                ${d.isCorrect ? 'Benar' : d.userAns ? 'Salah' : 'Kosong'}
              </span>
              ${isListening ? '<span class="quiz-review-tag pink"><i data-lucide="headphones" class="w-3 h-3"></i>Listening</span>' : ''}
            </div>
            ${d.questionText ? `<div class="quiz-review-q">${esc(d.questionText)}</div>` : ''}
            ${isListening && d.audioText ? `<div class="quiz-review-audio"><button class="quiz-audio-replay" onclick="KR.quiz.speakText('${d.audioText.replace(/'/g, "\\'")}')"><i data-lucide="play" class="w-4 h-4"></i></button><span class="text-xs text-gray-500 italic">Audio: ${esc(d.audioText)}</span></div>` : ''}
            <div class="quiz-review-answers">
              <div class="quiz-review-row"><span class="quiz-review-label">Jawaban Anda:</span><span class="quiz-review-val ${cls}">${d.userAns ? d.userAns + '. ' + esc(userOpt?.text || '') : '(kosong)'}</span></div>
              ${!d.isCorrect ? `<div class="quiz-review-row"><span class="quiz-review-label">Jawaban Benar:</span><span class="quiz-review-val correct">${d.correct}. ${esc(correctOpt?.text || '')}</span></div>` : ''}
            </div>
          </div>`;
      });
      document.getElementById('quizReviewContent').innerHTML = html;
      if (window.lucide) lucide.createIcons();
    }

    els.resultReview.querySelectorAll('.quiz-review-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        els.resultReview.querySelectorAll('.quiz-review-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderReviewTab(tab.dataset.tab);
      });
    });

    renderReviewTab('wrong'); // default tampilkan yang salah

    // Scroll top
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'auto' });
    if (window.lucide) lucide.createIcons();
  }

  function speakText(text) { speak(text); }

  function closeResults() {
    els.resultWrap.classList.add('hidden');
    els.listWrap.classList.remove('hidden');
    els.hubHeader?.classList.remove('hidden');
    activeSession = null;
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     ✅ DOWNLOAD PDF HASIL
     ========================================== */
  async function downloadResultPDF() {
    if (!lastResult) { KR.toast?.error('Tidak ada hasil'); return; }
    showLoading('Membuat PDF...');
    try {
      await ensurePdfLibs();
      const { jsPDF } = window.jspdf;
      const r = lastResult;
      const user = (KR.auth?.getUserData?.()?.name) || 'Siswa KR-Dict';
      const dateStr = new Date(r.at).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // HEADER
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('KR-Dict Learning Hub', margin, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Laporan Hasil Latihan Soal', margin, 22);

      y = 45;

      // INFO SISWA
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Informasi Peserta', margin, y);
      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const info = [
        ['Nama Peserta', user],
        ['Paket Latihan', r.pkg.name],
        ['Mode', r.mode === 'exam' ? 'Ujian (dengan waktu)' : 'Latihan (feedback instan)'],
        ['Tanggal', dateStr],
      ];
      info.forEach(([k, v]) => {
        doc.setTextColor(100, 116, 139);
        doc.text(k + ':', margin, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(String(v), margin + 45, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      });

      y += 5;

      // SKOR BOX
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, 'F');
      doc.setTextColor(79, 70, 229);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SKOR AKHIR', margin + 5, y + 8);
      doc.setFontSize(26);
      doc.text(`${r.score}%`, margin + 5, y + 22);
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`${r.correct} benar / ${r.total} soal`, margin + 60, y + 15);
      doc.text(`Waktu: ${formatDur(r.duration)}`, margin + 60, y + 22);
      y += 40;

      // STATISTIK
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Statistik', margin, y);
      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      const stats = [
        ['Total Soal', String(r.total)],
        ['Jawaban Benar', String(r.correct)],
        ['Jawaban Salah', String(r.wrong)],
        ['Tidak Dijawab', String(r.total - r.correct - r.wrong)],
      ];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      stats.forEach(([k, v]) => {
        doc.setTextColor(100, 116, 139);
        doc.text(k, margin, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(v, margin + 60, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      });

      y += 10;

      // REVIEW SOAL
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Rincian Jawaban', margin, y);
      y += 2;
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      doc.setFontSize(10);
      r.details.forEach((d, i) => {
        if (y > pageH - 40) {
          doc.addPage();
          y = margin;
        }
        const isCorrect = d.isCorrect;
        const userOpt = (d.options || []).find(o => o.id === d.userAns);
        const correctOpt = (d.options || []).find(o => o.id === d.correct);

        // Nomor + status
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isCorrect ? 5 : (d.userAns ? 220 : 148), isCorrect ? 150 : (38), isCorrect ? 105 : (38));
        doc.text(`Soal ${i + 1}`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(isCorrect ? '✓ Benar' : d.userAns ? '✗ Salah' : '○ Kosong', margin + 20, y);
        doc.setFontSize(10);
        y += 5;

        // Pertanyaan
        if (d.questionText) {
          doc.setTextColor(15, 23, 42);
          const qLines = doc.splitTextToSize(d.questionText, pageW - margin * 2);
          qLines.forEach(line => {
            if (y > pageH - 20) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += 5;
          });
        }

        // Jawaban user & benar
        doc.setFontSize(9);
        if (!isCorrect) {
          doc.setTextColor(220, 38, 38);
          const uLine = `Jawaban Anda: ${d.userAns || '(kosong)'}. ${userOpt?.text || ''}`;
          const uLines = doc.splitTextToSize(uLine, pageW - margin * 2);
          uLines.forEach(line => {
            if (y > pageH - 20) { doc.addPage(); y = margin; }
            doc.text(line, margin + 4, y);
            y += 5;
          });
          doc.setTextColor(5, 150, 105);
          const cLine = `Jawaban Benar: ${d.correct}. ${correctOpt?.text || ''}`;
          const cLines = doc.splitTextToSize(cLine, pageW - margin * 2);
          cLines.forEach(line => {
            if (y > pageH - 20) { doc.addPage(); y = margin; }
            doc.text(line, margin + 4, y);
            y += 5;
          });
        } else {
          doc.setTextColor(100, 116, 139);
          const line = `Jawaban: ${d.userAns}. ${userOpt?.text || ''}`;
          const lines = doc.splitTextToSize(line, pageW - margin * 2);
          lines.forEach(l => {
            if (y > pageH - 20) { doc.addPage(); y = margin; }
            doc.text(l, margin + 4, y);
            y += 5;
          });
        }

        // Garis pemisah
        y += 3;
        if (y > pageH - 15) { doc.addPage(); y = margin; }
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      });

      // FOOTER setiap halaman
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `KR-Dict Learning Hub — Halaman ${p}/${totalPages}`,
          pageW / 2, pageH - 8,
          { align: 'center' }
        );
      }

      const filename = `Hasil-Latihan_${r.pkg.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(r.at).toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      KR.toast?.success('✅ PDF berhasil di-download!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Gagal membuat PDF: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     ✅ CERTIFICATE
     ========================================== */
  function buildCertificateHTML({ name, pkgName, score, dateStr, certId, grade }) {
    // A4 landscape ~ 1123 x 794 px
    return `
      <div id="certRender" style="
        width: 1123px; height: 794px;
        background: linear-gradient(135deg, #fdfcf7 0%, #faf7f0 100%);
        padding: 0; box-sizing: border-box;
        font-family: 'Playfair Display', Georgia, serif;
        position: relative; overflow: hidden;
        color: #1e293b;
      ">
        <!-- Outer decorative border -->
        <div style="position:absolute; inset:24px; border:3px double #b8860b; border-radius:6px; pointer-events:none;"></div>
        <div style="position:absolute; inset:32px; border:1px solid #d4af37; border-radius:4px; pointer-events:none;"></div>

        <!-- Corner ornaments -->
        <div style="position:absolute; top:16px; left:16px; width:60px; height:60px; border-top:4px solid #b8860b; border-left:4px solid #b8860b; border-top-left-radius:8px;"></div>
        <div style="position:absolute; top:16px; right:16px; width:60px; height:60px; border-top:4px solid #b8860b; border-right:4px solid #b8860b; border-top-right-radius:8px;"></div>
        <div style="position:absolute; bottom:16px; left:16px; width:60px; height:60px; border-bottom:4px solid #b8860b; border-left:4px solid #b8860b; border-bottom-left-radius:8px;"></div>
        <div style="position:absolute; bottom:16px; right:16px; width:60px; height:60px; border-bottom:4px solid #b8860b; border-right:4px solid #b8860b; border-bottom-right-radius:8px;"></div>

        <!-- Watermark -->
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-25deg); font-size:180px; font-weight:900; color:rgba(184,134,11,0.05); font-family:'Playfair Display',serif; letter-spacing:0.1em; pointer-events:none; user-select:none;">KR-DICT</div>

        <!-- Content -->
        <div style="position:relative; padding:70px 90px; text-align:center; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">

          <!-- Top -->
          <div>
            <!-- Crest / Emblem -->
            <div style="
              width: 88px; height: 88px; margin: 0 auto 12px;
              border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #f5d67b 0%, #d4af37 40%, #b8860b 100%);
              box-shadow: 0 6px 20px rgba(184,134,11,0.4), inset 0 -4px 8px rgba(0,0,0,0.15);
              display: grid; place-items: center;
              border: 3px solid #fff8e1;
              position: relative;
            ">
              <div style="font-size:44px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));">🏆</div>
            </div>

            <!-- Brand -->
            <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.4em; color:#b8860b; text-transform:uppercase; margin-bottom:4px;">KR-DICT LEARNING HUB</div>
            <div style="width:100px; height:2px; background:#b8860b; margin:0 auto 20px;"></div>

            <!-- Main Title -->
            <h1 style="
              font-size: 58px; font-weight: 900; letter-spacing: 0.02em;
              margin: 0; line-height: 1;
              background: linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #b8860b 100%);
              -webkit-background-clip: text; background-clip: text;
              color: transparent;
            ">CERTIFICATE</h1>
            <p style="font-size:16px; letter-spacing:0.5em; color:#64748b; margin:6px 0 0; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;">OF ACHIEVEMENT</p>
          </div>

          <!-- Middle -->
          <div>
            <p style="font-size:15px; color:#64748b; margin:0 0 12px; font-style:italic; font-family:Georgia,serif;">This certificate is proudly presented to</p>

            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 48px; font-weight: 700; color: #1e293b;
              padding: 8px 40px; margin: 0 auto 4px;
              display: inline-block;
              border-bottom: 2px solid #d4af37;
              letter-spacing: 0.02em;
              line-height: 1.15;
            ">${escapeHtml(name)}</div>

            <p style="font-size:15px; color:#64748b; margin:20px auto 0; max-width:640px; line-height:1.7; font-family:Georgia,serif;">
              for successfully completing the practice quiz
            </p>
            <p style="font-size:22px; font-weight:700; color:#4f46e5; margin:8px 0 0; font-family:'Playfair Display',serif;">
              "${escapeHtml(pkgName)}"
            </p>
            <p style="font-size:15px; color:#64748b; margin:12px 0 0; font-family:Georgia,serif;">
              with an outstanding score of
            </p>
            <div style="
              font-family: 'Playfair Display', serif;
              font-size: 42px; font-weight: 900; margin: 6px 0 0;
              background: linear-gradient(135deg, #b8860b, #d4af37);
              -webkit-background-clip: text; background-clip: text;
              color: transparent;
            ">${score}<span style="font-size:24px;">%</span> · ${grade}</div>
          </div>

          <!-- Bottom -->
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px;">
            <!-- Signature -->
            <div style="text-align:center; min-width:200px;">
              <div style="font-family:'Playfair Display',serif; font-size:22px; font-style:italic; color:#1e293b; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin-bottom:6px;">KR-Dict</div>
              <div style="font-size:11px; font-weight:800; letter-spacing:0.15em; color:#64748b; text-transform:uppercase; font-family:'Plus Jakarta Sans',sans-serif;">Founder & Director</div>
            </div>

            <!-- Gold seal -->
            <div style="
              width: 90px; height: 90px; border-radius: 50%;
              background: radial-gradient(circle, #d4af37 0%, #b8860b 70%, #8b6508 100%);
              display: grid; place-items: center;
              color: #fff8e1; font-family: 'Playfair Display',serif; font-weight:900; font-size:11px;
              box-shadow: 0 6px 16px rgba(184,134,11,0.5), inset 0 0 0 3px #fff8e1, inset 0 0 0 5px #d4af37;
              text-align: center; line-height:1.2; padding: 8px;
              letter-spacing: 0.05em;
            ">
              <div>
                OFFICIAL<br>
                <span style="font-size:18px;">★</span><br>
                SEAL
              </div>
            </div>

            <!-- Meta -->
            <div style="text-align:right; min-width:200px; font-family:'Plus Jakarta Sans',sans-serif;">
              <div style="font-size:10px; font-weight:800; letter-spacing:0.15em; color:#94a3b8; text-transform:uppercase;">Issued Date</div>
              <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:8px;">${dateStr}</div>
              <div style="font-size:10px; font-weight:800; letter-spacing:0.15em; color:#94a3b8; text-transform:uppercase;">Certificate ID</div>
              <div style="font-size:12px; font-weight:700; color:#1e293b; font-family:monospace;">${certId}</div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function getGrade(score) {
    if (score >= 90) return 'A · EXCELLENT';
    if (score >= 80) return 'B · VERY GOOD';
    if (score >= 70) return 'C · GOOD';
    if (score >= 60) return 'D · PASS';
    return 'E · KEEP LEARNING';
  }

  async function generateCertificate() {
    if (!lastResult) { KR.toast?.error('Kerjakan latihan dulu'); return; }
    showLoading('Membuat sertifikat...');
    try {
      await ensurePdfLibs();
      const r = lastResult;
      const user = (KR.auth?.getUserData?.()?.name) || 'Siswa KR-Dict';
      const dateStr = new Date(r.at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const certId = 'KRD-' + r.at.toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const grade = getGrade(r.score);

      const html = buildCertificateHTML({
        name: user, pkgName: r.pkg.name, score: r.score,
        dateStr, certId, grade
      });

      // Show in modal
      els.certPreview.innerHTML = html;
      els.certModal.classList.remove('hidden');
      els.certModal.classList.add('flex');

      // Store for download
      _certHTML = html;
      _certFilenameBase = `Sertifikat_${r.pkg.name.replace(/[^a-z0-9]/gi, '_')}_${user.replace(/[^a-z0-9]/gi, '_')}`;
    } catch (err) {
      console.error(err);
      KR.toast?.error('Gagal membuat sertifikat');
    } finally {
      hideLoading();
    }
  }

  let _certHTML = null;
  let _certFilenameBase = 'Sertifikat';

  async function downloadCertificatePDF() {
    if (!_certHTML) return;
    showLoading('Menyiapkan PDF...');
    try {
      await ensurePdfLibs();
      const { jsPDF } = window.jspdf;
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.innerHTML = _certHTML;
      document.body.appendChild(container);

      const target = container.querySelector('#certRender');
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcf7',
        logging: false,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(`${_certFilenameBase}.pdf`);
      KR.toast?.success('🎉 Sertifikat PDF berhasil di-download!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Gagal membuat PDF sertifikat');
    } finally {
      hideLoading();
    }
  }

  async function downloadCertificatePNG() {
    if (!_certHTML) return;
    showLoading('Menyiapkan PNG...');
    try {
      await ensurePdfLibs();
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.innerHTML = _certHTML;
      document.body.appendChild(container);

      const target = container.querySelector('#certRender');
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcf7',
        logging: false,
      });
      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `${_certFilenameBase}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      KR.toast?.success('🎉 Sertifikat PNG berhasil di-download!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Gagal membuat PNG');
    } finally {
      hideLoading();
    }
  }

  function closeCertModal() {
    els.certModal.classList.add('hidden');
    els.certModal.classList.remove('flex');
  }

  /* ==========================================
     EVENTS
     ========================================== */
  function bindEvents() {
    els.setupClose?.addEventListener('click', closeSetup);
    els.setupCancel?.addEventListener('click', closeSetup);
    els.setupBackdrop?.addEventListener('click', closeSetup);
    els.testPrev?.addEventListener('click', () => {
      if (!activeSession || activeSession.currentIdx <= 0) return;
      activeSession.currentIdx--;
      renderQuestion();
    });
    els.testNext?.addEventListener('click', () => {
      if (!activeSession) return;
      if (activeSession.currentIdx >= activeSession.flatQuestions.length - 1) return;
      activeSession.currentIdx++;
      renderQuestion();
    });
    els.testSubmit?.addEventListener('click', () => {
      if (confirm('Kirim jawaban sekarang?')) submitTest();
    });
    els.testExit?.addEventListener('click', () => {
      if (confirm('Keluar dari latihan? Progress akan hilang.')) {
        clearInterval(timerInterval);
        els.testWrap.classList.add('hidden');
        els.testWrap.classList.remove('flex');
        els.listWrap.classList.remove('hidden');
        els.hubHeader?.classList.remove('hidden');
        activeSession = null;
        if (window.lucide) lucide.createIcons();
      }
    });
    els.resultClose?.addEventListener('click', closeResults);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.certModal.classList.contains('hidden')) {
        closeCertModal();
      }
    });
  }

  return {
    init, reload: loadQuizzes,
    playAudio, speakText,
    downloadResultPDF, generateCertificate,
    downloadCertificatePDF, downloadCertificatePNG,
    closeCertModal,
    getQuizzes: () => quizzes,
    saveQuizzes,
    setQuizzes: (arr) => { quizzes = arr; saveQuizzes(); renderList(); },
  };
})();
