// app/b50-export.js
// B50 图片导出（原第 15.5 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 15.5 B50 图片导出
// ============================================================
exportB50Btn.addEventListener('click', exportB50Image);

// 把任意比例曲绘等比缩放后居中裁剪成 16:9，模拟 object-fit: cover
// 返回 JPEG DataURL；跨域/加载失败时返回 null，由调用方回退到占位图
const coverThumbCache = new Map();

async function makeCoverThumb(url, width = 720, height = 405, bakeShades = true) {
  const cacheKey = `${url}|${width}x${height}|${bakeShades ? 'shade' : 'plain'}`;
  if (coverThumbCache.has(cacheKey)) return coverThumbCache.get(cacheKey);

  const result = await new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    // 单张曲绘最多等 6 秒，避免个别坏链拖住整个导出
    timer = setTimeout(() => finish(null), 6000);

    const tryLoad = (currentUrl) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 允许跨域读取

      img.onload = () => {
        try {
          const sw = img.naturalWidth;
          const sh = img.naturalHeight;
          if (!sw || !sh) { finish(null); return; }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 等比放大到刚好覆盖目标区域，再居中裁掉溢出部分
          const scale = Math.max(width / sw, height / sh);
          const dw = sw * scale;
          const dh = sh * scale;
          const dx = (width - dw) / 2;
          const dy = (height - dh) / 2;

          ctx.drawImage(img, dx, dy, dw, dh);

          if (bakeShades) {
            // B50 卡片需要顶部/底部压暗渐变，直接烘焙进封面。
            // 不能交给 html2canvas 画浮层背景：在浮层边缘会留下 1px 暗线。
            const topShadeH = Math.round(height * 0.46);
            const topShade = ctx.createLinearGradient(0, 0, 0, topShadeH);
            topShade.addColorStop(0, 'rgba(15,23,42,0.82)');
            topShade.addColorStop(0.55, 'rgba(15,23,42,0.40)');
            topShade.addColorStop(1, 'rgba(15,23,42,0)');
            ctx.fillStyle = topShade;
            ctx.fillRect(0, 0, width, topShadeH);

            const bottomShadeTop = Math.round(height * 0.59);
            const bottomShade = ctx.createLinearGradient(0, bottomShadeTop, 0, height);
            bottomShade.addColorStop(0, 'rgba(15,23,42,0)');
            bottomShade.addColorStop(0.45, 'rgba(15,23,42,0.86)');
            bottomShade.addColorStop(1, 'rgba(15,23,42,0.96)');
            ctx.fillStyle = bottomShade;
            ctx.fillRect(0, bottomShadeTop, width, height - bottomShadeTop);
          }

          finish(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) {
          console.warn('makeCoverThumb 处理失败:', e);
          finish(null);
        }
      };

      img.onerror = () => {
        // 远程曲绘加载失败时，尝试回退到 GitHub Pages
        const fallbackUrl = currentUrl
          .replace(FULL_BASE_URL, FULL_FALLBACK_BASE_URL)
          .replace('https://cdn.jsdelivr.net/gh/Deb1ruN/dfc-rating-covers@main', FULL_FALLBACK_BASE_URL);
        if (fallbackUrl !== currentUrl) {
          tryLoad(fallbackUrl);
        } else {
          finish(null);
        }
      };

      img.src = currentUrl;
    };

    try {
      tryLoad(url);
    } catch (e) {
      console.warn('makeCoverThumb 启动失败:', e);
      finish(null);
    }
  });

  coverThumbCache.set(cacheKey, result);
  return result;
}

// ============================================================
// B50 曲绘预热与持久缓存
// ------------------------------------------------------------
// B50 导出最耗时的是把 50 张曲绘逐张载入、裁切、压暗并转成 DataURL。
// 这里把处理好的 720×405 JPEG 按 Phira 编号存进 IndexedDB，刷新页面后仍可复用；
// 查询成绩后只重新处理 B50 中发生变化的曲绘，其余直接命中缓存。
// ============================================================
const B50_COVER_DB_NAME = 'dfc_rating_b50_covers';
const B50_COVER_DB_VERSION = 1;
const B50_COVER_STORE = 'covers';
const B50_COVER_WIDTH = 720;
const B50_COVER_HEIGHT = 405;
const B50_COVER_PRELOAD_DELAY = 1200;
const B50_COVER_PRELOAD_CONCURRENCY = 3;
const B50_NO_COVER_KEY = '__b50_no_cover__';

const b50CoverMemory = new Map();       // chartId -> 缓存记录
const b50CoverPending = new Map();      // chartId -> 正在处理的 Promise
let b50CoverDbPromise = null;
let b50CoverMemoryReady = null;
let b50CoverPreloadTimer = null;
let b50CoverPreloadToken = 0;
let b50CoverPreloadQueue = Promise.resolve();
let b50CoverPersistWarned = false;

function openB50CoverDb() {
  if (b50CoverDbPromise) return b50CoverDbPromise;

  if (typeof indexedDB === 'undefined') {
    b50CoverDbPromise = Promise.resolve(null);
    return b50CoverDbPromise;
  }

  b50CoverDbPromise = new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(B50_COVER_DB_NAME, B50_COVER_DB_VERSION);
    } catch (e) {
      console.warn('B50 曲绘缓存打开失败，将仅使用内存缓存:', e);
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(B50_COVER_STORE)) {
        db.createObjectStore(B50_COVER_STORE, { keyPath: 'chartId' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // 数据库版本变化时主动关闭，下次访问会重新打开
      db.onversionchange = () => {
        db.close();
        b50CoverDbPromise = null;
        b50CoverMemoryReady = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      console.warn('B50 曲绘缓存打开失败，将仅使用内存缓存:', request.error);
      resolve(null);
    };
    request.onblocked = () => {
      console.warn('B50 曲绘缓存被其他页面占用，将仅使用内存缓存');
      resolve(null);
    };
  });

  return b50CoverDbPromise;
}

function ensureB50CoverMemory() {
  if (b50CoverMemoryReady) return b50CoverMemoryReady;

  b50CoverMemoryReady = (async () => {
    const db = await openB50CoverDb();
    if (!db) return;

    const records = await new Promise((resolve) => {
      try {
        const tx = db.transaction(B50_COVER_STORE, 'readonly');
        const request = tx.objectStore(B50_COVER_STORE).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () => resolve([]);
      } catch (e) {
        console.warn('B50 曲绘缓存读取失败:', e);
        resolve([]);
      }
    });

    records.forEach(record => {
      if (!record || record.chartId === undefined || record.chartId === null) return;
      if (typeof record.dataUrl !== 'string' || !record.dataUrl.startsWith('data:image/')) return;
      b50CoverMemory.set(String(record.chartId), record);
    });
  })().catch(e => {
    console.warn('B50 曲绘缓存初始化失败，将仅使用内存缓存:', e);
  });

  return b50CoverMemoryReady;
}

function persistB50CoverRecord(record) {
  openB50CoverDb().then(db => {
    if (!db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(B50_COVER_STORE, 'readwrite');
        tx.objectStore(B50_COVER_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('B50 曲绘缓存事务失败'));
        tx.onabort = () => reject(tx.error || new Error('B50 曲绘缓存事务中止'));
      } catch (e) {
        reject(e);
      }
    });
  }).catch(e => {
    if (!b50CoverPersistWarned) {
      b50CoverPersistWarned = true;
      console.warn('B50 曲绘缓存写入失败（本次仅保存在内存中）:', e);
    }
  });
}

function deleteB50CoverRecords(ids) {
  if (!ids.length) return Promise.resolve();

  return openB50CoverDb().then(db => {
    if (!db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(B50_COVER_STORE, 'readwrite');
        const store = tx.objectStore(B50_COVER_STORE);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('B50 曲绘缓存清理失败'));
        tx.onabort = () => reject(tx.error || new Error('B50 曲绘缓存清理中止'));
      } catch (e) {
        reject(e);
      }
    });
  }).catch(e => {
    console.warn('B50 曲绘缓存清理失败:', e);
  });
}

async function pruneB50CoverCache(keepIds, token) {
  await ensureB50CoverMemory();
  if (token !== undefined && token !== b50CoverPreloadToken) return;

  // 占位图不属于任何谱面，但需要跨 B50 保留
  const protectedIds = new Set(keepIds);
  protectedIds.add(B50_NO_COVER_KEY);
  const staleIds = [...b50CoverMemory.keys()].filter(id => !protectedIds.has(id));
  if (!staleIds.length) return;
  if (token !== undefined && token !== b50CoverPreloadToken) return;

  staleIds.forEach(id => b50CoverMemory.delete(id));
  await deleteB50CoverRecords(staleIds);
}

function getB50TopResults() {
  return results
    .filter(r => r.rating !== undefined && !isNaN(r.rating) && r.stable !== false)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, TOP_N);
}

async function getB50CoverThumb(chartId, sourceUrl) {
  const key = String(chartId);
  const url = sourceUrl || NO_COVER_URL;

  // 占位图也走同一条缓存路径，导出时不再重复加载
  if (url === NO_COVER_URL) {
    return getB50PlaceholderThumb();
  }

  await ensureB50CoverMemory();

  const cached = b50CoverMemory.get(key);
  if (cached && cached.sourceUrl === url && cached.dataUrl &&
      cached.width === B50_COVER_WIDTH && cached.height === B50_COVER_HEIGHT) {
    return cached.dataUrl;
  }

  if (b50CoverPending.has(key)) return b50CoverPending.get(key);

  const pending = (async () => {
    const thumb = await makeCoverThumb(url, B50_COVER_WIDTH, B50_COVER_HEIGHT);
    if (!thumb) return null;

    const record = {
      chartId: key,
      sourceUrl: url,
      dataUrl: thumb,
      width: B50_COVER_WIDTH,
      height: B50_COVER_HEIGHT,
      updatedAt: Date.now()
    };
    b50CoverMemory.set(key, record);
    // 不阻塞导出；即使写入失败，当前内存缓存也已经可用
    persistB50CoverRecord(record);
    return thumb;
  })();

  b50CoverPending.set(key, pending);
  try {
    return await pending;
  } finally {
    if (b50CoverPending.get(key) === pending) b50CoverPending.delete(key);
  }
}

async function getB50PlaceholderThumb() {
  const key = B50_NO_COVER_KEY;
  await ensureB50CoverMemory();

  const cached = getCachedB50CoverThumb(key);
  if (cached) return cached;
  if (b50CoverPending.has(key)) return b50CoverPending.get(key);

  const pending = (async () => {
    const thumb = await makeCoverThumb(NO_COVER_URL, B50_COVER_WIDTH, B50_COVER_HEIGHT);
    if (!thumb) return null;

    const record = {
      chartId: key,
      sourceUrl: NO_COVER_URL,
      dataUrl: thumb,
      width: B50_COVER_WIDTH,
      height: B50_COVER_HEIGHT,
      updatedAt: Date.now()
    };
    b50CoverMemory.set(key, record);
    persistB50CoverRecord(record);
    return thumb;
  })();

  b50CoverPending.set(key, pending);
  try {
    return await pending;
  } finally {
    if (b50CoverPending.get(key) === pending) b50CoverPending.delete(key);
  }
}

function getCachedB50CoverThumb(chartId) {
  const cached = b50CoverMemory.get(String(chartId));
  if (!cached || !cached.dataUrl) return null;
  if (cached.width !== B50_COVER_WIDTH || cached.height !== B50_COVER_HEIGHT) return null;
  return cached.dataUrl;
}

function scheduleB50CoverPreload(delay = B50_COVER_PRELOAD_DELAY) {
  const token = ++b50CoverPreloadToken;

  if (b50CoverPreloadTimer) {
    clearTimeout(b50CoverPreloadTimer);
    b50CoverPreloadTimer = null;
  }

  // 没有有效的 B50 时不预热，也不清理已有缓存
  if (getB50TopResults().length === 0) return;

  b50CoverPreloadTimer = setTimeout(() => {
    b50CoverPreloadTimer = null;
    // 串行执行预热，避免旧一轮的清理与新一轮写入互相覆盖
    b50CoverPreloadQueue = b50CoverPreloadQueue
      .then(() => preloadB50Covers(token))
      .catch(e => console.warn('B50 曲绘预加载异常:', e));
  }, Math.max(0, Number(delay) || 0));
}

function abortB50CoverPreload() {
  b50CoverPreloadToken++;
  if (b50CoverPreloadTimer) {
    clearTimeout(b50CoverPreloadTimer);
    b50CoverPreloadTimer = null;
  }
}

async function preloadB50Covers(token) {
  if (token !== b50CoverPreloadToken) return;

  const top = getB50TopResults();
  if (!top.length) return;

  await ensureB50CoverMemory();
  if (token !== b50CoverPreloadToken) return;

  // 占位图只处理一次，之后无曲绘/无 Phira ID 的谱面直接复用
  try {
    await getB50PlaceholderThumb();
  } catch (e) {
    console.warn('B50 占位图预加载失败:', e);
  }
  if (token !== b50CoverPreloadToken) return;

  // 同一张曲绘可能在同一份 B50 中出现多次，只预加载一次
  const targets = [];
  const seen = new Set();
  top.forEach(r => {
    const song = SONG_DATA[r.index];
    if (!song || !song.chartId) return;
    const id = String(song.chartId);
    if (seen.has(id)) return;
    seen.add(id);
    targets.push(id);
  });
  if (!targets.length) return;

  let nextIndex = 0;
  let loadedCount = 0;
  const worker = async () => {
    while (true) {
      if (token !== b50CoverPreloadToken) return;
      const index = nextIndex++;
      if (index >= targets.length) return;

      // 查询成绩期间让出网络，查询结束后自动继续
      while (illustSuspended && token === b50CoverPreloadToken) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (token !== b50CoverPreloadToken) return;

      const chartId = targets[index];
      try {
        const sourceUrl = (await getIllustration(chartId, 'thumb')) || NO_COVER_URL;
        if (token !== b50CoverPreloadToken) return;
        const thumb = await getB50CoverThumb(chartId, sourceUrl);
        if (thumb) loadedCount++;
      } catch (e) {
        console.warn('B50 曲绘预加载失败:', chartId, e);
      }
    }
  };

  const workerCount = Math.min(B50_COVER_PRELOAD_CONCURRENCY, targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (token !== b50CoverPreloadToken) return;

  await pruneB50CoverCache(new Set(targets), token);
  console.log(`📷 B50 曲绘预加载完成：${loadedCount}/${targets.length}`);
}

// html2canvas 内部会反复 getImageData 做像素采样；临时给 2D 上下文加上
// willReadFrequently，浏览器会改用更适合频繁读回的 CPU 后端，避免控制台警告。
async function withWillReadFrequently(fn) {
  if (typeof HTMLCanvasElement === 'undefined' ||
      !HTMLCanvasElement.prototype ||
      typeof HTMLCanvasElement.prototype.getContext !== 'function') {
    return fn();
  }

  const proto = HTMLCanvasElement.prototype;
  const original = proto.getContext;
  let patched = false;
  try {
    proto.getContext = function (type, attrs) {
      if (type === '2d') {
        attrs = Object.assign({}, attrs, { willReadFrequently: true });
      }
      return original.call(this, type, attrs);
    };
    patched = proto.getContext !== original;
  } catch (e) {
    patched = false;
  }

  try {
    return await fn();
  } finally {
    if (patched) proto.getContext = original;
  }
}

async function exportB50Image() {
  if (typeof html2canvas === 'undefined') {
  alert('核心组件(html2canvas)加载失败，请刷新页面或检查网络后重试！');
  return;
  }
  if (results.length === 0) {
    alert('没有可导出的成绩数据。\n请先输入 ACC 并点击「⚡ 计算」，或使用「▶ 开始查询」获取成绩。');
    return;
  }

  const top50 = getB50TopResults();

  if (top50.length === 0) {
    alert('没有可导出的成绩数据。');
    return;
  }

  // 统计值
  const ratings = top50.map(r => r.rating);
  const sumRating = ratings.reduce((s, v) => s + v, 0);
  const avgRating = sumRating / ratings.length;
  const maxRating = Math.max(...ratings);
  const minRating = Math.min(...ratings);
  const segmentForceRating = getMaxSegmentRating();

  // 头像（仅本地 DataURL）
  const avatarSrc = localAvatarDataURL || '';

  // 防止与自动查询冲突（两者共用同一条进度条）
  if (queryRunning) {
    alert('请先等待当前的自动查询完成，再进行导出。');
    return;
  }
  // 暂停后台曲绘预加载和页面曲绘加载，但保留请求队列给导出流程取图
  abortB50CoverPreload();
  abortPreload();
  suspendIllustLoading(false);
  // 按钮进入状态
  exportB50Btn.disabled = true;
  const origText = exportB50Btn.textContent;
  exportB50Btn.textContent = '⏳ 导出中...';

  // 保存 exportContainer 的原有样式
  const prevWidth = exportContainer.style.width;
  const prevPadding = exportContainer.style.padding;

  // ===== 显示主页面进度条，用于展示导出进度 =====
  const totalItems = top50.length;
  const updateProgress = (done, text) => {
    progressBar.style.width = (done / totalItems * 100) + '%';
    queryProgressText.textContent = text;
  };
  progressBarWrap.classList.add('active');
  queryTimer.classList.remove('active', 'running');   // 隐藏计时器
  queryCurrentChart.textContent = '';
  updateProgress(0, `准备导出 B50 · 0/${totalItems}`);

  try {
    // 先把持久缓存读入内存，命中时连 getIllustration 都可以跳过
    await ensureB50CoverMemory();

    // 预加载所有曲绘的 thumb 版本，构建 items
    const items = [];
    for (let i = 0; i < top50.length; i++) {
      const r = top50[i];
      const song = SONG_DATA[r.index];
      let cover = null;
      if (song && song.chartId) {
        // 已预热的曲绘直接使用，避免逐张等待 manifest/API
        cover = getCachedB50CoverThumb(song.chartId);
        if (!cover) {
          const coverUrl = (await getIllustration(song.chartId, 'thumb')) || NO_COVER_URL;
          // 没有缓存时再现场处理并写入缓存
          cover = await getB50CoverThumb(song.chartId, coverUrl);
        }
      } else {
        // 没有 Phira ID：直接走占位图缓存，不进入谱面查询
        cover = getCachedB50CoverThumb(B50_NO_COVER_KEY);
        if (!cover) cover = await getB50PlaceholderThumb();
      }
      // 预先裁成 16:9，确保曲绘完整铺满卡片，且不受 html2canvas object-fit 兼容性影响
      if (!cover) cover = await makeCoverThumb(NO_COVER_URL, 720, 405);
      const illustUrl = cover || NO_COVER_URL;
      items.push({
        rank: i + 1,
        name: r.name,
        constant: r.constant,
        acc: r.acc,
        stacc: r.stacc,
        rating: r.rating,
        illustUrl,
        constStyle: getConstBadgeStyle(r.constant),
        staccColor: getStaccColor((r.stacc || 0) / 100)
      });

      // 更新进度
      updateProgress(i + 1, `处理曲绘 ${i + 1}/${totalItems}`);
    }

    // 图片处理完毕，进入渲染阶段
    queryProgressText.textContent = `正在合成图片（${totalItems} 首）...`;

    // 构建 HTML
    const html = buildB50ExportHTML({
      playerName: playerName || '未命名玩家',
      playerId: playerId || '',
      avatarSrc,
      avgRating,
      maxRating,
      minRating,
      segmentForceRating,
      itemCount: items.length,
      items
    });

    // 设置容器为 1700 宽、无 padding，容纳大画布
    exportContainer.style.width = '1700px';
    exportContainer.style.padding = '0';
    exportContainer.innerHTML = html;

    // 等 DOM 布局完成
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 等所有图片加载完成（最多 10 秒）
    await new Promise((resolve) => {
      const imgs = exportContainer.querySelectorAll('img');
      if (imgs.length === 0) { resolve(); return; }
      let pending = imgs.length;
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      imgs.forEach(img => {
        if (img.complete) {
          pending--;
          if (pending === 0) finish();
        } else {
          img.addEventListener('load', () => { pending--; if (pending === 0) finish(); }, { once: true });
          img.addEventListener('error', () => { pending--; if (pending === 0) finish(); }, { once: true });
        }
      });
      setTimeout(finish, 10000);
    });

    // 先在 2x 下渲染，让文字和细线获得足够的超采样
    const canvas = await withWillReadFrequently(() => html2canvas(exportContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1700,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    }));

    // 再高质量缩到 2550px 宽（1.5x）作为最终输出：
    // 体积按 1.5x 计算，但文字边缘来自 2x 降采样，比直接 1.5x 渲染更干净
    const outputWidth = 2550;
    const outputHeight = Math.round(canvas.height * (outputWidth / canvas.width));
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = 'high';
    outputCtx.drawImage(canvas, 0, 0, outputWidth, outputHeight);

    // WebP 体积更小，文字边缘也比 JPEG 保持得更好；不支持时回退 JPEG
    const supportsWebP = (() => {
      try {
        const test = document.createElement('canvas');
        test.width = 1;
        test.height = 1;
        return test.toDataURL('image/webp').startsWith('data:image/webp');
      } catch (e) {
        return false;
      }
    })();
    const outputType = supportsWebP ? 'image/webp' : 'image/jpeg';
    const outputQuality = supportsWebP ? 0.94 : 0.95;

    const safePlayer = (playerName || playerId || 'player').replace(/[/\\?%*:|"<>]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    await new Promise((resolve) => {
      outputCanvas.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const extMap = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
        const ext = extMap[blob.type] || (supportsWebP ? 'webp' : 'jpg');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `B50_${safePlayer}_${dateStr}.${ext}`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve();
      }, outputType, outputQuality);
    });
  } catch (err) {
    console.error(err);
    alert('导出 B50 失败：' + err.message);
  } finally {
    exportB50Btn.disabled = false;
    exportB50Btn.textContent = origText;
    exportContainer.style.width = prevWidth;
    exportContainer.style.padding = prevPadding;
    progressBarWrap.classList.remove('active');
    progressBar.style.width = '0%';
    queryProgressText.textContent = '就绪';
    
    // 恢复后台进程
    resumeIllustLoading();
  }
}

// B50 卡片曲名可用宽度（308px 卡片、左右 13px padding、难度角标 + 间距后约 205px）
// html2canvas 对 CSS text-overflow 的支持不稳定，这里直接按字体宽度截断并补省略号
const B50_NAME_MAX_WIDTH = 205;
let b50NameMeasureCtx = null;

function truncateB50Name(text) {
  const raw = String(text || '');
  if (!raw) return '';

  try {
    if (!b50NameMeasureCtx) {
      const canvas = document.createElement('canvas');
      b50NameMeasureCtx = canvas.getContext('2d');
    }
    if (!b50NameMeasureCtx) throw new Error('no canvas context');

    b50NameMeasureCtx.font = '800 15px "Microsoft YaHei", "微软雅黑", sans-serif';
    if (b50NameMeasureCtx.measureText(raw).width <= B50_NAME_MAX_WIDTH) return raw;

    const chars = Array.from(raw);
    let low = 0;
    let high = chars.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = chars.slice(0, mid).join('') + '…';
      if (b50NameMeasureCtx.measureText(candidate).width <= B50_NAME_MAX_WIDTH) low = mid;
      else high = mid - 1;
    }
    return chars.slice(0, low).join('').replace(/\s+$/, '') + '…';
  } catch (e) {
    return raw.length > 18 ? raw.slice(0, 18) + '…' : raw;
  }
}

// 构建 B50 导出 HTML
function buildB50ExportHTML(d) {
  const avatarHTML = d.avatarSrc
    ? `<img class="b50-avatar" src="${d.avatarSrc}" alt="" />`
    : '';

  // 卡片渲染：整张曲绘作为背景，信息以浮层形式压在图上
  const cardsHTML = d.items.map(item => {
    const constValue = Number(item.constant);
    const constText = Number.isFinite(constValue) ? constValue.toFixed(1) : '—';
    return `
    <div class="b50-card">
      <img class="b50-bg" src="${item.illustUrl}" alt="" />
      <div class="b50-top">
        <div class="b50-rank">#${item.rank}</div>
        <div class="b50-rating-box">
          <div class="b50-rating-label">RATING</div>
          <div class="b50-rating-value">${item.rating.toFixed(2)}</div>
        </div>
      </div>
      <div class="b50-bottom">
        <div class="b50-meta">
          <div class="b50-name">${escapeHtml(truncateB50Name(item.name))}</div>
          <div class="b50-stats-line">
            <span class="b50-acc">ACC ${item.acc.toFixed(2)}%</span>
            <span class="b50-stacc" style="color:${item.staccColor};">STACC ${(item.stacc || 0).toFixed(2)}%</span>
          </div>
        </div>
        <div class="b50-const" style="background:${item.constStyle.bg};color:${item.constStyle.color};">${constText}</div>
      </div>
    </div>
  `;
  }).join('');

  return `
    <style>
      /* 强制覆盖所有子元素的字体 */
      .b50-wrapper, .b50-wrapper * {
        font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, sans-serif !important;
      }
      .b50-wrapper {
        width: 1700px;
        /* 背景画布增加浅灰底色，凸显卡片 */
        background: #f1f5f9;
        padding: 40px 40px 48px;
        color: #1e293b;
        box-sizing: border-box;
      }

      /* ===== 顶部信息区 ===== */
      .b50-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 32px;
        padding: 24px 28px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        margin-bottom: 24px;
        border: 1px solid #e2e8f0;
      }
      .b50-player {
        display: flex;
        align-items: center;
        gap: 20px;
        min-width: 0;
      }
      .b50-avatar {
        width: 88px;
        height: 88px;
        border-radius: 16px;
        object-fit: cover;
        border: 3px solid #2563eb;
        box-shadow: 0 4px 14px rgba(37,99,235,0.20);
        flex-shrink: 0;
        background: #f1f5f9;
      }
      .b50-player-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .b50-player-name {
        font-size: 32px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 600px;
        letter-spacing: -0.5px;
      }
      .b50-player-id {
        font-size: 15px;
        color: #64748b;
        font-weight: 500;
      }

      /* 数据区 */
      .b50-stats {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-shrink: 0;
      }
      
      /* 平均 Rating 框：渐变底色，深蓝数字 */
      .b50-main-stat {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        background: linear-gradient(135deg, #eff6ff, #e0e7ff);
        padding: 12px 24px;
        border-radius: 16px;
        border: 1.5px solid #bfdbfe;
        box-shadow: 0 2px 8px rgba(37,99,235,0.06);
      }
      .b50-main-stat-value {
        font-size: 48px;
        font-weight: 900;
        color: #1e3a8a; /* 深邃蓝，与浅色渐变底产生高对比 */
        line-height: 1;
        font-variant-numeric: tabular-nums;
        letter-spacing: -1px;
      }
      .b50-main-stat-label {
        font-size: 13px;
        color: #3b82f6;
        font-weight: 700;
        margin-top: 6px;
        letter-spacing: 1px;
      }

      /* 剩余三个小数据框 */
      .b50-sub-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .b50-sub-stat {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        font-size: 13px;
        color: #64748b;
        font-weight: 600;
        background: #f8fafc;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .b50-sub-stat span {
        font-size: 16px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      /* 分割线 */
      .b50-divider {
        height: 2px;
        background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        margin: 24px 8px;
        border-radius: 2px;
      }

      /* ===== 卡片网格：5 列 × 10 行，每张卡片固定 16:9 ===== */
      .b50-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
      }
      .b50-card {
        position: relative;
        /* 1700 宽、左右各 40 padding、5 列、20 gap 时，卡片宽 308px；308 × 9 / 16 = 173.25 */
        height: 173.25px;
        background: #0f172a;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 5px 16px rgba(15,23,42,0.18);
        box-sizing: border-box;
      }

      /* 整张曲绘作为卡片背景（已提前裁成 16:9） */
      .b50-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        z-index: 0;
      }

      /* 顶部：排名（左上）+ 单曲 Rating（右上） */
      .b50-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        z-index: 2;
      }
      .b50-rank {
        flex-shrink: 0;
        background: rgba(15,23,42,0.72);
        border: 1px solid rgba(255,255,255,0.30);
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        line-height: 1;
        padding: 5px 9px;
        border-radius: 999px;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.45);
      }
      .b50-rating-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1px;
        padding: 4px 9px 5px;
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(37,99,235,0.94), rgba(79,70,229,0.94));
        border: 1px solid rgba(255,255,255,0.28);
        box-shadow: 0 3px 10px rgba(15,23,42,0.28);
      }
      .b50-rating-label {
        font-size: 8px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 1.2px;
        color: rgba(255,255,255,0.78);
      }
      .b50-rating-value {
        font-size: 24px;
        line-height: 1;
        font-weight: 900;
        color: #ffffff;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.5px;
        text-shadow: 0 1px 3px rgba(0,0,0,0.25);
      }

      /* 底部：曲名 / ACC / STACC（左下）+ 难度（右下） */
      .b50-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 13px;
        z-index: 2;
      }
      .b50-meta {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .b50-name {
        font-size: 15px;
        line-height: 1.2;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        text-shadow: 0 1px 4px rgba(0,0,0,0.55);
      }
      .b50-stats-line {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        font-size: 12px;
        line-height: 1;
        font-weight: 700;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 1px 3px rgba(0,0,0,0.55);
      }
      .b50-acc {
        color: rgba(255,255,255,0.92);
      }
      .b50-stacc {
        padding-left: 9px;
        border-left: 1px solid rgba(255,255,255,0.22);
      }
      .b50-const {
        flex-shrink: 0;
        font-size: 17px;
        line-height: 1;
        font-weight: 900;
        padding: 5px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.35);
        box-shadow: 0 2px 8px rgba(0,0,0,0.22);
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.2px;
      }
    </style>
    <div class="b50-wrapper">
      <div class="b50-header">
        <div class="b50-player">
          ${avatarHTML}
          <div class="b50-player-info">
            <div class="b50-player-name">${escapeHtml(d.playerName)}</div>
            <div class="b50-player-id">Phira ID: ${escapeHtml(d.playerId || '—')}</div>
          </div>
        </div>
        
        <!-- 核心数据区 -->
        <div class="b50-stats">
          <div class="b50-sub-stats">
            <div class="b50-sub-stat">最高 <span style="color:#10b981;">${d.maxRating.toFixed(2)}</span></div>
            <div class="b50-sub-stat">最低 <span style="color:#f59e0b;">${d.minRating.toFixed(2)}</span></div>
            <div class="b50-sub-stat">有效谱面 <span style="color:#8b5cf6;">${d.itemCount}</span></div>
          </div>
          <div class="b50-main-stat">
            <div class="b50-main-stat-value">${d.avgRating.toFixed(2)}</div>
            <div class="b50-main-stat-label">平均 Rating</div>
          </div>
          <div class="b50-main-stat">
            <div class="b50-main-stat-value">${(d.segmentForceRating !== null && d.segmentForceRating !== undefined && !isNaN(d.segmentForceRating)) ? Number(d.segmentForceRating).toFixed(2) : '—'}</div>
            <div class="b50-main-stat-label">段位力 Rating</div>
          </div>
        </div>
      </div>

      <!-- 新增：美观的分割线 -->
      <div class="b50-divider"></div>

      <div class="b50-grid">
        ${cardsHTML}
      </div>
    </div>
  `;
}

concurrencySlider.addEventListener('input', function() {
  concurrencyValue.textContent = this.value;
  localStorage.setItem(KEY.concurrency, this.value);
});
truncateToggle.addEventListener('change', function() {
  localStorage.setItem(KEY.truncate, String(this.checked));
  maxRankInput.disabled = !this.checked;
  maxRankInput.style.opacity = this.checked ? '1' : '0.5';
});
maxRankInput.addEventListener('change', function() {
  let v = parseInt(this.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  this.value = v;
  localStorage.setItem(KEY.maxRank, String(v));
});

