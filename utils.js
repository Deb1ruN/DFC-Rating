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