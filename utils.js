function padZero(n) { return n < 10 ? '0' + n : '' + n; }
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${padZero(d.getMonth()+1)}-${padZero(d.getDate())} ${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
}
function formatTimer(ms) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${padZero(m)}:${padZero(s)}.${padZero(cs)}`;
}
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function getConstClass(c) {
  if (c >= 18) return 'const-18plus';
  if (c >= 17) return 'const-17';
  if (c >= 16) return 'const-16';
  if (c >= 15) return 'const-15';
  if (c >= 14) return 'const-14';
  if (c >= 13) return 'const-13';
  if (c >= 12) return 'const-12';
  if (c >= 11) return 'const-11';
  if (c >= 10) return 'const-10';
  return 'const-9';
}
function getConstBadgeStyle(c) {
  if (c >= 18) return { bg: '#fee2e2', color: '#b91c1c' };
  if (c >= 17) return { bg: '#fed7aa', color: '#9a3412' };
  if (c >= 16) return { bg: '#fef9c3', color: '#854d0e' };
  if (c >= 15) return { bg: '#dbeafe', color: '#1e40af' };
  if (c >= 14) return { bg: '#f3e8ff', color: '#6b21a8' };
  if (c >= 13) return { bg: '#d1fae5', color: '#065f46' };
  if (c >= 12) return { bg: '#e8f5e9', color: '#2e7d32' };
  if (c >= 11) return { bg: '#e1f5fe', color: '#01579b' };
  if (c >= 10) return { bg: '#f3e5f5', color: '#6a1b9a' };
  return { bg: '#fff3e0', color: '#e65100' };
}

function getDisplayAvatar() {
  return localAvatarDataURL || playerAvatar || '';
}
// 难度 → 颜色（用于预览页左侧边线）
function getConstColor(c) {
  if (c >= 18) return '#ef4444';   // 红
  if (c >= 17) return '#f97316';   // 橙
  if (c >= 16) return '#eab308';   // 黄
  if (c >= 15) return '#3b82f6';   // 蓝
  if (c >= 14) return '#a855f7';   // 紫
  if (c >= 13) return '#10b981';   // 绿
  if (c >= 12) return '#14b8a6';   // 青绿
  if (c >= 11) return '#0ea5e9';   // 天蓝
  if (c >= 10) return '#ec4899';   // 粉
  if (c >= 9) return '#8b5cf6';    // 紫罗兰
  if (c >= 8) return '#64748b';    // 灰蓝
  return '#94a3b8';                // 浅灰
}

// ===== 导出画布：高质量降采样 + WebP/JPEG 编码 =====
// 调用方先用较高的 html2canvas scale 渲染，再降到目标宽度，文字边缘会比直接低 scale 更干净
const EXPORT_WEBP_QUALITY = 0.94;
const EXPORT_JPEG_QUALITY = 0.95;
let exportWebPSupported = null;

function supportsWebPEncoding() {
  if (exportWebPSupported !== null) return exportWebPSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    exportWebPSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch (e) {
    exportWebPSupported = false;
  }
  return exportWebPSupported;
}

function downscaleExportCanvas(source, targetWidth) {
  if (!targetWidth || targetWidth >= source.width) return source;
  const targetHeight = Math.round(source.height * (targetWidth / source.width));
  const out = document.createElement('canvas');
  out.width = targetWidth;
  out.height = targetHeight;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return out;
}

function canvasToOptimizedBlob(source, targetWidth) {
  const canvas = downscaleExportCanvas(source, targetWidth);
  const type = supportsWebPEncoding() ? 'image/webp' : 'image/jpeg';
  const quality = type === 'image/webp' ? EXPORT_WEBP_QUALITY : EXPORT_JPEG_QUALITY;
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function downloadBlobWithExt(blob, baseName) {
  const extMap = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
  const ext = extMap[blob.type] || 'png';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${baseName}.${ext}`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}