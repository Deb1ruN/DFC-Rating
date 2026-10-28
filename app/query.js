// app/query.js
// Phira 成绩查询（原第 15 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

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
  const tasks = [
    ...SONG_DATA.filter(s => s.chartId).map(song => ({ type: 'chart', item: song })),
    ...SEG_DATA.filter(s => s.chartId).map(seg => ({ type: 'segment', item: seg }))
  ];
  const total = tasks.length;
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
      const task = tasks[i];
      const song = task.item;
      activeSet.add(song.name);
      updateCurrent();
      try {
        const r = await queryPlayerScore(song.chartId, playerId, maxRank);
        if (r.found) {
          if (task.type === 'segment') {
            setSegmentAcc(song, r.accuracy);
          } else {
            const idx = SONG_DATA.indexOf(song);
            if (idx >= 0) inputs[idx].value = r.accuracy.toFixed(2);
          }
          foundCount++;
        }
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

  if (getAccSnapshot() !== beforeSnapshot) {
    calculate();
    if (document.querySelector('.page[data-page="preview"]').classList.contains('active')) renderPreview();
  }
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

