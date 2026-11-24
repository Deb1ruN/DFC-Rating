// app/dev-tools.js
// 开发者选项：可视化维护 data-songs.js / data-segments.js
// 修改只写入浏览器本地，并通过导出按钮生成可替换的 JS 文件。

const DEV_PARTIAL_HEADER = 'DFC-DEV-SONGS/1';
const DEV_SEG_PARTIAL_HEADER = 'DFC-DEV-SEGMENTS/1';

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
let devImportType = 'songs';
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
    stable: song.stable !== false,
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
      devState.songs.deleted = songs.deleted
        .filter(x => typeof x === 'string')
        .map(key => songStorageKeyFromLegacy(key));
    }
    if (songs.edits && typeof songs.edits === 'object') {
      Object.entries(songs.edits).forEach(([id, value]) => {
        if (value && typeof value === 'object') {
          devState.songs.edits[songStorageKeyFromLegacy(id)] = devNormalizeSong(value);
        }
      });
    }
    if (Array.isArray(segments.custom)) {
      devState.segments.custom = segments.custom
        .filter(s => s && typeof s === 'object')
        .map(s => devNormalizeSegment(s));
    }
    if (Array.isArray(segments.deleted)) {
      devState.segments.deleted = segments.deleted
        .filter(x => typeof x === 'string')
        .map(key => segmentStorageKeyFromLegacy(key));
    }
    if (segments.edits && typeof segments.edits === 'object') {
      Object.entries(segments.edits).forEach(([id, value]) => {
        if (value && typeof value === 'object') {
          devState.segments.edits[segmentStorageKeyFromLegacy(id)] = devNormalizeSegment(value);
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
  const customs = devState.songs.custom.map(song => ({
    ...song,
    _devSource: 'custom',
    _devEdited: false,
    _devRowKey: 'c:' + song._devId
  }));
  const originals = DEV_SONG_ORIGINALS
    .filter(song => !deleted.has(song.internalId))
    .map(song => {
      const edit = edits[song.internalId];
      return edit
        ? { ...song, ...edit, _devSource: 'original', _devEdited: true, _devRowKey: 'o:' + song.internalId }
        : { ...song, _devSource: 'original', _devEdited: false, _devRowKey: 'o:' + song.internalId };
    });
  return [...customs, ...originals];
}

function devGetSegments() {
  const deleted = new Set(devState.segments.deleted);
  const edits = devState.segments.edits || {};
  const customs = devState.segments.custom.map(seg => ({
    ...seg,
    _devSource: 'custom',
    _devEdited: false,
    _devRowKey: 'c:' + seg._devId
  }));
  const originals = DEV_SEG_ORIGINALS
    .filter(seg => !deleted.has(seg.internalId))
    .map(seg => {
      const edit = edits[seg.internalId];
      return edit
        ? { ...seg, ...edit, _devSource: 'original', _devEdited: true, _devRowKey: 'o:' + seg.internalId }
        : { ...seg, _devSource: 'original', _devEdited: false, _devRowKey: 'o:' + seg.internalId };
    });
  return [...customs, ...originals];
}

function devSongFields(song) {
  return {
    name: String(song.name || '').trim(),
    constant: Number(song.constant),
    chartId: devChartId(song.chartId),
    yellowRatio: Number(song.yellowRatio) || 0,
    stable: song.stable !== false
  };
}

function devSongRef(song) {
  return devSongFields(song);
}

function devChartId(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function devNormalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function devSongsExactlyEqual(a, b) {
  return devChartId(a.chartId) === devChartId(b.chartId) &&
    String(a.name || '').trim() === String(b.name || '').trim() &&
    Math.abs(Number(a.constant) - Number(b.constant)) < 1e-9 &&
    Math.abs(Number(a.yellowRatio) - Number(b.yellowRatio)) < 1e-12 &&
    (a.stable !== false) === (b.stable !== false);
}

function devSongView() {
  const all = devGetSongs();
  all.forEach(song => {
    song._devDuplicate = false;
    song._devDuplicateLabel = '';
  });

  let duplicateGroups = 0;
  const markGroup = (list, label) => {
    const hasNew = list.some(song => !song._devDuplicate);
    list.forEach(song => {
      song._devDuplicate = true;
      song._devDuplicateLabel = label;
      song._devDuplicateCount = list.length;
    });
    if (hasNew) duplicateGroups++;
  };

  // Phira ID 是首要唯一键
  const idGroups = new Map();
  all.forEach(song => {
    const chartId = devChartId(song.chartId);
    if (chartId === null) return;
    if (!idGroups.has(chartId)) idGroups.set(chartId, []);
    idGroups.get(chartId).push(song);
  });
  idGroups.forEach((list, chartId) => {
    if (list.length > 1) markGroup(list, `Phira ID ${chartId}`);
  });

  // 没有 Phira ID 的条目退化为“同名 + 同定数”判断
  const nameGroups = new Map();
  all.forEach(song => {
    const key = `${devNormalizeName(song.name)}|${Number(song.constant)}`;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(song);
  });
  nameGroups.forEach(list => {
    if (list.length < 2) return;
    const hasNullId = list.some(song => devChartId(song.chartId) === null);
    if (!hasNullId) return;
    markGroup(list, '同名同定数');
  });

  const duplicates = all.filter(song => song._devDuplicate);
  const rest = all.filter(song => !song._devDuplicate);
  const ordered = [
    ...duplicates,
    ...rest.filter(song => song._devSource === 'custom'),
    ...rest.filter(song => song._devSource !== 'custom')
  ];
  return { all, ordered, duplicates, duplicateGroups };
}

function devFindOriginalSong(ref) {
  if (!ref) return null;
  const chartId = devChartId(ref.chartId);
  if (chartId !== null) {
    const byId = DEV_SONG_ORIGINALS.find(song => devChartId(song.chartId) === chartId);
    if (byId) return byId;
  }
  const name = devNormalizeName(ref.name);
  const constant = Number(ref.constant);
  if (!name || !Number.isFinite(constant)) return null;
  return DEV_SONG_ORIGINALS.find(song =>
    devNormalizeName(song.name) === name && Math.abs(Number(song.constant) - constant) < 1e-9
  );
}

function devFindCustomSong(ref) {
  if (!ref) return null;
  const chartId = devChartId(ref.chartId);
  const name = devNormalizeName(ref.name);
  const constant = Number(ref.constant);
  return devState.songs.custom.find(song => {
    if (chartId !== null && devChartId(song.chartId) === chartId) return true;
    return name && Number.isFinite(constant) &&
      devNormalizeName(song.name) === name && Math.abs(Number(song.constant) - constant) < 1e-9;
  }) || null;
}

function devFindCurrentSongExact(song) {
  return devGetSongs().some(existing => devSongsExactlyEqual(existing, song));
}

function devSegmentFields(seg) {
  return {
    name: String(seg.name || '').trim(),
    charter: String(seg.charter || '').trim(),
    chartId: devChartId(seg.chartId),
    notes: Array.isArray(seg.notes)
      ? seg.notes.slice(0, 4).map(n => (n === null || n === undefined ? null : Number(n)))
      : [null, null, null, null],
    difficulty: Number(seg.difficulty),
    yellowRatio: Number(seg.yellowRatio) || 0
  };
}

function devSegmentRef(seg) {
  return {
    name: String(seg.name || '').trim(),
    charter: String(seg.charter || '').trim(),
    chartId: devChartId(seg.chartId)
  };
}

function devSegmentsExactlyEqual(a, b) {
  if (devChartId(a.chartId) !== devChartId(b.chartId)) return false;
  if (String(a.name || '').trim() !== String(b.name || '').trim()) return false;
  if (String(a.charter || '').trim() !== String(b.charter || '').trim()) return false;
  if (Math.abs(Number(a.difficulty) - Number(b.difficulty)) >= 1e-9) return false;
  if (Math.abs(Number(a.yellowRatio) - Number(b.yellowRatio)) >= 1e-12) return false;
  const an = Array.isArray(a.notes) ? a.notes : [];
  const bn = Array.isArray(b.notes) ? b.notes : [];
  for (let i = 0; i < 4; i++) {
    const av = an[i] === null || an[i] === undefined ? null : Number(an[i]);
    const bv = bn[i] === null || bn[i] === undefined ? null : Number(bn[i]);
    if (av !== bv) return false;
  }
  return true;
}

function devFindOriginalSegment(ref) {
  if (!ref) return null;
  const chartId = devChartId(ref.chartId);
  if (chartId !== null) {
    const byId = DEV_SEG_ORIGINALS.find(seg => devChartId(seg.chartId) === chartId);
    if (byId) return byId;
  }
  const name = devNormalizeName(ref.name);
  const charter = devNormalizeName(ref.charter);
  if (!name) return null;
  return DEV_SEG_ORIGINALS.find(seg =>
    devNormalizeName(seg.name) === name && devNormalizeName(seg.charter) === charter
  ) || null;
}

function devFindCustomSegment(ref) {
  if (!ref) return null;
  const chartId = devChartId(ref.chartId);
  const name = devNormalizeName(ref.name);
  const charter = devNormalizeName(ref.charter);
  return devState.segments.custom.find(seg => {
    if (chartId !== null && devChartId(seg.chartId) === chartId) return true;
    return name && devNormalizeName(seg.name) === name && devNormalizeName(seg.charter) === charter;
  }) || null;
}

function devFindCurrentSegmentExact(seg) {
  return devGetSegments().some(existing => devSegmentsExactlyEqual(existing, seg));
}

function devSegmentView() {
  const all = devGetSegments();
  all.forEach(seg => {
    seg._devDuplicate = false;
    seg._devDuplicateLabel = '';
  });

  let duplicateGroups = 0;
  const markGroup = (list, label) => {
    const hasNew = list.some(seg => !seg._devDuplicate);
    list.forEach(seg => {
      seg._devDuplicate = true;
      seg._devDuplicateLabel = label;
      seg._devDuplicateCount = list.length;
    });
    if (hasNew) duplicateGroups++;
  };

  const idGroups = new Map();
  all.forEach(seg => {
    const chartId = devChartId(seg.chartId);
    if (chartId === null) return;
    if (!idGroups.has(chartId)) idGroups.set(chartId, []);
    idGroups.get(chartId).push(seg);
  });
  idGroups.forEach((list, chartId) => {
    if (list.length > 1) markGroup(list, `Phira ID ${chartId}`);
  });

  const nameGroups = new Map();
  all.forEach(seg => {
    const key = `${devNormalizeName(seg.name)}|${devNormalizeName(seg.charter)}`;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(seg);
  });
  nameGroups.forEach(list => {
    if (list.length < 2) return;
    const hasNullId = list.some(seg => devChartId(seg.chartId) === null);
    if (!hasNullId) return;
    markGroup(list, '同名同谱师');
  });

  const duplicates = all.filter(seg => seg._devDuplicate);
  const rest = all.filter(seg => !seg._devDuplicate);
  const ordered = [
    ...duplicates,
    ...rest.filter(seg => seg._devSource === 'custom'),
    ...rest.filter(seg => seg._devSource !== 'custom')
  ];
  return { all, ordered, duplicates, duplicateGroups };
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
  const isDuplicate = !!song._devDuplicate;
  const isStable = song.stable !== false;
  const accent = getConstColor(Number(song.constant));
  const key = isNew ? song._devId : song.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''} ${isDuplicate ? 'is-duplicate' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(song.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(song.name)}">${escapeHtml(song.name)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
          <span class="dev-badge ${isStable ? 'stable' : 'unstable'}">${isStable ? 'Stable' : '非 Stable'}</span>
          ${isDuplicate ? '<span class="dev-badge duplicate">重复</span>' : ''}
        </div>
        <div class="dev-item-meta">
          定数 <b>${devNumber(song.constant, 2)}</b>
          · Phira ID <b>${song.chartId != null ? song.chartId : 'null'}</b>
          · 黄键占比 <b>${devPercent(song.yellowRatio)}</b>
          ${isDuplicate ? ` · <span class="dev-dup-meta">⚠️ 重复：${escapeHtml(song._devDuplicateLabel || '')}</span>` : ''}
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
  const isDuplicate = !!seg._devDuplicate;
  const accent = getConstColor(Number(seg.difficulty));
  const key = isNew ? seg._devId : seg.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''} ${isDuplicate ? 'is-duplicate' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(seg.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(seg.name)}">${escapeHtml(seg.name)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
          ${isDuplicate ? '<span class="dev-badge duplicate">重复</span>' : ''}
        </div>
        <div class="dev-item-meta">
          难度 <b>${devNumber(seg.difficulty, 2)}</b>
          · 谱师 <b>${escapeHtml(seg.charter || '未知')}</b>
          · 物量 <b>${devNotesText(seg.notes)}</b>
          · 黄键占比 <b>${devPercent(seg.yellowRatio)}</b>
          · Phira ID <b>${seg.chartId != null ? seg.chartId : 'null'}</b>
          ${isDuplicate ? ` · <span class="dev-dup-meta">⚠️ 重复：${escapeHtml(seg._devDuplicateLabel || '')}</span>` : ''}
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
  const view = devSongView();
  const all = view.all;
  const q = ($('devSongSearch')?.value || '').trim().toLowerCase();
  const source = view.ordered;
  const items = q
    ? source.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.chartId || '').includes(q))
    : source;

  const deletedCount = DEV_SONG_ORIGINALS.length - (all.length - devState.songs.custom.length);
  const editedCount = Object.keys(devState.songs.edits || {}).length;
  const duplicateCount = view.duplicates.length;
  $('devSongCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.songs.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}${duplicateCount ? ` · 重复 ${duplicateCount}` : ''}`;

  const hint = $('devSongDuplicateHint');
  if (hint) {
    hint.hidden = duplicateCount === 0;
    hint.textContent = duplicateCount
      ? `⚠️ 检测到 ${duplicateCount} 条重复谱面（${view.duplicateGroups} 组）。Phira ID 不能重复，重复项已置顶标记，请优先修改 Phira ID，或删除多余条目。`
      : '';
  }

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
  const view = devSegmentView();
  const all = view.all;
  const q = ($('devSegmentSearch')?.value || '').trim().toLowerCase();
  const source = view.ordered;
  const items = q
    ? source.filter(s => String(s.name || '').toLowerCase().includes(q) ||
        String(s.charter || '').toLowerCase().includes(q) ||
        String(s.chartId || '').includes(q))
    : source;

  const deletedCount = DEV_SEG_ORIGINALS.length - (all.length - devState.segments.custom.length);
  const editedCount = Object.keys(devState.segments.edits || {}).length;
  const duplicateCount = view.duplicates.length;
  $('devSegmentCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.segments.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}${duplicateCount ? ` · 重复 ${duplicateCount}` : ''}`;

  const hint = $('devSegmentDuplicateHint');
  if (hint) {
    hint.hidden = duplicateCount === 0;
    hint.textContent = duplicateCount
      ? `⚠️ 检测到 ${duplicateCount} 条重复段位（${view.duplicateGroups} 组）。Phira ID 不能重复，重复项已置顶标记，请优先修改 Phira ID，或删除多余条目。`
      : '';
  }

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

function devSetSongStable(value) {
  const stable = value !== false;
  document.querySelectorAll('#devSongStableToggle [data-dev-stable-value]').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.devStableValue === 'true') === stable);
  });
}

function devGetSongStable() {
  const active = document.querySelector('#devSongStableToggle [data-dev-stable-value].active');
  return active ? active.dataset.devStableValue === 'true' : false;
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
  devSetSongStable(false);
}

function devFillFormFromItem(type, item) {
  if (type === 'songs') {
    $('devSongName').value = item.name || '';
    $('devSongConstant').value = item.constant != null ? item.constant : '';
    $('devSongChartId').value = item.chartId != null ? item.chartId : '';
    $('devSongRatio').value = item.yellowRatio != null
      ? String(Number((Number(item.yellowRatio) * 100).toFixed(8)))
      : '';
    devSetSongStable(item.stable !== false);
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
    yellowRatio: Number((ratio / 100).toFixed(12)),
    stable: devGetSongStable()
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
    '// 格式：[曲名, 定数, Phira编号(null 表示无 ID), drag占比, Stable]',
    'window.SONG_DATA = ['
  ];
  items.forEach((s, i) => {
    const arr = [
      JSON.stringify(String(s.name || '')),
      Number(s.constant),
      s.chartId == null ? 'null' : Number(s.chartId),
      Number(s.yellowRatio),
      s.stable !== false ? 'true' : 'false'
    ].join(', ');
    lines.push(`  [${arr}]${i < items.length - 1 ? ',' : ''}`);
  });
  lines.push('].map(([name, constant, chartId, yellowRatio, stable]) => ({');
  lines.push('  name,');
  lines.push('  constant,');
  lines.push('  chartId,');
  lines.push('  yellowRatio,');
  lines.push('  stable: stable !== false,');
  lines.push("  internalId: name + '|' + constant + '|' + (chartId || '')");
  lines.push('}));');
  return lines.join('\n') + '\n';
}

function devSegmentExportText() {
  // 段位文件现在也按难度降序排列；新增/修改后的段位插入到正确位置
  const items = devGetSegments().slice().sort((a, b) => {
    const av = Number.isFinite(Number(a.difficulty)) ? Number(a.difficulty) : -Infinity;
    const bv = Number.isFinite(Number(b.difficulty)) ? Number(b.difficulty) : -Infinity;
    return bv - av;
  });
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

// ================= 部分导出 / 导入修改（仅谱面数据） =================
function devBuildPartialPayload() {
  const added = devState.songs.custom.map(song => devSongFields(song));

  const deleted = [];
  devState.songs.deleted.forEach(id => {
    const original = DEV_SONG_ORIGINALS.find(song => song.internalId === id);
    if (original) deleted.push(devSongRef(original));
  });

  const edited = [];
  Object.entries(devState.songs.edits || {}).forEach(([id, to]) => {
    const original = DEV_SONG_ORIGINALS.find(song => song.internalId === id);
    if (original) edited.push({ from: devSongRef(original), to: devSongFields(to) });
  });

  return { added, deleted, edited };
}

async function devCopyText(text) {
  try {
    if (navigator.clipboard && (!window.isSecureContext || window.isSecureContext === true)) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

async function devPartialExport() {
  const payload = devBuildPartialPayload();
  const total = payload.added.length + payload.deleted.length + payload.edited.length;
  if (total === 0) {
    devToast('当前没有谱面修改可导出');
    return;
  }

  const text = `${DEV_PARTIAL_HEADER}\n${JSON.stringify(payload)}`;
  const ok = await devCopyText(text);
  if (ok) {
    devToast(`已复制 ${total} 条谱面修改，可直接发送给其他设备`);
  } else {
    window.prompt('自动复制失败，请手动复制以下内容：', text);
  }
}

function devParseSongFull(raw, label) {
  if (!raw || typeof raw !== 'object') throw new Error(`${label}格式错误。`);
  const ratio = Number(raw.yellowRatio);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error(`${label}黄键占比无效。`);
  }
  const song = devSongFields(raw);
  song.yellowRatio = ratio;
  if (!song.name) throw new Error(`${label}缺少曲名。`);
  if (!Number.isFinite(song.constant) || song.constant <= 0) throw new Error(`${label}定数无效。`);
  return song;
}

function devParseSongRef(raw, label) {
  if (!raw || typeof raw !== 'object') throw new Error(`${label}格式错误。`);
  const ref = {
    name: String(raw.name || '').trim(),
    constant: Number(raw.constant),
    chartId: devChartId(raw.chartId)
  };
  if (!ref.name && ref.chartId === null) throw new Error(`${label}缺少曲名或 Phira ID。`);
  return ref;
}

function devParsePartialText(text) {
  let raw = String(text || '').trim();
  if (!raw) throw new Error('请先粘贴修改文本。');

  if (raw.startsWith(DEV_PARTIAL_HEADER)) {
    raw = raw.slice(DEV_PARTIAL_HEADER.length).trim();
  } else if (raw.startsWith('DFC-DEV-SONGS')) {
    const nl = raw.indexOf('\n');
    if (nl !== -1) raw = raw.slice(nl + 1).trim();
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('无法识别文本，请确认复制的是「部分导出」内容。');
  }
  if (!data || typeof data !== 'object') throw new Error('修改文本格式错误。');

  const added = Array.isArray(data.added) ? data.added.map((item, i) => devParseSongFull(item, `新增第 ${i + 1} 条`)) : [];
  const deleted = Array.isArray(data.deleted) ? data.deleted.map((item, i) => devParseSongRef(item, `删除第 ${i + 1} 条`)) : [];
  const edited = Array.isArray(data.edited) ? data.edited.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`修改第 ${i + 1} 条格式错误。`);
    return {
      from: devParseSongRef(item.from, `修改第 ${i + 1} 条原数据`),
      to: devParseSongFull(item.to, `修改第 ${i + 1} 条新数据`)
    };
  }) : [];

  if (added.length === 0 && deleted.length === 0 && edited.length === 0) {
    throw new Error('文本中没有可应用的谱面修改。');
  }
  return { added, deleted, edited };
}

function devApplyPartialImport(text) {
  const data = devParsePartialText(text);
  const summary = { added: 0, deleted: 0, edited: 0, addedAsNew: 0, skipped: 0, missing: 0 };

  data.added.forEach(song => {
    if (devFindCurrentSongExact(song)) {
      summary.skipped++;
      return;
    }
    devState.songs.custom.unshift({ ...song, _devId: devMakeId('song') });
    summary.added++;
  });

  data.deleted.forEach(ref => {
    const original = devFindOriginalSong(ref);
    if (original) {
      if (!devState.songs.deleted.includes(original.internalId)) {
        devState.songs.deleted.push(original.internalId);
        delete devState.songs.edits[original.internalId];
        summary.deleted++;
      } else {
        summary.skipped++;
      }
      return;
    }

    const custom = devFindCustomSong(ref);
    if (custom) {
      devState.songs.custom = devState.songs.custom.filter(song => song._devId !== custom._devId);
      summary.deleted++;
    } else {
      summary.missing++;
    }
  });

  data.edited.forEach(entry => {
    const original = devFindOriginalSong(entry.from);
    if (original) {
      devState.songs.edits[original.internalId] = entry.to;
      const di = devState.songs.deleted.indexOf(original.internalId);
      if (di !== -1) devState.songs.deleted.splice(di, 1);
      summary.edited++;
      return;
    }

    const custom = devFindCustomSong(entry.from);
    if (custom) {
      Object.assign(custom, entry.to);
      summary.edited++;
      return;
    }

    if (devFindCurrentSongExact(entry.to)) {
      summary.skipped++;
    } else {
      devState.songs.custom.unshift({ ...entry.to, _devId: devMakeId('song') });
      summary.addedAsNew++;
    }
  });

  devSaveState();
  devRenderSongs();
  const view = devSongView();
  summary.duplicates = view.duplicates.length;
  return summary;
}

function devBuildSegmentPartialPayload() {
  const added = devState.segments.custom.map(seg => devSegmentFields(seg));

  const deleted = [];
  devState.segments.deleted.forEach(id => {
    const original = DEV_SEG_ORIGINALS.find(seg => seg.internalId === id);
    if (original) deleted.push(devSegmentRef(original));
  });

  const edited = [];
  Object.entries(devState.segments.edits || {}).forEach(([id, to]) => {
    const original = DEV_SEG_ORIGINALS.find(seg => seg.internalId === id);
    if (original) edited.push({ from: devSegmentRef(original), to: devSegmentFields(to) });
  });

  return { added, deleted, edited };
}

async function devPartialExportSegments() {
  const payload = devBuildSegmentPartialPayload();
  const total = payload.added.length + payload.deleted.length + payload.edited.length;
  if (total === 0) {
    devToast('当前没有段位修改可导出');
    return;
  }

  const text = `${DEV_SEG_PARTIAL_HEADER}\n${JSON.stringify(payload)}`;
  const ok = await devCopyText(text);
  if (ok) {
    devToast(`已复制 ${total} 条段位修改，可直接发送给其他设备`);
  } else {
    window.prompt('自动复制失败，请手动复制以下内容：', text);
  }
}

function devParseSegmentFull(raw, label) {
  if (!raw || typeof raw !== 'object') throw new Error(`${label}格式错误。`);
  const ratio = Number(raw.yellowRatio);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error(`${label}黄键占比无效。`);
  }
  const seg = devSegmentFields(raw);
  seg.yellowRatio = ratio;
  if (!seg.name) throw new Error(`${label}缺少段位名称。`);
  if (!seg.charter) throw new Error(`${label}缺少谱师。`);
  if (!Number.isFinite(seg.difficulty) || seg.difficulty <= 0) throw new Error(`${label}段位难度无效。`);
  if (!Array.isArray(seg.notes) || seg.notes.length !== 4 ||
      seg.notes.some(n => !Number.isInteger(n) || n < 0)) {
    throw new Error(`${label}四首物量必须是非负整数。`);
  }
  if (!seg.notes.some(n => n > 0)) throw new Error(`${label}至少需要一首物量大于 0。`);
  return seg;
}

function devParseSegmentRef(raw, label) {
  if (!raw || typeof raw !== 'object') throw new Error(`${label}格式错误。`);
  const ref = {
    name: String(raw.name || '').trim(),
    charter: String(raw.charter || '').trim(),
    chartId: devChartId(raw.chartId)
  };
  if (!ref.name && ref.chartId === null) throw new Error(`${label}缺少段位名称或 Phira ID。`);
  return ref;
}

function devParseSegmentPartialText(text) {
  let raw = String(text || '').trim();
  if (!raw) throw new Error('请先粘贴修改文本。');

  if (raw.startsWith(DEV_SEG_PARTIAL_HEADER)) {
    raw = raw.slice(DEV_SEG_PARTIAL_HEADER.length).trim();
  } else if (raw.startsWith('DFC-DEV-SEGMENTS')) {
    const nl = raw.indexOf('\n');
    if (nl !== -1) raw = raw.slice(nl + 1).trim();
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('无法识别文本，请确认复制的是段位「部分导出」内容。');
  }
  if (!data || typeof data !== 'object') throw new Error('修改文本格式错误。');

  const added = Array.isArray(data.added) ? data.added.map((item, i) => devParseSegmentFull(item, `新增第 ${i + 1} 条`)) : [];
  const deleted = Array.isArray(data.deleted) ? data.deleted.map((item, i) => devParseSegmentRef(item, `删除第 ${i + 1} 条`)) : [];
  const edited = Array.isArray(data.edited) ? data.edited.map((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`修改第 ${i + 1} 条格式错误。`);
    return {
      from: devParseSegmentRef(item.from, `修改第 ${i + 1} 条原数据`),
      to: devParseSegmentFull(item.to, `修改第 ${i + 1} 条新数据`)
    };
  }) : [];

  if (added.length === 0 && deleted.length === 0 && edited.length === 0) {
    throw new Error('文本中没有可应用的段位修改。');
  }
  return { added, deleted, edited };
}

function devApplySegmentPartialImport(text) {
  const data = devParseSegmentPartialText(text);
  const summary = { added: 0, deleted: 0, edited: 0, addedAsNew: 0, skipped: 0, missing: 0 };

  data.added.forEach(seg => {
    if (devFindCurrentSegmentExact(seg)) {
      summary.skipped++;
      return;
    }
    devState.segments.custom.unshift({ ...seg, _devId: devMakeId('seg') });
    summary.added++;
  });

  data.deleted.forEach(ref => {
    const original = devFindOriginalSegment(ref);
    if (original) {
      if (!devState.segments.deleted.includes(original.internalId)) {
        devState.segments.deleted.push(original.internalId);
        delete devState.segments.edits[original.internalId];
        summary.deleted++;
      } else {
        summary.skipped++;
      }
      return;
    }

    const custom = devFindCustomSegment(ref);
    if (custom) {
      devState.segments.custom = devState.segments.custom.filter(seg => seg._devId !== custom._devId);
      summary.deleted++;
    } else {
      summary.missing++;
    }
  });

  data.edited.forEach(entry => {
    const original = devFindOriginalSegment(entry.from);
    if (original) {
      devState.segments.edits[original.internalId] = entry.to;
      const di = devState.segments.deleted.indexOf(original.internalId);
      if (di !== -1) devState.segments.deleted.splice(di, 1);
      summary.edited++;
      return;
    }

    const custom = devFindCustomSegment(entry.from);
    if (custom) {
      Object.assign(custom, entry.to);
      summary.edited++;
      return;
    }

    if (devFindCurrentSegmentExact(entry.to)) {
      summary.skipped++;
    } else {
      devState.segments.custom.unshift({ ...entry.to, _devId: devMakeId('seg') });
      summary.addedAsNew++;
    }
  });

  devSaveState();
  devRenderSegments();
  const view = devSegmentView();
  summary.duplicates = view.duplicates.length;
  return summary;
}

function devOpenImportModal(type = 'songs') {
  devImportType = type === 'segments' ? 'segments' : 'songs';
  $('devImportTitle').textContent = devImportType === 'segments' ? '导入段位修改' : '导入谱面修改';
  $('devImportTextarea').placeholder = devImportType === 'segments'
    ? '在此粘贴 DFC-DEV-SEGMENTS/1 ... 文本'
    : '在此粘贴 DFC-DEV-SONGS/1 ... 文本';
  $('devImportError').classList.remove('visible');
  $('devImportError').textContent = '';
  $('devImportTextarea').value = '';
  $('devImportModal').hidden = false;
  setTimeout(() => $('devImportTextarea').focus(), 30);
}

function devCloseImportModal() {
  $('devImportModal').hidden = true;
  $('devImportError').classList.remove('visible');
}

function devConfirmImport() {
  const text = $('devImportTextarea').value;
  const isSegment = devImportType === 'segments';
  try {
    if (isSegment) $('devSegmentSearch').value = '';
    else $('devSongSearch').value = '';
    const summary = isSegment ? devApplySegmentPartialImport(text) : devApplyPartialImport(text);
    devCloseImportModal();

    const parts = [
      `新增 ${summary.added}`,
      `修改 ${summary.edited}`,
      `删除 ${summary.deleted}`
    ];
    if (summary.addedAsNew) parts.push(`补充 ${summary.addedAsNew}`);
    if (summary.skipped) parts.push(`跳过重复项 ${summary.skipped}`);
    if (summary.missing) parts.push(`未找到 ${summary.missing}`);
    devToast(`导入完成：${parts.join('，')}${summary.duplicates ? `；检测到 ${summary.duplicates} 条重复` : ''}`);

    if (summary.duplicates) {
      setTimeout(() => {
        const hint = $(isSegment ? 'devSegmentDuplicateHint' : 'devSongDuplicateHint');
        if (hint && !hint.hidden) hint.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
  } catch (e) {
    const error = $('devImportError');
    error.textContent = e && e.message ? e.message : '导入失败，请检查文本。';
    error.classList.add('visible');
  }
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
  $('devPartialExportBtn').addEventListener('click', devPartialExport);
  $('devImportBtn').addEventListener('click', () => devOpenImportModal('songs'));
  $('devPartialExportSegmentBtn').addEventListener('click', devPartialExportSegments);
  $('devImportSegmentBtn').addEventListener('click', () => devOpenImportModal('segments'));
  $('devImportClose').addEventListener('click', devCloseImportModal);
  $('devImportCancel').addEventListener('click', devCloseImportModal);
  $('devImportConfirm').addEventListener('click', devConfirmImport);
  $('devImportModal').addEventListener('click', (e) => {
    if (e.target === $('devImportModal')) devCloseImportModal();
  });
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
  document.querySelectorAll('#devSongStableToggle [data-dev-stable-value]').forEach(btn => {
    btn.addEventListener('click', () => devSetSongStable(btn.dataset.devStableValue === 'true'));
  });
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
    if (e.key !== 'Escape') return;
    if (!$('devImportModal').hidden) devCloseImportModal();
    else if (!$('devModal').hidden) devCloseModal();
  });

  devSetTab('songs');
}
