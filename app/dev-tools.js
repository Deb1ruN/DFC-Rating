// app/dev-tools.js
// 开发者选项：可视化维护 data-songs.js / data-segments.js
// 修改只写入浏览器本地，并通过导出按钮生成可替换的 JS 文件。

const DEV_SONG_ORIGINALS = SONG_DATA.map((song, index) => ({
  ...song,
  _devSource: 'original',
  _devIndex: index
}));
const DEV_SEG_ORIGINALS = SEG_DATA.map((seg, index) => ({
  ...seg,
  _devSource: 'original',
  _devIndex: index
}));

let devInitialized = false;
let devActiveTab = 'songs';
let devModalType = null;
let devEditing = null;
let devToastTimer = null;
let devState = {
  songs: { custom: [], deleted: [], edits: {} },
  segments: { custom: [], deleted: [], edits: {} }
};

function devMakeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function devNormalizeSong(song, id) {
  return {
    name: String(song.name || '').trim(),
    constant: Number(song.constant),
    chartId: song.chartId === null || song.chartId === undefined ? null : Number(song.chartId),
    yellowRatio: Number(song.yellowRatio) || 0,
    _devId: id || song._devId || devMakeId('song')
  };
}

function devNormalizeSegment(seg, id) {
  return {
    name: String(seg.name || '').trim(),
    charter: String(seg.charter || '').trim(),
    chartId: seg.chartId === null || seg.chartId === undefined ? null : Number(seg.chartId),
    notes: Array.isArray(seg.notes) ? seg.notes.slice(0, 4).map(n => (n === null || n === undefined ? null : Number(n))) : [null, null, null, null],
    difficulty: seg.difficulty === null || seg.difficulty === undefined ? null : Number(seg.difficulty),
    yellowRatio: Number(seg.yellowRatio) || 0,
    _devId: id || seg._devId || devMakeId('seg')
  };
}

function devLoadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY.devData) || 'null');
    if (!raw || typeof raw !== 'object') return;
    const songs = raw.songs || {};
    const segments = raw.segments || {};
    if (Array.isArray(songs.custom)) {
      devState.songs.custom = songs.custom
        .filter(s => s && typeof s === 'object')
        .map(s => devNormalizeSong(s));
    }
    if (Array.isArray(songs.deleted)) {
      devState.songs.deleted = songs.deleted.filter(x => typeof x === 'string');
    }
    if (songs.edits && typeof songs.edits === 'object') {
      Object.entries(songs.edits).forEach(([id, value]) => {
        if (value && typeof value === 'object') {
          devState.songs.edits[id] = devNormalizeSong(value);
        }
      });
    }
    if (Array.isArray(segments.custom)) {
      devState.segments.custom = segments.custom
        .filter(s => s && typeof s === 'object')
        .map(s => devNormalizeSegment(s));
    }
    if (Array.isArray(segments.deleted)) {
      devState.segments.deleted = segments.deleted.filter(x => typeof x === 'string');
    }
    if (segments.edits && typeof segments.edits === 'object') {
      Object.entries(segments.edits).forEach(([id, value]) => {
        if (value && typeof value === 'object') {
          devState.segments.edits[id] = devNormalizeSegment(value);
        }
      });
    }
  } catch (e) {
    console.warn('[dev] 读取本地开发者数据失败:', e);
  }
}

function devSaveState() {
  const payload = {
    songs: {
      custom: devState.songs.custom.map(s => ({
        name: s.name,
        constant: s.constant,
        chartId: s.chartId,
        yellowRatio: s.yellowRatio,
        _devId: s._devId
      })),
      deleted: devState.songs.deleted.slice(),
      edits: devState.songs.edits
    },
    segments: {
      custom: devState.segments.custom.map(s => ({
        name: s.name,
        charter: s.charter,
        chartId: s.chartId,
        notes: s.notes,
        difficulty: s.difficulty,
        yellowRatio: s.yellowRatio,
        _devId: s._devId
      })),
      deleted: devState.segments.deleted.slice(),
      edits: devState.segments.edits
    }
  };
  try {
    localStorage.setItem(KEY.devData, JSON.stringify(payload));
  } catch (e) {
    console.warn('[dev] 保存本地开发者数据失败:', e);
    devToast('本地保存失败，请检查浏览器存储空间');
  }
}

function devGetSongs() {
  const deleted = new Set(devState.songs.deleted);
  const edits = devState.songs.edits || {};
  const customs = devState.songs.custom.map(song => ({ ...song, _devSource: 'custom', _devEdited: false }));
  const originals = DEV_SONG_ORIGINALS
    .filter(song => !deleted.has(song.internalId))
    .map(song => {
      const edit = edits[song.internalId];
      return edit
        ? { ...song, ...edit, _devSource: 'original', _devEdited: true }
        : { ...song, _devSource: 'original', _devEdited: false };
    });
  return [...customs, ...originals];
}

function devGetSegments() {
  const deleted = new Set(devState.segments.deleted);
  const edits = devState.segments.edits || {};
  const customs = devState.segments.custom.map(seg => ({ ...seg, _devSource: 'custom', _devEdited: false }));
  const originals = DEV_SEG_ORIGINALS
    .filter(seg => !deleted.has(seg.internalId))
    .map(seg => {
      const edit = edits[seg.internalId];
      return edit
        ? { ...seg, ...edit, _devSource: 'original', _devEdited: true }
        : { ...seg, _devSource: 'original', _devEdited: false };
    });
  return [...customs, ...originals];
}

function devNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function devPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function devNotesText(notes) {
  if (!Array.isArray(notes)) return '—';
  return notes.map(n => (n === null || n === undefined ? '—' : n)).join(' / ');
}

function devSongCard(song) {
  const isNew = song._devSource === 'custom';
  const isEdited = !!song._devEdited;
  const accent = getConstColor(Number(song.constant));
  const key = isNew ? song._devId : song.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(song.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(song.name)}">${escapeHtml(song.name)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="dev-item-meta">
          定数 <b>${devNumber(song.constant, 2)}</b>
          · Phira ID <b>${song.chartId != null ? song.chartId : 'null'}</b>
          · 黄键占比 <b>${devPercent(song.yellowRatio)}</b>
        </div>
      </div>
      <div class="dev-item-actions">
        <button class="dev-edit" type="button" data-dev-edit="1" data-dev-kind="songs" data-dev-source="${isNew ? 'custom' : 'original'}" data-dev-id="${escapeHtml(key)}">✏️ 修改</button>
        <button class="dev-delete" type="button" data-dev-delete="1" data-dev-kind="songs" data-dev-source="${isNew ? 'custom' : 'original'}" data-dev-id="${escapeHtml(key)}">🗑 删除</button>
      </div>
    </div>`;
}

function devSegmentCard(seg) {
  const isNew = seg._devSource === 'custom';
  const isEdited = !!seg._devEdited;
  const accent = getConstColor(Number(seg.difficulty));
  const key = isNew ? seg._devId : seg.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(seg.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(seg.name)}">${escapeHtml(seg.name)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="dev-item-meta">
          难度 <b>${devNumber(seg.difficulty, 2)}</b>
          · 谱师 <b>${escapeHtml(seg.charter || '未知')}</b>
          · 物量 <b>${devNotesText(seg.notes)}</b>
          · 黄键占比 <b>${devPercent(seg.yellowRatio)}</b>
          · Phira ID <b>${seg.chartId != null ? seg.chartId : 'null'}</b>
        </div>
      </div>
      <div class="dev-item-actions">
        <button class="dev-edit" type="button" data-dev-edit="1" data-dev-kind="segments" data-dev-source="${isNew ? 'custom' : 'original'}" data-dev-id="${escapeHtml(key)}">✏️ 修改</button>
        <button class="dev-delete" type="button" data-dev-delete="1" data-dev-kind="segments" data-dev-source="${isNew ? 'custom' : 'original'}" data-dev-id="${escapeHtml(key)}">🗑 删除</button>
      </div>
    </div>`;
}

function devObserveCovers(container) {
  if (typeof illustObserver === 'undefined') return;
  container.querySelectorAll('.art-box').forEach(el => illustObserver.observe(el));
}

function devRenderSongs() {
  const list = $('devSongList');
  if (!list) return;
  const all = devGetSongs();
  const q = ($('devSongSearch')?.value || '').trim().toLowerCase();
  const items = q
    ? all.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.chartId || '').includes(q))
    : all;

  const deletedCount = DEV_SONG_ORIGINALS.length - (all.length - devState.songs.custom.length);
  const editedCount = Object.keys(devState.songs.edits || {}).length;
  $('devSongCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.songs.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}`;

  if (items.length === 0) {
    list.innerHTML = `<div class="dev-empty">${q ? '没有匹配的谱面' : '暂无谱面数据'}</div>`;
    return;
  }

  list.innerHTML = items.map(devSongCard).join('');
  devObserveCovers(list);
}

function devRenderSegments() {
  const list = $('devSegmentList');
  if (!list) return;
  const all = devGetSegments();
  const q = ($('devSegmentSearch')?.value || '').trim().toLowerCase();
  const items = q
    ? all.filter(s => String(s.name || '').toLowerCase().includes(q) ||
        String(s.charter || '').toLowerCase().includes(q) ||
        String(s.chartId || '').includes(q))
    : all;

  const deletedCount = DEV_SEG_ORIGINALS.length - (all.length - devState.segments.custom.length);
  const editedCount = Object.keys(devState.segments.edits || {}).length;
  $('devSegmentCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.segments.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}`;

  if (items.length === 0) {
    list.innerHTML = `<div class="dev-empty">${q ? '没有匹配的段位' : '暂无段位数据'}</div>`;
    return;
  }

  list.innerHTML = items.map(devSegmentCard).join('');
  devObserveCovers(list);
}

function devRender() {
  if (devActiveTab === 'segments') devRenderSegments();
  else devRenderSongs();
}

function devSetTab(type) {
  devActiveTab = type === 'segments' ? 'segments' : 'songs';
  document.querySelectorAll('[data-dev-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.devTab === devActiveTab);
  });
  document.querySelectorAll('[data-dev-panel]').forEach(panel => {
    panel.hidden = panel.dataset.devPanel !== devActiveTab;
  });
  devRender();
}

function devToast(message) {
  let el = $('devToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'devToast';
    el.className = 'dev-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(devToastTimer);
  devToastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}

function devResetForm() {
  $('devForm').reset();
  $('devFormError').classList.remove('visible');
  $('devFormError').textContent = '';
  $('devSongFields').hidden = devModalType !== 'songs';
  $('devSegmentFields').hidden = devModalType !== 'segments';
  $('devSegTotal').value = '0';
  $('devSegRatio').value = '';
  $('devSongRatio').value = '';
}

function devFillFormFromItem(type, item) {
  if (type === 'songs') {
    $('devSongName').value = item.name || '';
    $('devSongConstant').value = item.constant != null ? item.constant : '';
    $('devSongChartId').value = item.chartId != null ? item.chartId : '';
    $('devSongRatio').value = item.yellowRatio != null
      ? String(Number((Number(item.yellowRatio) * 100).toFixed(8)))
      : '';
    return;
  }

  $('devSegName').value = item.name || '';
  $('devSegCharter').value = item.charter || '';
  $('devSegDifficulty').value = item.difficulty != null ? item.difficulty : '';
  $('devSegChartId').value = item.chartId != null ? item.chartId : '';
  const notes = Array.isArray(item.notes) ? item.notes : [0, 0, 0, 0];
  ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].forEach((id, i) => {
    $(id).value = notes[i] == null ? 0 : notes[i];
  });
  devUpdateSegTotal();
  $('devSegRatio').value = item.yellowRatio != null
    ? String(Number((Number(item.yellowRatio) * 100).toFixed(8)))
    : '';
}

function devOpenModal(type, editItem = null) {
  devModalType = type === 'segments' ? 'segments' : 'songs';
  const isEdit = !!editItem;
  devEditing = isEdit
    ? {
        kind: devModalType,
        source: editItem._devSource,
        id: editItem._devSource === 'custom' ? editItem._devId : editItem.internalId
      }
    : null;
  $('devModalTitle').textContent = `${isEdit ? '修改' : '新增'}${devModalType === 'segments' ? '段位' : '谱面'}`;
  $('devFormSubmit').textContent = isEdit ? '保存修改' : (devModalType === 'segments' ? '添加段位' : '添加谱面');
  devResetForm();
  if (editItem) devFillFormFromItem(devModalType, editItem);
  $('devModal').hidden = false;
  setTimeout(() => {
    const focusEl = devModalType === 'segments' ? $('devSegName') : $('devSongName');
    if (focusEl) focusEl.focus();
  }, 30);
}

function devOpenEdit(kind, source, id) {
  const list = kind === 'segments' ? devGetSegments() : devGetSongs();
  const item = list.find(x => x._devSource === source &&
    (source === 'custom' ? x._devId === id : x.internalId === id));
  if (item) devOpenModal(kind, item);
}

function devCloseModal() {
  $('devModal').hidden = true;
  devModalType = null;
  devEditing = null;
  $('devFormError').classList.remove('visible');
}

function devShowError(message) {
  const el = $('devFormError');
  el.textContent = message;
  el.classList.add('visible');
}

function devReadNumber(input) {
  const raw = String(input.value || '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function devParseChartId(raw) {
  const s = String(raw || '').trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

function devCalcSongRatio(silent = false) {
  const total = devReadNumber($('devSongTotal'));
  const yellow = devReadNumber($('devSongYellow'));
  if (total === null || yellow === null || total <= 0 || yellow < 0 || yellow > total) {
    if (!silent) devToast('请填写有效的总物量和黄键数量');
    return false;
  }
  $('devSongRatio').value = String(Number((yellow / total * 100).toFixed(8)));
  return true;
}

function devUpdateSegTotal() {
  const values = ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].map(id => {
    const raw = String($(id).value || '').trim();
    if (raw === '') return 0;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : NaN;
  });
  const total = values.some(v => isNaN(v)) ? NaN : values.reduce((s, v) => s + v, 0);
  $('devSegTotal').value = isNaN(total) ? '' : String(total);
  return total;
}

function devCalcSegRatio(silent = false) {
  const total = devUpdateSegTotal();
  const yellow = devReadNumber($('devSegYellow'));
  if (!Number.isFinite(total) || total <= 0 || yellow === null || yellow < 0 || yellow > total) {
    if (!silent) devToast('请检查四首物量和黄键数量');
    return false;
  }
  $('devSegRatio').value = String(Number((yellow / total * 100).toFixed(8)));
  return true;
}

function devReadSongForm() {
  const name = $('devSongName').value.trim();
  const constant = Number($('devSongConstant').value);
  const chartId = devParseChartId($('devSongChartId').value);
  if (!name) {
    devShowError('请填写曲名。');
    return null;
  }
  if (!Number.isFinite(constant) || constant <= 0) {
    devShowError('请填写有效的定数（大于 0）。');
    return null;
  }

  let ratio = devReadNumber($('devSongRatio'));
  if (ratio === null) {
    devCalcSongRatio(true);
    ratio = devReadNumber($('devSongRatio'));
  }
  if (ratio === null || ratio < 0 || ratio > 100) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }

  return {
    name,
    constant,
    chartId,
    yellowRatio: Number((ratio / 100).toFixed(12))
  };
}

function devReadSegmentForm() {
  const name = $('devSegName').value.trim();
  const charter = $('devSegCharter').value.trim();
  const difficulty = Number($('devSegDifficulty').value);
  const chartId = devParseChartId($('devSegChartId').value);

  if (!name) {
    devShowError('请填写段位名称。');
    return null;
  }
  if (!charter) {
    devShowError('请填写谱师。');
    return null;
  }
  if (!Number.isFinite(difficulty) || difficulty <= 0) {
    devShowError('请填写有效的段位难度（大于 0）。');
    return null;
  }

  const notes = ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].map(id => {
    const raw = String($(id).value || '').trim();
    if (raw === '') return 0;
    return Number(raw);
  });
  if (notes.some(n => !Number.isInteger(n) || n < 0)) {
    devShowError('四首物量必须是非负整数（允许 0）。');
    return null;
  }
  if (!notes.some(n => n > 0)) {
    devShowError('至少需要一首单曲的物量大于 0。');
    return null;
  }

  let ratio = devReadNumber($('devSegRatio'));
  if (ratio === null) {
    devCalcSegRatio(true);
    ratio = devReadNumber($('devSegRatio'));
  }
  if (ratio === null || ratio < 0 || ratio > 100) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }

  return {
    name,
    charter,
    chartId,
    notes,
    difficulty,
    yellowRatio: Number((ratio / 100).toFixed(12))
  };
}

function devAddSongFromForm() {
  const data = devReadSongForm();
  if (!data) return;
  devState.songs.custom.unshift({ ...data, _devId: devMakeId('song') });
  devSaveState();
  devRenderSongs();
  devCloseModal();
  devToast('已新增谱面，可在预览列表中查看');
}

function devAddSegmentFromForm() {
  const data = devReadSegmentForm();
  if (!data) return;
  devState.segments.custom.unshift({ ...data, _devId: devMakeId('seg') });
  devSaveState();
  devRenderSegments();
  devCloseModal();
  devToast('已新增段位，可在预览列表中查看');
}

function devApplySongEdit() {
  if (!devEditing) return;
  const data = devReadSongForm();
  if (!data) return;

  if (devEditing.source === 'custom') {
    const item = devState.songs.custom.find(s => s._devId === devEditing.id);
    if (!item) return devShowError('找不到要修改的谱面。');
    Object.assign(item, data);
  } else {
    devState.songs.edits[devEditing.id] = data;
  }
  devSaveState();
  devRenderSongs();
  devCloseModal();
  devToast('谱面修改已保存');
}

function devApplySegmentEdit() {
  if (!devEditing) return;
  const data = devReadSegmentForm();
  if (!data) return;

  if (devEditing.source === 'custom') {
    const item = devState.segments.custom.find(s => s._devId === devEditing.id);
    if (!item) return devShowError('找不到要修改的段位。');
    Object.assign(item, data);
  } else {
    devState.segments.edits[devEditing.id] = data;
  }
  devSaveState();
  devRenderSegments();
  devCloseModal();
  devToast('段位修改已保存');
}

function devDeleteItem(kind, source, id) {
  const isSegment = kind === 'segments';
  const label = isSegment ? '段位' : '谱面';
  const extra = source === 'original' ? '\n\n删除后仍可通过「恢复原始数据」恢复原始条目。' : '';
  if (!confirm(`确定删除这条${label}数据吗？${extra}`)) return;

  if (source === 'custom') {
    if (isSegment) devState.segments.custom = devState.segments.custom.filter(s => s._devId !== id);
    else devState.songs.custom = devState.songs.custom.filter(s => s._devId !== id);
  } else {
    const list = isSegment ? devState.segments.deleted : devState.songs.deleted;
    if (!list.includes(id)) list.push(id);
    const edits = isSegment ? devState.segments.edits : devState.songs.edits;
    delete edits[id];
  }
  devSaveState();
  devRender();
  devToast(`已删除该${label}`);
}

function devResetType(type) {
  const isSegment = type === 'segments';
  const label = isSegment ? '段位' : '谱面';
  if (!confirm(`确定恢复${label}的原始数据吗？\n\n本次新增、修改和删除的${label}都会被清空。`)) return;
  if (isSegment) devState.segments = { custom: [], deleted: [], edits: {} };
  else devState.songs = { custom: [], deleted: [], edits: {} };
  devSaveState();
  devRender();
  devToast(`已恢复原始${label}数据`);
}

function devDownloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function devSongExportText() {
  // 谱面文件本身按定数降序排列；新增/修改后的谱面也按同一规则插入
  const items = devGetSongs().slice().sort((a, b) => Number(b.constant) - Number(a.constant));
  const lines = [
    '// data-songs.js',
    `// 谱面数据（共 ${items.length} 条）`,
    '// 由 DFC Rating 开发者选项导出；可直接替换原 data-songs.js',
    '// 格式：[曲名, 定数, Phira编号(null 表示无 ID), drag占比]',
    'window.SONG_DATA = ['
  ];
  items.forEach((s, i) => {
    const arr = [
      JSON.stringify(String(s.name || '')),
      Number(s.constant),
      s.chartId == null ? 'null' : Number(s.chartId),
      Number(s.yellowRatio)
    ].join(', ');
    lines.push(`  [${arr}]${i < items.length - 1 ? ',' : ''}`);
  });
  lines.push('].map(([name, constant, chartId, yellowRatio]) => ({');
  lines.push('  name,');
  lines.push('  constant,');
  lines.push('  chartId,');
  lines.push('  yellowRatio,');
  lines.push("  internalId: name + '|' + constant + '|' + (chartId || '')");
  lines.push('}));');
  return lines.join('\n') + '\n';
}

function devSegmentExportText() {
  const items = devGetSegments();
  const lines = [
    '// data-segments.js',
    `// 段位数据（共 ${items.length} 条）`,
    '// 由 DFC Rating 开发者选项导出；可直接替换原 data-segments.js',
    '// 格式：{ name, charter, chartId, notes: [N1, N2, N3, N4], difficulty, yellowRatio }',
    '// - chartId：null 表示该段位暂无 Phira 编号',
    '// - notes：四首单曲的物量；允许单首为 0',
    '// - difficulty：段位难度；无数据为 null',
    '// - yellowRatio：黄键占比',
    'window.SEG_PRESETS = ['
  ];
  items.forEach((s, i) => {
    const obj = {
      name: String(s.name || ''),
      charter: String(s.charter || ''),
      chartId: s.chartId == null ? null : Number(s.chartId),
      notes: Array.isArray(s.notes) ? s.notes.slice(0, 4) : [null, null, null, null],
      difficulty: s.difficulty == null ? null : Number(s.difficulty),
      yellowRatio: Number(s.yellowRatio) || 0
    };
    lines.push(`  ${JSON.stringify(obj)}${i < items.length - 1 ? ',' : ''}`);
  });
  lines.push('];');
  return lines.join('\n') + '\n';
}

function devExportSongs() {
  devDownloadText(devSongExportText(), 'data-songs.js');
  devToast('已导出 data-songs.js；替换原文件后请恢复原始数据');
}

function devExportSegments() {
  devDownloadText(devSegmentExportText(), 'data-segments.js');
  devToast('已导出 data-segments.js；替换原文件后请恢复原始数据');
}

function devClearAllState() {
  devState = {
    songs: { custom: [], deleted: [], edits: {} },
    segments: { custom: [], deleted: [], edits: {} }
  };
  if (devInitialized) devRender();
}

function devInit() {
  if (devInitialized) {
    devRender();
    return;
  }
  devLoadState();
  devInitialized = true;

  document.querySelectorAll('[data-dev-tab]').forEach(btn => {
    btn.addEventListener('click', () => devSetTab(btn.dataset.devTab));
  });

  $('devAddSongBtn').addEventListener('click', () => devOpenModal('songs'));
  $('devAddSegmentBtn').addEventListener('click', () => devOpenModal('segments'));
  $('devExportSongBtn').addEventListener('click', devExportSongs);
  $('devExportSegmentBtn').addEventListener('click', devExportSegments);
  $('devResetSongBtn').addEventListener('click', () => devResetType('songs'));
  $('devResetSegmentBtn').addEventListener('click', () => devResetType('segments'));
  $('devSongSearch').addEventListener('input', devRenderSongs);
  $('devSegmentSearch').addEventListener('input', devRenderSegments);

  $('devSongList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-dev-edit]');
    if (editBtn) {
      devOpenEdit(editBtn.dataset.devKind, editBtn.dataset.devSource, editBtn.dataset.devId);
      return;
    }
    const btn = e.target.closest('[data-dev-delete]');
    if (!btn) return;
    devDeleteItem(btn.dataset.devKind, btn.dataset.devSource, btn.dataset.devId);
  });
  $('devSegmentList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-dev-edit]');
    if (editBtn) {
      devOpenEdit(editBtn.dataset.devKind, editBtn.dataset.devSource, editBtn.dataset.devId);
      return;
    }
    const btn = e.target.closest('[data-dev-delete]');
    if (!btn) return;
    devDeleteItem(btn.dataset.devKind, btn.dataset.devSource, btn.dataset.devId);
  });

  $('devSongCalcRatio').addEventListener('click', () => devCalcSongRatio(false));
  $('devSegCalcRatio').addEventListener('click', () => devCalcSegRatio(false));
  ['devSongTotal', 'devSongYellow'].forEach(id => {
    $(id).addEventListener('input', () => devCalcSongRatio(true));
  });
  ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4', 'devSegYellow'].forEach(id => {
    $(id).addEventListener('input', () => devCalcSegRatio(true));
  });
  ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].forEach(id => {
    $(id).addEventListener('input', devUpdateSegTotal);
  });

  $('devForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('devFormError').classList.remove('visible');
    if (devEditing) {
      if (devEditing.kind === 'segments') devApplySegmentEdit();
      else devApplySongEdit();
      return;
    }
    if (devModalType === 'segments') devAddSegmentFromForm();
    else devAddSongFromForm();
  });
  $('devModalClose').addEventListener('click', devCloseModal);
  $('devModalCancel').addEventListener('click', devCloseModal);
  $('devModal').addEventListener('click', (e) => {
    if (e.target === $('devModal')) devCloseModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('devModal').hidden) devCloseModal();
  });

  devSetTab('songs');
}
