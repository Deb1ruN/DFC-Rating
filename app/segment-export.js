// app/segment-export.js
// 段位图片导出（原第 19 节导出部分）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

function getAvatarForExportSync() {
  return localAvatarDataURL || '';
}

function segBuildExportHTML(data) {
  if (!data.notesValid) {
    return `<div style="color:red;font-size:20px;text-align:center;padding:50px;">⚠️ 请先输入有效的物量（正整数）</div>`;
  }

  const notes = segGetNotes();
  const aVals = data.aData;
  const sVals = data.sData;
  const title = segSelectedPreset ? segSelectedPreset.name : '自定义段位';
  const author = segSelectedPreset ? (segSelectedPreset.charter || '未知') : '自定义';

  let totalAcc = null;
  if (sVals.every(v => v !== null && !isNaN(v)) && notes.every(n => n > 0)) {
    const [N1, N2, N3, N4] = notes;
    const [S1, S2, S3, S4] = sVals;
    totalAcc = (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4);
    totalAcc = Math.min(100, Math.max(0, totalAcc));
  } else if (aVals.every(v => v !== null && !isNaN(v))) {
    totalAcc = aVals[3];
  }

  const totalDisplay = (totalAcc !== null) ? totalAcc.toFixed(2) + '%' : '—';
  let totalColor = '#2563eb';
  if (totalAcc !== null) {
    if (totalAcc >= 98) totalColor = '#10b981';
    else if (totalAcc >= 96) totalColor = '#3b82f6';
    else if (totalAcc >= 94) totalColor = '#f59e0b';
    else totalColor = '#ef4444';
  }

  const rowLabels = ['第一首', '第二首', '第三首', '第四首'];
  let tableRows = '';
  for (let i = 0; i < 4; i++) {
    const nVal = notes[i] || '—';
    const aVal = (aVals[i] !== null && !isNaN(aVals[i])) ? aVals[i].toFixed(2) + '%' : '—';
    const sVal = (sVals[i] !== null && !isNaN(sVals[i])) ? sVals[i].toFixed(2) + '%' : '—';
    tableRows += `
      <tr style="border-bottom:1px solid #eef2f6;">
        <td style="padding:6px 8px;font-weight:600;color:#1e293b;">${rowLabels[i]}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;">${nVal}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;color:#2563eb;">${aVal}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:500;color:#10b981;">${sVal}</td>
      </tr>`;
  }

  const pName = playerName || '未命名玩家';
  const avatarSrc = getAvatarForExportSync();
  let avatarHtml = '';
  if (avatarSrc) {
    avatarHtml = `<img src="${avatarSrc}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;border:2px solid #2563eb;" />`;
  } else {
    avatarHtml = `<div style="width:60px;height:60px;border-radius:8px;background:#d1d9e6;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;border:2px dashed #b9c3d0;">头像</div>`;
  }

  return `
    <style>
      .export-wrapper { display:flex; gap:30px; font-family:'Microsoft YaHei','微软雅黑',sans-serif; background:#fff; padding:20px 24px; border-radius:16px; max-width:100%; }
      .export-left { flex:0 0 55%; display:flex; flex-direction:column; }
      .export-right { flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:12px; }
      .export-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:3px solid #2563eb; padding-bottom:10px; }
      .export-title .name { font-size:22px; font-weight:700; color:#0f172a; }
      .export-title .author { font-size:14px; color:#475569; }
      .export-title .time { font-size:13px; color:#94a3b8; }
      .export-table { width:100%; table-layout:fixed; border-collapse:collapse; font-size:14px; margin-bottom:16px; }
      .export-table th { background:#f8fafc; border-bottom:2px solid #e2e8f0; padding:8px 8px; text-align:center; color:#475569; font-weight:600; }
      .export-table th:first-child { text-align:left; }
      .export-table td { padding:6px 8px; }
      .export-total { background:#f1f5f9; border-radius:12px; padding:10px 16px; text-align:center; border:2px solid ${totalColor}; }
      .export-total .label { font-size:15px; font-weight:600; color:#1e293b; }
      .export-total .value { font-size:28px; font-weight:700; color:${totalColor}; }
      .export-avatar-row { display:flex; align-items:center; gap:16px; margin-top:18px; padding-top:6px; }
      .export-avatar-box { width:60px; height:60px; border:3px solid #cbd5e1; border-radius:8px; background:transparent; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
      .export-avatar-text { font-size:16px; font-weight:500; color:#475569; }
      .export-chart-box { background:#fafcff; border-radius:8px; border:1px solid #e2e8f0; padding:8px; text-align:center; }
      .export-chart-box .chart-label { font-weight:600; color:#1e293b; font-size:13px; margin-bottom:4px; }
      .export-chart-box canvas { width:100%; height:auto; max-height:170px; background:#fff; border-radius:4px; }
    </style>
    <div class="export-wrapper">
      <div class="export-left">
        <div class="export-title">
          <div>
            <div class="name">🎯 ${escapeHtml(title)}</div>
            <div class="author">作者：${escapeHtml(author)}</div>
          </div>
          <div class="time">${new Date().toLocaleString('zh-CN')}</div>
        </div>
        <table class="export-table">
          <thead>
            <tr>
              <th style="width:20%;text-align:left;">曲目</th>
              <th style="width:20%;text-align:center;">物量</th>
              <th style="width:30%;text-align:center;">分段ACC</th>
              <th style="width:30%;text-align:center;">单曲ACC</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="export-total">
          <div class="label">段位总ACC</div>
          <div class="value">${totalDisplay}</div>
        </div>
        <div class="export-avatar-row">
          <div class="export-avatar-box">${avatarHtml}</div>
          <div class="export-avatar-text">${escapeHtml(pName)}</div>
        </div>
      </div>
      <div class="export-right">
        <div class="export-chart-box">
          <div class="chart-label">分段ACC（折线）</div>
          <canvas id="exportLineChart" width="320" height="160"></canvas>
        </div>
        <div class="export-chart-box">
          <div class="chart-label">单曲ACC（柱状）</div>
          <canvas id="exportBarChart" width="320" height="160"></canvas>
        </div>
      </div>
    </div>`;
}

async function segExportImage() {
  if (!segValidateNotes().valid) { alert('请先输入有效的物量（正整数）。'); return; }
  const data = segPrepareChartData();
  if (!data.notesValid) { alert('物量无效，请检查。'); return; }

  segExportBtn.disabled = true;
  const originalText = segExportBtn.textContent;
  segExportBtn.textContent = '⏳ 导出中...';

  try {
    const html = segBuildExportHTML(data);
    exportContainer.innerHTML = html;

    const lineCanvasExport = exportContainer.querySelector('#exportLineChart');
    const barCanvasExport = exportContainer.querySelector('#exportBarChart');
    if (lineCanvasExport && barCanvasExport) {
      const dpr = 3, w = 320, h = 160;
      lineCanvasExport.width = w * dpr;
      lineCanvasExport.height = h * dpr;
      lineCanvasExport.style.width = w + 'px';
      lineCanvasExport.style.height = h + 'px';
      const ctxLine = lineCanvasExport.getContext('2d');
      ctxLine.scale(dpr, dpr);
      segDrawLineChart(ctxLine, data, w, h);

      barCanvasExport.width = w * dpr;
      barCanvasExport.height = h * dpr;
      barCanvasExport.style.width = w + 'px';
      barCanvasExport.style.height = h + 'px';
      const ctxBar = barCanvasExport.getContext('2d');
      ctxBar.scale(dpr, dpr);
      segDrawBarChart(ctxBar, data, w, h);
    }

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(exportContainer, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 920,
      height: exportContainer.scrollHeight,
      imageTimeout: 3000,
      removeContainer: true,
    });

    // 3x 渲染后降到 2300px（2.5x），图表和数字经过超采样再输出
    const filenameBase = `段位ACC_${segSelectedPreset ? segSelectedPreset.name : '自定义'}_${new Date().toISOString().slice(0,10)}`;
    const blob = await canvasToOptimizedBlob(canvas, 2300);
    if (!blob) throw new Error('图片编码失败');
    downloadBlobWithExt(blob, filenameBase);
  } catch (err) {
    console.error(err);
    alert('导出图片失败，请重试或检查控制台错误。');
  } finally {
    segExportBtn.disabled = false;
    segExportBtn.textContent = originalText;
  }
}

segExportBtn.addEventListener('click', segExportImage);

[...segNInputs, ...segAInputs, ...segSInputs].forEach(inp => {
  inp.addEventListener('input', segUpdateCharts);
});
segAInputs.forEach(inp => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') segBtnReverse.click(); }));
segSInputs.forEach(inp => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') segBtnForward.click(); }));

