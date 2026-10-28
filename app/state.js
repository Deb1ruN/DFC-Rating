// app/state.js
// 全局状态与 DOM 引用（原第 1–6 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

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
const ratingModeNormal = $('ratingModeNormal');
const ratingModeForce = $('ratingModeForce');
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
const previewSortWrap = $('previewSortWrap');
const previewModeButtons = document.querySelectorAll('.preview-mode-btn');

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
const detailStatsTitle = $('detailStatsTitle');
const detailNotesCard = $('detailNotesCard');
const detailNotesGrid = $('detailNotesGrid');
const detailCharter = $('detailCharter');
const detailComposer = $('detailComposer');
const detailYellow = $('detailYellow');
const detailPass = $('detailPass');
const detailBacklight = $('detailBacklight');
const detailBreak = $('detailBreak');
const accMeterTrack = $('accMeterTrack');

// 段位详情：计算与图表
const detailSegCalcSection = $('detailSegCalcSection');
const detailSegModeTitle = $('detailSegModeTitle');
const detailSegFieldsReverse = $('detailSegFieldsReverse');
const detailSegFieldsForward = $('detailSegFieldsForward');
const detailSegBtnReverse = $('detailSegBtnReverse');
const detailSegBtnForward = $('detailSegBtnForward');
const detailSegBtnSwitchMode = $('detailSegBtnSwitchMode');
const detailSegResultReverse = $('detailSegResultReverse');
const detailSegResultForward = $('detailSegResultForward');
const detailSegAInputs = [$('detailSegA1'), $('detailSegA2'), $('detailSegA3'), $('detailSegA4')];
const detailSegSInputs = [$('detailSegS1'), $('detailSegS2'), $('detailSegS3'), $('detailSegS4')];
const detailSegChart = $('detailSegChart');
const detailSegChartTitle = $('detailSegChartTitle');
const detailSegBtnChartToggle = $('detailSegBtnChartToggle');

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
const segBtnSwitchMode = $('segBtnSwitchMode');
const segModeTitle = $('segModeTitle');
const segFieldsReverse = $('segFieldsReverse');
const segFieldsForward = $('segFieldsForward');
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
const segChart = $('segChart');
const segChartTitle = $('segChartTitle');
const segBtnChartToggle = $('segBtnChartToggle');
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
let mainRatingMode = 'normal';   // 'normal' | 'force'

// 段位数据：补齐 internalId / index，便于预览、存储与查询
const SEG_DATA = (window.SEG_PRESETS || []).map((seg, idx) => ({
  ...seg,
  index: idx,
  isSegment: true,
  constant: null,
  internalId: `seg|${idx}|${seg.name}|${seg.chartId == null ? '' : seg.chartId}`
}));
let segmentAccs = {};

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
    const resp = await fetch(`${THUMB_BASE_URL}/manifest.json`);
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
let segMode = 'reverse';        // 'reverse' | 'forward'
let segChartMode = 'line';      // 'line' | 'bar'

let previewSearchQuery = '';
let previewSortMode = 'rating';   // 'rating' | 'constant'
let previewMode = 'single';       // 'single' | 'segment'

// 详情页当前谱面
let detailCurrentSong = null;
let detailSegCurrent = null;      // 当前详情页中的段位
let detailSegMode = 'reverse';    // 'reverse' | 'forward'
let detailSegChartMode = 'line';  // 'line' | 'bar'
// 进入详情前预览页的滚动位置
let previewScrollBeforeDetail = 0;

