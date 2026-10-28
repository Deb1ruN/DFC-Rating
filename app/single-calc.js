// app/single-calc.js
// 单曲计算（原第 18 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 18. 单曲计算
// ============================================================
calcDBtn.addEventListener('click', () => {
  const drag = parseFloat(dragCount.value);
  const total = parseFloat(totalNotes.value);
  if (isNaN(drag) || isNaN(total) || total <= 0) { resultD.textContent = '—'; return; }
  const D = drag / total;
  resultD.textContent = toSigFigs(D * 100, 4) + '%';
  updateBenchmarks(D);
});
function updateBenchmarks(D) {
  if (isNaN(D) || D < 0) {
    benchPass.textContent = '—'; benchBacklight.textContent = '—'; benchBreak.textContent = '—';
    return;
  }
  const stds = [0.97, 0.985, 0.995];
  const labels = [benchPass, benchBacklight, benchBreak];
  const colors = ['#3b82f6', '#8b5cf6', '#10b981'];
  stds.forEach((s, i) => {
    const acc = calcACCFromSTACC(s, D);
    if (acc !== null && !isNaN(acc)) {
      labels[i].textContent = toSigFigs(acc * 100, 4) + '%';
      labels[i].style.color = colors[i];
    } else labels[i].textContent = '—';
  });
}
sendDToModule2.addEventListener('click', () => {
  const t = resultD.textContent;
  if (t === '—') { alert('请先计算黄键占比 D！'); return; }
  const v = parseFloat(t);
  if (isNaN(v)) { alert('请先计算黄键占比 D！'); return; }
  module2D.value = toSigFigs(v, 4);
  triggerModule2();
});
module2ACC.addEventListener('input', triggerModule2);
module2STACC.addEventListener('input', triggerModule2);
module2D.addEventListener('input', triggerModule2);
function triggerModule2() {
  const DPercent = parseFloat(module2D.value);
  const D = DPercent / 100;
  if (isNaN(D) || D < 0) { resultSTACC.textContent = '—'; resultACC.textContent = '—'; return; }
  const accVal = parseFloat(module2ACC.value);
  if (!isNaN(accVal) && accVal >= 0 && accVal <= 100) {
    const stacc = calcSTACC(accVal / 100, D);
    if (stacc !== null && !isNaN(stacc)) {
      resultSTACC.textContent = toSigFigs(stacc * 100, 4) + '%';
      resultSTACC.style.color = getStaccColor(stacc);
    } else resultSTACC.textContent = '—';
  } else {
    const staccVal = parseFloat(module2STACC.value);
    if (!isNaN(staccVal) && staccVal >= 0 && staccVal <= 100) {
      const acc = calcACCFromSTACC(staccVal / 100, D);
      if (acc !== null && !isNaN(acc)) {
        resultACC.textContent = toSigFigs(acc * 100, 4) + '%';
        resultACC.style.color = '#2563eb';
      } else resultACC.textContent = '—';
    } else if (!module2ACC.value.trim() && !module2STACC.value.trim()) {
      resultSTACC.textContent = '—'; resultACC.textContent = '—';
    }
  }
}
sendToModule3.addEventListener('click', () => {
  const t = resultSTACC.textContent;
  if (t && t !== '—') {
    const v = parseFloat(t);
    if (!isNaN(v)) module3STACC.value = toSigFigs(v, 4);
  } else {
    const v = parseFloat(module2STACC.value);
    if (!isNaN(v) && v > 0 && v <= 100) module3STACC.value = toSigFigs(v, 4);
    else { alert('请先在模块二中输入或计算 STACC！'); return; }
  }
  calcRatingFn();
});
function calcRatingFn() {
  const constant = parseFloat(module3Constant.value);
  const staccPercent = parseFloat(module3STACC.value);
  if (isNaN(constant) || constant < 0) { resultRating.textContent = '—'; return; }
  if (isNaN(staccPercent) || staccPercent < 0 || staccPercent > 100) { resultRating.textContent = '—'; return; }
  const rating = calcSingleRating(constant, staccPercent / 100);
  resultRating.textContent = (!isNaN(rating) && isFinite(rating)) ? rating.toFixed(4) : '—';
}
calcRatingBtn.addEventListener('click', calcRatingFn);
module3STACC.addEventListener('input', () => { if (module3Constant.value.trim()) calcRatingFn(); });
module3Constant.addEventListener('input', () => { if (module3STACC.value.trim()) calcRatingFn(); });

