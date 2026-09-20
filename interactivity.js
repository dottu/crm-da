/*
 * interactivity.js — LỚP JS BỔ SUNG để cho phép "thêm dữ liệu ngay trong phiên"
 * trên các màn hình Stitch, theo yêu cầu của người dùng.
 *
 * Nó chỉ lắng nghe sự kiện trên các nút/ô nhập liệu CÓ SẴN (hoặc chèn thêm 1 nút
 * ở nơi màn hình chưa có sẵn nút thêm dữ liệu), rồi CLONE lại đúng 1 dòng/thẻ có
 * sẵn trong trang để tạo dòng/thẻ mới — vì vậy dòng/thẻ mới có giao diện giống
 * hệt các dòng/thẻ gốc do Stitch vẽ. Các số tổng hợp (bộ đếm, tổng tiền, %...)
 * được cập nhật theo dữ liệu vừa thêm.
 *
 * Dữ liệu chỉ lưu trong bộ nhớ trình duyệt của phiên xem hiện tại (không có
 * backend), mất khi tải lại trang — đúng tinh thần "bản demo tĩnh" đã thống nhất.
 */
(function () {
  'use strict';

  // ============== Business rules dùng chung (đồng bộ với các bản CRM khác) ==============
  var MARGIN_THRESHOLD = { SX: 17, TM: 12 };
  var REVENUE_SIGNIFICANT_PCT = 15;
  var VAT_RATE = 0.08;

  function parseVndNumber(str) {
    if (str == null) return 0;
    var n = String(str).replace(/[^\d-]/g, '');
    return n ? parseInt(n, 10) : 0;
  }
  function formatVnd(n) {
    return Math.round(n).toLocaleString('vi-VN');
  }
  function pad2(n) {
    return String(n).padStart(2, '0');
  }
  function todayVn() {
    var d = new Date();
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function nowHm() {
    var d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && e.target.tagName === 'INPUT') box.querySelector('#demoadd-ok').click();
    });
    var firstInput = box.querySelector('input,select,textarea');
    if (firstInput) firstInput.focus();
  }

  function toast(msg) {
    injectModalStyle();
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0b1c30;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  // ============== Helper DOM ==============
  function findButtonByText(text) {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.replace(/\s+/g, ' ').trim().indexOf(text) !== -1) return buttons[i];
    }
    return null;
  }

  function findElByText(selector, text, root) {
    var els = (root || document).querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) {
      if (els[i].textContent.replace(/\s+/g, ' ').trim().indexOf(text) !== -1) return els[i];
    }
    return null;
  }

  // Cộng delta vào số đứng đầu nội dung phần tử, giữ nguyên chữ phía sau và độ rộng số 0 đầu ("09" -> "10").
  function bumpLeadingNumber(el, delta) {
    if (!el) return null;
    var node = el.firstChild;
    while (node && !(node.nodeType === 3 && /\d/.test(node.nodeValue))) node = node.nextSibling;
    if (!node) return null;
    var m = node.nodeValue.match(/^(\s*)(\d+)([\s\S]*)$/);
    if (!m) return null;
    var next = Math.max(0, parseInt(m[2], 10) + delta);
    var s = String(next);
    while (s.length < m[2].length) s = '0' + s;
    node.nodeValue = m[1] + s + m[3];
    return next;
  }

  // Mở hộp thoại chọn file của trình duyệt và gọi callback(file) khi người dùng chọn xong.
  function triggerFilePicker(accept, cb) {
    var input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) cb(input.files[0]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  function downloadCsv(filename, rows) {
    var csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ============================================================
  // PAGE: khach-hang-tiem-nang.html — Thêm Lead mới + số liệu tổng hợp
  // ============================================================
  var LEAD_INDUSTRIES = ['Bán dẫn & Vi mạch', 'Dược phẩm GMP', 'Quang học & Thấu kính', 'Khác'];
  var LEAD_METRIC_LABEL = { 'Bán dẫn & Vi mạch': 'Bán dẫn', 'Dược phẩm GMP': 'Dược phẩm', 'Quang học & Thấu kính': 'Quang học' };

  function initLeadsPage() {
    var addBtn = findButtonByText('Thêm Lead mới');
    var tbody = document.querySelector('tbody');
    if (!addBtn || !tbody) return;

    function metricValueEl(label) {
      var lab = findElByText('div.uppercase', label);
      return lab && lab.nextElementSibling;
    }

    function refreshLeadMetrics(industry) {
      var total = bumpLeadingNumber(metricValueEl('Tổng số Lead KCN'), 1);
      if (LEAD_METRIC_LABEL[industry]) bumpLeadingNumber(metricValueEl(LEAD_METRIC_LABEL[industry]), 1);
      Object.keys(LEAD_METRIC_LABEL).forEach(function (k) {
        var el = metricValueEl(LEAD_METRIC_LABEL[k]);
        if (!el || !el.firstChild) return;
        var n = parseInt(el.firstChild.nodeValue, 10);
        var pctSpan = el.querySelector('span');
        if (pctSpan && total && !isNaN(n)) pctSpan.textContent = '(' + (n / total * 100).toFixed(1) + '%)';
      });
      var pager = findElByText('span', 'trong số');
      var strongs = pager ? pager.querySelectorAll('strong') : [];
      if (strongs[0]) strongs[0].textContent = '1 - ' + tbody.querySelectorAll(':scope > tr').length;
      if (strongs[1] && total) strongs[1].textContent = String(total);
    }

    addBtn.addEventListener('click', function () {
      openForm('Thêm Lead mới', 'Dữ liệu chỉ lưu tạm trong phiên xem này.', [
        { name: 'company', label: 'Tên công ty *', default: '' },
        { name: 'address', label: 'Địa chỉ / KCN', default: '' },
        { name: 'industry', label: 'Ngành hàng', type: 'select', options: LEAD_INDUSTRIES, default: LEAD_INDUSTRIES[0] },
        { name: 'nvkd', label: 'NVKD phụ trách', default: 'Nguyễn Văn Hùng' }
      ], function (data) {
        if (!data.company) { toast('Vui lòng nhập tên công ty'); return; }
        var rows = tbody.querySelectorAll(':scope > tr');
        var template = rows[rows.length - 1];
        var clone = template.cloneNode(true);
        var cells = clone.querySelectorAll(':scope > td');
        var chk = cells[0] && cells[0].querySelector('input[type=checkbox]');
        if (chk) chk.checked = false;
        var nameSpan = cells[1] && cells[1].querySelector('span.font-semibold');
        var addrSpan = cells[1] && cells[1].querySelectorAll('span')[1];
        if (addrSpan) addrSpan.textContent = data.address || '(chưa cập nhật)';
        if (nameSpan) {
          nameSpan.textContent = data.company;
          nameSpan.insertAdjacentHTML('beforeend', '<span class="demoadd-badge-new">MỚI</span>');
        }
        var badge = cells[2] && cells[2].querySelector('span');
        if (badge) badge.textContent = data.industry || 'Khác';
        if (cells[3]) cells[3].textContent = data.nvkd || '(chưa gán)';
        if (cells[5]) cells[5].textContent = todayVn();
        tbody.insertBefore(clone, tbody.firstChild);
        refreshLeadMetrics(data.industry);
        toast('Đã thêm Lead "' + data.company + '" (dữ liệu tạm thời trong phiên)');
      });
    });
  }

  // ============================================================
  // PAGE: khach-hang-tiem-nang.html — "Chuyển thành Cơ hội" + "Lưu nháp" hồ sơ
  // ============================================================
  function initLeadConvertPage() {
    var btn = findButtonByText('Chuyển thành Cơ hội');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var dossierHeading = document.querySelector('h2.font-headline-sm.text-headline-sm.text-on-surface');
      var company = dossierHeading ? dossierHeading.textContent.trim() : 'Khách hàng mới';
      var descEl = dossierHeading && dossierHeading.nextElementSibling;
      var desc = descEl ? descEl.textContent.trim() : '';
      var valueEl = document.querySelector('.font-headline-sm.text-headline-sm.text-primary.font-bold');
      var value = 0;
      if (valueEl) {
        var clone = valueEl.cloneNode(true);
        var nested = clone.querySelector('span');
        if (nested) nested.remove();
        value = parseVndNumber(clone.textContent);
      }
      var pending = [{ customer: company, zone: 'Chuyển từ Lead', desc: desc, value: value }];
      try {
        var existingRaw = sessionStorage.getItem('demoadd_pending_opportunities');
        var existing = existingRaw ? JSON.parse(existingRaw) : [];
        if (!Array.isArray(existing)) existing = [];
        sessionStorage.setItem('demoadd_pending_opportunities', JSON.stringify(existing.concat(pending)));
      } catch (e) { /* ignore */ }
      toast('Đang chuyển "' + company + '" sang Pipeline...');
      setTimeout(function () { location.href = 'pipeline.html'; }, 500);
    });

    var draftBtn = findButtonByText('Lưu nháp');
    if (draftBtn) {
      draftBtn.addEventListener('click', function () {
        draftBtn.textContent = 'Đã lưu nháp ' + nowHm();
        toast('Đã lưu nháp hồ sơ Lead lúc ' + nowHm());
      });
    }
  }

  // ============================================================
  // PAGE: pipeline.html — Thêm Cơ hội Mới (cột "Mới tạo") + số liệu cột/tổng
  // ============================================================
  function initPipelinePage() {
    // Bản gốc Stitch thiếu class "hidden" trên modal xác nhận chốt đơn nên nó
    // hiển thị đè kín toàn trang ngay khi tải — chặn mọi thao tác trên Pipeline.
    var winDealModal = document.getElementById('modal-win-deal');
    if (winDealModal && !winDealModal.classList.contains('hidden')) {
      winDealModal.classList.add('hidden');
    }

    var addBtn = findButtonByText('Thêm Cơ hội Mới');
    var column1 = document.getElementById('column-stage-1');
    if (!column1) return;
    var stageNames = ['Mới tạo', 'Đang tư vấn', 'Đã báo giá', 'Đàm phán', 'Chốt đơn'];

    // Cập nhật số thẻ + tổng giá trị (Tỷ) ở tiêu đề cột
    function adjustColumn(col, dCount, dValue) {
      var head = col && col.previousElementSibling;
      if (!head) return;
      bumpLeadingNumber(head.querySelector('span.rounded-full.font-data-mono'), dCount);
      var sumEl = head.querySelector(':scope > span.font-data-mono');
      var ty = sumEl ? parseFloat(sumEl.textContent) : NaN;
      if (sumEl && !isNaN(ty)) sumEl.textContent = Math.max(0, ty + dValue / 1e9).toFixed(2) + ' Tỷ';
    }

    // Cập nhật nhãn tổng "30 Cơ hội • 13.50 Tỷ VNĐ" ở đầu trang
    function adjustTotalPill(dCount, dValue) {
      var pill = findElByText('span.rounded-full', 'Cơ hội •');
      var m = pill && pill.textContent.match(/(\d+)\s*Cơ hội\s*•\s*([\d.]+)\s*Tỷ/);
      if (!m) return;
      pill.textContent = (parseInt(m[1], 10) + dCount) + ' Cơ hội • ' + (parseFloat(m[2]) + dValue / 1e9).toFixed(2) + ' Tỷ VNĐ';
    }

    function buildFallbackCard() {
      var d = document.createElement('div');
      d.className = 'bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-xs';
      d.innerHTML = '<div class="flex items-center justify-between"><span class="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold"></span><span class="font-body-sm text-body-sm text-outline"></span></div>' +
        '<div class="font-headline-sm text-headline-sm text-on-surface"></div><p class="font-body-sm text-body-sm text-on-surface-variant"></p>';
      return d;
    }

    function addOpportunityCard(data) {
      var value = Number(data.value) || 0;
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
        valueSpan.innerHTML = formatVnd(value) + ' <span class="font-body-sm text-body-sm text-outline font-normal">VNĐ</span>';
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
      var currentCol = column1;
      var select = moveWrap.querySelector('select');
      select.addEventListener('change', function () {
        var target = document.getElementById('column-stage-' + select.value);
        if (target && target !== currentCol) {
          adjustColumn(currentCol, -1, -value);
          adjustColumn(target, 1, value);
          currentCol = target;
          target.insertBefore(clone, target.firstChild);
          toast('Đã chuyển sang giai đoạn "' + stageNames[Number(select.value) - 1] + '"');
        }
      });

      column1.insertBefore(clone, column1.firstChild);
      adjustColumn(column1, 1, value);
      adjustTotalPill(1, value);
      toast('Đã thêm Cơ hội "' + data.customer + '" vào cột Mới tạo');
    }

    if (addBtn) {
      // Bản gốc Stitch gắn nhầm onclick mở modal "Xác nhận Chốt đơn" (dành cho card khác)
      // lên đúng nút này — gỡ bỏ để không mở nhầm modal khi bấm "Thêm Cơ hội Mới".
      addBtn.removeAttribute('onclick');
      addBtn.addEventListener('click', function () {
        openForm('Thêm Cơ hội Mới', 'Cơ hội mới sẽ vào cột "Mới tạo".', [
          { name: 'customer', label: 'Tên khách hàng / công ty *', default: '' },
          { name: 'zone', label: 'Khu công nghiệp', default: '' },
          { name: 'desc', label: 'Nhu cầu / sản phẩm quan tâm', default: '' },
          { name: 'value', label: 'Giá trị ước tính (VNĐ)', type: 'number', default: 0 }
        ], function (data) {
          if (!data.customer) { toast('Vui lòng nhập tên khách hàng'); return; }
          addOpportunityCard(data);
        });
      });
    }

    // Nhận Cơ hội được "Chuyển từ Lead" (khach-hang-tiem-nang.html) qua sessionStorage,
    // chèn vào Pipeline ngay khi trang tải xong rồi xoá hàng đợi.
    try {
      var pendingRaw = sessionStorage.getItem('demoadd_pending_opportunities');
      if (pendingRaw) {
        var pendingList = JSON.parse(pendingRaw);
        sessionStorage.removeItem('demoadd_pending_opportunities');
        if (Array.isArray(pendingList)) {
          pendingList.forEach(function (item) { addOpportunityCard(item); });
        }
      }
    } catch (e) { /* sessionStorage không khả dụng hoặc dữ liệu hỏng — bỏ qua */ }
  }

  // ============================================================
  // PAGE: bao-gia.html — Thêm dòng, chiết khấu, đính kèm, lưu nháp/gửi duyệt + tổng tiền
  // ============================================================
  function initQuotePage() {
    var addBtn = findButtonByText('Thêm dòng từ Danh mục');
    var importBtn = findButtonByText('Nhập từ Excel báo giá');
    var attachBtn = findButtonByText('Đính thêm tài liệu');
    var discountBtn = findButtonByText('Cấu hình hệ số chiết khấu');
    var draftBtn = findButtonByText('Lưu nháp');
    var submitBtn = findButtonByText('Gửi duyệt Giám đốc KD');
    var tbody = document.querySelector('table tbody');
    if (!tbody) return;

    // ---- Thanh tổng cộng cố định phía dưới: đọc trạng thái hiện có, vẽ lại sau mỗi lần thêm dòng/chiết khấu ----
    function footerEl(label) { return findElByText('footer span', label); }
    var refs = {
      qty: footerEl('Tổng sản phẩm'),
      cost: footerEl('Tổng giá vốn'),
      sub: footerEl('Báo giá (chưa VAT)'),
      vat: footerEl('VAT ('),
      total: footerEl('Tổng thanh toán'),
      margin: footerEl('Tỉ lệ Margin toàn đơn'),
      warn: footerEl('Phát hiện')
    };
    var valueOf = function (labelEl) { return labelEl && labelEl.nextElementSibling; };
    var footerOk = refs.qty && refs.cost && refs.sub && refs.vat && refs.total;
    var q = null;
    if (footerOk) {
      var marginStrong = refs.margin && refs.margin.querySelector('strong');
      var grossInit = parseVndNumber(valueOf(refs.sub).textContent);
      var marginInit = marginStrong ? parseFloat(marginStrong.textContent) : 0;
      var warnStrong = refs.warn && refs.warn.querySelector('strong');
      q = {
        qty: parseVndNumber(valueOf(refs.qty).firstChild.nodeValue),
        cost: parseVndNumber(valueOf(refs.cost).textContent),
        gross: grossInit,
        profit: grossInit * marginInit / 100,
        below: warnStrong ? parseInt(warnStrong.textContent, 10) || 0 : 0,
        discountPct: 0,
        discountName: ''
      };
    }
    var discountBlock = null;

    function renderQuoteTotals() {
      if (!q) return;
      var disc = Math.round(q.gross * q.discountPct / 100);
      var net = q.gross - disc;
      var vat = Math.round(net * VAT_RATE);
      valueOf(refs.qty).firstChild.nodeValue = formatVnd(q.qty) + ' ';
      valueOf(refs.cost).textContent = formatVnd(q.cost) + ' đ';
      valueOf(refs.sub).textContent = formatVnd(net) + ' đ';
      valueOf(refs.vat).textContent = formatVnd(vat) + ' đ';
      valueOf(refs.total).textContent = formatVnd(net + vat) + ' đ';
      var strong = refs.margin && refs.margin.querySelector('strong');
      if (strong && net > 0) strong.textContent = ((q.profit - disc) / net * 100).toFixed(1) + '%';

      if (disc > 0) {
        if (!discountBlock) {
          discountBlock = refs.vat.parentElement.cloneNode(true);
          refs.vat.parentElement.parentElement.insertBefore(discountBlock, refs.vat.parentElement);
        }
        var spans = discountBlock.querySelectorAll('span');
        spans[0].textContent = 'Chiết khấu (' + q.discountPct + '%)';
        spans[spans.length - 1].textContent = '-' + formatVnd(disc) + ' đ';
        spans[spans.length - 1].className = 'font-data-mono text-data-mono font-semibold text-secondary';
        discountBlock.title = q.discountName;
      } else if (discountBlock) {
        discountBlock.remove();
        discountBlock = null;
      }
    }

    function noteBelowThreshold(rowNo, segment, pct, threshold) {
      if (!q || !refs.warn) return;
      q.below += 1;
      refs.warn.innerHTML = refs.warn.innerHTML
        .replace(/<strong>\d+ dòng<\/strong>/, '<strong>' + q.below + ' dòng</strong>')
        .replace(/\)\s*$/, ' | Dòng ' + rowNo + ': ' + segment + ' ' + pct.toFixed(1) + '% &lt; ' + threshold + '%)');
    }

    function addQuoteLineRow(data) {
      var rows = tbody.querySelectorAll(':scope > tr');
      var template = rows[rows.length - 1];
      var clone = template.cloneNode(true);
      var cells = clone.querySelectorAll(':scope > td');
      var stt = rows.length + 1;
      var segment = data.segment === 'SX' ? 'SX' : 'TM';
      if (cells[0]) cells[0].textContent = pad2(stt);
      var img = cells[1] && cells[1].querySelector('img');
      if (img) { img.removeAttribute('src'); img.style.visibility = 'hidden'; } // không có ảnh minh hoạ cho dòng tự thêm
      var nameSpan = cells[2] && cells[2].querySelector('span.font-headline-sm, span.font-semibold');
      if (nameSpan) nameSpan.textContent = data.product;
      var tagWrap = cells[2] && cells[2].querySelector('.flex.items-center.gap-space-xs');
      if (tagWrap) tagWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span>';
      var originSpans = cells[3] && cells[3].querySelectorAll('span');
      if (originSpans && originSpans[0]) originSpans[0].textContent = data.origin || '-';
      if (originSpans && originSpans[1]) originSpans[1].textContent = segment === 'SX' ? 'Sản xuất trong nước' : 'Thương mại nhập khẩu';
      var unitSpan = cells[4] && cells[4].querySelector('span');
      if (unitSpan) unitSpan.textContent = data.unit || '-';
      if (cells[5]) cells[5].textContent = data.qty;
      if (cells[6]) cells[6].textContent = formatVnd(data.cost);
      if (cells[7]) cells[7].textContent = formatVnd(data.sell);
      if (cells[8]) cells[8].textContent = formatVnd(data.qty * data.sell);
      var marginPct = data.sell > 0 ? ((data.sell - data.cost) / data.sell) * 100 : 0;
      var threshold = MARGIN_THRESHOLD[segment];
      var ok = marginPct >= threshold;
      if (cells[9]) {
        cells[9].innerHTML = ok
          ? '<div class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-data-mono text-label-sm font-bold shadow-sm">' +
            '<span class="material-symbols-outlined text-[14px]">check_circle</span><span>' + marginPct.toFixed(1) + '%</span>' +
            '<span class="font-body-sm text-[10px] font-normal opacity-80">(' + segment + ' Đạt)</span></div>'
          : '<div class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-data-mono text-label-sm font-bold shadow-sm">' +
            '<span class="material-symbols-outlined text-[14px]">warning</span><span>' + marginPct.toFixed(1) + '%</span>' +
            '<span class="font-body-sm text-[10px] font-semibold text-secondary">&lt; ' + segment + ' ' + threshold + '% CẦN DUYỆT</span></div>';
      }
      tbody.appendChild(clone);
      recomputeQuoteFooter();

      if (q) {
        q.qty += data.qty;
        q.cost += data.qty * data.cost;
        q.gross += data.qty * data.sell;
        q.profit += data.qty * (data.sell - data.cost);
        if (!ok) noteBelowThreshold(stt, segment, marginPct, threshold);
        renderQuoteTotals();
      }
      return { marginPct: marginPct, threshold: threshold, segment: segment, ok: ok };
    }

    if (addBtn) {
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
          var r = addQuoteLineRow(data);
          toast('Đã thêm dòng "' + data.product + '" — margin ' + r.marginPct.toFixed(1) + '% (' + (r.ok ? 'đạt' : 'dưới') + ' ngưỡng ' + r.segment + ' ' + r.threshold + '%)');
        });
      });
    }

    // "Nhập từ Excel báo giá" — bản demo tĩnh không đọc được nội dung file thật,
    // nên tạo 1 dòng mẫu kèm tên file đã chọn để minh hoạ luồng nhập liệu hàng loạt.
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        triggerFilePicker('.xlsx,.xls,.csv', function (file) {
          addQuoteLineRow({
            product: 'Nhập từ Excel: ' + file.name,
            origin: 'Theo file Excel tải lên',
            unit: 'Cái',
            segment: 'TM',
            qty: 1,
            cost: 500000,
            sell: 650000
          });
          toast('Đã nhập 1 dòng từ file "' + file.name + '" — vui lòng kiểm tra lại giá vốn/giá bán');
        });
      });
    }

    // "Đính thêm tài liệu" — thêm 1 thẻ file vào danh sách "Tài liệu kỹ thuật đính kèm (TDS)"
    if (attachBtn) {
      var docListWrap = attachBtn.previousElementSibling;
      var docList = docListWrap && docListWrap.querySelector('div');
      attachBtn.addEventListener('click', function () {
        triggerFilePicker(null, function (file) {
          if (!docList) { toast('Đã đính kèm "' + file.name + '"'); return; }
          var isPdf = /\.pdf$/i.test(file.name);
          var chip = document.createElement('span');
          chip.className = 'flex items-center gap-2 p-1.5 rounded bg-surface font-body-sm text-on-surface';
          chip.innerHTML = '<span class="material-symbols-outlined text-primary text-[16px]">' + (isPdf ? 'picture_as_pdf' : 'description') + '</span>' +
            '<span class="truncate">' + escapeHtml(file.name) + '</span><span class="demoadd-badge-new">MỚI</span>';
          docList.appendChild(chip);
          toast('Đã đính kèm tài liệu "' + file.name + '"');
        });
      });
    }

    // "Cấu hình hệ số chiết khấu bổ sung" — thêm chiết khấu toàn đơn, tổng tiền/VAT/margin tự tính lại
    if (discountBtn && q) {
      discountBtn.addEventListener('click', function () {
        openForm('Cấu hình chiết khấu bổ sung', 'Áp dụng cho toàn đơn, tính trên tổng tiền trước VAT. Nhập 0 để bỏ chiết khấu.', [
          { name: 'name', label: 'Tên chiết khấu', default: 'Chiết khấu thanh toán sớm' },
          { name: 'pct', label: 'Tỷ lệ chiết khấu (%)', type: 'number', default: 2 }
        ], function (data) {
          var pct = Math.min(50, Math.max(0, Number(data.pct) || 0));
          q.discountPct = pct;
          q.discountName = data.name || 'Chiết khấu';
          renderQuoteTotals();
          toast(pct > 0 ? 'Đã áp dụng "' + q.discountName + '" ' + pct + '% — tổng thanh toán đã cập nhật' : 'Đã bỏ chiết khấu bổ sung');
        });
      });
    }

    if (draftBtn) {
      draftBtn.addEventListener('click', function () {
        toast('Đã lưu nháp báo giá lúc ' + nowHm() + ' (' + tbody.querySelectorAll(':scope > tr').length + ' dòng sản phẩm)');
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var statusBadge = findElByText('span', 'DRAFT_REV_01');
        if (statusBadge) statusBadge.textContent = 'CHỜ DUYỆT';
        var label = submitBtn.querySelector('span:last-child');
        if (label) label.textContent = 'Đã gửi duyệt — chờ Giám đốc KD';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '.7';
        submitBtn.style.cursor = 'default';
        toast('Đã gửi báo giá lên Giám đốc KD duyệt lúc ' + nowHm());
      });
    }

    // Nhận báo giá nhanh được tạo từ nút "Tạo nhanh Báo giá" trên header (ở mọi trang,
    // kể cả khi bấm ngay trên chính trang Báo giá — initHeaderQuickQuote bắn sự kiện này)
    consumePendingQuickQuote();
    window.addEventListener('demoadd:quick-quote-inline', consumePendingQuickQuote);

    function consumePendingQuickQuote() {
      try {
        var pendingQuoteRaw = sessionStorage.getItem('demoadd_quick_quote');
        if (pendingQuoteRaw) {
          var pendingQuote = JSON.parse(pendingQuoteRaw);
          sessionStorage.removeItem('demoadd_quick_quote');
          applyQuickQuote(pendingQuote);
        }
      } catch (e) { /* sessionStorage không khả dụng hoặc dữ liệu hỏng — bỏ qua */ }
    }

    function applyQuickQuote(data) {
      if (!data || !data.product) return;
      var customerInput = document.querySelector('main input[type="text"]');
      if (customerInput && data.company) customerInput.value = data.company;
      var sell = Number(data.sell) || 0;
      var r = addQuoteLineRow({
        product: data.product,
        origin: '',
        unit: 'Cái',
        segment: 'TM',
        qty: Number(data.qty) || 1,
        cost: Math.round(sell * 0.85),
        sell: sell
      });
      toast('Đã tạo báo giá nhanh cho "' + (data.company || 'khách hàng mới') + '" — margin ' + r.marginPct.toFixed(1) + '%');
    }

    // Cập nhật badge "X dòng sản phẩm" ở tiêu đề bảng
    function recomputeQuoteFooter() {
      var rows = tbody.querySelectorAll(':scope > tr');
      var countBadge = document.querySelector('span.font-data-mono.text-body-sm.font-semibold');
      if (countBadge) countBadge.textContent = rows.length + ' dòng sản phẩm';
    }
  }

  // ============================================================
  // PAGE: cham-soc-khieu-nai.html — Ghi nhận Khiếu nại, đính kèm, Tạm lưu (Audit Trail) + bộ đếm
  // ============================================================
  function initComplaintsPage() {
    // Chỉ chạy trên đúng trang Khiếu nại (các trang khác cũng có bảng + dải header cùng class)
    if (!document.getElementById('complaintDetailDrawer')) return;
    var tbody = document.querySelector('table tbody');
    var headerStrip = document.querySelector('.px-space-md.py-space-sm.bg-surface-container-low.flex.items-center.justify-between');
    if (!tbody || !headerStrip) return;

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'h-8 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded font-label-sm text-label-sm shadow-sm flex items-center gap-1';
    addBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">add</span><span>Ghi nhận Khiếu nại<span class="demoadd-badge-new">MỚI</span></span>';
    headerStrip.appendChild(addBtn);

    function bumpComplaintCounters() {
      ['Tất cả', 'Mới tiếp nhận'].forEach(function (label) {
        var tab = findElByText('button', label);
        bumpLeadingNumber(tab && tab.querySelector('span:last-child'), 1);
      });
      var openLabel = findElByText('span', 'Đang mở');
      bumpLeadingNumber(openLabel && openLabel.parentElement.previousElementSibling, 1);
      var shown = findElByText('span', 'phiếu khiếu nại đang tiến hành');
      if (shown) shown.textContent = shown.textContent.replace(/Hiển thị (\d+) phiếu/, function (_, n) { return 'Hiển thị ' + (parseInt(n, 10) + 1) + ' phiếu'; });
      var pager = findElByText('span', 'phiếu khiếu nại (Trang');
      if (pager) pager.textContent = pager.textContent.replace(/Hiển thị (\d+) \/ (\d+) phiếu/, function (_, a, b) { return 'Hiển thị ' + (parseInt(a, 10) + 1) + ' / ' + (parseInt(b, 10) + 1) + ' phiếu'; });
    }

    addBtn.addEventListener('click', function () {
      openForm('Ghi nhận Khiếu nại mới', 'SLA: Khẩn cấp 4 giờ · Bình thường 48 giờ.', [
        { name: 'customer', label: 'Khách hàng *', default: '' },
        { name: 'site', label: 'KCN / Nhà máy', default: '' },
        { name: 'issue', label: 'Nội dung sự cố *', default: '' },
        { name: 'priority', label: 'Mức độ ưu tiên', type: 'select', options: ['Bình thường', 'Khẩn cấp'], default: 'Bình thường' }
      ], function (data) {
        if (!data.customer || !data.issue) { toast('Vui lòng nhập khách hàng và nội dung sự cố'); return; }
        var template = tbody.querySelector(':scope > tr:not([data-demoadd])');
        var clone = template.cloneNode(true);
        clone.dataset.demoadd = '1';
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
        bumpComplaintCounters();
        toast('Đã ghi nhận khiếu nại ' + newCode + ' — ' + data.customer);
      });
    });

    // "+ Thêm file" trong khung đính kèm tài liệu ở chân panel chi tiết khiếu nại
    var attachFileBtn = findButtonByText('Thêm file');
    if (attachFileBtn) {
      attachFileBtn.addEventListener('click', function () {
        triggerFilePicker(null, function (file) {
          var labelSpan = findElByText('span', 'Tài liệu đính kèm');
          if (!labelSpan) { toast('Đã đính kèm "' + file.name + '"'); return; }
          var match = labelSpan.textContent.match(/\((\d+)\)/);
          var newCount = match ? (parseInt(match[1], 10) + 1) : (labelSpan.querySelectorAll('em').length + 1);
          labelSpan.innerHTML = labelSpan.innerHTML.replace(/\(\d+\)/, '(' + newCount + ')');
          labelSpan.insertAdjacentHTML('beforeend', ', <em>' + escapeHtml(file.name) + '</em>');
          toast('Đã đính kèm tài liệu "' + file.name + '" vào khiếu nại');
        });
      });
    }

    // "Tạm lưu cập nhật" — ghi phương án xử lý vào "Lịch sử xử lý & Audit Trail"
    var saveBtn = findButtonByText('Tạm lưu cập nhật');
    var notes = document.getElementById('resolutionNotes');
    var timeline = document.querySelector('#complaintDetailDrawer .space-y-3.pl-4');
    if (saveBtn && notes && timeline && timeline.lastElementChild) {
      saveBtn.addEventListener('click', function () {
        var text = notes.value.trim();
        if (!text) { toast('Vui lòng nhập phương án xử lý / biên bản trước khi tạm lưu'); notes.focus(); return; }
        var item = timeline.lastElementChild.cloneNode(true);
        var timeSpan = item.querySelector('span.font-data-mono');
        if (timeSpan) timeSpan.textContent = nowHm();
        var titleSpan = item.querySelector('span.font-semibold');
        if (titleSpan) titleSpan.innerHTML = 'Tạm lưu phương án xử lý<span class="demoadd-badge-new">MỚI</span>';
        var subSpan = item.querySelector(':scope > .flex-col > span.text-outline, :scope .flex-col > span.font-body-sm');
        if (subSpan) subSpan.textContent = text + ' — NVKD Nguyễn Văn Hùng';
        timeline.appendChild(item);
        var count = findElByText('span', 'mốc ghi nhận');
        bumpLeadingNumber(count, 1);
        toast('Đã tạm lưu cập nhật vào Audit Trail lúc ' + nowHm());
      });
    }
  }

  // ============================================================
  // HEADER dùng chung mọi trang — "+ Tạo nhanh Báo giá"
  // ============================================================
  function initHeaderQuickQuote() {
    var btn = findButtonByText('Tạo nhanh Báo giá');
    if (!btn) return;
    var onQuotePage = !!document.querySelector('table tbody') && !!document.querySelector('main input[type="text"]') && /bao-gia\.html$/.test(location.pathname);
    btn.addEventListener('click', function () {
      openForm('Tạo nhanh Báo giá', 'Tạo báo giá mới với 1 dòng sản phẩm đầu tiên, có thể bổ sung thêm sau ở trang Báo giá.', [
        { name: 'company', label: 'Khách hàng / Công ty *', default: '' },
        { name: 'product', label: 'Sản phẩm *', default: '' },
        { name: 'qty', label: 'Số lượng', type: 'number', default: 1 },
        { name: 'sell', label: 'Giá bán đề xuất (VNĐ)', type: 'number', default: 0 }
      ], function (data) {
        if (!data.company || !data.product) { toast('Vui lòng nhập khách hàng và sản phẩm'); return; }
        try { sessionStorage.setItem('demoadd_quick_quote', JSON.stringify(data)); } catch (e) { /* ignore */ }
        if (onQuotePage) {
          // initQuotePage's DOMContentLoaded handler đã chạy trước, nên áp dụng lại ngay tại đây
          window.dispatchEvent(new Event('demoadd:quick-quote-inline'));
        } else {
          toast('Đang chuyển sang trang Báo giá cho "' + data.company + '"...');
          setTimeout(function () { location.href = 'bao-gia.html'; }, 500);
        }
      });
    });
  }

  // ============================================================
  // PAGE: dashboard.html / index.html — "Tạo việc mới" + nút hành động trên từng việc
  // ============================================================
  function initDashboardTasks() {
    var addBtn = findButtonByText('Tạo việc mới');
    var heading = findElByText('h2', 'Cần xử lý hôm nay');
    var card = heading && heading.closest('.bg-surface-container-lowest.rounded.shadow-sm.p-space-lg.flex.flex-col');
    var taskList = card && card.children[1];
    if (!addBtn || !taskList || !taskList.firstElementChild) return;
    var urgentBadge = card.querySelector('span.bg-tertiary-fixed');
    var subtitle = findElByText('span', 'tác vụ ưu tiên cao', card);

    function bumpUrgent(delta) {
      bumpLeadingNumber(urgentBadge, delta);
      bumpLeadingNumber(subtitle, delta);
    }

    function fmtDate(iso) {
      var p = String(iso).split('-');
      return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
    }

    // Các nút hành động có sẵn trên 4 việc mẫu
    Array.prototype.forEach.call(taskList.querySelectorAll('button'), function (btn) {
      var label = btn.textContent.replace(/\s+/g, ' ').trim();
      var taskCard = btn.closest('.relative.pl-space-lg');
      var h3 = taskCard && taskCard.querySelector('h3');
      var title = h3 ? h3.textContent.trim() : '';
      if (label.indexOf('Cập nhật liên hệ') !== -1) {
        btn.addEventListener('click', function () {
          openForm('Cập nhật liên hệ', escapeHtml(title), [
            { name: 'note', label: 'Nội dung liên hệ *', type: 'textarea', default: '' },
            { name: 'next', label: 'Lịch hẹn tiếp theo', type: 'date', default: '' }
          ], function (data) {
            if (!data.note.trim()) { toast('Vui lòng nhập nội dung liên hệ'); return; }
            var log = document.createElement('div');
            log.className = 'flex items-start gap-1 text-label-sm font-label-sm text-primary mt-1';
            log.innerHTML = '<span class="material-symbols-outlined text-[14px]">check_circle</span>' +
              '<span>Đã cập nhật liên hệ lúc ' + nowHm() + ': ' + escapeHtml(data.note.trim()) + (data.next ? ' · Hẹn ' + fmtDate(data.next) : '') + '</span>' +
              '<span class="demoadd-badge-new">MỚI</span>';
            taskCard.appendChild(log);
            toast('Đã ghi nhận cập nhật liên hệ');
          });
        });
      } else if (label.indexOf('Xem ticket') !== -1) {
        btn.addEventListener('click', function () { location.href = 'cham-soc-khieu-nai.html'; });
      } else if (label.indexOf('Điều chỉnh báo giá') !== -1) {
        btn.addEventListener('click', function () { location.href = 'bao-gia.html'; });
      } else if (label.indexOf('Chỉ đường KCN') !== -1) {
        btn.addEventListener('click', function () {
          window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(title), '_blank', 'noopener');
        });
      }
    });

    addBtn.addEventListener('click', function () {
      openForm('Tạo việc mới', 'Việc mới sẽ thêm vào đầu danh sách "Cần xử lý hôm nay".', [
        { name: 'title', label: 'Tiêu đề công việc / Khách hàng *', default: '' },
        { name: 'desc', label: 'Mô tả ngắn', default: '' },
        { name: 'pic', label: 'Người phụ trách (PIC)', default: 'Nguyễn Văn Hùng' },
        { name: 'priority', label: 'Mức ưu tiên', type: 'select', options: ['Bình thường', 'Khẩn cấp'], default: 'Bình thường' }
      ], function (data) {
        if (!data.title) { toast('Vui lòng nhập tiêu đề công việc'); return; }
        var isUrgent = data.priority === 'Khẩn cấp';
        var template = taskList.firstElementChild;
        var clone = template.cloneNode(true);
        clone.className = 'p-space-md rounded transition-all flex flex-col gap-space-xs relative pl-space-lg ' +
          (isUrgent ? 'bg-error-container/30 hover:bg-error-container/50' : 'bg-surface-container-low hover:bg-surface-container');
        var bar = clone.querySelector('.absolute.left-0.top-0.bottom-0');
        if (bar) bar.className = 'absolute left-0 top-0 bottom-0 w-1.5 rounded-l ' + (isUrgent ? 'bg-tertiary' : 'bg-secondary-container');
        var badgeWrap = clone.querySelector('.flex.items-center.gap-space-xs.flex-wrap');
        if (badgeWrap) {
          badgeWrap.innerHTML = '<span class="font-label-sm text-label-sm font-semibold uppercase px-1.5 py-0.5 rounded ' +
            (isUrgent ? 'bg-tertiary text-on-tertiary' : 'bg-secondary-fixed text-on-secondary-fixed-variant') + '">Việc mới<span class="demoadd-badge-new">MỚI</span></span>' +
            '<span class="font-data-mono text-label-sm ' + (isUrgent ? 'text-tertiary' : 'text-secondary') + ' font-bold">Vừa tạo</span>';
        }
        var h3 = clone.querySelector('h3');
        if (h3) h3.textContent = data.title;
        var p = clone.querySelector('p');
        if (p) p.textContent = data.desc || '(chưa có mô tả)';
        var actionBtn = clone.querySelector('button');
        if (actionBtn) {
          // cloneNode không mang theo listener nên nút này chỉ có hành vi "hoàn tất" bên dưới
          actionBtn.className = 'shrink-0 h-8 px-space-md bg-surface-container-lowest text-on-surface hover:bg-primary hover:text-on-primary rounded font-label-sm text-label-sm shadow-sm transition-all flex items-center gap-1';
          actionBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">task_alt</span><span>Đánh dấu hoàn tất</span>';
          actionBtn.addEventListener('click', function () {
            clone.style.opacity = '.55';
            if (h3) h3.style.textDecoration = 'line-through';
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span><span>Đã hoàn tất</span>';
            if (isUrgent) bumpUrgent(-1);
            toast('Đã hoàn tất việc "' + data.title + '"');
          });
        }
        var metaRow = clone.querySelector('.flex.items-center.gap-space-md.text-label-sm.font-label-sm.text-outline');
        var metaSpans = metaRow ? metaRow.querySelectorAll(':scope > span') : [];
        if (metaSpans[0]) metaSpans[0].innerHTML = '<span class="material-symbols-outlined text-[14px]">person</span>PIC: ' + escapeHtml(data.pic || 'Chưa gán');
        if (metaSpans[1]) metaSpans[1].innerHTML = '<span class="material-symbols-outlined text-[14px]">priority_high</span>Ưu tiên: ' + escapeHtml(data.priority);
        taskList.insertBefore(clone, taskList.firstChild);
        if (isUrgent) bumpUrgent(1);
        toast('Đã tạo việc mới: "' + data.title + '"');
      });
    });
  }

  // ============================================================
  // PAGE: bao-cao-doanh-so.html — nhập DS, thêm khách hàng, import file, lưu/hủy, xuất template
  // ============================================================
  function initRevenuePage() {
    var directTable = document.getElementById('tab-direct-content');
    if (!directTable) return;
    var tbody = directTable.querySelector('tbody');
    if (!tbody) return;

    function ribbonValue(label) {
      var l = findElByText('span.uppercase', label);
      return l && l.nextElementSibling;
    }
    var totalEl = document.getElementById('current-total-ds');
    var prevTotalEl = ribbonValue('Tổng DS tháng trước');
    var diffEl = ribbonValue('Chênh lệch chu kỳ');
    var bigMoveEl = ribbonValue('Biến động lớn');
    var tabCountEl = document.querySelector('#tab-direct-btn > span:last-child');
    var baseTotal = totalEl && totalEl.firstChild ? parseVndNumber(totalEl.firstChild.nodeValue) : 0;
    var prevTotal = prevTotalEl && prevTotalEl.firstChild ? parseVndNumber(prevTotalEl.firstChild.nodeValue) : 0;
    var quotaBase = baseTotal / 1.063; // trang gốc ghi "Đạt 106.3% chỉ tiêu" ứng với tổng ban đầu
    var seedBigMoves = bigMoveEl && bigMoveEl.firstElementChild ? parseInt(bigMoveEl.firstElementChild.textContent, 10) || 0 : 0;

    var rowState = new Map();
    var addedRows = [];

    function pctChange(prev, cur) {
      return prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
    }

    function recomputeRevenue() {
      var sum = baseTotal;
      var bigMoves = seedBigMoves;
      rowState.forEach(function (st, row) {
        if (!row.isConnected) return;
        var cur = parseVndNumber(st.input.value);
        sum += cur - st.initial;
        var now = Math.abs(pctChange(parseVndNumber(st.prevCell.textContent), cur)) >= REVENUE_SIGNIFICANT_PCT;
        bigMoves += (now ? 1 : 0) - (st.initSig ? 1 : 0);
      });
      if (totalEl && totalEl.firstChild) totalEl.firstChild.nodeValue = formatVnd(sum) + ' ';
      var attain = totalEl && totalEl.nextElementSibling;
      if (attain && attain.lastChild && attain.lastChild.nodeType === 3 && quotaBase > 0) {
        attain.lastChild.nodeValue = ' Đạt ' + (sum / quotaBase * 100).toFixed(1) + '% chỉ tiêu tháng\n';
      }
      if (diffEl && diffEl.children[0] && prevTotal > 0) {
        var diff = sum - prevTotal;
        var valueSpan = diffEl.children[0];
        if (valueSpan.firstChild) valueSpan.firstChild.nodeValue = (diff >= 0 ? '+' : '-') + formatVnd(Math.abs(diff)) + ' ';
        if (diffEl.children[1]) diffEl.children[1].textContent = (diff >= 0 ? '+' : '') + (diff / prevTotal * 100).toFixed(2) + '%';
      }
      if (bigMoveEl && bigMoveEl.firstElementChild) bigMoveEl.firstElementChild.textContent = Math.max(0, bigMoves) + ' Khách hàng';
    }

    function wireRow(row, initialOverride) {
      var cells = row.querySelectorAll(':scope > td');
      var prevCell = cells[3];
      var curInput = cells[4] && cells[4].querySelector('input');
      var changeCell = cells[5];
      var reasonInput = cells[7] && cells[7].querySelector('input');
      if (!curInput || !prevCell || !changeCell) return;

      var initial = initialOverride != null ? initialOverride : parseVndNumber(curInput.value);
      rowState.set(row, {
        input: curInput,
        prevCell: prevCell,
        initial: initial,
        initialText: initialOverride != null ? '' : curInput.value,
        initSig: initialOverride != null ? false : Math.abs(pctChange(parseVndNumber(prevCell.textContent), initial)) >= REVENUE_SIGNIFICANT_PCT
      });

      curInput.addEventListener('input', function () {
        var prev = parseVndNumber(prevCell.textContent);
        var cur = parseVndNumber(curInput.value);
        var pct = pctChange(prev, cur);
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
        recomputeRevenue();
      });
    }

    tbody.querySelectorAll(':scope > tr').forEach(function (row) { wireRow(row); });

    // ---- Thêm khách hàng (chèn 1 nút vì màn hình gốc chưa có) ----
    var bar = document.createElement('div');
    bar.className = 'flex items-center justify-between px-space-lg py-space-sm border-b border-outline-variant/30';
    bar.innerHTML = '<span class="font-body-sm text-body-sm text-outline">Nhập DS thực tế theo từng khách hàng phụ trách</span>';
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'h-8 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded font-label-sm text-label-sm shadow-sm flex items-center gap-1';
    addBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">add</span><span>Thêm khách hàng<span class="demoadd-badge-new">MỚI</span></span>';
    bar.appendChild(addBtn);
    directTable.insertBefore(bar, directTable.firstChild);

    addBtn.addEventListener('click', function () {
      openForm('Thêm khách hàng vào báo cáo', 'Khách hàng mới sẽ được thêm vào cuối bảng nhập doanh số tháng.', [
        { name: 'name', label: 'Tên khách hàng *', default: '' },
        { name: 'site', label: 'Khu công nghiệp', default: '' },
        { name: 'mst', label: 'Mã số thuế', default: '' },
        { name: 'industry', label: 'Ngành hàng', type: 'select', options: ['Bán dẫn', 'Dược phẩm', 'Quang học', 'Khác'], default: 'Bán dẫn' },
        { name: 'prev', label: 'DS tháng trước (₫)', type: 'number', default: 0 },
        { name: 'cur', label: 'DS tháng này (₫)', type: 'number', default: 0 }
      ], function (data) {
        if (!data.name.trim()) { toast('Vui lòng nhập tên khách hàng'); return; }
        var template = null;
        tbody.querySelectorAll(':scope > tr').forEach(function (r) {
          if (rowState.has(r) && !r.dataset.demoadd) template = r;
        });
        if (!template) return;
        var clone = template.cloneNode(true);
        clone.dataset.demoadd = '1';
        var cells = clone.querySelectorAll(':scope > td');
        if (cells[0]) cells[0].textContent = pad2(tbody.querySelectorAll(':scope > tr').length + 1);
        var nameSpan = cells[1] && cells[1].querySelector('span.font-semibold');
        if (nameSpan) nameSpan.innerHTML = escapeHtml(data.name) + '<span class="demoadd-badge-new">MỚI</span>';
        var addrSpan = cells[1] && cells[1].querySelector('span.flex.items-center');
        if (addrSpan) addrSpan.innerHTML = '<span class="material-symbols-outlined text-[14px]">domain</span> ' + escapeHtml(data.site || '(chưa cập nhật)') + ' • MST: ' + escapeHtml(data.mst || '—');
        var indSpan = cells[2] && cells[2].querySelector('span');
        if (indSpan) indSpan.textContent = data.industry;
        if (cells[3]) cells[3].textContent = formatVnd(data.prev);
        var curInput = cells[4] && cells[4].querySelector('input');
        if (curInput) curInput.value = formatVnd(data.cur);
        var reasonInput = cells[7] && cells[7].querySelector('input');
        if (reasonInput) { reasonInput.value = ''; reasonInput.style.borderColor = ''; reasonInput.placeholder = 'Giải trình nếu biến động ≥ 15%'; }
        tbody.appendChild(clone);
        addedRows.push(clone);
        wireRow(clone, 0);
        curInput.dispatchEvent(new Event('input'));
        bumpLeadingNumber(tabCountEl, 1);
        toast('Đã thêm khách hàng "' + data.name + '" vào báo cáo tháng');
      });
    });

    // ---- Import Excel: chọn tệp / kéo thả ----
    var dropZone = document.querySelector('#tab-import-content .border-dashed');
    var logList = document.querySelector('#tab-import-content .space-y-2');
    var logTime = document.querySelector('#tab-import-content span.font-data-mono.text-body-sm.text-outline');
    function receiveFile(file) {
      if (logTime) {
        var d = new Date();
        logTime.textContent = todayVn() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
      }
      if (logList) {
        var entry = document.createElement('div');
        entry.className = 'p-3 rounded-lg bg-surface-container-lowest border-l-4 border-primary flex items-start gap-space-sm shadow-sm';
        entry.innerHTML = '<span class="material-symbols-outlined text-primary text-[18px] mt-0.5">upload_file</span>' +
          '<div class="flex flex-col"><span class="font-label-md text-label-md font-bold text-primary">Đã tải lên: ' + escapeHtml(file.name) + '<span class="demoadd-badge-new">MỚI</span></span>' +
          '<span class="font-body-md text-body-md text-on-surface">Dung lượng ' + Math.max(1, Math.round(file.size / 1024)) + ' KB · nhận lúc ' + nowHm() + ' — đang đối soát với dữ liệu SAP.</span></div>';
        logList.insertBefore(entry, logList.firstChild);
      }
      toast('Đã tải lên tệp "' + file.name + '"');
    }
    if (dropZone) {
      dropZone.addEventListener('click', function () {
        triggerFilePicker('.xlsx,.xls,.csv', receiveFile);
      });
      dropZone.addEventListener('dragover', function (e) { e.preventDefault(); });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) receiveFile(e.dataTransfer.files[0]);
      });
    }

    // ---- Xuất template Excel (CSV) ----
    var exportBtn = findButtonByText('Xuất template Excel');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var out = [['STT', 'Khách hàng', 'MST', 'DS tháng trước (₫)', 'DS tháng này (₫)']];
        tbody.querySelectorAll(':scope > tr').forEach(function (r, i) {
          var c = r.querySelectorAll(':scope > td');
          var nameEl = c[1] && c[1].querySelector('span.font-semibold');
          var mst = c[1] ? (c[1].textContent.match(/MST:\s*(\d+)/) || [])[1] || '' : '';
          out.push([i + 1, nameEl ? nameEl.textContent.replace('MỚI', '').trim() : '', mst, parseVndNumber(c[3] && c[3].textContent), '']);
        });
        downloadCsv('template-doanh-so-thang-10-2024.csv', out);
        toast('Đã xuất template (' + (out.length - 1) + ' khách hàng)');
      });
    }

    // ---- Thanh lưu/hủy phía dưới ----
    var cancelBtn = findButtonByText('Hủy bỏ');
    var draftBtn = findButtonByText('Lưu nháp');
    var saveBtn = findButtonByText('Lưu báo cáo tháng');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        addedRows.forEach(function (r) { rowState.delete(r); r.remove(); });
        bumpLeadingNumber(tabCountEl, -addedRows.length);
        addedRows = [];
        rowState.forEach(function (st) {
          st.input.value = st.initialText;
          st.input.dispatchEvent(new Event('input'));
        });
        recomputeRevenue();
        toast('Đã hủy các thay đổi chưa lưu');
      });
    }
    if (draftBtn) {
      draftBtn.addEventListener('click', function () {
        toast('Đã lưu nháp báo cáo Tháng 10/2024 lúc ' + nowHm());
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var missing = null;
        var missingCount = 0;
        rowState.forEach(function (st, row) {
          if (!row.isConnected) return;
          var cells = row.querySelectorAll(':scope > td');
          var reason = cells[7] && cells[7].querySelector('input');
          var pct = pctChange(parseVndNumber(st.prevCell.textContent), parseVndNumber(st.input.value));
          if (Math.abs(pct) >= REVENUE_SIGNIFICANT_PCT && reason && !reason.value.trim()) {
            missingCount++;
            if (!missing) missing = reason;
          }
        });
        if (missing) {
          toast('Còn ' + missingCount + ' khách hàng biến động ≥ 15% chưa giải trình');
          missing.focus();
          return;
        }
        var label = saveBtn.querySelector('span:last-child');
        if (label) label.textContent = 'Đã lưu ' + nowHm();
        toast('Đã lưu báo cáo tháng — tổng DS ' + (totalEl ? totalEl.textContent.replace(/\s+/g, ' ').trim() : '') + ' gửi Kế toán & GĐKD');
      });
    }
  }

  // ============== Khởi chạy theo trang đang mở ==============
  document.addEventListener('DOMContentLoaded', function () {
    initLeadsPage();
    initLeadConvertPage();
    initPipelinePage();
    initQuotePage();
    initComplaintsPage();
    initRevenuePage();
    initDashboardTasks();
    initHeaderQuickQuote();
  });
})();
