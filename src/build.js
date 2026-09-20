// Gộp 6 màn hình Stitch + src/app.js thành 1 file index.html duy nhất.
// Chạy: node src/build.js
const fs = require('fs');
const path = require('path');

const PAGES = ['dashboard', 'khach-hang-tiem-nang', 'pipeline', 'bao-gia', 'cham-soc-khieu-nai', 'bao-cao-doanh-so'];
const TITLE = 'CleanTech CRM - KCN Supplies Portal';
const read = (f) => fs.readFileSync(f, 'utf8');
const html = {};
PAGES.forEach((p) => { html[p] = read(path.join(__dirname, 'pages', p + '.html')); });

// ---- Gộp cấu hình Tailwind của các trang (giữ giá trị đầu tiên nếu trùng khóa) ----
function getConfig(h) {
  const m = h.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/);
  const src = m[1].trim().replace(/^tailwind\.config\s*=\s*/, '').replace(/;\s*$/, '');
  return new Function('return (' + src + ')')();
}
const merged = { darkMode: 'class', theme: { extend: {} } };
PAGES.forEach((p) => {
  const ext = getConfig(html[p]).theme.extend;
  Object.keys(ext).forEach((group) => {
    const target = (merged.theme.extend[group] = merged.theme.extend[group] || {});
    Object.entries(ext[group]).forEach(([name, value]) => {
      if (target[name] === undefined) target[name] = value;
      else if (JSON.stringify(target[name]) !== JSON.stringify(value)) console.warn('Tailwind config khác nhau:', p, group, name);
    });
  });
});

// ---- Khung chung lấy từ pipeline.html: head, sidebar, header ----
const base = html['pipeline'];
const head = base.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(/<script id="tailwind-config">[\s\S]*?<\/script>/, '<script id="tailwind-config">tailwind.config=' + JSON.stringify(merged) + '</script>');
const bodyClass = (base.match(/<body class="([^"]*)"/) || [])[1] || '';
const aside = base.match(/<aside[\s\S]*?<\/aside>/)[0];
const header = base.match(/<header[\s\S]*?<\/header>/)[0];
const toHash = (s) => s.replace(/href="([a-z-]+)\.html"/g, 'href="#$1"');

// ---- Mỗi màn hình -> 1 khối <main data-page="..."> (ẩn mặc định, router bật/tắt) ----
const seenIds = {};
const mains = PAGES.map((p) => {
  let h = html[p].replace(/<script>\s*\/\/ Simple active navigation highlighter helper[\s\S]*?<\/script>/, '');
  const open = h.match(/<main\b([^>]*)>/);
  const start = h.indexOf(open[0]);
  const end = h.lastIndexOf('</main>');
  const inner = h.slice(start + open[0].length, end);
  const cls = (open[1].match(/class="([^"]*)"/) || [])[1] || '';
  (inner.match(/\bid="([^"]+)"/g) || []).forEach((m) => {
    const id = m.slice(4, -1);
    if (seenIds[id] && seenIds[id] !== p) console.warn('ID trùng giữa', seenIds[id], 'và', p, ':', id);
    seenIds[id] = p;
  });
  return '<main data-page="' + p + '" hidden class="' + cls + '">' + toHash(inner) + '</main>';
});

const appJs = read(path.join(__dirname, 'app.js'));
if (/<\/script/i.test(appJs)) throw new Error('app.js chứa "</script" — không thể nhúng inline');

const out = '<!DOCTYPE html>\n<html lang="vi"><head>' + head + '<title>' + TITLE + '</title></head>' +
  '<body class="' + bodyClass + '">' + toHash(aside) + '<div class="pl-[260px]">' + header + '\n' + mains.join('\n') + '</div>' +
  '\n<script>\n' + appJs + '\n</script></body></html>\n';

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), out);
console.log('Đã tạo index.html —', Math.round(out.length / 1024), 'KB,', PAGES.length, 'màn hình');
