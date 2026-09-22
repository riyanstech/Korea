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
  const CERT_TIERS = {
    diamond: {
      id: 'diamond',
      name: 'DIAMOND',
      title: 'Certificate of Excellence',
      icon: '💎',
      wrongRange: 'Flawless · 0–1 Wrong',
      primary: '#7c3aed',
      secondary: '#06b6d4',
      accent: '#c4b5fd',
      deep: '#4c1d95',
      bg1: '#faf8ff',
      bg2: '#f0f9ff',
      watermark: 'EXCELLENCE',
      borderOuter: '#7c3aed',
      borderInner: '#c4b5fd',
      borderAccent: '#06b6d4',
      sealColors: ['#c4b5fd', '#a78bfa', '#7c3aed', '#4c1d95'],
      tierGradient: ['#7c3aed', '#a78bfa', '#06b6d4'],
    },
    gold: {
      id: 'gold',
      name: 'GOLD',
      title: 'Certificate of Achievement',
      icon: '🏆',
      wrongRange: 'Excellent · 2 Wrong',
      primary: '#b8860b',
      secondary: '#d4af37',
      accent: '#f5d67b',
      deep: '#78350f',
      bg1: '#fdfcf7',
      bg2: '#faf7f0',
      watermark: 'ACHIEVEMENT',
      borderOuter: '#b8860b',
      borderInner: '#d4af37',
      borderAccent: '#f5d67b',
      sealColors: ['#f5d67b', '#d4af37', '#b8860b', '#8b6508'],
      tierGradient: ['#b8860b', '#d4af37', '#f5d67b'],
    },
    silver: {
      id: 'silver',
      name: 'SILVER',
      title: 'Certificate of Completion',
      icon: '🥈',
      wrongRange: 'Good · 3 Wrong',
      primary: '#64748b',
      secondary: '#94a3b8',
      accent: '#cbd5e1',
      deep: '#334155',
      bg1: '#fafbfc',
      bg2: '#f1f5f9',
      watermark: 'COMPLETION',
      borderOuter: '#64748b',
      borderInner: '#94a3b8',
      borderAccent: '#cbd5e1',
      sealColors: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'],
      tierGradient: ['#475569', '#94a3b8', '#cbd5e1'],
    },
  };

  function getCertTier(wrong) {
    if (wrong <= 1) return CERT_TIERS.diamond;
    if (wrong === 2) return CERT_TIERS.gold;
    return CERT_TIERS.silver;
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
      const tierStyle = `background: linear-gradient(135deg, ${tier.tierGradient[0]} 0%, ${tier.tierGradient[1]} 50%, ${tier.tierGradient[2]} 100%);`;
      actionsHTML += `
        <button class="quiz-action-btn gold" style="${tierStyle}" onclick="KR.quiz.generateCertificate()">
          <i data-lucide="award"></i>
          <div>
            <div class="quiz-action-btn-title">${tier.icon} Get ${tier.name} Certificate</div>
            <div class="quiz-action-btn-sub">${tier.title}</div>
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

  function renderCertificateToCanvas({ name, pkgName, score, dateStr, certId, gradeText, wrong }) {
    const tier = getCertTier(wrong);
    const W = 1123, H = 794;
    const SCALE = 2;
    const cvs = document.createElement('canvas');
    cvs.width = W * SCALE;
    cvs.height = H * SCALE;
    const ctx = cvs.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.textBaseline = 'middle';

    const Y = {
      borderOuter: 24,
      borderInner: 36,
      tierBadge: 56,
      emblem: 118,
      emblemR: 40,
      brand: 182,
      brandLine: 200,
      title: 258,
      subtitle: 300,
      presented: 348,
      name: 400,
      nameUnderline: 430,
      completed: 472,
      pkg: 508,
      scoreLabel: 548,
      scoreY: 596,
      footerLine: 668,
      signatureY: 700,
      sealY: 700,
      metaY1: 686,
      metaY2: 706,
      metaY3: 726,
      metaY4: 744,
    };

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, tier.bg1);
    bgGrad.addColorStop(1, tier.bg2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = tier.primary;
    for (let x = 20; x < W; x += 18) {
      for (let y = 20; y < H; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.font = '900 260px "Playfair Display", Georgia, serif';
    ctx.fillStyle = tier.primary;
    ctx.globalAlpha = 0.028;
    ctx.textAlign = 'center';
    ctx.fillText('KR-DICT', W / 2, H / 2 + 20);
    ctx.restore();

    ctx.strokeStyle = tier.borderOuter;
    ctx.lineWidth = 3;
    ctx.strokeRect(Y.borderOuter, Y.borderOuter, W - Y.borderOuter * 2, H - Y.borderOuter * 2);
    ctx.strokeStyle = tier.borderInner;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(Y.borderInner, Y.borderInner, W - Y.borderInner * 2, H - Y.borderInner * 2);

    const cx = Y.borderOuter, cy = Y.borderOuter;
    drawMinimalCorner(ctx, cx, cy, 1, 1, tier.borderOuter);
    drawMinimalCorner(ctx, W - cx, cy, -1, 1, tier.borderOuter);
    drawMinimalCorner(ctx, cx, H - cy, 1, -1, tier.borderOuter);
    drawMinimalCorner(ctx, W - cx, H - cy, -1, -1, tier.borderOuter);

    const badgeW = 170, badgeH = 42;
    const badgeX = W - 70 - badgeW;
    const badgeY = Y.tierBadge;

    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    badgeGrad.addColorStop(0, tier.tierGradient[0]);
    badgeGrad.addColorStop(1, tier.tierGradient[2]);
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.restore();

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '20px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tier.icon, badgeX + 14, badgeY + badgeH / 2);

    ctx.font = '900 13px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(tier.name, badgeX + 44, badgeY + badgeH / 2 - 6);
    ctx.letterSpacing = '0px';

    ctx.font = '600 8px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.letterSpacing = '1.2px';
    ctx.fillText('TIER CERTIFICATE', badgeX + 44, badgeY + badgeH / 2 + 8);
    ctx.letterSpacing = '0px';

    const emblemX = W / 2, emblemY = Y.emblem, emblemR = Y.emblemR;

    ctx.beginPath();
    ctx.arc(emblemX, emblemY, emblemR + 8, 0, Math.PI * 2);
    ctx.strokeStyle = tier.accent;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const emblemGrad = ctx.createRadialGradient(
      emblemX - emblemR * 0.3, emblemY - emblemR * 0.3, 4,
      emblemX, emblemY, emblemR
    );
    emblemGrad.addColorStop(0, tier.sealColors[0]);
    emblemGrad.addColorStop(0.4, tier.sealColors[1]);
    emblemGrad.addColorStop(0.75, tier.sealColors[2]);
    emblemGrad.addColorStop(1, tier.sealColors[3]);
    ctx.beginPath();
    ctx.arc(emblemX, emblemY, emblemR, 0, Math.PI * 2);
    ctx.fillStyle = emblemGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(emblemX, emblemY, emblemR - 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(emblemX, emblemY, emblemR - 9, 0, Math.PI * 2);
    ctx.strokeStyle = tier.accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '40px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "EmojiOne Color", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tier.icon, emblemX, emblemY + 2);

    ctx.font = '800 11px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = tier.primary;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('KR-DICT  LEARNING  HUB', W / 2, Y.brand);
    ctx.letterSpacing = '0px';

    ctx.strokeStyle = tier.borderInner;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 40, Y.brandLine);
    ctx.lineTo(W / 2 + 40, Y.brandLine);
    ctx.stroke();

    ctx.font = '900 54px "Playfair Display", Georgia, serif';
    ctx.fillStyle = tier.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('CERTIFICATE', W / 2, Y.title);
    ctx.letterSpacing = '0px';

    const subtitle = tier.title.replace('Certificate of ', '').toUpperCase();
    ctx.font = '700 15px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = tier.deep;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '8px';
    ctx.fillText(subtitle, W / 2, Y.subtitle);
    ctx.letterSpacing = '0px';

    ctx.font = 'italic 15px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('This is to certify that', W / 2, Y.presented);

    const displayName = name.length > 34 ? name.slice(0, 32) + '…' : name;
    ctx.font = '700 52px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, W / 2, Y.name);

    const nameWidth = ctx.measureText(displayName).width;
    const underlineW = Math.max(nameWidth + 100, 340);
    const ulLeft = W / 2 - underlineW / 2;
    const ulRight = W / 2 + underlineW / 2;

    ctx.strokeStyle = tier.borderInner;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ulLeft, Y.nameUnderline);
    ctx.lineTo(ulRight, Y.nameUnderline);
    ctx.stroke();

    [ulLeft, ulRight].forEach(x => {
      ctx.save();
      ctx.translate(x, Y.nameUnderline);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = tier.primary;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });

    ctx.font = '15px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('has successfully completed the practice quiz', W / 2, Y.completed);

    const displayPkg = pkgName.length > 44 ? pkgName.slice(0, 42) + '…' : pkgName;
    ctx.font = '700 22px "Playfair Display", Georgia, serif';
    ctx.fillStyle = tier.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`"${displayPkg}"`, W / 2, Y.pkg);

    ctx.font = 'italic 14px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('with an outstanding score of', W / 2, Y.scoreLabel);

    const scoreText = `${score}%`;
    const gradeLabel = gradeText;

    ctx.font = '900 44px "Playfair Display", Georgia, serif';
    const scoreWidth = ctx.measureText(scoreText).width;

    ctx.font = '800 16px "Plus Jakarta Sans", -apple-system, sans-serif';
    const gradeWidth = ctx.measureText(gradeLabel).width;

    const medalR = 30;
    const gap1 = 18;
    const gap2 = 16;
    const totalRowWidth = medalR * 2 + gap1 + scoreWidth + gap2 + gradeWidth;
    const rowStartX = (W - totalRowWidth) / 2;

    const medalCx = rowStartX + medalR;
    const medalCy = Y.scoreY;
    const scoreX = medalCx + medalR + gap1;
    const gradeX = scoreX + scoreWidth + gap2;

    ctx.fillStyle = tier.primary;
    ctx.beginPath();
    ctx.moveTo(medalCx - 12, medalCy + medalR - 2);
    ctx.lineTo(medalCx - 20, medalCy + medalR + 22);
    ctx.lineTo(medalCx - 6, medalCy + medalR + 16);
    ctx.lineTo(medalCx, medalCy + medalR + 22);
    ctx.lineTo(medalCx + 6, medalCy + medalR - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = tier.accent;
    ctx.beginPath();
    ctx.moveTo(medalCx, medalCy + medalR - 2);
    ctx.lineTo(medalCx + 6, medalCy + medalR + 22);
    ctx.lineTo(medalCx + 12, medalCy + medalR + 16);
    ctx.lineTo(medalCx + 20, medalCy + medalR + 22);
    ctx.lineTo(medalCx + 12, medalCy + medalR - 2);
    ctx.closePath();
    ctx.fill();

    const medalGrad = ctx.createRadialGradient(
      medalCx - 10, medalCy - 10, 4,
      medalCx, medalCy, medalR
    );
    medalGrad.addColorStop(0, tier.sealColors[0]);
    medalGrad.addColorStop(0.5, tier.sealColors[2]);
    medalGrad.addColorStop(1, tier.sealColors[3]);
    ctx.beginPath();
    ctx.arc(medalCx, medalCy, medalR, 0, Math.PI * 2);
    ctx.fillStyle = medalGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = tier.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(medalCx, medalCy, medalR - 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '26px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tier.icon, medalCx, medalCy + 1);

    ctx.font = '900 44px "Playfair Display", Georgia, serif';
    ctx.fillStyle = tier.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(scoreText, scoreX, medalCy + 2);

    ctx.font = '800 16px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = tier.deep;
    ctx.textAlign = 'left';
    ctx.fillText(gradeLabel, gradeX, medalCy + 3);

    ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'left';
    ctx.fillText('FINAL SCORE', scoreX, medalCy + 26);
    ctx.letterSpacing = '0px';

    ctx.strokeStyle = tier.borderInner;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(120, Y.footerLine);
    ctx.lineTo(W - 120, Y.footerLine);
    ctx.stroke();

    ctx.save();
    ctx.translate(W / 2, Y.footerLine);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = tier.borderOuter;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.font = 'italic 26px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('KR-Dict', 220, Y.signatureY - 10);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(140, Y.signatureY + 12);
    ctx.lineTo(300, Y.signatureY + 12);
    ctx.stroke();

    ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.letterSpacing = '2px';
    ctx.fillText('FOUNDER & DIRECTOR', 220, Y.signatureY + 32);
    ctx.letterSpacing = '0px';

    const sealR = 46;
    const sealCx = W / 2;
    const sealCy = Y.sealY;

    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = tier.accent;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const sealGrad = ctx.createRadialGradient(
      sealCx - 15, sealCy - 15, 5,
      sealCx, sealCy, sealR
    );
    sealGrad.addColorStop(0, tier.sealColors[0]);
    sealGrad.addColorStop(0.45, tier.sealColors[1]);
    sealGrad.addColorStop(0.75, tier.sealColors[2]);
    sealGrad.addColorStop(1, tier.sealColors[3]);
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR, 0, Math.PI * 2);
    ctx.fillStyle = sealGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 8, 0, Math.PI * 2);
    ctx.strokeStyle = tier.accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR - 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = '900 9px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('OFFICIAL', sealCx, sealCy - 14);
    ctx.letterSpacing = '0px';

    ctx.font = '18px serif';
    ctx.fillText('★', sealCx, sealCy + 4);

    ctx.font = '900 9px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SEAL', sealCx, sealCy + 20);
    ctx.letterSpacing = '0px';

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '2px';
    ctx.fillText('ISSUED DATE', W - 130, Y.metaY1);
    ctx.letterSpacing = '0px';

    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(dateStr, W - 130, Y.metaY2);

    ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '2px';
    ctx.fillText('CERTIFICATE ID', W - 130, Y.metaY3);
    ctx.letterSpacing = '0px';

    ctx.font = '700 11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(certId, W - 130, Y.metaY4);

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
      const tier = getCertTier(r.wrong);

      _certCanvas = renderCertificateToCanvas({
        name: user,
        pkgName: r.pkg.name,
        score: r.score,
        dateStr,
        certId,
        gradeText,
        wrong: r.wrong,
      });

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      _certFilenameBase = `Certificate_${tier.name}_${r.pkg.name.replace(/[^a-z0-9]/gi, '_')}_${user.replace(/[^a-z0-9]/gi, '_')}_${ts}`;

      const dataUrl = _certCanvas.toDataURL('image/png');

      els.certPreview.innerHTML = `
        <div style="border-radius:14px; overflow:hidden; margin-bottom:14px; background:linear-gradient(135deg, ${tier.tierGradient[0]}, ${tier.tierGradient[1]}, ${tier.tierGradient[2]}); padding:16px 20px; display:flex; align-items:center; gap:14px; color:#fff; box-shadow:0 8px 24px -8px rgba(15,23,42,0.25);">
          <div style="font-size:38px; line-height:1;">${tier.icon}</div>
          <div style="flex:1;">
            <div style="font-size:11px; font-weight:800; letter-spacing:0.15em; opacity:0.9;">CERTIFICATE TIER</div>
            <div style="font-size:22px; font-weight:900; letter-spacing:0.02em; margin-top:2px;">${tier.name}</div>
            <div style="font-size:12px; opacity:0.9; margin-top:2px;">${tier.title} · ${tier.wrongRange}</div>
          </div>
        </div>
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
