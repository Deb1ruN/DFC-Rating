// app/segment-detail.js
// 段位详情页：ACC 计算、图表与段位导出图片
// 依赖 segment.js 的图表绘制、utils.js 的导出编码、main-table.js 的段位成绩

// ============================================================
// 1. 详情页段位计算
// ============================================================
function detailSegNotes() {
  return (detailSegCurrent && Array.isArray(detailSegCurrent.notes))
    ? detailSegCurrent.notes.slice(0, 4)
    : [];
}

function detailSegNotesValid(notes) {
  return notes.length === 4 && notes.every(n => Number.isInteger(n) && n > 0);
}

function detailSegGetAccs(inputs) {
  return inputs.map(inp => parseFloat(inp.value));
}

function detailSegAccsValid(accs) {
  return accs.length === 4 && accs.every(v => !isNaN(v) && v >= 0 && v <= 100);
}

function detailSegComputeReverse() {
  const notes = detailSegNotes();
  if (!detailSegNotesValid(notes)) return { ok: false, error: 'notes' };
  const accs = detailSegGetAccs(detailSegAInputs);
  if (!detailSegAccsValid(accs)) return { ok: false, error: 'acc' };

  const [N1, N2, N3, N4] = notes;
  const [A1, A2, A3, A4] = accs;
  let S1, S2, S3, S4;
  try {
    S1 = A1;
    S2 = (A2 * (N1 + N2) - N1 * S1) / N2;
    S3 = (A3 * (N1 + N2 + N3) - N1 * S1 - N2 * S2) / N3;
    S4 = (A4 * (N1 + N2 + N3 + N4) - N1 * S1 - N2 * S2 - N3 * S3) / N4;
  } catch (e) {
    return { ok: false, error: 'calc' };
  }

  const clamp = v => Math.min(100, Math.max(0, v));
  const S = [clamp(S1), clamp(S2), clamp(S3), clamp(S4)];
  const calcA2 = (N1 * S[0] + N2 * S[1]) / (N1 + N2);
  const calcA3 = (N1 * S[0] + N2 * S[1] + N3 * S[2]) / (N1 + N2 + N3);
  const calcA4 = (N1 * S[0] + N2 * S[1] + N3 * S[2] + N4 * S[3]) / (N1 + N2 + N3 + N4);
  const diff2 = Math.abs(calcA2 - A2);
  const diff3 = Math.abs(calcA3 - A3);
  const diff4 = Math.abs(calcA4 - A4);
  const eps = 0.01;
  const allOk = diff2 <= eps && diff3 <= eps && diff4 <= eps;
  const rawOut = [S1, S2, S3, S4].some(v => v < -0.5 || v > 100.5);

  return { ok: true, S, calcA2, calcA3, calcA4, diff2, diff3, diff4, eps, allOk, rawOut };
}

function detailSegDeriveA(notes, sVals) {
  const [N1, N2, N3, N4] = notes;
  const [S1, S2, S3, S4] = sVals;
  return [
    S1,
    (N1 * S1 + N2 * S2) / (N1 + N2),
    (N1 * S1 + N2 * S2 + N3 * S3) / (N1 + N2 + N3),
    (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4)
  ];
}

function detailSegDeriveS(notes, aVals) {
  const [N1, N2, N3, N4] = notes;
  const [A1, A2, A3, A4] = aVals;
  const S1 = A1;
  const S2 = (A2 * (N1 + N2) - N1 * S1) / N2;
  const S3 = (A3 * (N1 + N2 + N3) - N1 * S1 - N2 * S2) / N3;
  const S4 = (A4 * (N1 + N2 + N3 + N4) - N1 * S1 - N2 * S2 - N3 * S3) / N4;
  return [S1, S2, S3, S4].map(v => Math.min(100, Math.max(0, v)));
}

function detailSegComputeCumulativeFromS() {
  const notes = detailSegNotes();
  if (!detailSegNotesValid(notes)) return { ok: false };
  const sVals = detailSegGetAccs(detailSegSInputs);
  if (!detailSegAccsValid(sVals)) return { ok: false };
  return { ok: true, A: detailSegDeriveA(notes, sVals) };
}

function detailSegChartData() {
  const notes = detailSegNotes();
  const notesValid = detailSegNotesValid(notes);
  const aVals = detailSegGetAccs(detailSegAInputs);
  const sVals = detailSegGetAccs(detailSegSInputs);
  const hasA = notesValid && detailSegAccsValid(aVals);
  const hasS = notesValid && detailSegAccsValid(sVals);

  const toValid = v => (!isNaN(v) && v >= 0 && v <= 100) ? v : null;
  let aData = aVals.map(toValid);
  let sData = sVals.map(toValid);

  if (hasA && !hasS) sData = detailSegDeriveS(notes, aVals);
  else if (hasS && !hasA) aData = detailSegDeriveA(notes, sVals);

  const allVals = [];
  aData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
  sData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });

  let minVal = 0, maxVal = 100;
  if (allVals.length > 0) {
    minVal = Math.min(...allVals);
    maxVal = Math.max(...allVals);
    const range = maxVal - minVal;
    if (range < 0.1) {
      minVal = Math.max(0, minVal - 2);
      maxVal = Math.min(100, maxVal + 2);
    } else {
      const margin = range * 0.1;
      minVal = Math.max(0, minVal - margin);
      maxVal = Math.min(100, maxVal + margin);
    }
    const step = 0.5;
    minVal = Math.floor(minVal / step) * step;
    maxVal = Math.ceil(maxVal / step) * step;
    if (maxVal - minVal < 1) maxVal = Math.min(100, maxVal + 1);
  }

  return { notesValid, aData, sData, minVal, maxVal };
}

function detailSegUpdateChart() {
  const data = detailSegChartData();
  if (!data.notesValid) {
    const ctx = detailSegChart.getContext('2d');
    ctx.clearRect(0, 0, detailSegChart.width, detailSegChart.height);
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const rect = detailSegChart.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 260;
  detailSegChart.width = w * dpr;
  detailSegChart.height = h * dpr;
  detailSegChart.style.width = w + 'px';
  detailSegChart.style.height = h + 'px';
  const ctx = detailSegChart.getContext('2d');
  ctx.scale(dpr, dpr);
  if (detailSegChartMode === 'bar') segDrawBarChart(ctx, data, w, h);
  else segDrawLineChart(ctx, data, w, h);
}

function detailSegSetChartMode(mode) {
  detailSegChartMode = mode === 'bar' ? 'bar' : 'line';
  detailSegChartTitle.textContent = detailSegChartMode === 'bar'
    ? '📊 单曲ACC (柱状图)'
    : '📈 分段ACC (折线图)';
  detailSegUpdateChart();
}

function detailSegUpdateModeUI() {
  const reverse = detailSegMode === 'reverse';
  detailSegModeTitle.innerHTML = reverse
    ? '策略一：逆向推导 <span class="tag">已知分段ACC</span>'
    : '策略二：正向合成 <span class="tag">已知单曲ACC</span>';
  detailSegFieldsReverse.style.display = reverse ? '' : 'none';
  detailSegFieldsForward.style.display = reverse ? 'none' : '';
  detailSegBtnReverse.style.display = reverse ? '' : 'none';
  detailSegBtnForward.style.display = reverse ? 'none' : '';
  detailSegResultReverse.style.display = reverse ? '' : 'none';
  detailSegResultForward.style.display = reverse ? 'none' : '';
}

function detailSegRenderReverse() {
  const r = detailSegComputeReverse();
  if (!r.ok) {
    if (r.error === 'notes') detailSegResultReverse.innerHTML = '<div class="validation err">❌ 该段位物量不完整。</div>';
    else if (r.error === 'acc') detailSegResultReverse.innerHTML = '<div class="validation err">❌ 请确保所有分段 ACC 在 0~100 之间。</div>';
    else detailSegResultReverse.innerHTML = '<div class="validation err">❌ 计算异常，请检查物量。</div>';
    detailSegUpdateChart();
    return;
  }

  const labels = ['S₁', 'S₂', 'S₃', 'S₄'];
  let html = `<div class="result-item"><span>推导出的单曲ACC：</span></div>`;
  for (let i = 0; i < 4; i++) {
    html += `<div class="result-item"><span>${labels[i]}</span><span class="val success">${r.S[i].toFixed(2)}%</span></div>`;
  }
  if (r.rawOut) html += `<div class="validation warn">⚠️ 推导值超出正常范围，输入数据可能不一致。</div>`;
  else if (r.allOk) html += `<div class="validation ok">✅ 数据自洽，重算误差 ≤ ${r.eps}</div>`;
  else html += `<div class="validation warn">⚠️ 重算误差较大，请检查输入或物量。</div>`;
  html += `<div style="font-size:12px;color:#64748b;margin-top:4px;">重算 A₂=${r.calcA2.toFixed(2)}，A₃=${r.calcA3.toFixed(2)}，A₄=${r.calcA4.toFixed(2)}</div>`;
  detailSegResultReverse.innerHTML = html;
  detailSegUpdateChart();
}

function detailSegForward() {
  const notes = detailSegNotes();
  if (!detailSegNotesValid(notes)) {
    detailSegResultForward.innerHTML = '<div class="validation err">❌ 该段位物量不完整。</div>';
    detailSegUpdateChart();
    return;
  }
  const accs = detailSegGetAccs(detailSegSInputs);
  if (!detailSegAccsValid(accs)) {
    detailSegResultForward.innerHTML = '<div class="validation err">❌ 请确保单曲 ACC 在 0~100 之间。</div>';
    detailSegUpdateChart();
    return;
  }
  const [N1, N2, N3, N4] = notes;
  const [S1, S2, S3, S4] = accs;
  const totalNotes = N1 + N2 + N3 + N4;
  const totalAcc = Math.min(100, Math.max(0, (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / totalNotes));
  let html = `<div class="result-item"><span>段位总ACC</span><span class="val success">${totalAcc.toFixed(2)}%</span></div>`;
  html += `<div style="font-size:13px;color:#64748b;margin-top:6px;">加权公式：(${N1}×${S1.toFixed(2)} + ${N2}×${S2.toFixed(2)} + ${N3}×${S3.toFixed(2)} + ${N4}×${S4.toFixed(2)}) / ${totalNotes}</div>`;
  detailSegResultForward.innerHTML = html;
  detailSegUpdateChart();
}

function detailSegSwitchMode() {
  if (detailSegMode === 'reverse') {
    const r = detailSegComputeReverse();
    if (r.ok) {
      detailSegSInputs.forEach((inp, i) => { inp.value = r.S[i].toFixed(2); });
    }
    detailSegMode = 'forward';
    detailSegUpdateModeUI();
    if (r.ok) {
      detailSegForward();
    } else {
      const sVals = detailSegGetAccs(detailSegSInputs);
      if (detailSegAccsValid(sVals)) detailSegForward();
      else {
        detailSegResultForward.innerHTML = '<div class="hint-default">请先填写有效的 A₁~A₄，或直接输入单曲 ACC</div>';
        detailSegUpdateChart();
      }
    }
  } else {
    const c = detailSegComputeCumulativeFromS();
    if (c.ok) {
      detailSegAInputs.forEach((inp, i) => { inp.value = c.A[i].toFixed(2); });
    }
    detailSegMode = 'reverse';
    detailSegUpdateModeUI();
    if (c.ok) {
      detailSegRenderReverse();
    } else {
      const aVals = detailSegGetAccs(detailSegAInputs);
      if (detailSegAccsValid(aVals)) detailSegRenderReverse();
      else {
        detailSegResultReverse.innerHTML = '<div class="hint-default">请先填写有效的 S₁~S₄，或直接输入分段 ACC</div>';
        detailSegUpdateChart();
      }
    }
  }
  detailSegSyncPageMeter();
  saveDetailSegState();
}

function detailSegSyncPageMeter() {
  if (!detailSegCurrent) return;
  const D = detailSegCurrent.yellowRatio || 0;
  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);
  const raw = parseFloat(detailSegAInputs[3].value);
  let playerAcc = (!isNaN(raw) && raw >= 0 && raw <= 100) ? raw : null;
  if (playerAcc === null) {
    const notes = detailSegNotes();
    const sVals = detailSegGetAccs(detailSegSInputs);
    if (detailSegNotesValid(notes) && detailSegAccsValid(sVals)) {
      playerAcc = detailSegDeriveA(notes, sVals)[3];
    }
  }
  renderAccMeter(
    detailSegCurrent,
    passAcc !== null ? passAcc * 100 : 0,
    backlightAcc !== null ? backlightAcc * 100 : 0,
    breakAcc !== null ? breakAcc * 100 : 0,
    playerAcc
  );
}

function getDetailSegSaved(seg) {
  if (!seg || !seg.internalId) return null;
  try {
    const map = JSON.parse(localStorage.getItem(KEY.segmentDetailAccs) || '{}');
    return map[seg.internalId] || null;
  } catch (e) {
    return null;
  }
}

function saveDetailSegState() {
  if (!detailSegCurrent || !detailSegCurrent.internalId) return;
  try {
    const map = JSON.parse(localStorage.getItem(KEY.segmentDetailAccs) || '{}');
    map[detailSegCurrent.internalId] = {
      a: detailSegAInputs.map(inp => inp.value.trim()),
      s: detailSegSInputs.map(inp => inp.value.trim()),
      mode: detailSegMode,
      chartMode: detailSegChartMode
    };
    localStorage.setItem(KEY.segmentDetailAccs, JSON.stringify(map));
  } catch (e) {
    console.warn('保存段位详情 ACC 失败:', e);
  }
}

function initDetailSegmentCalc(seg) {
  detailSegCurrent = seg;
  detailSegMode = 'reverse';
  detailSegChartMode = 'line';

  detailSegAInputs.forEach(inp => { inp.value = ''; });
  detailSegSInputs.forEach(inp => { inp.value = ''; });
  detailSegResultReverse.innerHTML = '<div class="hint-default">输入分段ACC后点击推导</div>';
  detailSegResultForward.innerHTML = '<div class="hint-default">输入单曲ACC后点击合成</div>';

  const saved = getDetailSegSaved(seg);
  if (saved) {
    // 恢复上次在详情页输入/生成的 A、S 数据与显示模式
    detailSegAInputs.forEach((inp, i) => { inp.value = saved.a && saved.a[i] != null ? String(saved.a[i]) : ''; });
    detailSegSInputs.forEach((inp, i) => { inp.value = saved.s && saved.s[i] != null ? String(saved.s[i]) : ''; });
    if (saved.mode === 'forward') detailSegMode = 'forward';
    if (saved.chartMode === 'bar') detailSegChartMode = 'bar';
  } else {
    // 第一次进入：把已存储的段位总 ACC 自动填入策略一的 A₄
    const storedAcc = getSegmentAcc(seg);
    if (storedAcc !== null) detailSegAInputs[3].value = storedAcc.toFixed(2);
  }

  detailSegCalcSection.style.display = 'block';
  detailSegUpdateModeUI();
  detailSegSetChartMode(detailSegChartMode);
}

function hideDetailSegmentCalc() {
  detailSegCurrent = null;
  detailSegCalcSection.style.display = 'none';
}

detailSegBtnReverse.addEventListener('click', detailSegRenderReverse);
detailSegBtnForward.addEventListener('click', detailSegForward);
detailSegBtnSwitchMode.addEventListener('click', detailSegSwitchMode);
detailSegBtnChartToggle.addEventListener('click', function() {
  detailSegSetChartMode(detailSegChartMode === 'line' ? 'bar' : 'line');
  saveDetailSegState();
});
[...detailSegAInputs, ...detailSegSInputs].forEach(inp => {
  inp.addEventListener('input', function() {
    detailSegUpdateChart();
    saveDetailSegState();
  });
});
detailSegAInputs.forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') detailSegBtnReverse.click(); }));
detailSegSInputs.forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') detailSegBtnForward.click(); }));
detailSegAInputs[3].addEventListener('input', detailSegSyncPageMeter);

// ============================================================
// 2. 段位详情导出图片
// ============================================================
function detailSegExportData() {
  const notes = detailSegNotes();
  const aVals = detailSegGetAccs(detailSegAInputs);
  const sVals = detailSegGetAccs(detailSegSInputs);
  const notesValid = detailSegNotesValid(notes);
  const hasA = notesValid && detailSegAccsValid(aVals);
  const hasS = notesValid && detailSegAccsValid(sVals);

  const toValid = v => (!isNaN(v) && v >= 0 && v <= 100) ? v : null;
  let aData = aVals.map(toValid);
  let sData = sVals.map(toValid);
  if (hasA && !hasS) sData = detailSegDeriveS(notes, aVals);
  else if (hasS && !hasA) aData = detailSegDeriveA(notes, sVals);

  const playerAcc = (aData[3] !== null && !isNaN(aData[3])) ? aData[3] : null;

  const allVals = [];
  aData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
  sData.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
  let minVal = 0, maxVal = 100;
  if (allVals.length > 0) {
    minVal = Math.min(...allVals);
    maxVal = Math.max(...allVals);
    const range = maxVal - minVal;
    if (range < 0.1) {
      minVal = Math.max(0, minVal - 2);
      maxVal = Math.min(100, maxVal + 2);
    } else {
      const margin = range * 0.1;
      minVal = Math.max(0, minVal - margin);
      maxVal = Math.min(100, maxVal + margin);
    }
    const step = 0.5;
    minVal = Math.floor(minVal / step) * step;
    maxVal = Math.ceil(maxVal / step) * step;
    if (maxVal - minVal < 1) maxVal = Math.min(100, maxVal + 1);
  }

  return { notes, aData, sData, playerAcc, minVal, maxVal };
}

function buildDetailSegMeterHTML(d, passPct, backlightPct, breakPct, playerAcc) {
  const accToPos = (accVal) => {
    if (accVal <= 96) return 0;
    if (accVal <= passPct) {
      if (passPct <= 96) return 25;
      return ((accVal - 96) / (passPct - 96)) * 25;
    }
    if (passPct >= 100) return 25;
    return 25 + ((accVal - passPct) / (100 - passPct)) * 75;
  };

  const markers = [
    { pos: accToPos(passPct), value: passPct.toFixed(2) + '%', label: '过段', cls: 'marker-pass', labelCls: 'label-pass' },
    { pos: accToPos(backlightPct), value: backlightPct.toFixed(2) + '%', label: '后光', cls: 'marker-backlight', labelCls: 'label-backlight' },
    { pos: accToPos(breakPct), value: breakPct.toFixed(2) + '%', label: '击破', cls: 'marker-break', labelCls: 'label-break' },
    { pos: 100, value: '100.00%', label: '上限', cls: 'marker-max', labelCls: 'label-max' }
  ];

  let markersHTML = '';
  markers.forEach(m => {
    const pos = Math.max(0, Math.min(100, m.pos));
    markersHTML += `<div class="segx-marker ${m.cls}" style="left:${pos}%;"></div>`;
    markersHTML += `<div class="segx-marker-label ${m.labelCls}" style="left:${pos}%;">${m.value}<span class="segx-label-tag">${m.label}</span></div>`;
  });

  let arrowHTML = '';
  if (playerAcc !== null && !isNaN(playerAcc)) {
    const stacc = calcSTACC(playerAcc / 100, d.D);
    const color = stacc !== null ? getStaccColor(stacc) : '#94a3b8';
    const pos = Math.max(2, Math.min(98, accToPos(playerAcc)));
    arrowHTML = `
      <div class="segx-player-arrow" style="left:${pos}%;">
        <div class="segx-arrow-icon" style="border-bottom-color:${color};"></div>
        <div class="segx-arrow-value" style="color:${color};">${playerAcc.toFixed(2)}%</div>
      </div>`;
  } else {
    arrowHTML = '<div class="segx-meter-untouched">未填写 ACC</div>';
  }

  return { markersHTML, arrowHTML };
}

function detailSegBuildExportHTML(d) {
  const rowLabels = ['第一首', '第二首', '第三首', '第四首'];
  let tableRows = '';
  for (let i = 0; i < 4; i++) {
    const nVal = d.notes[i] !== null && d.notes[i] !== undefined ? d.notes[i] : 'null';
    const aVal = (d.aData[i] !== null && !isNaN(d.aData[i])) ? d.aData[i].toFixed(2) + '%' : '—';
    const sVal = (d.sData[i] !== null && !isNaN(d.sData[i])) ? d.sData[i].toFixed(2) + '%' : '—';
    tableRows += `
      <tr>
        <td>${rowLabels[i]}</td>
        <td class="center">${nVal}</td>
        <td class="center blue">${aVal}</td>
        <td class="center green">${sVal}</td>
      </tr>`;
  }

  const D = d.D;
  const yellowPct = (D * 100).toFixed(2) + '%';
  const passPct = d.passPct;
  const backlightPct = d.backlightPct;
  const breakPct = d.breakPct;
  const playerAcc = d.playerAcc;
  const stacc = playerAcc !== null && !isNaN(playerAcc) ? calcSTACC(playerAcc / 100, D) : null;
  const staccPct = stacc !== null ? stacc * 100 : null;
  const accDisplay = (playerAcc !== null && !isNaN(playerAcc)) ? playerAcc.toFixed(2) + '%' : '—';
  const staccDisplay = staccPct !== null ? staccPct.toFixed(2) + '%' : '—';
  const segDifficulty = (d.difficulty !== null && d.difficulty !== undefined && d.difficulty !== '' && !isNaN(Number(d.difficulty)))
    ? Number(d.difficulty)
    : null;
  const segRating = (segDifficulty !== null && stacc !== null) ? calcSegmentRating(segDifficulty, stacc) : null;
  const difficultyDisplay = segDifficulty !== null ? String(segDifficulty) : '-';
  const ratingDisplay = segRating !== null ? segRating.toFixed(2) : '-';
  const meter = buildDetailSegMeterHTML({ D }, passPct, backlightPct, breakPct, playerAcc);
  const avatarHTML = d.avatarSrc
    ? `<img class="segx-avatar" src="${d.avatarSrc}" alt="" />`
    : '<div class="segx-avatar-ph">头像</div>';

  return `
    <style>
      .segx-wrapper, .segx-wrapper * {
        font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, sans-serif !important;
        box-sizing: border-box;
      }
      .segx-wrapper {
        width: 1080px;
        background: #ffffff;
        padding: 24px 44px 24px;
        color: #1e293b;
      }
      .segx-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 14px;
      }
      .segx-title-wrap { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
      .segx-title-deco {
        width: 8px; height: 34px; border-radius: 4px; flex-shrink: 0;
        background: linear-gradient(180deg, #2563eb, #8b5cf6);
      }
      .segx-title { font-size: 30px; font-weight: 800; color: #0f172a; line-height: 1.2; word-break: break-word; }
      .segx-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
      .segx-player { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-shrink: 0; max-width: 340px; }
      .segx-player-name {
        font-size: 19px; font-weight: 800; color: #0f172a; text-align: right;
        max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .segx-avatar {
        width: 48px; height: 48px; border-radius: 10px; object-fit: cover;
        border: 2px solid #2563eb; flex-shrink: 0;
      }
      .segx-avatar-ph {
        width: 48px; height: 48px; border-radius: 10px; background: #d1d9e6;
        border: 2px dashed #b9c3d0; display: flex; align-items: center;
        justify-content: center; color: #94a3b8; font-size: 11px; flex-shrink: 0;
      }

      .segx-strip {
        display: flex; align-items: center; gap: 8px;
        background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 12px; padding: 7px 10px; margin-bottom: 16px;
      }
      .segx-strip-item {
        flex: 1; display: flex; align-items: center; justify-content: space-between;
        gap: 8px; padding: 3px 10px; border-right: 1px solid #e2e8f0;
      }
      .segx-strip-item:last-child { border-right: none; }
      .segx-strip-label { font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; }
      .segx-strip-value { font-size: 16px; font-weight: 800; color: #1e293b; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .segx-strip-value.yellow { color: #f59e0b; }
      .segx-strip-value.pass { color: #3b82f6; }
      .segx-strip-value.backlight { color: #8b5cf6; }
      .segx-strip-value.break { color: #10b981; }

      .segx-body {
        display: grid; grid-template-columns: 440px 1fr; gap: 24px;
        align-items: stretch; margin-bottom: 16px;
      }
      .segx-art {
        width: 440px; height: 280px; border-radius: 14px; overflow: hidden;
        background: #f1f5f9; box-shadow: 0 6px 18px rgba(15,23,42,0.10);
      }
      .segx-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .segx-table-card {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
        padding: 14px 16px; display: flex; flex-direction: column; min-width: 0;
      }
      .segx-table-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px; flex-shrink: 0; }
      .segx-table { width: 100%; height: 100%; flex: 1; border-collapse: collapse; table-layout: fixed; font-size: 14px; }
      .segx-table th {
        background: #eef2f6; border-bottom: 2px solid #dbe3ec;
        padding: 8px 8px; text-align: center; color: #475569; font-weight: 700;
      }
      .segx-table th:first-child { text-align: left; }
      .segx-table td { padding: 8px; border-bottom: 1px solid #e8eef5; text-align: left; }
      .segx-table tr:last-child td { border-bottom: none; }
      .segx-table td.center { text-align: center; }
      .segx-table td.blue { color: #2563eb; font-weight: 700; }
      .segx-table td.green { color: #10b981; font-weight: 700; }

      .segx-bottom-grid {
        display: grid; grid-template-columns: 300px 300px 1fr;
        gap: 16px; align-items: stretch; margin-bottom: 16px;
      }
      .segx-chart-card {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
        padding: 10px; display: flex; flex-direction: column; align-items: center;
      }
      .segx-chart-title { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; }
      .segx-chart-card canvas { width: 280px; height: 140px; display: block; background: #fff; border-radius: 6px; }
      .segx-stats-card {
        background: linear-gradient(135deg, #eff6ff, #e0e7ff);
        border: 1px solid #bfdbfe; border-radius: 14px; padding: 12px;
        display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 10px;
      }
      .segx-stat {
        background: rgba(255,255,255,0.78); border: 1px solid rgba(191,219,254,0.9);
        border-radius: 10px; padding: 10px 12px; display: flex;
        flex-direction: column; justify-content: center; gap: 4px; min-width: 0;
      }
      .segx-stat-label { font-size: 12px; color: #64748b; font-weight: 600; }
      .segx-stat-value { font-size: 20px; font-weight: 800; color: #1e293b; font-variant-numeric: tabular-nums; }
      .segx-stat-value.placeholder { color: #94a3b8; }

      .segx-meter-card {
        background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 14px; padding: 46px 28px 50px;
      }
      .segx-meter-track {
        position: relative; height: 18px; border-radius: 9px;
        background: linear-gradient(90deg, #ef4444 0%, #f59e0b 20%, #facc15 35%, #3b82f6 55%, #8b5cf6 75%, #10b981 100%);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.10);
      }
      .segx-marker {
        position: absolute; top: -8px; bottom: -8px; width: 4px;
        border-radius: 2px; transform: translateX(-50%);
        box-shadow: 0 0 0 3px #ffffff; z-index: 2;
      }
      .segx-marker.marker-pass { background: #3b82f6; }
      .segx-marker.marker-backlight { background: #8b5cf6; }
      .segx-marker.marker-break { background: #10b981; }
      .segx-marker.marker-max { background: #1e293b; }
      .segx-marker-label {
        position: absolute; bottom: calc(100% + 12px); transform: translateX(-50%);
        font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums;
        white-space: nowrap; z-index: 3;
      }
      .segx-marker-label .segx-label-tag {
        display: block; font-size: 11px; font-weight: 600; color: #94a3b8;
        text-align: center; margin-top: 2px;
      }
      .segx-marker-label.label-pass { color: #3b82f6; }
      .segx-marker-label.label-backlight { color: #8b5cf6; }
      .segx-marker-label.label-break { color: #10b981; }
      .segx-marker-label.label-max { color: #1e293b; }
      .segx-player-arrow {
        position: absolute; top: calc(100% + 6px); transform: translateX(-50%);
        z-index: 4; display: flex; flex-direction: column; align-items: center;
      }
      .segx-arrow-icon {
        width: 0; height: 0; border-left: 8px solid transparent;
        border-right: 8px solid transparent; border-bottom: 12px solid #94a3b8;
      }
      .segx-arrow-value {
        font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums;
        margin-top: 4px; padding: 2px 8px; background: #ffffff; border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.10); white-space: nowrap;
      }
      .segx-meter-untouched {
        position: absolute; left: 50%; top: calc(100% + 10px); transform: translateX(-50%);
        font-size: 13px; color: #94a3b8; white-space: nowrap;
      }
    </style>
    <div class="segx-wrapper">
      <div class="segx-header">
        <div class="segx-title-wrap">
          <div class="segx-title-deco"></div>
          <div>
            <div class="segx-title">${escapeHtml(d.name)}</div>
            <div class="segx-subtitle">段位 · 谱师：${escapeHtml(d.author || '未知')}</div>
          </div>
        </div>
        <div class="segx-player">
          <span class="segx-player-name">${escapeHtml(d.playerName)}</span>
          ${avatarHTML}
        </div>
      </div>

      <div class="segx-strip">
        <div class="segx-strip-item"><span class="segx-strip-label">黄键占比</span><span class="segx-strip-value yellow">${yellowPct}</span></div>
        <div class="segx-strip-item"><span class="segx-strip-label">过段 ACC</span><span class="segx-strip-value pass">${passPct.toFixed(2)}%</span></div>
        <div class="segx-strip-item"><span class="segx-strip-label">后光 ACC</span><span class="segx-strip-value backlight">${backlightPct.toFixed(2)}%</span></div>
        <div class="segx-strip-item"><span class="segx-strip-label">击破 ACC</span><span class="segx-strip-value break">${breakPct.toFixed(2)}%</span></div>
      </div>

      <div class="segx-body">
        <div class="segx-art"><img src="${d.coverSrc}" alt="" /></div>
        <div class="segx-table-card">
          <div class="segx-table-title">四首单曲成绩</div>
          <table class="segx-table">
            <thead>
              <tr>
                <th style="width:22%;text-align:left;">曲目</th>
                <th style="width:20%;">物量</th>
                <th style="width:29%;">分段ACC</th>
                <th style="width:29%;">单曲ACC</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>

      <div class="segx-bottom-grid">
        <div class="segx-chart-card">
          <div class="segx-chart-title">分段ACC（折线）</div>
          <canvas id="segxLineChart" width="280" height="140"></canvas>
        </div>
        <div class="segx-chart-card">
          <div class="segx-chart-title">单曲ACC（柱状）</div>
          <canvas id="segxBarChart" width="280" height="140"></canvas>
        </div>
        <div class="segx-stats-card">
          <div class="segx-stat"><span class="segx-stat-label">原始 ACC</span><span class="segx-stat-value">${accDisplay}</span></div>
          <div class="segx-stat"><span class="segx-stat-label">STACC</span><span class="segx-stat-value">${staccDisplay}</span></div>
          <div class="segx-stat"><span class="segx-stat-label">段位难度</span><span class="segx-stat-value ${segDifficulty === null ? 'placeholder' : ''}">${difficultyDisplay}</span></div>
          <div class="segx-stat"><span class="segx-stat-label">Rating</span><span class="segx-stat-value ${segRating === null ? 'placeholder' : ''}">${ratingDisplay}</span></div>
        </div>
      </div>

      <div class="segx-meter-card">
        <div class="segx-meter-track">
          ${meter.markersHTML}
          ${meter.arrowHTML}
        </div>
      </div>
    </div>`;
}

async function segmentDetailExportImage() {
  if (typeof html2canvas === 'undefined') {
    alert('核心组件(html2canvas)加载失败，请刷新页面或检查网络后重试！');
    return;
  }
  const seg = detailCurrentSong;
  if (!seg || !seg.isSegment) return;
  if (queryRunning) {
    alert('请先等待当前的自动查询完成，再进行导出。');
    return;
  }
  if (!detailSegNotesValid(detailSegNotes())) {
    alert('该段位物量不完整，无法导出图片。');
    return;
  }

  const btn = detailExportBtn;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ 导出中...';

  const prevWidth = exportContainer.style.width;
  const prevPadding = exportContainer.style.padding;

  try {
    const data = detailSegExportData();
    const D = seg.yellowRatio || 0;
    const passAcc = calcACCFromSTACC(0.97, D);
    const backlightAcc = calcACCFromSTACC(0.985, D);
    const breakAcc = calcACCFromSTACC(0.995, D);
    const passPct = passAcc !== null ? passAcc * 100 : 0;
    const backlightPct = backlightAcc !== null ? backlightAcc * 100 : 0;
    const breakPct = breakAcc !== null ? breakAcc * 100 : 0;

    let coverSrc = detailArtImg && detailArtImg.src ? detailArtImg.src : '';
    if (!coverSrc || coverSrc.includes('loading-cover')) {
      const url = seg.chartId ? await getIllustration(seg.chartId, 'thumb') : null;
      coverSrc = url || NO_COVER_URL;
    }

    // 按导出卡片的 440×280 比例先裁剪，不烘焙 B50 的上下阴影，保持单曲导出的干净曲绘
    let exportCoverSrc = await makeCoverThumb(coverSrc, 1320, 840, false);
    if (!exportCoverSrc) {
      exportCoverSrc = await makeCoverThumb(NO_COVER_URL, 1320, 840, false) || NO_COVER_URL;
    }

    const html = detailSegBuildExportHTML({
      name: seg.name,
      author: seg.charter || '未知',
      playerName: playerName || '未命名玩家',
      avatarSrc: getAvatarForExportSync(),
      coverSrc: exportCoverSrc,
      notes: data.notes,
      aData: data.aData,
      sData: data.sData,
      playerAcc: data.playerAcc,
      difficulty: seg.difficulty,
      D,
      passPct,
      backlightPct,
      breakPct,
      minVal: data.minVal,
      maxVal: data.maxVal
    });

    exportContainer.style.width = '1080px';
    exportContainer.style.padding = '0';
    exportContainer.innerHTML = html;

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const lineCanvas = exportContainer.querySelector('#segxLineChart');
    const barCanvas = exportContainer.querySelector('#segxBarChart');
    if (lineCanvas && barCanvas) {
      const dpr = 3, w = 280, h = 140;
      const chartData = { aData: data.aData, sData: data.sData, minVal: data.minVal, maxVal: data.maxVal };

      lineCanvas.width = w * dpr;
      lineCanvas.height = h * dpr;
      lineCanvas.style.width = w + 'px';
      lineCanvas.style.height = h + 'px';
      const ctxLine = lineCanvas.getContext('2d');
      ctxLine.scale(dpr, dpr);
      segDrawLineChart(ctxLine, chartData, w, h);

      barCanvas.width = w * dpr;
      barCanvas.height = h * dpr;
      barCanvas.style.width = w + 'px';
      barCanvas.style.height = h + 'px';
      const ctxBar = barCanvas.getContext('2d');
      ctxBar.scale(dpr, dpr);
      segDrawBarChart(ctxBar, chartData, w, h);
    }

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
      setTimeout(finish, 5000);
    });

    const canvas = await html2canvas(exportContainer, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1080,
      height: exportContainer.scrollHeight,
      imageTimeout: 5000,
      removeContainer: true,
    });

    const safeName = seg.name.replace(/[/\\?%*:|"<>]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = await canvasToOptimizedBlob(canvas, 2700);
    if (!blob) throw new Error('图片编码失败');
    downloadBlobWithExt(blob, `段位_${safeName}_${dateStr}`);
  } catch (err) {
    console.error(err);
    alert('段位图片导出失败：' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
    exportContainer.style.width = prevWidth;
    exportContainer.style.padding = prevPadding;
  }
}
