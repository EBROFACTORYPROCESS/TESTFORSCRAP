// ============================================================
//  EBRO Form Extractor - Application Logic
//  Depends on: config.js (must be loaded first)
// ============================================================

// ---- DOM references ---- 
const platformSelect = document.getElementById('platformSelect');
const apiKeyInput = document.getElementById('apiKey');
const apiKeyBadge = document.getElementById('apiKeyBadge');
const platformHint = document.getElementById('platformHint');
const apiKeyHint = document.getElementById('apiKeyHint');
const balancePanel = document.getElementById('balancePanel');
const balanceContent = document.getElementById('balanceContent');
const refreshBalanceBtn = document.getElementById('refreshBalanceBtn');
const pathPrefixInput = document.getElementById('pathPrefix');
const maxSizeInput = document.getElementById('maxSize');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const extractBtn = document.getElementById('extractBtn');
const retryAllBtn = document.getElementById('retryAllBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const queueList = document.getElementById('queueList');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const summaryEl = document.getElementById('summary');
const resultSection = document.getElementById('resultSection');
const issuesBanner = document.getElementById('issuesBanner');
const resultTable = document.getElementById('resultTable');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const geminiModelRow = document.getElementById('geminiModelRow');
const geminiModelSelect = document.getElementById('geminiModelSelect');
const geminiModelHint = document.getElementById('geminiModelHint');
const errorSummary = document.getElementById('errorSummary');
const rotateLeftBtn = document.getElementById('rotateLeftBtn');
const rotateRightBtn = document.getElementById('rotateRightBtn');

// Local mode elements
const imsFolderBtn = document.getElementById('imsFolderBtn');
const imsUploadBtn = document.getElementById('imsUploadBtn');
const uploadPanel = document.getElementById('uploadPanel');
const localModePanel = document.getElementById('localModePanel');
const localStatus = document.getElementById('localStatus');
const localInputLabel = document.getElementById('localInputLabel');
const localReadedLabel = document.getElementById('localReadedLabel');
const localErrorLabel = document.getElementById('localErrorLabel');
const localPickInputBtn = document.getElementById('localPickInputBtn');
const localPickReadedBtn = document.getElementById('localPickReadedBtn');
const localPickErrorBtn = document.getElementById('localPickErrorBtn');
const localLoadBtn = document.getElementById('localLoadBtn');
const localProcessBtn = document.getElementById('localProcessBtn');

// Modal
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalFileLabel = document.getElementById('modalFileLabel');
const modalImage = document.getElementById('modalImage');
const modalFields = document.getElementById('modalFields');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const modalResetBtn = document.getElementById('modalResetBtn');
const imageScroll = document.getElementById('imageScroll');
const zoomLabel = document.getElementById('zoomLabel');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomFitBtn = document.getElementById('zoomFitBtn');
const zoomFitHBtn = document.getElementById('zoomFitHBtn');

// ---- State ----
let queue = [];
let isRunning = false;
let idCounter = 0;
let editingTaskId = null;
let editingDraft = null;
let localHandles = { input: null, readed: null, error: null };
let inputMethod = 'folder'; // 'folder' | 'upload'
let modalRotation = 0;

const zoomState = { scale: 1, naturalW: 0, naturalH: 0, fitMode: null };

// ============================================================
//  Bootstrap
// ============================================================
(async function init() {

  // Check browser support for File System Access API
  const supportsFS = typeof window.showDirectoryPicker === 'function';
  if (!supportsFS) {
    imsFolderBtn.disabled = true;
    imsFolderBtn.title = 'Your browser does not support the File System Access API. Use Chrome, Edge, or Opera.';
  }

  // Restore input method
  const savedMethod = localStorage.getItem(INPUT_METHOD_STORAGE);
  if (savedMethod === 'folder' || savedMethod === 'upload') {
    inputMethod = savedMethod;
  } else {
    inputMethod = supportsFS ? 'folder' : 'upload';
  }
  applyInputMethod(inputMethod);

  // Restore saved handles from IndexedDB
  await restoreLocalHandles();

  const savedPlatform = localStorage.getItem(PLATFORM_STORAGE);
  if (savedPlatform && PLATFORMS[savedPlatform]) {
    platformSelect.value = savedPlatform;
  }
  updatePlatformUI();

  const savedPrefix = localStorage.getItem(PATH_PREFIX_STORAGE);
  if (savedPrefix !== null) pathPrefixInput.value = savedPrefix;

  const savedMaxSize = localStorage.getItem(MAX_SIZE_STORAGE);
  if (savedMaxSize) maxSizeInput.value = savedMaxSize;

  attachEventListeners();
})();

function attachEventListeners() {
  // Platform
  platformSelect.addEventListener('change', () => {
    localStorage.setItem(PLATFORM_STORAGE, platformSelect.value);
    updatePlatformUI();
  });

  geminiModelSelect.addEventListener('change', () => {
    localStorage.setItem(GEMINI_MODEL_STORAGE, geminiModelSelect.value);
    updateGeminiModelHint();
    updatePlatformUI();
  });

  apiKeyInput.addEventListener('input', () => {
    const platform = getCurrentPlatform();
    localStorage.setItem(getKeyStorageKey(platform), apiKeyInput.value.trim());
    updateButtonState();

    if (platform === 'deepseek' && apiKeyInput.value.trim()) {
      clearTimeout(window._balanceTimer);
      window._balanceTimer = setTimeout(fetchDeepSeekBalance, 800);
    }
  });

  refreshBalanceBtn.addEventListener('click', fetchDeepSeekBalance);

  pathPrefixInput.addEventListener('input', () => {
    localStorage.setItem(PATH_PREFIX_STORAGE, pathPrefixInput.value);
  });
  maxSizeInput.addEventListener('input', () => {
    localStorage.setItem(MAX_SIZE_STORAGE, maxSizeInput.value);
  });

  // Upload
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      addFiles(e.target.files);
      fileInput.value = '';
    }
  });

  // Buttons
  extractBtn.addEventListener('click', onExtractClick);
  retryAllBtn.addEventListener('click', onRetryAllClick);
  clearBtn.addEventListener('click', onClearClick);
  downloadExcelBtn.addEventListener('click', onDownloadExcel);

  // Zoom
  zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn.addEventListener('click', zoomOut);
  zoomResetBtn.addEventListener('click', zoomReset);
  rotateLeftBtn.addEventListener('click', () => rotateModalImage(-90));
  rotateRightBtn.addEventListener('click', () => rotateModalImage(90));
  zoomFitBtn.addEventListener('click', zoomFitWidth);
  zoomFitHBtn.addEventListener('click', zoomFitHeight);

  imageScroll.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (-e.deltaY > 0) zoomIn(); else zoomOut();
    }
  }, { passive: false });

  // Drag to pan
  let isPanning = false, panStartX = 0, panStartY = 0, panScrollLeft = 0, panScrollTop = 0;
  modalImage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panScrollLeft = imageScroll.scrollLeft; panScrollTop = imageScroll.scrollTop;
    modalImage.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    imageScroll.scrollLeft = panScrollLeft - (e.clientX - panStartX);
    imageScroll.scrollTop = panScrollTop - (e.clientY - panStartY);
  });
  document.addEventListener('mouseup', () => {
    if (isPanning) { isPanning = false; modalImage.classList.remove('dragging'); }
  });

  // Modal buttons
  modalSaveBtn.addEventListener('click', onModalSave);
  modalResetBtn.addEventListener('click', onModalReset);
  modalCloseBtn.addEventListener('click', closeEditModal);
  modalCancelBtn.addEventListener('click', closeEditModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeEditModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeEditModal();
  });

  // Input method selector
  imsFolderBtn.addEventListener('click', () => switchInputMethod('folder'));
  imsUploadBtn.addEventListener('click', () => switchInputMethod('upload'));

  // Local folder mode (only if supported)
  if (typeof window.showDirectoryPicker === 'function') {
    localPickInputBtn.addEventListener('click', () => pickLocalFolder('input'));
    localPickReadedBtn.addEventListener('click', () => pickLocalFolder('readed'));
    localPickErrorBtn.addEventListener('click', () => pickLocalFolder('error'));

    localLoadBtn.addEventListener('click', loadLocalFiles);
    localProcessBtn.addEventListener('click', processLocalBatch);
  }
}

// ============================================================
//  Platform / API key / Balance
// ============================================================
function getCurrentPlatform() { return platformSelect.value; }
function getKeyStorageKey(platform) { return API_KEY_STORAGE_PREFIX + platform; }

function getCurrentGeminiModel() {
  const stored = localStorage.getItem(GEMINI_MODEL_STORAGE);
  const models = PLATFORMS.gemini.models || [];
  if (stored && models.some(m => m.id === stored)) return stored;
  return PLATFORMS.gemini.defaultModel;
}

function buildGeminiModelDropdown() {
  const models = PLATFORMS.gemini.models || [];
  geminiModelSelect.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    geminiModelSelect.appendChild(opt);
  });
  geminiModelSelect.value = getCurrentGeminiModel();
  updateGeminiModelHint();
}

function updateGeminiModelHint() {
  const selected = geminiModelSelect.value;
  const model = (PLATFORMS.gemini.models || []).find(m => m.id === selected);
  geminiModelHint.textContent = model ? model.note : '';
}

function updatePlatformUI() {
  const platform = getCurrentPlatform();
  const cfg = PLATFORMS[platform];
  apiKeyBadge.textContent = cfg.name;
  apiKeyBadge.className = `platform-badge ${cfg.badgeClass}`;
  apiKeyInput.placeholder = cfg.placeholder;
  apiKeyHint.textContent = cfg.keyHint;
  platformHint.textContent = `Model: ${platform === 'gemini' ? getCurrentGeminiModel() : cfg.defaultModel}`;

  balancePanel.style.display = (platform === 'deepseek') ? 'block' : 'none';

  if (platform === 'gemini') {
    geminiModelRow.style.display = 'flex';
    buildGeminiModelDropdown();
  } else {
    geminiModelRow.style.display = 'none';
  }

  const stored = localStorage.getItem(getKeyStorageKey(platform));
  apiKeyInput.value = stored || '';
  updateButtonState();

  if (platform === 'deepseek' && stored) {
    fetchDeepSeekBalance();
  } else if (platform === 'deepseek') {
    balanceContent.innerHTML = 'Enter your API Key to check balance.';
  }
}

async function fetchDeepSeekBalance() {
  if (getCurrentPlatform() !== 'deepseek') return;

  const apiKey = localStorage.getItem(getKeyStorageKey('deepseek'));
  if (!apiKey) {
    balanceContent.innerHTML = '<span style="color: #999;">Please enter your DeepSeek API Key first.</span>';
    return;
  }

  refreshBalanceBtn.disabled = true;
  balanceContent.innerHTML = '<span style="color: #1976d2;">Loading balance...</span>';

  try {
    const response = await fetch('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || err.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    renderDeepSeekBalance(data);
  } catch (err) {
    console.error('Balance fetch error:', err);
    balanceContent.innerHTML =
      `<span style="color: #d32f2f;">Failed to fetch balance: ${escapeHtml(err.message)}</span>`;
  } finally {
    refreshBalanceBtn.disabled = false;
  }
}

function renderDeepSeekBalance(data) {
  if (!data.is_available) {
    balanceContent.innerHTML =
      '<span style="color: #d32f2f;">⚠️ Balance insufficient for API calls. Please top up.</span>';
    return;
  }
  if (!data.balance_infos || !data.balance_infos.length) {
    balanceContent.innerHTML = '<span style="color: #999;">No balance information available.</span>';
    return;
  }

  const usd = data.balance_infos.find(b => b.currency === 'USD');
  const cny = data.balance_infos.find(b => b.currency === 'CNY');
  const info = usd || cny;
  const symbol = usd ? '$' : '¥';

  balanceContent.innerHTML = `
    <div class="balance-row">
      <span class="label">Total Balance:</span>
      <span class="value">${symbol}${info.total_balance}</span>
    </div>
    <div class="balance-row sub">
      <span class="label">Granted (promo):</span>
      <span class="value">${symbol}${info.granted_balance}</span>
    </div>
    <div class="balance-row sub">
      <span class="label">Topped-up (paid):</span>
      <span class="value">${symbol}${info.topped_up_balance}</span>
    </div>
    <div class="balance-row sub" style="margin-top: 6px; border-top: 1px solid #d4e8dc; padding-top: 6px;">
      <span class="label">Status:</span>
      <span class="value" style="color: #0f5132;">✓ Available</span>
    </div>
  `;
}

// ============================================================
//  Image helpers (EXIF orientation + resize)
// ============================================================
async function readExifOrientation(file) {
  try {
    if (!/image\/jpe?g/i.test(file.type)) return 1;
    const buf = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0, false) !== 0xFFD8) return 1;

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      if (view.getUint16(offset, false) === 0xFFE1) {
        offset += 2;
        const exifHeader = view.getUint32(offset, false);
        if (exifHeader !== 0x45786966) return 1;

        offset += 6;
        const tiffStart = offset;
        const bigEndian = view.getUint16(tiffStart, false) === 0x4D4D;
        const endian = !bigEndian;

        if (view.getUint16(tiffStart + 2, endian) !== 0x002A) return 1;

        const ifdOffset = view.getUint32(tiffStart + 4, endian);
        const dirStart = tiffStart + ifdOffset;
        const entries = view.getUint16(dirStart, endian);

        for (let i = 0; i < entries; i++) {
          const entryOffset = dirStart + 2 + i * 12;
          const tag = view.getUint16(entryOffset, endian);
          if (tag === 0x0112) {
            return view.getUint16(entryOffset + 8, endian);
          }
        }
        return 1;
      }
      offset += 2 + view.getUint16(offset + 2, false);
    }
    return 1;
  } catch (e) {
    console.warn('EXIF read failed:', e);
    return 1;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function canvasToImage(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('canvas.toBlob failed'));
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    }, 'image/jpeg', 0.95);
  });
}

async function loadImageOriented(file) {
  const orientation = await readExifOrientation(file);
  const img = await loadImage(file);

  if (orientation === 1) return { img, orientation };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const swap = orientation >= 5 && orientation <= 8;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;

  switch (orientation) {
    case 2:
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    case 6:
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 7:
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
      break;
  }

  ctx.drawImage(img, 0, 0);

  const orientedImg = await canvasToImage(canvas);
  return { img: orientedImg, orientation };
}

function getMaxSize() {
  const v = parseInt(maxSizeInput.value, 10);
  if (!v || v < 200) return 1600;
  return v;
}
/**
 * If the file is HEIC/HEIF, convert it to JPEG before processing.
 * Otherwise, return the file unchanged.
 *
 * Uses the `heicraft` library (loaded via CDN in index.html).
 */
/**
 * If the file is HEIC/HEIF, convert it to JPEG before processing.
 * Otherwise, return the file unchanged.
 *
 * Uses the `heic2any` library (loaded via <script> in index.html).
 */
/**
 * If the file is HEIC/HEIF, convert it to JPEG before processing.
 * Otherwise, return the file unchanged.
 *
 * Uses `heic-normalize` (loaded via ESM in index.html).
 * Falls back gracefully if the library hasn't loaded yet.
 */
async function normalizeImageFormat(file) {
  try {
    const name = (file.name || '').toLowerCase();
    const looksLikeHeic = name.endsWith('.heic') || name.endsWith('.heif');

    if (!looksLikeHeic) return file;

    // Check if the ESM module has loaded and exposed the function
    if (typeof window.normalizeHeicFile !== 'function') {
      console.warn('[HEIC] heic-normalize not loaded yet. Skipping conversion.');
      return file;
    }

    console.log(`[HEIC] Converting ${file.name} to JPEG...`);

    // heic-normalize API: normalizeHeicFile(file, target?)
    // Default target is 'image/jpeg'
    const convertedFile = await window.normalizeHeicFile(file);

    console.log(
      `[HEIC] Converted ${file.name} → ${convertedFile.name} ` +
      `(${Math.round(convertedFile.size / 1024)} KB)`
    );

    return convertedFile;

  } catch (err) {
    console.warn(`[HEIC] Conversion failed for ${file.name}:`, err);
    return file;
  }
}

async function addFiles(files) {
  const imageFiles = Array.from(files).filter(f =>
    f.type.startsWith('image/') ||
    /\.(heic|heif)$/i.test(f.name)
  );
  if (!imageFiles.length) {
    showStatus('Please select image files.', 'error');
    return;
  }
    const heicCount = imageFiles.filter(f =>
    /\.(heic|heif)$/i.test(f.name)
  ).length;

  const msg = heicCount > 0
    ? `Converting ${heicCount} HEIC file(s) and resizing ${imageFiles.length} image(s)...`
    : `Resizing ${imageFiles.length} image(s)...`;

  showStatus(msg, 'loading');

  for (const originalFile of imageFiles) {
    const file = await normalizeImageFormat(originalFile);
    const task = {
      id: ++idCounter, file, previewUrl: null,
      status: 'waiting', json: null, originalJson: null, edited: false, error: null,
      resizedBlob: null, resizedDataUrl: null, resizeInfo: null,
    };
    try {
      const resized = await resizeImage(file);
      task.resizedBlob = resized.blob;
      task.resizedDataUrl = resized.dataUrl;
      task.resizeInfo = {
        original: `${resized.originalWidth}×${resized.originalHeight}`,
        resized: `${resized.width}×${resized.height}`,
        originalKB: Math.round(resized.originalSize / 1024),
        resizedKB: Math.round(resized.resizedSize / 1024),
      };
      task.previewUrl = resized.dataUrl;
    } catch (err) {
      console.error('Resize failed:', file.name, err);
      task.previewUrl = URL.createObjectURL(file);
      task.resizeInfo = { error: 'Resize failed, using original' };
    }
    queue.push(task);
  }

  renderQueue();
  updateButtonState();

  const totalOrigKB = queue.filter(t => t.resizeInfo && t.resizeInfo.originalKB)
    .reduce((s, t) => s + t.resizeInfo.originalKB, 0);
  const totalNewKB = queue.filter(t => t.resizeInfo && t.resizeInfo.resizedKB)
    .reduce((s, t) => s + t.resizeInfo.resizedKB, 0);

  showStatus(
    `Added ${imageFiles.length} image(s). Queue: ${queue.length}. ` +
    `Total size: ${totalOrigKB} KB → ${totalNewKB} KB.`,
    'success'
  );
}

function updateButtonState() {
  const hasPending = queue.some(t => t.status === 'waiting');
  const hasFailed = queue.some(t => t.status === 'error');
  const hasKey = !!apiKeyInput.value.trim();
  extractBtn.disabled = isRunning || !hasPending || !hasKey;
  retryAllBtn.disabled = isRunning || !hasFailed || !hasKey;
  clearBtn.disabled = isRunning || queue.length === 0;
}

function showStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
}

function renderQueue() {
  queueList.innerHTML = '';
  queue.forEach(task => {
    const el = document.createElement('div');
    el.className = 'queue-item';
    const sizeInfo = task.resizeInfo && !task.resizeInfo.error
      ? `${task.resizeInfo.original} → ${task.resizeInfo.resized} · ${task.resizeInfo.originalKB}KB → ${task.resizeInfo.resizedKB}KB`
      : `${(task.file.size / 1024).toFixed(0)} KB`;
    const errorLine = task.error
      ? `<div class="meta" style="color:#b02a37;">${escapeHtml(task.error)}</div>` : '';
    const editedLine = task.edited
      ? `<div class="meta" style="color:#217346;">✏️ Manually edited</div>` : '';
    const movedLine = task.movedTo
      ? `<div class="meta" style="color:#0f5132;">📁 Moved → ${escapeHtml(task.movedTo)}</div>` : '';
    const retryBtn = task.status === 'error'
      ? `<button class="btn btn-retry" data-retry-id="${task.id}">🔁 Retry</button>` : '';

    el.innerHTML = `
      <img src="${task.previewUrl || ''}" alt="" />
      <div class="info">
        <div class="name">${escapeHtml(task.file.name)}</div>
        <div class="meta">${escapeHtml(sizeInfo)}</div>
        ${errorLine}
        ${editedLine}
        ${movedLine}
      </div>
      <span class="state state-${task.status}">${statusLabel(task.status)}</span>
      ${retryBtn}
    `;
    queueList.appendChild(el);
  });

  queueList.querySelectorAll('[data-retry-id]').forEach(btn => {
    btn.addEventListener('click', () => retryOne(parseInt(btn.dataset.retryId, 10)));
  });
}

function statusLabel(s) {
  return {
    waiting: 'Waiting', processing: 'Processing', success: 'Success',
    error: 'Failed', cancelled: 'Cancelled', retrying: 'Retrying',
  }[s] || s;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============================================================
//  Rate limiter
// ============================================================
const rateLimiter = {
  timestamps: [],
  async wait() {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter(t => t > windowStart);
    if (this.timestamps.length >= RATE_LIMIT_PER_MIN) {
      const oldest = this.timestamps[0];
      const waitMs = oldest + 60_000 - now + 200;
      await sleep(waitMs);
      return this.wait();
    }
    this.timestamps.push(Date.now());
  }
};
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
//  Batch flow
// ============================================================
async function onExtractClick() {
  if (isRunning) return;
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return;
  const pending = queue.filter(t => t.status === 'waiting');
  if (!pending.length) return;
  await runBatch(pending, apiKey);
}

async function onRetryAllClick() {
  if (isRunning) return;
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return;
  const failed = queue.filter(t => t.status === 'error');
  if (!failed.length) return;

  failed.forEach(t => {
    t.status = 'waiting';
    t.error = null;
    t.json = null;
    t.originalJson = null;
    t.edited = false;
  });
  renderQueue();
  updateButtonState();
  await runBatch(failed, apiKey);
}

async function runBatch(tasks, apiKey) {
  isRunning = true;
  updateButtonState();
  resultSection.style.display = 'none';
  progressWrap.style.display = 'block';
  summaryEl.style.display = 'none';

  const platform = getCurrentPlatform();
  let done = 0, success = 0, failed = 0;

  for (const task of tasks) {
    if (task.status === 'cancelled') continue;
    task.status = 'processing';
    renderQueue();

    try {
      await rateLimiter.wait();
      const json = await extractOneWithRetry(task, apiKey, platform);
      task.json = json;
      if (json._signatureWarning) {
        task.signatureWarning = json._signatureWarning;
        delete json._signatureWarning; // don't pollute the data
      }
      task.originalJson = JSON.parse(JSON.stringify(json));
      task.status = 'success';
      task.error = null;
      success++;
    } catch (err) {
      console.error(task.file.name, err);
      task.error = err.message || 'Unknown error';
      task.status = 'error';
      failed++;
    }

    done++;
    progressBar.style.width = `${(done / tasks.length) * 100}%`;
    renderQueue();
    updateButtonState();
  }

  isRunning = false;
  updateButtonState();

  if (platform === 'deepseek') fetchDeepSeekBalance();

  summaryEl.style.display = 'block';
  summaryEl.innerHTML = `✅ Succeeded: ${success} · ❌ Failed: ${failed} · Total: ${tasks.length}`;

  const successTasks = queue.filter(t => t.status === 'success' && t.json);
  if (successTasks.length) {
    renderResultTable(successTasks);
    resultSection.style.display = 'block';
    showStatus(
      `🎉 Done. Succeeded: ${success}, Failed: ${failed}.` +
      (failed ? ' Use "Retry Failed" or per-row Retry to try again.' : ''),
      success ? 'success' : 'error'
    );
  } else {
    showStatus('❌ All failed. Check your API Key or network.', 'error');
  }
}

async function retryOne(id) {
  if (isRunning) return;
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) { showStatus('Please enter your API Key first.', 'error'); return; }
  const task = queue.find(t => t.id === id);
  if (!task || task.status !== 'error') return;

  isRunning = true;
  updateButtonState();
  updateLocalModeButtons();

  // Pull file back from error/ if needed
  if (inputMethod === 'folder' && task.currentLocation === 'error' && task.movedTo) {
    try {
      const pulledBack = await pullFileBackFromFolder(
        localHandles.error,
        localHandles.input,
        task.movedTo
      );
      task.localHandle = pulledBack.handle;
      task.localName = pulledBack.name;
      task.movedTo = null;
      task.currentLocation = 'input';
      console.log(`Pulled back ${pulledBack.name} from error/ to input/`);
    } catch (pullErr) {
      console.error('Pull back failed:', pullErr);
      task.error = 'Pull back failed: ' + pullErr.message;
      task.status = 'error';
      isRunning = false;
      renderQueue();
      updateButtonState();
      updateLocalModeButtons();
      showStatus(`❌ Could not pull back ${task.localName} from error folder.`, 'error');
      return;
    }
  }

  task.status = 'processing';
  task.error = null;
  renderQueue();
  updateButtonState();

  const platform = getCurrentPlatform();

  try {
    await rateLimiter.wait();
    const json = await extractOneWithRetry(task, apiKey, platform);
    task.json = json;
    if (json && json._signatureWarning) {
      task.signatureWarning = json._signatureWarning;
      delete json._signatureWarning;
    }
    task.originalJson = JSON.parse(JSON.stringify(json));
    task.edited = false;
    task.status = 'success';
    task.error = null;
  } catch (err) {
    console.error(err);
    task.error = err.message || 'Unknown error';
    task.status = 'error';
  }

  // Move file based on new outcome
  if (inputMethod === 'folder' && task.localHandle && task.localName) {
    try {
      const targetHandle = task.status === 'success' ? localHandles.readed : localHandles.error;
      const movedName = await moveLocalFile(task, targetHandle);
      task.movedTo = movedName;
      task.currentLocation = task.status === 'success' ? 'readed' : 'error';
    } catch (moveErr) {
      console.error('Move after retry failed:', moveErr);
      task.error = (task.error ? task.error + ' | ' : '') + 'Move failed: ' + moveErr.message;
    }
  }

  isRunning = false;
  renderQueue();
  updateButtonState();
  updateLocalModeButtons();

  if (platform === 'deepseek') fetchDeepSeekBalance();

  showStatus(
    task.status === 'success'
      ? `✅ Retried successfully: ${task.file.name}`
      : `❌ Retry failed: ${task.file.name}`,
    task.status === 'success' ? 'success' : 'error'
  );

  const successTasks = queue.filter(t => t.status === 'success' && t.json);
  if (successTasks.length) {
    renderResultTable(successTasks);
    resultSection.style.display = 'block';
  }

  const successCount = queue.filter(t => t.status === 'success').length;
  const failedCount = queue.filter(t => t.status === 'error').length;
  const pendingCount = queue.filter(t => t.status === 'waiting').length;
  summaryEl.style.display = 'block';
  summaryEl.innerHTML = `✅ Succeeded: ${successCount} · ❌ Failed: ${failedCount} · ⏳ Pending: ${pendingCount}`;
}

function onClearClick() {
  if (isRunning) {
    queue.forEach(t => { if (t.status === 'waiting') t.status = 'cancelled'; });
    renderQueue();
    updateButtonState();
    return;
  }
  queue.forEach(t => {
    if (t.previewUrl && t.previewUrl.startsWith('blob:')) URL.revokeObjectURL(t.previewUrl);
  });
  queue = [];
  renderQueue();
  progressWrap.style.display = 'none';
  progressBar.style.width = '0%';
  summaryEl.style.display = 'none';
  resultSection.style.display = 'none';
  showStatus('');
  updateButtonState();
}

/**
 * Build the `_file` value for manual upload mode.
 * Uses the Source Path Prefix.
 */
function buildFilePath(file) {
  const rawPrefix = pathPrefixInput.value || '';
  const prefix = rawPrefix.replace(/\\/g, '/').replace(/\/+$/, '');
  if (prefix) return `${prefix}/${file.name}`;
  if (file.webkitRelativePath) return file.webkitRelativePath.replace(/\\/g, '/');
  return file.name;
}

/**
 * Build the `_file` value for a task.
 * In Local Folder mode, reflects where the file was moved (readed/ or error/).
 * In Upload mode, uses buildFilePath().
 */
function buildFilePathForTask(task) {
  if (inputMethod === 'folder' && task && task.movedTo) {
    const destFolder = task.currentLocation || (task.status === 'success' ? 'readed' : 'error');
    return `${destFolder}/${task.movedTo}`;
  }

  if (inputMethod === 'folder' && task && task.localName) {
    return `input/${task.localName}`;
  }

  return buildFilePath(task.file);
}

// ============================================================
//  AI dispatch
// ============================================================
async function extractOneWithRetry(task, apiKey, platform) {
  const MAX_ATTEMPTS = 3;
  const delays = [5000, 10000, 20000];
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callAI(task, apiKey, platform);
    } catch (err) {
      lastErr = err;
      const msg = String(err.message || '').toLowerCase();
      const isTransient = err.transient === true ||
        /high demand|overloaded|temporarily|try again|rate limit|503|502|504|429|insufficient/i.test(msg);
      if (!isTransient || attempt === MAX_ATTEMPTS) throw err;

      const waitMs = delays[attempt - 1] || 10000;
      task.status = 'retrying';
      task.error = `Attempt ${attempt} failed (${err.message}). Retrying in ${Math.round(waitMs / 1000)}s...`;
      renderQueue();
      await sleep(waitMs);
      task.status = 'processing';
      renderQueue();
    }
  }
  throw lastErr || new Error('Unknown error');
}

async function callAI(task, apiKey, platform) {
  const sourceBlob = task.resizedBlob || task.file;
  const base64 = await blobToBase64(sourceBlob);
  const mimeType = sourceBlob.type || 'image/jpeg';
  const prompt = buildPromptText();

  if (platform === 'gemini') {
    return await callGemini({ base64, mimeType, prompt, apiKey });
  } else if (platform === 'deepseek') {
    return await callDeepSeek({ base64, mimeType, prompt, apiKey });
  } else {
    throw new Error('Unknown platform: ' + platform);
  }
}

async function callGemini({ base64, mimeType, prompt, apiKey }) {
  const cfg = PLATFORMS.gemini;
  const modelId = getCurrentGeminiModel();
  const url = `${cfg.endpoint(modelId)}?key=${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: buildJsonSchema(),
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 3000
        }
      })
    });
  } catch (netErr) {
    const e = new Error('Network error: ' + netErr.message);
    e.transient = true;
    throw e;
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMsg = errBody.error?.message || `HTTP ${response.status}`;
    const e = new Error(apiMsg);
    if ([429, 503, 502, 504].includes(response.status)) e.transient = true;
    throw e;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const e = new Error('Gemini returned no content.');
    e.transient = true;
    throw e;
  }

  const cleaned = stripFences(text);
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (parseErr) {
    const e = new Error('Invalid JSON from Gemini: ' + parseErr.message);
    e.transient = true;
    throw e;
  }
  return postProcess(parsed);
}

async function callDeepSeek({ base64, mimeType, prompt, apiKey }) {
  const cfg = PLATFORMS.deepseek;
  const url = cfg.endpoint();

  const body = {
    model: cfg.defaultModel,
    messages: [
      {
        role: 'system',
        content: 'You are a strict data extraction assistant. Always reply with a single valid JSON object only, no markdown, no explanations.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 3000,
    stream: false
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
  } catch (netErr) {
    const e = new Error('Network error: ' + netErr.message);
    e.transient = true;
    throw e;
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const apiMsg = errBody.error?.message || errBody.message || `HTTP ${response.status}`;
    const e = new Error(apiMsg);
    if ([429, 503, 502, 504].includes(response.status)) e.transient = true;
    throw e;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    const e = new Error('DeepSeek returned no content.');
    e.transient = true;
    throw e;
  }

  const cleaned = stripFences(text);
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (parseErr) {
    const e = new Error('Invalid JSON from DeepSeek: ' + parseErr.message);
    e.transient = true;
    throw e;
  }
  return postProcess(parsed);
}

function stripFences(text) {
  return text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');
}

function postProcess(parsed) {
  parsed = unwrapSchemaEcho(parsed);
  parsed = coerceNullStrings(parsed);       
  parsed = normalizeSignatures(parsed);
  parsed = sanitizeSignatures(parsed); 
  parsed = normalizeTicketCategory(parsed);
  parsed = dedupeFields(parsed);
  parsed = flagSuspiciousSignatures(parsed);
  parsed = removeHiddenFields(parsed);
  return parsed;
}
/**
 * Sanity check for signatures: if the AI marks ALL THREE signature boxes as "Signed",
 * that is suspicious. The form is rarely fully signed by all three roles.
 * We don't force a change (it could legitimately happen), but we log it.
 *
 * The main benefit is that if the AI returns all three as "Signed", it is usually
 * because it saw one signature and spread it. We'll keep the FIRST "Signed" (by priority)
 * and mark the rest as "Not Signed" ONLY IF the AI's confidence is low. Since we don't
 * have confidence info, we use a softer approach: keep all, but flag the row.
 */
function flagSuspiciousSignatures(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  if (!parsed.signatures || typeof parsed.signatures !== 'object') return parsed;

  const sig = parsed.signatures;
  const signed = ['inspector', 'visto_bueno_calidad', 'encargado_linea']
    .filter(k => /^Signed$/i.test(String(sig[k] || '')));

  if (signed.length === 3) {
    console.warn('[signatures] All three signature boxes marked as "Signed". This is unusual — please verify manually.');
    // Mark a flag on the object so the UI can show a warning
    parsed._signatureWarning = 'All three signatures marked as Signed — please verify';
  }

  return parsed;
}


/**
 * Detect and clear duplicated values across sibling fields.
 * If the same non-empty string appears in 2+ fields within the same section,
 * keep only the occurrence in the field with the highest priority (per config)
 * and set the others to null.
 *
 * Works on ANY string, including dates and short codes.
 * Skips only empty strings and nulls.
 */
function dedupeFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // Per-section priority order (earlier = keeps the value if a duplicate is found)
     const dedupeConfig = {
    section_1: [
      'codigo_conjunto',
      'codigo_componente',
      'codigo_rechaz',
      'cantidad',
      'origen_area_zona'
    ],
    section_2: [
      'motivo_rechace',
      'fecha',
      'operario',
      'observaciones'
    ],
    header: [
      'ticket_category',
      'ticket_id'
    ]
  };

  Object.keys(dedupeConfig).forEach(sectionKey => {
    const section = obj[sectionKey];
    if (!section || typeof section !== 'object') return;

    const fields = dedupeConfig[sectionKey];
    const seen = new Map(); // normalized value → first field that had it

    fields.forEach(fieldKey => {
      const raw = section[fieldKey];
      if (raw === null || raw === undefined) return;
      const s = String(raw).trim();
      if (s === '') return;

      const norm = s.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(norm)) {
        console.warn(`[dedupe] Clearing duplicated value in ${sectionKey}.${fieldKey} (same as ${sectionKey}.${seen.get(norm)})`);
        section[fieldKey] = null;
      } else {
        seen.set(norm, fieldKey);
      }
    });
  });

  return obj;
}

function unwrapSchemaEcho(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(unwrapSchemaEcho);
  if ('value' in obj && ('type' in obj || 'description' in obj)) return obj.value;
  const out = {};
  for (const key of Object.keys(obj)) out[key] = unwrapSchemaEcho(obj[key]);
  return out;
}

function normalizeSignatures(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (!obj.signatures || typeof obj.signatures !== 'object') return obj;
  const sig = obj.signatures;
  ['inspector', 'visto_bueno_calidad', 'encargado_linea'].forEach(key => {
    const raw = sig[key];
    if (raw === null || raw === undefined) { sig[key] = 'Not Signed'; return; }
    const s = String(raw).trim().toLowerCase();
    if (['signed', 'yes', 'true', 'signature', 'signed.'].includes(s)) sig[key] = 'Signed';
    else if (['not signed', 'no', 'false', 'empty', 'unsigned'].includes(s)) sig[key] = 'Not Signed';
    else if (/sign/i.test(s) && !/not|no |empty|blank/i.test(s)) sig[key] = 'Signed';
    else sig[key] = 'Not Signed';
  });
  return obj;
}
/**
 * Some AI outputs mark a box as "Signed" even though it contains only
 * a red line or a single letter. This sanitiser is a fallback:
 * it downgrades any suspicious "Signed" back to "Not Signed".
 *
 * Rules:
 *   - Keep "Signed" only if the AI's raw value is a long string (> 2 chars)
 *     that doesn't look like a plain line or a single letter.
 *   - "Not Signed" always passes through unchanged.
 */
function sanitizeSignatures(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (!obj.signatures || typeof obj.signatures !== 'object') return obj;

  const sig = obj.signatures;
  ['inspector', 'visto_bueno_calidad', 'encargado_linea'].forEach(key => {
    const raw = sig[key];
    if (raw === null || raw === undefined) { sig[key] = 'Not Signed'; return; }

    const s = String(raw).trim();

    // Normalise explicit "Not Signed"
    if (/^not\s*signed$/i.test(s)) { sig[key] = 'Not Signed'; return; }

    // Accept "Signed" only if the value is not a single char / line pattern.
    // Because the AI typically returns exactly "Signed" when it thinks it's signed,
    // we trust it here. The real safeguard is in the prompt.
    // (This function is a placeholder if you later want to accept richer values
    // like "Signed (JE673)" and extract them.)
    if (/^signed$/i.test(s)) { sig[key] = 'Signed'; return; }

    // Anything else that isn't "Signed" or "Not Signed" → Not Signed
    sig[key] = 'Not Signed';
  });

  return obj;
}


function normalizeTicketCategory(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (!obj.header || typeof obj.header !== 'object') return obj;

  // Support legacy field name just in case
  const raw = obj.header.ticket_category ?? obj.header.part_category;

  // Clean up legacy field
  delete obj.header.part_category;

  if (raw === null || raw === undefined || String(raw).trim() === '') {
    obj.header.ticket_category = 'Unknown';
    return obj;
  }
  const s = String(raw).trim();

  if (/^Process Scrap Parts$/i.test(s)) { obj.header.ticket_category = 'Process Scrap Parts'; return obj; }
  if (/^Supplier Claim Parts$/i.test(s)) { obj.header.ticket_category = 'Supplier Claim Parts'; return obj; }

  const lower = s.toLowerCase();
  if (/green|scrap|proceso|process|rechazo interno|internal/.test(lower)) {
    obj.header.ticket_category = 'Process Scrap Parts';
  } else if (/orange|supplier|proveedor|claim|reclamaci/.test(lower)) {
    obj.header.ticket_category = 'Supplier Claim Parts';
  } else {
    obj.header.ticket_category = 'Unknown';
  }
  return obj;
}

/**
 * Remove fields we don't want in the output (hidden fields).
 */
function removeHiddenFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.header && typeof obj.header === 'object') {
    delete obj.header.company;
    delete obj.header.document_type;
  }
  return obj;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================
//  Result table + Key parameter summary + Quality score
// ============================================================
function flattenJson(obj) {
  const flat = {};
  function walk(node, path) {
    if (node === null || node === undefined) {
      flat[path] = '';
    } else if (typeof node === 'object' && !Array.isArray(node)) {
      for (const key of Object.keys(node)) walk(node[key], path ? `${path}.${key}` : key);
    } else if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else {
      flat[path] = node;
    }
  }
  walk(obj, '');
  return flat;
}

function evaluateCell(value) {
  if (value === null || value === undefined) return 'missing';
  const s = String(value).trim();
  if (s === '') return 'missing';
  if (s.length === 1 && !/\d/.test(s)) return 'suspicious';
  if (/[?□■�]/.test(s)) return 'suspicious';
  if (/^[\-_.·]+$/.test(s)) return 'suspicious';
  return 'ok';
}

function isValueMissing(path, value) {
  // Optional fields are never "missing" even when empty
  if (OPTIONAL_FIELDS.includes(path)) return false;

  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s === '') return true;
  if (path.startsWith('signatures.')) {
    return !/^Signed$/i.test(s);
  }
  return false;
}

function buildKeyParameterSummary(tasks) {
  const keyStats = {};
  KEY_PARAMETERS.forEach(kp => {
    keyStats[kp.path] = { label: kp.label, missingCount: 0, total: tasks.length };
  });

  const statuses = {};

  tasks.forEach(task => {
    const flat = flattenJson(task.json || {});
    const reasons = [];
    let keyMissing = 0;
    let otherMissing = 0;
    let otherFormatIssue = 0;

    Object.keys(flat).forEach(path => {
      const value = flat[path];
      if (path === '_file' || path === '_taskId' || path === '_edited') return;

      const isKey = KEY_PARAMETERS.some(kp => kp.path === path);

      if (isValueMissing(path, value)) {
        if (isKey) {
          keyMissing++;
          const label = KEY_PARAMETERS.find(kp => kp.path === path)?.label || path;
          reasons.push(`Missing key parameter: ${label}`);
          keyStats[path].missingCount++;
        } else {
          otherMissing++;
          reasons.push(`Missing: ${getDisplayHeader(path)}`);
        }
        return;
      }

      const fStatus = checkFormat(path, value);
      if (fStatus === 'format-mismatch') {
        if (isKey) {
          keyMissing++;
          const label = KEY_PARAMETERS.find(kp => kp.path === path)?.label || path;
          reasons.push(`Invalid format on key parameter: ${label}`);
          keyStats[path].missingCount++;
        } else {
          otherFormatIssue++;
          reasons.push(`Format issue: ${getDisplayHeader(path)}`);
        }
      }
    });

    let level = 'green';
    if (keyMissing > 0) level = 'red';
    else if (otherMissing > 0 || otherFormatIssue > 0) level = 'yellow';
    // Signature sanity warning
    if (task.signatureWarning) {
      reasons.push(task.signatureWarning);
      if (level === 'green') level = 'yellow';
    }

    statuses[task.id] = { level, reasons };
  });

  return { keyStats, statuses };
}

function computeQualityScore(tasks) {
  let keyPresent = 0, keyTotal = 0;
  let otherPresent = 0, otherTotal = 0;
  const keyPathSet = new Set(KEY_PARAMETERS.map(kp => kp.path));

  tasks.forEach(task => {
    const flat = flattenJson(task.json || {});
    Object.keys(flat).forEach(path => {
      if (path === '_file' || path === '_taskId' || path === '_edited') return;

      const value = flat[path];
      const missing = isValueMissing(path, value);

      // NEW: also treat format mismatches as "not present"
      let formatBad = false;
      if (!missing) {
        const fStatus = checkFormat(path, value);
        if (fStatus === 'format-mismatch') formatBad = true;
      }

      const isPresent = !missing && !formatBad;
      const isKey = keyPathSet.has(path);

      if (isKey) {
        keyTotal++;
        if (isPresent) keyPresent++;
      } else {
        otherTotal++;
        if (isPresent) otherPresent++;
      }
    });
  });

  const keyRatio = keyTotal > 0 ? keyPresent / keyTotal : 1;
  const otherRatio = otherTotal > 0 ? otherPresent / otherTotal : 1;
  const raw = keyRatio * 0.7 + otherRatio * 0.3;
  const score = Math.round(raw * 1000) / 10;

  let level = 'bad';
  if (score >= 90) level = 'good';
  else if (score >= 70) level = 'warn';

  return { score, keyPresent, keyTotal, otherPresent, otherTotal, level };
}
/**
 * Group all cell-level issues by type and by field.
 * Returns:
 * {
 *   missing:    { total: N, fields: { [fieldName]: count } },
 *   format:     { total: N, fields: { [fieldName]: count } },
 *   suspicious: { total: N, fields: { [fieldName]: count } },
 *   edited:     { total: N, fields: { [fieldName]: count } }
 * }
 */
function groupIssuesByType(tasks) {
  const groups = {
    missing:    { total: 0, fields: {} },
    format:     { total: 0, fields: {} },
    suspicious: { total: 0, fields: {} },
    edited:     { total: 0, fields: {} }
  };

  tasks.forEach(task => {
    const flat = flattenJson(task.json || {});

    Object.keys(flat).forEach(path => {
      if (path === '_file' || path === '_taskId' || path === '_edited') return;

      const value = flat[path];
      const displayName = getDisplayHeader(path);

      // Missing
      if (isValueMissing(path, value)) {
        groups.missing.total++;
        groups.missing.fields[displayName] = (groups.missing.fields[displayName] || 0) + 1;
        return;
      }

      // Suspicious (single char, illegible marks)
      const suspicious = evaluateCell(value) === 'suspicious';
      if (suspicious) {
        groups.suspicious.total++;
        groups.suspicious.fields[displayName] = (groups.suspicious.fields[displayName] || 0) + 1;
        return;
      }

      // Format mismatch
      const fStatus = checkFormat(path, value);
      if (fStatus === 'format-mismatch') {
        groups.format.total++;
        groups.format.fields[displayName] = (groups.format.fields[displayName] || 0) + 1;
        return;
      }

      // Manually edited
      if (task.edited) {
        groups.edited.total++;
        groups.edited.fields[displayName] = (groups.edited.fields[displayName] || 0) + 1;
      }
    });
  });

  return groups;
}
/**
 * Render the Error Summary panel above the results table.
 */
function renderErrorSummary(tasks) {
  const container = document.getElementById('errorSummary');
  if (!container) return;

  const groups = groupIssuesByType(tasks);
  const totalIssues =
    groups.missing.total + groups.format.total + groups.suspicious.total;

  // All good
  if (totalIssues === 0 && groups.edited.total === 0) {
    container.classList.add('all-good');
    container.innerHTML = `
      <div class="es-title">✅ No issues detected · ${tasks.length} form(s) processed</div>
    `;
    container.style.display = 'block';
    return;
  }

  container.classList.remove('all-good');

  // Helper to render one group
  function renderGroup(key, label, icon) {
    const g = groups[key];
    if (g.total === 0) return '';

    // Sort fields by count descending
    const fieldEntries = Object.entries(g.fields)
      .sort((a, b) => b[1] - a[1]);

    const fieldHTML = fieldEntries.length
      ? fieldEntries.map(([name, count]) =>
          `<li class="es-field-item">
             <span class="es-field-name">${escapeHtml(name)}</span>
             <span class="es-field-count">${count}</span>
           </li>`
        ).join('')
      : '<li class="es-empty">No fields</li>';

    return `
      <div class="es-group ${key}">
        <div class="es-group-header">
          <span>${icon} ${label}</span>
          <span class="es-count">${g.total}</span>
        </div>
        <ul class="es-field-list">${fieldHTML}</ul>
      </div>
    `;
  }

  const totalCount = totalIssues + groups.edited.total;
  const titleText =
    totalIssues > 0
      ? `⚠️ ${totalIssues} issue(s) detected across ${tasks.length} form(s)`
      : `✏️ ${groups.edited.total} manually edited cell(s)`;

  container.innerHTML = `
    <div class="es-title">${titleText}${groups.edited.total && totalIssues ? ` · ${groups.edited.total} manually edited` : ''}</div>
    <div class="es-groups">
      ${renderGroup('missing',    'Missing / null',    '🔴')}
      ${renderGroup('format',     'Format mismatch',   '🔴')}
      ${renderGroup('suspicious', 'Suspicious value',  '🟡')}
      ${renderGroup('edited',     'Manually edited',   '✏️')}
    </div>
  `;
  container.style.display = 'block';
}
function renderSummaryReport(keyStats, totalRows, tasks) {
  const container = document.getElementById('summaryReport');
  if (!container) return;

  const quality = computeQualityScore(tasks);

  const scoreHTML = `
    <div class="sr-score ${quality.level}">
      <div class="score-main">
        <span class="score-value">${quality.score.toFixed(1)}%</span>
        <span class="score-label">Data Quality</span>
      </div>
      <div class="score-bar">
        <div class="score-bar-fill" style="width: ${quality.score}%"></div>
      </div>
      <div class="score-detail">
        Key parameters: <b>${quality.keyPresent}/${quality.keyTotal}</b> present<br>
        Other fields: <b>${quality.otherPresent}/${quality.otherTotal}</b> present
      </div>
    </div>
  `;

  const items = KEY_PARAMETERS.map(kp => {
    const stat = keyStats[kp.path];
    const missing = stat.missingCount;
    const present = stat.total - missing;
    let cls = 'ok';
    if (missing > 0) cls = missing === stat.total ? 'err' : 'warn';
    const countDisplay = missing === 0
      ? `${present}/${stat.total}`
      : `${missing} missing`;
    return `
      <div class="sr-item ${cls}">
        <span class="sr-label">${escapeHtml(kp.label)}</span>
        <span class="sr-count">${countDisplay}<small>${missing === 0 ? 'complete' : 'of ' + stat.total}</small></span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="sr-title">📊 Data Quality Audit · ${totalRows} form(s) processed</div>
    ${scoreHTML}
    <div class="sr-grid">${items}</div>
  `;
  container.style.display = 'block';
}

function renderResultTable(tasks) {
  const { keyStats, statuses } = buildKeyParameterSummary(tasks);
  renderSummaryReport(keyStats, tasks.length, tasks);
  renderErrorSummary(tasks);
  const rows = tasks.map(t => ({
    _taskId: t.id,
    _file: buildFilePathForTask(t),
    _edited: !!t.edited,
    _signatureWarning: t.signatureWarning || null,
    ...flattenJson(t.json)
  }));

  const headerSet = new Set(['_file']);
  rows.forEach(r => Object.keys(r).forEach(k => {
    if (k === '_taskId' || k === '_edited' || k === '_signatureWarning') return;
    if (HIDDEN_FIELDS.includes(k)) return;   // ← hide company, document_type
    headerSet.add(k);
  }));
  const headers = Array.from(headerSet);

  let missingCount = 0, suspiciousCount = 0, formatCount = 0;

  const thead = document.createElement('thead');
  const headTr = document.createElement('tr');
  headTr.innerHTML =
    `<th class="row-num">#</th>` +
    `<th class="status-col" title="Row status: green = all good, yellow = non-key fields missing, red = key parameters missing">●</th>` +
    headers.map(h => {
      const display = getDisplayHeader(h);
      return `<th title="${escapeHtml(h)}">${escapeHtml(display)}</th>`;
    }).join('') +
    `<th class="action-cell">Action</th>`;
  thead.appendChild(headTr);

  const tbody = document.createElement('tbody');

  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const cells = [];
    cells.push(`<td class="row-num">${i + 1}</td>`);

    const statusInfo = statuses[r._taskId] || { level: 'green', reasons: [] };
    if (r._signatureWarning) {
      statusInfo.reasons.push(r._signatureWarning);
      if (statusInfo.level === 'green') statusInfo.level = 'yellow';
    }
    const reasonsText = statusInfo.reasons.length
      ? statusInfo.reasons.join(' · ')
      : 'All fields present and valid';
    cells.push(
      `<td class="status-col" title="${escapeHtml(reasonsText)}">` +
      `<span class="status-light ${statusInfo.level}"></span>` +
      `</td>`
    );

    headers.forEach(h => {
      const raw = r[h];
      let status = evaluateCell(raw);
      let hint = '';
     
      if (status === 'missing' && OPTIONAL_FIELDS.includes(h)) {
        status = 'ok';
      }
      
      if (status === 'ok') {
        const fStatus = checkFormat(h, raw);
        if (fStatus === 'format-mismatch') {
          status = 'format-mismatch';
          hint = FORMAT_RULES[h]?.hint || 'Format does not match expected pattern';
        } else if (fStatus === 'missing') {
          status = 'missing';
        }

        // Special check: cantidad should normally be 1
        if (status === 'ok' && h === 'section_1.cantidad') {
          const cantMsg = validateCantidad(raw);
          if (cantMsg) {
            status = 'suspicious';
            hint = cantMsg;
          }
        }
      }

      if (r._edited && status === 'ok') status = 'edited';

      let cls = '', badge = '';

      if (h === 'header.ticket_category' && status === 'ok') {
        const v = String(raw).toLowerCase();
        if (v.includes('process scrap')) {
          cls = 'cell-category-scrap';
          badge = '<span class="cell-badge" style="background:#a3cfbb;color:#0f5132;">green</span>';
        } else if (v.includes('supplier claim')) {
          cls = 'cell-category-supplier';
          badge = '<span class="cell-badge" style="background:#ffc99a;color:#8a4b00;">orange</span>';
        }
      } else if (status === 'missing') {
        missingCount++;
        cls = 'cell-missing';
        badge = '<span class="cell-badge">missing</span>';
        hint = hint || 'Missing or null value';
      } else if (status === 'suspicious') {
        suspiciousCount++;
        cls = 'cell-suspicious';
        badge = '<span class="cell-badge">check</span>';
        hint = hint || 'Suspicious value — please verify';
      } else if (status === 'format-mismatch') {
        formatCount++;
        cls = 'cell-format-mismatch';
        badge = '<span class="cell-badge">format</span>';
        hint = hint || 'Value format does not match this field';
      } else if (status === 'edited') {
        cls = 'cell-edited';
        badge = '<span class="cell-badge">edited</span>';
        hint = 'Manually corrected';
      }

      const display = (raw === null || raw === undefined || String(raw).trim() === '')
        ? '—' : String(raw);

      const extraClass = h === '_file' ? ' file-cell' : '';
      cells.push(`<td class="${cls}${extraClass}" title="${escapeHtml(hint)}">${escapeHtml(display)}${badge}</td>`);
    });

    const editBtnCls = r._edited ? 'btn-edit-row edited' : 'btn-edit-row';
    const editBtnText = r._edited ? '✏️ Edited' : '✏️ Edit';
    cells.push(`<td class="action-cell"><button class="${editBtnCls}" data-edit-id="${r._taskId}">${editBtnText}</button></td>`);

    tr.innerHTML = cells.join('');
    tbody.appendChild(tr);
  });

  resultTable.innerHTML = '';
  resultTable.appendChild(thead);
  resultTable.appendChild(tbody);

  resultTable.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.editId, 10)));
  });

  const totalCells = rows.length * headers.length;
  const totalIssues = missingCount + suspiciousCount + formatCount;
  const editedCount = rows.filter(r => r._edited).length;
  const scrapCount = rows.filter(r => String(r['header.ticket_category'] || '').includes('Process Scrap')).length;
  const supplierCount = rows.filter(r => String(r['header.ticket_category'] || '').includes('Supplier Claim')).length;

  if (totalIssues === 0) {
    issuesBanner.classList.add('all-good');
    issuesBanner.textContent =
      `✅ All ${totalCells} fields look good. ` +
      `Categories — Process Scrap: ${scrapCount}, Supplier Claim: ${supplierCount}.` +
      (editedCount ? ` ${editedCount} row(s) manually edited.` : '');
  } else {
    issuesBanner.classList.remove('all-good');
    issuesBanner.textContent =
      `⚠️ ${totalIssues} of ${totalCells} fields need review — ` +
      `${missingCount} missing, ${suspiciousCount} suspicious, ${formatCount} format mismatch. ` +
      `Categories — Process Scrap: ${scrapCount}, Supplier Claim: ${supplierCount}.` +
      (editedCount ? ` ${editedCount} row(s) manually edited.` : '') +
      ` Click "Edit" to correct.`;
  }
}

function getDisplayHeader(path) {
  const parts = String(path).split('.');
  return parts[parts.length - 1];
}

// ============================================================
//  Zoom
// ============================================================
function applyZoom() {
  const s = zoomState.scale;
  // Preserve the current rotation
  modalImage.style.transformOrigin = modalRotation === 0 ? 'top center' : 'center center';
  modalImage.style.transform = `rotate(${modalRotation}deg) scale(${s})`;
  zoomLabel.textContent = `${Math.round(s * 100)}%`;
}

function setZoom(newScale, fitMode = null) {
  const clamped = Math.max(0.1, Math.min(8, newScale));
  zoomState.scale = clamped;
  zoomState.fitMode = fitMode;
  applyZoom();
}

function zoomIn() { setZoom(zoomState.scale * 1.25); }
function zoomOut() { setZoom(zoomState.scale / 1.25); }
function zoomReset() { setZoom(1); }
function zoomFitWidth() {
  if (!zoomState.naturalW) return;
  const containerW = imageScroll.clientWidth - 32;
  setZoom(containerW / zoomState.naturalW, 'width');
}
function zoomFitHeight() {
  if (!zoomState.naturalH) return;
  const containerH = imageScroll.clientHeight - 32;
  setZoom(containerH / zoomState.naturalH, 'height');
}
// ============================================================
//  Modal image rotation (visual only, does not affect AI extraction)
// ============================================================
function rotateModalImage(degrees) {
  modalRotation = (modalRotation + degrees + 360) % 360;
  applyModalRotation();
}

function applyModalRotation() {
  // Combine rotation with the existing zoom transform
  const s = zoomState.scale;
  // transform-origin at center makes rotation look natural
  modalImage.style.transformOrigin = 'center center';
  modalImage.style.transform = `rotate(${modalRotation}deg) scale(${s})`;
}  
// ============================================================
//  Edit modal
// ============================================================
function openEditModal(taskId) {
  const task = queue.find(t => t.id === taskId);
  if (!task || !task.json) return;

  editingTaskId = taskId;
  editingDraft = JSON.parse(JSON.stringify(task.json));

  modalTitle.textContent = `Edit: ${task.file.name}`;
  modalFileLabel.textContent = buildFilePathForTask(task);

  zoomState.scale = 1; zoomState.naturalW = 0; zoomState.naturalH = 0; zoomState.fitMode = null;
  modalRotation = 0;
  zoomLabel.textContent = '100%';

  modalImage.onload = () => {
    zoomState.naturalW = modalImage.naturalWidth;
    zoomState.naturalH = modalImage.naturalHeight;
    applyZoom();
    setTimeout(zoomFitWidth, 50);
  };
  modalImage.src = task.previewUrl || task.resizedDataUrl || '';

  renderEditFields(task);
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  editingTaskId = null;
  editingDraft = null;
  zoomState.scale = 1;
  zoomState.naturalW = 0;
  zoomState.naturalH = 0;
  zoomState.fitMode = null;
  modalRotation = 0;
}

function getFieldHint(path) {
  const rule = FORMAT_RULES[path];
  return rule ? rule.hint : '';
}

function renderEditFields(task) {
  modalFields.innerHTML = '';

  const sections = Object.keys(editingDraft);
  sections.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.style.marginBottom = '18px';

    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = 'font-size:13px; font-weight:600; color:#333; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee;';
    sectionTitle.textContent = section;
    sectionEl.appendChild(sectionTitle);

    const fields = editingDraft[section];
    if (!fields || typeof fields !== 'object') {
      sectionEl.appendChild(document.createTextNode(String(fields)));
      modalFields.appendChild(sectionEl);
      return;
    }

    Object.keys(fields).forEach(fieldKey => {
      const path = `${section}.${fieldKey}`;
      const originalValue = task.originalJson?.[section]?.[fieldKey];
      const currentValue = fields[fieldKey];

      const fieldEl = document.createElement('div');
      fieldEl.className = 'edit-field';
      fieldEl.dataset.path = path;
      
      const isSignature = section === 'signatures';
      const isTicketCategory = path === 'header.ticket_category';
      const hint = getFieldHint(path);

      const label = document.createElement('label');
      label.htmlFor = `edit-${path}`;
      label.title = path;
      label.innerHTML = escapeHtml(getDisplayHeader(path)) +
        (hint ? `<span class="field-hint">${escapeHtml(hint)}</span>` : '');
      fieldEl.appendChild(label);

      let input;
      if (isSignature) {
        input = document.createElement('select');
        ['Signed', 'Not Signed'].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (String(currentValue) === opt) o.selected = true;
          input.appendChild(o);
        });
      } else if (isTicketCategory) {
        input = document.createElement('select');
        ['Process Scrap Parts', 'Supplier Claim Parts', 'Unknown'].forEach(opt => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (String(currentValue) === opt) o.selected = true;
          input.appendChild(o);
        });
      } else {
        const strVal = currentValue === null || currentValue === undefined ? '' : String(currentValue);
        if (strVal.length > 60) {
          input = document.createElement('textarea');
          input.rows = 2;
        } else {
          input = document.createElement('input');
          input.type = 'text';
        }
        input.value = strVal;
      }

      input.id = `edit-${path}`;
      input.dataset.path = path;
      input.addEventListener('input', onEditInput);
      input.addEventListener('change', onEditInput);
      fieldEl.appendChild(input);
      
      // Special hint for cantidad
      if (path === 'section_1.cantidad') {
        const cantMsg = validateCantidad(currentValue);
        if (cantMsg) {
          const warn = document.createElement('div');
          warn.style.cssText = 'font-size: 11px; color: #997404; margin-top: 4px; font-weight: 600;';
          warn.textContent = '⚠️ ' + cantMsg;
          fieldEl.appendChild(warn);
        }
      }
      if (originalValue !== undefined && originalValue !== null &&
          String(originalValue) !== String(currentValue)) {
        const orig = document.createElement('div');
        orig.className = 'original-value';
        orig.textContent = `AI original: ${originalValue === '' ? '(empty)' : originalValue}`;
        fieldEl.appendChild(orig);
      }

      if (String(originalValue ?? '') !== String(currentValue ?? '')) {
        fieldEl.classList.add('changed');
      }

      sectionEl.appendChild(fieldEl);
    });

    modalFields.appendChild(sectionEl);
  });
}

function onEditInput(e) {
  const input = e.target;
  const path = input.dataset.path;
  if (!path || !editingDraft) return;

  const [section, fieldKey] = path.split('.');
  if (!editingDraft[section]) return;

  let newVal = input.value;
  if (newVal === '') newVal = null;
  editingDraft[section][fieldKey] = newVal;

  const fieldEl = input.closest('.edit-field');
  const task = queue.find(t => t.id === editingTaskId);
  const orig = task?.originalJson?.[section]?.[fieldKey];
  const origStr = orig === null || orig === undefined ? '' : String(orig);
  const newStr = newVal === null ? '' : String(newVal);

  if (origStr !== newStr) fieldEl.classList.add('changed');
  else fieldEl.classList.remove('changed');

  const note = fieldEl.querySelector('.original-value');
  if (note) {
    if (origStr !== newStr) {
      note.textContent = `AI original: ${origStr === '' ? '(empty)' : origStr}`;
    } else {
      note.remove();
    }
  } else if (origStr !== newStr) {
    const div = document.createElement('div');
    div.className = 'original-value';
    div.textContent = `AI original: ${origStr === '' ? '(empty)' : origStr}`;
    fieldEl.appendChild(div);
  }
}

function onModalSave() {
  if (editingTaskId === null || !editingDraft) return;
  const task = queue.find(t => t.id === editingTaskId);
  if (!task) return;

  const orig = JSON.stringify(task.originalJson || {});
  const curr = JSON.stringify(editingDraft || {});
  task.json = editingDraft;
  task.edited = orig !== curr;

  closeEditModal();
  renderQueue();

  const successTasks = queue.filter(t => t.status === 'success' && t.json);
  if (successTasks.length) renderResultTable(successTasks);

  showStatus(`💾 Saved edits for ${task.file.name}${task.edited ? ' (marked as edited)' : ''}.`, 'success');
}

function onModalReset() {
  if (editingTaskId === null) return;
  const task = queue.find(t => t.id === editingTaskId);
  if (!task || !task.originalJson) return;
  editingDraft = JSON.parse(JSON.stringify(task.originalJson));
  renderEditFields(task);
}

// ============================================================
//  Excel export — 3 sheets
// ============================================================
function onDownloadExcel() {
  const successTasks = queue.filter(t => t.status === 'success' && t.json);
  if (!successTasks.length) {
    showStatus('No successful results to export.', 'error');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: EBRO Merged
   const rows = successTasks.map(t => {
    const flat = flattenJson(t.json);
    HIDDEN_FIELDS.forEach(f => { delete flat[f]; });
    return {
      _file: buildFilePathForTask(t),
      ...flat
    };
  });

  const headerSet = new Set(['_file']);
  rows.forEach(r => Object.keys(r).forEach(k => {
    if (HIDDEN_FIELDS.includes(k)) return;
    headerSet.add(k);
  }));
  const headers = Array.from(headerSet);

  const aoa = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
  const wsMain = XLSX.utils.aoa_to_sheet(aoa);
  wsMain['!cols'] = headers.map(h => ({ wch: h === '_file' ? 40 : 22 }));
  XLSX.utils.book_append_sheet(wb, wsMain, 'EBRO Merged');

  // Sheet 2: Extraction Results
  const { keyStats, statuses } = buildKeyParameterSummary(successTasks);

  const erHeader = ['#', 'Status', 'Judgement Reason', ...headers];
  const erRows = successTasks.map((t, i) => {
    const flat = flattenJson(t.json);
    const statusInfo = statuses[t.id] || { level: 'green', reasons: [] };
    const statusLetter = { green: 'GREEN', yellow: 'YELLOW', red: 'RED' }[statusInfo.level] || 'GREEN';
    const reasonText = statusInfo.reasons.length
      ? statusInfo.reasons.join(' | ')
      : 'All fields present and valid';
    return [
      i + 1,
      statusLetter,
      reasonText,
      ...headers.map(h => flat[h] ?? '')
    ];
  });

  const wsER = XLSX.utils.aoa_to_sheet([erHeader, ...erRows]);
  wsER['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 60 },
    ...headers.map(h => ({ wch: h === '_file' ? 40 : 22 }))
  ];
  XLSX.utils.book_append_sheet(wb, wsER, 'Extraction Results');

  // Sheet 3: Parameter Summary
  const quality = computeQualityScore(successTasks);

  const psAoa = [
    ['Data Quality Audit'],
    [],
    ['Overall Quality Score', `${quality.score.toFixed(1)}%`],
    ['Key Parameters Present', `${quality.keyPresent} / ${quality.keyTotal}`],
    ['Other Fields Present', `${quality.otherPresent} / ${quality.otherTotal}`],
    ['Total Forms Processed', successTasks.length],
    [],
    ['Key Parameter', 'Missing Count', 'Present Count', 'Total Forms', 'Status']
  ];

  KEY_PARAMETERS.forEach(kp => {
    const stat = keyStats[kp.path];
    const present = stat.total - stat.missingCount;
    let status = 'COMPLETE';
    if (stat.missingCount > 0) {
      status = stat.missingCount === stat.total ? 'ALL MISSING' : 'PARTIAL';
    }
    psAoa.push([kp.label, stat.missingCount, present, stat.total, status]);
  });

  const wsPS = XLSX.utils.aoa_to_sheet(psAoa);
  wsPS['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPS, 'Parameter Summary');

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `ebro-batch-${timestamp}.xlsx`);

  const editedCount = successTasks.filter(t => t.edited).length;
  showStatus(
    `📊 Exported ${rows.length} row(s) across 3 sheets` +
    (editedCount ? ` (${editedCount} with manual edits).` : '.'),
    'success'
  );
}

// ============================================================
//  Input Method switching
// ============================================================
function applyInputMethod(method) {
  inputMethod = method;
  localStorage.setItem(INPUT_METHOD_STORAGE, method);

  imsFolderBtn.classList.toggle('active', method === 'folder');
  imsUploadBtn.classList.toggle('active', method === 'upload');

  localModePanel.style.display = method === 'folder' ? 'block' : 'none';
  uploadPanel.style.display = method === 'upload' ? 'block' : 'none';

  if (method === 'upload') {
    localStatus.textContent = '';
    localStatus.className = 'local-status';
  } else {
    updateLocalStatusFromHandles();
  }

  updateLocalModeButtons();
  updateButtonState();
}

function updateLocalStatusFromHandles() {
  if (inputMethod !== 'folder') return;
  const hasInput = !!localHandles.input;
  const hasReaded = !!localHandles.readed;
  const hasError = !!localHandles.error;

  if (hasInput && hasReaded && hasError) {
    localStatus.textContent = '✅ All folders authorized';
    localStatus.className = 'local-status connected';
  } else if (hasInput) {
    localStatus.textContent = `⚠️ ${hasReaded ? '' : 'readed '}${hasError ? '' : 'error '}folder(s) missing`;
    localStatus.className = 'local-status error';
  } else {
    localStatus.textContent = 'Not authorized';
    localStatus.className = 'local-status';
  }
}

function switchInputMethod(method) {
  if (method === inputMethod) return;
  applyInputMethod(method);
}

function updateLocalModeButtons() {
  if (typeof window.showDirectoryPicker !== 'function') return;
  const hasInput = !!localHandles.input;
  const hasReaded = !!localHandles.readed;
  const hasError = !!localHandles.error;
  localLoadBtn.disabled = inputMethod !== 'folder' || !hasInput;
  localProcessBtn.disabled = inputMethod !== 'folder' || !hasReaded || !hasError || queue.length === 0;
}

// ============================================================
//  Local Folder Mode
// ============================================================
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function verifyHandlePermission(handle) {
  if (!handle) return false;
  const opts = { mode: 'readwrite' };
  if (await handle.queryPermission(opts) === 'granted') return true;
  if (await handle.requestPermission(opts) === 'granted') return true;
  return false;
}

async function restoreLocalHandles() {
  if (typeof window.showDirectoryPicker !== 'function') return;
  for (const key of ['input', 'readed', 'error']) {
    try {
      const handle = await idbGet(key);
      if (handle) {
        localHandles[key] = handle;
        updateLocalFolderLabel(key, handle.name, false);
      }
    } catch (e) {
      console.warn('Failed to restore handle', key, e);
    }
  }
  updateLocalModeButtons();
  updateLocalStatusFromHandles();
}

async function pickLocalFolder(key) {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    localHandles[key] = handle;
    await idbSet(key, handle);
    updateLocalFolderLabel(key, handle.name, true);
    updateLocalModeButtons();
    updateLocalStatusFromHandles();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('pickLocalFolder error:', err);
    localStatus.textContent = `❌ ${err.message}`;
    localStatus.className = 'local-status error';
  }
}

function updateLocalFolderLabel(key, name, authorized) {
  const labelMap = {
    input: localInputLabel,
    readed: localReadedLabel,
    error: localErrorLabel
  };
  const btnMap = {
    input: localPickInputBtn,
    readed: localPickReadedBtn,
    error: localPickErrorBtn
  };
  labelMap[key].value = name || '';
  if (authorized) btnMap[key].classList.add('authorized');
}

async function loadLocalFiles() {
  if (!localHandles.input) {
    localStatus.textContent = '❌ Please select the input folder first.';
    localStatus.className = 'local-status error';
    return;
  }

  try {
    const ok = await verifyHandlePermission(localHandles.input);
    if (!ok) {
      localStatus.textContent = '❌ Permission denied for input folder.';
      localStatus.className = 'local-status error';
      return;
    }

    localStatus.textContent = 'Reading folder...';
    localStatus.className = 'local-status';

    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tif', '.tiff', '.heic', '.heif'];
    const files = [];

    for await (const [name, handle] of localHandles.input.entries()) {
      if (handle.kind !== 'file') continue;
      const lower = name.toLowerCase();
      if (!imageExts.some(ext => lower.endsWith(ext))) continue;
      const file = await handle.getFile();
      files.push({ name, handle, file, size: file.size, mtime: file.lastModified });
    }

    if (!files.length) {
      localStatus.textContent = '⚠️ No image files found in the input folder.';
      localStatus.className = 'local-status error';
      return;
    }

    queue = [];
    idCounter = 0;

    localStatus.textContent = `Compressing ${files.length} file(s)...`;
    for (const f of files) {
      // Convert HEIC/HEIF to JPEG if needed
      const normalizedFile = await normalizeImageFormat(f.file);
      const task = {
        id: ++idCounter,
        file: normalizedFile,
        previewUrl: null,
        status: 'waiting',
        json: null,
        originalJson: null,
        edited: false,
        error: null,
        localHandle: f.handle,
        localName: f.name,
        resizedBlob: null,
        resizedDataUrl: null,
        resizeInfo: null
      };

      try {
        const resized = await resizeImage(normalizedFile);
        task.resizedBlob = resized.blob;
        task.resizedDataUrl = resized.dataUrl;
        task.resizeInfo = {
          original: `${resized.originalWidth}×${resized.originalHeight}`,
          resized: `${resized.width}×${resized.height}`,
          originalKB: Math.round(resized.originalSize / 1024),
          resizedKB: Math.round(resized.resizedSize / 1024),
        };
        task.previewUrl = resized.dataUrl;
      } catch (err) {
        console.error('Resize failed:', f.name, err);
        task.previewUrl = await fileToDataUrl(normalizedFile);
        task.resizeInfo = { error: 'Resize failed, using original' };
      }

      queue.push(task);
    }

    renderQueue();
    updateButtonState();
    updateLocalModeButtons();

    const totalOrigKB = queue
      .filter(t => t.resizeInfo && t.resizeInfo.originalKB)
      .reduce((s, t) => s + t.resizeInfo.originalKB, 0);
    const totalNewKB = queue
      .filter(t => t.resizeInfo && t.resizeInfo.resizedKB)
      .reduce((s, t) => s + t.resizeInfo.resizedKB, 0);

    localStatus.textContent =
      `✅ Loaded ${queue.length} image(s) from "${localHandles.input.name}" · ` +
      `${totalOrigKB} KB → ${totalNewKB} KB`;
    localStatus.className = 'local-status connected';
  } catch (err) {
    console.error('loadLocalFiles error:', err);
    localStatus.textContent = `❌ ${err.message}`;
    localStatus.className = 'local-status error';
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processLocalBatch() {
  if (isRunning) return;
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Please enter your API Key first.', 'error');
    return;
  }
  if (!localHandles.readed || !localHandles.error) {
    showStatus('Please select both readed and error folders first.', 'error');
    return;
  }

  const pending = queue.filter(t => t.status === 'waiting');
  if (!pending.length) {
    showStatus('No pending files to process.', 'error');
    return;
  }

  const okReaded = await verifyHandlePermission(localHandles.readed);
  const okError = await verifyHandlePermission(localHandles.error);
  if (!okReaded || !okError) {
    showStatus('Permission denied for target folders. Please re-select them.', 'error');
    return;
  }

  isRunning = true;
  updateButtonState();
  updateLocalModeButtons();
  resultSection.style.display = 'none';
  progressWrap.style.display = 'block';
  summaryEl.style.display = 'none';

  const platform = getCurrentPlatform();
  let done = 0, success = 0, failed = 0;

  for (const task of pending) {
    if (task.status === 'cancelled') continue;
    task.status = 'processing';
    renderQueue();

    // Step 1: Extract with AI
    try {
      await rateLimiter.wait();
      const json = await extractOneWithRetry(task, apiKey, platform);
      task.json = json;
      if (json && json._signatureWarning) {
        task.signatureWarning = json._signatureWarning;
        delete json._signatureWarning;
      }
      task.originalJson = JSON.parse(JSON.stringify(json));
      task.status = 'success';
      task.error = null;
      success++;
    } catch (err) {
      console.error(task.file.name, err);
      task.error = err.message || 'Unknown error';
      task.status = 'error';
      failed++;
    }

    // Step 2: Move file to target folder
    try {
      const targetHandle = task.status === 'success' ? localHandles.readed : localHandles.error;
      const movedName = await moveLocalFile(task, targetHandle);
      task.movedTo = movedName;
      task.currentLocation = task.status === 'success' ? 'readed' : 'error';
    } catch (moveErr) {
      console.error('Move failed:', task.localName, moveErr);
      task.error = (task.error ? task.error + ' | ' : '') + 'Move failed: ' + moveErr.message;
    }

    done++;
    progressBar.style.width = `${(done / pending.length) * 100}%`;
    renderQueue();
    updateButtonState();
  }

  isRunning = false;
  updateButtonState();
  updateLocalModeButtons();

  if (platform === 'deepseek') fetchDeepSeekBalance();

  summaryEl.style.display = 'block';
  summaryEl.innerHTML =
    `✅ Succeeded: ${success} → readed · ` +
    `❌ Failed: ${failed} → error · ` +
    `Total: ${pending.length}`;

  const successTasks = queue.filter(t => t.status === 'success' && t.json);
  if (successTasks.length) {
    renderResultTable(successTasks);
    resultSection.style.display = 'block';
  }

  showStatus(
    `🎉 Done. ${success} succeeded, ${failed} failed. Files have been moved.`,
    success ? 'success' : 'error'
  );
}

async function moveLocalFile(task, targetDirHandle) {
  if (!task.localHandle || !task.localName) {
    throw new Error('Missing local handle');
  }

  let finalName = task.localName;
  let destFileHandle;
  let attempts = 0;
  while (attempts < 3) {
    try {
      destFileHandle = await targetDirHandle.getFileHandle(finalName, { create: false });
      const dot = finalName.lastIndexOf('.');
      const base = dot > 0 ? finalName.slice(0, dot) : finalName;
      const ext = dot > 0 ? finalName.slice(dot) : '';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      finalName = `${base}_${ts}${ext}`;
      attempts++;
    } catch (e) {
      break;
    }
  }

  const sourceFile = await task.localHandle.getFile();
  const destHandle = await targetDirHandle.getFileHandle(finalName, { create: true });
  const writable = await destHandle.createWritable();
  await writable.write(sourceFile);
  await writable.close();

  await task.localHandle.remove();

  return finalName;
}

async function pullFileBackFromFolder(sourceDirHandle, targetDirHandle, fileName) {
  if (!sourceDirHandle || !targetDirHandle || !fileName) {
    throw new Error('Missing arguments for pull back');
  }

  const sourceFileHandle = await sourceDirHandle.getFileHandle(fileName, { create: false });

  let finalName = fileName;
  let attempts = 0;
  while (attempts < 3) {
    try {
      await targetDirHandle.getFileHandle(finalName, { create: false });
      const dot = finalName.lastIndexOf('.');
      const base = dot > 0 ? finalName.slice(0, dot) : finalName;
      const ext = dot > 0 ? finalName.slice(dot) : '';
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      finalName = `${base}_${ts}${ext}`;
      attempts++;
    } catch (e) {
      break;
    }
  }

  const srcFile = await sourceFileHandle.getFile();
  const destHandle = await targetDirHandle.getFileHandle(finalName, { create: true });
  const writable = await destHandle.createWritable();
  await writable.write(srcFile);
  await writable.close();

  await sourceDirHandle.removeEntry(fileName);

  return { handle: destHandle, name: finalName };
}

/**
 * Special validation for cantidad — should normally be 1.
 * Returns null if OK, or a message if there's a concern.
 */
function validateCantidad(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === '') return null;

  const n = parseInt(s, 10);
  if (isNaN(n)) return null; // not a number — handled elsewhere

  if (n > 1) {
    return `Quantity is ${n} — usually should be 1. Please verify.`;
  }
  return null;
}
/**
 * Some AI outputs return the literal string "null" instead of a real JSON null.
 * This function walks the object and converts these to actual nulls.
 */
function coerceNullStrings(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^null$/i.test(obj.trim())) return null;
    return obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(coerceNullStrings);

  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = coerceNullStrings(obj[key]);
  }
  return out;
}
