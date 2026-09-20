/*
 * interactivity.js — LỚP JS BỔ SUNG để cho phép "thêm dữ liệu ngay trong phiên"
 * trên các màn hình Stitch, theo yêu cầu của người dùng.
 *
 * QUAN TRỌNG: file này KHÔNG chỉnh sửa bất kỳ HTML/CSS nào Stitch đã tạo.
 * Nó chỉ lắng nghe sự kiện trên các nút/ô nhập liệu CÓ SẴN (hoặc chèn thêm
 * đúng 1 nút "+" nhỏ ở nơi màn hình chưa có sẵn nút thêm dữ liệu), rồi
 * CLONE lại đúng 1 dòng/thẻ có sẵn trong trang để tạo dòng/thẻ mới — vì vậy
 * dòng/thẻ mới luôn có giao diện giống hệt 100% các dòng/thẻ gốc do Stitch vẽ.
 *
 * Dữ liệu chỉ lưu trong bộ nhớ trình duyệt của phiên xem hiện tại (không có
 * backend), mất khi tải lại trang — đúng tinh thần "bản demo tĩnh" đã thống nhất.
 */
(function () {
  'use strict';

  // ============== Business rules dùng chung (đồng bộ với các bản CRM khác) ==============
  var MARGIN_THRESHOLD = { SX: 17, TM: 12 };
  var REVENUE_SIGNIFICANT_PCT = 15;

  function parseVndNumber(str) {
    if (str == null) return 0;
    var n = String(str).replace(/[^\d-]/g, '');
    return n ? parseInt(n, 10) : 0;
  }
  function formatVnd(n) {
    return Math.round(n).toLocaleString('vi-VN');
  }
  function todayVn() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  // ============== Modal form dùng chung ==============
  var modalStyleInjected = false;
  function injectModalStyle() {
    if (modalStyleInjected) return;
    modalStyleInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '.demoadd-backdrop{position:fixed;inset:0;background:rgba(11,28,48,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;}',
      '.demoadd-box{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:480px;max-height:88vh;overflow:auto;font-family:Inter,system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.25);}',
      '.demoadd-box h3{margin:0 0 4px;font-size:16px;color:#0b1c30;font-weight:700;}',
      '.demoadd-box .demoadd-sub{font-size:12px;color:#6e7977;margin-bottom:14px;}',
      '.demoadd-field{margin-bottom:12px;}',
      '.demoadd-field label{display:block;font-size:12px;color:#3e4947;margin-bottom:4px;font-weight:600;}',
      '.demoadd-field input,.demoadd-field select,.demoadd-field textarea{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #bdc9c6;font-size:13.5px;font-family:inherit;}',
      '.demoadd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;}',
      '.demoadd-btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #bdc9c6;background:#fff;color:#0b1c30;}',
      '.demoadd-btn.primary{background:#005c55;border-color:#005c55;color:#fff;}',
      '.demoadd-badge-new{display:inline-block;background:#fe932c;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;margin-left:6px;vertical-align:middle;}'
    ].join('');
    document.head.appendChild(style);
  }

  function openForm(title, subtitle, fields, onSubmit) {
    injectModalStyle();
    var backdrop = document.createElement('div');
    backdrop.className = 'demoadd-backdrop';
    var box = document.createElement('div');
    box.className = 'demoadd-box';
    var html = '<h3>' + title + '</h3><div class="demoadd-sub">' + (subtitle || '') + '</div>';
    fields.forEach(function (f) {
      html += '<div class="demoadd-field"><label>' + f.label + '</label>';
      if (f.type === 'select') {
        html += '<select id="demoadd-' + f.name + '">' + f.options.map(function (o) {
          return '<option value="' + o + '"' + (o === f.default ? ' selected' : '') + '>' + o + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea id="demoadd-' + f.name + '" rows="2">' + (f.default || '') + '</textarea>';
      } else {
        html += '<input id="demoadd-' + f.name + '" type="' + (f.type || 'text') + '" value="' + (f.default != null ? f.default : '') + '" />';
      }
      html += '</div>';
    });
    html += '<div class="demoadd-actions"><button class="demoadd-btn" id="demoadd-cancel">Hủy</button><button class="demoadd-btn primary" id="demoadd-ok">Lưu</button></div>';
    box.innerHTML = html;
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    function close() { backdrop.remove(); }
    box.querySelector('#demoadd-cancel').addEventListener('click', close);
    box.querySelector('#demoadd-ok').addEventListener('click', function () {
      var data = {};
      fields.forEach(function (f) {
        var el = box.querySelector('#demoadd-' + f.name);
        data[f.name] = f.type === 'number' ? Number(el.value || 0) : el.value;
      });
      close();
      onSubmit(data);
    });
    var firstInput = box.querySelector('input,select,textarea');
    if (firstInput) firstInput.focus();
  }

  function toast(msg) {
    injectModalStyle();
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0b1c30;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.25);';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function findButtonByText(text) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.replace(/\s+/g, ' ').trim().indexOf(text) !== -1) return buttons[i];
    }
    return null;
  }

  // ============================================================
  // PAGE: khach-hang-tiem-nang.html — Thêm Lead mới
  // ============================================================
  function initLeadsPage() {
    var addBtn = findButtonByText('Thêm Lead mới');
    var tbody = document.querySelector('tbody');
    if (!addBtn || !tbody) return;
    addBtn.addEventListener('click', function () {
      openForm('Thêm Lead mới', 'Dữ liệu chỉ lưu tạm trong phiên xem này.', [
        { name: 'company', label: 'Tên công ty *', default: '' },
        { name: 'address', label: 'Địa chỉ / KCN', default: '' },
        { name: 'industry', label: 'Ngành hàng', default: 'Điện tử' },
        { name: 'contact', label: 'Người liên hệ', default: '' }
      ], function (data) {
        if (!data.company) { toast('Vui lòng nhập tên công ty'); return; }
        var rows = tbody.querySelectorAll('tr');
        var template = rows[rows.length - 1];
        var clone = template.cloneNode(true);
        var cells = clone.querySelectorAll(':scope > td');
        // cell 0: checkbox -> bỏ chọn
        var chk = cells[0] && cells[0].querySelector('input[type=checkbox]');
        if (chk) chk.checked = false;
        // cell 1: tên công ty + địa chỉ
        var nameSpan = cells[1] && cells[1].querySelector('span.font-semibold');
        if (nameSpan) nameSpan.textContent = data.company;
        var addrSpan = cells[1] && cells[1].querySelectorAll('span')[1];
        if (addrSpan) addrSpan.textContent = data.address || '(chưa cập nhật)';
        // cell 2: ngành hàng badge
        var badge = cells[2] && cells[2].querySelector('span');
        if (badge) badge.textContent = data.industry || 'Khác';
        // cell 3: người liên hệ
        if (cells[3]) cells[3].textContent = data.contact || '(chưa có)';
        // cell 4: trạng thái -> giữ "Đang theo dõi" mặc định (không đổi)
        // cell 5: ngày tạo
        if (cells[5]) cells[5].textContent = todayVn();
        tbody.insertBefore(clone, tbody.firstChild);
        toast('Đã thêm Lead "' + data.company + '" (dữ liệu tạm thời trong phiên)');
      });
    });
  }

  // ============================================================
  // PAGE: pipeline.html — Thêm Cơ hội Mới (cột "Mới tạo")
  // ============================================================
  function initPipelinePage() {
    var addBtn = findButtonByText('Thêm Cơ hội Mới');
    var column1 = document.getElementById('column-stage-1');
    if (!addBtn || !column1) return;
    var stageNames = ['Mới tạo', 'Đang tư vấn', 'Đã báo giá', 'Đàm phán', 'Chốt đơn'];

    addBtn.addEventListener('click', function () {
      openForm('Thêm Cơ hội Mới', 'Cơ hội mới sẽ vào cột "Mới tạo".', [
        { name: 'customer', label: 'Tên khách hàng / công ty *', default: '' },
        { name: 'zone', label: 'Khu công nghiệp', default: '' },
        { name: 'desc', label: 'Nhu cầu / sản phẩm quan tâm', default: '' },
        { name: 'value', label: 'Giá trị ước tính (VNĐ)', type: 'number', default: 0 }
      ], function (data) {
        if (!data.customer) { toast('Vui lòng nhập tên khách hàng'); return; }
        var templateCard = column1.querySelector('.cursor-grab');
        var clone = templateCard ? templateCard.cloneNode(true) : buildFallbackCard();
        clone.removeAttribute('id');
        // gỡ trạng thái "treo" nếu clone trúng thẻ cảnh báo, dùng nền mặc định
        clone.className = 'bg-surface-container-lowest p-space-md rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col gap-space-xs group';
        clone.removeAttribute('draggable');
        var zoneSpan = clone.querySelector('span.font-label-sm');
        if (zoneSpan) zoneSpan.textContent = data.zone || 'Chưa xác định KCN';
        var updatedSpan = clone.querySelectorAll('.flex.items-center.justify-between > span')[1];
        if (updatedSpan) updatedSpan.textContent = 'Vừa tạo';
        var titleDiv = clone.querySelector('.font-headline-sm.text-headline-sm');
        if (titleDiv) titleDiv.textContent = data.customer;
        var descP = clone.querySelector('p');
        if (descP) descP.textContent = data.desc || '(chưa mô tả)';
        var valueSpan = clone.querySelector('.font-data-mono.text-data-mono.font-bold, .font-data-mono.text-data-mono.text-\\[14px\\].font-bold');
        if (valueSpan) {
          valueSpan.innerHTML = formatVnd(data.value) + ' <span class="font-body-sm text-body-sm text-outline font-normal">VNĐ</span>';
        }
        // xoá icon cảnh báo "treo X ngày" nếu template lấy nhầm từ thẻ warning
        var warnFlag = clone.querySelector('.bg-secondary-fixed, .bg-secondary-container');
        if (warnFlag && warnFlag.parentElement) warnFlag.parentElement.remove();

        // thêm 1 select nhỏ để chuyển giai đoạn (không dùng kéo-thả có sẵn để tránh
        // xung đột với script kéo-thả demo gốc của Stitch vốn chỉ gán cho các thẻ có sẵn)
        var moveWrap = document.createElement('div');
        moveWrap.style.cssText = 'margin-top:6px;padding-top:6px;border-top:1px dashed #dce9ff;';
        moveWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span> ' +
          '<select style="margin-top:6px;width:100%;font-size:12px;padding:4px;border-radius:6px;border:1px solid #bdc9c6;">' +
          stageNames.map(function (s, i) { return '<option value="' + (i + 1) + '"' + (i === 0 ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select>';
        clone.appendChild(moveWrap);
        var select = moveWrap.querySelector('select');
        select.addEventListener('change', function () {
          var target = document.getElementById('column-stage-' + select.value);
          if (target) {
            target.insertBefore(clone, target.firstChild);
            toast('Đã chuyển sang giai đoạn "' + stageNames[Number(select.value) - 1] + '"');
          }
        });

        column1.insertBefore(clone, column1.firstChild);
        toast('Đã thêm Cơ hội "' + data.customer + '" vào cột Mới tạo');
      });
    });

    function buildFallbackCard() {
      var d = document.createElement('div');
      d.className = 'bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-xs';
      d.innerHTML = '<div class="flex items-center justify-between"><span class="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold"></span><span class="font-body-sm text-body-sm text-outline"></span></div>' +
        '<div class="font-headline-sm text-headline-sm text-on-surface"></div><p class="font-body-sm text-body-sm text-on-surface-variant"></p>';
      return d;
    }
  }

  // ============================================================
  // PAGE: bao-gia.html — Thêm dòng sản phẩm vào Báo giá (tính lại Margin)
  // ============================================================
  function initQuotePage() {
    var addBtn = findButtonByText('Thêm dòng từ Danh mục');
    var tbody = document.querySelector('table tbody');
    if (!addBtn || !tbody) return;

    addBtn.addEventListener('click', function () {
      openForm('Thêm dòng sản phẩm', 'Margin & tổng tiền phía dưới sẽ tự tính lại theo quy tắc SX ≥ 17% / TM ≥ 12%.', [
        { name: 'product', label: 'Tên sản phẩm *', default: '' },
        { name: 'origin', label: 'Xuất xứ / Hãng', default: '' },
        { name: 'unit', label: 'Đơn vị tính', default: 'Cái' },
        { name: 'segment', label: 'Phân khúc', type: 'select', options: ['TM', 'SX'], default: 'TM' },
        { name: 'qty', label: 'Số lượng', type: 'number', default: 1 },
        { name: 'cost', label: 'Giá vốn (VNĐ)', type: 'number', default: 0 },
        { name: 'sell', label: 'Giá bán đề xuất (VNĐ)', type: 'number', default: 0 }
      ], function (data) {
        if (!data.product) { toast('Vui lòng nhập tên sản phẩm'); return; }
        var rows = tbody.querySelectorAll('tr');
        var template = rows[rows.length - 1];
        var clone = template.cloneNode(true);
        var cells = clone.querySelectorAll(':scope > td');
        var stt = rows.length + 1;
        if (cells[0]) cells[0].textContent = String(stt).padStart(2, '0');
        var img = cells[1] && cells[1].querySelector('img');
        if (img) img.removeAttribute('src'); // không có ảnh minh hoạ cho dòng tự thêm
        var nameSpan = cells[2] && cells[2].querySelector('span.font-headline-sm, span.font-semibold');
        if (nameSpan) nameSpan.textContent = data.product;
        var tagWrap = cells[2] && cells[2].querySelector('.flex.items-center.gap-space-xs');
        if (tagWrap) tagWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span>';
        var originSpans = cells[3] && cells[3].querySelectorAll('span');
        if (originSpans && originSpans[0]) originSpans[0].textContent = data.origin || '-';
        if (originSpans && originSpans[1]) originSpans[1].textContent = data.segment === 'SX' ? 'Sản xuất trong nước' : 'Thương mại nhập khẩu';
        var unitSpan = cells[4] && cells[4].querySelector('span');
        if (unitSpan) unitSpan.textContent = data.unit || '-';
        if (cells[5]) cells[5].textContent = data.qty;
        if (cells[6]) cells[6].textContent = formatVnd(data.cost);
        if (cells[7]) cells[7].textContent = formatVnd(data.sell);
        var lineTotal = data.qty * data.sell;
        if (cells[8]) cells[8].textContent = formatVnd(lineTotal);
        var marginPct = data.sell > 0 ? ((data.sell - data.cost) / data.sell) * 100 : 0;
        var threshold = MARGIN_THRESHOLD[data.segment];
        var marginCell = cells[9];
        if (marginCell) {
          var ok = marginPct >= threshold;
          marginCell.innerHTML = '<div class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded font-data-mono text-label-sm font-bold ' +
            (ok ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-error-container text-tertiary-container') + '">' +
            marginPct.toFixed(1) + '%</div>';
        }
        tbody.appendChild(clone);
        recomputeQuoteFooter();
        toast('Đã thêm dòng "' + data.product + '" — margin ' + marginPct.toFixed(1) + '% (' + (marginPct >= threshold ? 'đạt' : 'dưới') + ' ngưỡng ' + data.segment + ' ' + threshold + '%)');
      });
    });

    // Cập nhật badge "X dòng sản phẩm" ở tiêu đề bảng
    function recomputeQuoteFooter() {
      var rows = tbody.querySelectorAll('tr');
      var countBadge = document.querySelector('span.font-data-mono.text-body-sm.font-semibold');
      if (countBadge) countBadge.textContent = rows.length + ' dòng sản phẩm';
    }
  }

  // ============================================================
  // PAGE: cham-soc-khieu-nai.html — Ghi nhận Khiếu nại mới (chèn thêm 1 nút)
  // ============================================================
  function initComplaintsPage() {
    var tbody = document.querySelector('table tbody');
    var headerStrip = document.querySelector('.px-space-md.py-space-sm.bg-surface-container-low.flex.items-center.justify-between');
    if (!tbody || !headerStrip) return;

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'h-8 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded font-label-sm text-label-sm shadow-sm flex items-center gap-1';
    addBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">add</span><span>Ghi nhận Khiếu nại<span class="demoadd-badge-new">MỚI</span></span>';
    headerStrip.appendChild(addBtn);

    addBtn.addEventListener('click', function () {
      openForm('Ghi nhận Khiếu nại mới', 'SLA: Khẩn cấp 4 giờ · Bình thường 48 giờ.', [
        { name: 'customer', label: 'Khách hàng *', default: '' },
        { name: 'site', label: 'KCN / Nhà máy', default: '' },
        { name: 'issue', label: 'Nội dung sự cố *', default: '' },
        { name: 'priority', label: 'Mức độ ưu tiên', type: 'select', options: ['Bình thường', 'Khẩn cấp'], default: 'Bình thường' }
      ], function (data) {
        if (!data.customer || !data.issue) { toast('Vui lòng nhập khách hàng và nội dung sự cố'); return; }
        var rows = tbody.querySelectorAll('tr');
        var template = rows[0];
        var clone = template.cloneNode(true);
        clone.removeAttribute('onclick');
        clone.className = 'hover:bg-surface-container-low/60 cursor-pointer transition-colors';
        var cells = clone.querySelectorAll(':scope > td');
        var codeSpan = cells[0] && cells[0].querySelector('span.font-data-mono');
        var newCode = 'KN-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 899);
        if (codeSpan) codeSpan.textContent = newCode;
        var custSpans = cells[0] && cells[0].querySelectorAll('span');
        if (custSpans && custSpans[1]) custSpans[1].textContent = data.customer;
        if (custSpans && custSpans[2]) custSpans[2].textContent = data.site || '(chưa cập nhật)';
        var issueSpan = cells[1] && cells[1].querySelector('span.font-headline-sm');
        if (issueSpan) issueSpan.textContent = data.issue;
        var tagWrap = cells[1] && cells[1].querySelector('.mt-1.flex');
        if (tagWrap) tagWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span>';
        var isUrgent = data.priority === 'Khẩn cấp';
        if (cells[2]) {
          cells[2].innerHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ' +
            (isUrgent ? 'bg-error-container text-tertiary-container' : 'bg-surface-container-high text-on-surface-variant') + '">' +
            '<span class="w-1.5 h-1.5 rounded-full ' + (isUrgent ? 'bg-tertiary' : 'bg-outline') + '"></span>' + data.priority + '</span>';
        }
        if (cells[3]) {
          var slaText = isUrgent ? 'Còn 4.0h' : 'Còn 48.0h';
          cells[3].innerHTML = '<div class="flex flex-col items-end"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-data-mono text-data-mono font-bold">' +
            '<span class="material-symbols-outlined text-[14px]">schedule</span>' + slaText + '</span>' +
            '<span class="text-outline font-label-sm text-label-sm mt-0.5">SLA: ' + (isUrgent ? '4.0h' : '48.0h') + '</span></div>';
        }
        if (cells[4]) {
          cells[4].innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">Mới tiếp nhận</span>' +
            '<span class="block font-label-sm text-label-sm text-outline mt-1 truncate max-w-[85px] mx-auto">Chưa gán</span>';
        }
        tbody.insertBefore(clone, tbody.firstChild);
        toast('Đã ghi nhận khiếu nại ' + newCode + ' — ' + data.customer);
      });
    });
  }

  // ============================================================
  // PAGE: bao-cao-doanh-so.html — Nhập DS tháng này (tính lại % biến động khi gõ)
  // ============================================================
  function initRevenuePage() {
    var directTable = document.getElementById('tab-direct-content');
    if (!directTable) return;
    var rows = directTable.querySelectorAll('tbody > tr');

    rows.forEach(function (row) {
      var cells = row.querySelectorAll(':scope > td');
      var prevCell = cells[3];
      var curInput = cells[4] && cells[4].querySelector('input');
      var changeCell = cells[5];
      var reasonInput = cells[7] && cells[7].querySelector('input');
      if (!curInput || !prevCell || !changeCell) return;

      curInput.addEventListener('input', function () {
        var prev = parseVndNumber(prevCell.textContent);
        var cur = parseVndNumber(curInput.value);
        var pct = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
        var isUp = pct >= 0;
        var isSignificant = Math.abs(pct) >= REVENUE_SIGNIFICANT_PCT;
        changeCell.innerHTML = '<span class="inline-flex items-center gap-0.5 px-2 py-1 rounded font-data-mono text-data-mono font-bold ' +
          (isUp ? 'bg-primary-fixed/40 text-primary' : 'bg-secondary-fixed/50 text-secondary') + '">' +
          '<span class="material-symbols-outlined text-[15px]">arrow_' + (isUp ? 'upward' : 'downward') + '</span>' +
          (isUp ? '+' : '') + pct.toFixed(2) + '%</span>';
        if (reasonInput) {
          if (isSignificant && !reasonInput.value) {
            reasonInput.placeholder = 'Bắt buộc giải trình vì biến động ≥ 15%';
            reasonInput.style.borderColor = '#904d00';
          } else if (!isSignificant) {
            reasonInput.style.borderColor = '';
          }
        }
      });
    });
  }

  // ============== Khởi chạy theo trang đang mở ==============
  document.addEventListener('DOMContentLoaded', function () {
    initLeadsPage();
    initPipelinePage();
    initQuotePage();
    initComplaintsPage();
    initRevenuePage();
  });
})();
