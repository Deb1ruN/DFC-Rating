// app/init.js
// 导出模板预热与初始化（原导出预热与第 21 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 导出模块预加载（Warmup）
// ============================================================
function warmupExportFrames() {
  const doWarmup = () => {
    try {
      const prevDisplay = exportContainer.style.display;
      const prevVisibility = exportContainer.style.visibility;
      const prevPosition = exportContainer.style.position;
      
      // 让容器离屏且不可见，但保留在 DOM 中让浏览器计算排版
      exportContainer.style.display = 'block';
      exportContainer.style.visibility = 'hidden';
      exportContainer.style.position = 'absolute';
      exportContainer.style.left = '-9999px';
      exportContainer.style.top = '0';
      
      // 1. 预热单曲导出模板
      const dummySolo = buildSoloExportHTML({
        song: SONG_DATA[0] || { name: 'Warmup', constant: 10 },
        illustUrl: NO_COVER_URL, artW: 400, artH: 225, avatarSrc: '',
        playerName: 'Warmup', acc: 99, staccPct: 98, staccColor: '#3b82f6',
        rating: 10.0, rankText: '#1', cStyle: {bg: '#fff', color: '#000'},
        passPct: 97, backlightPct: 98, breakPct: 99
      });
      exportContainer.innerHTML = dummySolo;
      
      // 2. 预热 B50 导出模板
      const dummyB50 = buildB50ExportHTML({
        playerName: 'Warmup', playerId: '123', avatarSrc: '',
        avgRating: 10, maxRating: 10, minRating: 10, itemCount: 1,
        items: [{
          rank: 1, name: 'Warmup', constant: 10, acc: 99, stacc: 98, rating: 10,
          illustUrl: NO_COVER_URL, constStyle: {bg: '#fff', color: '#000'}, staccColor: '#3b82f6'
        }]
      });
      exportContainer.innerHTML += dummyB50;
      
      // 渲染完成后清理，恢复原状
      setTimeout(() => {
        exportContainer.innerHTML = '';
        exportContainer.style.display = prevDisplay;
        exportContainer.style.visibility = prevVisibility;
        exportContainer.style.position = prevPosition;
        exportContainer.style.left = '';
        exportContainer.style.top = '';
        console.log('📦 导出模板预渲染完成，已清理缓存');
      }, 1000);
      
    } catch (e) {
      console.warn('导出模板预加载失败:', e);
    }
  };

  // 利用浏览器的空闲时间执行，不阻塞主线程
  if ('requestIdleCallback' in window) {
    requestIdleCallback(doWarmup);
  } else {
    setTimeout(doWarmup, 5000); // 降级方案
  }
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
    // 延迟 4 秒后启动导出模板预渲染，避免影响首屏加载
  setTimeout(warmupExportFrames, 4000);
}

init();

console.log(`DFC Rating v${VERSION} 已加载，谱面数: ${SONG_DATA.length}，段位预设: ${SEG_PRESETS.length}`);