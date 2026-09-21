/* ==========================================
   KR-Dict — Quiz Module (Reading + Listening)
   Listening pakai Text-to-Speech (bisa dari pertanyaan / pilihan / keduanya)
   ========================================== */
window.KR = window.KR || {};

KR.quiz = (function () {
  'use strict';

  const STORAGE = KR.auth.STORAGE;
  const DATA_KEY = 'quizzes';
  const RESULT_KEY = 'quizResults';

  let quizzes = [];
  let activeSession = null;
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
      resultReview: document.getElementById('quizResultReview'),
      resultClose: document.getElementById('quizResultClose'),
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
    const totalQ = sections.reduce((s, sec) => s + (sec.questions?.length || 0), 0);

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
    // Pilih voice Korea jika ada
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find(v => v.lang.startsWith('ko'));
    if (koVoice) u.voice = koVoice;
    window.speechSynthesis.speak(u);
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

    // FIX BUG: shuffle options juga update correct
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
    els.testWrap.classList.remove('hidden');
    els.testWrap.classList.add('flex');
    els.testTitle.textContent = activeSession.pkg.name;
    document.body.style.overflow = 'hidden';
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
    const isKepribadian = section.type === 'kepribadian'; // if any
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

    // Build question HTML
    let qHtml = '';

    // Audio player (jika listening)
    if (isListening) {
      const audioTarget = question.audioTarget || 'question'; // 'question' | 'options' | 'both'
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

    // Question text
    if (question.text) {
      qHtml += `<div class="quiz-question-text">${esc(question.text)}</div>`;
    }
    if (question.image) {
      qHtml += `<div class="quiz-question-image"><img src="${question.image}" alt=""></div>`;
    }

    // Options
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

    // Feedback (practice mode)
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

    // Bind option clicks
    els.testQ.querySelectorAll('.quiz-option-card:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn.dataset.opt, section.type === 'kepribadian'));
    });

    // Nav buttons
    els.testPrev.disabled = currentIdx === 0;
    const isLast = currentIdx === flatQuestions.length - 1;
    els.testNext.classList.toggle('hidden', isLast);
    els.testSubmit.classList.toggle('hidden', !isLast);

    renderNav();
    els.testQ.scrollTop = 0;

    // Auto play audio untuk listening (setelah 300ms)
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

  function handleAnswer(optId, isKepribadian) {
    const idx = activeSession.currentIdx;
    activeSession.answers[idx] = optId;
    if (activeSession.mode === 'practice' && !isKepribadian) {
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

    // Save history
    const history = STORAGE.get(RESULT_KEY, []);
    history.unshift({
      id: Date.now().toString(36),
      packageId: pkg.id, packageName: pkg.name,
      mode, score, correct, wrong, total, duration,
      at: Date.now(), details,
    });
    if (history.length > 30) history.length = 30;
    STORAGE.set(RESULT_KEY, history);

    showResults({ pkg, mode, score, correct, wrong, total, duration, details });
  }

  /* ==========================================
     RESULTS
     ========================================== */
  function showResults(r) {
    els.testWrap.classList.add('hidden');
    els.testWrap.classList.remove('flex');
    els.resultWrap.classList.remove('hidden');

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

    // Review
    let reviewHtml = '<h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Review Jawaban</h3>';
    r.details.forEach((d, i) => {
      const isListening = d.questionType === 'listening';
      const cls = d.isCorrect ? 'correct' : (d.userAns ? 'incorrect' : 'skipped');
      const userOpt = (d.options || []).find(o => o.id === d.userAns);
      const correctOpt = (d.options || []).find(o => o.id === d.correct);
      reviewHtml += `
        <div class="quiz-review-item ${cls}">
          <div class="quiz-review-head">
            <span class="quiz-review-num">Soal ${i + 1}</span>
            <span class="quiz-review-badge ${cls}">
              <i data-lucide="${d.isCorrect ? 'check' : d.userAns ? 'x' : 'minus'}" class="w-3 h-3"></i>
              ${d.isCorrect ? 'Benar' : d.userAns ? 'Salah' : 'Kosong'}
            </span>
            ${isListening ? '<span class="quiz-review-tag pink"><i data-lucide="headphones" class="w-3 h-3"></i>Listening</span>' : ''}
          </div>
          ${d.questionText ? `<div class="quiz-review-q">${esc(d.questionText)}</div>` : ''}
          ${isListening && d.audioText ? `<div class="quiz-review-audio"><button class="quiz-audio-replay" onclick="KR.quiz.speakText('${d.audioText.replace(/'/g, "\\'")}')"><i data-lucide="play" class="w-4 h-4"></i></button><span class="text-xs text-gray-500 italic">Audio di soal ini</span></div>` : ''}
          <div class="quiz-review-answers">
            <div class="quiz-review-row"><span class="quiz-review-label">Jawaban Anda:</span><span class="quiz-review-val ${cls}">${d.userAns ? d.userAns + '. ' + esc(userOpt?.text || '') : '(kosong)'}</span></div>
            ${!d.isCorrect ? `<div class="quiz-review-row"><span class="quiz-review-label">Jawaban Benar:</span><span class="quiz-review-val correct">${d.correct}. ${esc(correctOpt?.text || '')}</span></div>` : ''}
          </div>
        </div>`;
    });
    els.resultReview.innerHTML = reviewHtml;

    els.resultWrap.scrollTop = 0;
    if (window.lucide) lucide.createIcons();
  }

  function speakText(text) { speak(text); }

  function formatDur(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function closeResults() {
    els.resultWrap.classList.add('hidden');
    els.listWrap.classList.remove('hidden');
    document.body.style.overflow = '';
    activeSession = null;
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
        document.body.style.overflow = '';
        activeSession = null;
      }
    });
    els.resultClose?.addEventListener('click', closeResults);
  }

  return {
    init, reload: loadQuizzes,
    playAudio, speakText,
    // Expose untuk admin
    getQuizzes: () => quizzes,
    saveQuizzes,
    setQuizzes: (arr) => { quizzes = arr; saveQuizzes(); renderList(); },
  };
})();
