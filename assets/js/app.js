/* ==========================================
   AI TUTOR MODULE (v2.1)
   + Robust settings toggle
   + Online/offline status
   + Test connection
   ========================================== */
KR.ai = (function () {
  'use strict';

  const MODE_PROMPTS = {
    tutor: 'Anda adalah Tutor Bahasa Korea profesional & ramah. Koreksi grammar, ejaan, atau kosakata yang salah, lalu jelaskan dengan sopan & singkat.',
    correct: 'Anda adalah guru Bahasa Korea yang fokus MENGOREKSI tulisan Korea user. Format: 1) Tampilkan versi koreksi, 2) List kesalahan (minimal 1, maksimal 5) dengan penjelasan singkat, 3) Beri tips. Jika tulisan sudah benar, puji user.',
    explain: 'Anda adalah guru Bahasa Korea yang menjelaskan grammar/kosakata dengan DETAIL. Gunakan format: 1) Arti singkat, 2) Fungsi/penggunaan, 3) Rumus/pola, 4) 3 contoh kalimat (Hangul + romanisasi + arti), 5) Catatan penting.',
    translate: 'Anda adalah penerjemah profesional Korea↔Indonesia↔English. Terjemahkan dengan akurat, berikan juga romanisasi, dan jelaskan nuansa jika perlu.',
    practice: 'Anda adalah teman Korea (banmal, santai) untuk latihan ngobrol. Topik bebas. Selalu balas dengan Korea + romanisasi + arti Indonesia. Jika user salah, koreksi singkat di akhir dengan tanda 💡.',
    quiz: 'Anda adalah pembuat kuis Bahasa Korea. Buat 1 soal pilihan ganda (A-D) atau isian. Setelah user jawab, beri feedback + skor. Lanjutkan dengan soal baru.',
    casual: 'Anda adalah Ji-eun, teman Korea yang ramah & gaul. Jawab santai dengan banmal. Selalu sertakan romanisasi + arti Indonesia.',
  };

  const LEVEL_HINT = {
    pemula: 'Level user: PEMULA. Gunakan kalimat sederhana, selalu beri romanisasi & arti Indonesia untuk setiap kata Korea. Jelaskan dengan bahasa Indonesia yang mudah.',
    menengah: 'Level user: MENENGAH. Bisa pakai kalimat sedang, terkadang tanpa romanisasi.',
    lanjut: 'Level user: LANJUT. Gunakan bahasa Korea natural, minim romanisasi, bahas grammar detail.',
  };

  let els = {};
  let _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;

    try {
      els = {
        chatBox: document.getElementById('chat-box'),
        userInput: document.getElementById('user-input'),
        actionBtn: document.getElementById('action-btn'),
        providerSelect: document.getElementById('ai-provider-select'),
        modelSelect: document.getElementById('ai-model-select'),
        keyInput: document.getElementById('ai-key-input'),
        keyHelp: document.getElementById('ai-key-help'),
        providerDesc: document.getElementById('ai-provider-desc'),
        customEndpointGroup: document.getElementById('custom-endpoint-group'),
        customEndpoint: document.getElementById('ai-custom-endpoint'),
        headerName: document.getElementById('ai-header-name'),
        status: document.getElementById('ai-status'),
        statusDot: document.getElementById('ai-status-dot'),
        avatar: document.getElementById('ai-avatar-icon'),
        setupWarning: document.getElementById('ai-setup-warning'),
      };

      console.log('[AI] Init module...');
      populateProviderSelect();
      loadCurrentConfig();
      updateHeaderByPersona();
      resetChat();
      updateStatusFromConfig();
      console.log('[AI] Init OK');
    } catch (err) {
      console.error('[AI Init Error]', err);
    }
  }

  function populateProviderSelect() {
    if (!els.providerSelect) return;
    els.providerSelect.innerHTML = Object.entries(AI_PROVIDERS).map(([id, p]) =>
      `<option value="${id}">${p.icon} ${p.name}</option>`
    ).join('');
  }

  function loadCurrentConfig() {
    const cfg = getAIConfig();
    if (els.providerSelect) els.providerSelect.value = cfg.provider;
    populateModelSelect(cfg.provider, cfg.model);
    if (els.keyInput) els.keyInput.value = cfg.apiKey;
    if (els.customEndpoint) els.customEndpoint.value = cfg.customEndpoint;
    updateProviderUI(cfg.provider);
  }

  function populateModelSelect(providerId, selectedModel) {
    const p = AI_PROVIDERS[providerId];
    if (!p || !els.modelSelect) return;
    els.modelSelect.innerHTML = p.models.map(m =>
      `<option value="${m}" ${m === selectedModel ? 'selected' : ''}>${m}</option>`
    ).join('');
  }

  function updateProviderUI(providerId) {
    const p = AI_PROVIDERS[providerId];
    if (!p) return;
    if (els.providerDesc) els.providerDesc.textContent = p.desc || '';
    if (els.keyHelp) {
      if (p.keyUrl) {
        els.keyHelp.href = p.keyUrl;
        els.keyHelp.style.display = '';
      } else {
        els.keyHelp.style.display = 'none';
      }
    }
    if (els.customEndpointGroup) {
      els.customEndpointGroup.classList.toggle('hidden', providerId !== 'custom');
    }
  }

  function updateHeaderByPersona() {
    const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
    if (!els.headerName || !els.status || !els.avatar) return;
    if (mode === 'casual') {
      els.headerName.textContent = 'Ji-eun (Teman Korea)';
      els.avatar.setAttribute('data-lucide', 'smile-plus');
    } else {
      els.headerName.textContent = 'Tutor AI Korea';
      els.avatar.setAttribute('data-lucide', 'bot');
    }
    if (window.lucide) lucide.createIcons();
    updateStatusFromConfig();
  }

  /* ✅ NEW: Update status indicator based on API key */
  function updateStatusFromConfig() {
    const cfg = getAIConfig();
    const statusEl = els.status || document.getElementById('ai-status');
    const dotEl = els.statusDot || document.getElementById('ai-status-dot');
    const warning = els.setupWarning || document.getElementById('ai-setup-warning');

    if (!statusEl) return;

    if (cfg.apiKey && cfg.apiKey.trim().length > 10) {
      const p = AI_PROVIDERS[cfg.provider];
      const persona = document.getElementById('chat-mode-select')?.value || 'tutor';
      const personaLabel = persona === 'casual' ? 'Ji-eun' : 'Tutor';
      statusEl.innerHTML = `<span style="color:#10b981;font-weight:800;">● Online</span> • ${p?.name || cfg.provider}`;
      statusEl.style.color = '';
      if (dotEl) dotEl.style.background = '#10b981';
      if (warning) warning.classList.add('hidden');
    } else {
      statusEl.innerHTML = `<span style="color:#ef4444;font-weight:800;">● Offline</span> • Setup API Key`;
      statusEl.style.color = '';
      if (dotEl) dotEl.style.background = '#ef4444';
      if (warning) warning.classList.remove('hidden');
    }
  }

  /* ✅ NEW: Test connection to AI provider */
  async function testConnection() {
    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      KR.toast?.error('Isi API Key dulu');
      return;
    }
    KR.toast?.info('Testing koneksi...');
    try {
      const reply = await callAIProvider({
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        model: cfg.model,
        customEndpoint: cfg.customEndpoint,
        systemPrompt: 'Balas dengan satu kata: OK',
        messages: [{ role: 'user', content: 'Test' }],
      });
      KR.toast?.success('✅ Koneksi berhasil!');
      updateStatusFromConfig();
    } catch (err) {
      console.error('[Test]', err);
      KR.toast?.error('❌ Gagal: ' + err.message);
    }
  }

  function setQuickMode(mode) {
    currentQuickMode = mode;
    document.querySelectorAll('.chat-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.mode === mode);
    });
    const modeNames = {
      tutor: '🎓 Mode Tutor aktif — kirim kalimat Korea atau tanya apa saja',
      correct: '✏️ Mode Koreksi aktif — kirim tulisan Korea Anda untuk dikoreksi',
      explain: '📖 Mode Penjelasan aktif — tanya grammar/kosakata',
      translate: '🌐 Mode Terjemahan aktif — kirim teks untuk diterjemahkan',
      practice: '💬 Mode Ngobrol aktif — ayo latihan percakapan!',
      quiz: '🎯 Mode Kuis aktif — mari uji kosakata Anda!',
    };
    addSystemHint(modeNames[mode] || '');
  }

  function addSystemHint(text) {
    if (!text || !els.chatBox) return;
    const div = document.createElement('div');
    div.className = 'chat-system-hint';
    div.innerHTML = text;
    els.chatBox.appendChild(div);
    els.chatBox.scrollTo({ top: els.chatBox.scrollHeight, behavior: 'smooth' });
  }

  function buildSystemPrompt() {
    const persona = document.getElementById('chat-mode-select')?.value || 'tutor';
    const level = document.getElementById('chat-level-select')?.value || 'pemula';
    const modePrompt = MODE_PROMPTS[currentQuickMode] || MODE_PROMPTS.tutor;
    const levelHint = LEVEL_HINT[level];
    let prompt = `${modePrompt}\n${levelHint}\n\n`;
    if (persona === 'casual' && currentQuickMode === 'tutor') {
      prompt += MODE_PROMPTS.casual;
    }
    prompt += `\n\nFormat output: Gunakan formatting markdown ringan (**bold**, list dengan -). Untuk kalimat Korea, tulis dalam Hangul. Jangan pakai emoji berlebihan.`;
    return prompt;
  }

  function getTimeString() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function formatAIResponse(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
    html = html.replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function addMessage(text, sender, opts = {}) {
    const chatBox = els.chatBox;
    if (!chatBox) return;
    const div = document.createElement('div');
    const time = getTimeString();
    const bubbleClass = sender === 'user' ? 'wa-bubble wa-bubble-user' : 'wa-bubble wa-bubble-ai';
    let contentHtml = '';
    if (opts.isImage) {
      contentHtml = `<div class="chat-img-msg"><img src="${text}" alt="user image"></div>`;
    } else if (opts.isVoice) {
      const cleanText = text.replace("[VOICE NOTE]", "").trim();
      contentHtml = `<div class="chat-voice-msg"><div class="chat-voice-icon"><i data-lucide="play"></i></div><div class="chat-voice-body"><div class="chat-voice-wave"><span></span></div><div class="chat-voice-label">🎙️ ${escapeHtml(cleanText.substring(0, 40))}</div></div></div>`;
    } else if (sender === 'user') {
      contentHtml = escapeHtml(text).replace(/\n/g, '<br>');
    } else {
      contentHtml = formatAIResponse(text);
    }
    div.className = bubbleClass;
    div.innerHTML = `<div class="wa-bubble-content">${contentHtml}</div><div class="wa-time">${time}</div>`;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }

  function addTypingIndicator() {
    const chatBox = els.chatBox;
    if (!chatBox) return null;
    const div = document.createElement('div');
    div.className = 'wa-bubble wa-bubble-ai chat-typing';
    div.id = 'chatTypingIndicator';
    div.innerHTML = `<div class="chat-dots"><span></span><span></span><span></span></div>`;
    chatBox.appendChild(div);
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    return div;
  }
  function removeTypingIndicator() {
    document.getElementById('chatTypingIndicator')?.remove();
  }

  function resetChat() {
    chatHistory = [];
    const mode = document.getElementById('chat-mode-select')?.value || 'tutor';
    const cfg = getAIConfig();
    const hasKey = cfg.apiKey && cfg.apiKey.trim().length > 10;

    let welcomeMsg;
    if (!hasKey) {
      welcomeMsg = `👋 Selamat datang di <strong>AI Tutor Korea</strong>!<br><br>⚠️ Anda belum mengatur API Key.<br><br>Klik ikon <strong>⚙️ Pengaturan</strong> di kanan atas untuk:<br>1. Pilih AI Provider (rekomendasi: <strong>Groq</strong> gratis & cepat)<br>2. Masukkan API Key<br>3. Test koneksi<br><br><em>Setelah itu Anda bisa mulai belajar!</em>`;
    } else if (mode === 'casual') {
      welcomeMsg = "안녕! 👋 Aku <strong>Ji-eun</strong>.<br>Mau cerita apa hari ini? Pakai <strong>banmal</strong> (santai) aja ya!";
    } else {
      welcomeMsg = "안녕하세요! 👋 Saya <strong>Tutor AI Korea</strong>.<br>Pilih <strong>mode</strong> di atas, atau langsung kirim:<br>- Kalimat Korea untuk dikoreksi<br>- Pertanyaan grammar/kosakata<br>- Topik untuk latihan ngobrol";
    }

    const chatBox = els.chatBox;
    if (!chatBox) return;
    chatBox.innerHTML = `
      <div class="chat-day-divider"><span>Hari Ini</span></div>
      <div class="wa-bubble wa-bubble-ai">
        <div class="wa-bubble-content">${welcomeMsg}</div>
        <div class="wa-time">${getTimeString()}</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function handleChatEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    const btn = document.getElementById('action-btn');
    if (!btn) return;
    if (el.value.trim().length > 0) {
      btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
      btn.onclick = () => sendMessage();
    } else {
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
      btn.onclick = toggleVoiceRecording;
    }
    if (window.lucide) lucide.createIcons();
  }

  async function sendMessage(manualText = null) {
    if (isTyping) return;
    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      KR.toast?.warn('Silakan isi API Key dulu di ⚙️ Pengaturan');
      toggleChatSettings();
      return;
    }
    if (cfg.provider === 'custom' && !cfg.customEndpoint) {
      KR.toast?.warn('Isi Custom Endpoint URL dulu');
      toggleChatSettings();
      return;
    }

    const input = els.userInput;
    const text = manualText || (input ? input.value.trim() : '');
    if (!text && !selectedImageBase64) return;

    isTyping = true;
    if (!manualText && input) {
      input.value = '';
      input.style.height = 'auto';
    }
    const btn = els.actionBtn;
    if (btn) {
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
      btn.onclick = toggleVoiceRecording;
    }
    if (window.lucide) lucide.createIcons();

    if (selectedImageBase64) {
      addMessage(selectedImageBase64, 'user', { isImage: true });
    } else if (text.includes('[VOICE NOTE]')) {
      addMessage(text, 'user', { isVoice: true });
    } else {
      addMessage(text, 'user');
    }

    addTypingIndicator();

    const userMsg = {
      role: 'user',
      content: selectedImageBase64
        ? { text: text || 'Lihat gambar ini dan koreksi/analisa', imageBase64: selectedImageBase64 }
        : text,
    };
    chatHistory.push(userMsg);

    try {
      const systemPrompt = buildSystemPrompt();
      const reply = await callAIProvider({
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        model: cfg.model,
        customEndpoint: cfg.customEndpoint,
        systemPrompt,
        messages: chatHistory,
      });
      removeTypingIndicator();
      chatHistory.push({ role: 'assistant', content: reply });
      addMessage(reply, 'ai');
    } catch (err) {
      console.error('[AI]', err);
      removeTypingIndicator();
      addMessage(`❌ **Error:** ${err.message || 'Koneksi gagal'}\n\n_Cek: API Key, Provider, atau koneksi internet._`, 'ai');
    } finally {
      isTyping = false;
      selectedImageBase64 = null;
      if (!manualText && input && window.innerWidth > 768) input.focus();
    }
  }

  async function callAIProvider({ provider, apiKey, model, customEndpoint, systemPrompt, messages }) {
    const cfg = AI_PROVIDERS[provider];
    if (!cfg) throw new Error('Provider tidak dikenal');
    let endpoint = provider === 'custom' ? customEndpoint : cfg.endpoint;
    if (!endpoint) throw new Error('Endpoint URL belum diatur');
    endpoint = endpoint.replace('{model}', model);

    switch (cfg.format) {
      case 'gemini': return callGemini(endpoint, apiKey, systemPrompt, messages);
      case 'anthropic': return callAnthropic(endpoint, apiKey, model, systemPrompt, messages);
      default: return callOpenAICompatible(endpoint, apiKey, model, systemPrompt, messages);
    }
  }

  async function callGemini(endpoint, apiKey, systemPrompt, messages) {
    const contents = messages.map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'object' && m.content.imageBase64) {
        const base64 = m.content.imageBase64.split(',')[1];
        return { role, parts: [{ text: m.content.text || '' }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }] };
      }
      return { role, parts: [{ text: String(m.content) }] };
    });
    const res = await fetch(endpoint + '?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini error');
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(Tidak ada respons)';
  }

  async function callOpenAICompatible(endpoint, apiKey, model, systemPrompt, messages) {
    const converted = messages.map(m => {
      if (typeof m.content === 'object' && m.content.imageBase64) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content.text || '' },
            { type: 'image_url', image_url: { url: m.content.imageBase64 } },
          ],
        };
      }
      return { role: m.role, content: String(m.content) };
    });
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
    if (endpoint.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = location.origin || 'https://localhost';
      headers['X-Title'] = 'KR-Dict Learning Hub';
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...converted],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content || '(Tidak ada respons)';
  }

  async function callAnthropic(endpoint, apiKey, model, systemPrompt, messages) {
    const converted = messages.map(m => {
      if (typeof m.content === 'object' && m.content.imageBase64) {
        const base64 = m.content.imageBase64.split(',')[1];
        return {
          role: m.role,
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: m.content.text || '' },
          ],
        };
      }
      return { role: m.role, content: [{ type: 'text', text: String(m.content) }] };
    });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, messages: converted }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.content?.[0]?.text || '(Tidak ada respons)';
  }

  function toggleVoiceRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      KR.toast?.error('Browser tidak mendukung Voice Note.');
      return;
    }
    const btn = els.actionBtn;
    if (!btn) return;
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      btn.classList.remove('chat-recording');
      btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
    } else {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        isRecording = true;
        btn.classList.add('chat-recording');
        btn.innerHTML = '<i data-lucide="square" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(`[VOICE NOTE] ${transcript}`);
      };
      recognition.onerror = () => {
        isRecording = false;
        btn.classList.remove('chat-recording');
        btn.innerHTML = '<i data-lucide="mic" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      };
      recognition.start();
    }
    if (window.lucide) lucide.createIcons();
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      KR.toast?.error('Gambar terlalu besar (max 5MB)');
      return;
    }
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
    sendMessage("Koreksi/analisa gambar ini");
  }

  return {
    init, sendMessage, resetChat, setQuickMode, handleChatEnter,
    autoGrowTextarea, toggleVoiceRecording, handleImageSelect, cancelImage, sendImage,
    updateHeaderByPersona, getAIConfig, saveAIConfig, AI_PROVIDERS,
    populateModelSelect, updateProviderUI, addMessage,
    updateStatusFromConfig, testConnection,
  };
})();

/* ---------- BRIDGE GLOBAL FUNCTIONS ---------- */
/* ✅ ROBUST SETTINGS TOGGLE — multiple fallback classes */
function toggleChatSettings() {
  const sheet = document.getElementById('chat-settings');
  if (!sheet) {
    console.warn('[AI] #chat-settings not found');
    return;
  }
  const isOpen = sheet.classList.contains('open');
  if (isOpen) {
    sheet.classList.remove('open');
    sheet.classList.remove('show');
    sheet.classList.remove('active');
    sheet.style.opacity = '';
    sheet.style.visibility = '';
    sheet.style.pointerEvents = '';
    console.log('[AI] Settings closed');
  } else {
    sheet.classList.add('open');
    sheet.classList.add('show');
    sheet.style.opacity = '1';
    sheet.style.visibility = 'visible';
    sheet.style.pointerEvents = 'auto';
    console.log('[AI] Settings opened');
  }
  if (window.lucide) lucide.createIcons();
}

function onProviderChange() {
  const providerId = document.getElementById('ai-provider-select')?.value;
  if (!providerId) return;
  const cfg = AI_PROVIDERS[providerId];
  saveAIConfig({ provider: providerId, model: cfg.defaultModel });
  KR.ai.populateModelSelect(providerId, cfg.defaultModel);
  KR.ai.updateProviderUI(providerId);
  const keyInput = document.getElementById('ai-key-input');
  if (keyInput) keyInput.value = localStorage.getItem('ai_key_' + providerId) || '';
  const customInput = document.getElementById('ai-custom-endpoint');
  if (customInput) customInput.value = localStorage.getItem('ai_custom_endpoint') || '';
  KR.ai.updateStatusFromConfig();
}

function onModelChange() {
  const provider = document.getElementById('ai-provider-select')?.value;
  const model = document.getElementById('ai-model-select')?.value;
  if (provider && model) saveAIConfig({ provider, model });
}

function saveApiKeyMulti() {
  const provider = document.getElementById('ai-provider-select')?.value;
  const key = document.getElementById('ai-key-input')?.value.trim();
  const customEndpoint = document.getElementById('ai-custom-endpoint')?.value.trim();
  if (!provider) return;
  if (!key) {
    KR.toast?.error('API Key tidak boleh kosong');
    return;
  }
  saveAIConfig({ provider, apiKey: key, customEndpoint });
  KR.toast?.success('✅ API Key tersimpan untuk ' + (AI_PROVIDERS[provider]?.name || provider));
  KR.ai.updateStatusFromConfig();
  KR.ai.resetChat();
  setTimeout(() => toggleChatSettings(), 800);
}

function updateChatMode() {
  KR.ai.updateHeaderByPersona();
  KR.ai.resetChat();
}

function sendMessage(text) { return KR.ai.sendMessage(text); }
function resetChat() { return KR.ai.resetChat(); }
function setQuickMode(m) { return KR.ai.setQuickMode(m); }
function handleChatEnter(e) { return KR.ai.handleChatEnter(e); }
function autoGrowTextarea(el) { return KR.ai.autoGrowTextarea(el); }
function toggleVoiceRecording() { return KR.ai.toggleVoiceRecording(); }
function handleImageSelect(e) { return KR.ai.handleImageSelect(e); }
function cancelImage() { return KR.ai.cancelImage(); }
function sendImage() { return KR.ai.sendImage(); }

/* ---------- REST OF CODE (call feature, tabs, etc.) — SAMA SEPERTI SEBELUMNYA ---------- */
