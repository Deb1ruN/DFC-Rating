// app/preview-detail.js
// 谱面预览与详情页（原第 16–17 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

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
  if (previewMode === 'segment') { renderSegmentPreview(); return; }
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

function segmentDifficultyValue(seg) {
  if (!seg || seg.difficulty === null || seg.difficulty === undefined || seg.difficulty === '') return null;
  const value = Number(seg.difficulty);
  return isFinite(value) ? value : null;
}

function renderSegmentPreview() {
  const q = previewSearchQuery;
  let items = [...SEG_DATA];
  if (q) items = items.filter(seg => previewMatches(seg, q));

  items.sort((a, b) => {
    const ad = segmentDifficultyValue(a);
    const bd = segmentDifficultyValue(b);
    const ar = getSegmentRating(a);
    const br = getSegmentRating(b);

    if (previewSortMode === 'constant') {
      const av = ad === null ? -Infinity : ad;
      const bv = bd === null ? -Infinity : bd;
      if (bv !== av) return bv - av;
      const arv = ar === null ? -Infinity : ar;
      const brv = br === null ? -Infinity : br;
      if (brv !== arv) return brv - arv;
    } else {
      const av = ar === null ? -Infinity : ar;
      const bv = br === null ? -Infinity : br;
      if (bv !== av) return bv - av;
      const adv = ad === null ? -Infinity : ad;
      const bdv = bd === null ? -Infinity : bd;
      if (bdv !== adv) return bdv - adv;
    }
    return String(a.name).localeCompare(String(b.name));
  });

  previewCount.textContent = q ? `搜索结果 ${items.length} 个段位` : `共 ${items.length} 个段位`;

  if (items.length === 0) {
    previewList.innerHTML = q
      ? `<div class="preview-empty">未找到匹配「${escapeHtml(q)}」的段位</div>`
      : '<div class="preview-empty">暂无段位数据</div>';
    return;
  }

  previewList.innerHTML = items.map(seg => renderSegmentPreviewItem(seg)).join('');
  previewList.querySelectorAll('.art-box').forEach(el => illustObserver.observe(el));
  previewList.querySelectorAll('.preview-item').forEach(el => {
    el.addEventListener('click', function() {
      const idx = parseInt(this.dataset.index, 10);
      if (!isNaN(idx)) openSegmentDetail(idx);
    });
  });
}

function renderSegmentPreviewItem(seg) {
  const acc = getSegmentAcc(seg);
  const stacc = acc !== null ? calcSTACC(acc / 100, seg.yellowRatio || 0) : null;
  const staccDisplay = stacc !== null ? (stacc * 100).toFixed(2) + '%' : '—';
  const staccColor = stacc !== null ? getStaccColor(stacc) : '#94a3b8';
  const accDisplay = acc !== null ? acc.toFixed(2) + '%' : '—';
  const difficulty = segmentDifficultyValue(seg);
  const difficultyDisplay = difficulty !== null ? difficulty : '—';
  const constColor = difficulty !== null ? getConstColor(difficulty) : '#94a3b8';
  const segmentRating = getSegmentRating(seg);
  const ratingDisplay = segmentRating !== null ? segmentRating.toFixed(2) : '—';

  return `
    <div class="preview-item" data-index="${seg.index}" style="--const-color:${constColor};">
      ${artBoxHtml(seg.chartId || '')}
      <div class="preview-info">
        <div class="preview-name" title="${escapeHtml(seg.name)}">${escapeHtml(seg.name)}</div>
        <div class="preview-meta">难度 ${difficultyDisplay} · Phira ID ${seg.chartId != null ? seg.chartId : '—'}</div>
      </div>
      <div class="preview-right">
        <div class="preview-stacc" style="color:${staccColor};">${staccDisplay}</div>
        <div class="preview-rating">${ratingDisplay}</div>
        <div class="preview-acc">ACC ${accDisplay}</div>
      </div>
    </div>`;
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

previewModeButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    const mode = this.dataset.mode === 'segment' ? 'segment' : 'single';
    if (previewMode === mode) return;
    previewMode = mode;
    previewModeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (previewSortWrap) previewSortWrap.style.display = '';
    if (mode === 'segment') {
      previewSortMode = 'rating';
      previewSortSelect.value = 'rating';
    }
    if (previewSortSelect && previewSortSelect.options.length >= 2) {
      previewSortSelect.options[0].textContent = mode === 'segment' ? '段位 Rating' : '单曲 Rating';
      previewSortSelect.options[1].textContent = mode === 'segment' ? '段位难度' : '难度';
    }
    previewSearchInput.placeholder = mode === 'segment'
      ? '输入段位名或 Phira ID 搜索...'
      : '输入谱面名或 Chart ID 搜索...';
    renderPreview();
  });
});

if (previewSortSelect) {
  previewSortSelect.addEventListener('change', function() {
    previewSortMode = this.value === 'constant' ? 'constant' : 'rating';
    renderPreview();
  });
}

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
  renderDetailPage(SONG_DATA[songIndex], false);
}

function openSegmentDetail(segIndex) {
  if (segIndex < 0 || segIndex >= SEG_DATA.length) return;
  renderDetailPage(SEG_DATA[segIndex], true);
}

function renderSegmentNotes(seg) {
  const labels = ['第一首', '第二首', '第三首', '第四首'];
  detailNotesGrid.innerHTML = labels.map((label, i) => {
    const value = seg.notes ? seg.notes[i] : null;
    const text = (value === null || value === undefined) ? 'null' : String(value);
    return `<div class="detail-note-item"><span class="note-label">${label}</span><span class="note-value">${escapeHtml(text)}</span></div>`;
  }).join('');
}

function renderDetailPage(item, isSegment) {
  const song = item;
  const isSeg = !!isSegment;

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
  if (isSeg) {
    const segDifficulty = segmentDifficultyValue(song);
    if (segDifficulty !== null) {
      const segStyle = getConstBadgeStyle(segDifficulty);
      detailConstBadge.textContent = segDifficulty;
      detailConstBadge.style.background = segStyle.bg;
      detailConstBadge.style.color = segStyle.color;
    } else {
      detailConstBadge.textContent = '-';
      detailConstBadge.style.background = '#f1f5f9';
      detailConstBadge.style.color = '#64748b';
    }
  } else {
    detailConstBadge.textContent = song.constant;
    detailConstBadge.style.background = cStyle.bg;
    detailConstBadge.style.color = cStyle.color;
  }

  detailStatsTitle.textContent = isSeg ? '📊 段位数据' : '📊 谱面数据';
  const segNotesComplete = isSeg && Array.isArray(song.notes) && song.notes.length === 4 &&
    song.notes.every(n => n !== null && n !== undefined && Number.isInteger(n) && n > 0);
  detailExportBtn.style.display = (!isSeg || segNotesComplete) ? 'inline-flex' : 'none';

  detailChartId.textContent = song.chartId != null ? String(song.chartId) : '—';
  detailCopyBtn.style.display = song.chartId != null ? 'inline-flex' : 'none';
  // 重置复制按钮状态
  detailCopyIcon.textContent = '📋';
  detailCopyText.textContent = '复制';
  detailCopyBtn.classList.remove('copied');

  if (isSeg) {
    detailCharter.textContent = song.charter || '—';
    detailComposer.textContent = '—';
  } else {
    // 谱师 / 曲师占位
    detailCharter.textContent = '加载中...';
    detailComposer.textContent = '加载中...';
  }

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

  // 段位物量
  if (isSeg) {
    renderSegmentNotes(song);
    detailNotesCard.style.display = 'block';
  } else {
    detailNotesCard.style.display = 'none';
    detailNotesGrid.innerHTML = '';
  }

  // 段位详情内的计算与图表（物量完整时显示）
  if (isSeg && segNotesComplete) initDetailSegmentCalc(song);
  else hideDetailSegmentCalc();

  // 曲绘：立即显示 loading 图
  detailLoadingImg.src = LOADING_COVER_URL;
  detailLoadingImg.style.display = 'block';
  detailArtImg.style.display = 'none';
  detailArtPh.style.display = 'none';

  if (!song.chartId) {
    detailLoadingImg.style.display = 'none';
    detailArtImg.src = NO_COVER_URL;
    detailArtImg.style.display = 'block';
  } else {
    // 判断是否使用高清图
    const useFull = getSettingUseFullCover() === 'on';
    const targetSize = useFull ? 'full' : 'thumb';

    getIllustration(song.chartId, targetSize).then(url => {
      if (detailCurrentSong !== song) return;
      if (!url) {
        detailLoadingImg.style.display = 'none';
        detailArtImg.src = NO_COVER_URL;
        detailArtImg.style.display = 'block';
        return;
      }

      const tempImg = new Image();
      tempImg.onload = () => {
        if (detailCurrentSong !== song) return;
        // 使用 tempImg.src 确保是最终加载成功的链接
        detailArtImg.src = tempImg.src;
        detailArtImg.style.display = 'block';
        detailLoadingImg.style.display = 'none';
      };
      tempImg.onerror = () => {
        if (detailCurrentSong !== song) return;
        // 如果是 jsDelivr 的高清原图加载失败（大图被拒绝），自动尝试 GitHub 备用
        if (targetSize === 'full' && tempImg.src.includes('jsdelivr.net')) {
          tempImg.src = tempImg.src.replace(FULL_BASE_URL, FULL_FALLBACK_BASE_URL);
          return;
        }
        // 彻底失败则显示占位图
        detailArtImg.src = NO_COVER_URL;
        detailArtImg.style.display = 'block';
        detailLoadingImg.style.display = 'none';
      };
      tempImg.src = url;
    });
  }

  // 异步获取谱师 / 曲师
  if (!isSeg) {
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
  }

  // 玩家 ACC
  let playerAcc = null;
  if (isSeg) {
    playerAcc = getSegmentAcc(song);
  } else {
    const songIndex = SONG_DATA.indexOf(song);
    if (songIndex >= 0 && inputs[songIndex]) {
      const raw = inputs[songIndex].value.trim();
      const n = parseFloat(raw);
      if (raw !== '' && !isNaN(n)) playerAcc = n;
    }
  }

  // 渲染 ACC 进度条
  renderAccMeter(song, passAccPct, backlightAccPct, breakAccPct, playerAcc);
  if (isSeg && segNotesComplete) detailSegSyncPageMeter();
}

function renderAccMeter(song, passAcc, backlightAcc, breakAcc, playerAcc) {
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
  if (playerAcc === null || playerAcc === undefined || isNaN(playerAcc) || playerAcc < 0 || playerAcc > 100) {
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

