// ============================================================
// 1. 谱面数据
// ============================================================


// ============================================================
// 2. 段位预设
// ============================================================


// ============================================================
// 3. 配置 & 存储
// ============================================================

// ============================================================
// 4. Rating 核心
// ============================================================

// ============================================================
// 5. DOM
// ============================================================
const $ = id => document.getElementById(id);

const navAvatarImg = $('navAvatarImg');
const navAvatarPh = $('navAvatarPh');
const navPlayerName = $('navPlayerName');
const navPlayerId = $('navPlayerId');

const tableBody = $('tableBody');
const songTableHeader = $('songTableHeader');
const songTableBodyWrap = $('songTableBodyWrap');

const displayRating = $('displayRating');
const ratingCountHint = $('ratingCountHint');
const ratingLabel = $('ratingLabel');
const lastCalcTimeEl = $('lastCalcTime');
const avgToggleSum = $('avgToggleSum');
const avgToggleAvg = $('avgToggleAvg');
const mainAvatarImg = $('mainAvatarImg');
const mainAvatarPh = $('mainAvatarPh');
const mainPlayerName = $('mainPlayerName');
const mainPlayerId = $('mainPlayerId');
const queryCurrentId = $('queryCurrentId');

const concurrencySlider = $('concurrencySlider');
const concurrencyValue = $('concurrencyValue');
const truncateToggle = $('truncateToggle');
const maxRankInput = $('maxRankInput');
const queryStartBtn = $('queryStartBtn');
const queryStopBtn = $('queryStopBtn');
const calcBtn = $('calcBtn');
const exportScoresBtn = $('exportScoresBtn');
const exportB50Btn = $('exportB50Btn');
const clearBtn = $('clearBtn');
const progressBarWrap = $('progressBarWrap');
const progressBar = $('progressBar');
const queryProgressText = $('queryProgressText');
const queryTimer = $('queryTimer');
const queryCurrentChart = $('queryCurrentChart');

const previewList = $('previewList');
const previewCount = $('previewCount');
const previewSearchInput = $('previewSearchInput');
const previewSearchClear = $('previewSearchClear');
const previewSortSelect = $('previewSortSelect');

// 详情页 DOM
const detailBackBtn = $('detailBackBtn');
const detailExportBtn = $('detailExportBtn');
const detailArtImg = $('detailArtImg');
const detailLoadingImg = $('detailLoadingImg');
const detailArtPh = $('detailArtPh');
const detailName = $('detailName');
const detailConstBadge = $('detailConstBadge');
const detailChartId = $('detailChartId');
const detailCopyBtn = $('detailCopyBtn');
const detailCopyIcon = $('detailCopyIcon');
const detailCopyText = $('detailCopyText');
const detailCharter = $('detailCharter');
const detailComposer = $('detailComposer');
const detailYellow = $('detailYellow');
const detailPass = $('detailPass');
const detailBacklight = $('detailBacklight');
const detailBreak = $('detailBreak');
const accMeterTrack = $('accMeterTrack');

const dragCount = $('dragCount');
const totalNotes = $('totalNotes');
const resultD = $('resultD');
const calcDBtn = $('calcD');
const sendDToModule2 = $('sendDToModule2');
const module2D = $('module2D');
const module2ACC = $('module2ACC');
const module2STACC = $('module2STACC');
const resultSTACC = $('resultSTACC');
const resultACC = $('resultACC');
const sendToModule3 = $('sendToModule3');
const module3Constant = $('module3Constant');
const module3STACC = $('module3STACC');
const resultRating = $('resultRating');
const calcRatingBtn = $('calcRating');
const benchPass = $('benchPass');
const benchBacklight = $('benchBacklight');
const benchBreak = $('benchBreak');

const playerPageAvatarImg = $('playerPageAvatarImg');
const playerPageAvatarPh = $('playerPageAvatarPh');
const playerPageName = $('playerPageName');
const playerPageIdInput = $('playerPageIdInput');
const playerPageSaveBtn = $('playerPageSaveBtn');
const playerPageJumpBtn = $('playerPageJumpBtn');
const playerPageClearBtn = $('playerPageClearBtn');

const segNInputs = [$('segN1'), $('segN2'), $('segN3'), $('segN4')];
const segAInputs = [$('segA1'), $('segA2'), $('segA3'), $('segA4')];
const segSInputs = [$('segS1'), $('segS2'), $('segS3'), $('segS4')];
const segResultReverse = $('segResultReverse');
const segResultForward = $('segResultForward');
const segBtnReverse = $('segBtnReverse');
const segBtnForward = $('segBtnForward');
const segBtnFillForward = $('segBtnFillForward');
const segResetBtn = $('segResetBtn');
const segPresetBtn = $('segPresetBtn');
const segPresetDropdown = $('segPresetDropdown');
const segPresetLabel = $('segPresetLabel');
const segCustomToggle = $('segCustomToggle');
const segInfoRow = $('segInfoRow');
const segStdPass = $('segStdPass');
const segStdBacklight = $('segStdBacklight');
const segStdBreak = $('segStdBreak');
const segAuthorName = $('segAuthorName');
const segExportBtn = $('segExportBtn');
const segLineChart = $('segLineChart');
const segBarChart = $('segBarChart');
const exportContainer = $('exportContainer');
const segAvatarStatus = $('segAvatarStatus');

const playerUploadAvatarBtn = $('playerUploadAvatarBtn');
const playerAvatarFileInput = $('playerAvatarFileInput');
const playerPageAvatarStatus = $('playerPageAvatarStatus');
// ============================================================
// 6. 状态
// ============================================================
let inputs = [];
let results = [];
let avgMode = 'avg';

let playerName = '';
let playerId = '';
let playerAvatar = '';
let localAvatarDataURL = '';
let lastCalcTime = null;
let lastAccSnapshot = null;

let queryRunning = false;
let queryStopped = false;
let abortController = null;
let timerRafId = null;
let queryStartTime = null;

const illustPending = new Map();

// 本地曲绘 manifest（images/manifest.json），存在时优先使用本地图片
let localCoverManifest = null;
// 把这个 Promise 挂到变量上，让 getIllustration 能 await 到它
const localCoverManifestReady = (async function loadLocalCoverManifest() {
  try {
    const resp = await fetch(`${COVERS_BASE_URL}/manifest.json`);
    if (resp.ok) {
      localCoverManifest = await resp.json();
      console.log(`📷 已加载本地曲绘 manifest，共 ${Object.keys(localCoverManifest).length} 张`);
    }
  } catch (e) {
    console.warn('未找到本地曲绘 manifest，回退到 Phira API');
  }
})();

let chartMetaCache = {};
try { chartMetaCache = JSON.parse(localStorage.getItem(KEY.chartMeta) || '{}'); } catch (e) { chartMetaCache = {}; }
const chartMetaPending = new Map();

let segSelectedPreset = null;
let segIsCustom = false;

let previewSearchQuery = '';
let previewSortMode = 'rating';   // 'rating' | 'constant'

// 详情页当前谱面
let detailCurrentSong = null;
// 进入详情前预览页的滚动位置
let previewScrollBeforeDetail = 0;

// ============================================================
// 6.5 显示设置
// ============================================================
function getSettingGuideHints() {
  return localStorage.getItem(KEY.settingsGuideHints) || 'on';
}
function getSettingConstStyle() {
  return localStorage.getItem(KEY.settingsConstStyle) || 'left';
}

function applyGuideHintsSetting(val) {
  if (val === 'off') document.body.classList.add('hide-guide-hints');
  else document.body.classList.remove('hide-guide-hints');
}
function applyConstStyleSetting(val) {
  document.body.setAttribute('data-const-style', val || 'left');
}

function updateSettingButtons() {
  const gh = getSettingGuideHints();
  const cs = getSettingConstStyle();
  document.querySelectorAll('.setting-toggle-btn[data-setting="guide-hints"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === gh);
  });
  document.querySelectorAll('.setting-toggle-btn[data-setting="const-style"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === cs);
  });
}

function loadSettings() {
  applyGuideHintsSetting(getSettingGuideHints());
  applyConstStyleSetting(getSettingConstStyle());
  updateSettingButtons();
}

function bindSettingButtons() {
  document.querySelectorAll('.setting-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const setting = this.dataset.setting;
      const value = this.dataset.value;
      if (setting === 'guide-hints') {
        localStorage.setItem(KEY.settingsGuideHints, value);
        applyGuideHintsSetting(value);
      } else if (setting === 'const-style') {
        localStorage.setItem(KEY.settingsConstStyle, value);
        applyConstStyleSetting(value);
      }
      updateSettingButtons();
    });
  });
}

// ============================================================
// 7. 工具函数
// ============================================================

// ============================================================
// 8. 玩家信息
// ============================================================
async function fetchUserInfo(id) {
  try {
    const resp = await fetch(`${API_BASE}/user/${id}`);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    return { name: data.name || '', avatar: data.avatar || '' };
  } catch (e) {
    console.warn('获取玩家信息失败:', e);
    return null;
  }
}

function loadLocalAvatar() {
  if (!playerId) { localAvatarDataURL = ''; return; }
  try {
    localAvatarDataURL = localStorage.getItem(KEY.localAvatar + playerId) || '';
  } catch (e) { localAvatarDataURL = ''; }
}
function saveLocalAvatar(dataURL) {
  if (!playerId) return;
  try {
    if (dataURL) localStorage.setItem(KEY.localAvatar + playerId, dataURL);
    else localStorage.removeItem(KEY.localAvatar + playerId);
  } catch (e) {
    console.warn('本地头像保存失败（可能超出 localStorage 限额）:', e);
  }
}

function updatePlayerUI() {
  navPlayerName.textContent = playerName || '未设置';
  navPlayerId.textContent = playerId ? 'Phira ID: ' + playerId : 'Phira ID: —';
  const displayAvatar = getDisplayAvatar();
  if (displayAvatar) {
    navAvatarImg.src = displayAvatar; navAvatarImg.style.display = 'block'; navAvatarPh.style.display = 'none';
  } else {
    navAvatarImg.style.display = 'none'; navAvatarPh.style.display = 'flex';
  }
  mainPlayerName.textContent = playerName || '未设置玩家';
  mainPlayerId.textContent = playerId ? 'Phira ID: ' + playerId : 'Phira ID: —';
  if (displayAvatar) {
    mainAvatarImg.src = displayAvatar; mainAvatarImg.style.display = 'block'; mainAvatarPh.style.display = 'none';
  } else {
    mainAvatarImg.style.display = 'none'; mainAvatarPh.style.display = 'flex';
  }
  playerPageName.textContent = playerName || '—';
  if (displayAvatar) {
    playerPageAvatarImg.src = displayAvatar; playerPageAvatarImg.style.display = 'block'; playerPageAvatarPh.style.display = 'none';
  } else {
    playerPageAvatarImg.style.display = 'none'; playerPageAvatarPh.style.display = 'flex';
  }
  queryCurrentId.textContent = playerId || '未设置';
  updateSegAvatarStatus();
  updatePlayerAvatarStatus();
}

function updateSegAvatarStatus() {
  if (!segAvatarStatus) return;
  if (localAvatarDataURL) {
    segAvatarStatus.textContent = '已上传';
    segAvatarStatus.classList.add('uploaded');
  } else {
    segAvatarStatus.textContent = '未上传';
    segAvatarStatus.classList.remove('uploaded');
  }
}

function updatePlayerAvatarStatus() {
  if (!playerPageAvatarStatus) return;
  if (localAvatarDataURL) {
    playerPageAvatarStatus.textContent = '已上传本地头像';
    playerPageAvatarStatus.style.color = '#10b981';
  } else if (playerAvatar) {
    playerPageAvatarStatus.textContent = '在线头像（导出不可用）';
    playerPageAvatarStatus.style.color = '#f59e0b';
  } else {
    playerPageAvatarStatus.textContent = '未获取';
    playerPageAvatarStatus.style.color = '#94a3b8';
  }
}

function savePlayerStorage() {
  localStorage.setItem(KEY.player, playerName);
  localStorage.setItem(KEY.playerId, playerId);
  localStorage.setItem(KEY.avatar, playerAvatar);
}
function loadPlayerStorage() {
  playerName = localStorage.getItem(KEY.player) || '';
  playerId = localStorage.getItem(KEY.playerId) || '';
  playerAvatar = localStorage.getItem(KEY.avatar) || '';
  const lc = parseInt(localStorage.getItem(KEY.lastcalc) || '', 10);
  lastCalcTime = (!isNaN(lc) && lc > 0) ? lc : null;
  playerPageIdInput.value = playerId;
  loadLocalAvatar();
}

// ============================================================
// 9. 页面切换
// ============================================================
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === name));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'preview') renderPreview();
  if (name === 'main') updateDisplay();
  if (name === 'segment') segUpdateCharts();
  if (name !== 'detail') {
    // 离开详情页时清空当前谱面记录
    detailCurrentSong = null;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

songTableBodyWrap.addEventListener('scroll', () => {
  songTableHeader.scrollLeft = songTableBodyWrap.scrollLeft;
}, { passive: true });

// ============================================================
// 10. 曲绘 / 谱面元数据加载
// ============================================================
async function getIllustration(chartId, size = 'thumb') {
  if (!chartId) return null;
  const key = String(chartId);

  // 等 manifest 就绪（无论成功或失败，都会 resolve）
  await localCoverManifestReady;

  // 本地图片优先（路径前缀来自 COVERS_BASE_URL）
  if (localCoverManifest && localCoverManifest[key]) {
    const entry = localCoverManifest[key];
    // 新格式：{ full, thumb }
    if (typeof entry === 'object' && entry !== null) {
      const filename = entry[size] || entry.thumb || entry.full;
      if (filename) {
        return `${COVERS_BASE_URL}/${size === 'full' ? 'full' : 'thumb'}/${filename}`;
      }
    }
    // 旧格式兼容：纯字符串
    if (typeof entry === 'string') {
      return `${COVERS_BASE_URL}/${entry}`;
    }
  }

  // 本地无图时才请求 Phira API（不再缓存 URL）
  if (illustPending.has(key)) return illustPending.get(key);

  const p = runIllustTask(() =>
    fetch(`${API_BASE}/chart/${chartId}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => d.illustration || null)
  )
    .then(url => { illustPending.delete(key); return url; })
    .catch(() => { illustPending.delete(key); return null; });

  illustPending.set(key, p);
  return p;
}

function getChartMeta(chartId) {
  if (!chartId) return Promise.resolve(null);
  const key = String(chartId);
  if (chartMetaCache[key] !== undefined) return Promise.resolve(chartMetaCache[key]);
  if (chartMetaPending.has(key)) return chartMetaPending.get(key);

  const p = runIllustTask(() =>
    fetch(`${API_BASE}/chart/${chartId}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => {
        const meta = {
          charter: (typeof d.charter === 'string' && d.charter.trim()) ? d.charter : '',
          composer: (typeof d.composer === 'string' && d.composer.trim()) ? d.composer : '',
          illustration: d.illustration || null
        };
        chartMetaCache[key] = meta;
        try { localStorage.setItem(KEY.chartMeta, JSON.stringify(chartMetaCache)); } catch (e) {}
        return meta;
      })
  )
    .then(meta => { chartMetaPending.delete(key); return meta; })
    .catch(() => {
      const meta = { charter: '', composer: '', illustration: null };
      chartMetaCache[key] = meta;
      try { localStorage.setItem(KEY.chartMeta, JSON.stringify(chartMetaCache)); } catch (e) {}
      chartMetaPending.delete(key);
      return meta;
    });

  chartMetaPending.set(key, p);
  return p;
}

// 曲绘加载「暂停」标志：查询成绩期间设为 true，避免抢网络带宽
let illustSuspended = false;
// 暂停期间累积的 art-box，查询结束后统一处理
const pendingIllustBoxes = new Set();

// ================= 请求队列（限制曲绘 / 元数据请求的并发，避免占满同域名连接池） =================
const illustTaskQueue = [];
let illustTaskRunning = 0;
const ILLUST_MAX_CONCURRENT = 2;   // 页面空闲时最多 2 个曲绘/元数据请求并发
let illustQueueFrozen = false;     // 查询成绩期间冻结整个队列

function runIllustTask(fn) {
  return new Promise((resolve, reject) => {
    illustTaskQueue.push({ fn, resolve, reject });
    pumpIllustTaskQueue();
  });
}

function pumpIllustTaskQueue() {
  if (illustQueueFrozen) return;
  while (illustTaskRunning < ILLUST_MAX_CONCURRENT && illustTaskQueue.length > 0) {
    const item = illustTaskQueue.shift();
    illustTaskRunning++;
    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(() => {
        illustTaskRunning--;
        pumpIllustTaskQueue();
      });
  }
}

// 真正发起曲绘加载（从 observer 回调和恢复流程里调用）
function loadArtBox(el) {
  const chartId = el.dataset.chartid;
  const img = el.querySelector('img');
  const ph = el.querySelector('.art-ph');

  const showImage = (src) => {
    if (img) { img.src = src; img.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
  };

  if (!chartId) {
    showImage(NO_COVER_URL);
    return;
  }
  // 表格缩略图 → 使用 thumb
  getIllustration(chartId, 'thumb').then(url => {
    showImage(url || NO_COVER_URL);
  });
}

const illustObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    illustObserver.unobserve(el);

    if (illustSuspended) {
      // 查询成绩期间：不立即加载，先入队，查询结束后统一处理
      pendingIllustBoxes.add(el);
      return;
    }
    loadArtBox(el);
  });
}, { rootMargin: '300px' });

// 暂停/恢复曲绘加载（查询成绩期间用）
function suspendIllustLoading() {
  illustSuspended = true;
  illustQueueFrozen = true;   // 冻结队列：正在跑的等它跑完，但不再启动新的
}

function resumeIllustLoading() {
  illustSuspended = false;
  illustQueueFrozen = false;
  pumpIllustTaskQueue();      // 唤醒队列，继续处理
  // 处理查询期间累积的元素（页面切换可能已重建，需判断还在 DOM 中）
  pendingIllustBoxes.forEach(el => {
    if (document.body.contains(el)) loadArtBox(el);
  });
  pendingIllustBoxes.clear();
}

// ================= 后台预加载原图（空闲时进行，查询等任务时暂停） =================
let preloadRunning = false;
let preloadAborted = false;

async function preloadAllFullCovers() {
  if (preloadRunning) return;
  preloadRunning = true;
  preloadAborted = false;

  // 等 manifest 就绪
  await localCoverManifestReady;

  if (!localCoverManifest) {
    console.log('📷 无本地 manifest，跳过原图预加载');
    preloadRunning = false;
    return;
  }

  const songs = SONG_DATA.filter(s => s.chartId && localCoverManifest[String(s.chartId)]);
  const total = songs.length;
  let loadedCount = 0;

  console.log(`📷 开始预加载原图，共 ${total} 张`);

  for (const song of songs) {
    if (preloadAborted) break;

    // 如果当前有查询等任务在跑，暂停预加载（每 500ms 检查一次）
    while (illustSuspended && !preloadAborted) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (preloadAborted) break;

    const key = String(song.chartId);
    const entry = localCoverManifest[key];
    if (!entry || typeof entry !== 'object' || !entry.full) continue;

    const url = `${COVERS_BASE_URL}/full/${entry.full}`;

    // 走统一队列，与缩略图共享并发限制；查询时队列冻结会自动推迟
    await new Promise(resolve => {
      runIllustTask(() => new Promise(res => {
        const img = new Image();
        img.onload = () => res();
        img.onerror = () => res();
        img.src = url;
      })).then(resolve).catch(resolve);
    });

    loadedCount++;
  }

  preloadRunning = false;
  if (preloadAborted) {
    console.log(`📷 原图预加载已中止（已加载 ${loadedCount}/${total}）`);
  } else {
    console.log(`📷 原图预加载完成，共 ${loadedCount} 张`);
  }
}

// 中止预加载（如需重置状态时调用）
function abortPreload() {
  preloadAborted = true;
  preloadRunning = false;
}

function makeArtBox(chartId) {
  const div = document.createElement('div');
  div.className = 'art-box';
  div.dataset.chartid = chartId || '';
  if (!chartId) {
    // 无 chartId：直接显示占位图
    div.innerHTML = `<img src="${NO_COVER_URL}" alt="无曲绘" />`;
  } else {
    // 有 chartId：先隐藏，等异步加载或失败时再决定
    div.innerHTML = `<img style="display:none;" alt="" /><div class="art-ph">无图</div>`;
  }
  return div;
}
function artBoxHtml(chartId) {
  if (!chartId) {
    return `<div class="art-box"><img src="${NO_COVER_URL}" alt="无曲绘" /></div>`;
  }
  return `<div class="art-box" data-chartid="${chartId}"><img style="display:none;" alt="" /><div class="art-ph">无图</div></div>`;
}
// ============================================================
// 11. 主页面表格渲染
// ============================================================
function renderTable() {
  let html = '';
  SONG_DATA.forEach((song, idx) => {
    const constClass = getConstClass(song.constant);
    html += `
      <tr data-index="${idx}" data-id="${song.internalId}" class="${constClass}">
        <td class="col-art" data-chartid="${song.chartId || ''}"></td>
        <td class="col-name" title="${escapeHtml(song.name)}">${escapeHtml(song.name)}</td>
        <td class="col-const" style="text-align:center;">${song.constant}</td>
        <td class="col-chartid">${song.chartId !== null ? song.chartId : '—'}</td>
        <td class="col-acc">
          <input class="acc-input" type="number" step="any" min="0" max="100"
                 placeholder="ACC" data-index="${idx}" id="input_${idx}" inputmode="decimal" />
        </td>
        <td class="col-stacc" id="stacc_${idx}"><span class="rating-empty">—</span></td>
        <td class="col-rating" id="result_${idx}"><span class="rating-empty">—</span></td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  inputs = [];
  SONG_DATA.forEach((song, idx) => {
    const row = tableBody.querySelector(`tr[data-index="${idx}"]`);
    const tdArt = row.querySelector('.col-art');
    const artBox = makeArtBox(song.chartId);
    tdArt.appendChild(artBox);
    illustObserver.observe(artBox);

    const inp = document.getElementById(`input_${idx}`);
    inputs.push(inp);
    inp.addEventListener('input', () => {
      const resEl = document.getElementById(`result_${idx}`);
      const staccEl = document.getElementById(`stacc_${idx}`);
      if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
      if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
      saveToLocalStorage();
    });
  });
}

// ============================================================
// 12. localStorage（ACC）
// ============================================================
function getAccSnapshot() {
  const obj = {};
  inputs.forEach((inp, idx) => {
    const val = inp.value.trim();
    if (val !== '' && !isNaN(parseFloat(val))) obj[SONG_DATA[idx].internalId] = val;
  });
  return JSON.stringify(obj);
}
function saveToLocalStorage() {
  const accObj = {};
  inputs.forEach((inp, idx) => {
    const val = inp.value.trim();
    if (val !== '' && !isNaN(parseFloat(val))) accObj[SONG_DATA[idx].internalId] = val;
  });
  localStorage.setItem(KEY.accs, JSON.stringify(accObj));
}
function loadFromLocalStorage() {
  const stored = localStorage.getItem(KEY.accs);
  if (!stored) return;
  try {
    const accObj = JSON.parse(stored);
    let anyFilled = false;
    SONG_DATA.forEach((song, idx) => {
      const id = song.internalId;
      if (accObj.hasOwnProperty(id)) {
        const val = accObj[id];
        if (val !== undefined && val !== null && val !== '') {
          inputs[idx].value = val;
          anyFilled = true;
        }
      }
    });
    if (anyFilled) calculate(true);
  } catch (e) { localStorage.removeItem(KEY.accs); }
}

// ============================================================
// 13. 计算 & 显示
// ============================================================
function calculate(isInitialLoad) {
  results = [];
  inputs.forEach((inp, idx) => {
    const raw = inp.value.trim();
    if (raw === '') return;
    const accNum = parseFloat(raw);
    if (isNaN(accNum) || accNum < 0 || accNum > 100) return;
    const song = SONG_DATA[idx];
    const accDecimal = accNum / 100;
    const D = song.yellowRatio || 0;
    const stacc = calcSTACC(accDecimal, D);
    const staccPercent = stacc !== null ? stacc * 100 : 0;
    const rating = calcSingleRating(song.constant, stacc || 0);
    results.push({
      index: idx, id: song.internalId, rating, stacc: staccPercent, acc: accNum,
      constant: song.constant, chartId: song.chartId, name: song.name, yellowRatio: song.yellowRatio
    });
  });

  const snap = getAccSnapshot();
  if (snap !== lastAccSnapshot) {
    lastAccSnapshot = snap;
    if (!isInitialLoad) {
      lastCalcTime = Date.now();
      localStorage.setItem(KEY.lastcalc, String(lastCalcTime));
    } else if (!lastCalcTime) {
      lastCalcTime = Date.now();
      localStorage.setItem(KEY.lastcalc, String(lastCalcTime));
    }
  }

  updateDisplay();
  saveToLocalStorage();
}

function updateDisplay() {
  const validResults = results.filter(r => r.rating !== undefined && !isNaN(r.rating));
  const sorted = [...validResults].sort((a, b) => b.rating - a.rating);
  const top = sorted.slice(0, TOP_N);
  const count = top.length;

  let sumRating = 0;
  top.forEach(r => sumRating += r.rating);

  let displayValue = sumRating;
  if (avgMode === 'avg' && count > 0) displayValue = sumRating / count;

  displayRating.textContent = count > 0 ? displayValue.toFixed(2) : '—';
  ratingLabel.textContent = '游玩 Rating' + (avgMode === 'avg' ? ' (平均)' : ' (总和)');
  ratingCountHint.textContent = `(${count} 首)`;
  lastCalcTimeEl.textContent = formatDateTime(lastCalcTime);

  SONG_DATA.forEach((_, idx) => {
    const resEl = document.getElementById(`result_${idx}`);
    const staccEl = document.getElementById(`stacc_${idx}`);
    if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
    if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
  });

  const topIndices = new Set(top.map(r => r.index));
  results.forEach(r => {
    const resEl = document.getElementById(`result_${r.index}`);
    const staccEl = document.getElementById(`stacc_${r.index}`);
    const isTop = topIndices.has(r.index);
    const staccVal = (r.stacc !== undefined && !isNaN(r.stacc)) ? r.stacc : null;
    const staccColor = (staccVal !== null) ? getStaccColor(staccVal / 100) : '#94a3b8';
    if (resEl) resEl.innerHTML = `<span style="color:#2563eb;font-weight:${isTop ? 700 : 500};">${r.rating.toFixed(2)}</span>`;
    if (staccEl) {
      staccEl.innerHTML = (staccVal !== null)
        ? `<span style="color:${staccColor};font-weight:${isTop ? 700 : 500};">${staccVal.toFixed(2)}%</span>`
        : '<span class="rating-empty">—</span>';
    }
  });

  inputs.forEach((inp, idx) => inp.classList.toggle('has-value', topIndices.has(idx)));
}

avgToggleSum.addEventListener('click', () => {
  if (avgMode === 'sum') return;
  avgMode = 'sum';
  avgToggleSum.classList.add('active');
  avgToggleAvg.classList.remove('active');
  updateDisplay();
});
avgToggleAvg.addEventListener('click', () => {
  if (avgMode === 'avg') return;
  avgMode = 'avg';
  avgToggleAvg.classList.add('active');
  avgToggleSum.classList.remove('active');
  updateDisplay();
});

// ============================================================
// 14. 清空 ACC
// ============================================================
function clearAll() {
  if (!confirm('确定要清空所有 ACC 数据吗？（玩家信息不会被清除）')) return;
  inputs.forEach(inp => { inp.value = ''; inp.classList.remove('has-value'); });
  SONG_DATA.forEach((_, idx) => {
    const resEl = document.getElementById(`result_${idx}`);
    const staccEl = document.getElementById(`stacc_${idx}`);
    if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
    if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
  });
  results = [];
  updateDisplay();
  localStorage.removeItem(KEY.accs);
}

// ============================================================
// 15. 查询
// ============================================================
async function queryPlayerScore(chartId, pid, maxRank) {
  let cumulativeRank = 0;
  for (let page = 1; page <= 50; page++) {
    if (cumulativeRank >= maxRank) return { found: false, reason: 'truncated' };
    if (abortController && abortController.signal.aborted) return { found: false, reason: 'stopped' };
    const url = `${API_BASE}/record/query/${chartId}?pageNum=30&page=${page}`;
    try {
      const resp = await fetch(url, { signal: abortController.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (!data.results || data.results.length === 0) return { found: false, reason: 'no_data' };
      const match = data.results.find(r => String(r.player) === String(pid));
      if (match) {
        const accRounded = Math.round(match.accuracy * 10000) / 10000;
        const accPercent = accRounded * 100;
        const finalPercent = Math.abs(accPercent - 100) < 0.001 ? 100 : accPercent;
        return { found: true, accuracy: finalPercent };
      }
      cumulativeRank += data.results.length;
      if (data.results.length < 30) return { found: false, reason: 'no_data' };
    } catch (err) {
      if (err.name === 'AbortError') return { found: false, reason: 'stopped' };
      return { found: false, reason: 'error' };
    }
  }
  return { found: false, reason: 'no_data' };
}

function startTimer() {
  if (timerRafId) cancelAnimationFrame(timerRafId);
  queryStartTime = Date.now();
  queryTimer.classList.add('active', 'running');
  queryTimer.textContent = '⏱ 00:00.00';
  const tick = () => {
    const elapsed = Date.now() - queryStartTime;
    queryTimer.textContent = '⏱ ' + formatTimer(elapsed);
    timerRafId = requestAnimationFrame(tick);
  };
  timerRafId = requestAnimationFrame(tick);
}
function stopTimer() {
  if (timerRafId) { cancelAnimationFrame(timerRafId); timerRafId = null; }
  queryTimer.classList.remove('running');
  if (queryStartTime) queryTimer.textContent = '⏱ ' + formatTimer(Date.now() - queryStartTime);
}

async function startQuery() {
  if (queryRunning) return;
  if (!playerId) {
    alert('请先前往「玩家」页面设置 Phira ID！');
    switchPage('player');
    return;
  }

  // 查询期间暂停曲绘加载，让网络带宽全部留给成绩查询
  suspendIllustLoading();

  const maxConcurrency = parseInt(concurrencySlider.value, 10);
  const truncateEnabled = truncateToggle.checked;
  const maxRank = truncateEnabled ? (parseInt(maxRankInput.value, 10) || 1200) : Infinity;

  queryRunning = true;
  queryStopped = false;
  abortController = new AbortController();

  queryStartBtn.style.display = 'none';
  queryStopBtn.style.display = 'inline-flex';
  progressBarWrap.classList.add('active');
  startTimer();

  const beforeSnapshot = getAccSnapshot();
  const songsToQuery = SONG_DATA.filter(s => s.chartId);
  const total = songsToQuery.length;
  let foundCount = 0, completed = 0, nextIndex = 0;
  const activeSet = new Set();

  const updateProgress = () => {
    queryProgressText.textContent = `已完成 ${completed}/${total} · 找到 ${foundCount} 个`;
    progressBar.style.width = (completed / total * 100) + '%';
  };
  const updateCurrent = () => {
    if (activeSet.size === 0) queryCurrentChart.textContent = '';
    else {
      const names = Array.from(activeSet);
      queryCurrentChart.innerHTML = `当前查询：<strong>${escapeHtml(names[0])}</strong>` + (names.length > 1 ? ` 等 ${names.length} 个` : '');
    }
  };

  const worker = async () => {
    while (true) {
      if (queryStopped || !queryRunning) return;
      const i = nextIndex++;
      if (i >= total) return;
      const song = songsToQuery[i];
      const idx = SONG_DATA.indexOf(song);
      activeSet.add(song.name);
      updateCurrent();
      try {
        const r = await queryPlayerScore(song.chartId, playerId, maxRank);
        if (r.found) { inputs[idx].value = r.accuracy.toFixed(2); foundCount++; }
      } catch (e) { console.warn('查询失败:', song.name, e); }
      completed++;
      activeSet.delete(song.name);
      updateCurrent();
      updateProgress();
    }
  };

  const workers = [];
  for (let i = 0; i < maxConcurrency; i++) workers.push(worker());
  await Promise.all(workers);

  stopTimer();
  queryRunning = false;
  queryStartBtn.style.display = 'inline-flex';
  queryStopBtn.style.display = 'none';

  // 恢复曲绘加载，统一处理查询期间累积的元素
  resumeIllustLoading();
  if (queryStopped) {
    queryProgressText.textContent = `已停止 · 完成 ${completed}/${total} · 找到 ${foundCount} 个`;
  } else {
    queryProgressText.textContent = `查询完成 · 共找到 ${foundCount} 个成绩`;
    progressBar.style.width = '100%';
    setTimeout(() => { progressBarWrap.classList.remove('active'); progressBar.style.width = '0%'; }, 2000);
  }

  if (getAccSnapshot() !== beforeSnapshot) calculate();
}

function stopQuery() {
  if (!queryRunning) return;
  queryStopped = true;
  if (abortController) abortController.abort();
  queryRunning = false;
}

queryStartBtn.addEventListener('click', startQuery);
queryStopBtn.addEventListener('click', stopQuery);
calcBtn.addEventListener('click', () => calculate(false));
clearBtn.addEventListener('click', clearAll);
exportScoresBtn.addEventListener('click', exportPlayerScores);

// ---- 玩家成绩导出（供群聊机器人使用） ----
function exportPlayerScores() {
  if (!playerId) {
    alert('请先前往「玩家」页面设置 Phira ID');
    return;
  }

  // 只取 B50：按单曲 Rating 降序，取前 TOP_N（50）条；不足则全取
  const validResults = results.filter(r =>
    r.rating !== undefined && !isNaN(r.rating) &&
    r.stacc !== undefined && !isNaN(r.stacc)
  );
  const sorted = [...validResults].sort((a, b) => b.rating - a.rating);
  const b50 = sorted.slice(0, TOP_N);   // TOP_N = 50（来自 rating-core.js）

  if (b50.length === 0) {
    alert('没有可导出的游玩数据。\n请先输入 ACC 并点击「⚡ 计算」，或使用「▶ 开始查询」获取成绩。');
    return;
  }

  const charts = b50.map(r => ({
    name: r.name,
    constant: r.constant,
    stacc: Math.round(r.stacc * 100) / 100,   // 保留 2 位小数
    chartId: (r.chartId !== undefined && r.chartId !== null) ? r.chartId : null
  }));

  const payload = {
    playerId: playerId,
    playerName: playerName || '',
    exportedAt: Date.now(),
    chartCount: charts.length,
    charts: charts
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.download = `phira-scores-${playerId}-${dateStr}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ============================================================
// 15.5 B50 图片导出
// ============================================================
exportB50Btn.addEventListener('click', exportB50Image);

// 把任意比例图片裁剪成 1:1 正方形 DataURL
// 同源图片走 canvas 处理；跨域图片（Phira URL）返回 null，由调用方回退
async function makeSquareThumb(url, size = 324) {
  return new Promise((resolve) => {
    const img = new Image();
    // 关键：允许跨域读取（GitHub Pages 默认返回 Access-Control-Allow-Origin: *）
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const sw = img.naturalWidth;
        const sh = img.naturalHeight;
        if (!sw || !sh) { resolve(null); return; }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // cover 逻辑：等比缩放到能填满正方形，居中裁剪
        const scale = Math.max(size / sw, size / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (e) {
        console.warn('makeSquareThumb 处理失败:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function exportB50Image() {
  if (results.length === 0) {
    alert('没有可导出的成绩数据。\n请先输入 ACC 并点击「⚡ 计算」，或使用「▶ 开始查询」获取成绩。');
    return;
  }

  const sorted = [...results].sort((a, b) => b.rating - a.rating);
  const top50 = sorted.slice(0, TOP_N);

  if (top50.length === 0) {
    alert('没有可导出的成绩数据。');
    return;
  }

  // 统计值
  const ratings = top50.map(r => r.rating);
  const sumRating = ratings.reduce((s, v) => s + v, 0);
  const avgRating = sumRating / ratings.length;
  const maxRating = Math.max(...ratings);
  const minRating = Math.min(...ratings);

  // 头像（仅本地 DataURL）
  const avatarSrc = localAvatarDataURL || '';

  // 防止与自动查询冲突（两者共用同一条进度条）
  if (queryRunning) {
    alert('请先等待当前的自动查询完成，再进行导出。');
    return;
  }

  // 按钮进入状态
  exportB50Btn.disabled = true;
  const origText = exportB50Btn.textContent;
  exportB50Btn.textContent = '⏳ 导出中...';

  // 保存 exportContainer 的原有样式
  const prevWidth = exportContainer.style.width;
  const prevPadding = exportContainer.style.padding;

  // ===== 显示主页面进度条，用于展示导出进度 =====
  const totalItems = top50.length;
  const updateProgress = (done, text) => {
    progressBar.style.width = (done / totalItems * 100) + '%';
    queryProgressText.textContent = text;
  };
  progressBarWrap.classList.add('active');
  queryTimer.classList.remove('active', 'running');   // 隐藏计时器
  queryCurrentChart.textContent = '';
  updateProgress(0, `准备导出 B50 · 0/${totalItems}`);

  try {
    // 预加载所有曲绘的 thumb 版本，构建 items
    const items = [];
    for (let i = 0; i < top50.length; i++) {
      const r = top50[i];
      const song = SONG_DATA[r.index];
      let illustUrl = NO_COVER_URL;
      if (song && song.chartId) {
        const url = await getIllustration(song.chartId, 'thumb');
        if (url) {
          // 关键：把图片裁剪成正方形 DataURL，避免 html2canvas 忽略 object-fit 造成拉伸
          const sq = await makeSquareThumb(url, 324);
          illustUrl = sq || NO_COVER_URL;
        }
      }
      items.push({
        rank: i + 1,
        name: r.name,
        constant: r.constant,
        acc: r.acc,
        stacc: r.stacc,
        rating: r.rating,
        illustUrl,
        constStyle: getConstBadgeStyle(r.constant),
        staccColor: getStaccColor((r.stacc || 0) / 100)
      });

      // 更新进度
      updateProgress(i + 1, `处理曲绘 ${i + 1}/${totalItems}`);
    }

    // 图片处理完毕，进入渲染阶段
    queryProgressText.textContent = `正在合成图片（${totalItems} 首）...`;

    // 构建 HTML
    const html = buildB50ExportHTML({
      playerName: playerName || '未命名玩家',
      playerId: playerId || '',
      avatarSrc,
      avgRating,
      maxRating,
      minRating,
      itemCount: items.length,
      items
    });

    // 设置容器为 1700 宽、无 padding，容纳大画布
    exportContainer.style.width = '1700px';
    exportContainer.style.padding = '0';
    exportContainer.innerHTML = html;

    // 等 DOM 布局完成
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 等所有图片加载完成（最多 10 秒）
    await new Promise((resolve) => {
      const imgs = exportContainer.querySelectorAll('img');
      if (imgs.length === 0) { resolve(); return; }
      let pending = imgs.length;
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      imgs.forEach(img => {
        if (img.complete) {
          pending--;
          if (pending === 0) finish();
        } else {
          img.addEventListener('load', () => { pending--; if (pending === 0) finish(); }, { once: true });
          img.addEventListener('error', () => { pending--; if (pending === 0) finish(); }, { once: true });
        }
      });
      setTimeout(finish, 10000);
    });

    const canvas = await html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1700,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    });

    const safePlayer = (playerName || playerId || 'player').replace(/[/\\?%*:|"<>]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `B50_${safePlayer}_${dateStr}.png`;
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    alert('导出 B50 失败：' + err.message);
  } finally {
    exportB50Btn.disabled = false;
    exportB50Btn.textContent = origText;
    // 恢复容器原始样式
    exportContainer.style.width = prevWidth;
    exportContainer.style.padding = prevPadding;
    // 隐藏进度条
    progressBarWrap.classList.remove('active');
    progressBar.style.width = '0%';
    queryProgressText.textContent = '就绪';
  }
}

// 构建 B50 导出 HTML
function buildB50ExportHTML(d) {
  const avatarHTML = d.avatarSrc
    ? `<img class="b50-avatar" src="${d.avatarSrc}" alt="" />`
    : '';

  const cardsHTML = d.items.map(item => `
    <div class="b50-card">
      <div class="b50-art">
        <img src="${item.illustUrl}" alt="" />
      </div>
      <div class="b50-info">
        <div class="b50-name-row">
          <div class="b50-name">${escapeHtml(item.name)}</div>
          <div class="b50-rank">#${item.rank}</div>
        </div>
        <div class="b50-row">
          <span class="b50-const" style="background:${item.constStyle.bg};color:${item.constStyle.color};">${item.constant}</span>
          <span class="b50-rating">${item.rating.toFixed(2)}</span>
        </div>
        <div class="b50-row">
          <span class="b50-acc">${item.acc.toFixed(2)}%</span>
          <span class="b50-stacc" style="color:${item.staccColor};">${(item.stacc || 0).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <style>
      .b50-wrapper {
        width: 1700px;
        background: #ffffff;
        padding: 40px 40px 36px;
        font-family: 'Microsoft YaHei', '微软雅黑', 'Segoe UI', Roboto, sans-serif;
        color: #1e293b;
        box-sizing: border-box;
      }

      /* ===== 顶部信息区 ===== */
      .b50-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 32px;
        padding: 4px 4px 20px 4px;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 26px;
        position: relative;
      }
      /* 底部分割线上的高亮装饰条 */
      .b50-header::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 96px;
        height: 2px;
        background: linear-gradient(90deg, #2563eb, #8b5cf6);
        border-radius: 2px;
      }
      .b50-player {
        display: flex;
        align-items: center;
        gap: 18px;
        min-width: 0;
      }
      .b50-avatar {
        width: 80px;
        height: 80px;
        border-radius: 14px;
        object-fit: cover;
        border: 3px solid #2563eb;
        box-shadow: 0 4px 14px rgba(37,99,235,0.20);
        flex-shrink: 0;
        background: #f1f5f9;
      }
      .b50-player-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .b50-player-name {
        font-size: 28px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 560px;
        letter-spacing: -0.3px;
      }
      .b50-player-id {
        font-size: 14px;
        color: #64748b;
        font-weight: 500;
      }
      .b50-stats {
        display: flex;
        align-items: stretch;
        gap: 8px;
        flex-shrink: 0;
      }
      .b50-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 20px;
        background: linear-gradient(135deg, #f8fafc, #eff6ff);
        border: 1px solid #e0e7ff;
        border-radius: 12px;
        min-width: 100px;
      }
      .b50-stat-value {
        font-size: 26px;
        font-weight: 800;
        color: #2563eb;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.5px;
      }
      .b50-stat-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      /* ===== 卡片网格 ===== */
      .b50-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px 16px;
      }
      .b50-card {
        position: relative;
        display: flex;
        height: 108px;
        background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
        border: 2px solid #3b82f6;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(59,130,246,0.14);
        box-sizing: border-box;
      }

      /* 曲绘：固定 1:1 方形，裁剪填充 */
      .b50-art {
        flex: 0 0 108px;
        width: 108px;
        height: 108px;
        overflow: hidden;
        background: #f1f5f9;
        position: relative;
      }
      .b50-art img {
        width: 100%;
        height: 100%;
        display: block;
      }

      /* 信息区 */
      .b50-info {
        flex: 1;
        min-width: 0;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 4px;
      }
      .b50-name-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        min-width: 0;
      }
      .b50-name {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .b50-rank {
        flex-shrink: 0;
        background: #0f172a;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 5px;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
      }
      .b50-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .b50-const {
        font-size: 14px;
        font-weight: 800;
        padding: 0 9px;
        border-radius: 5px;
        line-height: 20px;
        display: inline-block;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .b50-rating {
        font-size: 17px;
        font-weight: 800;
        color: #2563eb;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
        letter-spacing: -0.3px;
      }
      .b50-acc {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .b50-stacc {
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
    </style>
    <div class="b50-wrapper">
      <div class="b50-header">
        <div class="b50-player">
          ${avatarHTML}
          <div class="b50-player-info">
            <div class="b50-player-name">${escapeHtml(d.playerName)}</div>
            <div class="b50-player-id">Phira ID: ${escapeHtml(d.playerId || '—')}</div>
          </div>
        </div>
        <div class="b50-stats">
          <div class="b50-stat">
            <div class="b50-stat-value">${d.avgRating.toFixed(2)}</div>
            <div class="b50-stat-label">平均 Rating</div>
          </div>
          <div class="b50-stat">
            <div class="b50-stat-value" style="color:#10b981;">${d.maxRating.toFixed(2)}</div>
            <div class="b50-stat-label">最高</div>
          </div>
          <div class="b50-stat">
            <div class="b50-stat-value" style="color:#f59e0b;">${d.minRating.toFixed(2)}</div>
            <div class="b50-stat-label">最低</div>
          </div>
          <div class="b50-stat">
            <div class="b50-stat-value" style="color:#8b5cf6;">${d.itemCount}</div>
            <div class="b50-stat-label">有效谱面</div>
          </div>
        </div>
      </div>

      <div class="b50-grid">
        ${cardsHTML}
      </div>
    </div>
  `;
}

concurrencySlider.addEventListener('input', function() {
  concurrencyValue.textContent = this.value;
  localStorage.setItem(KEY.concurrency, this.value);
});
truncateToggle.addEventListener('change', function() {
  localStorage.setItem(KEY.truncate, String(this.checked));
  maxRankInput.disabled = !this.checked;
  maxRankInput.style.opacity = this.checked ? '1' : '0.5';
});
maxRankInput.addEventListener('change', function() {
  let v = parseInt(this.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  this.value = v;
  localStorage.setItem(KEY.maxRank, String(v));
});

// ============================================================
// 16. 谱面预览（含搜索 + 点击详情）
// ============================================================
function previewMatches(song, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (song.name.toLowerCase().includes(q)) return true;
  const cid = song.chartId;
  if (cid !== null && cid !== undefined) {
    if (String(cid).includes(q)) return true;
  }
  return false;
}

function renderPreview() {
  if (results.length === 0 && inputs.every(i => !i.value.trim())) {
    previewList.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">请先在主页面输入 ACC 或使用自动查询获取成绩</div>';
    previewCount.textContent = '—';
    return;
  }

  const q = previewSearchQuery;
  let html = '';
  let totalShown = 0;

  if (previewSortMode === 'constant') {
    // ===== 按难度排序：全部谱面，不分割 =====
    const playedMap = new Map(results.map(r => [r.id, r]));
    let allItems = SONG_DATA.map(song => {
      const r = playedMap.get(song.internalId);
      return r ? { type: 'result', data: r } : { type: 'untouched', data: song };
    });

    if (q) allItems = allItems.filter(item => previewMatches(item.data, q));

    allItems.sort((a, b) => {
      const diff = b.data.constant - a.data.constant;
      if (Math.abs(diff) > 0.001) return diff;
      // 定数相同：已游玩的优先
      if (a.type !== b.type) return a.type === 'result' ? -1 : 1;
      return String(a.data.name).localeCompare(String(b.data.name));
    });

    totalShown = allItems.length;

    if (totalShown === 0) {
      previewList.innerHTML = `<div class="preview-empty">未找到匹配「${escapeHtml(q)}」的谱面</div>`;
      previewCount.textContent = '—';
      return;
    }

    allItems.forEach(item => {
      html += renderPreviewItem(item.data, null, item.type);
    });

    previewCount.textContent = q
      ? `搜索结果 ${totalShown} 首（按难度）`
      : `共 ${totalShown} 首（按难度）`;
  } else {
    // ===== 按单曲 Rating 排序：B50 + 剩余 =====
    const sorted = [...results].sort((a, b) => b.rating - a.rating);
    let b50 = sorted.slice(0, 50);
    let rest = sorted.slice(50);
    const playedIds = new Set(results.map(r => r.id));
    let untouched = SONG_DATA.filter(s => !playedIds.has(s.internalId)).sort((a, b) => b.constant - a.constant);

    if (q) {
      b50 = b50.filter(r => previewMatches(r, q));
      rest = rest.filter(r => previewMatches(r, q));
      untouched = untouched.filter(s => previewMatches(s, q));
    }

    const restList = [
      ...rest.map(r => ({ type: 'result', data: r })),
      ...untouched.map(s => ({ type: 'untouched', data: s }))
    ].sort((a, b) => b.data.constant - a.data.constant);

    totalShown = b50.length + restList.length;

    if (totalShown === 0) {
      previewList.innerHTML = `<div class="preview-empty">未找到匹配「${escapeHtml(q)}」的谱面</div>`;
      previewCount.textContent = '—';
      return;
    }

    b50.forEach((r, i) => { html += renderPreviewItem(r, i + 1, 'result'); });
    if (restList.length > 0) {
      html += `<div class="preview-divider"><span>以下为剩余谱面（按定数降序）</span></div>`;
      restList.forEach(item => {
        html += renderPreviewItem(item.data, null, item.type);
      });
    }

    previewCount.textContent = q
      ? `搜索结果 ${totalShown} 首`
      : `共 ${totalShown} 首（B50: ${b50.length}）`;
  }

  previewList.innerHTML = html;
  previewList.querySelectorAll('.art-box').forEach(el => illustObserver.observe(el));

  previewList.querySelectorAll('.preview-item').forEach(item => {
    item.addEventListener('click', function() {
      const idx = parseInt(this.dataset.index, 10);
      if (!isNaN(idx)) openDetail(idx);
    });
  });
}

function renderPreviewItem(data, rank, type) {
  const chartId = data.chartId || '';
  const name = data.name || '';
  const constant = data.constant;
  const rankPrefix = rank ? '#' + rank + ' ' : '';
  const songIndex = SONG_DATA.findIndex(s => s.internalId === (data.internalId || (name + '|' + constant + '|' + (chartId || ''))));
  const constColor = getConstColor(constant);

  if (type === 'untouched') {
    return `
      <div class="preview-item" data-index="${songIndex}" style="--const-color:${constColor};">
        ${artBoxHtml(chartId)}
        <div class="preview-info">
          <div class="preview-name" title="${escapeHtml(name)}">${rankPrefix}${escapeHtml(name)}</div>
          <div class="preview-meta">定数 ${constant} · Chart ID ${chartId || '—'}</div>
        </div>
        <div class="preview-right"><div class="preview-untouched">未游玩</div></div>
      </div>`;
  }

  const stacc = (data.stacc !== undefined && !isNaN(data.stacc)) ? data.stacc : null;
  const staccColor = stacc !== null ? getStaccColor(stacc / 100) : '#94a3b8';
  const staccDisplay = stacc !== null ? stacc.toFixed(2) + '%' : '—';
  const ratingDisplay = data.rating !== undefined ? data.rating.toFixed(2) : '—';
  const accDisplay = (data.acc !== undefined && !isNaN(data.acc)) ? data.acc.toFixed(2) + '%' : '—';

  return `
    <div class="preview-item" data-index="${songIndex}" style="--const-color:${constColor};">
      ${artBoxHtml(chartId)}
      <div class="preview-info">
        <div class="preview-name" title="${escapeHtml(name)}">${rankPrefix}${escapeHtml(name)}</div>
        <div class="preview-meta">定数 ${constant} · Chart ID ${chartId || '—'}</div>
      </div>
      <div class="preview-right">
        <div class="preview-stacc" style="color:${staccColor};">${staccDisplay}</div>
        <div class="preview-rating">${ratingDisplay}</div>
        <div class="preview-acc">ACC ${accDisplay}</div>
      </div>
    </div>`;
}

previewSortSelect.addEventListener('change', function() {
  previewSortMode = this.value === 'constant' ? 'constant' : 'rating';
  renderPreview();
});

previewSearchInput.addEventListener('input', function() {
  previewSearchQuery = this.value;
  previewSearchClear.classList.toggle('visible', this.value.length > 0);
  if (document.querySelector('.page[data-page="preview"]').classList.contains('active')) {
    renderPreview();
  }
});
previewSearchClear.addEventListener('click', function() {
  previewSearchInput.value = '';
  previewSearchQuery = '';
  previewSearchClear.classList.remove('visible');
  renderPreview();
  previewSearchInput.focus();
});
previewSearchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    this.value = '';
    previewSearchQuery = '';
    previewSearchClear.classList.remove('visible');
    renderPreview();
  }
});

// ============================================================
// 17. 谱面详情页
// ============================================================
function openDetail(songIndex) {
  if (songIndex < 0 || songIndex >= SONG_DATA.length) return;
  const song = SONG_DATA[songIndex];

  // 记录预览页滚动位置
  previewScrollBeforeDetail = window.scrollY || window.pageYOffset || 0;

  detailCurrentSong = song;

  // 切换页面
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === 'detail'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', false));
  window.scrollTo({ top: 0, behavior: 'auto' });

  // 渲染基础信息
  detailName.textContent = song.name;

  const cStyle = getConstBadgeStyle(song.constant);
  detailConstBadge.textContent = song.constant;
  detailConstBadge.style.background = cStyle.bg;
  detailConstBadge.style.color = cStyle.color;

  detailChartId.textContent = song.chartId !== null ? String(song.chartId) : '—';
  detailCopyBtn.style.display = song.chartId !== null ? 'inline-flex' : 'none';
  // 重置复制按钮状态
  detailCopyIcon.textContent = '📋';
  detailCopyText.textContent = '复制';
  detailCopyBtn.classList.remove('copied');

  // 谱师 / 曲师占位
  detailCharter.textContent = '加载中...';
  detailComposer.textContent = '加载中...';

  // 黄键占比 + 三个基准 ACC
  const D = song.yellowRatio || 0;
  const DPercent = D * 100;
  detailYellow.textContent = DPercent.toFixed(2) + '%';

  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);

  const passAccPct = passAcc !== null ? passAcc * 100 : 0;
  const backlightAccPct = backlightAcc !== null ? backlightAcc * 100 : 0;
  const breakAccPct = breakAcc !== null ? breakAcc * 100 : 0;

  detailPass.textContent = passAccPct.toFixed(2) + '%';
  detailBacklight.textContent = backlightAccPct.toFixed(2) + '%';
  detailBreak.textContent = breakAccPct.toFixed(2) + '%';

  // 曲绘：无 chartId 直接用占位图；有 chartId 先显示 loading 图，加载完成再切换
  detailArtImg.style.display = 'none';
  detailArtPh.style.display = 'none';

  if (!song.chartId) {
    detailLoadingImg.style.display = 'none';
    detailArtImg.src = NO_COVER_URL;
    detailArtImg.style.display = 'block';
  } else {
    // 先显示 loading 图
    detailLoadingImg.src = LOADING_COVER_URL;
    detailLoadingImg.style.display = 'block';

    getIllustration(song.chartId, 'full').then(url => {
      if (detailCurrentSong !== song) return;
      if (!url) {
        // 无图：直接换成占位图
        detailLoadingImg.style.display = 'none';
        detailArtImg.src = NO_COVER_URL;
        detailArtImg.style.display = 'block';
        return;
      }
      // 用 Image 对象预检查，等真正加载完再切换，避免闪白
      const tempImg = new Image();
      tempImg.onload = () => {
        if (detailCurrentSong !== song) return;
        detailArtImg.src = url;
        detailArtImg.style.display = 'block';
        detailLoadingImg.style.display = 'none';
      };
      tempImg.onerror = () => {
        if (detailCurrentSong !== song) return;
        detailArtImg.src = NO_COVER_URL;
        detailArtImg.style.display = 'block';
        detailLoadingImg.style.display = 'none';
      };
      tempImg.src = url;
    });
  }

  // 异步获取谱师 / 曲师
  if (song.chartId) {
    getChartMeta(song.chartId).then(meta => {
      if (detailCurrentSong !== song) return;
      detailCharter.textContent = (meta && meta.charter) ? meta.charter : '—';
      detailComposer.textContent = (meta && meta.composer) ? meta.composer : '—';
    });
  } else {
    detailCharter.textContent = '—';
    detailComposer.textContent = '—';
  }

  // 渲染 ACC 进度条
  renderAccMeter(song, passAccPct, backlightAccPct, breakAccPct);
}

function renderAccMeter(song, passAcc, backlightAcc, breakAcc) {
  accMeterTrack.innerHTML = '';

  // 坐标映射函数
  // 0%  → 96.00%
  // 25% → passAcc
  // 100% → 100.00%
  // 返回：给定 ACC 值 → 百分比位置 [0, 100]
  const accToPos = (acc) => {
    if (acc <= 96) return 0;
    if (acc <= passAcc) {
      // 96 到 passAcc 映射到 0 到 25
      if (passAcc <= 96) return 25; // 保护：passAcc <= 96 时，直接返回 25
      return ((acc - 96) / (passAcc - 96)) * 25;
    }
    // passAcc 到 100 映射到 25 到 100
    if (passAcc >= 100) return 25;
    return 25 + ((acc - passAcc) / (100 - passAcc)) * 75;
  };

  // 4 个基准刻度
  const markers = [
    { pos: accToPos(passAcc), value: passAcc.toFixed(2) + '%', label: '过段', cls: 'marker-pass', labelCls: 'label-pass' },
    { pos: accToPos(backlightAcc), value: backlightAcc.toFixed(2) + '%', label: '后光', cls: 'marker-backlight', labelCls: 'label-backlight' },
    { pos: accToPos(breakAcc), value: breakAcc.toFixed(2) + '%', label: '击破', cls: 'marker-break', labelCls: 'label-break' },
    { pos: 100, value: '100.00%', label: '上限', cls: 'marker-max', labelCls: 'label-max' }
  ];

  markers.forEach(m => {
    const pos = Math.max(0, Math.min(100, m.pos));
    const marker = document.createElement('div');
    marker.className = 'acc-marker ' + m.cls;
    marker.style.left = pos + '%';
    accMeterTrack.appendChild(marker);

    const label = document.createElement('div');
    label.className = 'acc-marker-label ' + m.labelCls;
    label.style.left = pos + '%';
    label.innerHTML = `${m.value}<span class="label-tag">${m.label}</span>`;
    accMeterTrack.appendChild(label);
  });

  // 玩家 ACC 箭头
  const songIndex = SONG_DATA.indexOf(song);
  if (songIndex < 0) return;
  const playerAccStr = inputs[songIndex] ? inputs[songIndex].value.trim() : '';
  const playerAcc = parseFloat(playerAccStr);

  if (playerAccStr === '' || isNaN(playerAcc) || playerAcc < 0 || playerAcc > 100) {
    // 未游玩
    const untouched = document.createElement('div');
    untouched.className = 'acc-player-untouched';
    untouched.textContent = '未游玩';
    accMeterTrack.appendChild(untouched);
    return;
  }

  // 计算 STACC 决定颜色
  const D = song.yellowRatio || 0;
  const stacc = calcSTACC(playerAcc / 100, D);
  const arrowColor = stacc !== null ? getStaccColor(stacc) : '#94a3b8';

  const pos = Math.max(2, Math.min(98, accToPos(playerAcc)));

  const arrow = document.createElement('div');
  arrow.className = 'acc-player-arrow';
  arrow.style.left = pos + '%';
  arrow.innerHTML = `
    <div class="arrow-icon" style="border-bottom-color:${arrowColor};"></div>
    <div class="arrow-value" style="color:${arrowColor};">${playerAcc.toFixed(2)}%</div>
    <div class="arrow-label">你的 ACC</div>
  `;
  accMeterTrack.appendChild(arrow);
}

// ============================================================
// 17.1 单曲成绩导出（详情页）
// ============================================================
detailExportBtn.addEventListener('click', detailExportImage);

async function detailExportImage() {
  if (!detailCurrentSong) { alert('请先打开一个谱面详情'); return; }
  const song = detailCurrentSong;
  const songIndex = SONG_DATA.indexOf(song);
  if (songIndex < 0) return;

  // 玩家 ACC
  const accStr = inputs[songIndex] ? inputs[songIndex].value.trim() : '';
  const acc = parseFloat(accStr);
  if (accStr === '' || isNaN(acc) || acc < 0 || acc > 100) {
    alert('该谱面未填写 ACC，无法导出成绩图');
    return;
  }

  // 基础计算
  const D = song.yellowRatio || 0;
  const stacc = calcSTACC(acc / 100, D);
  const staccPct = stacc !== null ? stacc * 100 : 0;
  const rating = calcSingleRating(song.constant, stacc || 0);

  // 三个基准 ACC
  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);
  const passPct = passAcc !== null ? passAcc * 100 : 0;
  const backlightPct = backlightAcc !== null ? backlightAcc * 100 : 0;
  const breakPct = breakAcc !== null ? breakAcc * 100 : 0;

  // B50 排名
  const sorted = [...results].sort((a, b) => b.rating - a.rating);
  const b50 = sorted.slice(0, TOP_N);
  const idxInB50 = b50.findIndex(r => r.index === songIndex);
  const rankText = idxInB50 >= 0 ? ('#' + (idxInB50 + 1)) : '未进入 B50';

  // 曲绘 URL（本地原图）
  const illustUrl = await getIllustration(song.chartId, 'full');
  if (!illustUrl) {
    alert('该谱面无曲绘，无法导出');
    return;
  }

  // 预加载曲绘，获取真实尺寸，用于让容器跟随图片比例
  const imgSize = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = illustUrl;
  });

  // 根据图片比例计算展示尺寸（最长边不超过上限）
  const MAX_ART_W = 460;
  const MAX_ART_H = 320;
  let artW = 440, artH = 248;
  if (imgSize && imgSize.w > 0 && imgSize.h > 0) {
    const scale = Math.min(MAX_ART_W / imgSize.w, MAX_ART_H / imgSize.h);
    artW = Math.round(imgSize.w * scale);
    artH = Math.round(imgSize.h * scale);
  }

  // 头像（仅使用本地上传的 DataURL）
  const avatarSrc = localAvatarDataURL || '';
  const pName = playerName || '未命名玩家';

  // STACC 颜色
  const staccColor = getStaccColor(stacc);

  // 难度样式
  const cStyle = getConstBadgeStyle(song.constant);

  // 按钮进入状态
  detailExportBtn.disabled = true;
  const originalText = detailExportBtn.textContent;
  detailExportBtn.textContent = '⏳ 导出中...';

  try {
    const html = buildSoloExportHTML({
      song,
      illustUrl,
      artW,
      artH,
      avatarSrc,
      playerName: pName,
      acc,
      staccPct,
      staccColor,
      rating,
      rankText,
      cStyle,
      passPct,
      backlightPct,
      breakPct
    });
    exportContainer.innerHTML = html;

    // 等图片 DOM 就绪
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 额外等图片元素真正 onload
    await new Promise((resolve) => {
      const imgs = exportContainer.querySelectorAll('img');
      if (imgs.length === 0) { resolve(); return; }
      let pending = imgs.length;
      imgs.forEach(img => {
        if (img.complete) {
          pending--;
          if (pending === 0) resolve();
        } else {
          img.addEventListener('load', () => { pending--; if (pending === 0) resolve(); });
          img.addEventListener('error', () => { pending--; if (pending === 0) resolve(); });
        }
      });
    });

    const canvas = await html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1080,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    });
    const safeName = song.name.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${safeName}_${acc.toFixed(2)}.png`;
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    alert('导出失败：' + err.message);
  } finally {
    detailExportBtn.disabled = false;
    detailExportBtn.textContent = originalText;
  }
}

// 构建单曲导出 HTML
function buildSoloExportHTML(d) {
  // 进度条：复用 accToPos 映射
  const accToPos = (accVal) => {
    if (accVal <= 96) return 0;
    if (accVal <= d.passPct) {
      if (d.passPct <= 96) return 25;
      return ((accVal - 96) / (d.passPct - 96)) * 25;
    }
    if (d.passPct >= 100) return 25;
    return 25 + ((accVal - d.passPct) / (100 - d.passPct)) * 75;
  };

  const markers = [
    { pos: accToPos(d.passPct),      value: d.passPct.toFixed(2) + '%',      label: '过段', cls: 'marker-pass',      labelCls: 'label-pass' },
    { pos: accToPos(d.backlightPct), value: d.backlightPct.toFixed(2) + '%', label: '后光', cls: 'marker-backlight', labelCls: 'label-backlight' },
    { pos: accToPos(d.breakPct),     value: d.breakPct.toFixed(2) + '%',     label: '击破', cls: 'marker-break',     labelCls: 'label-break' },
    { pos: 100,                      value: '100.00%',                       label: '上限', cls: 'marker-max',       labelCls: 'label-max' }
  ];

  let markersHTML = '';
  markers.forEach(m => {
    const pos = Math.max(0, Math.min(100, m.pos));
    markersHTML += `<div class="acc-marker ${m.cls}" style="left:${pos}%;"></div>`;
    markersHTML += `<div class="acc-marker-label ${m.labelCls}" style="left:${pos}%;">${m.value}<span class="label-tag">${m.label}</span></div>`;
  });

  // 玩家箭头（不含 "你的 ACC" 标签）
  const playerPos = Math.max(2, Math.min(98, accToPos(d.acc)));
  const playerArrowHTML = `
    <div class="acc-player-arrow" style="left:${playerPos}%;">
      <div class="arrow-icon" style="border-bottom-color:${d.staccColor};"></div>
      <div class="arrow-value" style="color:${d.staccColor};">${d.acc.toFixed(2)}%</div>
    </div>`;

  // 头像（可选）
  const avatarHTML = d.avatarSrc
    ? `<img class="solo-avatar" src="${d.avatarSrc}" alt="" />`
    : '';

  return `
    <style>
      .solo-wrapper {
        width: 1080px;
        background: #fff;
        padding: 36px 112px 24px 56px;
        font-family: 'Microsoft YaHei', '微软雅黑', 'Segoe UI', Roboto, sans-serif;
        color: #1e293b;
        box-sizing: border-box;
      }
      .solo-title {
        font-size: 26px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.35;
        word-break: break-word;
        margin-bottom: 18px;
      }
      .solo-divider {
        height: 0;
        border-top: 2px solid #e2e8f0;
        margin: 20px 0;
      }
      .solo-body {
        display: flex;
        gap: 28px;
        align-items: stretch;
      }
      .solo-art-wrap {
        flex-shrink: 0;
        border-radius: 12px;
        overflow: hidden;
        background: #f1f5f9;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      }
      .solo-art-wrap img {
        width: 100%;
        height: 100%;
        display: block;
      }
      .solo-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
      }
      .solo-player {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
      }
      .solo-avatar {
        width: 56px;
        height: 56px;
        border-radius: 10px;
        object-fit: cover;
        border: 2px solid #2563eb;
        flex-shrink: 0;
      }
      .solo-player-name {
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
        word-break: break-word;
      }
      .solo-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        padding: 4px 0;
        border-bottom: 1px dashed #eef2f6;
      }
      .solo-row:last-child { border-bottom: none; }
      .solo-row .solo-label {
        font-size: 13px;
        color: #64748b;
        flex-shrink: 0;
      }
      .solo-row .solo-value {
        font-size: 15px;
        font-weight: 700;
        color: #1e293b;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .solo-row .solo-value.rating {
        font-size: 22px;
        color: #2563eb;
      }
      .solo-row .solo-value.rank {
        color: #8b5cf6;
      }
      .solo-row .solo-value.const {
        display: inline-block;
        padding: 1px 10px;
        border-radius: 6px;
        font-size: 15px;
      }
      /* ACC 进度条 */
      .solo-meter-wrap {
        position: relative;
        padding: 56px 0 36px;
      }
      .solo-meter-track {
        position: relative;
        height: 18px;
        border-radius: 10px;
        background: linear-gradient(90deg,
          #ef4444 0%,
          #f59e0b 20%,
          #facc15 35%,
          #3b82f6 55%,
          #8b5cf6 75%,
          #10b981 100%);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.08);
      }
      .solo-meter-track .acc-marker {
        position: absolute;
        top: -6px;
        bottom: -6px;
        width: 4px;
        border-radius: 2px;
        transform: translateX(-50%);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
        z-index: 2;
      }
      .solo-meter-track .acc-marker.marker-pass      { background: #3b82f6; }
      .solo-meter-track .acc-marker.marker-backlight { background: #8b5cf6; }
      .solo-meter-track .acc-marker.marker-break     { background: #10b981; }
      .solo-meter-track .acc-marker.marker-max       { background: #1e293b; }
      .solo-meter-track .acc-marker-label {
        position: absolute;
        bottom: calc(100% + 10px);
        transform: translateX(-50%);
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        z-index: 3;
      }
      .solo-meter-track .acc-marker-label .label-tag {
        display: block;
        font-size: 10px;
        font-weight: 500;
        color: #94a3b8;
        text-align: center;
        margin-top: 1px;
      }
      .solo-meter-track .acc-marker-label.label-pass      { color: #3b82f6; }
      .solo-meter-track .acc-marker-label.label-backlight { color: #8b5cf6; }
      .solo-meter-track .acc-marker-label.label-break     { color: #10b981; }
      .solo-meter-track .acc-marker-label.label-max       { color: #1e293b; }
      .solo-meter-track .acc-player-arrow {
        position: absolute;
        top: calc(100% + 4px);
        transform: translateX(-50%);
        z-index: 4;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .solo-meter-track .acc-player-arrow .arrow-icon {
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-bottom: 10px solid #94a3b8;
      }
      .solo-meter-track .acc-player-arrow .arrow-value {
        font-size: 13px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        margin-top: 3px;
        padding: 1px 6px;
        background: rgba(255,255,255,0.9);
        border-radius: 4px;
        white-space: nowrap;
      }
    </style>
    <div class="solo-wrapper">
      <div class="solo-title">${escapeHtml(d.song.name)}</div>
      <div class="solo-divider"></div>

      <div class="solo-body">
        <div class="solo-art-wrap" style="width:${d.artW}px;height:${d.artH}px;">
          <img src="${d.illustUrl}" alt="" />
        </div>
        <div class="solo-info">
          <div class="solo-player">
            ${avatarHTML}
            <span class="solo-player-name">${escapeHtml(d.playerName)}</span>
          </div>
          <div class="solo-row">
            <span class="solo-label">难度</span>
            <span class="solo-value const" style="background:${d.cStyle.bg};color:${d.cStyle.color};">${d.song.constant}</span>
          </div>
          <div class="solo-row">
            <span class="solo-label">原始 ACC</span>
            <span class="solo-value">${d.acc.toFixed(2)}%</span>
          </div>
          <div class="solo-row">
            <span class="solo-label">STACC</span>
            <span class="solo-value" style="color:${d.staccColor};">${d.staccPct.toFixed(2)}%</span>
          </div>
          <div class="solo-row">
            <span class="solo-label">单曲 Rating</span>
            <span class="solo-value rating">${d.rating.toFixed(2)}</span>
          </div>
          <div class="solo-row">
            <span class="solo-label">B50 排名</span>
            <span class="solo-value rank">${escapeHtml(d.rankText)}</span>
          </div>
        </div>
      </div>

      <div class="solo-divider"></div>

      <div class="solo-meter-wrap">
        <div class="solo-meter-track">
          ${markersHTML}
          ${playerArrowHTML}
        </div>
      </div>
    </div>
  `;
}

// 返回按钮
detailBackBtn.addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === 'preview'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === 'preview'));
  detailCurrentSong = null;
  // 恢复滚动位置
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: previewScrollBeforeDetail, behavior: 'auto' });
    });
  });
});

// 复制按钮
detailCopyBtn.addEventListener('click', async () => {
  if (!detailCurrentSong || detailCurrentSong.chartId === null) return;
  const text = '#' + detailCurrentSong.chartId;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 兼容性 fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    detailCopyIcon.textContent = '✅';
    detailCopyText.textContent = '已复制';
    detailCopyBtn.classList.add('copied');
    setTimeout(() => {
      detailCopyIcon.textContent = '📋';
      detailCopyText.textContent = '复制';
      detailCopyBtn.classList.remove('copied');
    }, 1500);
  } catch (e) {
    console.warn('复制失败:', e);
    alert('复制失败，请手动复制：' + text);
  }
});

// Esc 返回
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('.page[data-page="detail"]').classList.contains('active')) {
    detailBackBtn.click();
  }
});

// ============================================================
// 18. 单曲计算
// ============================================================
calcDBtn.addEventListener('click', () => {
  const drag = parseFloat(dragCount.value);
  const total = parseFloat(totalNotes.value);
  if (isNaN(drag) || isNaN(total) || total <= 0) { resultD.textContent = '—'; return; }
  const D = drag / total;
  resultD.textContent = toSigFigs(D * 100, 4) + '%';
  updateBenchmarks(D);
});
function updateBenchmarks(D) {
  if (isNaN(D) || D < 0) {
    benchPass.textContent = '—'; benchBacklight.textContent = '—'; benchBreak.textContent = '—';
    return;
  }
  const stds = [0.97, 0.985, 0.995];
  const labels = [benchPass, benchBacklight, benchBreak];
  const colors = ['#3b82f6', '#8b5cf6', '#10b981'];
  stds.forEach((s, i) => {
    const acc = calcACCFromSTACC(s, D);
    if (acc !== null && !isNaN(acc)) {
      labels[i].textContent = toSigFigs(acc * 100, 4) + '%';
      labels[i].style.color = colors[i];
    } else labels[i].textContent = '—';
  });
}
sendDToModule2.addEventListener('click', () => {
  const t = resultD.textContent;
  if (t === '—') { alert('请先计算黄键占比 D！'); return; }
  const v = parseFloat(t);
  if (isNaN(v)) { alert('请先计算黄键占比 D！'); return; }
  module2D.value = toSigFigs(v, 4);
  triggerModule2();
});
module2ACC.addEventListener('input', triggerModule2);
module2STACC.addEventListener('input', triggerModule2);
module2D.addEventListener('input', triggerModule2);
function triggerModule2() {
  const DPercent = parseFloat(module2D.value);
  const D = DPercent / 100;
  if (isNaN(D) || D < 0) { resultSTACC.textContent = '—'; resultACC.textContent = '—'; return; }
  const accVal = parseFloat(module2ACC.value);
  if (!isNaN(accVal) && accVal >= 0 && accVal <= 100) {
    const stacc = calcSTACC(accVal / 100, D);
    if (stacc !== null && !isNaN(stacc)) {
      resultSTACC.textContent = toSigFigs(stacc * 100, 4) + '%';
      resultSTACC.style.color = getStaccColor(stacc);
    } else resultSTACC.textContent = '—';
  } else {
    const staccVal = parseFloat(module2STACC.value);
    if (!isNaN(staccVal) && staccVal >= 0 && staccVal <= 100) {
      const acc = calcACCFromSTACC(staccVal / 100, D);
      if (acc !== null && !isNaN(acc)) {
        resultACC.textContent = toSigFigs(acc * 100, 4) + '%';
        resultACC.style.color = '#2563eb';
      } else resultACC.textContent = '—';
    } else if (!module2ACC.value.trim() && !module2STACC.value.trim()) {
      resultSTACC.textContent = '—'; resultACC.textContent = '—';
    }
  }
}
sendToModule3.addEventListener('click', () => {
  const t = resultSTACC.textContent;
  if (t && t !== '—') {
    const v = parseFloat(t);
    if (!isNaN(v)) module3STACC.value = toSigFigs(v, 4);
  } else {
    const v = parseFloat(module2STACC.value);
    if (!isNaN(v) && v > 0 && v <= 100) module3STACC.value = toSigFigs(v, 4);
    else { alert('请先在模块二中输入或计算 STACC！'); return; }
  }
  calcRatingFn();
});
function calcRatingFn() {
  const constant = parseFloat(module3Constant.value);
  const staccPercent = parseFloat(module3STACC.value);
  if (isNaN(constant) || constant < 0) { resultRating.textContent = '—'; return; }
  if (isNaN(staccPercent) || staccPercent < 0 || staccPercent > 100) { resultRating.textContent = '—'; return; }
  const rating = calcSingleRating(constant, staccPercent / 100);
  resultRating.textContent = (!isNaN(rating) && isFinite(rating)) ? rating.toFixed(4) : '—';
}
calcRatingBtn.addEventListener('click', calcRatingFn);
module3STACC.addEventListener('input', () => { if (module3Constant.value.trim()) calcRatingFn(); });
module3Constant.addEventListener('input', () => { if (module3STACC.value.trim()) calcRatingFn(); });

// ============================================================
// 19. 段位计算
// ============================================================
function segGetNotes() { return segNInputs.map(inp => parseInt(inp.value, 10)); }
function segValidateNotes() {
  const notes = segGetNotes();
  for (let i = 0; i < notes.length; i++) {
    if (isNaN(notes[i]) || notes[i] <= 0 || !Number.isInteger(notes[i])) return { valid: false, index: i };
  }
  return { valid: true };
}
function segGetAccs(arr) { return arr.map(inp => parseFloat(inp.value)); }
function segValidateAccs(accs) {
  for (let i = 0; i < accs.length; i++) {
    if (isNaN(accs[i]) || accs[i] < 0 || accs[i] > 100) return false;
  }
  return true;
}
function segSetNotesDisabled(disabled) { segNInputs.forEach(inp => inp.disabled = disabled); }
function segSetNotesValues(notes) {
  segNInputs.forEach((inp, i) => {
    const v = notes[i];
    inp.value = (v === null || v === undefined) ? '' : v;
  });
}

function segShowInfo(preset) {
  if (!preset) { segInfoRow.classList.add('hidden'); return; }
  const D = preset.yellowRatio || 0;
  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);
  segStdPass.textContent = passAcc !== null ? (passAcc * 100).toFixed(2) + '%' : '—';
  segStdBacklight.textContent = backlightAcc !== null ? (backlightAcc * 100).toFixed(2) + '%' : '—';
  segStdBreak.textContent = breakAcc !== null ? (breakAcc * 100).toFixed(2) + '%' : '—';
  segAuthorName.textContent = preset.charter || '未知';
  segInfoRow.classList.remove('hidden');
}
function segHideInfo() { segInfoRow.classList.add('hidden'); }

function segRenderDropdown() {
  // 统计同名段位，用于下拉菜单中区分
  const nameCount = {};
  SEG_PRESETS.forEach(p => { nameCount[p.name] = (nameCount[p.name] || 0) + 1; });

  let html = '';
  SEG_PRESETS.forEach((p, idx) => {
    // 是否有缺失物量（null / undefined）
    const hasMissing = !p.notes || p.notes.some(n => n === null || n === undefined);
    const missingTag = hasMissing ? ' ⚠️' : '';
    // 同名段位附加谱师信息以区分
    const displayName = nameCount[p.name] > 1
      ? `${p.name} · ${p.charter || '未知'}`
      : p.name;
    html += `<div class="item" data-index="${idx}">${escapeHtml(displayName)}${missingTag}</div>`;
  });
  segPresetDropdown.innerHTML = html;
  segPresetDropdown.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', function(e) {
      const idx = parseInt(this.dataset.index, 10);
      if (!isNaN(idx) && SEG_PRESETS[idx]) segSelectPreset(SEG_PRESETS[idx]);
      segCloseDropdown();
    });
  });
}
function segSelectPreset(preset) {
  if (segIsCustom) {
    segCustomToggle.checked = false;
    segIsCustom = false;
    segPresetLabel.textContent = '选择段位';
    segSetNotesDisabled(false);
    segHideInfo();
  }
  segSelectedPreset = preset;
  segPresetLabel.textContent = preset.name;
  if (preset.notes) {
    segSetNotesValues(preset.notes);
    // 物量完整才禁用；缺失时允许用户手动补全
    const allComplete = preset.notes.every(n => n !== null && n !== undefined && Number.isInteger(n) && n > 0);
    segSetNotesDisabled(allComplete);
  }
  segShowInfo(preset);
  segUpdateCharts();
}
function segToggleDropdown() {
  if (segIsCustom) return;
  const isOpen = segPresetDropdown.classList.toggle('open');
  segPresetBtn.classList.toggle('open', isOpen);
}
function segCloseDropdown() {
  segPresetDropdown.classList.remove('open');
  segPresetBtn.classList.remove('open');
}

segPresetBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  segToggleDropdown();
});
document.addEventListener('click', function(e) {
  const selector = segPresetBtn.parentElement;
  if (!selector.contains(e.target)) segCloseDropdown();
});

segCustomToggle.addEventListener('change', function() {
  segIsCustom = this.checked;
  if (segIsCustom) {
    segPresetLabel.textContent = '自定义';
    segSelectedPreset = null;
    segSetNotesDisabled(false);
    segHideInfo();
    segCloseDropdown();
  } else {
    segPresetLabel.textContent = '选择段位';
    segSetNotesDisabled(false);
    segHideInfo();
  }
  segUpdateCharts();
});

function segReverseDerive() {
  const notes = segGetNotes();
  const notesValid = segValidateNotes();
  if (!notesValid.valid) {
    segResultReverse.innerHTML = `<div class="validation err">❌ 第 ${notesValid.index+1} 个物量无效，请输入正整数。</div>`;
    segBtnFillForward.disabled = true;
    segUpdateCharts();
    return;
  }
  const accs = segGetAccs(segAInputs);
  if (!segValidateAccs(accs)) {
    segResultReverse.innerHTML = `<div class="validation err">❌ 请确保所有ACC在 0~100 之间。</div>`;
    segBtnFillForward.disabled = true;
    segUpdateCharts();
    return;
  }

  const [N1, N2, N3, N4] = notes;
  const [A1, A2, A3, A4] = accs;

  let S1, S2, S3, S4;
  try {
    S1 = A1;
    S2 = (A2 * (N1 + N2) - N1 * S1) / N2;
    S3 = (A3 * (N1 + N2 + N3) - N1 * S1 - N2 * S2) / N3;
    S4 = (A4 * (N1 + N2 + N3 + N4) - N1 * S1 - N2 * S2 - N3 * S3) / N4;
  } catch (e) {
    segResultReverse.innerHTML = `<div class="validation err">❌ 计算异常，请检查物量是否为零。</div>`;
    segBtnFillForward.disabled = true;
    segUpdateCharts();
    return;
  }

  const clamp = (v) => Math.min(100, Math.max(0, v));
  const S = [clamp(S1), clamp(S2), clamp(S3), clamp(S4)];

  const calcA2 = (N1 * S[0] + N2 * S[1]) / (N1 + N2);
  const calcA3 = (N1 * S[0] + N2 * S[1] + N3 * S[2]) / (N1 + N2 + N3);
  const calcA4 = (N1 * S[0] + N2 * S[1] + N3 * S[2] + N4 * S[3]) / (N1 + N2 + N3 + N4);

  const eps = 0.01;
  const diff2 = Math.abs(calcA2 - A2);
  const diff3 = Math.abs(calcA3 - A3);
  const diff4 = Math.abs(calcA4 - A4);
  const allOk = diff2 <= eps && diff3 <= eps && diff4 <= eps;
  const rawOut = [S1, S2, S3, S4].some(v => v < -0.5 || v > 100.5);

  let html = `<div class="result-item"><span>推导出的单曲ACC：</span></div>`;
  const labels = ['S₁', 'S₂', 'S₃', 'S₄'];
  for (let i = 0; i < 4; i++) {
    const val = S[i].toFixed(2);
    const cls = (S[i] < 0 || S[i] > 100) ? 'danger' : 'success';
    html += `<div class="result-item"><span>${labels[i]}</span><span class="val ${cls}">${val}%</span></div>`;
  }
  if (rawOut) html += `<div class="validation warn">⚠️ 推导值超出正常范围，输入数据可能不一致（四舍五入影响）。</div>`;
  else if (allOk) html += `<div class="validation ok">✅ 数据自洽，重算的A₂/A₃/A₄与输入误差 ≤ ${eps}</div>`;
  else html += `<div class="validation warn">⚠️ 重算误差较大（A₂:${diff2.toFixed(3)}，A₃:${diff3.toFixed(3)}，A₄:${diff4.toFixed(3)}），请检查输入或物量。</div>`;
  html += `<div style="font-size:12px;color:#64748b;margin-top:4px;">重算 A₂=${calcA2.toFixed(2)}，A₃=${calcA3.toFixed(2)}，A₄=${calcA4.toFixed(2)}</div>`;
  segResultReverse.innerHTML = html;

  segBtnFillForward.disabled = false;
  segBtnFillForward.dataset.s1 = S[0].toFixed(4);
  segBtnFillForward.dataset.s2 = S[1].toFixed(4);
  segBtnFillForward.dataset.s3 = S[2].toFixed(4);
  segBtnFillForward.dataset.s4 = S[3].toFixed(4);
  segUpdateCharts();
}

function segForwardSynthesize() {
  const notes = segGetNotes();
  if (!segValidateNotes().valid) {
    segResultForward.innerHTML = `<div class="validation err">❌ 物量无效，请检查。</div>`;
    segUpdateCharts();
    return;
  }
  const accs = segGetAccs(segSInputs);
  if (!segValidateAccs(accs)) {
    segResultForward.innerHTML = `<div class="validation err">❌ 请确保单曲ACC在 0~100 之间。</div>`;
    segUpdateCharts();
    return;
  }
  const [N1, N2, N3, N4] = notes;
  const [S1, S2, S3, S4] = accs;
  const weightedSum = N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4;
  const totalNotes = N1 + N2 + N3 + N4;
  const totalAcc = Math.min(100, Math.max(0, weightedSum / totalNotes));
  const display = totalAcc.toFixed(2);

  let html = `<div class="result-item"><span>段位总ACC</span><span class="val success">${display}%</span></div>`;
  html += `<div style="font-size:13px;color:#64748b;margin-top:6px;">加权公式：(${N1}×${S1.toFixed(2)} + ${N2}×${S2.toFixed(2)} + ${N3}×${S3.toFixed(2)} + ${N4}×${S4.toFixed(2)}) / ${totalNotes}</div>`;
  segResultForward.innerHTML = html;
  segUpdateCharts();
}

function segFillForward() {
  const s1 = parseFloat(segBtnFillForward.dataset.s1);
  const s2 = parseFloat(segBtnFillForward.dataset.s2);
  const s3 = parseFloat(segBtnFillForward.dataset.s3);
  const s4 = parseFloat(segBtnFillForward.dataset.s4);
  if (isNaN(s1) || isNaN(s2) || isNaN(s3) || isNaN(s4)) {
    alert('没有可用的推导结果，请先执行逆向推导。');
    return;
  }
  segSInputs[0].value = s1.toFixed(2);
  segSInputs[1].value = s2.toFixed(2);
  segSInputs[2].value = s3.toFixed(2);
  segSInputs[3].value = s4.toFixed(2);
  segForwardSynthesize();
}

function segResetAll() {
  segAInputs.forEach(inp => inp.value = '');
  segSInputs.forEach(inp => inp.value = '');
  segResultReverse.innerHTML = `<div class="hint-default">输入分段ACC后点击推导</div>`;
  segResultForward.innerHTML = `<div class="hint-default">输入单曲ACC后点击合成</div>`;
  segBtnFillForward.disabled = true;
  segBtnFillForward.dataset.s1 = '';
  segBtnFillForward.dataset.s2 = '';
  segBtnFillForward.dataset.s3 = '';
  segBtnFillForward.dataset.s4 = '';
  segUpdateCharts();
}

segBtnReverse.addEventListener('click', segReverseDerive);
segBtnForward.addEventListener('click', segForwardSynthesize);
segBtnFillForward.addEventListener('click', segFillForward);
segResetBtn.addEventListener('click', segResetAll);

// 段位图表
function segPrepareChartData() {
  const notes = segGetNotes();
  const aVals = segGetAccs(segAInputs);
  const sVals = segGetAccs(segSInputs);
  const hasA = aVals.every(v => !isNaN(v)) && segValidateAccs(aVals);
  const hasS = sVals.every(v => !isNaN(v)) && segValidateAccs(sVals);
  const notesValid = segValidateNotes().valid;

  let aData = [null, null, null, null];
  let sData = [null, null, null, null];

  if (hasA) aData = aVals.slice();
  else if (hasS && notesValid) {
    const [N1, N2, N3, N4] = notes;
    const [S1, S2, S3, S4] = sVals;
    aData = [
      S1,
      (N1 * S1 + N2 * S2) / (N1 + N2),
      (N1 * S1 + N2 * S2 + N3 * S3) / (N1 + N2 + N3),
      (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4)
    ];
  }

  if (hasS) sData = sVals.slice();
  else if (hasA && notesValid) {
    const [N1, N2, N3, N4] = notes;
    const [A1, A2, A3, A4] = aVals;
    try {
      const S1 = A1;
      const S2 = (A2 * (N1 + N2) - N1 * S1) / N2;
      const S3 = (A3 * (N1 + N2 + N3) - N1 * S1 - N2 * S2) / N3;
      const S4 = (A4 * (N1 + N2 + N3 + N4) - N1 * S1 - N2 * S2 - N3 * S3) / N4;
      sData = [S1, S2, S3, S4].map(v => Math.min(100, Math.max(0, v)));
    } catch (e) {}
  }

  const allVals = [];
  aData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
  sData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });

  let minVal = 0, maxVal = 100;
  if (allVals.length > 0) {
    minVal = Math.min(...allVals);
    maxVal = Math.max(...allVals);
    const range = maxVal - minVal;
    if (range < 0.1) {
      minVal = Math.max(0, minVal - 2);
      maxVal = Math.min(100, maxVal + 2);
    } else {
      const margin = range * 0.1;
      minVal = Math.max(0, minVal - margin);
      maxVal = Math.min(100, maxVal + margin);
    }
    const step = 0.5;
    minVal = Math.floor(minVal / step) * step;
    maxVal = Math.ceil(maxVal / step) * step;
    if (maxVal - minVal < 1) maxVal = Math.min(100, maxVal + 1);
  }
  return { aData, sData, minVal, maxVal, notesValid };
}

function segDrawLineChart(ctx, data, width, height) {
  const { aData, minVal, maxVal } = data;
  const pad = { top: 20, bottom: 30, left: 50, right: 20 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xLabels = ['第一首', '第二首', '第三首', '第四首'];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  const range = maxVal - minVal;
  const steps = 5;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  for (let i = 0; i <= steps; i++) {
    const val = minVal + (range * i / steps);
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    ctx.fillStyle = '#64748b';
    ctx.fillText(val.toFixed(1) + '%', pad.left - 6, y);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.moveTo(pad.left - 3, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
    ctx.strokeStyle = '#eef2f6';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  const points = aData.map((val, i) => {
    const x = pad.left + (i + 0.5) * (chartW / aData.length);
    const y = (val !== null && !isNaN(val)) ? pad.top + chartH - (val - minVal) / range * chartH : null;
    return { x, y, val };
  });

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let first = true;
  points.forEach(p => {
    if (p.y === null) return;
    if (first) { ctx.moveTo(p.x, p.y); first = false; }
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach((p, i) => {
    if (p.y === null) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText((p.val !== null && !isNaN(p.val)) ? p.val.toFixed(2) + '%' : '—', p.x, p.y - 8);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(xLabels[i], p.x, pad.top + chartH + 6);
  });
}

function segDrawBarChart(ctx, data, width, height) {
  const { sData, minVal, maxVal } = data;
  const pad = { top: 20, bottom: 30, left: 50, right: 20 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xLabels = ['第一首', '第二首', '第三首', '第四首'];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  const range = maxVal - minVal;
  const steps = 5;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  for (let i = 0; i <= steps; i++) {
    const val = minVal + (range * i / steps);
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    ctx.fillStyle = '#64748b';
    ctx.fillText(val.toFixed(1) + '%', pad.left - 6, y);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.moveTo(pad.left - 3, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
    ctx.strokeStyle = '#eef2f6';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  const barWidth = chartW / sData.length * 0.45;
  const gap = (chartW - barWidth * sData.length) / (sData.length + 1);
  sData.forEach((val, i) => {
    const x = pad.left + gap + i * (barWidth + gap);
    if (val === null || isNaN(val)) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('—', x + barWidth / 2, pad.top + chartH - 4);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(xLabels[i], x + barWidth / 2, pad.top + chartH + 6);
      return;
    }
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    const h = (val - minVal) / range * chartH;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x, y, barWidth, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText(val.toFixed(2) + '%', x + barWidth / 2, y - 4);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(xLabels[i], x + barWidth / 2, pad.top + chartH + 6);
  });
}

function segUpdateCharts() {
  const data = segPrepareChartData();
  if (!data.notesValid) {
    [segLineChart, segBarChart].forEach(c => {
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
    });
    return;
  }
  const dpr = window.devicePixelRatio || 1;

  const rect1 = segLineChart.getBoundingClientRect();
  const w1 = rect1.width || 300;
  const h1 = rect1.height || 200;
  segLineChart.width = w1 * dpr;
  segLineChart.height = h1 * dpr;
  segLineChart.style.width = w1 + 'px';
  segLineChart.style.height = h1 + 'px';
  const ctx1 = segLineChart.getContext('2d');
  ctx1.scale(dpr, dpr);
  segDrawLineChart(ctx1, data, w1, h1);

  const rect2 = segBarChart.getBoundingClientRect();
  const w2 = rect2.width || 300;
  const h2 = rect2.height || 200;
  segBarChart.width = w2 * dpr;
  segBarChart.height = h2 * dpr;
  segBarChart.style.width = w2 + 'px';
  segBarChart.style.height = h2 + 'px';
  const ctx2 = segBarChart.getContext('2d');
  ctx2.scale(dpr, dpr);
  segDrawBarChart(ctx2, data, w2, h2);
}

function getAvatarForExportSync() {
  return localAvatarDataURL || '';
}

function segBuildExportHTML(data) {
  if (!data.notesValid) {
    return `<div style="color:red;font-size:20px;text-align:center;padding:50px;">⚠️ 请先输入有效的物量（正整数）</div>`;
  }

  const notes = segGetNotes();
  const aVals = data.aData;
  const sVals = data.sData;
  const title = segSelectedPreset ? segSelectedPreset.name : '自定义段位';
  const author = segSelectedPreset ? (segSelectedPreset.charter || '未知') : '自定义';

  let totalAcc = null;
  if (sVals.every(v => v !== null && !isNaN(v)) && notes.every(n => n > 0)) {
    const [N1, N2, N3, N4] = notes;
    const [S1, S2, S3, S4] = sVals;
    totalAcc = (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4);
    totalAcc = Math.min(100, Math.max(0, totalAcc));
  } else if (aVals.every(v => v !== null && !isNaN(v))) {
    totalAcc = aVals[3];
  }

  const totalDisplay = (totalAcc !== null) ? totalAcc.toFixed(2) + '%' : '—';
  let totalColor = '#2563eb';
  if (totalAcc !== null) {
    if (totalAcc >= 98) totalColor = '#10b981';
    else if (totalAcc >= 96) totalColor = '#3b82f6';
    else if (totalAcc >= 94) totalColor = '#f59e0b';
    else totalColor = '#ef4444';
  }

  const rowLabels = ['第一首', '第二首', '第三首', '第四首'];
  let tableRows = '';
  for (let i = 0; i < 4; i++) {
    const nVal = notes[i] || '—';
    const aVal = (aVals[i] !== null && !isNaN(aVals[i])) ? aVals[i].toFixed(2) + '%' : '—';
    const sVal = (sVals[i] !== null && !isNaN(sVals[i])) ? sVals[i].toFixed(2) + '%' : '—';
    tableRows += `
      <tr style="border-bottom:1px solid #eef2f6;">
        <td style="padding:6px 8px;font-weight:600;color:#1e293b;">${rowLabels[i]}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;">${nVal}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;color:#2563eb;">${aVal}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;color:#10b981;">${sVal}</td>
      </tr>`;
  }

  const pName = playerName || '未命名玩家';
  const avatarSrc = getAvatarForExportSync();
  let avatarHtml = '';
  if (avatarSrc) {
    avatarHtml = `<img src="${avatarSrc}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;border:2px solid #2563eb;" />`;
  } else {
    avatarHtml = `<div style="width:60px;height:60px;border-radius:8px;background:#d1d9e6;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;border:2px dashed #b9c3d0;">头像</div>`;
  }

  return `
    <style>
      .export-wrapper { display:flex; gap:30px; font-family:'Microsoft YaHei','微软雅黑',sans-serif; background:#fff; padding:20px 24px; border-radius:16px; max-width:100%; }
      .export-left { flex:0 0 55%; display:flex; flex-direction:column; }
      .export-right { flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:12px; }
      .export-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:3px solid #2563eb; padding-bottom:10px; }
      .export-title .name { font-size:22px; font-weight:700; color:#0f172a; }
      .export-title .author { font-size:14px; color:#475569; }
      .export-title .time { font-size:13px; color:#94a3b8; }
      .export-table { width:100%; table-layout:fixed; border-collapse:collapse; font-size:14px; margin-bottom:16px; }
      .export-table th { background:#f8fafc; border-bottom:2px solid #e2e8f0; padding:8px 8px; text-align:center; color:#475569; font-weight:600; }
      .export-table th:first-child { text-align:left; }
      .export-table td { padding:6px 8px; }
      .export-total { background:#f1f5f9; border-radius:12px; padding:10px 16px; text-align:center; border:2px solid ${totalColor}; }
      .export-total .label { font-size:15px; font-weight:600; color:#1e293b; }
      .export-total .value { font-size:28px; font-weight:700; color:${totalColor}; }
      .export-avatar-row { display:flex; align-items:center; gap:16px; margin-top:18px; padding-top:6px; }
      .export-avatar-box { width:60px; height:60px; border:3px solid #cbd5e1; border-radius:8px; background:transparent; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
      .export-avatar-text { font-size:16px; font-weight:500; color:#475569; }
      .export-chart-box { background:#fafcff; border-radius:8px; border:1px solid #e2e8f0; padding:8px; text-align:center; }
      .export-chart-box .chart-label { font-weight:600; color:#1e293b; font-size:13px; margin-bottom:4px; }
      .export-chart-box canvas { width:100%; height:auto; max-height:170px; background:#fff; border-radius:4px; }
    </style>
    <div class="export-wrapper">
      <div class="export-left">
        <div class="export-title">
          <div>
            <div class="name">🎯 ${escapeHtml(title)}</div>
            <div class="author">作者：${escapeHtml(author)}</div>
          </div>
          <div class="time">${new Date().toLocaleString('zh-CN')}</div>
        </div>
        <table class="export-table">
          <thead>
            <tr>
              <th style="width:20%;text-align:left;">曲目</th>
              <th style="width:20%;text-align:center;">物量</th>
              <th style="width:30%;text-align:center;">分段ACC</th>
              <th style="width:30%;text-align:center;">单曲ACC</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="export-total">
          <div class="label">段位总ACC</div>
          <div class="value">${totalDisplay}</div>
        </div>
        <div class="export-avatar-row">
          <div class="export-avatar-box">${avatarHtml}</div>
          <div class="export-avatar-text">${escapeHtml(pName)}</div>
        </div>
      </div>
      <div class="export-right">
        <div class="export-chart-box">
          <div class="chart-label">分段ACC（折线）</div>
          <canvas id="exportLineChart" width="320" height="160"></canvas>
        </div>
        <div class="export-chart-box">
          <div class="chart-label">单曲ACC（柱状）</div>
          <canvas id="exportBarChart" width="320" height="160"></canvas>
        </div>
      </div>
    </div>`;
}

async function segExportImage() {
  if (!segValidateNotes().valid) { alert('请先输入有效的物量（正整数）。'); return; }
  const data = segPrepareChartData();
  if (!data.notesValid) { alert('物量无效，请检查。'); return; }

  segExportBtn.disabled = true;
  const originalText = segExportBtn.textContent;
  segExportBtn.textContent = '⏳ 导出中...';

  try {
    const html = segBuildExportHTML(data);
    exportContainer.innerHTML = html;

    const lineCanvasExport = exportContainer.querySelector('#exportLineChart');
    const barCanvasExport = exportContainer.querySelector('#exportBarChart');
    if (lineCanvasExport && barCanvasExport) {
      const dpr = 2, w = 320, h = 160;
      lineCanvasExport.width = w * dpr;
      lineCanvasExport.height = h * dpr;
      lineCanvasExport.style.width = w + 'px';
      lineCanvasExport.style.height = h + 'px';
      const ctxLine = lineCanvasExport.getContext('2d');
      ctxLine.scale(dpr, dpr);
      segDrawLineChart(ctxLine, data, w, h);

      barCanvasExport.width = w * dpr;
      barCanvasExport.height = h * dpr;
      barCanvasExport.style.width = w + 'px';
      barCanvasExport.style.height = h + 'px';
      const ctxBar = barCanvasExport.getContext('2d');
      ctxBar.scale(dpr, dpr);
      segDrawBarChart(ctxBar, data, w, h);
    }

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 920,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    });

    const filename = `段位ACC_${segSelectedPreset ? segSelectedPreset.name : '自定义'}_${new Date().toISOString().slice(0,10)}.png`;
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    alert('导出图片失败，请重试或检查控制台错误。');
  } finally {
    segExportBtn.disabled = false;
    segExportBtn.textContent = originalText;
  }
}

segExportBtn.addEventListener('click', segExportImage);

[...segNInputs, ...segAInputs, ...segSInputs].forEach(inp => {
  inp.addEventListener('input', segUpdateCharts);
});
segAInputs.forEach(inp => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') segBtnReverse.click(); }));
segSInputs.forEach(inp => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') segBtnForward.click(); }));

// ============================================================
// 20. 玩家页面
// ============================================================
playerPageSaveBtn.addEventListener('click', handlePlayerSave);
playerPageIdInput.addEventListener('keydown', e => { if (e.key === 'Enter') handlePlayerSave(); });
playerPageClearBtn.addEventListener('click', handleClearLocalData);

// 玩家页：本地上传头像
playerUploadAvatarBtn.addEventListener('click', () => {
  playerAvatarFileInput.click();
});
playerAvatarFileInput.addEventListener('change', function() {
  if (this.files && this.files.length > 0) {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      localAvatarDataURL = e.target.result;
      saveLocalAvatar(localAvatarDataURL);
      updatePlayerUI();
    };
    reader.readAsDataURL(file);
  }
  this.value = '';
});

async function handleClearLocalData() {
  const confirmed = confirm(
    '确定要清理本地数据吗？\n\n' +
    '将清除以下内容：\n' +
    '  · 所有 ACC 输入数据\n' +
    '  · 本地上传的头像\n' +
    '  · 成绩更新时间\n' +
    '  · 曲绘与谱面元数据缓存\n' +
    '  · 自动查询设置（并发数、截断等）\n\n' +
    '将保留：Phira ID\n\n' +
    '清理完成后将返回主页面。'
  );
  if (!confirmed) return;

  const savedPlayerId = playerId;

  // 1) 清空整个 localStorage
  try { localStorage.clear(); } catch (e) { console.warn('清空 localStorage 失败:', e); }

  // 2) 写回 playerId（这是唯一要保留的）
  if (savedPlayerId) {
    try { localStorage.setItem(KEY.playerId, savedPlayerId); } catch (e) {}
  }

  // 3) 重置内存状态
  inputs.forEach(inp => { inp.value = ''; inp.classList.remove('has-value'); });
  results = [];
  lastCalcTime = null;
  lastAccSnapshot = null;
  playerName = '';
  playerAvatar = '';
  localAvatarDataURL = '';

  // 4) 重置缓存对象
  illustPending.clear();
  chartMetaPending.clear();

  // 5) 清空表格中的 ACC / STACC / Rating 显示
  SONG_DATA.forEach((_, idx) => {
    const resEl = document.getElementById(`result_${idx}`);
    const staccEl = document.getElementById(`stacc_${idx}`);
    if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
    if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
  });

  // 6) 重新从 Phira 拉取玩家名字与头像（ID 已保留）
  if (savedPlayerId) {
    try {
      const info = await fetchUserInfo(savedPlayerId);
      if (info) {
        playerName = info.name;
        playerAvatar = info.avatar;
        // 名字与头像是 Phira 的公开信息，可写回
        try {
          localStorage.setItem(KEY.player, playerName);
          localStorage.setItem(KEY.avatar, playerAvatar);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('重新获取玩家信息失败:', e);
    }
  }

  // 7) 重置显示设置为默认
  applyGuideHintsSetting('on');
  applyConstStyleSetting('left');
  updateSettingButtons();

  // 8) 刷新 UI
  updatePlayerUI();
  updateDisplay();
  if (segSelectedPreset) segShowInfo(segSelectedPreset);

  // 9) 返回主页面
  switchPage('main');
}
playerPageJumpBtn.addEventListener('click', () => {
  if (!playerId) { alert('请先设置 Phira ID'); return; }
  window.open(PHIRA_WEB_USER + playerId, '_blank');
});

async function handlePlayerSave() {
  const newId = playerPageIdInput.value.trim();
  if (!newId) { alert('请输入 Phira ID'); return; }
  if (!/^\d+$/.test(newId)) { alert('Phira ID 应为纯数字'); return; }

  if (newId === playerId) {
    const info = await fetchUserInfo(newId);
    if (info) {
      playerName = info.name;
      playerAvatar = info.avatar;
      updatePlayerUI();
      savePlayerStorage();
      alert('玩家信息已刷新');
    }
    return;
  }

  if (!confirm(`确认将 Phira ID 从 ${playerId || '未设置'} 修改为 ${newId}？\n\n修改后主页面的所有 ACC 数据将被清空，玩家信息将自动重新获取。`)) return;

  playerPageSaveBtn.disabled = true;
  playerPageSaveBtn.textContent = '获取中...';

  inputs.forEach(inp => { inp.value = ''; inp.classList.remove('has-value'); });
  results = [];
  localStorage.removeItem(KEY.accs);

  playerId = newId;
  playerName = '';
  playerAvatar = '';
  loadLocalAvatar();

  const info = await fetchUserInfo(playerId);
  if (info) { playerName = info.name; playerAvatar = info.avatar; }

  updatePlayerUI();
  savePlayerStorage();
  updateDisplay();

  playerPageSaveBtn.disabled = false;
  playerPageSaveBtn.textContent = '确认修改';
  switchPage('main');
}

// ============================================================
// 21. 初始化
// ============================================================
async function init() {
  // 先应用显示设置（影响页面渲染，越早越好）
  loadSettings();
  bindSettingButtons();

  const savedConc = parseInt(localStorage.getItem(KEY.concurrency) || '', 10);
  if (!isNaN(savedConc) && savedConc >= 8 && savedConc <= 16) {
    concurrencySlider.value = savedConc;
    concurrencyValue.textContent = savedConc;
  } else {
    concurrencySlider.value = 8;
    concurrencyValue.textContent = 8;
  }
  const savedTrunc = localStorage.getItem(KEY.truncate);
  truncateToggle.checked = savedTrunc === null ? true : savedTrunc === 'true';
  maxRankInput.disabled = !truncateToggle.checked;
  maxRankInput.style.opacity = truncateToggle.checked ? '1' : '0.5';
  const savedMax = parseInt(localStorage.getItem(KEY.maxRank) || '', 10);
  if (!isNaN(savedMax) && savedMax > 0) maxRankInput.value = savedMax;

  loadPlayerStorage();
  updatePlayerUI();

  renderTable();
  loadFromLocalStorage();
  updateDisplay();

  segRenderDropdown();
  segBtnFillForward.disabled = true;
  // 默认选中第一个物量完整的段位
  const defaultPreset = SEG_PRESETS.find(p =>
    p.notes && p.notes.every(n => n !== null && n !== undefined && Number.isInteger(n) && n > 0)
  );
  if (defaultPreset) segSelectPreset(defaultPreset);
  setTimeout(segUpdateCharts, 100);

  if (playerId) {
    fetchUserInfo(playerId).then(info => {
      if (info) {
        playerName = info.name || playerName;
        playerAvatar = info.avatar || playerAvatar;
        updatePlayerUI();
        savePlayerStorage();
      }
    });
  } else {
    switchPage('player');
  }

  // 延迟 3 秒后启动原图后台预加载，避免与首屏缩略图抢带宽
  setTimeout(() => {
    preloadAllFullCovers().catch(e => console.warn('原图预加载异常:', e));
  }, 3000);
}

init();

console.log(`DFC Rating v${VERSION} 已加载，谱面数: ${SONG_DATA.length}，段位预设: ${SEG_PRESETS.length}`);