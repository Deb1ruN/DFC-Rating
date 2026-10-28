// app/settings-player.js
// 显示设置与玩家信息（原第 6.5–8 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 6.5 显示设置
// ============================================================
function getSettingGuideHints() {
  return localStorage.getItem(KEY.settingsGuideHints) || 'on';
}
function getSettingConstStyle() {
  return localStorage.getItem(KEY.settingsConstStyle) || 'left';
}

function getSettingUseFullCover() {
  return localStorage.getItem(KEY.settingsUseFullCover) || 'off';
}
function applyGuideHintsSetting(val) {
  if (val === 'off') document.body.classList.add('hide-guide-hints');
  else document.body.classList.remove('hide-guide-hints');
}
function applyConstStyleSetting(val) {
  document.body.setAttribute('data-const-style', val || 'left');
}

function updateSettingButtons() {
  const ufc = getSettingUseFullCover();
  document.querySelectorAll('.setting-toggle-btn[data-setting="use-full-cover"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === ufc);
  });
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
      } else if (setting === 'use-full-cover') {
        localStorage.setItem(KEY.settingsUseFullCover, value);
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

