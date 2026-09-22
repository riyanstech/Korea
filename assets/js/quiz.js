/* ==========================================
   KR-Dict — Quiz Module v8.5 (FINAL)
   + FIX: Next button double-jump (init guard)
   + Auto-split multi-line
   + Tiered Certificates (Diamond/Gold/Silver)
   + Canvas-based (100% reliable)
   ========================================== */
window.KR = window.KR || {};

KR.quiz = (function () {
  'use strict';

  console.log('%c[KR-Dict Quiz] %cv8.5 — FIXED Next Double-Jump',
    'color:#6366f1;font-weight:800',
    'color:#10b981;font-weight:700');

  const STORAGE = KR.auth.STORAGE;
  const DATA_KEY = 'quizzes';
  const RESULT_KEY = 'quizResults';
  const CERT_MAX_WRONG = 3;

  /* ==========================================
     TIER CONFIGURATION
     ========================================== */
  /* ==========================================
     CERTIFICATE CONFIG — Single tier
     ========================================== */
  const CERT_TIER = {
    id: 'official',
    name: 'Certificate of Achievement',
    title: 'Korean Language Competency',
    primary: '#c9a961',
    accent: '#e6d9b3',
    sealColors: ['#e6d9b3', '#c9a961', '#9d7f45', '#6d5530'],
    tierGradient: ['#c9a961', '#9d7f45', '#6d5530'],
  };

  function getCertTier() {
    return CERT_TIER;
  }

  let quizzes = [];
  let activeSession = null;
  let lastResult = null;
  let timerInterval = null;
  let els = {};
  let _certCanvas = null;
  let _certFilenameBase = 'Certificate';
  let _inited = false;  // ✅ GUARD FLAG: cegah double init

  /* ==========================================
     INIT
     ========================================== */
  async function init() {
    // ✅ GUARD: kalau sudah pernah init, cuma refresh data
    if (_inited) {
      await loadQuizzes();
      return;
    }
    _inited = true;
    window.__KR_QUIZ_LISTENER_ADDED__ = window.__KR_QUIZ_LISTENER_ADDED__ || false;

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
      historyWrap: document.getElementById('quizHistoryWrap'),
      historyContent: document.getElementById('quizHistoryContent'),
      historyBtn: document.getElementById('quizHistoryBtn'),
    };

    if (!els.list) {
      _inited = false; // reset kalau gagal init
      return;
    }

    bindEvents();
    await loadQuizzes();
    // ✅ FIXED: cegah listener duplikat kalau init dipanggil lagi
    if (!window.__KR_QUIZ_LISTENER_ADDED__) {
      window.addEventListener('quizzes:updated', loadQuizzes);
      window.__KR_QUIZ_LISTENER_ADDED__ = true;
    }
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
/* ==========================================
   ✅ Format Markup Quiz
   Support: [[underline]] **bold** __underline__ *italic*
   Aman dari XSS karena escape dulu sebelum convert
   ========================================== */
function formatQuizMarkup(text) {
  if (text === null || text === undefined) return '';
  let s = String(text);
  s = s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  s = s.replace(/\[\[([^\]]+?)\]\]/g, '<u>$1</u>');
  s = s.replace(/__([^_]+?)__/g, '<u>$1</u>');
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/\n/g, '<br>');

  return s;
}

function escMultiline(s = '') {
  let text = String(s || '');
  if (!text.includes('\n')) {
    text = text.replace(/([.?!])\s+(?=[가-힣ㄱ-ㅎㅏ-ㅣ\d\[(])/g, '$1\n');
  }
  return formatQuizMarkup(text);
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
     LAZY LOAD LIBS
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
      try {
        await Promise.all([
          document.fonts.load('400 15px "Playfair Display"'),
          document.fonts.load('700 44px "Playfair Display"'),
          document.fonts.load('900 56px "Playfair Display"'),
          document.fonts.load('italic 22px "Playfair Display"'),
          document.fonts.load('400 13px "Plus Jakarta Sans"'),
          document.fonts.load('800 12px "Plus Jakarta Sans"'),
          document.fonts.load('700 14px Georgia'),
        ]);
      } catch {}
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
      qHtml += `<div class="quiz-question-text">${escMultiline(question.text)}</div>`;
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
      const optText = opt.text ? `<div class="quiz-option-text">${escMultiline(opt.text)}</div>` : '';
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

    // ✅ Tombol Submit selalu kelihatan di soal terakhir
    if (isLast) {
      els.testSubmit.classList.remove('hidden');
      els.testSubmit.disabled = false;  // ✅ SELALU BISA DIKLIK

      const answeredCount = Object.keys(answers).filter(k => answers[k] != null).length;
      const totalCount = flatQuestions.length;
      const allAnswered = answeredCount === totalCount;

      // Update label tombol saja (JANGAN disable)
      if (allAnswered) {
        els.testSubmit.innerHTML = `
          <i data-lucide="send" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Kirim</span>`;
        els.testSubmit.classList.remove('opacity-60');
      } else {
        const remaining = totalCount - answeredCount;
        els.testSubmit.innerHTML = `
          <i data-lucide="alert-circle" class="w-4 h-4"></i>
          <span class="hidden sm:inline">Sisa ${remaining} soal</span>`;
        // Tetap boleh klik, cuma kasih hint visual
        els.testSubmit.classList.add('opacity-60');
      }
    } else {
      els.testSubmit.classList.add('hidden');
    }

    renderNav();
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });

    // ✅ REMOVED: auto-play audio. Sekarang audio HANYA diputar saat user klik tombol play.

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

    // ✅ Update tombol submit langsung kalau user sedang di soal terakhir
    if (activeSession && activeSession.currentIdx === activeSession.flatQuestions.length - 1) {
      // renderQuestion sudah update, tapi kalau perlu tambahan logic bisa di sini
    }
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
        questionImage: item.question.image || null,
        audioText: item.question.audioText || null,
        audioTarget: item.question.audioTarget || null,
        options: (item.question.options || []).map(o => ({
          id: o.id,
          text: o.text || '',
          audioText: o.audioText || null,
          image: o.image || null,
        })),
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

    const canGetCert = r.wrong <= CERT_MAX_WRONG;
    const tier = getCertTier(r.wrong);

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
      const tierStyle = `background: linear-gradient(135deg, #c9a961 0%, #9d7f45 50%, #6d5530 100%);`;
      actionsHTML += `
        <button class="quiz-action-btn gold" style="${tierStyle}" onclick="KR.quiz.generateCertificate()">
          <i data-lucide="award"></i>
          <div>
            <div class="quiz-action-btn-title">Get Certificate</div>
            <div class="quiz-action-btn-sub">Certificate of Achievement</div>
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

    const existingLocked = document.querySelector('.quiz-cert-locked-info');
    if (existingLocked) existingLocked.remove();

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
    }

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
            ${d.questionText ? `<div class="quiz-review-q">${escMultiline(d.questionText)}</div>` : ''}
            ${d.questionImage ? `<div class="quiz-review-image"><img src="${d.questionImage}" alt=""></div>` : ''}
            ${isListening && d.audioText ? `<div class="quiz-review-audio"><button class="quiz-audio-replay" data-audio-text="${esc(d.audioText)}" onclick="KR.quiz.speakText(this.dataset.audioText)"><i data-lucide="play" class="w-4 h-4"></i></button><span class="text-xs text-gray-500 italic">Audio: ${esc(d.audioText)}</span></div>` : ''}
            <div class="quiz-review-answers">
              <div class="quiz-review-row"><span class="quiz-review-label">Jawaban Anda:</span><span class="quiz-review-val ${cls}">${d.userAns ? d.userAns + '. ' + escMultiline(userOpt?.text || '') : '(kosong)'}</span></div>
              ${!d.isCorrect ? `<div class="quiz-review-row"><span class="quiz-review-label">Jawaban Benar:</span><span class="quiz-review-val correct">${d.correct}. ${escMultiline(correctOpt?.text || '')}</span></div>` : ''}
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
    const old = document.querySelector('.quiz-cert-locked-info');
    if (old) old.remove();
    activeSession = null;

    // ✅ Jika user sedang lihat detail dari riwayat, kembali ke history view
    if (window.__KR_VIEWING_HISTORY__) {
      window.__KR_VIEWING_HISTORY__ = false;
      els.historyWrap?.classList.remove('hidden');
      renderHistory();
    } else {
      els.listWrap.classList.remove('hidden');
      els.hubHeader?.classList.remove('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================
     ✅ RIWAYAT HASIL — Fitur baru
     ========================================== */
  function showHistory() {
    els.listWrap.classList.add('hidden');
    els.hubHeader?.classList.add('hidden');
    els.testWrap.classList.add('hidden');
    els.testWrap.classList.remove('flex');
    els.resultWrap.classList.add('hidden');
    els.historyWrap.classList.remove('hidden');
    renderHistory();
    document.querySelector('main.app-main')?.scrollTo({ top: 0, behavior: 'auto' });
    if (window.lucide) lucide.createIcons();
  }

  function closeHistory() {
    els.historyWrap.classList.add('hidden');
    els.listWrap.classList.remove('hidden');
    els.hubHeader?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function formatDateShort(ts) {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hour}.${min}`;
  }

  function buildHistoryChart(history) {
    // Ambil maksimal 20 terbaru, urut lama → baru (kiri → kanan)
    const sorted = [...history]
      .sort((a, b) => a.at - b.at)
      .slice(-20);

    const n = sorted.length;
    const W = 600, H = 220;
    const pad = { top: 24, right: 24, bottom: 34, left: 46 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    // Grid horizontal
    let gridHtml = '';
    [0, 25, 50, 75, 100].forEach(val => {
      const y = pad.top + innerH - (val / 100) * innerH;
      gridHtml += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="rgba(148,163,184,0.25)" stroke-width="1" stroke-dasharray="3,3"/>`;
      gridHtml += `<text x="${pad.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" font-weight="700" fill="#94a3b8">${val}%</text>`;
    });

    // Titik-titik
    const points = sorted.map((item, i) => {
      const x = n === 1
        ? pad.left + innerW / 2
        : pad.left + (i / (n - 1)) * innerW;
      const y = pad.top + innerH - (Math.max(0, Math.min(100, item.score)) / 100) * innerH;
      return { x, y, score: item.score, at: item.at };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

    // Area gradient di bawah line
    let areaPath = '';
    if (points.length > 1) {
      const first = points[0];
      const last = points[points.length - 1];
      areaPath = `M ${first.x},${pad.top + innerH} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${last.x},${pad.top + innerH} Z`;
    }

    // Dots + label
    let dotsHtml = '';
    const showLabel = n <= 10;
    points.forEach((p, i) => {
      const isLatest = i === points.length - 1;
      dotsHtml += `<circle cx="${p.x}" cy="${p.y}" r="${isLatest ? 6 : 4}" fill="#6366f1" stroke="#ffffff" stroke-width="2.5"/>`;
      if (showLabel) {
        dotsHtml += `<text x="${p.x}" y="${p.y - 13}" text-anchor="middle" font-size="10" font-weight="800" fill="#4f46e5">${p.score}</text>`;
      }
    });

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridHtml}
        ${areaPath ? `<path d="${areaPath}" fill="url(#areaGrad)"/>` : ''}
        ${points.length > 1 ? `<polyline points="${polyline}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${dotsHtml}
      </svg>
    `;
  }

  function renderHistory() {
    const history = STORAGE.get(RESULT_KEY, []);
    const container = els.historyContent;
    if (!container) return;

    // Empty state
    if (!history.length) {
      container.innerHTML = `
        <div class="text-center mb-6">
          <button onclick="KR.quiz.closeHistory()" class="btn-ghost mb-4 inline-flex items-center gap-2">
            <i data-lucide="arrow-left"></i> Kembali
          </button>
          <h2 class="text-2xl font-bold dark:text-white">Riwayat Hasil</h2>
          <p class="text-sm text-gray-500 mt-1">Perkembangan skor latihan Anda</p>
        </div>
        <div class="quiz-review-empty glass-card" style="padding:60px 20px;">
          <i data-lucide="inbox"></i>
          <div style="font-size:1rem;font-weight:800;margin-top:8px;">Belum Ada Riwayat</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Selesaikan latihan pertamamu untuk melihat statistik di sini</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Statistik
    const total = history.length;
    const best = Math.max(...history.map(h => h.score));
    const avg = Math.round(history.reduce((s, h) => s + h.score, 0) / total);

    // Sort dari terbaru untuk list
    const sortedList = [...history].sort((a, b) => b.at - a.at);

    // Render
    container.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button onclick="KR.quiz.closeHistory()" class="btn-ghost inline-flex items-center gap-2">
          <i data-lucide="arrow-left"></i> Kembali
        </button>
        <button onclick="KR.quiz.clearAllHistory()" class="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-2">
          <i data-lucide="trash-2"></i> Hapus Semua
        </button>
      </div>

      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold dark:text-white">Riwayat Hasil</h2>
        <p class="text-sm text-gray-500 mt-1">Perkembangan skor latihan Anda</p>
      </div>

      <!-- Stat Cards -->
      <div class="quiz-history-stats">
        <div class="quiz-history-stat">
          <div class="quiz-history-stat-icon stat-purple"><i data-lucide="list-checks"></i></div>
          <div>
            <div class="quiz-history-stat-num">${total}</div>
            <div class="quiz-history-stat-label">Total Percobaan</div>
          </div>
        </div>
        <div class="quiz-history-stat">
          <div class="quiz-history-stat-icon stat-green"><i data-lucide="trophy"></i></div>
          <div>
            <div class="quiz-history-stat-num">${best}%</div>
            <div class="quiz-history-stat-label">Skor Terbaik</div>
          </div>
        </div>
        <div class="quiz-history-stat">
          <div class="quiz-history-stat-icon stat-amber"><i data-lucide="trending-up"></i></div>
          <div>
            <div class="quiz-history-stat-num">${avg}%</div>
            <div class="quiz-history-stat-label">Rata-Rata</div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="quiz-history-chart-card">
        <div class="quiz-history-chart-title">
          <i data-lucide="line-chart"></i> Perkembangan Skor
        </div>
        ${total >= 2 ? buildHistoryChart(history) : `
          <div class="quiz-review-empty" style="padding:32px 20px;">
            <i data-lucide="line-chart"></i>
            <div style="font-size:0.85rem;">Butuh minimal 2 hasil untuk menampilkan grafik</div>
          </div>
        `}
      </div>

      <!-- List Riwayat -->
      <div class="mt-8">
        <div class="quiz-history-chart-title" style="margin-bottom:14px;">
          <i data-lucide="history"></i> Daftar Latihan
        </div>
        <div class="quiz-history-list">
          ${sortedList.map(h => `
            <div class="quiz-history-item">
              <div class="quiz-history-score-badge ${h.score >= 80 ? 'good' : h.score >= 60 ? 'medium' : 'low'}">
                ${h.score}<span>%</span>
              </div>
              <div class="quiz-history-body">
                <div class="quiz-history-title">${esc(h.packageName || 'Latihan')}</div>
                <div class="quiz-history-meta">
                  <span class="chip ${h.mode === 'exam' ? 'primary' : 'success'}" style="font-size:0.65rem;">
                    ${h.mode === 'exam' ? '📝 UJIAN' : '📚 LATIHAN'}
                  </span>
                  <span class="quiz-history-meta-text"><i data-lucide="clock" style="width:11px;height:11px;"></i>${formatDur(h.duration || 0)}</span>
                  <span class="quiz-history-meta-text"><i data-lucide="calendar" style="width:11px;height:11px;"></i>${formatDateShort(h.at)}</span>
                </div>
                <div class="quiz-history-stats-mini">
                  <span class="stat-mini correct"><i data-lucide="check" style="width:11px;height:11px;"></i>${h.correct}</span>
                  <span class="stat-mini wrong"><i data-lucide="x" style="width:11px;height:11px;"></i>${h.wrong}</span>
                  ${(h.total - h.correct - h.wrong) > 0 ? `<span class="stat-mini skip"><i data-lucide="minus" style="width:11px;height:11px;"></i>${h.total - h.correct - h.wrong}</span>` : ''}
                </div>
              </div>
              <div class="quiz-history-actions">
                <button class="btn-icon-xs primary" onclick="KR.quiz.viewHistoryDetail('${h.id}')" title="Lihat Detail">
                  <i data-lucide="eye"></i>
                </button>
                <button class="btn-icon-xs danger" onclick="KR.quiz.deleteHistoryItem('${h.id}')" title="Hapus">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  function viewHistoryDetail(id) {
    const history = STORAGE.get(RESULT_KEY, []);
    const item = history.find(h => h.id === id);
    if (!item) {
      KR.toast?.error('Riwayat tidak ditemukan');
      return;
    }

    // Reconstruct result object dari history item
    const r = {
      pkg: { id: item.packageId, name: item.packageName },
      mode: item.mode,
      score: item.score,
      correct: item.correct,
      wrong: item.wrong,
      total: item.total,
      duration: item.duration,
      details: item.details,
      at: item.at,
    };

    // Set flag biar closeResults tahu ini dari history
    window.__KR_VIEWING_HISTORY__ = true;

    // Set lastResult supaya PDF & certificate masih bisa di-download
    lastResult = r;

    // Hide history, show result
    els.historyWrap?.classList.add('hidden');
    showResults(r);

    if (window.lucide) lucide.createIcons();
  }

  function deleteHistoryItem(id) {
    const history = STORAGE.get(RESULT_KEY, []);
    const item = history.find(h => h.id === id);
    if (!item) return;

    const ok = confirm(`Hapus riwayat "${item.packageName}" (${item.score}%)?`);
    if (!ok) return;

    const newHistory = history.filter(h => h.id !== id);
    STORAGE.set(RESULT_KEY, newHistory);
    KR.toast?.success('Riwayat dihapus');
    renderHistory();
  }

  function clearAllHistory() {
    const history = STORAGE.get(RESULT_KEY, []);
    if (!history.length) return;

    const ok = confirm(`Hapus SEMUA ${history.length} riwayat latihan? Tindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;

    STORAGE.set(RESULT_KEY, []);
    KR.toast?.success('Semua riwayat dihapus');
    renderHistory();
  }

  /* ==========================================
     BUILD PDF RESULT HTML
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

    const infoItems = [
      { label: 'Student Name', value: user },
      { label: 'Quiz Package', value: r.pkg.name },
      { label: 'Mode', value: r.mode === 'exam' ? 'Exam (Timed)' : 'Practice (Instant Feedback)' },
      { label: 'Date', value: dateStr },
      { label: 'Duration', value: formatDur(r.duration) },
      { label: 'Grade', value: `${grade.letter} · ${grade.label}` },
    ];
    const infoCardsHTML = infoItems.map(item => `
      <div style="background: #f8fafc; padding: 14px 18px; border-radius: 10px; border-left: 3px solid #6366f1;">
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">${item.label}</div>
        <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.35;">${esc(String(item.value))}</div>
      </div>
    `).join('');

    const stats = [
      { label: 'Total Questions', value: r.total, color: '#6366f1', bg: '#eef2ff' },
      { label: 'Correct', value: r.correct, color: '#059669', bg: '#ecfdf5' },
      { label: 'Incorrect', value: r.wrong, color: '#dc2626', bg: '#fef2f2' },
      { label: 'Unanswered', value: unanswered, color: '#64748b', bg: '#f1f5f9' },
    ];
    const statsHTML = stats.map(s => `
      <div style="background: ${s.bg}; padding: 16px 12px; border-radius: 12px; text-align: center; border: 1px solid rgba(15,23,42,0.06);">
        <div style="font-size: 26px; font-weight: 900; color: ${s.color}; line-height: 1;">${s.value}</div>
        <div style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-top: 6px;">${s.label}</div>
      </div>
    `).join('');

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

      const imgHTML = d.questionImage
        ? `<div style="margin-bottom:12px; text-align:center;"><img src="${d.questionImage}" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid #e2e8f0;" /></div>`
        : '';

      return `
        <div style="padding: 16px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${statusBorder}; border-radius: 10px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="font-size: 12px; font-weight: 800; color: #475569;">Question ${i + 1}</div>
            <div style="padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; background: ${statusBg}; color: ${statusColor};">${statusLabel}</div>
            <div style="padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #f1f5f9; color: #64748b;">${sectionLabel}</div>
          </div>
          ${imgHTML}
          ${d.questionText ? `
            <div style="font-family: 'Noto Sans KR', 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; color: #1e293b; padding: 12px 14px; background: #f8fafc; border-radius: 8px; margin-bottom: 12px; line-height: 1.55; word-break: break-word;">${escMultiline(d.questionText)}</div>
          ` : ''}
          <div style="font-size: 12px; line-height: 1.6; color: #475569;">
            <div style="margin-bottom: 4px;">
              <span style="color: #94a3b8; font-weight: 700;">Your answer:</span>
              <span style="font-weight: 700; color: ${isCorrect ? '#059669' : (skipped ? '#94a3b8' : '#dc2626')};">${d.userAns ? d.userAns + '. ' + escMultiline(userOpt?.text || '') : '(not answered)'}</span>
            </div>
            ${!isCorrect && d.correct ? `
              <div>
                <span style="color: #94a3b8; font-weight: 700;">Correct answer:</span>
                <span style="font-weight: 700; color: #059669;">${d.correct}. ${escMultiline(correctOpt?.text || '')}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const certStatusText = canGetCert ? 'Eligible for Certificate ✓' : `Certificate requires max ${CERT_MAX_WRONG} wrong answers`;

    return `
      <div id="pdfRender" style="width: 900px; background: #ffffff; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; color: #1e293b; font-size: 13px; line-height: 1.5;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); padding: 36px 44px; color: #ffffff;">
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

        <div style="padding: 36px 44px;">
          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">Student Information</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px;">${infoCardsHTML}</div>

          <div style="background: linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%); border-radius: 16px; padding: 28px 32px; margin-bottom: 32px; display: flex; align-items: center; gap: 28px; border: 1px solid rgba(99,102,241,0.15);">
            <div style="width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; box-shadow: 0 12px 28px -10px rgba(99,102,241,0.55);">
              <div style="font-size: 44px; font-weight: 900; line-height: 1;">${r.score}<span style="font-size: 22px;">%</span></div>
              <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; opacity: 0.92; margin-top: 6px;">SCORE</div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 24px; font-weight: 800; color: ${grade.color}; margin-bottom: 8px; line-height: 1.1;">Grade ${grade.letter} · ${grade.label}</div>
              <div style="font-size: 13px; color: #475569; line-height: 1.65;">
                You completed <strong style="color: #1e293b;">${esc(r.pkg.name)}</strong> with
                <strong style="color: #059669;">${r.correct} correct</strong> out of
                <strong>${r.total}</strong> questions in
                <strong>${formatDur(r.duration)}</strong>.
              </div>
            </div>
          </div>

          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">Statistics</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px;">${statsHTML}</div>

          <div style="font-size: 11px; font-weight: 800; color: #6366f1; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">Answer Review</div>
          <div>${reviewHTML}</div>
        </div>

        <div style="padding: 20px 44px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8; font-weight: 600;">
          <div>KR-Dict Learning Hub · © ${new Date().getFullYear()}</div>
          <div>${certStatusText}</div>
        </div>
      </div>
    `;
  }

  /* ==========================================
     DOWNLOAD PDF RESULT
     ========================================== */
  async function downloadResultPDF() {
    if (!lastResult) { KR.toast?.error('No result available'); return; }
    showLoading('Generating PDF Report...');
    try {
      await ensurePdfLibs();
      await waitFonts();
      const { jsPDF } = window.jspdf;
      const r = lastResult;

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;background:#fff;z-index:-1;';
      container.innerHTML = buildResultHTML(r);
      document.body.appendChild(container);

      await new Promise(res => setTimeout(res, 120));

      const target = container.querySelector('#pdfRender');

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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;

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

      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Page ${p} of ${totalPages}`, pdfW / 2, pdfH - 6, { align: 'center' });
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
     CANVAS CERTIFICATE
     ========================================== */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawMinimalCorner(ctx, x, y, sx, sy, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = color;
    ctx.lineCap = 'square';

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(0, 0);
    ctx.lineTo(60, 0);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, 10);
    ctx.lineTo(10, 10);
    ctx.lineTo(10, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();

    ctx.save();
    ctx.translate(10, 10);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();

    ctx.restore();
  }

  /* ==========================================
     ✅ Helper untuk sertifikat baru
     ========================================== */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal load: ' + src));
      img.src = src;
    });
  }

  // Ornamen korean-style di corner (stepped geometric)
  function drawOrnateCorner(ctx, x, y, size, color, flipX, flipY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.strokeStyle = color;
    ctx.lineCap = 'square';

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.75);
    ctx.lineTo(0, 0);
    ctx.lineTo(size * 0.75, 0);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.55);
    ctx.lineTo(size * 0.15, size * 0.15);
    ctx.lineTo(size * 0.55, size * 0.15);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size * 0.3, size * 0.45);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.lineTo(size * 0.45, size * 0.3);
    ctx.lineTo(size * 0.45, size * 0.45);
    ctx.stroke();

    // 3 titik kecil
    ctx.fillStyle = color;
    [0.32, 0.38, 0.44].forEach(offset => {
      ctx.beginPath();
      ctx.arc(size * 0.18, size * offset, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Divider ornamen (garis dengan pattern di tengah)
  function drawOrnamentalDivider(ctx, cx, cy, width, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const gap = 24;
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + width / 2, cy);
    ctx.stroke();

    // Ornamen kecil di tengah
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#faf8f3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.stroke();

    // 2 titik di samping
    ctx.fillStyle = color;
    [-8, 8].forEach(dx => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Taegeuk (yin-yang) - simbol Korea
  function drawTaegeuk(ctx, cx, cy, r, colorMain, colorAccent) {
    ctx.save();

    // Lingkaran utama
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = colorMain;
    ctx.fill();

    // Bagian atas (warna aksen)
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 2, Math.PI, 0, false);
    ctx.arc(cx, cy + r / 2, r / 2, 0, Math.PI, false);
    ctx.arc(cx, cy, r, 0, Math.PI, false);
    ctx.fillStyle = colorAccent;
    ctx.fill();

    // 2 titik kecil
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2);
    ctx.fillStyle = colorMain;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2);
    ctx.fillStyle = colorAccent;
    ctx.fill();

    ctx.restore();
  }

  async function renderCertificateToCanvas({ name, pkgName, score, dateStr, certId, gradeText, wrong, details }) {
    // ========== LOAD IMAGES ==========
    let signatureImg = null;
    let flagImg = null;
    try { signatureImg = await loadImage('assets/img/signature.png'); }
    catch (e) { console.warn('[Cert] Signature tidak ditemukan:', e.message); }
    try { flagImg = await loadImage('assets/img/korean-flag.png'); }
    catch (e) { console.warn('[Cert] Korean flag tidak ditemukan:', e.message); }

    // ========== COMPUTE STATS ==========
    const reading = { correct: 0, total: 0 };
    const listening = { correct: 0, total: 0 };
    (details || []).forEach(d => {
      const isL = d.sectionType === 'listening';
      if (isL) {
        listening.total++;
        if (d.isCorrect) listening.correct++;
      } else {
        reading.total++;
        if (d.isCorrect) reading.correct++;
      }
    });
    const totalQuestions = reading.total + listening.total;

    // ========== CANVAS SETUP ==========
    const W = 1123, H = 794, SCALE = 2;
    const cvs = document.createElement('canvas');
    cvs.width = W * SCALE;
    cvs.height = H * SCALE;
    const ctx = cvs.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = 'middle';

    // ========== PALETTE ==========
    const NAVY = '#1e3a5f';
    const NAVY_DARK = '#152a44';
    const NAVY_LIGHT = '#2d4a70';
    const GOLD = '#c9a961';
    const GOLD_DARK = '#9d7f45';
    const GOLD_LIGHT = '#e6d9b3';
    const CREAM = '#faf8f3';
    const CREAM_LIGHT = '#fdfcf8';
    const CREAM_DARK = '#f4f1e8';
    const TEXT_DARK = '#1a2942';
    const TEXT_MUTED = '#5a6b82';

    /* ============================================================
       ICON HELPERS — gambar icon sendiri (bukan emoji)
       ============================================================ */
    function drawBookIcon(cx, cy, size, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = color;
      const h = size * 0.9;
      const w = size * 0.42;
      const gap = 1.4;
      // Left page
      ctx.beginPath();
      ctx.moveTo(-w, -h / 2 + 1);
      ctx.lineTo(-w, h / 2 - 1);
      ctx.lineTo(-gap, h / 2 - 3);
      ctx.lineTo(-gap, -h / 2 - 1);
      ctx.closePath();
      ctx.fill();
      // Right page
      ctx.beginPath();
      ctx.moveTo(w, -h / 2 + 1);
      ctx.lineTo(w, h / 2 - 1);
      ctx.lineTo(gap, h / 2 - 3);
      ctx.lineTo(gap, -h / 2 - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawHeadphonesIcon(cx, cy, size, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = 'round';
      const r = size * 0.42;
      const earW = size * 0.24;
      const earH = size * 0.5;
      const earY = -size * 0.04;
      // Headband arc
      ctx.lineWidth = size * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      // Left ear cup
      roundRect(ctx, -r - earW / 2, earY, earW, earH, earW * 0.45);
      ctx.fill();
      // Right ear cup
      roundRect(ctx, r - earW / 2, earY, earW, earH, earW * 0.45);
      ctx.fill();
      ctx.restore();
    }

    /* ============================================================
       1. NAVY BACKGROUND
       ============================================================ */
    const navyGrad = ctx.createLinearGradient(0, 0, W, H);
    navyGrad.addColorStop(0, NAVY_LIGHT);
    navyGrad.addColorStop(0.5, NAVY);
    navyGrad.addColorStop(1, NAVY_DARK);
    ctx.fillStyle = navyGrad;
    ctx.fillRect(0, 0, W, H);

    /* ============================================================
       2. CREAM PAPER
       ============================================================ */
    const PAPER = 28;
    const paperX = PAPER, paperY = PAPER;
    const paperW = W - PAPER * 2, paperH = H - PAPER * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = CREAM;
    ctx.fillRect(paperX, paperY, paperW, paperH);
    ctx.restore();

    const paperGrad = ctx.createLinearGradient(paperX, paperY, paperX + paperW, paperY + paperH);
    paperGrad.addColorStop(0, CREAM_LIGHT);
    paperGrad.addColorStop(0.5, CREAM);
    paperGrad.addColorStop(1, CREAM_DARK);
    ctx.fillStyle = paperGrad;
    ctx.fillRect(paperX, paperY, paperW, paperH);

    /* ============================================================
       3. BACKGROUND PATTERNS
       ============================================================ */
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperX, paperY, paperW, paperH);
    ctx.clip();

    // 3a. Korean flag (subtle) — geser ke atas-kanan
    if (flagImg) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.16;
      const flW = 400;
      const flH = flW * (flagImg.height / flagImg.width);
      // Posisikan di area kanan-atas (sedikit ke luar frame supaya terlihat natural)
      ctx.drawImage(flagImg, 940 - flW / 2, 200 - flH / 2, flW, flH);
      ctx.restore();
    }

    // 3c. Mountains (dasar)
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(140, H - 115);
    ctx.lineTo(280, H - 65);
    ctx.lineTo(420, H - 145);
    ctx.lineTo(580, H - 80);
    ctx.lineTo(720, H - 130);
    ctx.lineTo(880, H - 90);
    ctx.lineTo(1050, H - 155);
    ctx.lineTo(W, H - 85);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore(); // end clip

    /* ============================================================
       4. GOLD DOUBLE FRAME
       ============================================================ */
    const FRAME_OUT = 45, FRAME_IN = 53;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(FRAME_OUT, FRAME_OUT, W - FRAME_OUT * 2, H - FRAME_OUT * 2);
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = 0.6;
    ctx.strokeRect(FRAME_IN, FRAME_IN, W - FRAME_IN * 2, H - FRAME_IN * 2);

    const cs = 26, cp = FRAME_OUT + 9;
    drawOrnateCorner(ctx, cp, cp, cs, GOLD, false, false);
    drawOrnateCorner(ctx, W - cp, cp, cs, GOLD, true, false);
    drawOrnateCorner(ctx, cp, H - cp, cs, GOLD, false, true);
    drawOrnateCorner(ctx, W - cp, H - cp, cs, GOLD, true, true);

    /* ============================================================
       5. HEADER
       ============================================================ */
    const logoX = 80, logoY = 78, bkSize = 26;
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(logoX, logoY + 4);
    ctx.lineTo(logoX, logoY + bkSize);
    ctx.lineTo(logoX + bkSize / 2 - 2, logoY + bkSize - 3);
    ctx.lineTo(logoX + bkSize / 2 - 2, logoY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(logoX + bkSize, logoY + 4);
    ctx.lineTo(logoX + bkSize, logoY + bkSize);
    ctx.lineTo(logoX + bkSize / 2 + 2, logoY + bkSize - 3);
    ctx.lineTo(logoX + bkSize / 2 + 2, logoY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c8102e';
    ctx.beginPath();
    ctx.arc(logoX + bkSize / 2, logoY + bkSize / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = NAVY;
    ctx.font = '900 20px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('KR-DICT', logoX + bkSize + 10, logoY + 11);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Learn Korean, Go Further', logoX + bkSize + 10, logoY + 24);

    ctx.textAlign = 'right';
    ctx.fillStyle = NAVY;
    ctx.font = '800 22px "Noto Sans KR", sans-serif';
    ctx.fillText('한국어 능력 인증서', W - 80, 84);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Korean Language Competency Certificate', W - 80, 104);

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(W - 340, 116);
    ctx.lineTo(W - 80, 116);
    ctx.stroke();

    /* ============================================================
       6. TITLE
       ============================================================ */
    ctx.textAlign = 'center';
    ctx.fillStyle = NAVY;
    ctx.font = '900 62px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('CERTIFICATE', W / 2, 168);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = GOLD_DARK;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '7px';
    ctx.fillText('OF KOREAN LANGUAGE COMPETENCY', W / 2, 202);
    ctx.letterSpacing = '0px';

    drawOrnamentalDivider(ctx, W / 2, 224, 380, GOLD);

    ctx.fillStyle = NAVY;
    ctx.font = '700 18px "Noto Sans KR", sans-serif';
    ctx.fillText('한국어 능력 인증서', W / 2, 254);

    /* ============================================================
       7. CERTIFICATION
       ============================================================ */
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.fillText('This is to certify that', W / 2, 292);

    const displayName = name.length > 30 ? name.slice(0, 28) + '…' : name;
    ctx.fillStyle = NAVY;
    ctx.font = '900 44px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '-0.5px';
    ctx.fillText(displayName, W / 2, 340);
    ctx.letterSpacing = '0px';

    const nw = ctx.measureText(displayName).width;
    const ulW = Math.min(Math.max(nw + 80, 280), 560);
    const ulL = W / 2 - ulW / 2, ulR = W / 2 + ulW / 2, ulY = 372;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ulL, ulY);
    ctx.lineTo(ulR, ulY);
    ctx.stroke();
    [ulL, ulR].forEach(x => {
      ctx.save();
      ctx.translate(x, ulY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = GOLD;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });

    ctx.fillStyle = TEXT_DARK;
    ctx.font = '400 14px Georgia, "Times New Roman", serif';
    ctx.fillText('has successfully completed the Korean Language Proficiency Test', W / 2, 402);
    ctx.fillText('and demonstrated the required level of competence in', W / 2, 424);
    ctx.fillStyle = NAVY;
    ctx.font = '700 14px Georgia, "Times New Roman", serif';
    ctx.fillText('Reading and Listening.', W / 2, 446);

    /* ============================================================
       8. STATS BOX
       ============================================================ */
    const boxX = 175, boxW = 773, boxY = 465, boxH = 88;
    ctx.fillStyle = '#f6f2e8';
    roundRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    roundRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.stroke();
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = 0.5;
    roundRect(ctx, boxX + 4, boxY + 4, boxW - 8, boxH - 8, 10);
    ctx.stroke();

    const colW = boxW / 3;
    ctx.strokeStyle = GOLD_DARK;
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      const divX = boxX + colW * i;
      ctx.beginPath();
      ctx.moveTo(divX, boxY + 16);
      ctx.lineTo(divX, boxY + boxH - 16);
      ctx.stroke();
    }

    const iconR = 19;
    const iconCy = boxY + boxH / 2;

    // Col 1: Reading
    const col1Cx = boxX + colW * 0.5;
    ctx.beginPath();
    ctx.arc(col1Cx - 78, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    drawBookIcon(col1Cx - 78, iconCy, 20, '#ffffff');

    ctx.textAlign = 'left';
    ctx.fillStyle = NAVY;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Reading', col1Cx - 48, boxY + 26);
    ctx.font = '900 22px "Playfair Display", Georgia, serif';
    ctx.fillText(`${reading.correct} / ${reading.total}`, col1Cx - 48, boxY + 52);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
    const rScore = reading.total > 0 ? (reading.correct * 50 / reading.total) : 0;
    ctx.fillText(`(${rScore.toFixed(1)} / 50.0)`, col1Cx - 48, boxY + 72);

    // Col 2: Listening
    const col2Cx = boxX + colW * 1.5;
    ctx.beginPath();
    ctx.arc(col2Cx - 78, iconCy, iconR, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();
    drawHeadphonesIcon(col2Cx - 78, iconCy, 22, '#ffffff');

    ctx.textAlign = 'left';
    ctx.fillStyle = NAVY;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Listening', col2Cx - 48, boxY + 26);
    ctx.font = '900 22px "Playfair Display", Georgia, serif';
    ctx.fillText(`${listening.correct} / ${listening.total}`, col2Cx - 48, boxY + 52);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
    const lScore = listening.total > 0 ? (listening.correct * 50 / listening.total) : 0;
    ctx.fillText(`(${lScore.toFixed(1)} / 50.0)`, col2Cx - 48, boxY + 72);

    // Col 3: Total Score
    const col3Cx = boxX + colW * 2.5;
    ctx.textAlign = 'center';
    ctx.fillStyle = NAVY;
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Total Score', col3Cx, boxY + 26);
    ctx.font = '900 32px "Playfair Display", Georgia, serif';
    ctx.fillText(`${score} / 100`, col3Cx, boxY + 52);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`(${score.toFixed(1)} / 100.0)`, col3Cx, boxY + 72);

    /* ============================================================
       9. FOOTER INFO
       ============================================================ */
    const footerY = 585;
    const footColW = boxW / 4;
    const footStartX = boxX;
    const footerItems = [
      { label: 'Test Type', value: 'Korean Language Competency Test', sub: '(Reading & Listening)' },
      { label: 'Total Questions', value: `${totalQuestions} Soal`, sub: `(${reading.total} Reading + ${listening.total} Listening)` },
      { label: 'Test Date', value: dateStr, sub: '' },
      { label: 'Certificate Number', value: certId, sub: '' },
    ];

    footerItems.forEach((item, i) => {
      const cx = footStartX + footColW * (i + 0.5);
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '0.4px';
      ctx.fillText(item.label, cx, footerY);
      ctx.letterSpacing = '0px';

      ctx.fillStyle = NAVY;
      ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(item.value, cx, footerY + 18);

      if (item.sub) {
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = '500 8px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(item.sub, cx, footerY + 32);
      }

      if (i < footerItems.length - 1) {
        const divX = footStartX + footColW * (i + 1);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(divX, footerY - 6);
        ctx.lineTo(divX, footerY + 34);
        ctx.stroke();
      }
    });

    /* ============================================================
       10. SIGNATURE — di bawah footer text, line lebih pendek
       ============================================================ */
    const sigX = 155;
    const sigY = 635;
    const sigAreaW = 240;
    const sigMaxW = 240;
    const sigMaxH = 70;

    if (signatureImg) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const imgRatio = signatureImg.width / signatureImg.height;
      let drawW = sigMaxW;
      let drawH = drawW / imgRatio;
      if (drawH > sigMaxH) {
        drawH = sigMaxH;
        drawW = drawH * imgRatio;
      }
      const offsetX = (sigAreaW - drawW) / 2;
      ctx.drawImage(signatureImg, sigX + offsetX, sigY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sigX + 20, sigY + 50);
      ctx.bezierCurveTo(sigX + 60, sigY + 15, sigX + 110, sigY + 65, sigX + 160, sigY + 30);
      ctx.bezierCurveTo(sigX + 200, sigY + 5, sigX + 215, sigY + 55, sigX + 220, sigY + 40);
      ctx.stroke();
    }

    // Signature line — lebih pendek
    const sigLineY = 700;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sigX, sigLineY);
    ctx.lineTo(sigX + sigAreaW, sigLineY);
    ctx.stroke();

    // Labels — center di atas line
    const sigCenterX = sigX + sigAreaW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = NAVY;
    ctx.font = '800 13px "Playfair Display", Georgia, serif';
    ctx.fillText('Director', sigCenterX, sigLineY + 18);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '0.8px';
    ctx.fillText('KR-DICT', sigCenterX, sigLineY + 33);
    ctx.letterSpacing = '0px';

    /* ============================================================
       11. MOTTO
       ============================================================ */
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD_DARK;
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('YOUR KOREAN JOURNEY', W / 2, 655);
    ctx.fillText('BUILDS A BRIGHTER FUTURE', W / 2, 675);
    ctx.letterSpacing = '0px';

    drawOrnamentalDivider(ctx, W / 2, 700, 300, GOLD);

    /* ============================================================
       12. OFFICIAL SEAL — dengan laurel wreath yang tidak menutupi text
       ============================================================ */
    const sealCx = 970;
    const sealCy = 638;
    const sealR = 42;
    const ribbonLen = 26;

    // ---------- Ribbons (behind seal) ----------
    ctx.save();
    // Left ribbon — top mepet ke seal, bottom lebih pendek
    ctx.fillStyle = NAVY_DARK;
    ctx.beginPath();
    ctx.moveTo(sealCx - 22, sealCy + sealR - 14);
    ctx.lineTo(sealCx - 32, sealCy + sealR + ribbonLen);
    ctx.lineTo(sealCx - 11, sealCy + sealR + ribbonLen - 7);
    ctx.lineTo(sealCx, sealCy + sealR + ribbonLen);
    ctx.lineTo(sealCx - 4, sealCy + sealR - 14);
    ctx.closePath();
    ctx.fill();
    // Right ribbon
    ctx.fillStyle = GOLD_DARK;
    ctx.beginPath();
    ctx.moveTo(sealCx + 22, sealCy + sealR - 14);
    ctx.lineTo(sealCx + 32, sealCy + sealR + ribbonLen);
    ctx.lineTo(sealCx + 11, sealCy + sealR + ribbonLen - 7);
    ctx.lineTo(sealCx, sealCy + sealR + ribbonLen);
    ctx.lineTo(sealCx + 4, sealCy + sealR - 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---------- Scalloped edge (24 petals) ----------
    const petals = 24;
    const petalR = 5;
    ctx.fillStyle = GOLD;
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const px = sealCx + Math.cos(ang) * (sealR - 3);
      const py = sealCy + Math.sin(ang) * (sealR - 3);
      ctx.beginPath();
      ctx.arc(px, py, petalR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---------- Main gold ring ----------
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 3, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();

    // ---------- Thin inner gold ring ----------
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 7, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1;
    ctx.stroke();

    // ---------- Navy disc ----------
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 10, 0, Math.PI * 2);
    ctx.fillStyle = NAVY;
    ctx.fill();

    /* ---------- LAUREL WREATH (kiri & kanan saja, tidak menutupi text) ---------- */
    const laurelR = 26;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    // Left branch: arc dari sudut 140° ke 220° (sisi kiri)
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, laurelR, Math.PI * 0.78, Math.PI * 1.22);
    ctx.stroke();

    // Right branch: arc dari sudut -40° ke 40° (sisi kanan)
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, laurelR, -Math.PI * 0.22, Math.PI * 0.22);
    ctx.stroke();

    // Leaves on left branch
    const leafCount = 6;
    ctx.fillStyle = GOLD;
    for (let i = 0; i < leafCount; i++) {
      const ang = Math.PI * 0.80 + i * (Math.PI * 0.40 / (leafCount - 1));
      const lx = sealCx + Math.cos(ang) * laurelR;
      const ly = sealCy + Math.sin(ang) * laurelR;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Leaves on right branch
    for (let i = 0; i < leafCount; i++) {
      const ang = -Math.PI * 0.20 + i * (Math.PI * 0.40 / (leafCount - 1));
      const lx = sealCx + Math.cos(ang) * laurelR;
      const ly = sealCy + Math.sin(ang) * laurelR;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Small star ornaments at top-center and bottom-center (di luar laurel)
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(sealCx, sealCy - laurelR - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sealCx, sealCy + laurelR + 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    /* ---------- BOOK ICON (top-center, di dalam laurel) ---------- */
    ctx.fillStyle = GOLD;
    const bkW = 20;
    const bkH = 13;
    const bkY = sealCy - 8;
    // Left page
    ctx.beginPath();
    ctx.moveTo(sealCx - bkW / 2, bkY - bkH / 2);
    ctx.lineTo(sealCx - bkW / 2, bkY + bkH / 2);
    ctx.lineTo(sealCx - 1, bkY + bkH / 2 - 2);
    ctx.lineTo(sealCx - 1, bkY - bkH / 2 - 2);
    ctx.closePath();
    ctx.fill();
    // Right page
    ctx.beginPath();
    ctx.moveTo(sealCx + bkW / 2, bkY - bkH / 2);
    ctx.lineTo(sealCx + bkW / 2, bkY + bkH / 2);
    ctx.lineTo(sealCx + 1, bkY + bkH / 2 - 2);
    ctx.lineTo(sealCx + 1, bkY - bkH / 2 - 2);
    ctx.closePath();
    ctx.fill();

    /* ---------- KR-DICT TEXT (di bawah book, jelas tanpa halangan) ---------- */
    ctx.fillStyle = GOLD;
    ctx.font = '900 8px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px';
    ctx.fillText('KR-DICT', sealCx, sealCy + 12);
    ctx.letterSpacing = '0px';

    // 3 small dots below text
    ctx.fillStyle = GOLD;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(sealCx + i * 6, sealCy + 22, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    return cvs;
  }

  /* ==========================================
     GENERATE CERTIFICATE
     ========================================== */
  async function generateCertificate() {
    if (!lastResult) { KR.toast?.error('Complete a quiz first'); return; }

    if (lastResult.wrong > CERT_MAX_WRONG) {
      KR.toast?.error(`Certificate requires max ${CERT_MAX_WRONG} wrong answers. You have ${lastResult.wrong}.`);
      return;
    }

    showLoading('Generating Certificate...');
    try {
      await ensurePdfLibs();
      await waitFonts();

      const dummy = document.createElement('span');
      dummy.style.cssText = 'position:absolute;left:-9999px;font-family:"Playfair Display",Georgia,serif;font-weight:900;font-size:56px;';
      dummy.textContent = 'LOAD';
      document.body.appendChild(dummy);
      await new Promise(r => setTimeout(r, 220));
      document.body.removeChild(dummy);

      const r = lastResult;
      const user = (KR.auth?.getUserData?.()?.name) || 'KR-Dict Student';
      const dateStr = new Date(r.at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      const certId = 'KRD-' + r.at.toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const grade = getGrade(r.score);
      const gradeText = `${grade.letter} · ${grade.label.toUpperCase()}`;

      _certCanvas = await renderCertificateToCanvas({
        name: user,
        pkgName: r.pkg.name,
        score: r.score,
        dateStr,
        certId,
        gradeText,
        wrong: r.wrong,
        details: r.details,
      });

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safePkgName = r.pkg.name.replace(/[^a-z0-9]/gi, '_');
      const safeUserName = user.replace(/[^a-z0-9]/gi, '_');
      _certFilenameBase = `Certificate_${safePkgName}_${safeUserName}_${ts}`;

      const dataUrl = _certCanvas.toDataURL('image/png');

      els.certPreview.innerHTML = `
        <div style="width:100%; background:#fdfcf7; border-radius:12px; overflow:hidden; text-align:center; box-shadow:0 4px 16px -4px rgba(15,23,42,0.1);">
          <img src="${dataUrl}" style="width:100%; height:auto; display:block;" alt="Certificate Preview">
        </div>`;

      els.certModal.classList.remove('hidden');
      els.certModal.classList.add('flex');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to generate certificate: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     DOWNLOAD CERTIFICATE PDF
     ========================================== */
  async function downloadCertificatePDF() {
    if (!_certCanvas) { KR.toast?.error('Generate certificate first'); return; }
    showLoading('Preparing PDF...');
    try {
      await ensurePdfLibs();
      const { jsPDF } = window.jspdf;

      const imgData = _certCanvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`${_certFilenameBase}.pdf`);
      KR.toast?.success('🎉 Certificate PDF downloaded!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to create certificate PDF: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  /* ==========================================
     DOWNLOAD CERTIFICATE PNG
     ========================================== */
  async function downloadCertificatePNG() {
    if (!_certCanvas) { KR.toast?.error('Generate certificate first'); return; }
    showLoading('Preparing PNG...');
    try {
      const link = document.createElement('a');
      link.download = `${_certFilenameBase}.png`;
      link.href = _certCanvas.toDataURL('image/png', 1.0);
      link.click();
      KR.toast?.success('🎉 Certificate PNG downloaded!');
    } catch (err) {
      console.error(err);
      KR.toast?.error('Failed to create PNG: ' + err.message);
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
      submitTest();
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

  function showIncompleteModal(unanswered, answered, total) {
    // Hapus modal lama kalau ada
    document.getElementById('quizIncompleteModal')?.remove();

    const percent = Math.round((answered / total) * 100);

    const modal = document.createElement('div');
    modal.id = 'quizIncompleteModal';
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4';
    modal.style.animation = 'fadeIn 200ms ease';

    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/70 backdrop-blur-md" onclick="document.getElementById('quizIncompleteModal')?.remove()"></div>
      <div class="relative z-10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden" style="background:var(--bg-elev);animation:scaleIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1);">
        
        <!-- Header dengan gradient warning -->
        <div style="background:linear-gradient(135deg,#f59e0b 0%,#ea580c 50%,#dc2626 100%);padding:24px;text-align:center;position:relative;overflow:hidden;">
          <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.15);pointer-events:none;"></div>
          <div style="position:absolute;bottom:-40px;left:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.1);pointer-events:none;"></div>
          
          <div style="width:64px;height:64px;border-radius:20px;background:rgba(255,255,255,0.25);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;backdrop-filter:blur(8px);">
            <i data-lucide="alert-triangle" style="width:32px;height:32px;color:#fff;"></i>
          </div>
          <h3 style="font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:4px;">Soal Belum Lengkap!</h3>
          <p style="font-size:0.85rem;color:rgba(255,255,255,0.9);margin:0;">Anda harus menjawab semua soal sebelum mengirim</p>
        </div>

        <!-- Body -->
        <div style="padding:24px;">
          
          <!-- Progress -->
          <div style="background:var(--bg-subtle);border-radius:16px;padding:16px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Progress Jawaban</span>
              <span style="font-size:1rem;font-weight:900;color:var(--primary);">${answered} / ${total}</span>
            </div>
            <div style="height:10px;background:var(--bg-muted);border-radius:99px;overflow:hidden;position:relative;">
              <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#10b981 0%,#14b8a6 50%,#06b6d4 100%);border-radius:99px;transition:width 400ms ease;box-shadow:0 0 12px rgba(16,185,129,0.5);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.7rem;font-weight:700;color:var(--text-muted);">
              <span>✓ Terjawab: <strong style="color:#059669;">${answered}</strong></span>
              <span>✗ Belum: <strong style="color:#dc2626;">${total - answered}</strong></span>
            </div>
          </div>

          <!-- Chip list soal belum dijawab -->
          <div style="margin-bottom:20px;">
            <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px;">
              🎯 Soal yang Belum Dijawab — Klik untuk Lompat
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:140px;overflow-y:auto;padding-right:4px;" class="custom-scroll">
              ${unanswered.map(n => `
                <button class="quiz-unanswered-chip" data-qidx="${n - 1}">
                  <i data-lucide="arrow-right" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
                  Soal ${n}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Info -->
          <div style="background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08));border:1px solid rgba(99,102,241,0.2);border-left:4px solid #6366f1;border-radius:12px;padding:12px 14px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start;">
            <i data-lucide="info" style="width:18px;height:18px;color:#6366f1;flex-shrink:0;margin-top:2px;"></i>
            <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5;">
              Klik salah satu nomor di atas untuk langsung menuju soal tersebut, lalu jawab semua soal agar bisa dikirim.
            </div>
          </div>

          <!-- Tombol -->
          <button id="quizIncompleteOk" class="btn-primary-gradient w-full py-3 justify-center" style="font-size:0.9rem;">
            <i data-lucide="check-circle" class="w-5 h-5 mr-2"></i> Baik, Saya Akan Lengkapi
          </button>

        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Event: klik chip soal → lompat ke soal
    modal.querySelectorAll('.quiz-unanswered-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const qidx = parseInt(btn.dataset.qidx);
        modal.remove();
        activeSession.currentIdx = qidx;
        renderQuestion();
        if (window.lucide) lucide.createIcons();
      });
    });

    // Event: tombol OK
    document.getElementById('quizIncompleteOk')?.addEventListener('click', () => {
      modal.remove();
    });

    if (window.lucide) lucide.createIcons();
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
    formatQuizMarkup,
    showHistory,
    closeHistory,
    renderHistory,
    viewHistoryDetail,
    deleteHistoryItem,
    clearAllHistory,
  };
})();
