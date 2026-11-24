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

function previewItemStable(item) {
  return item && item.data && item.data.stable !== false;
}

function applyStableFilter(items) {
  if (previewStableMode === 'hide') return items.filter(previewItemStable);
  if (previewStableMode === 'top') {
    return [
      ...items.filter(item => !previewItemStable(item)),
      ...items.filter(previewItemStable)
    ];
  }
  return items;
}

function previewStableSuffix() {
  if (previewStableMode === 'top') return '，非Stable置顶';
  if (previewStableMode === 'hide') return '，已隐藏非Stable';
  return '';
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

    allItems = applyStableFilter(allItems);
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
      ? `搜索结果 ${totalShown} 首（按难度${previewStableSuffix()}）`
      : `共 ${totalShown} 首（按难度${previewStableSuffix()}）`;
  } else {
    // ===== 按单曲 Rating 排序：Stable B50 + 剩余 =====
    const sorted = [...results].sort((a, b) => b.rating - a.rating);
    const stableResults = sorted.filter(r => r.stable !== false);
    let unstableResults = sorted.filter(r => r.stable === false);

    // 非 Stable 谱面不占用 B50 名额
    let b50 = stableResults.slice(0, 50);
    let stableRest = stableResults.slice(50);
    const playedIds = new Set(results.map(r => r.id));
    let untouched = SONG_DATA.filter(s => !playedIds.has(s.internalId));

    if (q) {
      b50 = b50.filter(r => previewMatches(r, q));
      stableRest = stableRest.filter(r => previewMatches(r, q));
      unstableResults = unstableResults.filter(r => previewMatches(r, q));
      untouched = untouched.filter(s => previewMatches(s, q));
    }

    let restList = [
      ...stableRest.map(r => ({ type: 'result', data: r })),
      ...unstableResults.map(r => ({ type: 'result', data: r })),
      ...untouched.map(s => ({ type: 'untouched', data: s }))
    ].sort((a, b) => b.data.constant - a.data.constant);

    if (previewStableMode === 'hide') {
      restList = restList.filter(previewItemStable);
    }

    const unstableRest = restList.filter(item => !previewItemStable(item));
    const stableRestItems = restList.filter(previewItemStable);
    totalShown = b50.length + restList.length;

    if (totalShown === 0) {
      previewList.innerHTML = `<div class="preview-empty">未找到匹配「${escapeHtml(q)}」的谱面</div>`;
      previewCount.textContent = '—';
      return;
    }

    if (previewStableMode === 'top' && unstableRest.length > 0) {
      html += `<div class="preview-divider"><span>非 Stable 谱面（置顶）</span></div>`;
      unstableRest.forEach(item => {
        html += renderPreviewItem(item.data, null, item.type);
      });
      if (b50.length > 0) {
        html += `<div class="preview-divider"><span>Stable B50</span></div>`;
      }
    }

    b50.forEach((r, i) => { html += renderPreviewItem(r, i + 1, 'result'); });

    const showRest = previewStableMode === 'top' ? stableRestItems : restList;
    if (showRest.length > 0) {
      const restLabel = previewStableMode === 'top'
        ? '以下为剩余 Stable 谱面（按定数降序）'
        : '以下为剩余谱面（按定数降序）';
      html += `<div class="preview-divider"><span>${restLabel}</span></div>`;
      showRest.forEach(item => {
        html += renderPreviewItem(item.data, null, item.type);
      });
    }

    previewCount.textContent = q
      ? `搜索结果 ${totalShown} 首${previewStableSuffix()}`
      : `共 ${totalShown} 首（Stable B50: ${b50.length}${previewStableSuffix()}）`;
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
  const stableBadge = data.stable === false
    ? ' <span class="preview-stable-badge">非Stable</span>'
    : '';

  if (type === 'untouched') {
    return `
      <div class="preview-item" data-index="${songIndex}" style="--const-color:${constColor};">
        ${artBoxHtml(chartId)}
        <div class="preview-info">
          <div class="preview-name" title="${escapeHtml(name)}">${rankPrefix}${escapeHtml(name)}</div>
          <div class="preview-meta">定数 ${constant} · Chart ID ${chartId || '—'}${stableBadge}</div>
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
        <div class="preview-meta">定数 ${constant} · Chart ID ${chartId || '—'}${stableBadge}</div>
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
    if (previewStableWrap) previewStableWrap.style.display = mode === 'segment' ? 'none' : '';
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

if (previewStableSelect) {
  previewStableSelect.addEventListener('change', function() {
    previewStableMode = ['top', 'hide'].includes(this.value) ? this.value : 'mix';
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

function setDetailMetaRow(row, el, value) {
  const text = normalizeSongMeta(value);
  if (!row || !el) return;
  if (!text) {
    row.style.display = 'none';
    el.textContent = '';
    return;
  }
  row.style.display = 'flex';
  el.textContent = text;
}

function showDetailMetaLoading(row, el) {
  if (!row || !el) return;
  row.style.display = 'flex';
  el.textContent = '加载中...';
}

function preloadDetailImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function withCoverTimeout(promise, ms) {
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, ms);
    Promise.resolve(promise).then(value => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    }).catch(() => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}

async function loadDetailCoverProgressive(song) {
  const thumbPromise = getIllustration(song.chartId, 'thumb').catch(() => null);
  const fullPromise = getIllustration(song.chartId, 'full').catch(() => null);

  const thumbUrl = await withCoverTimeout(thumbPromise, 2500);
  if (detailCurrentSong !== song) return;

  // 缩略图先上屏；占位图只在缩略图也未就绪时保留
  if (thumbUrl) {
    const thumbImg = await preloadDetailImage(thumbUrl);
    if (detailCurrentSong !== song) return;
    if (thumbImg) {
      detailArtImg.src = thumbUrl;
      detailArtImg.style.display = 'block';
    }
  }

  const fullUrl = await withCoverTimeout(fullPromise, 3000);
  if (detailCurrentSong !== song) return;
  if (!fullUrl || fullUrl === thumbUrl) return;

  let fullImg = await preloadDetailImage(fullUrl);
  let finalUrl = fullUrl;
  // 高清图 CDN 失败时尝试 GitHub Pages 备用地址
  if (!fullImg && fullUrl.includes(FULL_BASE_URL)) {
    const fallbackUrl = fullUrl.replace(FULL_BASE_URL, FULL_FALLBACK_BASE_URL);
    if (fallbackUrl !== fullUrl) {
      fullImg = await preloadDetailImage(fallbackUrl);
      finalUrl = fallbackUrl;
    }
  }
  if (detailCurrentSong !== song) return;
  if (fullImg) {
    detailArtImg.src = finalUrl;
    detailArtImg.style.display = 'block';
  }
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

  if (isSeg) {
    detailStableRow.style.display = 'none';
    detailNonStableNote.hidden = true;
  } else {
    const isStable = song.stable !== false;
    detailStableRow.style.display = 'flex';
    detailStableBadge.textContent = isStable ? 'Stable' : '非 Stable';
    detailStableBadge.classList.toggle('nonstable', !isStable);
    detailNonStableNote.hidden = isStable;
  }

  detailStatsTitle.textContent = isSeg ? '📊 段位数据' : '📊 谱面数据';
  const segNotesComplete = isSeg && isValidSegmentNotes(song.notes);
  detailExportBtn.style.display = (!isSeg || segNotesComplete) ? 'inline-flex' : 'none';

  detailChartId.textContent = song.chartId != null ? String(song.chartId) : '—';
  detailCopyBtn.style.display = song.chartId != null ? 'inline-flex' : 'none';
  // 重置复制按钮状态
  detailCopyIcon.textContent = '📋';
  detailCopyText.textContent = '复制';
  detailCopyBtn.classList.remove('copied');

  if (isSeg) {
    setDetailMetaRow(detailCharterRow, detailCharter, song.charter);
    setDetailMetaRow(detailComposerRow, detailComposer, 'Various Artists');
  } else {
    const localCharter = normalizeSongMeta(song.charter);
    const localComposer = normalizeSongMeta(song.composer);

    if (localCharter) setDetailMetaRow(detailCharterRow, detailCharter, localCharter);
    else if (song.chartId) showDetailMetaLoading(detailCharterRow, detailCharter);
    else setDetailMetaRow(detailCharterRow, detailCharter, '');

    if (localComposer) setDetailMetaRow(detailComposerRow, detailComposer, localComposer);
    else if (song.chartId) showDetailMetaLoading(detailComposerRow, detailComposer);
    else setDetailMetaRow(detailComposerRow, detailComposer, '');
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

  // 曲绘：占位图 → 缩略图 → 原图
  detailLoadingImg.style.display = 'none';
  detailArtPh.style.display = 'none';
  detailArtImg.src = NO_COVER_URL;
  detailArtImg.style.display = 'block';

  if (song.chartId) {
    loadDetailCoverProgressive(song);
  }

  // 本地谱师/曲师优先；缺失字段才回退到 Phira ID 查询
  if (!isSeg) {
    const localCharter = normalizeSongMeta(song.charter);
    const localComposer = normalizeSongMeta(song.composer);
    if (song.chartId && (!localCharter || !localComposer)) {
      getChartMeta(song.chartId).then(meta => {
        if (detailCurrentSong !== song) return;
        const apiCharter = meta && meta.charter;
        const apiComposer = meta && meta.composer;
        setDetailMetaRow(detailCharterRow, detailCharter, localCharter || apiCharter);
        setDetailMetaRow(detailComposerRow, detailComposer, localComposer || apiComposer);
      });
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

