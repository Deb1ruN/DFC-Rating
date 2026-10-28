// app/navigation-covers.js
// 页面切换、曲绘与谱面元数据加载（原第 9–10 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 9. 页面切换
// ============================================================
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === name));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  if (name === 'preview') renderPreview();
  if (name === 'main') updateDisplay();
  if (name === 'segment') segUpdateCharts();
  if (name !== 'detail') {
    // 离开详情页时清空当前谱面记录
    detailCurrentSong = null;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
}
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

songTableBodyWrap.addEventListener('scroll', () => {
  songTableHeader.scrollLeft = songTableBodyWrap.scrollLeft;
}, { passive: true });

// ============================================================
// 10. 曲绘 / 谱面元数据加载
// ============================================================
async function getIllustration(chartId, size = 'thumb') {
  if (!chartId) return null;
  const key = String(chartId);
  await localCoverManifestReady;

  // 【优化】优先读取本地 manifest，直接返回，绝不排队等待
  if (localCoverManifest && localCoverManifest[key]) {
    const entry = localCoverManifest[key];
    let filename = '';
    if (typeof entry === 'object' && entry !== null) {
      filename = entry[size] || entry.thumb || entry.full;
    } else if (typeof entry === 'string') {
      filename = entry;
    }

    if (filename) {
      if (size === 'full') {
        return `${FULL_BASE_URL}/full/${entry.full}`;
      } else {
        return `${THUMB_BASE_URL}/thumb/${entry.thumb || filename}`;
      }
    }
  }

  // 只有在本地没有 manifest 缓存时，才进入队列去请求 Phira API
  if (illustPending.has(key)) return illustPending.get(key);

  const p = runIllustTask(() =>
    fetch(`${API_BASE}/chart/${chartId}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => d.illustration || null)
  )
    .then(url => { illustPending.delete(key); return url; })
    .catch(() => { illustPending.delete(key); return null; });

  illustPending.set(key, p);
  return p;
}

function getChartMeta(chartId) {
  if (!chartId) return Promise.resolve(null);
  const key = String(chartId);
  if (chartMetaCache[key] !== undefined) return Promise.resolve(chartMetaCache[key]);
  if (chartMetaPending.has(key)) return chartMetaPending.get(key);

  const p = runIllustTask(() =>
    fetch(`${API_BASE}/chart/${chartId}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => {
        const meta = {
          charter: (typeof d.charter === 'string' && d.charter.trim()) ? d.charter : '',
          composer: (typeof d.composer === 'string' && d.composer.trim()) ? d.composer : '',
          illustration: d.illustration || null
        };
        chartMetaCache[key] = meta;
        try { localStorage.setItem(KEY.chartMeta, JSON.stringify(chartMetaCache)); } catch (e) {}
        return meta;
      })
  )
    .then(meta => { chartMetaPending.delete(key); return meta; })
    .catch(() => {
      const meta = { charter: '', composer: '', illustration: null };
      chartMetaCache[key] = meta;
      try { localStorage.setItem(KEY.chartMeta, JSON.stringify(chartMetaCache)); } catch (e) {}
      chartMetaPending.delete(key);
      return meta;
    });

  chartMetaPending.set(key, p);
  return p;
}

// 曲绘加载「暂停」标志：查询成绩期间设为 true，避免抢网络带宽
let illustSuspended = false;
// 暂停期间累积的 art-box，查询结束后统一处理
const pendingIllustBoxes = new Set();

// ================= 请求队列（限制曲绘 / 元数据请求的并发，避免占满同域名连接池） =================
const illustTaskQueue = [];
let illustTaskRunning = 0;
const ILLUST_MAX_CONCURRENT = 2;   // 页面空闲时最多 2 个曲绘/元数据请求并发
let illustQueueFrozen = false;     // 查询成绩期间冻结整个队列

function runIllustTask(fn) {
  return new Promise((resolve, reject) => {
    illustTaskQueue.push({ fn, resolve, reject });
    pumpIllustTaskQueue();
  });
}

function pumpIllustTaskQueue() {
  if (illustQueueFrozen) return;
  while (illustTaskRunning < ILLUST_MAX_CONCURRENT && illustTaskQueue.length > 0) {
    const item = illustTaskQueue.shift();
    illustTaskRunning++;
    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(() => {
        illustTaskRunning--;
        pumpIllustTaskQueue();
      });
  }
}

// 真正发起曲绘加载（从 observer 回调和恢复流程里调用）
function loadArtBox(el) {
  const chartId = el.dataset.chartid;
  const img = el.querySelector('img');
  const ph = el.querySelector('.art-ph');

  const showImage = (src) => {
    if (img) { img.src = src; img.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
  };

  if (!chartId) {
    showImage(NO_COVER_URL);
    return;
  }
  // 表格缩略图 → 使用 thumb
  getIllustration(chartId, 'thumb').then(url => {
    showImage(url || NO_COVER_URL);
  });
}

const illustObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    illustObserver.unobserve(el);

    if (illustSuspended) {
      // 查询成绩期间：不立即加载，先入队，查询结束后统一处理
      pendingIllustBoxes.add(el);
      return;
    }
    loadArtBox(el);
  });
}, { rootMargin: '300px' });

// 暂停/恢复曲绘加载（查询成绩期间用）
// freezeQueue=false 时只暂停页面滚动触发的加载，仍允许导出流程主动请求曲绘
function suspendIllustLoading(freezeQueue = true) {
  illustSuspended = true;
  illustQueueFrozen = freezeQueue;
  if (!freezeQueue) pumpIllustTaskQueue();   // 导出流程需要继续消化已有的取图任务
}

function resumeIllustLoading() {
  illustSuspended = false;
  illustQueueFrozen = false;
  pumpIllustTaskQueue();      // 唤醒队列，继续处理
  // 处理查询期间累积的元素（页面切换可能已重建，需判断还在 DOM 中）
  pendingIllustBoxes.forEach(el => {
    if (document.body.contains(el)) loadArtBox(el);
  });
  pendingIllustBoxes.clear();
}

// ================= 后台预加载原图（空闲时进行，查询等任务时暂停） =================
let preloadRunning = false;
let preloadAborted = false;

async function preloadAllFullCovers() {
  if (preloadRunning) return;
  preloadRunning = true;
  preloadAborted = false;

  // 等 manifest 就绪
  await localCoverManifestReady;

  if (!localCoverManifest) {
    console.log('📷 无本地 manifest，跳过原图预加载');
    preloadRunning = false;
    return;
  }

  const songs = SONG_DATA.filter(s => s.chartId && localCoverManifest[String(s.chartId)]);
  const total = songs.length;
  let loadedCount = 0;

  console.log(`📷 开始预加载原图，共 ${total} 张`);

  for (const song of songs) {
    if (preloadAborted) break;

    // 如果当前有查询等任务在跑，暂停预加载（每 500ms 检查一次）
    while (illustSuspended && !preloadAborted) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (preloadAborted) break;

    const key = String(song.chartId);
    const entry = localCoverManifest[key];
    if (!entry || typeof entry !== 'object' || !entry.full) continue;

    const url = `${FULL_BASE_URL}/full/${entry.full}`;

    // 走统一队列，与缩略图共享并发限制；查询时队列冻结会自动推迟
    await new Promise(resolve => {
      runIllustTask(() => new Promise(res => {
        const img = new Image();
        img.onload = () => res();
        img.onerror = () => res();
        img.src = url;
      })).then(resolve).catch(resolve);
    });

    loadedCount++;
  }

  preloadRunning = false;
  if (preloadAborted) {
    console.log(`📷 原图预加载已中止（已加载 ${loadedCount}/${total}）`);
  } else {
    console.log(`📷 原图预加载完成，共 ${loadedCount} 张`);
  }
}

// 中止预加载（如需重置状态时调用）
function abortPreload() {
  preloadAborted = true;
  preloadRunning = false;
}

function makeArtBox(chartId) {
  const div = document.createElement('div');
  div.className = 'art-box';
  div.dataset.chartid = chartId || '';
  if (!chartId) {
    // 无 chartId：直接显示占位图
    div.innerHTML = `<img src="${NO_COVER_URL}" alt="无曲绘" />`;
  } else {
    // 有 chartId：加入自动降级逻辑
    div.innerHTML = `<img style="display:none;" alt="" /><div class="art-ph">无图</div>`;
  }
  return div;
}
function artBoxHtml(chartId) {
  if (!chartId) {
    return `<div class="art-box"><img src="${NO_COVER_URL}" alt="无曲绘" /></div>`;
  }
  return `<div class="art-box" data-chartid="${chartId}"><img style="display:none;" alt="" /><div class="art-ph">无图</div></div>`;
}
