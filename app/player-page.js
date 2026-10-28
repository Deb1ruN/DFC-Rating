// app/player-page.js
// 玩家页面交互（原第 20 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

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
  segmentAccs = {};
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
  segmentAccs = {};
  localStorage.removeItem(KEY.accs);
  localStorage.removeItem(KEY.segmentDetailAccs);

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

