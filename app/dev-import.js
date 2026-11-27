// app/dev-import.js
// 开发者选项：从 .pez / .zip 谱面文件中读取谱面数据。
// 只读取压缩包内的 JSON，不保存音频、图片等资源。

const DEV_IMPORT_STORAGE_KEY = 'dfc_rating_imported_songs_v1';
const DEV_IMPORT_MAX_FILE_BYTES = 30 * 1024 * 1024;
const DEV_IMPORT_MAX_JSON_BYTES = 80 * 1024 * 1024;

let devImportedSongs = [];
let devFileImportReady = false;
let devFileImportBusy = false;
let devFileImportErrors = [];

function devFileU16(view, offset) {
  return view.getUint16(offset, true);
}

function devFileU32(view, offset) {
  return view.getUint32(offset, true);
}

function devFileBaseName(filename) {
  return String(filename || '').replace(/\.[^.]+$/, '') || '未命名谱面';
}

function devFileLevelValue(value) {
  const text = String(value == null ? '' : value);
  const lvMatch = text.match(/Lv\.?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const match = lvMatch || text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function devFileDecodeName(bytes) {
  return new TextDecoder('utf-8').decode(bytes);
}

function devFileFindEocd(bytes, view) {
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (devFileU32(view, i) === 0x06054b50) return i;
  }
  return -1;
}

function devFileReadZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length < 22) throw new Error('文件太小，不是有效的压缩包。');

  const eocd = devFileFindEocd(bytes, view);
  if (eocd < 0) throw new Error('没有找到 ZIP 目录，文件可能已损坏。');

  const count = devFileU16(view, eocd + 10);
  const cdSize = devFileU32(view, eocd + 12);
  const cdOffset = devFileU32(view, eocd + 16);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('暂不支持 ZIP64 格式的谱面文件。');
  }
  if (cdOffset + cdSize > bytes.length) throw new Error('ZIP 目录位置无效。');

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || devFileU32(view, p) !== 0x02014b50) {
      throw new Error('ZIP 目录条目损坏。');
    }
    const flags = devFileU16(view, p + 8);
    const method = devFileU16(view, p + 10);
    const compressedSize = devFileU32(view, p + 20);
    const uncompressedSize = devFileU32(view, p + 24);
    const nameLen = devFileU16(view, p + 28);
    const extraLen = devFileU16(view, p + 30);
    const commentLen = devFileU16(view, p + 32);
    const localOffset = devFileU32(view, p + 42);
    const nameEnd = p + 46 + nameLen;
    if (nameEnd > bytes.length) throw new Error('ZIP 文件名数据损坏。');

    entries.push({
      name: devFileDecodeName(bytes.subarray(p + 46, nameEnd)),
      flags,
      method,
      compressedSize,
      uncompressedSize,
      localOffset
    });
    p = nameEnd + extraLen + commentLen;
  }

  return { bytes, view, entries };
}

async function devFileInflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压 deflate 数据，请使用最新版 Chrome / Edge。');
  }
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const result = await new Response(stream).arrayBuffer();
    return new Uint8Array(result);
  } catch (e) {
    throw new Error('谱面 JSON 解压失败。');
  }
}

async function devFileReadZipEntry(zip, entry) {
  if (entry.flags & 1) throw new Error('压缩包已加密，无法读取。');
  if (entry.compressedSize === 0xffffffff || entry.localOffset === 0xffffffff) {
    throw new Error('暂不支持 ZIP64 格式的谱面文件。');
  }

  const { bytes, view } = zip;
  const p = entry.localOffset;
  if (p + 30 > bytes.length || devFileU32(view, p) !== 0x04034b50) {
    throw new Error('ZIP 文件头损坏。');
  }
  const localNameLen = devFileU16(view, p + 26);
  const localExtraLen = devFileU16(view, p + 28);
  const start = p + 30 + localNameLen + localExtraLen;
  const end = start + entry.compressedSize;
  if (end > bytes.length) throw new Error('ZIP 文件内容不完整。');

  const data = bytes.subarray(start, end);
  if (entry.method === 0) return data.slice();
  if (entry.method === 8) return devFileInflateRaw(data);
  throw new Error(`不支持的 ZIP 压缩方式：${entry.method}。`);
}

async function devFileReadChartJson(buffer) {
  const zip = devFileReadZipEntries(buffer);
  const jsonEntries = zip.entries.filter(entry =>
    /\.json$/i.test(entry.name) && entry.compressedSize > 0
  );
  if (!jsonEntries.length) throw new Error('压缩包内没有 JSON 文件。');

  const errors = [];
  for (const entry of jsonEntries) {
    if (entry.uncompressedSize > DEV_IMPORT_MAX_JSON_BYTES) {
      errors.push(`${entry.name} 过大`);
      continue;
    }
    try {
      const raw = await devFileReadZipEntry(zip, entry);
      if (raw.length > DEV_IMPORT_MAX_JSON_BYTES) throw new Error('JSON 过大');
      const text = new TextDecoder('utf-8').decode(raw).replace(/^\uFEFF/, '');
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('不是 JSON 对象');
      if (!data.META || !Array.isArray(data.judgeLineList)) {
        throw new Error('不是谱面数据');
      }
      return { data, jsonName: entry.name };
    } catch (e) {
      errors.push(`${entry.name}：${e.message || '读取失败'}`);
    }
  }

  throw new Error(`压缩包内没有可读取的谱面 JSON。${errors.length ? ' ' + errors.slice(0, 2).join('；') : ''}`);
}

function devFileParseChartData(data, filename) {
  const meta = data.META && typeof data.META === 'object' ? data.META : {};
  const baseName = devFileBaseName(filename);
  const name = String(meta.name || baseName).trim() || baseName;
  const levelText = String(meta.level == null ? '' : meta.level);

  let noteTotal = 0;
  let yellowTotal = 0;
  for (const line of data.judgeLineList) {
    if (!line || !Array.isArray(line.notes)) continue;
    for (const note of line.notes) {
      if (!note || typeof note !== 'object') continue;
      if (Number(note.isFake) === 1) continue;
      noteTotal += 1;
      if (Number(note.type) === 4) yellowTotal += 1;
    }
  }

  const bpmList = Array.isArray(data.BPMList) ? data.BPMList : [];
  const bpmValues = bpmList
    .map(item => Number(item && item.bpm))
    .filter(n => Number.isFinite(n) && n > 0);
  const bpm = bpmValues.length ? bpmValues[0] : null;

  return {
    _importId: devMakeId('imp'),
    name,
    constant: devFileLevelValue(levelText),
    chartId: null,
    stable: false,
    yellowRatio: noteTotal > 0 ? Number((yellowTotal / noteTotal).toFixed(12)) : 0,
    charter: normalizeSongMeta(meta.charter),
    composer: normalizeSongMeta(meta.composer),
    pending: true,
    sourceFile: String(filename || ''),
    levelText,
    noteTotal,
    yellowTotal,
    bpm,
    _importedAt: Date.now()
  };
}

async function devFileParseChartFile(file) {
  if (!file) throw new Error('没有文件。');
  if (!/\.(pez|zip)$/i.test(file.name || '')) {
    throw new Error('只支持 .pez 或 .zip 文件。');
  }
  if (file.size > DEV_IMPORT_MAX_FILE_BYTES) {
    throw new Error('文件超过 30 MB，暂不支持读取。');
  }

  const buffer = await file.arrayBuffer();
  const { data, jsonName } = await devFileReadChartJson(buffer);
  const item = devFileParseChartData(data, file.name);
  item.jsonFile = jsonName;
  return item;
}

function devFileNormalizeImported(item) {
  const out = {
    _importId: String(item._importId || devMakeId('imp')),
    name: String(item.name || '').trim(),
    constant: devNullableNumber(item.constant),
    chartId: null,
    stable: false,
    yellowRatio: devNullableNumber(item.yellowRatio),
    charter: normalizeSongMeta(item.charter),
    composer: normalizeSongMeta(item.composer),
    // 导入页的待定只能手动关闭，不能因为数据齐全自动解除。
    pending: item.pending !== false,
    sourceFile: String(item.sourceFile || ''),
    jsonFile: String(item.jsonFile || ''),
    levelText: String(item.levelText || ''),
    noteTotal: devNullableNumber(item.noteTotal),
    yellowTotal: devNullableNumber(item.yellowTotal),
    bpm: devNullableNumber(item.bpm),
    _importedAt: Number(item._importedAt) || 0
  };
  return out;
}

function devFileLoadImported() {
  try {
    const raw = JSON.parse(localStorage.getItem(DEV_IMPORT_STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return;
    devImportedSongs = raw
      .filter(item => item && typeof item === 'object')
      .map(devFileNormalizeImported);
  } catch (e) {
    console.warn('[dev-import] 读取本地谱面文件记录失败', e);
  }
}

function devFileSaveImported() {
  try {
    localStorage.setItem(DEV_IMPORT_STORAGE_KEY, JSON.stringify(devImportedSongs));
  } catch (e) {
    console.warn('[dev-import] 保存本地谱面文件记录失败', e);
    devToast('读取记录保存失败，请检查浏览器存储空间');
  }
}

function devFileImportSetStatus(text, isError) {
  const el = $('devImportStatus');
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || '';
  el.classList.toggle('is-error', !!isError);
}

function devFileImportRenderErrors() {
  const el = $('devImportErrors');
  if (!el) return;
  if (!devFileImportErrors.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.innerHTML = `<ul>${devFileImportErrors.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>`;
}

function devFileImportCard(item) {
  const pending = item.pending !== false;
  const name = item.name || '未命名谱面';
  const source = item.sourceFile || '本地文件';
  const levelText = item.levelText || '未读取';
  const constantValue = item.constant == null ? '' : item.constant;
  const bpmText = item.bpm == null ? '—' : devNumber(item.bpm, 2);
  const notesText = item.noteTotal == null ? '—' : devNumber(item.noteTotal, 0);
  const yellowText = item.yellowTotal == null ? '—' : devNumber(item.yellowTotal, 0);
  return `
    <div class="dev-item dev-imported ${pending ? 'is-pending' : ''}" style="--dev-accent:#94a3b8;">
      ${artBoxHtml('')}
      <div class="dev-item-main">
        <div class="dev-item-title">
          <span class="dev-item-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
          <span class="dev-badge new">导入</span>
          ${pending ? '<span class="dev-badge pending">待定</span>' : ''}
        </div>
        <div class="dev-import-edit-row">
          <label>定数 <input class="dev-import-constant" type="number" step="any" min="0" value="${escapeHtml(String(constantValue))}" data-import-constant="${escapeHtml(item._importId)}" /></label>
          <span class="dev-import-origin">原始等级：${escapeHtml(levelText)}</span>
        </div>
        <div class="dev-item-meta">
          Phira ID <b>null</b>
          · 谱师 <b>${escapeHtml(item.charter || '未知')}</b>
          · 曲师 <b>${escapeHtml(item.composer || '未知')}</b>
          · 黄键占比 <b>${devPercent(item.yellowRatio)}</b>
          · 物量 <b>${notesText}</b>（黄键 <b>${yellowText}</b>）
          · BPM <b>${bpmText}</b>
          · 来源 <b>${escapeHtml(source)}</b>
        </div>
      </div>
      <div class="dev-item-actions dev-import-actions">
        <button class="dev-edit" type="button" data-import-toggle="${escapeHtml(item._importId)}" aria-pressed="${pending ? 'true' : 'false'}">待定：${pending ? '开启' : '关闭'}</button>
        ${pending ? '' : `<button class="dev-edit dev-import-upload" type="button" data-import-upload="${escapeHtml(item._importId)}">⬆ 上传到谱面数据</button>`}
        <button class="dev-delete" type="button" data-import-remove="${escapeHtml(item._importId)}">移除</button>
      </div>
    </div>`;
}

function devFileImportRender() {
  const list = $('devImportedList');
  const count = $('devImportedCount');
  if (!list) return;
  if (count) count.textContent = String(devImportedSongs.length);
  if (!devImportedSongs.length) {
    list.innerHTML = '<div class="dev-empty">还没有读取谱面。拖入 .pez / .zip 文件后会显示在这里。</div>';
    return;
  }
  list.innerHTML = devImportedSongs.map(devFileImportCard).join('');
  devObserveCovers(list);
}

function devFileImportUpdateConstant(id, value) {
  const item = devImportedSongs.find(song => song._importId === id);
  if (!item) return;
  const raw = String(value == null ? '' : value).trim();
  const n = raw === '' ? null : Number(raw);
  if (raw !== '' && (!Number.isFinite(n) || n <= 0)) {
    devToast('定数必须是大于 0 的数字');
    return false;
  }
  item.constant = n;
  devFileSaveImported();
  return true;
}

function devFileImportTogglePending(id) {
  const item = devImportedSongs.find(song => song._importId === id);
  if (!item) return;
  if (item.pending !== false) {
    if (!devSongIsComplete(item)) {
      devToast('请先填写有效的定数，再关闭待定');
      return;
    }
    item.pending = false;
  } else {
    item.pending = true;
  }
  devFileSaveImported();
  devFileImportRender();
}

function devFileImportUpload(id) {
  const item = devImportedSongs.find(song => song._importId === id);
  if (!item) return;
  if (item.pending !== false) {
    devToast('请先关闭待定，再上传到谱面数据');
    return;
  }
  if (!devSongIsComplete(item)) {
    devToast('谱面数据不完整：请检查定数和黄键占比');
    return;
  }
  if (typeof devState === 'undefined' || !devState.songs) {
    devToast('开发者数据尚未初始化');
    return;
  }

  const song = {
    name: item.name,
    constant: item.constant,
    chartId: null,
    yellowRatio: item.yellowRatio,
    stable: false,
    charter: item.charter,
    composer: item.composer,
    pending: false,
    _devId: devMakeId('song')
  };
  devState.songs.custom.unshift(song);
  devImportedSongs = devImportedSongs.filter(songItem => songItem._importId !== id);
  devSaveState();
  devFileSaveImported();
  devShowScreen('manager');
  devSetTab('songs');
  devToast('已上传到谱面数据，记得在管理页继续补全或导出');
}

function devFileImportRemove(id) {
  const item = devImportedSongs.find(song => song._importId === id);
  if (!item) return;
  if (!confirm(`确定移除「${item.name || '未命名谱面'}」吗？`)) return;
  devImportedSongs = devImportedSongs.filter(songItem => songItem._importId !== id);
  devFileSaveImported();
  devFileImportRender();
}

function devFileImportClear() {
  if (devFileImportBusy) {
    devToast('正在读取文件，请稍候再清空');
    return;
  }
  if (!devImportedSongs.length) return;
  if (!confirm('确定清空所有已读取但尚未上传的谱面吗？')) return;
  devImportedSongs = [];
  devFileSaveImported();
  devFileImportRender();
  devFileImportSetStatus('已清空读取列表', false);
}

function devFileImportClearState() {
  devImportedSongs = [];
  devFileImportErrors = [];
  devFileSaveImported();
  if (devFileImportReady) {
    devFileImportRender();
    devFileImportRenderErrors();
    devFileImportSetStatus('', false);
  }
}

async function devFileImportHandleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (devFileImportBusy) {
    devToast('正在读取上一批文件，请稍候');
    return;
  }

  devFileImportBusy = true;
  devFileImportErrors = [];
  devFileImportRenderErrors();
  const zone = $('devFileDrop');
  if (zone) zone.classList.add('is-busy');
  devFileImportSetStatus(`正在读取 ${files.length} 个文件…`, false);

  let success = 0;
  for (const file of files) {
    try {
      const item = await devFileParseChartFile(file);
      devImportedSongs.unshift(item);
      success += 1;
    } catch (e) {
      devFileImportErrors.push(`${file.name || '未命名文件'}：${e.message || '读取失败'}`);
    }
  }

  devFileImportBusy = false;
  if (zone) zone.classList.remove('is-busy');
  devFileSaveImported();
  devFileImportRender();
  devFileImportRenderErrors();

  if (devFileImportErrors.length) {
    devFileImportSetStatus(`读取完成：成功 ${success} 个，失败 ${devFileImportErrors.length} 个。`, true);
  } else {
    devFileImportSetStatus(`读取完成：成功读取 ${success} 个谱面文件。`, false);
  }
}

function devFileImportInit() {
  if (devFileImportReady) return;
  devFileImportReady = true;
  devFileLoadImported();

  const zone = $('devFileDrop');
  const input = $('devFileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', (e) => {
    // input.click() fires a bubbling click event; ignore it so the dropzone
    // does not recursively open the file picker.
    if (e.target === input) return;
    if (!devFileImportBusy) input.click();
  });
  zone.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!devFileImportBusy) input.click();
  });
  input.addEventListener('change', () => {
    // 先复制 FileList；清空 input.value 会同时清空 FileList，导致点击选择后无数据。
    const files = Array.from(input.files || []);
    input.value = '';
    devFileImportHandleFiles(files);
  });

  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragleave', (e) => {
    if (e.target === zone) zone.classList.remove('is-dragover');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragover');
    devFileImportHandleFiles(e.dataTransfer.files);
  });

  $('devImportedClear').addEventListener('click', devFileImportClear);
  $('devImportedList').addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-import-toggle]');
    if (toggle) {
      devFileImportTogglePending(toggle.dataset.importToggle);
      return;
    }
    const upload = e.target.closest('[data-import-upload]');
    if (upload) {
      devFileImportUpload(upload.dataset.importUpload);
      return;
    }
    const remove = e.target.closest('[data-import-remove]');
    if (remove) devFileImportRemove(remove.dataset.importRemove);
  });
  $('devImportedList').addEventListener('change', (e) => {
    const input = e.target.closest('[data-import-constant]');
    if (!input) return;
    if (!devFileImportUpdateConstant(input.dataset.importConstant, input.value)) {
      const item = devImportedSongs.find(song => song._importId === input.dataset.importConstant);
      input.value = item && item.constant != null ? item.constant : '';
      return;
    }
    devFileImportRender();
  });

  devFileImportRender();
  devFileImportSetStatus('', false);
}

// dev-import.js loads after dev-tools.js, so initialization must happen here
// instead of relying on the guarded call at the end of dev-tools.js.
if (typeof devFileImportInit === 'function') {
  devFileImportInit();
}
