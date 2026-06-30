// UZAIBOT FRONTEND ORCHESTRATOR
document.addEventListener('DOMContentLoaded', () => {
  window.uzApp = new UzAiApp();
});

class UzAiApp {
  constructor() {
    this.messages = [];
    this.attachedFile = null;
    this.isWebSearchActive = false;
    this.responseMode = 'fast';
    
    this.initDOM();
    this.initEventListeners();
    this.initVoice();
  }

  initDOM() {
    this.messagesContainer = document.getElementById('messagesContainer');
    this.welcomeHero = document.getElementById('welcomeHero');
    this.promptInput = document.getElementById('promptInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.webSearchToggle = document.getElementById('webSearchToggle');
    this.attachedFilesBar = document.getElementById('attachedFilesBar');
    this.fileInput = document.getElementById('fileInput');
    this.deployModal = document.getElementById('deployModal');
  }

  initEventListeners() {
    // Send Message
    this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    this.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // Auto-expand input
    this.promptInput.addEventListener('input', () => {
      this.promptInput.style.height = 'auto';
      this.promptInput.style.height = (this.promptInput.scrollHeight) + 'px';
    });

    // Web Search Toggle
    this.webSearchToggle.addEventListener('click', () => {
      this.isWebSearchActive = !this.isWebSearchActive;
      this.webSearchToggle.classList.toggle('active', this.isWebSearchActive);
    });

    // Mode Toggle Pills
    document.querySelectorAll('#modeToggle .pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#modeToggle .pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.responseMode = btn.dataset.mode;
      });
    });

    // Suggestion Cards & Quick Chips
    document.querySelectorAll('.suggestion-card, .chip-btn').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt || card.dataset.chip;
        if (prompt) {
          this.promptInput.value = prompt;
          this.handleSendMessage();
        }
      });
    });

    // Attach File
    document.getElementById('attachFileBtn').addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Hosting 24/7 Modal
    document.getElementById('hostingGuideBtn')?.addEventListener('click', () => {
      this.deployModal.classList.remove('hidden');
    });
    document.getElementById('closeDeployModalBtn')?.addEventListener('click', () => {
      this.deployModal.classList.add('hidden');
    });

    // Theme Toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.getElementById('darkThemeOpt').classList.toggle('active', next === 'dark');
      document.getElementById('lightThemeOpt').classList.toggle('active', next === 'light');
    });

    // Sidebar & Widgets Drawer Toggles
    document.getElementById('openSidebarBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
    });
    document.getElementById('closeSidebarBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });
    document.getElementById('toggleWidgetsBtn')?.addEventListener('click', () => {
      const drawer = document.getElementById('widgetsDrawer');
      drawer.style.display = drawer.style.display === 'none' || !drawer.style.display ? 'flex' : 'none';
    });
    document.getElementById('closeWidgetsBtn')?.addEventListener('click', () => {
      document.getElementById('widgetsDrawer').style.display = 'none';
    });
  }

  initVoice() {
    if (window.VoiceEngine) {
      this.voiceEngine = new window.VoiceEngine((transcript) => {
        this.promptInput.value = transcript;
      });
      document.getElementById('voiceMicBtn')?.addEventListener('click', () => {
        if (this.voiceEngine.isListening) this.voiceEngine.stopListening();
        else this.voiceEngine.startListening();
      });
      document.getElementById('stopVoiceBtn')?.addEventListener('click', () => {
        this.voiceEngine.stopListening();
      });
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.attachedFile = file;

    this.attachedFilesBar.innerHTML = `
      <div class="file-tag">
        <i class="fa-solid fa-file"></i>
        <span>${file.name} (${(file.size/1024).toFixed(1)} KB)</span>
        <i class="fa-solid fa-xmark remove-file" id="removeFileBtn" style="cursor:pointer; margin-left:5px;"></i>
      </div>
    `;
    this.attachedFilesBar.classList.remove('hidden');

    document.getElementById('removeFileBtn').addEventListener('click', () => {
      this.attachedFile = null;
      this.attachedFilesBar.classList.add('hidden');
      this.fileInput.value = '';
    });
  }

  async handleSendMessage() {
    const text = this.promptInput.value.trim();
    if (!text && !this.attachedFile) return;

    if (this.welcomeHero) this.welcomeHero.style.display = 'none';

    const userMsgContent = text + (this.attachedFile ? `\n\n📎 [Файл: ${this.attachedFile.name}]` : '');
    this.appendMessage('user', userMsgContent);

    this.promptInput.value = '';
    this.promptInput.style.height = 'auto';

    const loadingId = this.appendLoadingMessage();

    try {
      let data;

      if (this.attachedFile && this.attachedFile.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', this.attachedFile);
        formData.append('prompt', text || "Проанализируй фото.");

        const res = await fetch('/api/vision', { method: 'POST', body: formData });
        data = await res.json();
        this.removeLoadingMessage(loadingId);
        this.appendMessage('ai', data.reply + (data.imagePath ? `\n\n![Uploaded Image](${data.imagePath})` : ''));

      } else if (this.attachedFile) {
        const formData = new FormData();
        formData.append('file', this.attachedFile);
        
        const parseRes = await fetch('/api/parse-file', { method: 'POST', body: formData });
        const parseData = await parseRes.json();

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Файл: ${parseData.filename}\nТекст: ${parseData.extractedText}\nВопрос: ${text}` }],
            webSearch: this.isWebSearchActive,
            detailedMode: this.responseMode === 'detailed'
          })
        });
        data = await res.json();
        this.removeLoadingMessage(loadingId);
        this.appendMessage('ai', data.reply);

      } else {
        this.messages.push({ role: 'user', content: text });

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: this.messages,
            webSearch: this.isWebSearchActive,
            detailedMode: this.responseMode === 'detailed'
          })
        });
        data = await res.json();
        this.removeLoadingMessage(loadingId);
        this.messages.push({ role: 'assistant', content: data.reply });
        this.appendMessage('ai', data.reply);
      }

    } catch (err) {
      this.removeLoadingMessage(loadingId);
      this.appendMessage('ai', '⚠️ Ошибка связи с сервером AI. Убедитесь, что сервер запущен.');
    }

    this.attachedFile = null;
    this.attachedFilesBar.classList.add('hidden');
    this.fileInput.value = '';
  }

  appendMessage(role, content) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const avatarHtml = role === 'ai' 
      ? `<div class="avatar"><i class="fa-solid fa-brain-circuit"></i></div>`
      : `<div class="avatar"><i class="fa-regular fa-user"></i></div>`;

    row.innerHTML = `
      ${role === 'ai' ? avatarHtml : ''}
      <div class="bubble">${this.formatMarkdown(content)}</div>
      ${role === 'user' ? avatarHtml : ''}
    `;

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  appendLoadingMessage() {
    const id = 'loading-' + Date.now();
    const row = document.createElement('div');
    row.className = 'message-row ai';
    row.id = id;
    row.innerHTML = `
      <div class="avatar"><i class="fa-solid fa-brain-circuit"></i></div>
      <div class="bubble">
        <span class="pulse"><i class="fa-solid fa-circle-notch fa-spin"></i> UzAiBot думает...</span>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
    return id;
  }

  removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  formatMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="generated-image-preview">');
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, l, code) => `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}
