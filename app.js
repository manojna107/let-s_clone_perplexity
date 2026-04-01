/* ============================================
   PERPLEXITY CLONE – app.js
   Vanilla JS: Chat UI, Typing Effect, Model
   Selector, Sidebar, Auto-resize Textarea
   ============================================ */

'use strict';

// ── State ──────────────────────────────────────────────
const state = {
  activeModel: 'gemini-2.5-flash',
  threads: [],
  currentThread: null,
  isTyping: false,
  sidebarOpen: false,
};

// ── DOM Refs ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const homeView        = $('homeView');
const chatView        = $('chatView');
const searchInput     = $('searchInput');
const sendBtn         = $('sendBtn');
const chatInput       = $('chatInput');
const chatSendBtn     = $('chatSendBtn');
const chatMessages    = $('chatMessages');
const chatTitle       = $('chatTitle');
const recentThreads   = $('recentThreads');
const modelDropdown   = $('modelDropdown');
const modelSelector   = $('modelSelector');
const sidebar         = $('sidebar');
const sidebarToggle   = $('sidebarToggle');
const sidebarOverlay  = $('sidebarOverlay');
const newThreadBtn    = $('newThreadBtn');
const pdfFileInput    = $('pdfFileInput');
const pdfBadge        = $('pdfBadge');
const pdfBadgeText    = $('pdfBadgeText');
const pdfClearBtn     = $('pdfClearBtn');
const uploadOverlay   = $('uploadOverlay');
const uploadStatusText= $('uploadStatusText');
const attachBtn       = $('attachBtn');
const chatAttachBtn   = $('chatAttachBtn');

// ── Auto-resize textareas ──────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

[searchInput, chatInput].forEach(el => {
  el.addEventListener('input', () => {
    autoResize(el);
    updateSendButton(el);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (el === searchInput) handleHomeSubmit();
      else handleChatSubmit();
    }
  });
});

function updateSendButton(inputEl) {
  const btn = inputEl === searchInput ? sendBtn : chatSendBtn;
  const hasText = inputEl.value.trim().length > 0;
  btn.classList.toggle('active', hasText);
}

// ── Send from HOME view ────────────────────────────────
sendBtn.addEventListener('click', handleHomeSubmit);
chatSendBtn.addEventListener('click', handleChatSubmit);

function handleHomeSubmit() {
  const query = searchInput.value.trim();
  if (!query || state.isTyping) return;
  startNewThread(query);
  searchInput.value = '';
  autoResize(searchInput);
  updateSendButton(searchInput);
}

function handleChatSubmit() {
  const query = chatInput.value.trim();
  if (!query || state.isTyping) return;
  appendUserMessage(query);
  chatInput.value = '';
  autoResize(chatInput);
  updateSendButton(chatInput);
  simulateAIResponse(query);
}

// ── Thread Management ──────────────────────────────────
function startNewThread(query) {
  const thread = {
    id: Date.now(),
    title: query.length > 42 ? query.slice(0, 42) + '…' : query,
    messages: [],
  };
  state.threads.unshift(thread);
  state.currentThread = thread;

  switchToChatView(thread.title);
  appendUserMessage(query);
  simulateAIResponse(query);
  renderRecentThreads();
}

function switchToChatView(title) {
  homeView.classList.add('hidden');
  chatView.classList.remove('hidden');
  chatTitle.textContent = title;
  chatMessages.innerHTML = '';
}

function switchToHomeView() {
  chatView.classList.add('hidden');
  homeView.classList.remove('hidden');
  state.currentThread = null;
}

// ── Message Rendering ──────────────────────────────────
function appendUserMessage(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper user-message-wrapper';
  wrapper.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function appendAIMessage(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai-message-wrapper';
  wrapper.innerHTML = `
    <div class="ai-header">
      <div class="ai-avatar">P</div>
      <span class="ai-label">Perplexity · ${state.activeModel}</span>
    </div>
    <div class="ai-content" id="aiContent-${Date.now()}"></div>
    <div class="ai-actions">
      <button class="ai-action-btn" onclick="copyToClipboard(this)">
        <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        Copy
      </button>
      <button class="ai-action-btn">
        <svg viewBox="0 0 24 24" fill="none"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Share
      </button>
      <button class="ai-action-btn">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Edit
      </button>
    </div>`;
  chatMessages.appendChild(wrapper);
  scrollToBottom();

  const contentEl = wrapper.querySelector('.ai-content');
  return contentEl;
}

function appendTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai-message-wrapper';
  wrapper.id = 'typingIndicator';
  wrapper.innerHTML = `
    <div class="ai-header">
      <div class="ai-avatar">P</div>
      <span class="ai-label">Perplexity · ${state.activeModel}</span>
    </div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = $('typingIndicator');
  if (el) el.remove();
}

// ── AI Response Simulation ─────────────────────────────
// Legacy mock responses removed. Backend now used at /chat.

async function simulateAIResponse(query) {
  state.isTyping = true;
  chatSendBtn.classList.remove('active');

  // Show typing dots after short delay
  setTimeout(async () => {
    appendTypingIndicator();
    scrollToBottom();

    try {
      // Relative path: Uses the same server that serves the HTML!
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Server responded with ' + res.status);
      }
      
      const data = await res.json();
      const responseText = data.response;

      removeTypingIndicator();
      const contentEl = appendAIMessage('');
      typewriterEffect(contentEl, responseText, () => {
        state.isTyping = false;
        updateSendButton(chatInput);
      });
    } catch (err) {
      removeTypingIndicator();
      console.error('Connection Error:', err);
      // Differentiate the message UI for errors
      const errorUI = `<div style="color: #ff4444; background: rgba(255, 68, 68, 0.05); padding: 12px; border: 1px solid rgba(255, 68, 68, 0.1); border-radius: 8px;">
        <strong>🔴 Connection Failure!</strong><br/>
        Unable to reach the Gemini 2.5 Flash model. <br/><br/>
        <strong>Fix:</strong> Double-click <code>run_backend.bat</code> and keep it open.
        <br/>Reason: <em>${err.message}</em>
      </div>`;
      const wrapper = document.createElement('div');
      wrapper.className = 'message-wrapper ai-message-wrapper';
      wrapper.innerHTML = errorUI;
      chatMessages.appendChild(wrapper);
      scrollToBottom();
      
      state.isTyping = false;
      updateSendButton(chatInput);
    }
  }, 300);
}

// ── Typewriter Effect ──────────────────────────────────
function typewriterEffect(el, markdown, onComplete) {
  const html = markdownToHtml(markdown);
  el.innerHTML = '';

  // Stream characters
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const fullText = tempDiv.innerText;

  let i = 0;
  const speed = 12; // ms per char

  function tick() {
    if (i < fullText.length) {
      i += Math.floor(Math.random() * 3) + 1; // random chunk for realism
      i = Math.min(i, fullText.length);
      // Re-render markdown up to current character
      el.innerHTML = markdownToHtml(markdown.slice(0, i));
      scrollToBottom();
      setTimeout(tick, speed);
    } else {
      el.innerHTML = markdownToHtml(markdown);
      scrollToBottom();
      if (onComplete) onComplete();
    }
  }
  tick();
}

// ── Markdown Parser (lightweight) ─────────────────────
function markdownToHtml(md) {
  return md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Numbered list items
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Bullet list items
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Paragraphs (double newlines)
    .replace(/\n\n+/g, '</p><p>')
    // Single newlines to <br>
    .replace(/\n(?!<)/g, '<br>')
    // Wrap with paragraph
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<(?:ul|pre|h[1-6]))/g, '$1')
    .replace(/(<\/(?:ul|pre|h[1-6])>)<\/p>/g, '$1');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Recent Threads ─────────────────────────────────────
function renderRecentThreads() {
  if (state.threads.length === 0) {
    recentThreads.innerHTML = '<p class="recent-empty">Recent and active threads will appear here.</p>';
    return;
  }

  recentThreads.innerHTML = state.threads.map(t => `
    <div class="thread-item" data-id="${t.id}">
      <svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      ${escapeHtml(t.title)}
    </div>`).join('');

  recentThreads.querySelectorAll('.thread-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      loadThread(id);
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
}

function loadThread(id) {
  const thread = state.threads.find(t => t.id === id);
  if (!thread) return;
  state.currentThread = thread;
  switchToChatView(thread.title);
}

// ── Quick Actions & Suggested Prompts ─────────────────
document.querySelectorAll('.quick-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
    searchInput.value = prompt;
    autoResize(searchInput);
    updateSendButton(searchInput);
    searchInput.focus();
  });
});

document.querySelectorAll('.suggested-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
    startNewThread(prompt);
  });
});

// ── Model Selector ─────────────────────────────────────
modelSelector.addEventListener('click', (e) => {
  e.stopPropagation();
  modelDropdown.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  modelDropdown.classList.add('hidden');
});

modelDropdown.addEventListener('click', (e) => e.stopPropagation());

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-item').forEach(i => {
      i.classList.remove('active');
      i.querySelector('.check-icon')?.remove();
    });

    item.classList.add('active');
    state.activeModel = item.dataset.model;

    const check = document.createElement('svg');
    check.className = 'check-icon';
    check.setAttribute('viewBox', '0 0 24 24');
    check.setAttribute('fill', 'none');
    check.innerHTML = '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    item.appendChild(check);

    // Update model chip text
    const name = item.querySelector('.dropdown-item-name').textContent;
    modelSelector.childNodes[0].textContent = name + ' ';

    modelDropdown.classList.add('hidden');
  });
});

// ── New Thread Button ──────────────────────────────────
newThreadBtn.addEventListener('click', () => {
  switchToHomeView();
  if (window.innerWidth <= 768) closeSidebar();
  setTimeout(() => searchInput.focus(), 100);
});

// ── Sidebar Toggle (Mobile) ────────────────────────────
sidebarToggle.addEventListener('click', () => {
  state.sidebarOpen ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.remove('hidden');
  state.sidebarOpen = true;
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.add('hidden');
  state.sidebarOpen = false;
}

// ── Nav Item Active Class ──────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
  });
});

// ── Copy to Clipboard ──────────────────────────────────
function copyToClipboard(btn) {
  const content = btn.closest('.ai-message-wrapper').querySelector('.ai-content');
  navigator.clipboard.writeText(content.innerText).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
    setTimeout(() => { btn.innerHTML = original; }, 2000);
  });
}

// Make copyToClipboard globally accessible (called from inline onclick)
window.copyToClipboard = copyToClipboard;

// ── Scroll Helper ──────────────────────────────────────
function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

// ── Search Box Focus Enhancement ──────────────────────
searchInput.addEventListener('focus', () => {
  document.querySelector('.search-box')?.classList.add('focused');
});
searchInput.addEventListener('blur', () => {
  document.querySelector('.search-box')?.classList.remove('focused');
});

// ── Keyboard Shortcut: / to focus search ──────────────
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    if (!homeView.classList.contains('hidden')) searchInput.focus();
    else chatInput.focus();
  }
});

// ── Init & Connection Check ────────────────────────────
async function checkBackendConnection() {
  try {
    const res = await fetch('/');
    if (res.ok) {
       console.log('%c Gemini 2.5 Flash Backend is READY', 'color: #20b2aa; font-size: 14px; font-weight: bold;');
    }
    // Also check for any existing uploads
    const statusRes = await fetch('/upload-status');
    if (statusRes.ok) {
      const data = await statusRes.json();
      if (data.active && data.count > 0) {
        pdfBadge.classList.remove('hidden');
        pdfBadgeText.textContent = data.documents.join(', ');
      }
    }
  } catch (err) {
    console.warn('Server not detected. Please run run_backend.bat');
  }
}

// ── PDF Upload System ───────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('pdfFileInput');
  const fileInputChat = document.getElementById('pdfFileInputChat');
  const searchBox = document.getElementById('searchBox');
  const chatSearchBox = document.getElementById('chatSearchBox');

  // Handle file selection from the native desktop file dialog (HOME)
  if (fileInput) {
    fileInput.onchange = async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      handleValidatedFile(file);
      fileInput.value = '';
    };
  }

  // Handle file selection from the native desktop file dialog (CHAT)
  if (fileInputChat) {
    fileInputChat.onchange = async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      handleValidatedFile(file);
      fileInputChat.value = '';
    };
  }

  // --- Laptop/Desktop Feature: Drag & Drop ---
  [searchBox, chatSearchBox].forEach(box => {
    if (!box) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      box.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    box.addEventListener('dragenter', () => box.classList.add('drag-active'));
    box.addEventListener('dragover', () => box.classList.add('drag-active'));
    box.addEventListener('dragleave', () => box.classList.remove('drag-active'));
    box.addEventListener('drop', (e) => {
      box.classList.remove('drag-active');
      const file = e.dataTransfer.files[0];
      if (file) handleValidatedFile(file);
    });
  });
});

async function handleValidatedFile(file) {
  console.log('[PDF] File selected:', file.name);
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Please select a PDF file from your laptop.');
    return;
  }
  await uploadPDF(file);
}

async function uploadPDF(file) {
  // Show upload overlay
  uploadOverlay.classList.remove('hidden');
  uploadStatusText.textContent = `Processing "${file.name}"...`;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();

    // Show success badge
    pdfBadge.classList.remove('hidden');
    pdfBadgeText.textContent = data.filename;

    // If in home view, put a note in the search
    if (!homeView.classList.contains('hidden')) {
      searchInput.placeholder = `Ask about "${data.filename}" (${data.pages} pages)...`;
      searchInput.focus();
    }

    console.log(`[PDF] Uploaded: ${data.filename} (${data.pages} pages, ${data.characters} chars)`);

  } catch (err) {
    console.error('Upload error:', err);
    alert('Failed to upload PDF: ' + err.message);
  } finally {
    uploadOverlay.classList.add('hidden');
  }
}

// Clear uploaded PDFs
pdfClearBtn.addEventListener('click', async () => {
  try {
    await fetch('/clear-docs', { method: 'POST' });
    pdfBadge.classList.add('hidden');
    pdfBadgeText.textContent = 'No file';
    searchInput.placeholder = 'Type @ for connectors and sources';
    console.log('[PDF] All documents cleared.');
  } catch (err) {
    console.error('Failed to clear docs:', err);
  }
});

(function init() {
  renderRecentThreads();
  searchInput.focus();
  checkBackendConnection();
})();
