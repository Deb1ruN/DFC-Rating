// rating-core.js
const TOP_N = 50;
const VERSION = '5.4.0';
const API_BASE = 'https://phira.5wyxi.com';
const PHIRA_WEB_USER = 'https://phira.moe/user/';
const KEY = {
  accs: 'dfc_rating_accs_v4',
  player: 'dfc_rating_player',
  playerId: 'dfc_rating_playerid',
  avatar: 'dfc_rating_avatar',
  localAvatar: 'dfc_rating_local_avatar_',
  lastcalc: 'dfc_rating_lastcalc',
  concurrency: 'dfc_rating_concurrency',
  truncate: 'dfc_rating_truncate_enabled',
  maxRank: 'dfc_rating_max_rank',
  illust: 'dfc_rating_illust_cache',
  chartMeta: 'dfc_rating_chart_meta_cache',
  settingsGuideHints: 'dfc_rating_setting_guide_hints',
  settingsUseFullCover: 'dfc_rating_setting_use_full_cover',
  settingsConstStyle: 'dfc_rating_setting_const_style'
};
const NO_COVER_URL = 'no-cover.png';
const LOADING_COVER_URL = 'loading-cover.png';

// ===== 曲绘配置 =====
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';

// 缩略图：直接放在主网站，同源，速度极快
const THUMB_BASE_URL = './images';

// 原图：放在 GitHub 仓库（请替换为你的真实用户名）
const FULL_BASE_URL = 'https://cdn.jsdmirror.com/gh/Deb1ruN/dfc-rating-covers@main';
const FULL_FALLBACK_BASE_URL = 'https://Deb1ruN.github.io/dfc-rating-covers';
function calcSTACC(acc, D) {
  if (D === undefined || D === null || isNaN(D)) return null;
  const denom = 1 - 0.9 * D;
  if (denom === 0) return 0;
  return (acc - 0.9 * D) / denom;
}
function calcACCFromSTACC(stacc, D) {
  if (D === undefined || D === null || isNaN(D)) return null;
  return stacc * (1 - 0.9 * D) + 0.9 * D;
}
function getMultiplier(stacc) {
  if (stacc === null || isNaN(stacc)) return 0;
  const points = [
    { s: 0.80, m: 0.00 }, { s: 0.95, m: 0.95 }, { s: 0.97, m: 1.00 },
    { s: 0.985, m: 1.06 }, { s: 0.995, m: 1.11 }, { s: 1.00, m: 1.17 }
  ];
  if (stacc <= 0.80) return 0;
  if (stacc >= 1.00) return 1.17;
  for (let i = 0; i < points.length - 1; i++) {
    if (stacc >= points[i].s && stacc < points[i+1].s) {
      const t = (stacc - points[i].s) / (points[i+1].s - points[i].s);
      return points[i].m + t * (points[i+1].m - points[i].m);
    }
  }
  return 1.17;
}
function calcSingleRating(constant, stacc) { return constant * getMultiplier(stacc); }
function getStaccColor(stacc) {
  if (stacc === null || isNaN(stacc)) return '#94a3b8';
  if (stacc < 0.80) return '#ef4444';
  if (stacc < 0.95) return '#f59e0b';
  if (stacc < 0.97) return '#facc15';
  if (stacc < 0.985) return '#3b82f6';
  if (stacc < 0.995) return '#8b5cf6';
  return '#10b981';
}
function toSigFigs(num, sf = 4) {
  if (num === null || isNaN(num) || !isFinite(num)) return '—';
  return parseFloat(num.toPrecision(sf));
}