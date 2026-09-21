/* ==========================================
   KR-Dict — Quiz Module v4.2
   + PDF Result (HTML-based, English, beautiful)
   + Certificate (max 3 wrong to unlock)
   ========================================== */
window.KR = window.KR || {};

KR.quiz = (function () {
  'use strict';

  const STORAGE = KR.auth.STORAGE;
  const DATA_KEY = 'quizzes';
  const RESULT_KEY = 'quizResults';
  const CERT_MAX_WRONG = 3; // 👈 syarat sertifikat

  let quizzes = [];
  let activeSession = null;
  let lastResult = null;
  let timerInterval = null;
  let els = {};
  let _certHTML = null;
  let _certFilenameBase = 'Sertifikat';

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

  function getGrade(score) {
    if (score >= 90) return { letter: 'A', label: 'Excellent', color: '#059669' };
    if (score >= 80) return { letter: 'B', label: 'Very Good', color: '#10b981' };
    if (score >= 70) return { letter: 'C', label: 'Good', color: '#6366f1' };
    if (score >= 60) return { letter: 'D', label: 'Pass', color: '#f59e0b' };
    return { letter: 'E', label: 'Keep Learning', color: '#ef4444' };
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
        s.onerror = () => rej(new Error('Failed to load: ' + src));
        document.head.appendChild(s);
      });
      Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
      ]).then(() => resolve(true)).catch(reject);
    });
  }

  async function waitFonts() {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
  }

  function showLoading(text = 'Processing...') {
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
    els.hubHeader?.classList.add('hidden');
    els.testWrap.classList.remove('hidden');
    els.testWrap.classList.add('flex');
    els.testTitle.textContent = activeSession.pkg.name;
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

    // ============ ACTION BUTTONS with CERTIFICATE ELIGIBILITY ============
    const canGetCert = r.wrong <= CERT_MAX_WRONG;
    const remaining = Math.max(0, CERT_MAX_WRONG - r.wrong);

    let actionsHTML = `
      <button class="quiz-action-btn primary" onclick="KR.quiz.downloadResultPDF()">
        <i data-lucide="file-down"></i>
        <div>
          <div class="quiz-action-btn-title">Download PDF Report</div>
          <div class="quiz-action-btn-sub">Full report with answer review</div>
        </div>
      </button>
    `;

    if (canGetCert) {
      actionsHTML += `
        <button class="quiz-action-btn gold" onclick="KR.quiz.generateCertificate()">
          <i data-lucide="award"></i>
          <div>
            <div class="quiz-action-btn-title">Get Certificate</div>
            <div class="quiz-action-btn-sub">Official proof of achievement</div>
          </div>
        </button>
      `;
    } else {
      actionsHTML += `
        <button class="quiz-action-btn locked" disabled>
          <i data-lucide="lock"></i>
          <div>
            <div class="quiz-action-btn-title">Certificate Locked</div>
            <div class="quiz-action-btn-sub">Max ${CERT_MAX_WRONG} wrong to unlock · You had ${r.wrong}</div>
          </div>
        </button>
      `;
    }

    els.resultActions.innerHTML = actionsHTML;

    // Locked message if not eligible
    if (!canGetCert) {
      els.resultActions.insertAdjacentHTML('afterend', `
        <div class="quiz-cert-locked-info">
          <i data-lucide="info"></i>
          <div>
            <div class="quiz-cert-locked-title">Certificate Not Available</div>
            <div class="quiz-cert-locked-desc">
              To receive the official certificate, you must complete the quiz with a maximum of <strong>${CERT_MAX_WRONG} wrong answers</strong>.
              You currently have <strong>${r.wrong} wrong answer${r.wrong > 1 ? 's' : ''}</strong>. Keep practicing!
            </div>
          </div>
        </div>
      `);
    } else {
      const old = document.querySelector('.quiz-cert-locked-info');
      if (old) old.remove();
    }

    // ============ REVIEW TABS ============
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
      items.forEach((d) => {
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

    renderReviewTab('wrong');
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'auto' });
    if (window.lucide) lucide.createIcons();
  }

  function speakText(text) { speak(text); }

  function closeResults() {
    els.resultWrap.classList.add('hidden');
    els.listWrap.classList.remove('hidden');
    els.hubHeader?.classList.remove('hidden');
    const old = document.querySelector('.quiz-cert-locked-info');
    if (old) old.remove();
    activeSession = null;
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     ✅ BUILD PDF RESULT HTML (English, beautiful)
     ========================================== */
  function buildResultHTML(r) {
    const user = (KR.auth?.getUserData?.()?.name) || 'KR-Dict Student';
    const dateStr = new Date(r.at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const grade = getGrade(r.score);
    const unanswered = r.total - r.correct - r.wrong;
    const canGetCert = r.wrong <= CERT_MAX_WRONG;

    // Info cards
    const infoItems = [
      { label: 'Student Name', value: user },
      { label: 'Quiz Package', value: r.pkg.name },
      { label: 'Mode', value: r.mode === 'exam' ? 'Exam (Timed)' : 'Practice (Instant Feedback)' },
      { label: 'Date', value: dateStr },
      { label: 'Duration', value: formatDur(r.duration) },
      { label: 'Grade', value: `${grade.letter} · ${grade.label}` },
    ];
    const infoCardsHTML = infoItems.map(item => `
      <div style="
        background: #f8fafc;
        padding: 14px 18px;
        border-radius: 10px;
        border-left: 3px solid #6366f1;
      ">
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">
          ${item.label}
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.35;">
          ${esc(String(item.value))}
        </div>
      </div>
    `).join('');

    // Stat cards
    const stats = [
      { label: 'Total Questions', value: r.total, color: '#6366f1', bg: '#eef2ff' },
      { label: 'Correct', value: r.correct, color: '#059669', bg: '#ecfdf5' },
      { label: 'Incorrect', value: r.wrong, color: '#dc2626', bg: '#fef2f2' },
      { label: 'Unanswered', value: unanswered, color: '#64748b', bg: '#f1f5f9' },
    ];
    const statsHTML = stats.map(s => `
      <div style="
        background: ${s.bg};
        padding: 16px 12px;
        border-radius: 12px;
        text-align: center;
        border: 1px solid rgba(15,23,42,0.06);
      ">
        <div style="font-size: 26px; font-weight: 900; color: ${s.color}; line-height: 1;">${s.value}</div>
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-top: 6px;">
          ${s.label}
        </div>
      </div>
    `).join('');

    // Review items
    const reviewHTML = r.details.map((d, i) => {
      const isCorrect = d.isCorrect;
      const skipped = !d.userAns;
      const userOpt = (d.options || []).find(o => o.id === d.userAns);
      const correctOpt = (d.options || []).find(o => o.id === d.correct);

      const statusColor = isCorrect ? '#059669' : (skipped ? '#64748b' : '#dc2626');
      const statusBg = isCorrect ? '#ecfdf5' : (skipped ? '#f1f5f9' : '#fef2f2');
      const statusBorder = isCorrect ? '#10b981' : (skipped ? '#94a3b8' : '#ef4444');
      const statusLabel = isCorrect ? '✓ Correct' : (skipped ? '○ Unanswered' : '✗ Incorrect');
      const sectionLabel = d.sectionType === 'listening' ? '🎧 Listening' : '📖 Reading';

      return `
        <div style="
          padding: 16px 18px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-left: 4px solid ${statusBorder};
          border-radius: 10px;
          margin-bottom: 10px;
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="font-size: 12px; font-weight: 800; color: #475569;">
              Question ${i + 1}
            </div>
            <div style="
              padding: 3px 10px;
              border-radius: 99px;
              font-size: 10px;
              font-weight: 800;
              background: ${statusBg};
              color: ${statusColor};
            ">${statusLabel}</div>
            <div style="
              padding: 3px 10px;
              border-radius: 99px;
              font-size: 10px;
              font-weight: 700;
              background: #f1f5f9;
              color: #64748b;
            ">${sectionLabel}</div>
          </div>

          ${d.questionText ? `
            <div style="
              font-family: 'Noto Sans KR', 'Plus Jakarta Sans', sans-serif;
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
              padding: 12px 14px;
              background: #f8fafc;
              border-radius: 8px;
              margin-bottom: 12px;
              line-height: 1.55;
              word-break: break-word;
            ">${esc(d.questionText)}</div>
          ` : ''}

          <div style="font-size: 12px; line-height: 1.6; color: #475569;">
            <div style="margin-bottom: 4px;">
              <span style="color: #94a3b8; font-weight: 700;">Your answer:</span>
              <span style="font-weight: 700; color: ${isCorrect ? '#059669' : (skipped ? '#94a3b8' : '#dc2626')};">
                ${d.userAns ? d.userAns + '. ' + esc(userOpt?.text || '') : '(not answered)'}
              </span>
            </div>
            ${!isCorrect && d.correct ? `
              <div>
                <span style="color: #94a3b8; font-weight: 700;">Correct answer:</span>
                <span style="font-weight: 700; color: #059669;">
                  ${d.correct}. ${esc(correctOpt?.text || '')}
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Certificate status text
    const certStatusText = canGetCert
      ? 'Eligible for Certificate ✓'
      : `Certificate requires max ${CERT_MAX_WRONG} wrong answers`;

    return `
      <div id="pdfRender" style="
        width: 900px;
        background: #ffffff;
        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        color: #1e293b;
        font-size: 13px;
        line-height: 1.5;
      ">

        <!-- HEADER -->
        <div style="
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
          padding: 36px 44px;
          color: #ffffff;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
            <div>
              <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;">KR-Dict</div>
              <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.3em; opacity: 0.92; margin-top: 4px;">LEARNING HUB</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.01em;">Quiz Result Report</div>
              <div style="font-size: 11px; opacity: 0.9; margin-top: 6px;">Generated ${dateStr}</div>
            </div>
          </div>
        </div>

        <!-- BODY -->
        <div style="padding: 36px 44px;">

          <!-- Student Info -->
          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">
            Student Information
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px;">
            ${infoCardsHTML}
          </div>

          <!-- Score Highlight -->
          <div style="
            background: linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%);
            border-radius: 16px;
            padding: 28px 32px;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            gap: 28px;
            border: 1px solid rgba(99,102,241,0.15);
          ">
            <div style="
              width: 140px;
              height: 140px;
              border-radius: 50%;
              background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              flex-shrink: 0;
              box-shadow: 0 12px 28px -10px rgba(99,102,241,0.55);
            ">
              <div style="font-size: 44px; font-weight: 900; line-height: 1;">${r.score}<span style="font-size: 22px;">%</span></div>
              <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; opacity: 0.92; margin-top: 6px;">SCORE</div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 24px; font-weight: 800; color: ${grade.color}; margin-bottom: 8px; line-height: 1.1;">
                Grade ${grade.letter} · ${grade.label}
              </div>
              <div style="font-size: 13px; color: #475569; line-height: 1.65;">
                You completed <strong style="color: #1e293b;">${esc(r.pkg.name)}</strong> with
                <strong style="color: #059669;">${r.correct} correct</strong> out of
                <strong>${r.total}</strong> questions in
                <strong>${formatDur(r.duration)}</strong>.
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">
            Statistics
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px;">
            ${statsHTML}
          </div>

          <!-- Review -->
          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">
            Answer Review
          </div>
          <div>
            ${reviewHTML}
          </div>

        </div>

        <!-- FOOTER -->
        <div style="
          padding: 20px 44px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
        ">
          <div>KR-Dict Learning Hub · © ${new Date().getFullYear()}</div>
          <div>${certStatusText}</div>
        </div>

      </div>
    `;
  }

  /* ==========================================
     ✅ DOWNLOAD PDF (via html2canvas → jsPDF)
     ========================================== */
  async function downloadResultPDF() {
    if (!lastResult) { KR.toast?.error('No result available'); return; }
    showLoading('Generating PDF Report...');
    try {
      await ensurePdfLibs();
      await waitFonts();
      const { jsPDF } = window.jspdf;
      const r = lastResult;

      // Build HTML & insert into hidden container
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;background:#fff;z-index:-1;';
      container.innerHTML = buildResultHTML(r);
      document.body.appendChild(container);

      const target = container.querySelector('#pdfRender');

      // Capture with html2canvas
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 900,
        windowHeight: target.scrollHeight,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // Create PDF A4 portrait
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();   // 210
      const pdfH = pdf.internal.pageSize.getHeight();  // 297

      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;

      // Slice image across pages
      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pdfH;

      while (heightLeft > 0) {
        position -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pdfH;
      }

      // Add page numbers to footer of each page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `Page ${p} of ${totalPages}`,
          pdfW / 2, pdfH - 6,
          { align: 'center' }
        );
      }

      const filename = `Quiz_Report_${r.pkg.name.replace(/[^a-z0-9]/gi, '_')}_${new Date(r.at).toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      KR.toast?.success('✅ PDF report downloaded!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to generate PDF: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     ✅ CERTIFICATE
     ========================================== */
  function buildCertificateHTML({ name, pkgName, score, dateStr, certId, gradeText }) {
    return `
      <div id="certRender" style="
        width: 1123px; height: 794px;
        background: linear-gradient(135deg, #fdfcf7 0%, #faf7f0 100%);
        padding: 0; box-sizing: border-box;
        font-family: 'Playfair Display', Georgia, serif;
        position: relative; overflow: hidden;
        color: #1e293b;
      ">
        <div style="position:absolute; inset:24px; border:3px double #b8860b; border-radius:6px; pointer-events:none;"></div>
        <div style="position:absolute; inset:32px; border:1px solid #d4af37; border-radius:4px; pointer-events:none;"></div>

        <div style="position:absolute; top:16px; left:16px; width:60px; height:60px; border-top:4px solid #b8860b; border-left:4px solid #b8860b; border-top-left-radius:8px;"></div>
        <div style="position:absolute; top:16px; right:16px; width:60px; height:60px; border-top:4px solid #b8860b; border-right:4px solid #b8860b; border-top-right-radius:8px;"></div>
        <div style="position:absolute; bottom:16px; left:16px; width:60px; height:60px; border-bottom:4px solid #b8860b; border-left:4px solid #b8860b; border-bottom-left-radius:8px;"></div>
        <div style="position:absolute; bottom:16px; right:16px; width:60px; height:60px; border-bottom:4px solid #b8860b; border-right:4px solid #b8860b; border-bottom-right-radius:8px;"></div>

        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-25deg); font-size:180px; font-weight:900; color:rgba(184,134,11,0.05); font-family:'Playfair Display',serif; letter-spacing:0.1em; pointer-events:none; user-select:none;">KR-DICT</div>

        <div style="position:relative; padding:70px 90px; text-align:center; height:100%; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;">

          <div>
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

            <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.4em; color:#b8860b; text-transform:uppercase; margin-bottom:4px;">KR-DICT LEARNING HUB</div>
            <div style="width:100px; height:2px; background:#b8860b; margin:0 auto 20px;"></div>

            <h1 style="
              font-size: 58px; font-weight: 900; letter-spacing: 0.02em;
              margin: 0; line-height: 1;
              background: linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #b8860b 100%);
              -webkit-background-clip: text; background-clip: text;
              color: transparent;
            ">CERTIFICATE</h1>
            <p style="font-size:16px; letter-spacing:0.5em; color:#64748b; margin:6px 0 0; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;">OF ACHIEVEMENT</p>
          </div>

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
            ">${esc(name)}</div>

            <p style="font-size:15px; color:#64748b; margin:20px auto 0; max-width:640px; line-height:1.7; font-family:Georgia,serif;">
              for successfully completing the practice quiz
            </p>
            <p style="font-size:22px; font-weight:700; color:#4f46e5; margin:8px 0 0; font-family:'Playfair Display',serif;">
              "${esc(pkgName)}"
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
            ">${score}<span style="font-size:24px;">%</span> · ${gradeText}</div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:20px;">
            <div style="text-align:center; min-width:200px;">
              <div style="font-family:'Playfair Display',serif; font-size:22px; font-style:italic; color:#1e293b; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin-bottom:6px;">KR-Dict</div>
              <div style="font-size:11px; font-weight:800; letter-spacing:0.15em; color:#64748b; text-transform:uppercase; font-family:'Plus Jakarta Sans',sans-serif;">Founder & Director</div>
            </div>

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

  async function generateCertificate() {
    if (!lastResult) { KR.toast?.error('Complete a quiz first'); return; }

    // ✅ CHECK ELIGIBILITY
    if (lastResult.wrong > CERT_MAX_WRONG) {
      KR.toast?.error(`Certificate requires max ${CERT_MAX_WRONG} wrong answers. You have ${lastResult.wrong}.`);
      return;
    }

    showLoading('Generating Certificate...');
    try {
      await ensurePdfLibs();
      await waitFonts();
      const r = lastResult;
      const user = (KR.auth?.getUserData?.()?.name) || 'KR-Dict Student';
      const dateStr = new Date(r.at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const certId = 'KRD-' + r.at.toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const grade = getGrade(r.score);
      const gradeText = `${grade.letter} · ${grade.label.toUpperCase()}`;

      _certHTML = buildCertificateHTML({
        name: user, pkgName: r.pkg.name, score: r.score,
        dateStr, certId, gradeText
      });
      _certFilenameBase = `Certificate_${r.pkg.name.replace(/[^a-z0-9]/gi, '_')}_${user.replace(/[^a-z0-9]/gi, '_')}`;

      els.certPreview.innerHTML = _certHTML;
      els.certModal.classList.remove('hidden');
      els.certModal.classList.add('flex');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to generate certificate');
    } finally {
      hideLoading();
    }
  }

  async function downloadCertificatePDF() {
    if (!_certHTML) return;
    showLoading('Preparing PDF...');
    try {
      await ensurePdfLibs();
      await waitFonts();
      const { jsPDF } = window.jspdf;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-99999px;top:0;';
      container.innerHTML = _certHTML;
      document.body.appendChild(container);

      const target = container.querySelector('#certRender');
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcf7',
        logging: false,
        windowWidth: 1123,
        windowHeight: 794,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(`${_certFilenameBase}.pdf`);
      KR.toast?.success('🎉 Certificate PDF downloaded!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to create certificate PDF');
    } finally {
      hideLoading();
    }
  }

  async function downloadCertificatePNG() {
    if (!_certHTML) return;
    showLoading('Preparing PNG...');
    try {
      await ensurePdfLibs();
      await waitFonts();
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-99999px;top:0;';
      container.innerHTML = _certHTML;
      document.body.appendChild(container);

      const target = container.querySelector('#certRender');
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcf7',
        logging: false,
        windowWidth: 1123,
        windowHeight: 794,
      });
      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `${_certFilenameBase}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      KR.toast?.success('🎉 Certificate PNG downloaded!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to create PNG');
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
