// data-segments.js
// 段位数据（共 39 条）
// 格式：{ name, charter, chartId, notes: [N1, N2, N3, N4], yellowRatio }
// - chartId：null 表示该段位暂无 Phira 编号
// - notes：四首单曲的物量；缺失部分以 null 占位
// - yellowRatio：黄键占比（由原表的「总drag数 ÷ 总物量」换算）
window.SEG_PRESETS = [
  { name: '9', charter: 'Iblcya', chartId: null, notes: [1437, 2025, 2261, 1673], yellowRatio: 0.279069767441860 },
  { name: '10', charter: 'Iblcya', chartId: null, notes: [2199, 1638, 1682, 1572], yellowRatio: 0.317021576646 },
  { name: 'Challenge', charter: 'Iblcya', chartId: 51714, notes: [7777, 9352, 6161, 5777], yellowRatio: 0.423112588158 },
  { name: 'DestEnd', charter: 'CrcrAOSy/TEC109/Jiuwenzi/Anxiety', chartId: 52160, notes: [1400, 1514, 3120, 1755], yellowRatio: 0.324046733 },
  { name: 'DestEnd EX', charter: 'Anxiety/Jiuwenzi/NKSV', chartId: 65888, notes: [2057, 1846, 2254, 2731], yellowRatio: 0.321219622 },
  { name: 'Donk δ', charter: 'Jiuwenzi', chartId: 50503, notes: [2200, 1400, 2976, 1600], yellowRatio: 0.306662 },
  { name: 'FT VIII', charter: '尾焰', chartId: null, notes: [2461, 2108, 2890, 2897], yellowRatio: 0.369736 },
  { name: 'GD', charter: '尾焰', chartId: null, notes: [970, 1939, 3585, 2867], yellowRatio: 0.428469 },
  { name: 'GT Extra', charter: 'TEC109', chartId: 65860, notes: [999, 2804, 1653, 2026], yellowRatio: 0.217321 },
  { name: 'GT Regular', charter: 'TEC109', chartId: 41376, notes: [3460, 1610, 2967, 2309], yellowRatio: 0.383433 },
  { name: 'Rebrith', charter: '尾焰', chartId: null, notes: [null, null, null, null], yellowRatio: 0.236862 },
  { name: 'RM 1st', charter: '芝羽', chartId: 45170, notes: [1116, 2228, 2000, 1152], yellowRatio: 0.369049 },
  { name: 'RM 2nd', charter: '芝羽', chartId: 75090, notes: [2170, 3333, 4276, 4074], yellowRatio: 0.287302 },
  { name: 'RW Extra', charter: 'Jiuwenzi', chartId: 77739, notes: [3186, 3046, 2198, 1826], yellowRatio: 0.245320 },
  { name: 'Sample 8', charter: 'Jiuwenzi', chartId: 53531, notes: [1736, 1387, 1620, 1405], yellowRatio: 0.243819 },
  { name: 'Sample 9', charter: 'Jiuwenzi', chartId: null, notes: [null, null, null, null], yellowRatio: 0.353839 },
  { name: 'Sample α', charter: 'Jiuwenzi', chartId: 52534, notes: [1702, 2040, 2550, 2087], yellowRatio: 0.289056 },
  { name: 'Sample β', charter: 'Jiuwenzi', chartId: 54376, notes: [2100, 1350, 3248, 1400], yellowRatio: 0.36 },
  { name: 'Sample γ', charter: 'Jiuwenzi', chartId: 54242, notes: [1953, 1764, 2257, 1955], yellowRatio: 0.205069 },
  { name: 'Sample δ', charter: '尾焰', chartId: null, notes: [1676, 2040, 2040, 1652], yellowRatio: 0.179131 },
  { name: 'Sample δ', charter: 'Jiuwenzi', chartId: 56763, notes: [1800, 1384, 3336, 2295], yellowRatio: 0.327739 },
  { name: 'Sample εv1.1', charter: 'Jiuwenzi', chartId: null, notes: [2139, 2736, 2713, 1901], yellowRatio: 0.185710 },
  { name: 'Sample ζ', charter: 'Jiuwenzi', chartId: null, notes: [2188, 2443, 2198, 2284], yellowRatio: 0.202348 },
  { name: 'Simple Alpha', charter: 'Mootles', chartId: 76238, notes: [1647, 1442, 1030, 2835], yellowRatio: 0.051617 },
  { name: 'Simple Gamma', charter: 'Deb1ruN_', chartId: 77547, notes: [2000, 2000, 2000, 2000], yellowRatio: 0.22175 },
  { name: 'Yuzu', charter: '861168', chartId: 30139, notes: [868, 972, 838, 1085], yellowRatio: 0.071220 },
  { name: 'α v1', charter: 'Iblcya', chartId: 4819, notes: [1555, 1632, 1211, 1637], yellowRatio: 0.172241 },
  { name: 'α v1.5', charter: 'Iblcya', chartId: 33458, notes: [1111, 1632, 1211, 1637], yellowRatio: 0.216239 },
  { name: 'β', charter: 'Iblcya', chartId: null, notes: [1537, 1869, 2444, 1864], yellowRatio: 0.297373 },
  { name: 'γ', charter: 'Iblcya', chartId: null, notes: [1800, 1700, 2400, 2200], yellowRatio: 0.172222 },
  { name: 'δ', charter: 'Iblcya', chartId: 7722, notes: [3357, 2792, 2044, 2170], yellowRatio: 0.306475 },
  { name: 'δ Plus', charter: 'qwpp', chartId: 44730, notes: [2141, 1300, 2600, 2774], yellowRatio: 0.349972 },
  { name: 'ε', charter: 'Iblcya', chartId: 4820, notes: [3000, 2100, 3000, 2400], yellowRatio: 0.266286 },
  { name: 'ζ', charter: 'Iblcya', chartId: null, notes: [2721, 3115, 5000, 3600], yellowRatio: 0.495049 },
  { name: 'η', charter: 'Iblcya', chartId: null, notes: [1999, 6919, 2999, null], yellowRatio: 0.161856 },
  { name: '地心游记', charter: 'noname', chartId: 61200, notes: [1771, 1900, 1884, 2616], yellowRatio: 0.238649 },
  { name: '花海迷途', charter: 'noname', chartId: 70944, notes: [1875, 2004, 2411, 2350], yellowRatio: 0.274276 },
  { name: '神 Zenith', charter: 'TEC109', chartId: 47314, notes: [1773, 2519, 2474, 1978], yellowRatio: 0.300092 },
  { name: '天使尘 ζ', charter: 'Iblcya', chartId: null, notes: [1829, 2467, 3232, 3583], yellowRatio: 0.178472 }
];