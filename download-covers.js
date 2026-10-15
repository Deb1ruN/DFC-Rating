// download-covers.js
// 用法：node download-covers.js
// 依赖：npm install sharp

const fs = require('fs');
const path = require('path');

// ================= 配置 =================
const API_BASE = 'https://phira.5wyxi.com';
const OUT_BASE = path.join(__dirname, 'images');
const OUT_FULL = path.join(OUT_BASE, 'full');
const OUT_THUMB = path.join(OUT_BASE, 'thumb');
const DATA_FILE = path.join(__dirname, 'data-songs.js');
const DELAY_MS = 300;
const RETRY = 2;

// 缩略图参数
const THUMB_WIDTH = 256;      // 缩略图宽度（px），2x 屏也能清晰显示
const THUMB_QUALITY = 80;     // WebP 质量（0-100）

// ================= 加载 sharp =================
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ 未找到 sharp 模块，请先在项目根目录执行：');
  console.error('   npm install sharp');
  process.exit(1);
}

// ================= 加载 SONG_DATA =================
if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ 找不到 ${DATA_FILE}`);
  process.exit(1);
}

global.window = {};
const dataCode = fs.readFileSync(DATA_FILE, 'utf-8');
eval(dataCode);
const SONG_DATA = global.window.SONG_DATA;

if (!Array.isArray(SONG_DATA)) {
  console.error('❌ SONG_DATA 加载失败，请检查 data-songs.js 格式');
  process.exit(1);
}
console.log(`📚 共读取 ${SONG_DATA.length} 条谱面数据\n`);

// ================= 工具函数 =================
const sleep = ms => new Promise(r => setTimeout(r, ms));

function extFromContentType(ct) {
  if (!ct) return 'png';
  if (ct.includes('png')) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'png';
}

async function fetchWithRetry(url, retry = RETRY) {
  for (let i = 0; i <= retry; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (e) {
      if (i === retry) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

// ================= 主流程 =================
(async () => {
  if (!fs.existsSync(OUT_FULL)) fs.mkdirSync(OUT_FULL, { recursive: true });
  if (!fs.existsSync(OUT_THUMB)) fs.mkdirSync(OUT_THUMB, { recursive: true });

  let okCount = 0, skipCount = 0, failCount = 0, noCoverCount = 0;
  const manifest = {};

  for (const song of SONG_DATA) {
    if (!song.chartId) continue;
    const id = String(song.chartId);

    // 断点续传检查
    const fullExisting = fs.readdirSync(OUT_FULL).find(f => f.startsWith(`${id}.`));
    const thumbPath = path.join(OUT_THUMB, `${id}.webp`);
    if (fullExisting && fs.existsSync(thumbPath)) {
      manifest[id] = { full: fullExisting, thumb: `${id}.webp` };
      skipCount++;
      console.log(`[跳过] ${id}`);
      continue;
    }

    try {
      // 1. 获取曲绘 URL
      const metaResp = await fetchWithRetry(`${API_BASE}/chart/${song.chartId}`);
      const meta = await metaResp.json();

      if (!meta.illustration) {
        noCoverCount++;
        console.log(`[无曲绘] ${id} ${song.name}`);
        await sleep(DELAY_MS);
        continue;
      }

      // 2. 下载原图
      const imgResp = await fetchWithRetry(meta.illustration);
      const buf = Buffer.from(await imgResp.arrayBuffer());
      const ct = imgResp.headers.get('content-type') || '';
      const ext = extFromContentType(ct);

      // 3. 保存原图
      const fullFilename = `${id}.${ext}`;
      fs.writeFileSync(path.join(OUT_FULL, fullFilename), buf);

      // 4. 生成缩略图（WebP，宽 256）
      const thumbFilename = `${id}.webp`;
      await sharp(buf)
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(path.join(OUT_THUMB, thumbFilename));

      manifest[id] = { full: fullFilename, thumb: thumbFilename };
      okCount++;
      console.log(`[成功] ${id} → full:${fullFilename}(${(buf.length / 1024).toFixed(0)}KB) thumb:${thumbFilename}`);
    } catch (e) {
      failCount++;
      console.error(`[失败] ${id} ${song.name}: ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(
    path.join(OUT_BASE, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\n===== 完成 =====`);
  console.log(`✅ 成功: ${okCount}   跳过: ${skipCount}   无曲绘: ${noCoverCount}   失败: ${failCount}`);
  console.log(`📄 manifest.json 已更新`);
})();