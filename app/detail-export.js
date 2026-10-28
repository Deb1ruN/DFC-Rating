// app/detail-export.js
// 单曲成绩图片导出（原第 17.1 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 17.1 单曲成绩导出（详情页）
// ============================================================
detailExportBtn.addEventListener('click', detailExportImage);

async function detailExportImage() {
  if (typeof html2canvas === 'undefined') {
  alert('核心组件(html2canvas)加载失败，请刷新页面或检查网络后重试！');
  return;
  }
  if (!detailCurrentSong) { alert('请先打开一个谱面详情'); return; }

  if (detailCurrentSong.isSegment) {
    return segmentDetailExportImage();
  }
  
  if (queryRunning) {
    alert('请先等待当前的自动查询完成，再进行导出。');
    return;
  }
  
  // 暂停后台加载，但保留请求队列给导出流程取图
  abortPreload();
  suspendIllustLoading(false);

  const song = detailCurrentSong;
  const songIndex = SONG_DATA.indexOf(song);
  if (songIndex < 0) return;

  // 玩家 ACC
  const accStr = inputs[songIndex] ? inputs[songIndex].value.trim() : '';
  const acc = parseFloat(accStr);
  if (accStr === '' || isNaN(acc) || acc < 0 || acc > 100) {
    alert('该谱面未填写 ACC，无法导出成绩图');
    return;
  }

  // 基础计算
  const D = song.yellowRatio || 0;
  const stacc = calcSTACC(acc / 100, D);
  const staccPct = stacc !== null ? stacc * 100 : 0;
  const rating = calcSingleRating(song.constant, stacc || 0);

  // 三个基准 ACC
  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);
  const passPct = passAcc !== null ? passAcc * 100 : 0;
  const backlightPct = backlightAcc !== null ? backlightAcc * 100 : 0;
  const breakPct = breakAcc !== null ? breakAcc * 100 : 0;

  // B50 排名
  const sorted = [...results].sort((a, b) => b.rating - a.rating);
  const b50 = sorted.slice(0, TOP_N);
  const idxInB50 = b50.findIndex(r => r.index === songIndex);
  const rankText = idxInB50 >= 0 ? ('#' + (idxInB50 + 1)) : '未进入 B50';

  // 曲绘 URL（本地原图）
const useFull = getSettingUseFullCover() === 'on';
const illustUrl = await getIllustration(song.chartId, useFull ? 'full' : 'thumb');
  if (!illustUrl) {
    alert('该谱面无曲绘，无法导出');
    return;
  }

  // 预加载曲绘，获取真实尺寸，用于让容器跟随图片比例
  const imgSize = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = illustUrl;
  });

  // 根据图片比例计算展示尺寸（最长边不超过上限）
  const MAX_ART_W = 440;
  const MAX_ART_H = 300;
  let artW = 400, artH = 225;
  if (imgSize && imgSize.w > 0 && imgSize.h > 0) {
    const scale = Math.min(MAX_ART_W / imgSize.w, MAX_ART_H / imgSize.h);
    artW = Math.round(imgSize.w * scale);
    artH = Math.round(imgSize.h * scale);
  }

  // 头像（仅使用本地上传的 DataURL）
  const avatarSrc = localAvatarDataURL || '';
  const pName = playerName || '未命名玩家';

  // STACC 颜色
  const staccColor = getStaccColor(stacc);

  // 难度样式
  const cStyle = getConstBadgeStyle(song.constant);

  // 按钮进入状态
  detailExportBtn.disabled = true;
  const originalText = detailExportBtn.textContent;
  detailExportBtn.textContent = '⏳ 导出中...';

  try {
    const html = buildSoloExportHTML({
      song,
      illustUrl,
      artW,
      artH,
      avatarSrc,
      playerName: pName,
      acc,
      staccPct,
      staccColor,
      rating,
      rankText,
      cStyle,
      passPct,
      backlightPct,
      breakPct
    });
    exportContainer.innerHTML = html;

    // 等图片 DOM 就绪
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 额外等图片元素真正 onload
    await new Promise((resolve) => {
      const imgs = exportContainer.querySelectorAll('img');
      if (imgs.length === 0) { resolve(); return; }
      let pending = imgs.length;
      imgs.forEach(img => {
        if (img.complete) {
          pending--;
          if (pending === 0) resolve();
        } else {
          img.addEventListener('load', () => { pending--; if (pending === 0) resolve(); });
          img.addEventListener('error', () => { pending--; if (pending === 0) resolve(); });
        }
      });
    });

    const canvas = await html2canvas(exportContainer, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1080,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    });
    // 3x 渲染后降到 2700px（2.5x），文字和数字经过超采样再输出
    const safeName = song.name.replace(/[/\\?%*:|"<>]/g, '_');
    const blob = await canvasToOptimizedBlob(canvas, 2700);
    if (!blob) throw new Error('图片编码失败');
    downloadBlobWithExt(blob, `${safeName}_${acc.toFixed(2)}`);
  } catch (err) {
    console.error(err);
    alert('导出失败：' + err.message);
  } finally {
    detailExportBtn.disabled = false;
    detailExportBtn.textContent = originalText;
    // 恢复后台进程
    resumeIllustLoading();
  }
}

// 构建单曲导出 HTML
function buildSoloExportHTML(d) {
  // 进度条：复用 accToPos 映射
  const accToPos = (accVal) => {
    if (accVal <= 96) return 0;
    if (accVal <= d.passPct) {
      if (d.passPct <= 96) return 25;
      return ((accVal - 96) / (d.passPct - 96)) * 25;
    }
    if (d.passPct >= 100) return 25;
    return 25 + ((accVal - d.passPct) / (100 - d.passPct)) * 75;
  };

  const markers = [
    { pos: accToPos(d.passPct),      value: d.passPct.toFixed(2) + '%',      label: '过段', cls: 'marker-pass',      labelCls: 'label-pass' },
    { pos: accToPos(d.backlightPct), value: d.backlightPct.toFixed(2) + '%', label: '后光', cls: 'marker-backlight', labelCls: 'label-backlight' },
    { pos: accToPos(d.breakPct),     value: d.breakPct.toFixed(2) + '%',     label: '击破', cls: 'marker-break',     labelCls: 'label-break' },
    { pos: 100,                      value: '100.00%',                       label: '上限', cls: 'marker-max',       labelCls: 'label-max' }
  ];

  let markersHTML = '';
  markers.forEach(m => {
    const pos = Math.max(0, Math.min(100, m.pos));
    markersHTML += `<div class="acc-marker ${m.cls}" style="left:${pos}%;"></div>`;
    markersHTML += `<div class="acc-marker-label ${m.labelCls}" style="left:${pos}%;">${m.value}<span class="label-tag">${m.label}</span></div>`;
  });

  // 玩家箭头
  const playerPos = Math.max(2, Math.min(98, accToPos(d.acc)));
  const playerArrowHTML = `
    <div class="acc-player-arrow" style="left:${playerPos}%;">
      <div class="arrow-icon" style="border-bottom-color:${d.staccColor};"></div>
      <div class="arrow-value" style="color:${d.staccColor};">${d.acc.toFixed(2)}%</div>
    </div>`;

  // 头像
  const avatarHTML = d.avatarSrc
    ? `<img class="solo-avatar" src="${d.avatarSrc}" alt="" />`
    : '';

  return `
    <style>
      .solo-wrapper, .solo-wrapper * {
        font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, sans-serif !important;
      }
      .solo-wrapper {
        width: 1080px;
        background: #ffffff;
        padding: 24px 72px 22px 24px;
        color: #1e293b;
        box-sizing: border-box;
        position: relative;
      }

      /* 标题区：曲名在左，玩家头像/名字在右 */
      .solo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 18px;
      }
      .solo-title-wrap {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        flex: 1;
      }
      .solo-title-deco {
        width: 8px;
        height: 34px;
        border-radius: 4px;
        background: linear-gradient(180deg, #2563eb, #8b5cf6);
        flex-shrink: 0;
      }
      .solo-title {
        font-size: 30px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.25;
        word-break: break-word;
        letter-spacing: -0.5px;
        min-width: 0;
      }
      .solo-header-player {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-shrink: 0;
        max-width: 340px;
      }

      /* 内容区 */
      .solo-body {
        display: flex;
        gap: 28px;
        align-items: center;
        margin-bottom: 20px;
      }
      .solo-art-wrap {
        flex-shrink: 0;
        border-radius: 16px;
        overflow: hidden;
        background: #f1f5f9;
        box-shadow: 0 8px 24px rgba(0,0,0,0.10);
      }
      .solo-art-wrap img {
        width: 100%;
        height: 100%;
        display: block;
      }
      .solo-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 16px;
      }

      /* 玩家头像/名字（位于标题行右侧） */
      .solo-avatar {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        object-fit: cover;
        border: 2px solid #2563eb;
        box-shadow: 0 3px 8px rgba(37,99,235,0.15);
        flex-shrink: 0;
      }
      .solo-player-name {
        font-size: 19px;
        font-weight: 800;
        color: #0f172a;
        text-align: right;
        line-height: 1.2;
        max-width: 250px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* 纵向数据行：填满右侧信息区，避免多余空白 */
      .solo-stats-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .solo-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 16px;
      }
      .solo-stat-row .label {
        font-size: 13px;
        color: #64748b;
        font-weight: 600;
      }
      .solo-stat-row .value {
        font-size: 22px;
        font-weight: 800;
        color: #1e293b;
        font-variant-numeric: tabular-nums;
      }
      .solo-stat-row .value.const {
        display: inline-block;
        padding: 3px 12px;
        border-radius: 6px;
        font-size: 18px;
      }

      /* 底部高亮横幅 */
      .solo-highlight {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #eff6ff, #e0e7ff);
        border: 1px solid #bfdbfe;
        border-radius: 14px;
        padding: 16px 22px;
      }
      .solo-rating-wrap {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }
      .solo-rating-wrap .label {
        font-size: 14px;
        color: #475569;
        font-weight: 700;
      }
      .solo-rating-wrap .value {
        font-size: 36px;
        font-weight: 900;
        color: #2563eb;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.5px;
      }
      .solo-rank-badge {
        background: #ffffff;
        border: 1px solid #c7d2fe;
        color: #4f46e5;
        font-size: 14px;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 30px;
        box-shadow: 0 2px 6px rgba(79,70,229,0.1);
      }

      /* 进度条 */
      .solo-meter-container {
        background: #f8fafc;
        border-radius: 16px;
        /* 压缩上下留白：48px 给刻度标签，54px 给箭头和数字 */
        padding: 48px 32px 54px; 
        border: 1px solid #e2e8f0;
      }
      .solo-meter-track {
        position: relative;
        height: 20px;
        border-radius: 10px;
        background: linear-gradient(90deg, #ef4444 0%, #f59e0b 20%, #facc15 35%, #3b82f6 55%, #8b5cf6 75%, #10b981 100%);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      }
      .solo-meter-track .acc-marker {
        position: absolute;
        top: -8px;
        bottom: -8px;
        width: 4px;
        border-radius: 2px;
        transform: translateX(-50%);
        box-shadow: 0 0 0 3px rgba(255,255,255,1);
        z-index: 2;
      }
      .solo-meter-track .acc-marker.marker-pass      { background: #3b82f6; }
      .solo-meter-track .acc-marker.marker-backlight { background: #8b5cf6; }
      .solo-meter-track .acc-marker.marker-break     { background: #10b981; }
      .solo-meter-track .acc-marker.marker-max       { background: #1e293b; }
      .solo-meter-track .acc-marker-label {
        position: absolute;
        bottom: calc(100% + 12px);
        transform: translateX(-50%);
        font-size: 13px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        z-index: 3;
      }
      .solo-meter-track .acc-marker-label .label-tag {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-align: center;
        margin-top: 2px;
      }
      .solo-meter-track .acc-marker-label.label-pass      { color: #3b82f6; }
      .solo-meter-track .acc-marker-label.label-backlight { color: #8b5cf6; }
      .solo-meter-track .acc-marker-label.label-break     { color: #10b981; }
      .solo-meter-track .acc-marker-label.label-max       { color: #1e293b; }
      
      .solo-meter-track .acc-player-arrow {
        position: absolute;
        top: calc(100% + 6px);
        transform: translateX(-50%);
        z-index: 4;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .solo-meter-track .acc-player-arrow .arrow-icon {
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 12px solid #94a3b8;
      }
      .solo-meter-track .acc-player-arrow .arrow-value {
        font-size: 15px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        margin-top: 4px;
        padding: 2px 8px;
        background: #ffffff;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        white-space: nowrap;
      }

      /* 页脚水印 */
      .solo-footer {
        text-align: right;
        margin-top: 10px;
        font-size: 11px;
        color: #cbd5e1;
        font-weight: 500;
        letter-spacing: 1px;
      }
    </style>
    <div class="solo-wrapper">
      <!-- 标题 + 玩家 -->
      <div class="solo-header">
        <div class="solo-title-wrap">
          <div class="solo-title-deco"></div>
          <div class="solo-title">${escapeHtml(d.song.name)}</div>
        </div>
        <div class="solo-header-player">
          <span class="solo-player-name">${escapeHtml(d.playerName)}</span>
          ${avatarHTML}
        </div>
      </div>

      <!-- 内容 -->
      <div class="solo-body">
        <div class="solo-art-wrap" style="width:${d.artW}px;height:${d.artH}px;">
          <img src="${d.illustUrl}" alt="" />
        </div>
        <div class="solo-info">
          <div class="solo-stats-list">
            <div class="solo-stat-row">
              <span class="label">谱面难度</span>
              <span class="value const" style="background:${d.cStyle.bg};color:${d.cStyle.color};">${d.song.constant}</span>
            </div>
            <div class="solo-stat-row">
              <span class="label">原始 ACC</span>
              <span class="value">${d.acc.toFixed(2)}%</span>
            </div>
            <div class="solo-stat-row">
              <span class="label">STACC</span>
              <span class="value" style="color:${d.staccColor};">${d.staccPct.toFixed(2)}%</span>
            </div>
          </div>

          <div class="solo-highlight">
            <div class="solo-rating-wrap">
              <span class="label">单曲 Rating</span>
              <span class="value">${d.rating.toFixed(2)}</span>
            </div>
            <div class="solo-rank-badge">B50 排名 ${escapeHtml(d.rankText)}</div>
          </div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="solo-meter-container">
        <div class="solo-meter-track">
          ${markersHTML}
          ${playerArrowHTML}
        </div>
      </div>

      <div class="solo-footer">Generated by DFC Rating System</div>
    </div>
  `;
}

// 返回按钮
detailBackBtn.addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === 'preview'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === 'preview'));
  detailCurrentSong = null;
  // 恢复滚动位置
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: previewScrollBeforeDetail, behavior: 'auto' });
    });
  });
});

// 复制按钮
detailCopyBtn.addEventListener('click', async () => {
  if (!detailCurrentSong || detailCurrentSong.chartId === null) return;
  const text = '#' + detailCurrentSong.chartId;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 兼容性 fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    detailCopyIcon.textContent = '✅';
    detailCopyText.textContent = '已复制';
    detailCopyBtn.classList.add('copied');
    setTimeout(() => {
      detailCopyIcon.textContent = '📋';
      detailCopyText.textContent = '复制';
      detailCopyBtn.classList.remove('copied');
    }, 1500);
  } catch (e) {
    console.warn('复制失败:', e);
    alert('复制失败，请手动复制：' + text);
  }
});

// Esc 返回
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('.page[data-page="detail"]').classList.contains('active')) {
    detailBackBtn.click();
  }
});

