// app/main-table.js
// 主页面表格、ACC 存储、计算与清空（原第 11–14 节）
// 由 app.js 按原始顺序拆分而成；依赖前序脚本暴露的全局变量，请勿单独调整加载顺序。

// ============================================================
// 11. 主页面表格渲染
// ============================================================
function renderTable() {
  let html = '';
  SONG_DATA.forEach((song, idx) => {
    const constClass = getConstClass(song.constant);
    html += `
      <tr data-index="${idx}" data-id="${song.internalId}" class="${constClass}">
        <td class="col-art" data-chartid="${song.chartId || ''}"></td>
        <td class="col-name" title="${escapeHtml(song.name)}">${escapeHtml(song.name)}</td>
        <td class="col-const" style="text-align:center;">${song.constant}</td>
        <td class="col-chartid">${song.chartId !== null ? song.chartId : '—'}</td>
        <td class="col-acc">
          <input class="acc-input" type="number" step="any" min="0" max="100"
                 placeholder="ACC" data-index="${idx}" id="input_${idx}" inputmode="decimal" />
        </td>
        <td class="col-stacc" id="stacc_${idx}"><span class="rating-empty">—</span></td>
        <td class="col-rating" id="result_${idx}"><span class="rating-empty">—</span></td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;

  inputs = [];
  SONG_DATA.forEach((song, idx) => {
    const row = tableBody.querySelector(`tr[data-index="${idx}"]`);
    const tdArt = row.querySelector('.col-art');
    const artBox = makeArtBox(song.chartId);
    tdArt.appendChild(artBox);
    illustObserver.observe(artBox);

    const inp = document.getElementById(`input_${idx}`);
    inputs.push(inp);
    inp.addEventListener('input', () => {
      const resEl = document.getElementById(`result_${idx}`);
      const staccEl = document.getElementById(`stacc_${idx}`);
      if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
      if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
      saveToLocalStorage();
    });
  });
}

// ============================================================
// 12. localStorage（ACC）
// ============================================================
function collectAccObject() {
  const obj = {};
  inputs.forEach((inp, idx) => {
    const val = inp.value.trim();
    if (val !== '' && !isNaN(parseFloat(val))) obj[SONG_DATA[idx].internalId] = val;
  });
  Object.keys(segmentAccs).sort().forEach(id => {
    const val = String(segmentAccs[id] === undefined || segmentAccs[id] === null ? '' : segmentAccs[id]).trim();
    if (val !== '' && !isNaN(parseFloat(val))) obj[id] = val;
  });
  return obj;
}
function getAccSnapshot() {
  return JSON.stringify(collectAccObject());
}
function saveToLocalStorage() {
  localStorage.setItem(KEY.accs, JSON.stringify(collectAccObject()));
}

function getSegmentAcc(seg) {
  if (!seg || !seg.internalId) return null;
  const raw = segmentAccs[seg.internalId];
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseFloat(raw);
  return (isNaN(n) || n < 0 || n > 100) ? null : n;
}
function setSegmentAcc(seg, acc) {
  if (!seg || !seg.internalId) return;
  const n = Number(acc);
  if (isNaN(n)) delete segmentAccs[seg.internalId];
  else segmentAccs[seg.internalId] = n.toFixed(2);
}

function getSegmentRating(seg) {
  if (!seg || seg.difficulty === null || seg.difficulty === undefined || seg.difficulty === '') return null;
  const difficulty = Number(seg.difficulty);
  if (!isFinite(difficulty)) return null;
  const acc = getSegmentAcc(seg);
  if (acc === null) return null;
  const stacc = calcSTACC(acc / 100, seg.yellowRatio || 0);
  return calcSegmentRating(difficulty, stacc);
}

function getMaxSegmentRating() {
  let maxRating = null;
  SEG_DATA.forEach(seg => {
    const rating = getSegmentRating(seg);
    if (rating !== null && (maxRating === null || rating > maxRating)) maxRating = rating;
  });
  return maxRating;
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem(KEY.accs);
  if (!stored) return;
  try {
    const accObj = JSON.parse(stored);
    let anyFilled = false;
    SONG_DATA.forEach((song, idx) => {
      const id = song.internalId;
      if (accObj.hasOwnProperty(id)) {
        const val = accObj[id];
        if (val !== undefined && val !== null && val !== '') {
          inputs[idx].value = val;
          anyFilled = true;
        }
      }
    });
    SEG_DATA.forEach(seg => {
      const id = seg.internalId;
      if (accObj.hasOwnProperty(id)) {
        const val = accObj[id];
        if (val !== undefined && val !== null && val !== '') {
          segmentAccs[id] = val;
          anyFilled = true;
        }
      }
    });
    if (anyFilled) calculate(true);
  } catch (e) { localStorage.removeItem(KEY.accs); }
}

// ============================================================
// 13. 计算 & 显示
// ============================================================
function calculate(isInitialLoad) {
  results = [];
  inputs.forEach((inp, idx) => {
    const raw = inp.value.trim();
    if (raw === '') return;
    const accNum = parseFloat(raw);
    if (isNaN(accNum) || accNum < 0 || accNum > 100) return;
    const song = SONG_DATA[idx];
    const accDecimal = accNum / 100;
    const D = song.yellowRatio || 0;
    const stacc = calcSTACC(accDecimal, D);
    const staccPercent = stacc !== null ? stacc * 100 : 0;
    const rating = calcSingleRating(song.constant, stacc || 0);
    results.push({
      index: idx, id: song.internalId, rating, stacc: staccPercent, acc: accNum,
      constant: song.constant, chartId: song.chartId, name: song.name, yellowRatio: song.yellowRatio
    });
  });

  const snap = getAccSnapshot();
  if (snap !== lastAccSnapshot) {
    lastAccSnapshot = snap;
    if (!isInitialLoad) {
      lastCalcTime = Date.now();
      localStorage.setItem(KEY.lastcalc, String(lastCalcTime));
    } else if (!lastCalcTime) {
      lastCalcTime = Date.now();
      localStorage.setItem(KEY.lastcalc, String(lastCalcTime));
    }
  }

  updateDisplay();
  saveToLocalStorage();
}

function updateDisplay() {
  const validResults = results.filter(r => r.rating !== undefined && !isNaN(r.rating));
  const sorted = [...validResults].sort((a, b) => b.rating - a.rating);
  const top = sorted.slice(0, TOP_N);
  const count = top.length;

  let sumRating = 0;
  top.forEach(r => sumRating += r.rating);

  const isNormal = mainRatingMode !== 'force';
  let displayValue = null;
  if (isNormal) {
    displayValue = count > 0 ? sumRating / count : null;
    ratingLabel.textContent = '常规 Rating';
    ratingCountHint.textContent = `(${count} 首)`;
  } else {
    displayValue = getMaxSegmentRating();
    ratingLabel.textContent = '段位力 Rating';
    ratingCountHint.textContent = displayValue !== null ? '(段位最高)' : '(无段位成绩)';
  }

  displayRating.textContent = displayValue !== null ? displayValue.toFixed(2) : '—';
  lastCalcTimeEl.textContent = formatDateTime(lastCalcTime);

  SONG_DATA.forEach((_, idx) => {
    const resEl = document.getElementById(`result_${idx}`);
    const staccEl = document.getElementById(`stacc_${idx}`);
    if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
    if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
  });

  const topIndices = new Set(top.map(r => r.index));
  results.forEach(r => {
    const resEl = document.getElementById(`result_${r.index}`);
    const staccEl = document.getElementById(`stacc_${r.index}`);
    const isTop = topIndices.has(r.index);
    const staccVal = (r.stacc !== undefined && !isNaN(r.stacc)) ? r.stacc : null;
    const staccColor = (staccVal !== null) ? getStaccColor(staccVal / 100) : '#94a3b8';
    if (resEl) resEl.innerHTML = `<span style="color:#2563eb;font-weight:${isTop ? 700 : 500};">${r.rating.toFixed(2)}</span>`;
    if (staccEl) {
      staccEl.innerHTML = (staccVal !== null)
        ? `<span style="color:${staccColor};font-weight:${isTop ? 700 : 500};">${staccVal.toFixed(2)}%</span>`
        : '<span class="rating-empty">—</span>';
    }
  });

  inputs.forEach((inp, idx) => inp.classList.toggle('has-value', topIndices.has(idx)));
}

ratingModeNormal.addEventListener('click', () => {
  if (mainRatingMode === 'normal') return;
  mainRatingMode = 'normal';
  ratingModeNormal.classList.add('active');
  ratingModeForce.classList.remove('active');
  updateDisplay();
});
ratingModeForce.addEventListener('click', () => {
  if (mainRatingMode === 'force') return;
  mainRatingMode = 'force';
  ratingModeForce.classList.add('active');
  ratingModeNormal.classList.remove('active');
  updateDisplay();
});

// ============================================================
// 14. 清空 ACC
// ============================================================
function clearAll() {
  if (!confirm('确定要清空所有 ACC 数据吗？（玩家信息不会被清除）')) return;
  inputs.forEach(inp => { inp.value = ''; inp.classList.remove('has-value'); });
  SONG_DATA.forEach((_, idx) => {
    const resEl = document.getElementById(`result_${idx}`);
    const staccEl = document.getElementById(`stacc_${idx}`);
    if (resEl) resEl.innerHTML = '<span class="rating-empty">—</span>';
    if (staccEl) staccEl.innerHTML = '<span class="rating-empty">—</span>';
  });
  results = [];
  segmentAccs = {};
  updateDisplay();
  localStorage.removeItem(KEY.accs);
}

