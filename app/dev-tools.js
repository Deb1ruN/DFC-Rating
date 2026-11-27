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
let devScreen = 'menu';
let devActiveTab = 'songs';
let devModalType = null;
let devEditing = null;
let devImportType = 'songs';
let devToastTimer = null;
let devState = {
  songs: { custom: [], deleted: [], edits: {} },
  segments: { custom: [], deleted: [], edits: {} }
};
let devSortState = {
  songs: { mode: 'default', dir: 'desc', status: 'all', hideNoChart: false },
  segments: { mode: 'default', dir: 'desc', status: 'all', hideNoChart: false }
};

function devMakeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function devNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function devHasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function devSongIsComplete(song) {
  return !!song && !!String(song.name || '').trim() &&
    song.constant !== null && song.constant !== '' &&
    Number.isFinite(Number(song.constant)) && Number(song.constant) > 0 &&
    song.yellowRatio !== null && song.yellowRatio !== '' &&
    Number.isFinite(Number(song.yellowRatio)) && Number(song.yellowRatio) >= 0 && Number(song.yellowRatio) <= 1;
}

function devSegmentIsComplete(seg) {
  return !!seg && !!String(seg.name || '').trim() && !!String(seg.charter || '').trim() &&
    seg.difficulty !== null && seg.difficulty !== '' &&
    Number.isFinite(Number(seg.difficulty)) && Number(seg.difficulty) > 0 &&
    isValidSegmentNotes(seg.notes) &&
    seg.yellowRatio !== null && seg.yellowRatio !== '' &&
    Number.isFinite(Number(seg.yellowRatio)) && Number(seg.yellowRatio) >= 0 && Number(seg.yellowRatio) <= 1;
}

function devNormalizeSong(song, id) {
  const out = {
    name: String(song.name || '').trim(),
    constant: devNullableNumber(song.constant),
    chartId: song.chartId === null || song.chartId === undefined ? null : Number(song.chartId),
    yellowRatio: devNullableNumber(song.yellowRatio),
    stable: song.stable !== false,
    charter: normalizeSongMeta(song.charter),
    composer: normalizeSongMeta(song.composer),
    pending: song.pending === true,
    _devId: id || song._devId || devMakeId('song')
  };
  out.pending = out.pending && !devSongIsComplete(out);
  return out;
}

function devNormalizeSegment(seg, id) {
  const out = {
    name: String(seg.name || '').trim(),
    charter: String(seg.charter || '').trim(),
    chartId: seg.chartId === null || seg.chartId === undefined ? null : Number(seg.chartId),
    notes: Array.isArray(seg.notes) ? seg.notes.slice(0, 4).map(n => (n === null || n === undefined || n === '' ? null : Number(n))) : [null, null, null, null],
    difficulty: devNullableNumber(seg.difficulty),
    yellowRatio: devNullableNumber(seg.yellowRatio),
    pending: seg.pending === true,
    _devId: id || seg._devId || devMakeId('seg')
  };
  out.pending = out.pending && !devSegmentIsComplete(out);
  return out;
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
        stable: s.stable !== false,
        charter: s.charter || '',
        composer: s.composer || '',
        pending: s.pending === true,
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
        pending: s.pending === true,
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
    constant: devNullableNumber(song.constant),
    chartId: devChartId(song.chartId),
    yellowRatio: devNullableNumber(song.yellowRatio),
    stable: song.stable !== false,
    charter: normalizeSongMeta(song.charter),
    composer: normalizeSongMeta(song.composer),
    pending: song.pending === true
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

function devNumbersEqual(a, b) {
  const av = devNullableNumber(a);
  const bv = devNullableNumber(b);
  if (av === null || bv === null) return av === bv;
  return Math.abs(av - bv) < 1e-12;
}

function devSongsExactlyEqual(a, b) {
  return devChartId(a.chartId) === devChartId(b.chartId) &&
    String(a.name || '').trim() === String(b.name || '').trim() &&
    devNumbersEqual(a.constant, b.constant) &&
    devNumbersEqual(a.yellowRatio, b.yellowRatio) &&
    (a.stable !== false) === (b.stable !== false) &&
    normalizeSongMeta(a.charter) === normalizeSongMeta(b.charter) &&
    normalizeSongMeta(a.composer) === normalizeSongMeta(b.composer);
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
    const name = devNormalizeName(song.name);
    if (!name || song.constant === null || song.constant === undefined || song.constant === '') return;
    const key = `${name}|${Number(song.constant)}`;
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
      ? seg.notes.slice(0, 4).map(n => (n === null || n === undefined || n === '' ? null : Number(n)))
      : [null, null, null, null],
    difficulty: devNullableNumber(seg.difficulty),
    yellowRatio: devNullableNumber(seg.yellowRatio),
    pending: seg.pending === true
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
  if (!devNumbersEqual(a.difficulty, b.difficulty)) return false;
  if (!devNumbersEqual(a.yellowRatio, b.yellowRatio)) return false;
  const an = Array.isArray(a.notes) ? a.notes : [];
  const bn = Array.isArray(b.notes) ? b.notes : [];
  for (let i = 0; i < 4; i++) {
    const av = an[i] === null || an[i] === undefined || an[i] === '' ? null : Number(an[i]);
    const bv = bn[i] === null || bn[i] === undefined || bn[i] === '' ? null : Number(bn[i]);
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
    const name = devNormalizeName(seg.name);
    const charter = devNormalizeName(seg.charter);
    if (!name || !charter) return;
    const key = `${name}|${charter}`;
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
  const isPending = song.pending === true;
  const isStable = song.stable !== false;
  const accent = song.constant == null ? '#94a3b8' : getConstColor(Number(song.constant));
  const key = isNew ? song._devId : song.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  const displayName = song.name || '未命名谱面';
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''} ${isPending ? 'is-pending' : ''} ${isDuplicate ? 'is-duplicate' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(song.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
          <span class="dev-badge ${isStable ? 'stable' : 'unstable'}">${isStable ? 'Stable' : '非 Stable'}</span>
          ${isPending ? '<span class="dev-badge pending">待定</span>' : ''}
          ${isDuplicate ? '<span class="dev-badge duplicate">重复</span>' : ''}
        </div>
        <div class="dev-item-meta">
          定数 <b>${devNumber(song.constant, 2)}</b>
          · Phira ID <b>${song.chartId != null ? song.chartId : 'null'}</b>
          ${normalizeSongMeta(song.charter) ? `· 谱师 <b>${escapeHtml(normalizeSongMeta(song.charter))}</b>` : ''}
          ${normalizeSongMeta(song.composer) ? `· 曲师 <b>${escapeHtml(normalizeSongMeta(song.composer))}</b>` : ''}
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
  const isPending = seg.pending === true;
  const accent = seg.difficulty == null ? '#94a3b8' : getConstColor(Number(seg.difficulty));
  const key = isNew ? seg._devId : seg.internalId;
  const badgeClass = isNew ? 'new' : (isEdited ? 'edited' : 'original');
  const badgeText = isNew ? '新增' : (isEdited ? '已修改' : '原有');
  const displayName = seg.name || '未命名段位';
  return `
    <div class="dev-item ${isNew ? 'is-new' : ''} ${isEdited ? 'is-edited' : ''} ${isPending ? 'is-pending' : ''} ${isDuplicate ? 'is-duplicate' : ''}" style="--dev-accent:${accent};">
      ${artBoxHtml(seg.chartId || '')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
          <span class="dev-badge ${badgeClass}">${badgeText}</span>
          ${isPending ? '<span class="dev-badge pending">待定</span>' : ''}
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

function devCompareNullableNumbers(a, b, dir) {
  const av = a === null || a === undefined || a === '' ? null : Number(a);
  const bv = b === null || b === undefined || b === '' ? null : Number(b);
  const an = Number.isFinite(av) ? av : null;
  const bn = Number.isFinite(bv) ? bv : null;
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return dir === 'asc' ? an - bn : bn - an;
}

function devSortItems(items, kind, state) {
  const mode = state.mode || 'default';
  if (mode === 'default') return items;
  const dir = state.dir === 'asc' ? 'asc' : 'desc';
  return items.slice().sort((a, b) => {
    if (mode === 'name') {
      const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      return dir === 'asc' ? cmp : -cmp;
    }
    if (kind === 'songs') {
      if (mode === 'constant') return devCompareNullableNumbers(a.constant, b.constant, dir);
      if (mode === 'ratio') return devCompareNullableNumbers(a.yellowRatio, b.yellowRatio, dir);
    }
    if (kind === 'segments') {
      if (mode === 'difficulty') return devCompareNullableNumbers(a.difficulty, b.difficulty, dir);
      if (mode === 'ratio') return devCompareNullableNumbers(a.yellowRatio, b.yellowRatio, dir);
    }
    return 0;
  });
}

function devMatchesStatus(item, state) {
  const status = state.status || 'all';
  if (status === 'pending') return item.pending === true;
  if (status === 'custom') return item._devSource === 'custom';
  if (status === 'edited') return !!item._devEdited;
  if (status === 'duplicate') return !!item._devDuplicate;
  return true;
}

function devFilterAndSortView(view, kind, state, query) {
  const q = String(query || '').trim().toLowerCase();
  const matchesQuery = item => {
    if (!q) return true;
    const hay = [item.name, item.chartId, item.charter, item.composer].map(v => String(v ?? '').toLowerCase());
    return hay.some(v => v.includes(q));
  };
  const filtered = view.all.filter(item =>
    devMatchesStatus(item, state) &&
    (!state.hideNoChart || devChartId(item.chartId) !== null) &&
    matchesQuery(item)
  );
  const duplicate = filtered.filter(item => item._devDuplicate);
  const custom = filtered.filter(item => !item._devDuplicate && item._devSource === 'custom');
  const original = filtered.filter(item => !item._devDuplicate && item._devSource !== 'custom');
  return [
    ...devSortItems(duplicate, kind, state),
    ...devSortItems(custom, kind, state),
    ...devSortItems(original, kind, state)
  ];
}

function devSortSummary(kind, state) {
  const labels = kind === 'songs'
    ? { default: '默认', constant: '定数', ratio: '黄键占比', name: '曲名' }
    : { default: '默认', difficulty: '难度', ratio: '黄键占比', name: '段位名' };
  const parts = [`${labels[state.mode] || '默认'}${state.mode === 'default' ? '' : (state.dir === 'asc' ? ' ↑' : ' ↓')}`];
  if (state.status && state.status !== 'all') {
    const statusLabels = { pending: '仅待定', custom: '仅新增', edited: '仅修改', duplicate: '仅重复' };
    parts.push(statusLabels[state.status] || '');
  }
  if (state.hideNoChart) parts.push('隐藏未上架');
  return parts.filter(Boolean).join(' · ');
}

function devUpdateSortButton(kind) {
  const btn = $(kind === 'segments' ? 'devSegmentSortBtn' : 'devSongSortBtn');
  if (!btn) return;
  const summary = devSortSummary(kind, devSortState[kind]);
  const label = btn.querySelector('.dev-sort-label');
  if (label) label.textContent = summary;
  btn.title = summary;
}

function devOpenDevSort(kind) {
  const state = devSortState[kind];
  const isSegments = kind === 'segments';
  const fields = [
    {
      type: 'select',
      key: 'mode',
      label: '排序方式',
      value: state.mode,
      options: isSegments
        ? [{ value: 'default', label: '默认顺序' }, { value: 'difficulty', label: '难度' }, { value: 'ratio', label: '黄键占比' }, { value: 'name', label: '段位名' }]
        : [{ value: 'default', label: '默认顺序' }, { value: 'constant', label: '定数' }, { value: 'ratio', label: '黄键占比' }, { value: 'name', label: '曲名' }]
    },
    { type: 'direction', key: 'dir', value: state.dir },
    {
      type: 'select',
      key: 'status',
      label: '筛选状态',
      value: state.status,
      options: [
        { value: 'all', label: '全部' },
        { value: 'pending', label: '待定' },
        { value: 'custom', label: '新增' },
        { value: 'edited', label: '已修改' },
        { value: 'duplicate', label: '重复' }
      ]
    },
    { type: 'checkbox', key: 'hideNoChart', label: '隐藏未上架', value: state.hideNoChart, note: '隐藏没有 Phira ID 的条目' }
  ];
  openSortPopover({
    title: `${isSegments ? '段位' : '谱面'}排序 / 筛选`,
    trigger: $(isSegments ? 'devSegmentSortBtn' : 'devSongSortBtn'),
    fields,
    onChange(values) {
      state.mode = values.mode;
      state.dir = values.dir;
      state.status = values.status;
      state.hideNoChart = !!values.hideNoChart;
      devUpdateSortButton(kind);
      devRender();
    }
  });
}

function devRenderSongs() {
  const list = $('devSongList');
  if (!list) return;
  const view = devSongView();
  const all = view.all;
  const q = ($('devSongSearch')?.value || '').trim().toLowerCase();
  const state = devSortState.songs;
  const items = devFilterAndSortView(view, 'songs', state, q);

  const deletedCount = DEV_SONG_ORIGINALS.length - (all.length - devState.songs.custom.length);
  const editedCount = Object.keys(devState.songs.edits || {}).length;
  const duplicateCount = view.duplicates.length;
  const pendingCount = all.filter(s => s.pending).length;
  $('devSongCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.songs.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}${pendingCount ? ` · 待定 ${pendingCount}` : ''}${duplicateCount ? ` · 重复 ${duplicateCount}` : ''}`;
  devUpdateSortButton('songs');

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
  const state = devSortState.segments;
  const items = devFilterAndSortView(view, 'segments', state, q);

  const deletedCount = DEV_SEG_ORIGINALS.length - (all.length - devState.segments.custom.length);
  const editedCount = Object.keys(devState.segments.edits || {}).length;
  const duplicateCount = view.duplicates.length;
  const pendingCount = all.filter(s => s.pending).length;
  $('devSegmentCount').textContent = `${q ? `${items.length} / ` : ''}${all.length} 条 · 新增 ${devState.segments.custom.length} · 修改 ${editedCount} · 删除 ${deletedCount}${pendingCount ? ` · 待定 ${pendingCount}` : ''}${duplicateCount ? ` · 重复 ${duplicateCount}` : ''}`;
  devUpdateSortButton('segments');

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

// 开发者选项内部一级菜单：功能选择 / 谱面数据管理 / 谱面文件读取
function devShowScreen(screen) {
  devScreen = ['manager', 'importer'].includes(screen) ? screen : 'menu';
  const screens = {
    menu: $('devMenuScreen'),
    manager: $('devManagerScreen'),
    importer: $('devImportScreen')
  };
  Object.entries(screens).forEach(([name, el]) => {
    if (el) el.hidden = name !== devScreen;
  });
  if (devScreen === 'importer' && typeof devFileImportRender === 'function') {
    devFileImportRender();
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
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

function devSetPending(value) {
  const on = !!value;
  const btn = $('devPendingToggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  $('devPendingText').textContent = on ? '开启' : '关闭';
}

function devGetPending() {
  return $('devPendingToggle')?.getAttribute('aria-pressed') === 'true';
}

function devResetForm() {
  $('devForm').reset();
  $('devFormError').classList.remove('visible');
  $('devFormError').textContent = '';
  $('devSongFields').hidden = devModalType !== 'songs';
  $('devSegmentFields').hidden = devModalType !== 'segments';
  $('devSongStableField').hidden = devModalType !== 'songs';
  $('devSegTotal').value = '0';
  $('devSegRatio').value = '';
  $('devSongRatio').value = '';
  devSetSongStable(false);
  devSetPending(false);
}

function devFillFormFromItem(type, item) {
  if (type === 'songs') {
    $('devSongName').value = item.name || '';
    $('devSongConstant').value = item.constant != null ? item.constant : '';
    $('devSongChartId').value = item.chartId != null ? item.chartId : '';
    $('devSongCharter').value = normalizeSongMeta(item.charter);
    $('devSongComposer').value = normalizeSongMeta(item.composer);
    $('devSongRatio').value = item.yellowRatio != null
      ? String(Number((Number(item.yellowRatio) * 100).toFixed(8)))
      : '';
    devSetSongStable(item.stable !== false);
    devSetPending(item.pending === true);
    return;
  }

  $('devSegName').value = item.name || '';
  $('devSegCharter').value = item.charter || '';
  $('devSegDifficulty').value = item.difficulty != null ? item.difficulty : '';
  $('devSegChartId').value = item.chartId != null ? item.chartId : '';
  const notes = Array.isArray(item.notes) ? item.notes : [null, null, null, null];
  ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].forEach((id, i) => {
    $(id).value = notes[i] == null ? '' : notes[i];
  });
  devSetPending(item.pending === true);
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
  $('devSongStableField').hidden = devModalType === 'segments';
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
  const allowPending = devGetPending();
  const name = $('devSongName').value.trim();
  const constantRaw = String($('devSongConstant').value || '').trim();
  const chartId = devParseChartId($('devSongChartId').value);

  let constant = null;
  if (constantRaw !== '') {
    constant = Number(constantRaw);
    if (!Number.isFinite(constant) || constant <= 0) {
      devShowError('定数必须是大于 0 的数字。');
      return null;
    }
  }
  if (!name && !allowPending) {
    devShowError('请填写曲名。');
    return null;
  }
  if (constant === null && !allowPending) {
    devShowError('请填写有效的定数（大于 0）。');
    return null;
  }

  const ratioRaw = String($('devSongRatio').value || '').trim();
  let ratio = devReadNumber($('devSongRatio'));
  if (ratioRaw !== '' && ratio === null) {
    devShowError('黄键占比必须是数字。');
    return null;
  }
  if (ratio === null) {
    devCalcSongRatio(true);
    ratio = devReadNumber($('devSongRatio'));
  }
  if (ratio !== null && (ratio < 0 || ratio > 100)) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }
  if (ratio === null && !allowPending) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }

  const data = {
    name,
    constant,
    chartId,
    yellowRatio: ratio === null ? null : Number((ratio / 100).toFixed(12)),
    stable: devGetSongStable(),
    charter: normalizeSongMeta($('devSongCharter').value),
    composer: normalizeSongMeta($('devSongComposer').value)
  };
  data.pending = allowPending && !devSongIsComplete(data);
  return data;
}

function devReadSegmentForm() {
  const allowPending = devGetPending();
  const name = $('devSegName').value.trim();
  const charter = $('devSegCharter').value.trim();
  const difficultyRaw = String($('devSegDifficulty').value || '').trim();
  const chartId = devParseChartId($('devSegChartId').value);

  if (!name && !allowPending) {
    devShowError('请填写段位名称。');
    return null;
  }
  if (!charter && !allowPending) {
    devShowError('请填写谱师。');
    return null;
  }

  let difficulty = null;
  if (difficultyRaw !== '') {
    difficulty = Number(difficultyRaw);
    if (!Number.isFinite(difficulty) || difficulty <= 0) {
      devShowError('段位难度必须是大于 0 的数字。');
      return null;
    }
  }
  if (difficulty === null && !allowPending) {
    devShowError('请填写有效的段位难度（大于 0）。');
    return null;
  }

  const notes = ['devSegN1', 'devSegN2', 'devSegN3', 'devSegN4'].map(id => {
    const raw = String($(id).value || '').trim();
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return NaN;
    return n;
  });
  if (notes.some(n => Number.isNaN(n))) {
    devShowError('四首物量必须是非负整数（允许 0）。');
    return null;
  }
  if (!allowPending && notes.some(n => n === null)) {
    devShowError('请填写四首单曲的物量（允许 0）。');
    return null;
  }

  const ratioRaw = String($('devSegRatio').value || '').trim();
  let ratio = devReadNumber($('devSegRatio'));
  if (ratioRaw !== '' && ratio === null) {
    devShowError('黄键占比必须是数字。');
    return null;
  }
  if (ratio === null) {
    devCalcSegRatio(true);
    ratio = devReadNumber($('devSegRatio'));
  }
  if (ratio !== null && (ratio < 0 || ratio > 100)) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }
  if (ratio === null && !allowPending) {
    devShowError('请填写 0~100 之间的黄键占比。');
    return null;
  }

  const data = {
    name,
    charter,
    chartId,
    notes,
    difficulty,
    yellowRatio: ratio === null ? null : Number((ratio / 100).toFixed(12))
  };
  if (!allowPending && !devSegmentIsComplete(data)) {
    devShowError('段位数据不完整：至少需要一首单曲的物量大于 0。');
    return null;
  }
  data.pending = allowPending && !devSegmentIsComplete(data);
  return data;
}

function devAddSongFromForm() {
  const data = devReadSongForm();
  if (!data) return;
  devState.songs.custom.unshift({ ...data, _devId: devMakeId('song') });
  devSaveState();
  devRenderSongs();
  devCloseModal();
  devToast(data.pending ? '已新增待定谱面，补齐数据后修改即可解除待定' : '已新增谱面，可在预览列表中查看');
}

function devAddSegmentFromForm() {
  const data = devReadSegmentForm();
  if (!data) return;
  devState.segments.custom.unshift({ ...data, _devId: devMakeId('seg') });
  devSaveState();
  devRenderSegments();
  devCloseModal();
  devToast(data.pending ? '已新增待定段位，补齐数据后修改即可解除待定' : '已新增段位，可在预览列表中查看');
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
  devToast(data.pending ? '谱面修改已保存，仍为待定状态' : '谱面修改已保存');
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
  devToast(data.pending ? '段位修改已保存，仍为待定状态' : '段位修改已保存');
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
  // 待定条目只保留在本地，整份导出时忽略；其余按定数降序排列
  const items = devGetSongs().filter(s => !s.pending).sort((a, b) => Number(b.constant) - Number(a.constant));
  const lines = [
    '// data-songs.js',
    `// 谱面数据（共 ${items.length} 条）`,
    '// 由 DFC Rating 开发者选项导出；可直接替换原 data-songs.js',
    '// 格式：[曲名, 定数, Phira编号(null 表示无 ID), drag占比, Stable, 谱师, 曲师]',
    'window.SONG_DATA = ['
  ];
  items.forEach((s, i) => {
    const arr = [
      JSON.stringify(String(s.name || '')),
      Number(s.constant),
      s.chartId == null ? 'null' : Number(s.chartId),
      Number(s.yellowRatio),
      s.stable !== false ? 'true' : 'false',
      JSON.stringify(String(s.charter || '')),
      JSON.stringify(String(s.composer || ''))
    ].join(', ');
    lines.push(`  [${arr}]${i < items.length - 1 ? ',' : ''}`);
  });
  lines.push('].map(([name, constant, chartId, yellowRatio, stable, charter, composer]) => ({');
  lines.push('  name,');
  lines.push('  constant,');
  lines.push('  chartId,');
  lines.push('  yellowRatio,');
  lines.push('  stable: stable !== false,');
  lines.push("  charter: charter == null ? '' : String(charter),");
  lines.push("  composer: composer == null ? '' : String(composer),");
  lines.push("  internalId: name + '|' + constant + '|' + (chartId || '')");
  lines.push('}));');
  return lines.join('\n') + '\n';
}

function devSegmentExportText() {
  // 待定条目只保留在本地；其余按难度降序排列
  const items = devGetSegments().filter(s => !s.pending).sort((a, b) => {
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
  const pendingCount = devGetSongs().filter(s => s.pending).length;
  devDownloadText(devSongExportText(), 'data-songs.js');
  devToast(`已导出 data-songs.js${pendingCount ? `（已忽略 ${pendingCount} 条待定）` : ''}；替换原文件后请恢复原始数据`);
}

function devExportSegments() {
  const pendingCount = devGetSegments().filter(s => s.pending).length;
  devDownloadText(devSegmentExportText(), 'data-segments.js');
  devToast(`已导出 data-segments.js${pendingCount ? `（已忽略 ${pendingCount} 条待定）` : ''}；替换原文件后请恢复原始数据`);
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
  const pending = raw.pending === true;
  const song = devSongFields(raw);

  if (devHasValue(raw.yellowRatio)) {
    const ratio = Number(raw.yellowRatio);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      throw new Error(`${label}黄键占比无效。`);
    }
    song.yellowRatio = ratio;
  } else if (!pending) {
    throw new Error(`${label}缺少黄键占比。`);
  }

  if (!song.name && !pending) throw new Error(`${label}缺少曲名。`);
  if (devHasValue(raw.constant) && (!Number.isFinite(song.constant) || song.constant <= 0)) {
    throw new Error(`${label}定数无效。`);
  }
  if (!devHasValue(raw.constant) && !pending) throw new Error(`${label}缺少定数。`);

  song.pending = pending && !devSongIsComplete(song);
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
  const pending = raw.pending === true;
  const seg = devSegmentFields(raw);

  if (devHasValue(raw.yellowRatio)) {
    const ratio = Number(raw.yellowRatio);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      throw new Error(`${label}黄键占比无效。`);
    }
    seg.yellowRatio = ratio;
  } else if (!pending) {
    throw new Error(`${label}缺少黄键占比。`);
  }

  if (!seg.name && !pending) throw new Error(`${label}缺少段位名称。`);
  if (!seg.charter && !pending) throw new Error(`${label}缺少谱师。`);
  if (devHasValue(raw.difficulty) && (!Number.isFinite(seg.difficulty) || seg.difficulty <= 0)) {
    throw new Error(`${label}段位难度无效。`);
  }
  if (!devHasValue(raw.difficulty) && !pending) throw new Error(`${label}缺少段位难度。`);

  const rawNotes = Array.isArray(raw.notes) ? raw.notes : [];
  const invalidNote = rawNotes.some(n => devHasValue(n) &&
    (!Number.isInteger(Number(n)) || Number(n) < 0));
  if (invalidNote) throw new Error(`${label}四首物量必须是非负整数。`);
  if (!pending && (!Array.isArray(seg.notes) || seg.notes.length !== 4 ||
      seg.notes.some(n => n === null) || !seg.notes.some(n => n > 0))) {
    throw new Error(`${label}四首物量必须完整，且至少一首大于 0。`);
  }

  seg.pending = pending && !devSegmentIsComplete(seg);
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
  if (typeof devFileImportClearState === 'function') devFileImportClearState();
  if (devInitialized) devRender();
}

function devInit() {
  if (devInitialized) {
    devRender();
    devShowScreen('menu');
    return;
  }
  devLoadState();
  devInitialized = true;

  document.querySelectorAll('[data-dev-open]').forEach(btn => {
    btn.addEventListener('click', () => devShowScreen(btn.dataset.devOpen));
  });
  $('devManagerBack').addEventListener('click', () => devShowScreen('menu'));
  $('devImportBack').addEventListener('click', () => devShowScreen('menu'));

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
  $('devSongSortBtn').addEventListener('click', () => devOpenDevSort('songs'));
  $('devSegmentSortBtn').addEventListener('click', () => devOpenDevSort('segments'));
  $('devPendingToggle').addEventListener('click', () => devSetPending(!devGetPending()));

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
  if (typeof devFileImportInit === 'function') devFileImportInit();
  devShowScreen('menu');
}
