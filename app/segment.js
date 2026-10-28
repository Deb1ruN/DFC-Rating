// app/segment.js
// 段位计算与图表绘制（原第 19 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 19. 段位计算
// ============================================================
function segGetNotes() { return segNInputs.map(inp => parseInt(inp.value, 10)); }
function segValidateNotes() {
  const notes = segGetNotes();
  for (let i = 0; i < notes.length; i++) {
    if (isNaN(notes[i]) || notes[i] <= 0 || !Number.isInteger(notes[i])) return { valid: false, index: i };
  }
  return { valid: true };
}
function segGetAccs(arr) { return arr.map(inp => parseFloat(inp.value)); }
function segValidateAccs(accs) {
  for (let i = 0; i < accs.length; i++) {
    if (isNaN(accs[i]) || accs[i] < 0 || accs[i] > 100) return false;
  }
  return true;
}
function segSetNotesDisabled(disabled) { segNInputs.forEach(inp => inp.disabled = disabled); }
function segSetNotesValues(notes) {
  segNInputs.forEach((inp, i) => {
    const v = notes[i];
    inp.value = (v === null || v === undefined) ? '' : v;
  });
}

function segShowInfo(preset) {
  if (!preset) { segInfoRow.classList.add('hidden'); return; }
  const D = preset.yellowRatio || 0;
  const passAcc = calcACCFromSTACC(0.97, D);
  const backlightAcc = calcACCFromSTACC(0.985, D);
  const breakAcc = calcACCFromSTACC(0.995, D);
  segStdPass.textContent = passAcc !== null ? (passAcc * 100).toFixed(2) + '%' : '—';
  segStdBacklight.textContent = backlightAcc !== null ? (backlightAcc * 100).toFixed(2) + '%' : '—';
  segStdBreak.textContent = breakAcc !== null ? (breakAcc * 100).toFixed(2) + '%' : '—';
  segAuthorName.textContent = preset.charter || '未知';
  segInfoRow.classList.remove('hidden');
}
function segHideInfo() { segInfoRow.classList.add('hidden'); }

function segRenderDropdown() {
  // 统计同名段位，用于下拉菜单中区分
  const nameCount = {};
  SEG_PRESETS.forEach(p => { nameCount[p.name] = (nameCount[p.name] || 0) + 1; });

  let html = '';
  SEG_PRESETS.forEach((p, idx) => {
    // 是否有缺失物量（null / undefined）
    const hasMissing = !p.notes || p.notes.some(n => n === null || n === undefined);
    const missingTag = hasMissing ? ' ⚠️' : '';
    // 同名段位附加谱师信息以区分
    const displayName = nameCount[p.name] > 1
      ? `${p.name} · ${p.charter || '未知'}`
      : p.name;
    html += `<div class="item" data-index="${idx}">${escapeHtml(displayName)}${missingTag}</div>`;
  });
  segPresetDropdown.innerHTML = html;
  segPresetDropdown.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', function(e) {
      const idx = parseInt(this.dataset.index, 10);
      if (!isNaN(idx) && SEG_PRESETS[idx]) segSelectPreset(SEG_PRESETS[idx]);
      segCloseDropdown();
    });
  });
}
function segSelectPreset(preset) {
  if (segIsCustom) {
    segCustomToggle.checked = false;
    segIsCustom = false;
    segPresetLabel.textContent = '选择段位';
    segSetNotesDisabled(false);
    segHideInfo();
  }
  segSelectedPreset = preset;
  segPresetLabel.textContent = preset.name;
  if (preset.notes) {
    segSetNotesValues(preset.notes);
    // 物量完整才禁用；缺失时允许用户手动补全
    const allComplete = preset.notes.every(n => n !== null && n !== undefined && Number.isInteger(n) && n > 0);
    segSetNotesDisabled(allComplete);
  }
  segShowInfo(preset);
  segUpdateCharts();
}
function segToggleDropdown() {
  if (segIsCustom) return;
  const isOpen = segPresetDropdown.classList.toggle('open');
  segPresetBtn.classList.toggle('open', isOpen);
}
function segCloseDropdown() {
  segPresetDropdown.classList.remove('open');
  segPresetBtn.classList.remove('open');
}

segPresetBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  segToggleDropdown();
});
document.addEventListener('click', function(e) {
  const selector = segPresetBtn.parentElement;
  if (!selector.contains(e.target)) segCloseDropdown();
});

segCustomToggle.addEventListener('change', function() {
  segIsCustom = this.checked;
  if (segIsCustom) {
    segPresetLabel.textContent = '自定义';
    segSelectedPreset = null;
    segSetNotesDisabled(false);
    segHideInfo();
    segCloseDropdown();
  } else {
    segPresetLabel.textContent = '选择段位';
    segSetNotesDisabled(false);
    segHideInfo();
  }
  segUpdateCharts();
});

function segComputeReverse() {
  const notes = segGetNotes();
  const notesValid = segValidateNotes();
  if (!notesValid.valid) return { ok: false, error: 'notes', index: notesValid.index };

  const accs = segGetAccs(segAInputs);
  if (!segValidateAccs(accs)) return { ok: false, error: 'acc' };

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

  const clamp = (v) => Math.min(100, Math.max(0, v));
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

function segReverseDerive() {
  const r = segComputeReverse();
  if (!r.ok) {
    if (r.error === 'notes') {
      segResultReverse.innerHTML = `<div class="validation err">❌ 第 ${r.index+1} 个物量无效，请输入正整数。</div>`;
    } else if (r.error === 'acc') {
      segResultReverse.innerHTML = `<div class="validation err">❌ 请确保所有ACC在 0~100 之间。</div>`;
    } else {
      segResultReverse.innerHTML = `<div class="validation err">❌ 计算异常，请检查物量是否为零。</div>`;
    }
    segUpdateCharts();
    return;
  }

  const labels = ['S₁', 'S₂', 'S₃', 'S₄'];
  let html = `<div class="result-item"><span>推导出的单曲ACC：</span></div>`;
  for (let i = 0; i < 4; i++) {
    const val = r.S[i].toFixed(2);
    const cls = (r.S[i] < 0 || r.S[i] > 100) ? 'danger' : 'success';
    html += `<div class="result-item"><span>${labels[i]}</span><span class="val ${cls}">${val}%</span></div>`;
  }
  if (r.rawOut) html += `<div class="validation warn">⚠️ 推导值超出正常范围，输入数据可能不一致（四舍五入影响）。</div>`;
  else if (r.allOk) html += `<div class="validation ok">✅ 数据自洽，重算的A₂/A₃/A₄与输入误差 ≤ ${r.eps}</div>`;
  else html += `<div class="validation warn">⚠️ 重算误差较大（A₂:${r.diff2.toFixed(3)}，A₃:${r.diff3.toFixed(3)}，A₄:${r.diff4.toFixed(3)}），请检查输入或物量。</div>`;
  html += `<div style="font-size:12px;color:#64748b;margin-top:4px;">重算 A₂=${r.calcA2.toFixed(2)}，A₃=${r.calcA3.toFixed(2)}，A₄=${r.calcA4.toFixed(2)}</div>`;
  segResultReverse.innerHTML = html;

  segUpdateCharts();
}

function segForwardSynthesize() {
  const notes = segGetNotes();
  if (!segValidateNotes().valid) {
    segResultForward.innerHTML = `<div class="validation err">❌ 物量无效，请检查。</div>`;
    segUpdateCharts();
    return;
  }
  const accs = segGetAccs(segSInputs);
  if (!segValidateAccs(accs)) {
    segResultForward.innerHTML = `<div class="validation err">❌ 请确保单曲ACC在 0~100 之间。</div>`;
    segUpdateCharts();
    return;
  }
  const [N1, N2, N3, N4] = notes;
  const [S1, S2, S3, S4] = accs;
  const weightedSum = N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4;
  const totalNotes = N1 + N2 + N3 + N4;
  const totalAcc = Math.min(100, Math.max(0, weightedSum / totalNotes));
  const display = totalAcc.toFixed(2);

  let html = `<div class="result-item"><span>段位总ACC</span><span class="val success">${display}%</span></div>`;
  html += `<div style="font-size:13px;color:#64748b;margin-top:6px;">加权公式：(${N1}×${S1.toFixed(2)} + ${N2}×${S2.toFixed(2)} + ${N3}×${S3.toFixed(2)} + ${N4}×${S4.toFixed(2)}) / ${totalNotes}</div>`;
  segResultForward.innerHTML = html;
  segUpdateCharts();
}

function segComputeCumulativeFromS() {
  const notes = segGetNotes();
  if (!segValidateNotes().valid) return { ok: false };
  const accs = segGetAccs(segSInputs);
  if (!segValidateAccs(accs)) return { ok: false };

  const [N1, N2, N3, N4] = notes;
  const [S1, S2, S3, S4] = accs;
  return {
    ok: true,
    A: [
      S1,
      (N1 * S1 + N2 * S2) / (N1 + N2),
      (N1 * S1 + N2 * S2 + N3 * S3) / (N1 + N2 + N3),
      (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4)
    ]
  };
}

function segUpdateModeUI() {
  const reverse = segMode === 'reverse';
  segModeTitle.innerHTML = reverse
    ? '策略一：逆向推导 <span class="tag">已知分段ACC</span>'
    : '策略二：正向合成 <span class="tag">已知单曲ACC</span>';
  segFieldsReverse.style.display = reverse ? '' : 'none';
  segFieldsForward.style.display = reverse ? 'none' : '';
  segBtnReverse.style.display = reverse ? '' : 'none';
  segBtnForward.style.display = reverse ? 'none' : '';
  segResultReverse.style.display = reverse ? '' : 'none';
  segResultForward.style.display = reverse ? 'none' : '';
}

function segSwitchMode() {
  if (segMode === 'reverse') {
    // 策略一 -> 策略二：把推导出的单曲 ACC 填入策略二
    const r = segComputeReverse();
    if (r.ok) {
      segSInputs.forEach((inp, i) => { inp.value = r.S[i].toFixed(2); });
    }

    segMode = 'forward';
    segUpdateModeUI();

    if (r.ok) {
      segForwardSynthesize();
    } else {
      const sVals = segGetAccs(segSInputs);
      if (segValidateAccs(sVals)) segForwardSynthesize();
      else {
        segResultForward.innerHTML = `<div class="hint-default">请先填写有效的 A₁~A₄，或直接输入单曲 ACC</div>`;
        segUpdateCharts();
      }
    }
  } else {
    // 策略二 -> 策略一：把单曲 ACC 合成出的分段 ACC 填入策略一
    const c = segComputeCumulativeFromS();
    if (c.ok) {
      segAInputs.forEach((inp, i) => { inp.value = c.A[i].toFixed(2); });
    }

    segMode = 'reverse';
    segUpdateModeUI();

    if (c.ok) {
      segReverseDerive();
    } else {
      const aVals = segGetAccs(segAInputs);
      if (segValidateAccs(aVals)) segReverseDerive();
      else {
        segResultReverse.innerHTML = `<div class="hint-default">请先填写有效的 S₁~S₄，或直接输入分段 ACC</div>`;
        segUpdateCharts();
      }
    }
  }
}

function segResetAll() {
  segAInputs.forEach(inp => inp.value = '');
  segSInputs.forEach(inp => inp.value = '');
  segResultReverse.innerHTML = `<div class="hint-default">输入分段ACC后点击推导</div>`;
  segResultForward.innerHTML = `<div class="hint-default">输入单曲ACC后点击合成</div>`;
  segMode = 'reverse';
  segUpdateModeUI();
  segSetChartMode('line');
}

segBtnReverse.addEventListener('click', segReverseDerive);
segBtnForward.addEventListener('click', segForwardSynthesize);
segBtnSwitchMode.addEventListener('click', segSwitchMode);
segResetBtn.addEventListener('click', segResetAll);

// 段位图表
function segPrepareChartData() {
  const notes = segGetNotes();
  const aVals = segGetAccs(segAInputs);
  const sVals = segGetAccs(segSInputs);
  const hasA = aVals.every(v => !isNaN(v)) && segValidateAccs(aVals);
  const hasS = sVals.every(v => !isNaN(v)) && segValidateAccs(sVals);
  const notesValid = segValidateNotes().valid;

  let aData = [null, null, null, null];
  let sData = [null, null, null, null];

  if (hasA) aData = aVals.slice();
  else if (hasS && notesValid) {
    const [N1, N2, N3, N4] = notes;
    const [S1, S2, S3, S4] = sVals;
    aData = [
      S1,
      (N1 * S1 + N2 * S2) / (N1 + N2),
      (N1 * S1 + N2 * S2 + N3 * S3) / (N1 + N2 + N3),
      (N1 * S1 + N2 * S2 + N3 * S3 + N4 * S4) / (N1 + N2 + N3 + N4)
    ];
  }

  if (hasS) sData = sVals.slice();
  else if (hasA && notesValid) {
    const [N1, N2, N3, N4] = notes;
    const [A1, A2, A3, A4] = aVals;
    try {
      const S1 = A1;
      const S2 = (A2 * (N1 + N2) - N1 * S1) / N2;
      const S3 = (A3 * (N1 + N2 + N3) - N1 * S1 - N2 * S2) / N3;
      const S4 = (A4 * (N1 + N2 + N3 + N4) - N1 * S1 - N2 * S2 - N3 * S3) / N4;
      sData = [S1, S2, S3, S4].map(v => Math.min(100, Math.max(0, v)));
    } catch (e) {}
  }

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
  return { aData, sData, minVal, maxVal, notesValid };
}

function segDrawLineChart(ctx, data, width, height) {
  const { aData, minVal, maxVal } = data;
  const pad = { top: 20, bottom: 30, left: 50, right: 20 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xLabels = ['第一首', '第二首', '第三首', '第四首'];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  const range = maxVal - minVal;
  const steps = 5;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  for (let i = 0; i <= steps; i++) {
    const val = minVal + (range * i / steps);
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    ctx.fillStyle = '#64748b';
    ctx.fillText(val.toFixed(1) + '%', pad.left - 6, y);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.moveTo(pad.left - 3, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
    ctx.strokeStyle = '#eef2f6';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  const points = aData.map((val, i) => {
    const x = pad.left + (i + 0.5) * (chartW / aData.length);
    const y = (val !== null && !isNaN(val)) ? pad.top + chartH - (val - minVal) / range * chartH : null;
    return { x, y, val };
  });

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let first = true;
  points.forEach(p => {
    if (p.y === null) return;
    if (first) { ctx.moveTo(p.x, p.y); first = false; }
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach((p, i) => {
    if (p.y === null) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText((p.val !== null && !isNaN(p.val)) ? p.val.toFixed(2) + '%' : '—', p.x, p.y - 8);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(xLabels[i], p.x, pad.top + chartH + 6);
  });
}

function segDrawBarChart(ctx, data, width, height) {
  const { sData, minVal, maxVal } = data;
  const pad = { top: 20, bottom: 30, left: 50, right: 20 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xLabels = ['第一首', '第二首', '第三首', '第四首'];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  const range = maxVal - minVal;
  const steps = 5;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  for (let i = 0; i <= steps; i++) {
    const val = minVal + (range * i / steps);
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    ctx.fillStyle = '#64748b';
    ctx.fillText(val.toFixed(1) + '%', pad.left - 6, y);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.moveTo(pad.left - 3, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
    ctx.strokeStyle = '#eef2f6';
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
  }

  const barWidth = chartW / sData.length * 0.45;
  const gap = (chartW - barWidth * sData.length) / (sData.length + 1);
  sData.forEach((val, i) => {
    const x = pad.left + gap + i * (barWidth + gap);
    if (val === null || isNaN(val)) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('—', x + barWidth / 2, pad.top + chartH - 4);
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(xLabels[i], x + barWidth / 2, pad.top + chartH + 6);
      return;
    }
    const y = pad.top + chartH - (val - minVal) / range * chartH;
    const h = (val - minVal) / range * chartH;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x, y, barWidth, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText(val.toFixed(2) + '%', x + barWidth / 2, y - 4);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(xLabels[i], x + barWidth / 2, pad.top + chartH + 6);
  });
}

function segSetChartMode(mode) {
  segChartMode = mode === 'bar' ? 'bar' : 'line';
  segChartTitle.textContent = segChartMode === 'bar'
    ? '📊 单曲ACC (柱状图)'
    : '📈 分段ACC (折线图)';
  segUpdateCharts();
}

function segUpdateCharts() {
  const data = segPrepareChartData();
  if (!data.notesValid) {
    const ctx = segChart.getContext('2d');
    ctx.clearRect(0, 0, segChart.width, segChart.height);
    return;
  }
  const dpr = window.devicePixelRatio || 1;

  const rect = segChart.getBoundingClientRect();
  const w = rect.width || 600;
  const h = rect.height || 240;
  segChart.width = w * dpr;
  segChart.height = h * dpr;
  segChart.style.width = w + 'px';
  segChart.style.height = h + 'px';
  const ctx = segChart.getContext('2d');
  ctx.scale(dpr, dpr);

  if (segChartMode === 'bar') {
    segDrawBarChart(ctx, data, w, h);
  } else {
    segDrawLineChart(ctx, data, w, h);
  }
}

segBtnChartToggle.addEventListener('click', function() {
  segSetChartMode(segChartMode === 'line' ? 'bar' : 'line');
});

