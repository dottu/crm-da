/*
 * app.js — LỚP JS BỔ SUNG để cho phép "thêm dữ liệu ngay trong phiên"
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
      '.demoadd-badge-new{display:inline-block;background:#fe932c;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;margin-left:6px;vertical-align:middle;}',
      '.demoadd-btn.danger{background:#ba1a1a;border-color:#ba1a1a;color:#fff;}',
      '.demoadd-menu{position:fixed;z-index:9998;background:#fff;border:1px solid #bdc9c6;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);padding:4px;min-width:160px;font-family:Inter,system-ui,sans-serif;}',
      '.demoadd-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;background:none;font-size:13px;color:#0b1c30;cursor:pointer;text-align:left;border-radius:6px;}',
      '.demoadd-menu button:hover{background:#eff4ff;}',
      '.demoadd-menu button.danger{color:#ba1a1a;}',
      '.demoadd-menu .material-symbols-outlined{font-size:18px;}',
      '.demoadd-act{display:inline-flex;align-items:center;gap:2px;font-size:11px;font-weight:600;color:#6e7977;background:none;border:0;padding:2px 5px;cursor:pointer;border-radius:4px;font-family:inherit;}',
      '.demoadd-act:hover{background:#eff4ff;color:#005c55;}',
      '.demoadd-act.danger:hover{background:#ffdad6;color:#ba1a1a;}',
      '.demoadd-act .material-symbols-outlined{font-size:14px;}'
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
          return '<option value="' + escapeHtml(o) + '"' + (o === f.default ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea id="demoadd-' + f.name + '" rows="2">' + escapeHtml(f.default || '') + '</textarea>';
      } else {
        html += '<input id="demoadd-' + f.name + '" type="' + (f.type || 'text') + '" value="' + escapeHtml(f.default != null ? f.default : '') + '" />';
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

  // Hộp xác nhận xóa
  function confirmBox(title, message, onOk) {
    injectModalStyle();
    var backdrop = document.createElement('div');
    backdrop.className = 'demoadd-backdrop';
    var box = document.createElement('div');
    box.className = 'demoadd-box';
    box.style.maxWidth = '400px';
    box.innerHTML = '<h3>' + title + '</h3><div class="demoadd-sub">' + message + '</div>' +
      '<div class="demoadd-actions"><button class="demoadd-btn" id="demoadd-cancel">Hủy</button><button class="demoadd-btn danger" id="demoadd-yes">Xóa</button></div>';
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    function close() { backdrop.remove(); }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    box.querySelector('#demoadd-cancel').addEventListener('click', close);
    box.querySelector('#demoadd-yes').addEventListener('click', function () { close(); onOk(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    box.querySelector('#demoadd-yes').focus();
  }

  // Menu nhỏ bật ra cạnh nút (VD: nút ⋮ của từng dòng)
  var openMenuEl = null;
  var menuCloser = null;
  function closeMenu() {
    if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
    if (menuCloser) {
      document.removeEventListener('click', menuCloser);
      window.removeEventListener('scroll', menuCloser, true);
      menuCloser = null;
    }
  }
  function openMenu(anchor, items) {
    injectModalStyle();
    closeMenu();
    var m = document.createElement('div');
    m.className = 'demoadd-menu';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      if (it.danger) b.className = 'danger';
      b.innerHTML = '<span class="material-symbols-outlined">' + it.icon + '</span>' + it.label;
      b.addEventListener('click', function () { closeMenu(); it.onClick(); });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    openMenuEl = m;
    var r = anchor.getBoundingClientRect();
    m.style.top = Math.max(8, Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 4)) + 'px';
    m.style.left = Math.max(8, r.right - m.offsetWidth) + 'px';
    menuCloser = function () { closeMenu(); };
    var mine = menuCloser;
    // Click ra ngoài / cuộn trang thì đóng menu (đăng ký trễ để không bắt nhầm chính cú click mở menu hay cuộn tự động)
    setTimeout(function () { if (menuCloser === mine) document.addEventListener('click', mine); }, 0);
    setTimeout(function () { if (menuCloser === mine) window.addEventListener('scroll', mine, true); }, 250);
  }

  var ACTION_BUTTONS = '<button type="button" class="demoadd-act" data-demoact="edit" title="Sửa"><span class="material-symbols-outlined">edit</span>Sửa</button>' +
    '<button type="button" class="demoadd-act danger" data-demoact="delete" title="Xóa"><span class="material-symbols-outlined">delete</span>Xóa</button>';

  // Đặt lại nội dung chữ đầu tiên của phần tử mà không đụng tới các thẻ con (icon, nhãn...)
  function setOwnText(el, text) {
    var node = el.firstChild;
    while (node && node.nodeType !== 3) node = node.nextSibling;
    if (node) node.nodeValue = text;
    else el.insertBefore(document.createTextNode(text), el.firstChild);
  }

  // Chữ trực tiếp của phần tử, bỏ qua các thẻ con
  function ownText(el) {
    var s = '';
    Array.prototype.forEach.call(el.childNodes, function (n) { if (n.nodeType === 3) s += n.nodeValue; });
    return s.replace(/\s+/g, ' ').trim();
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
  // Các màn hình cùng nằm trong 1 tài liệu, nên mọi tìm kiếm phải giới hạn trong khối <main> của màn hình đó.
  var api = {};
  function pageRoot(id) { return document.querySelector('main[data-page="' + id + '"]'); }

  function findButtonByText(text, root) {
    var buttons = (root || document).querySelectorAll('button');
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

  function initLeadsPage(root) {
    var addBtn = findButtonByText('Thêm Lead mới', root);
    var tbody = root.querySelector('tbody');
    if (!addBtn || !tbody || !tbody.lastElementChild) return;
    var rowTemplate = tbody.lastElementChild.cloneNode(true);

    function metricValueEl(label) {
      var lab = findElByText('div.uppercase', label, root);
      return lab && lab.nextElementSibling;
    }

    // dTotal: thay đổi tổng số Lead; oldIndustry/newIndustry: ngành bị bớt/được thêm 1 Lead
    function refreshLeadMetrics(dTotal, oldIndustry, newIndustry) {
      var totalEl = metricValueEl('Tổng số Lead KCN');
      if (dTotal) bumpLeadingNumber(totalEl, dTotal);
      if (oldIndustry && LEAD_METRIC_LABEL[oldIndustry]) bumpLeadingNumber(metricValueEl(LEAD_METRIC_LABEL[oldIndustry]), -1);
      if (newIndustry && LEAD_METRIC_LABEL[newIndustry]) bumpLeadingNumber(metricValueEl(LEAD_METRIC_LABEL[newIndustry]), 1);
      var total = totalEl && totalEl.firstChild ? parseInt(totalEl.firstChild.nodeValue, 10) : 0;
      Object.keys(LEAD_METRIC_LABEL).forEach(function (k) {
        var el = metricValueEl(LEAD_METRIC_LABEL[k]);
        if (!el || !el.firstChild) return;
        var n = parseInt(el.firstChild.nodeValue, 10);
        var pctSpan = el.querySelector('span');
        if (pctSpan && !isNaN(n)) pctSpan.textContent = '(' + (total ? (n / total * 100).toFixed(1) : '0.0') + '%)';
      });
      var pager = findElByText('span', 'trong số', root);
      var strongs = pager ? pager.querySelectorAll('strong') : [];
      var rowCount = tbody.querySelectorAll(':scope > tr').length;
      if (strongs[0]) strongs[0].textContent = rowCount ? '1 - ' + rowCount : '0';
      if (strongs[1]) strongs[1].textContent = String(total);
    }

    function readLeadRow(row) {
      var c = row.querySelectorAll(':scope > td');
      var nameSpan = c[1].querySelector('span.font-semibold');
      var addr = c[1].querySelector('span.text-outline');
      var ind = c[2].querySelector('span');
      return {
        company: nameSpan ? ownText(nameSpan) : '',
        address: addr ? addr.textContent.trim() : '',
        industry: ind ? ind.textContent.trim() : '',
        nvkd: c[3].textContent.trim()
      };
    }

    function writeLeadRow(row, d) {
      var c = row.querySelectorAll(':scope > td');
      var nameSpan = c[1].querySelector('span.font-semibold');
      var addr = c[1].querySelector('span.text-outline');
      var ind = c[2].querySelector('span');
      if (nameSpan) setOwnText(nameSpan, d.company);
      if (addr) addr.textContent = d.address || '(chưa cập nhật)';
      if (ind) ind.textContent = d.industry || 'Khác';
      c[3].textContent = d.nvkd || '(chưa gán)';
    }

    function leadFields(d) {
      var options = LEAD_INDUSTRIES.slice();
      if (d.industry && options.indexOf(d.industry) === -1) options.unshift(d.industry);
      return [
        { name: 'company', label: 'Tên công ty *', default: d.company },
        { name: 'address', label: 'Địa chỉ / KCN', default: d.address },
        { name: 'industry', label: 'Ngành hàng', type: 'select', options: options, default: d.industry || options[0] },
        { name: 'nvkd', label: 'NVKD phụ trách', default: d.nvkd }
      ];
    }

    addBtn.addEventListener('click', function () {
      openForm('Thêm Lead mới', 'Dữ liệu chỉ lưu tạm trong phiên xem này.', leadFields({
        company: '', address: '', industry: LEAD_INDUSTRIES[0], nvkd: 'Nguyễn Văn Hùng'
      }), function (data) {
        if (!data.company.trim()) { toast('Vui lòng nhập tên công ty'); return; }
        var clone = rowTemplate.cloneNode(true);
        clone.dataset.demoadd = '1';
        clone.className = rowTemplate.className.replace(/bg-primary-fixed\/\d+/g, '');
        var cells = clone.querySelectorAll(':scope > td');
        var chk = cells[0] && cells[0].querySelector('input[type=checkbox]');
        if (chk) chk.checked = false;
        writeLeadRow(clone, data);
        var nameSpan = cells[1].querySelector('span.font-semibold');
        if (nameSpan) nameSpan.insertAdjacentHTML('beforeend', '<span class="demoadd-badge-new">MỚI</span>');
        if (cells[5]) cells[5].textContent = todayVn();
        tbody.insertBefore(clone, tbody.firstChild);
        refreshLeadMetrics(1, null, data.industry);
        toast('Đã thêm Lead "' + data.company + '" (dữ liệu tạm thời trong phiên)');
      });
    });

    function editLead(row) {
      var d = readLeadRow(row);
      openForm('Sửa thông tin Lead', escapeHtml(d.company), leadFields(d), function (data) {
        if (!data.company.trim()) { toast('Vui lòng nhập tên công ty'); return; }
        writeLeadRow(row, data);
        if (data.industry !== d.industry) refreshLeadMetrics(0, d.industry, data.industry);
        toast('Đã cập nhật Lead "' + data.company + '"');
      });
    }

    function deleteLead(row) {
      var d = readLeadRow(row);
      confirmBox('Xóa Lead', 'Bạn có chắc muốn xóa Lead <b>' + escapeHtml(d.company) + '</b>? Thao tác này chỉ áp dụng trong phiên xem hiện tại.', function () {
        row.remove();
        refreshLeadMetrics(-1, d.industry, null);
        toast('Đã xóa Lead "' + d.company + '"');
      });
    }

    // Nút ⋮ ở cột "Thao tác" của từng dòng (kể cả dòng mới thêm) -> menu Sửa / Xóa
    tbody.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !tbody.contains(b)) return;
      var icon = b.querySelector('.material-symbols-outlined');
      if (!icon || icon.textContent.trim() !== 'more_vert') return;
      e.stopPropagation();
      var row = b.closest('tr');
      openMenu(b, [
        { icon: 'edit', label: 'Sửa thông tin', onClick: function () { editLead(row); } },
        { icon: 'delete', label: 'Xóa Lead', danger: true, onClick: function () { deleteLead(row); } }
      ]);
    });
  }

  // ============================================================
  // PAGE: khach-hang-tiem-nang.html — "Chuyển thành Cơ hội" + "Lưu nháp" hồ sơ
  // ============================================================
  function initLeadConvertPage(root) {
    var btn = findButtonByText('Chuyển thành Cơ hội', root);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var dossierHeading = root.querySelector('h2.font-headline-sm.text-headline-sm.text-on-surface');
      var company = dossierHeading ? dossierHeading.textContent.trim() : 'Khách hàng mới';
      var descEl = dossierHeading && dossierHeading.nextElementSibling;
      var desc = descEl ? descEl.textContent.trim() : '';
      var valueEl = root.querySelector('.font-headline-sm.text-headline-sm.text-primary.font-bold');
      var value = 0;
      if (valueEl) {
        var clone = valueEl.cloneNode(true);
        var nested = clone.querySelector('span');
        if (nested) nested.remove();
        value = parseVndNumber(clone.textContent);
      }
      api.addOpportunity({ customer: company, zone: 'Chuyển từ Lead', desc: desc, value: value });
      goTo('pipeline');
    });

    var draftBtn = findButtonByText('Lưu nháp', root);
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
  function initPipelinePage(root) {
    // Bản gốc Stitch thiếu class "hidden" trên modal xác nhận chốt đơn nên nó
    // hiển thị đè kín toàn trang ngay khi tải — chặn mọi thao tác trên Pipeline.
    var winDealModal = document.getElementById('modal-win-deal');
    if (winDealModal && !winDealModal.classList.contains('hidden')) {
      winDealModal.classList.add('hidden');
    }

    var addBtn = findButtonByText('Thêm Cơ hội Mới', root);
    var column1 = document.getElementById('column-stage-1');
    if (!column1) return;
    // Bản gốc chia 5 cột đều nhau nhưng mỗi cột có min-w 280px nên ở màn hình < ~1500px các cột tràn và
    // đè lên nhau (che luôn nút bấm). Đặt độ rộng tối thiểu ngay trong lưới để cột không chồng nhau, bảng cuộn ngang.
    var board = column1.closest('.grid');
    if (board) board.className = board.className.replace('xl:grid-cols-5', 'xl:grid-cols-[repeat(5,minmax(280px,1fr))]');
    var stageNames = ['Mới tạo', 'Đang tư vấn', 'Đã báo giá', 'Đàm phán', 'Chốt đơn'];

    // Cập nhật số thẻ + tổng giá trị (Tỷ) ở tiêu đề cột
    function adjustColumn(col, dCount, dValue) {
      var head = col && col.previousElementSibling;
      if (!head) return;
      bumpLeadingNumber(head.querySelector('span.rounded-full.font-data-mono'), dCount);
      var sumEl = head.querySelector(':scope > span.font-data-mono');
      var ty = sumEl ? parseFloat(sumEl.textContent) : NaN;
      if (sumEl && !isNaN(ty)) {
        // giữ giá trị VNĐ chính xác trong dataset để không tích lũy sai số làm tròn của số "x.xx Tỷ" hiển thị
        var vnd = Math.max(0, (sumEl.dataset.vnd ? Number(sumEl.dataset.vnd) : ty * 1e9) + dValue);
        sumEl.dataset.vnd = String(vnd);
        sumEl.textContent = (vnd / 1e9).toFixed(2) + ' Tỷ';
      }
    }

    // Cập nhật nhãn tổng "30 Cơ hội • 13.50 Tỷ VNĐ" ở đầu trang
    function adjustTotalPill(dCount, dValue) {
      var pill = findElByText('span.rounded-full', 'Cơ hội •', root);
      var m = pill && pill.textContent.match(/(\d+)\s*Cơ hội\s*•\s*([\d.]+)\s*Tỷ/);
      if (!m) return;
      var vnd = Math.max(0, (pill.dataset.vnd ? Number(pill.dataset.vnd) : parseFloat(m[2]) * 1e9) + dValue);
      pill.dataset.vnd = String(vnd);
      pill.textContent = (parseInt(m[1], 10) + dCount) + ' Cơ hội • ' + (vnd / 1e9).toFixed(2) + ' Tỷ VNĐ';
    }

    function buildFallbackCard() {
      var d = document.createElement('div');
      d.className = 'bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-xs';
      d.innerHTML = '<div class="flex items-center justify-between"><span class="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold"></span><span class="font-body-sm text-body-sm text-outline"></span></div>' +
        '<div class="font-headline-sm text-headline-sm text-on-surface"></div><p class="font-body-sm text-body-sm text-on-surface-variant"></p>';
      return d;
    }

    // Nút Sửa / Xóa ở cuối mỗi thẻ cơ hội
    function attachCardActions(card) {
      if (card.querySelector('[data-demoact]')) return;
      card.insertAdjacentHTML('beforeend', '<div class="flex justify-end gap-1" style="margin-top:2px;">' + ACTION_BUTTONS + '</div>');
    }
    Array.prototype.forEach.call(root.querySelectorAll('[id^="column-stage-"] > div'), attachCardActions);

    function readCard(card) {
      var zoneEl = card.querySelector('.flex.items-center.justify-between > span.font-label-sm');
      var titleEl = card.querySelector('.font-headline-sm.text-headline-sm');
      var descEl = card.querySelector('p');
      var valueEl = card.querySelector('.font-data-mono.text-data-mono.font-bold');
      return {
        zoneEl: zoneEl, titleEl: titleEl, descEl: descEl, valueEl: valueEl,
        zone: zoneEl ? zoneEl.textContent.trim() : '',
        customer: titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '',
        desc: descEl ? descEl.textContent.replace(/\s+/g, ' ').trim() : '',
        value: valueEl ? parseVndNumber(ownText(valueEl)) : 0
      };
    }

    function editCard(card) {
      var d = readCard(card);
      openForm('Sửa cơ hội', escapeHtml(d.customer), [
        { name: 'customer', label: 'Tên khách hàng / công ty *', default: d.customer },
        { name: 'zone', label: 'Khu công nghiệp', default: d.zone },
        { name: 'desc', label: 'Nhu cầu / sản phẩm quan tâm', default: d.desc },
        { name: 'value', label: 'Giá trị ước tính (VNĐ)', type: 'number', default: d.value }
      ], function (data) {
        if (!data.customer.trim()) { toast('Vui lòng nhập tên khách hàng'); return; }
        if (d.titleEl) d.titleEl.textContent = data.customer;
        if (d.zoneEl) d.zoneEl.textContent = data.zone || 'Chưa xác định KCN';
        if (d.descEl) d.descEl.textContent = data.desc || '(chưa mô tả)';
        if (d.valueEl && data.value !== d.value) {
          d.valueEl.innerHTML = formatVnd(data.value) + ' <span class="font-body-sm text-body-sm text-outline font-normal">VNĐ</span>';
          adjustColumn(card.parentElement, 0, data.value - d.value);
          adjustTotalPill(0, data.value - d.value);
        }
        toast('Đã cập nhật cơ hội "' + data.customer + '"');
      });
    }

    function deleteCard(card) {
      var d = readCard(card);
      confirmBox('Xóa cơ hội', 'Bạn có chắc muốn xóa cơ hội <b>' + escapeHtml(d.customer) + '</b>? Số liệu cột và tổng Pipeline sẽ được tính lại.', function () {
        adjustColumn(card.parentElement, -1, -d.value);
        adjustTotalPill(-1, -d.value);
        card.remove();
        toast('Đã xóa cơ hội "' + d.customer + '"');
      });
    }

    root.addEventListener('click', function (e) {
      var act = e.target.closest('[data-demoact]');
      if (!act) return;
      var card = act.closest('[id^="column-stage-"] > div');
      if (!card) return;
      if (act.getAttribute('data-demoact') === 'edit') editCard(card);
      else deleteCard(card);
    });

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
      attachCardActions(clone);
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

    // Màn hình Khách hàng tiềm năng ("Chuyển thành Cơ hội") gọi hàm này để thêm thẻ vào Pipeline
    api.addOpportunity = addOpportunityCard;
  }

  // ============================================================
  // PAGE: bao-gia.html — Thêm dòng, chiết khấu, đính kèm, lưu nháp/gửi duyệt + tổng tiền
  // ============================================================
  function initQuotePage(root) {
    var addBtn = findButtonByText('Thêm dòng từ Danh mục', root);
    var importBtn = findButtonByText('Nhập từ Excel báo giá', root);
    var attachBtn = findButtonByText('Đính thêm tài liệu', root);
    var discountBtn = findButtonByText('Cấu hình hệ số chiết khấu', root);
    var draftBtn = findButtonByText('Lưu nháp', root);
    var submitBtn = findButtonByText('Gửi duyệt Giám đốc KD', root);
    var tbody = root.querySelector('table tbody');
    if (!tbody) return;

    // ---- Thanh tổng cộng cố định phía dưới: đọc trạng thái hiện có, vẽ lại sau mỗi lần thêm dòng/chiết khấu ----
    function footerEl(label) { return findElByText('footer span', label, root); }
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

    // Liệt kê lại "Phát hiện N dòng dưới ngưỡng chuẩn (...)" từ chính bảng (đúng với mọi lần thêm/sửa/xóa)
    function rebuildWarn() {
      if (!refs.warn) return;
      var parts = [];
      Array.prototype.forEach.call(tbody.querySelectorAll(':scope > tr'), function (row, i) {
        var cell = row.querySelectorAll(':scope > td')[9];
        var txt = cell ? cell.textContent.replace(/\s+/g, ' ') : '';
        var m = txt.match(/<\s*(SX|TM)\s*(\d+)%/); // dòng dưới ngưỡng có nhãn "< TM 12%" / "< SX 17%"
        if (!m) return;
        var pct = (txt.match(/(\d+(?:\.\d+)?)%/) || [])[1];
        parts.push('Dòng ' + (i + 1) + ': ' + m[1] + ' ' + pct + '% &lt; ' + m[2] + '%');
      });
      refs.warn.innerHTML = parts.length
        ? 'Phát hiện <strong>' + parts.length + ' dòng</strong> dưới ngưỡng chuẩn (' + parts.join(' | ') + ')'
        : 'Tất cả các dòng đều đạt ngưỡng margin chuẩn';
    }

    // Cột cuối mỗi dòng: nút Sửa + Xóa (bản gốc chỉ có icon thùng rác, không có tác dụng)
    var lastTh = root.querySelector('table thead th:last-child');
    if (lastTh) lastTh.className = lastTh.className.replace('w-10', 'w-16');
    function setRowActions(row) {
      var td = row.querySelector(':scope > td:last-child');
      if (!td) return;
      td.className = 'py-space-sm px-space-xs text-center text-outline';
      td.innerHTML = '<div class="flex items-center justify-center gap-1">' +
        '<span class="material-symbols-outlined text-[18px] cursor-pointer hover:text-primary" data-demoact="edit" title="Sửa dòng">edit</span>' +
        '<span class="material-symbols-outlined text-[18px] cursor-pointer hover:text-error" data-demoact="delete" title="Xóa dòng">delete</span></div>';
    }
    Array.prototype.forEach.call(tbody.querySelectorAll(':scope > tr'), setRowActions);
    var rowTemplate = tbody.lastElementChild ? tbody.lastElementChild.cloneNode(true) : null;
    if (!rowTemplate) return;

    function readQuoteRow(row) {
      var c = row.querySelectorAll(':scope > td');
      var nameSpan = c[2].querySelector('span.font-headline-sm, span.font-semibold');
      var originSpans = c[3].querySelectorAll('span');
      var unitSpan = c[4].querySelector('span');
      var seg = c[9].textContent.match(/(SX|TM)/);
      return {
        product: nameSpan ? nameSpan.textContent.trim() : '',
        origin: originSpans[0] ? originSpans[0].textContent.trim() : '',
        unit: unitSpan ? unitSpan.textContent.trim() : '',
        segment: seg ? seg[1] : 'TM',
        qty: parseVndNumber(c[5].textContent),
        cost: parseVndNumber(c[6].textContent),
        sell: parseVndNumber(c[7].textContent)
      };
    }

    // Ghi dữ liệu vào các ô của dòng. Dòng gốc của Stitch giữ nguyên hình ảnh/nhãn kỹ thuật, chỉ dòng do người dùng thêm mới được vẽ lại đầy đủ.
    function writeQuoteRow(row, data) {
      var cells = row.querySelectorAll(':scope > td');
      var isDemo = !!row.dataset.demoadd;
      var segment = data.segment === 'SX' ? 'SX' : 'TM';
      var nameSpan = cells[2].querySelector('span.font-headline-sm, span.font-semibold');
      if (nameSpan) nameSpan.textContent = data.product;
      var originSpans = cells[3].querySelectorAll('span');
      if (originSpans[0]) originSpans[0].textContent = data.origin || '-';
      if (isDemo && originSpans[1]) originSpans[1].textContent = segment === 'SX' ? 'Sản xuất trong nước' : 'Thương mại nhập khẩu';
      var unitSpan = cells[4].querySelector('span');
      if (unitSpan) unitSpan.textContent = data.unit || '-';
      cells[5].textContent = data.qty;
      cells[6].textContent = formatVnd(data.cost);
      cells[7].textContent = formatVnd(data.sell);
      cells[8].textContent = formatVnd(data.qty * data.sell);
      var marginPct = data.sell > 0 ? ((data.sell - data.cost) / data.sell) * 100 : 0;
      var threshold = MARGIN_THRESHOLD[segment];
      var ok = marginPct >= threshold;
      cells[9].innerHTML = ok
        ? '<div class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-data-mono text-label-sm font-bold shadow-sm">' +
          '<span class="material-symbols-outlined text-[14px]">check_circle</span><span>' + marginPct.toFixed(1) + '%</span>' +
          '<span class="font-body-sm text-[10px] font-normal opacity-80">(' + segment + ' Đạt)</span></div>'
        : '<div class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-data-mono text-label-sm font-bold shadow-sm">' +
          '<span class="material-symbols-outlined text-[14px]">warning</span><span>' + marginPct.toFixed(1) + '%</span>' +
          '<span class="font-body-sm text-[10px] font-semibold text-secondary">&lt; ' + segment + ' ' + threshold + '% CẦN DUYỆT</span></div>';
      return { marginPct: marginPct, threshold: threshold, segment: segment, ok: ok };
    }

    // Cộng (sign = 1) hoặc trừ (sign = -1) đóng góp của 1 dòng vào tổng ở thanh dưới
    function applyLineToTotals(data, sign) {
      if (!q) return;
      q.qty += sign * data.qty;
      q.cost += sign * data.qty * data.cost;
      q.gross += sign * data.qty * data.sell;
      q.profit += sign * data.qty * (data.sell - data.cost);
    }

    function refreshQuoteAfterChange() {
      Array.prototype.forEach.call(tbody.querySelectorAll(':scope > tr'), function (r, i) {
        r.querySelectorAll(':scope > td')[0].textContent = pad2(i + 1);
      });
      recomputeQuoteFooter();
      rebuildWarn();
      renderQuoteTotals();
    }

    function addQuoteLineRow(data) {
      var clone = rowTemplate.cloneNode(true);
      clone.dataset.demoadd = '1';
      var cells = clone.querySelectorAll(':scope > td');
      var img = cells[1] && cells[1].querySelector('img');
      if (img) { img.removeAttribute('src'); img.style.visibility = 'hidden'; } // không có ảnh minh hoạ cho dòng tự thêm
      var tagWrap = cells[2] && cells[2].querySelector('.flex.items-center.gap-space-xs');
      if (tagWrap) tagWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span>';
      var result = writeQuoteRow(clone, data);
      tbody.appendChild(clone);
      applyLineToTotals(data, 1);
      refreshQuoteAfterChange();
      return result;
    }

    function quoteFields(d) {
      return [
        { name: 'product', label: 'Tên sản phẩm *', default: d.product },
        { name: 'origin', label: 'Xuất xứ / Hãng', default: d.origin },
        { name: 'unit', label: 'Đơn vị tính', default: d.unit },
        { name: 'segment', label: 'Phân khúc', type: 'select', options: ['TM', 'SX'], default: d.segment },
        { name: 'qty', label: 'Số lượng', type: 'number', default: d.qty },
        { name: 'cost', label: 'Giá vốn (VNĐ)', type: 'number', default: d.cost },
        { name: 'sell', label: 'Giá bán đề xuất (VNĐ)', type: 'number', default: d.sell }
      ];
    }

    function editQuoteLine(row) {
      var old = readQuoteRow(row);
      openForm('Sửa dòng sản phẩm', 'Margin & tổng tiền phía dưới sẽ tự tính lại.', quoteFields(old), function (data) {
        if (!data.product.trim()) { toast('Vui lòng nhập tên sản phẩm'); return; }
        applyLineToTotals(old, -1);
        var r = writeQuoteRow(row, data);
        applyLineToTotals(data, 1);
        refreshQuoteAfterChange();
        toast('Đã cập nhật dòng "' + data.product + '" — margin ' + r.marginPct.toFixed(1) + '% (' + (r.ok ? 'đạt' : 'dưới') + ' ngưỡng ' + r.segment + ' ' + r.threshold + '%)');
      });
    }

    function deleteQuoteLine(row) {
      var old = readQuoteRow(row);
      confirmBox('Xóa dòng sản phẩm', 'Bạn có chắc muốn xóa dòng <b>' + escapeHtml(old.product) + '</b> khỏi báo giá? Tổng tiền sẽ được tính lại.', function () {
        row.remove();
        applyLineToTotals(old, -1);
        refreshQuoteAfterChange();
        toast('Đã xóa dòng "' + old.product + '"');
      });
    }

    tbody.addEventListener('click', function (e) {
      var act = e.target.closest('[data-demoact]');
      if (!act || !tbody.contains(act)) return;
      var row = act.closest('tr');
      if (act.getAttribute('data-demoact') === 'edit') editQuoteLine(row);
      else deleteQuoteLine(row);
    });

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
        var statusBadge = findElByText('span', 'DRAFT_REV_01', root);
        if (statusBadge) statusBadge.textContent = 'CHỜ DUYỆT';
        var label = submitBtn.querySelector('span:last-child');
        if (label) label.textContent = 'Đã gửi duyệt — chờ Giám đốc KD';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '.7';
        submitBtn.style.cursor = 'default';
        toast('Đã gửi báo giá lên Giám đốc KD duyệt lúc ' + nowHm());
      });
    }

    // Nút "Tạo nhanh Báo giá" trên header (dùng chung mọi màn hình) gọi hàm này
    api.applyQuickQuote = applyQuickQuote;

    function applyQuickQuote(data) {
      if (!data || !data.product) return;
      var customerInput = root.querySelector('input[type="text"]');
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
      var countBadge = root.querySelector('span.font-data-mono.text-body-sm.font-semibold');
      if (countBadge) countBadge.textContent = rows.length + ' dòng sản phẩm';
    }
  }

  // ============================================================
  // PAGE: cham-soc-khieu-nai.html — Ghi nhận Khiếu nại, đính kèm, Tạm lưu (Audit Trail) + bộ đếm
  // ============================================================
  function initComplaintsPage(root) {
    var tbody = root.querySelector('table tbody');
    var headerStrip = root.querySelector('.px-space-md.py-space-sm.bg-surface-container-low.flex.items-center.justify-between');
    if (!tbody || !headerStrip) return;

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'h-8 px-space-md bg-primary hover:bg-primary-container text-on-primary rounded font-label-sm text-label-sm shadow-sm flex items-center gap-1';
    addBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">add</span><span>Ghi nhận Khiếu nại<span class="demoadd-badge-new">MỚI</span></span>';
    headerStrip.appendChild(addBtn);

    // Nút Sửa / Xóa dưới mã phiếu ở mỗi dòng
    function addRowActions(row) {
      var td = row.querySelector(':scope > td');
      if (td && !td.querySelector('[data-demoact]')) td.insertAdjacentHTML('beforeend', '<div class="mt-1 flex gap-1 pl-2">' + ACTION_BUTTONS + '</div>');
    }
    var seedRows = tbody.querySelectorAll(':scope > tr');
    Array.prototype.forEach.call(seedRows, addRowActions);
    var rowTemplate = (seedRows[1] || seedRows[0]).cloneNode(true);

    // delta = +1 khi thêm phiếu, -1 khi xóa; status = trạng thái của phiếu bị thêm/xóa
    function bumpComplaintCounters(delta, status) {
      var resolved = /giải quyết/i.test(status || '');
      var tabLabels = ['Tất cả'];
      if (status) tabLabels.push(status);
      tabLabels.forEach(function (label) {
        var tab = findElByText('button', label, root);
        bumpLeadingNumber(tab && tab.querySelector('span:last-child'), delta);
      });
      if (!resolved) {
        var openLabel = findElByText('span', 'Đang mở', root);
        bumpLeadingNumber(openLabel && openLabel.parentElement.previousElementSibling, delta);
        var shown = findElByText('span', 'phiếu khiếu nại đang tiến hành', root);
        if (shown) shown.textContent = shown.textContent.replace(/Hiển thị (\d+) phiếu/, function (_, n) { return 'Hiển thị ' + Math.max(0, parseInt(n, 10) + delta) + ' phiếu'; });
      }
      var pager = findElByText('span', 'phiếu khiếu nại (Trang', root);
      if (pager) pager.textContent = pager.textContent.replace(/Hiển thị (\d+) \/ (\d+) phiếu/, function (_, a, b) { return 'Hiển thị ' + Math.max(0, parseInt(a, 10) + delta) + ' / ' + Math.max(0, parseInt(b, 10) + delta) + ' phiếu'; });
    }

    function readComplaint(row) {
      var c = row.querySelectorAll(':scope > td');
      var s0 = c[0].querySelectorAll('span');
      var issue = c[1].querySelector('div > span');
      var status = c[4].querySelector('span');
      return {
        code: s0[0] ? s0[0].textContent.trim() : '',
        customer: s0[1] ? s0[1].textContent.trim() : '',
        site: s0[2] ? s0[2].textContent.trim() : '',
        issue: issue ? issue.textContent.replace(/\s+/g, ' ').trim() : '',
        priority: c[2].textContent.replace(/\s+/g, ' ').trim(),
        status: status ? status.textContent.replace(/\s+/g, ' ').trim() : ''
      };
    }

    function setPriorityCells(cells, priority) {
      var isUrgent = priority === 'Khẩn cấp';
      cells[2].innerHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ' +
        (isUrgent ? 'bg-error-container text-tertiary-container' : 'bg-surface-container-high text-on-surface-variant') + '">' +
        '<span class="w-1.5 h-1.5 rounded-full ' + (isUrgent ? 'bg-tertiary' : 'bg-outline') + '"></span>' + escapeHtml(priority) + '</span>';
      cells[3].innerHTML = '<div class="flex flex-col items-end"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-data-mono text-data-mono font-bold">' +
        '<span class="material-symbols-outlined text-[14px]">schedule</span>' + (isUrgent ? 'Còn 4.0h' : 'Còn 48.0h') + '</span>' +
        '<span class="text-outline font-label-sm text-label-sm mt-0.5">SLA: ' + (isUrgent ? '4.0h' : '48.0h') + '</span></div>';
    }

    addBtn.addEventListener('click', function () {
      openForm('Ghi nhận Khiếu nại mới', 'SLA: Khẩn cấp 4 giờ · Bình thường 48 giờ.', [
        { name: 'customer', label: 'Khách hàng *', default: '' },
        { name: 'site', label: 'KCN / Nhà máy', default: '' },
        { name: 'issue', label: 'Nội dung sự cố *', default: '' },
        { name: 'priority', label: 'Mức độ ưu tiên', type: 'select', options: ['Bình thường', 'Khẩn cấp'], default: 'Bình thường' }
      ], function (data) {
        if (!data.customer.trim() || !data.issue.trim()) { toast('Vui lòng nhập khách hàng và nội dung sự cố'); return; }
        var clone = rowTemplate.cloneNode(true);
        clone.dataset.demoadd = '1';
        clone.removeAttribute('onclick');
        clone.className = 'hover:bg-surface-container-low/60 cursor-pointer transition-colors';
        var cells = clone.querySelectorAll(':scope > td');
        var newCode = 'KN-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 899);
        var s0 = cells[0].querySelectorAll('span');
        if (s0[0]) s0[0].textContent = newCode;
        if (s0[1]) s0[1].textContent = data.customer;
        if (s0[2]) s0[2].textContent = data.site || '(chưa cập nhật)';
        var issueSpan = cells[1].querySelector('div > span');
        if (issueSpan) issueSpan.textContent = data.issue;
        var tagWrap = cells[1].querySelector('.mt-1.flex');
        if (tagWrap) tagWrap.innerHTML = '<span class="demoadd-badge-new">MỚI</span>';
        setPriorityCells(cells, data.priority);
        cells[4].innerHTML = '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">Mới tiếp nhận</span>' +
          '<span class="block font-label-sm text-label-sm text-outline mt-1 truncate max-w-[85px] mx-auto">Chưa gán</span>';
        tbody.insertBefore(clone, tbody.firstChild);
        bumpComplaintCounters(1, 'Mới tiếp nhận');
        toast('Đã ghi nhận khiếu nại ' + newCode + ' — ' + data.customer);
      });
    });

    function editComplaint(row) {
      var d = readComplaint(row);
      var priorities = ['Bình thường', 'Khẩn cấp'];
      if (priorities.indexOf(d.priority) === -1) priorities.unshift(d.priority);
      openForm('Sửa khiếu nại ' + escapeHtml(d.code), '', [
        { name: 'customer', label: 'Khách hàng *', default: d.customer },
        { name: 'site', label: 'KCN / Nhà máy', default: d.site },
        { name: 'issue', label: 'Nội dung sự cố *', default: d.issue },
        { name: 'priority', label: 'Mức độ ưu tiên', type: 'select', options: priorities, default: d.priority }
      ], function (data) {
        if (!data.customer.trim() || !data.issue.trim()) { toast('Vui lòng nhập khách hàng và nội dung sự cố'); return; }
        var cells = row.querySelectorAll(':scope > td');
        var s0 = cells[0].querySelectorAll('span');
        if (s0[1]) s0[1].textContent = data.customer;
        if (s0[2]) s0[2].textContent = data.site || '(chưa cập nhật)';
        var issueSpan = cells[1].querySelector('div > span');
        if (issueSpan) issueSpan.textContent = data.issue;
        if (data.priority !== d.priority) setPriorityCells(cells, data.priority);
        toast('Đã cập nhật khiếu nại ' + d.code);
      });
    }

    function deleteComplaint(row) {
      var d = readComplaint(row);
      confirmBox('Xóa khiếu nại', 'Bạn có chắc muốn xóa phiếu <b>' + escapeHtml(d.code) + '</b> — ' + escapeHtml(d.customer) + '? Các bộ đếm sẽ được tính lại.', function () {
        row.remove();
        bumpComplaintCounters(-1, d.status);
        toast('Đã xóa phiếu khiếu nại ' + d.code);
      });
    }

    tbody.addEventListener('click', function (e) {
      var act = e.target.closest('[data-demoact]');
      if (!act || !tbody.contains(act)) return;
      var row = act.closest('tr');
      if (act.getAttribute('data-demoact') === 'edit') editComplaint(row);
      else deleteComplaint(row);
    });

    // "+ Thêm file" trong khung đính kèm tài liệu ở chân panel chi tiết khiếu nại
    var attachFileBtn = findButtonByText('Thêm file', root);
    if (attachFileBtn) {
      attachFileBtn.addEventListener('click', function () {
        triggerFilePicker(null, function (file) {
          var labelSpan = findElByText('span', 'Tài liệu đính kèm', root);
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
    var saveBtn = findButtonByText('Tạm lưu cập nhật', root);
    var notes = document.getElementById('resolutionNotes');
    var timeline = root.querySelector('#complaintDetailDrawer .space-y-3.pl-4');
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
        var count = findElByText('span', 'mốc ghi nhận', root);
        bumpLeadingNumber(count, 1);
        toast('Đã tạm lưu cập nhật vào Audit Trail lúc ' + nowHm());
      });
    }
  }

  // ============================================================
  // HEADER dùng chung mọi trang — "+ Tạo nhanh Báo giá"
  // ============================================================
  function initHeaderQuickQuote() {
    var btn = findButtonByText('Tạo nhanh Báo giá', document.querySelector('header'));
    if (!btn) return;
    btn.addEventListener('click', function () {
      openForm('Tạo nhanh Báo giá', 'Tạo báo giá mới với 1 dòng sản phẩm đầu tiên, có thể bổ sung thêm sau ở trang Báo giá.', [
        { name: 'company', label: 'Khách hàng / Công ty *', default: '' },
        { name: 'product', label: 'Sản phẩm *', default: '' },
        { name: 'qty', label: 'Số lượng', type: 'number', default: 1 },
        { name: 'sell', label: 'Giá bán đề xuất (VNĐ)', type: 'number', default: 0 }
      ], function (data) {
        if (!data.company || !data.product) { toast('Vui lòng nhập khách hàng và sản phẩm'); return; }
        api.applyQuickQuote(data);
        goTo('bao-gia');
      });
    });
  }

  // ============================================================
  // PAGE: dashboard.html / index.html — "Tạo việc mới" + nút hành động trên từng việc
  // ============================================================
  function initDashboardTasks(root) {
    var addBtn = findButtonByText('Tạo việc mới', root);
    var heading = findElByText('h2', 'Cần xử lý hôm nay', root);
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

    var META_SELECTOR = '.flex.items-center.gap-space-md.text-label-sm.font-label-sm.text-outline';

    // Nút Sửa / Xóa ở cuối dòng thông tin của từng việc
    Array.prototype.forEach.call(taskList.children, function (c) {
      var m = c.querySelector(META_SELECTOR);
      (m || c).insertAdjacentHTML('beforeend', '<span class="flex gap-1" style="margin-left:auto">' + ACTION_BUTTONS + '</span>');
    });
    var taskTemplate = taskList.firstElementChild.cloneNode(true);

    // Kiểu hiển thị theo mức ưu tiên (dùng cho việc do người dùng tạo/sửa)
    function stylePriority(taskCard, isUrgent) {
      taskCard.dataset.priority = isUrgent ? 'Khẩn cấp' : 'Bình thường';
      taskCard.className = 'p-space-md rounded transition-all flex flex-col gap-space-xs relative pl-space-lg ' +
        (isUrgent ? 'bg-error-container/30 hover:bg-error-container/50' : 'bg-surface-container-low hover:bg-surface-container');
      var bar = taskCard.querySelector('.absolute.left-0.top-0.bottom-0');
      if (bar) bar.className = 'absolute left-0 top-0 bottom-0 w-1.5 rounded-l ' + (isUrgent ? 'bg-tertiary' : 'bg-secondary-container');
      var badgeWrap = taskCard.querySelector('.flex.items-center.gap-space-xs.flex-wrap');
      if (badgeWrap) {
        badgeWrap.innerHTML = '<span class="font-label-sm text-label-sm font-semibold uppercase px-1.5 py-0.5 rounded ' +
          (isUrgent ? 'bg-tertiary text-on-tertiary' : 'bg-secondary-fixed text-on-secondary-fixed-variant') + '">Việc mới<span class="demoadd-badge-new">MỚI</span></span>' +
          '<span class="font-data-mono text-label-sm ' + (isUrgent ? 'text-tertiary' : 'text-secondary') + ' font-bold">Vừa tạo</span>';
      }
      var metaRow = taskCard.querySelector(META_SELECTOR);
      var metaSpans = metaRow ? metaRow.querySelectorAll(':scope > span') : [];
      if (metaSpans[1]) metaSpans[1].innerHTML = '<span class="material-symbols-outlined text-[14px]">priority_high</span>Ưu tiên: ' + (isUrgent ? 'Khẩn cấp' : 'Bình thường');
    }

    function isUrgentTask(taskCard) {
      var bar = taskCard.querySelector('.absolute.left-0.top-0.bottom-0');
      return !!bar && bar.classList.contains('bg-tertiary') && !taskCard.dataset.done;
    }

    function editTask(taskCard) {
      var h3 = taskCard.querySelector('h3');
      var p = taskCard.querySelector('p');
      var isDemo = !!taskCard.dataset.demoadd;
      var fields = [
        { name: 'title', label: 'Tiêu đề công việc / Khách hàng *', default: h3 ? h3.textContent.trim() : '' },
        { name: 'desc', label: 'Mô tả ngắn', default: p ? p.textContent.replace(/\s+/g, ' ').trim() : '' }
      ];
      if (isDemo) fields.push({ name: 'priority', label: 'Mức ưu tiên', type: 'select', options: ['Bình thường', 'Khẩn cấp'], default: taskCard.dataset.priority || 'Bình thường' });
      openForm('Sửa công việc', '', fields, function (data) {
        if (!data.title.trim()) { toast('Vui lòng nhập tiêu đề công việc'); return; }
        if (h3) h3.textContent = data.title;
        if (p) p.textContent = data.desc || '(chưa có mô tả)';
        if (isDemo && data.priority !== taskCard.dataset.priority) {
          var wasUrgent = isUrgentTask(taskCard);
          stylePriority(taskCard, data.priority === 'Khẩn cấp');
          if (!taskCard.dataset.done) bumpUrgent((data.priority === 'Khẩn cấp' ? 1 : 0) - (wasUrgent ? 1 : 0));
        }
        toast('Đã cập nhật công việc "' + data.title + '"');
      });
    }

    function deleteTask(taskCard) {
      var h3 = taskCard.querySelector('h3');
      var title = h3 ? h3.textContent.trim() : '';
      confirmBox('Xóa công việc', 'Bạn có chắc muốn xóa việc <b>' + escapeHtml(title) + '</b> khỏi danh sách "Cần xử lý hôm nay"?', function () {
        if (isUrgentTask(taskCard)) bumpUrgent(-1);
        taskCard.remove();
        toast('Đã xóa công việc "' + title + '"');
      });
    }

    taskList.addEventListener('click', function (e) {
      var act = e.target.closest('[data-demoact]');
      if (!act) return;
      var taskCard = act.closest('.relative.pl-space-lg');
      if (!taskCard) return;
      if (act.getAttribute('data-demoact') === 'edit') editTask(taskCard);
      else deleteTask(taskCard);
    });

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
        btn.addEventListener('click', function () { goTo('cham-soc-khieu-nai'); });
      } else if (label.indexOf('Điều chỉnh báo giá') !== -1) {
        btn.addEventListener('click', function () { goTo('bao-gia'); });
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
        if (!data.title.trim()) { toast('Vui lòng nhập tiêu đề công việc'); return; }
        var isUrgent = data.priority === 'Khẩn cấp';
        var clone = taskTemplate.cloneNode(true);
        clone.dataset.demoadd = '1';
        stylePriority(clone, isUrgent);
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
            if (clone.dataset.done) return;
            if (isUrgentTask(clone)) bumpUrgent(-1);
            clone.dataset.done = '1';
            clone.style.opacity = '.55';
            if (h3) h3.style.textDecoration = 'line-through';
            actionBtn.disabled = true;
            actionBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span><span>Đã hoàn tất</span>';
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
  function initRevenuePage(root) {
    var directTable = document.getElementById('tab-direct-content');
    if (!directTable) return;
    var tbody = directTable.querySelector('tbody');
    if (!tbody) return;

    function ribbonValue(label) {
      var l = findElByText('span.uppercase', label, root);
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
    var deletedRows = [];
    var customerTemplate = null;

    function pctChange(prev, cur) {
      return prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
    }
    function isBigMove(prev, cur) {
      return Math.abs(pctChange(prev, cur)) >= REVENUE_SIGNIFICANT_PCT;
    }

    // Tổng DS = tổng gốc + phần chênh của từng dòng còn lại so với mốc ban đầu (dòng bị xóa đã được trừ khỏi mốc)
    function computeTotals() {
      var sum = baseTotal;
      var bigMoves = seedBigMoves;
      rowState.forEach(function (st, row) {
        if (!row.isConnected) return;
        var cur = parseVndNumber(st.input.value);
        sum += cur - st.initial;
        bigMoves += (isBigMove(parseVndNumber(st.prevCell.textContent), cur) ? 1 : 0) - (st.initSig ? 1 : 0);
      });
      return { sum: sum, bigMoves: bigMoves };
    }

    function recomputeRevenue() {
      var t = computeTotals();
      var sum = t.sum;
      if (totalEl && totalEl.firstChild) totalEl.firstChild.nodeValue = formatVnd(sum) + ' ';
      if (prevTotalEl && prevTotalEl.firstChild) prevTotalEl.firstChild.nodeValue = formatVnd(prevTotal) + ' ';
      var attain = totalEl && totalEl.nextElementSibling;
      if (attain && attain.lastChild && attain.lastChild.nodeType === 3 && quotaBase > 0) {
        attain.lastChild.nodeValue = ' Đạt ' + (sum / quotaBase * 100).toFixed(1) + '% chỉ tiêu tháng\n';
      }
      if (diffEl && diffEl.children[0]) {
        var diff = sum - prevTotal;
        var valueSpan = diffEl.children[0];
        if (valueSpan.firstChild) valueSpan.firstChild.nodeValue = (diff >= 0 ? '+' : '-') + formatVnd(Math.abs(diff)) + ' ';
        if (diffEl.children[1]) diffEl.children[1].textContent = (diff >= 0 ? '+' : '') + (prevTotal > 0 ? (diff / prevTotal * 100).toFixed(2) : '0.00') + '%';
      }
      if (bigMoveEl && bigMoveEl.firstElementChild) bigMoveEl.firstElementChild.textContent = Math.max(0, t.bigMoves) + ' Khách hàng';
    }

    function renumber() {
      Array.prototype.forEach.call(tbody.querySelectorAll(':scope > tr'), function (r, i) {
        var c = r.querySelector(':scope > td');
        if (c) c.textContent = pad2(i + 1);
      });
    }

    function wireRow(row, isNewRow) {
      var cells = row.querySelectorAll(':scope > td');
      var prevCell = cells[3];
      var curInput = cells[4] && cells[4].querySelector('input');
      var changeCell = cells[5];
      var reasonInput = cells[7] && cells[7].querySelector('input');
      if (!curInput || !prevCell || !changeCell) return;

      var initial = isNewRow ? 0 : parseVndNumber(curInput.value);
      rowState.set(row, {
        input: curInput,
        prevCell: prevCell,
        initial: initial,
        initialText: isNewRow ? '' : curInput.value,
        initSig: isNewRow ? false : isBigMove(parseVndNumber(prevCell.textContent), initial)
      });
      // Nút Sửa / Xóa dưới tên khách hàng (dòng "Đã import" bị khóa nên không có)
      if (!cells[1].querySelector('[data-demoact]')) cells[1].insertAdjacentHTML('beforeend', '<div class="flex gap-1 mt-1">' + ACTION_BUTTONS + '</div>');

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

    tbody.querySelectorAll(':scope > tr').forEach(function (row) {
      wireRow(row, false);
      if (!customerTemplate && rowState.has(row)) customerTemplate = row.cloneNode(true);
    });

    function readCustomer(row) {
      var c = row.querySelectorAll(':scope > td');
      var nameSpan = c[1].querySelector('span.font-semibold');
      var addrSpan = c[1].querySelector('span.flex.items-center');
      var addr = addrSpan ? addrSpan.textContent.replace(/\s+/g, ' ').replace(/^\s*domain\s*/, '').trim() : '';
      var parts = addr.split('• MST:');
      var mst = (parts[1] || '').trim();
      var indSpan = c[2].querySelector('span');
      return {
        name: nameSpan ? ownText(nameSpan) : '',
        site: parts[0].trim(),
        mst: mst === '—' ? '' : mst,
        industry: indSpan ? indSpan.textContent.trim() : '',
        prev: parseVndNumber(c[3].textContent),
        cur: parseVndNumber(rowState.get(row) ? rowState.get(row).input.value : '')
      };
    }

    function writeCustomerCells(row, d) {
      var c = row.querySelectorAll(':scope > td');
      var nameSpan = c[1].querySelector('span.font-semibold');
      if (nameSpan) setOwnText(nameSpan, d.name);
      var addrSpan = c[1].querySelector('span.flex.items-center');
      if (addrSpan) addrSpan.innerHTML = '<span class="material-symbols-outlined text-[14px]">domain</span> ' + escapeHtml(d.site || '(chưa cập nhật)') + ' • MST: ' + escapeHtml(d.mst || '—');
      var indSpan = c[2].querySelector('span');
      if (indSpan) indSpan.textContent = d.industry;
      c[3].textContent = formatVnd(d.prev);
    }

    function customerFields(d) {
      var industries = ['Bán dẫn', 'Dược phẩm', 'Quang học', 'Khác'];
      if (d.industry && industries.indexOf(d.industry) === -1) industries.unshift(d.industry);
      return [
        { name: 'name', label: 'Tên khách hàng *', default: d.name },
        { name: 'site', label: 'Khu công nghiệp', default: d.site },
        { name: 'mst', label: 'Mã số thuế', default: d.mst },
        { name: 'industry', label: 'Ngành hàng', type: 'select', options: industries, default: d.industry || industries[0] },
        { name: 'prev', label: 'DS tháng trước (₫)', type: 'number', default: d.prev },
        { name: 'cur', label: 'DS tháng này (₫)', type: 'number', default: d.cur }
      ];
    }

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
      if (!customerTemplate) return;
      openForm('Thêm khách hàng vào báo cáo', 'Khách hàng mới sẽ được thêm vào cuối bảng nhập doanh số tháng.',
        customerFields({ name: '', site: '', mst: '', industry: 'Bán dẫn', prev: 0, cur: 0 }), function (data) {
          if (!data.name.trim()) { toast('Vui lòng nhập tên khách hàng'); return; }
          var clone = customerTemplate.cloneNode(true);
          clone.dataset.demoadd = '1';
          var cells = clone.querySelectorAll(':scope > td');
          var nameSpan = cells[1].querySelector('span.font-semibold');
          if (nameSpan) nameSpan.insertAdjacentHTML('beforeend', '<span class="demoadd-badge-new">MỚI</span>');
          writeCustomerCells(clone, data);
          var curInput = cells[4].querySelector('input');
          curInput.value = formatVnd(data.cur);
          var reasonInput = cells[7] && cells[7].querySelector('input');
          if (reasonInput) { reasonInput.value = ''; reasonInput.style.borderColor = ''; reasonInput.placeholder = 'Giải trình nếu biến động ≥ 15%'; }
          tbody.appendChild(clone);
          addedRows.push(clone);
          wireRow(clone, true);
          prevTotal += data.prev;
          renumber();
          curInput.dispatchEvent(new Event('input'));
          bumpLeadingNumber(tabCountEl, 1);
          toast('Đã thêm khách hàng "' + data.name + '" vào báo cáo tháng');
        });
    });

    function editCustomer(row) {
      var d = readCustomer(row);
      openForm('Sửa khách hàng', escapeHtml(d.name), customerFields(d), function (data) {
        if (!data.name.trim()) { toast('Vui lòng nhập tên khách hàng'); return; }
        var st = rowState.get(row);
        prevTotal += data.prev - d.prev;
        writeCustomerCells(row, data);
        st.input.value = formatVnd(data.cur);
        st.input.dispatchEvent(new Event('input'));
        toast('Đã cập nhật khách hàng "' + data.name + '"');
      });
    }

    function deleteCustomer(row) {
      var d = readCustomer(row);
      confirmBox('Xóa khách hàng', 'Bạn có chắc muốn xóa <b>' + escapeHtml(d.name) + '</b> khỏi báo cáo tháng? Các tổng doanh số sẽ được tính lại (bấm "Hủy bỏ" để hoàn tác nếu chưa lưu).', function () {
        var st = rowState.get(row);
        var prev = parseVndNumber(st.prevCell.textContent);
        var addedIdx = addedRows.indexOf(row);
        var rec = { row: row, next: row.nextElementSibling, st: st, prev: prev };
        baseTotal -= st.initial;
        prevTotal -= prev;
        if (st.initSig) seedBigMoves -= 1;
        rowState.delete(row);
        if (addedIdx !== -1) addedRows.splice(addedIdx, 1);
        else deletedRows.push(rec);
        row.remove();
        bumpLeadingNumber(tabCountEl, -1);
        renumber();
        recomputeRevenue();
        toast('Đã xóa khách hàng "' + d.name + '"');
      });
    }

    tbody.addEventListener('click', function (e) {
      var act = e.target.closest('[data-demoact]');
      if (!act || !tbody.contains(act)) return;
      var row = act.closest('tr');
      if (act.getAttribute('data-demoact') === 'edit') editCustomer(row);
      else deleteCustomer(row);
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
    var exportBtn = findButtonByText('Xuất template Excel', root);
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var out = [['STT', 'Khách hàng', 'MST', 'DS tháng trước (₫)', 'DS tháng này (₫)']];
        tbody.querySelectorAll(':scope > tr').forEach(function (r, i) {
          var c = r.querySelectorAll(':scope > td');
          var nameEl = c[1] && c[1].querySelector('span.font-semibold');
          var mst = c[1] ? (c[1].textContent.match(/MST:\s*(\d+)/) || [])[1] || '' : '';
          out.push([i + 1, nameEl ? ownText(nameEl) : '', mst, parseVndNumber(c[3] && c[3].textContent), '']);
        });
        downloadCsv('template-doanh-so-thang-10-2024.csv', out);
        toast('Đã xuất template (' + (out.length - 1) + ' khách hàng)');
      });
    }

    // ---- Thanh lưu/hủy phía dưới ----
    var cancelBtn = findButtonByText('Hủy bỏ', root);
    var draftBtn = findButtonByText('Lưu nháp', root);
    var saveBtn = findButtonByText('Lưu báo cáo tháng', root);
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        addedRows.forEach(function (r) {
          var st = rowState.get(r);
          if (st) prevTotal -= parseVndNumber(st.prevCell.textContent);
          rowState.delete(r);
          r.remove();
        });
        bumpLeadingNumber(tabCountEl, -addedRows.length);
        addedRows = [];
        // khôi phục các dòng đã xóa (theo thứ tự ngược lại lúc xóa để giữ đúng vị trí)
        deletedRows.slice().reverse().forEach(function (rec) {
          tbody.insertBefore(rec.row, rec.next && rec.next.parentNode === tbody ? rec.next : null);
          rowState.set(rec.row, rec.st);
          baseTotal += rec.st.initial;
          prevTotal += rec.prev;
          if (rec.st.initSig) seedBigMoves += 1;
          bumpLeadingNumber(tabCountEl, 1);
        });
        deletedRows = [];
        rowState.forEach(function (st) {
          st.input.value = st.initialText;
          st.input.dispatchEvent(new Event('input'));
        });
        renumber();
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
          if (isBigMove(parseVndNumber(st.prevCell.textContent), parseVndNumber(st.input.value)) && reason && !reason.value.trim()) {
            missingCount++;
            if (!missing) missing = reason;
          }
        });
        if (missing) {
          toast('Còn ' + missingCount + ' khách hàng biến động ≥ 15% chưa giải trình');
          missing.focus();
          return;
        }
        // Chốt số liệu hiện tại làm mốc mới: "Hủy bỏ" sau đó sẽ không hoàn tác những gì đã lưu
        var t = computeTotals();
        baseTotal = t.sum;
        seedBigMoves = t.bigMoves;
        rowState.forEach(function (st) {
          st.initial = parseVndNumber(st.input.value);
          st.initialText = st.input.value;
          st.initSig = isBigMove(parseVndNumber(st.prevCell.textContent), st.initial);
        });
        addedRows = [];
        deletedRows = [];
        var label = saveBtn.querySelector('span:last-child');
        if (label) label.textContent = 'Đã lưu ' + nowHm();
        toast('Đã lưu báo cáo tháng — tổng DS ' + (totalEl ? totalEl.textContent.replace(/\s+/g, ' ').trim() : '') + ' gửi Kế toán & GĐKD');
      });
    }
  }

  // ============== Router: mỗi màn hình là 1 khối <main data-page>, chuyển bằng #hash ==============
  var DEFAULT_PAGE = 'dashboard';
  var navActiveCls = '';
  var navInactiveCls = '';

  function captureNavStyle() {
    Array.prototype.forEach.call(document.querySelectorAll('aside nav a[data-path]'), function (a) {
      if (a.hasAttribute('aria-current')) navActiveCls = a.className;
      else if (!navInactiveCls) navInactiveCls = a.className;
    });
  }

  function showPage(id) {
    // đổi màn hình (kể cả bằng nút Back của trình duyệt) thì đóng hộp thoại / menu đang mở
    Array.prototype.forEach.call(document.querySelectorAll('.demoadd-backdrop'), function (b) { b.remove(); });
    closeMenu();
    var mains = document.querySelectorAll('main[data-page]');
    var exists = Array.prototype.some.call(mains, function (m) { return m.getAttribute('data-page') === id; });
    if (!exists) id = DEFAULT_PAGE;
    Array.prototype.forEach.call(mains, function (m) { m.hidden = m.getAttribute('data-page') !== id; });
    Array.prototype.forEach.call(document.querySelectorAll('aside nav a[data-path]'), function (a) {
      var on = a.getAttribute('data-path') === id;
      a.className = on ? navActiveCls : navInactiveCls;
      if (on) {
        a.setAttribute('aria-current', 'page');
        document.title = 'CleanTech CRM - ' + a.textContent.replace(/^\s*\S+\s+/, '').trim();
      } else {
        a.removeAttribute('aria-current');
      }
    });
    window.scrollTo(0, 0);
  }

  function goTo(id) {
    if (location.hash === '#' + id) showPage(id);
    else location.hash = '#' + id;
  }

  // ============== Khởi chạy ==============
  document.addEventListener('DOMContentLoaded', function () {
    injectModalStyle();
    captureNavStyle();
    var roots = {};
    ['dashboard', 'khach-hang-tiem-nang', 'pipeline', 'bao-gia', 'cham-soc-khieu-nai', 'bao-cao-doanh-so'].forEach(function (id) { roots[id] = pageRoot(id); });
    if (roots['khach-hang-tiem-nang']) { initLeadsPage(roots['khach-hang-tiem-nang']); initLeadConvertPage(roots['khach-hang-tiem-nang']); }
    if (roots['pipeline']) initPipelinePage(roots['pipeline']);
    if (roots['bao-gia']) initQuotePage(roots['bao-gia']);
    if (roots['cham-soc-khieu-nai']) initComplaintsPage(roots['cham-soc-khieu-nai']);
    if (roots['bao-cao-doanh-so']) initRevenuePage(roots['bao-cao-doanh-so']);
    if (roots['dashboard']) initDashboardTasks(roots['dashboard']);
    initHeaderQuickQuote();

    window.addEventListener('hashchange', function () { showPage(location.hash.slice(1)); });
    showPage(location.hash.slice(1));
  });
})();
