'use strict';
/*
 * CRM Dong Anh - BAN DEMO TINH (khong can server/backend that).
 * Toan bo "API" ben duoi la mo phong lai dung logic nghiep vu cua ban server that
 * (xem lib/business-rules.js va cac file routes/*.js trong ban dung day du),
 * nhung chay hoan toan trong trinh duyet bang du lieu mau (mockup), luu tam trong bo nho (JS),
 * MAT KHI TAI LAI TRANG. Muc dich: demo giao dien + luong nghiep vu cho khach hang xem truoc,
 * khong dung de luu du lieu that.
 */

// ================= BUSINESS RULES (port tu lib/business-rules.js - KHONG tu y doi nguong) =================
const MARGIN_THRESHOLD = { SX: 17, TM: 12 };
const QUOTE_APPROVAL_SLA_HOURS = 24;
const COMPLAINT_SLA_HOURS = { khan_cap: 4, binh_thuong: 48 };
const OPPORTUNITY_STALE_DAYS = 14;
const REVENUE_DEADLINE_DAY = 8;
const LOST_REASONS = ['Gia cao', 'Chon NCC khac', 'Khong con nhu cau', 'Khach khong phan hoi', 'Khac'];
const OPPORTUNITY_STAGES = ['moi_tao', 'dang_tu_van', 'da_bao_gia', 'dam_phan', 'chot_don', 'mat_co_hoi'];

function computeMargin(lines) {
  const totalCost = lines.reduce((s, l) => s + Number(l.cost_price) * Number(l.quantity), 0);
  const totalSell = lines.reduce((s, l) => s + Number(l.sell_price) * Number(l.quantity), 0);
  const marginPercent = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  return { totalCost, totalSell, marginPercent };
}
function meetsMarginThreshold(segment, marginPercent) {
  return marginPercent >= (MARGIN_THRESHOLD[segment] ?? 999);
}
function quoteStatusFromMargin(segment, marginPercent) {
  return meetsMarginThreshold(segment, marginPercent) ? 'san_sang_gui' : 'cho_duyet';
}
function complaintDeadline(priority, fromDate = new Date()) {
  const hours = COMPLAINT_SLA_HOURS[priority];
  return new Date(fromDate.getTime() + hours * 3600 * 1000);
}
function isOpportunityStale(lastUpdateAt, now = new Date()) {
  const diffDays = (now - new Date(lastUpdateAt)) / (1000 * 3600 * 24);
  return diffDays > OPPORTUNITY_STALE_DAYS;
}
function revenueChangeLabel(current, previous) {
  if (previous === undefined || previous === null) return { label: 'khong_co_du_lieu', pct: null };
  if (previous === 0) return { label: current > 0 ? 'tang' : 'khong_doi', pct: null };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.01) return { label: 'khong_doi', pct: 0 };
  return { label: pct > 0 ? 'tang' : 'giam', pct };
}
function isRevenueSignificantChange(pct, thresholdPct = 15) {
  return pct !== null && Math.abs(pct) >= thresholdPct;
}

// ================= MOCK DATABASE (du lieu hoan toan hu cau) =================
function isoMinus(unit, amount) {
  const d = new Date();
  if (unit === 'days') d.setDate(d.getDate() - amount);
  if (unit === 'hours') d.setHours(d.getHours() - amount);
  return d.toISOString();
}

let DB = null;
let SEQ = {};

function seedDb() {
  SEQ = { customer: 1, lead: 1, opportunity: 1, quote: 1, complaint: 1, revenue: 1 };
  const users = [
    { id: 1, name: 'Nguyễn Văn Hùng', role: 'nvkd', area: 'Bắc Ninh & Bắc Giang' },
    { id: 2, name: 'Trần Thị Lan', role: 'nvkd', area: 'Hà Nội & Hưng Yên' },
    { id: 3, name: 'Lê Quang Minh', role: 'sales_manager', area: 'Toàn miền Bắc' },
    { id: 4, name: 'Phạm Thu Hà', role: 'gd_kh', area: 'Toàn quốc' }
  ];
  const NVKD_HUNG = 1, NVKD_LAN = 2;

  const customers = [
    { id: SEQ.customer++, name: 'Công ty TNHH Luxshare-ICT', tax_code: '0100012345', address: 'KCN Vân Trung, Bắc Giang', industry_zone: 'KCN Vân Trung, Bắc Giang', segment: 'SX', rank: 'A', nvkd_id: NVKD_HUNG, source: 'crm' },
    { id: SEQ.customer++, name: 'Cty CP Dược phẩm Nam Hà', tax_code: '0100022345', address: 'Nhà máy GMP Hà Nam', industry_zone: 'Nhà máy GMP Hà Nam', segment: 'SX', rank: 'A', nvkd_id: NVKD_HUNG, source: 'crm' },
    { id: SEQ.customer++, name: 'Samsung Display Việt Nam', tax_code: '0100032345', address: 'KCN Yên Phong, Bắc Ninh', industry_zone: 'KCN Yên Phong, Bắc Ninh', segment: 'SX', rank: 'A', nvkd_id: NVKD_HUNG, source: 'crm' },
    { id: SEQ.customer++, name: 'Công ty TNHH JA Solar Việt Nam', tax_code: '0100042345', address: 'KCN Quang Châu, Bắc Giang', industry_zone: 'KCN Quang Châu, Bắc Giang', segment: 'SX', rank: 'B', nvkd_id: NVKD_HUNG, source: 'crm' },
    { id: SEQ.customer++, name: 'Công ty TM Minh Phát', tax_code: '0100052345', address: 'Hà Nội', industry_zone: 'Hà Nội', segment: 'TM', rank: 'B', nvkd_id: NVKD_LAN, source: 'crm' },
    { id: SEQ.customer++, name: 'Công ty CP Vật tư Hoà Bình', tax_code: '0100062345', address: 'Hưng Yên', industry_zone: 'Hưng Yên', segment: 'TM', rank: 'C', nvkd_id: NVKD_LAN, source: 'crm' }
  ];
  const [custLuxshare, custNamHa, custSamsung, custJASolar, custMinhPhat, custHoaBinh] = customers.map((c) => c.id);

  const leads = [
    {
      id: SEQ.lead++, company_name: 'Công ty TNHH Điện tử Foxconn Bắc Giang', tax_code: '0109xxxxxx',
      address: 'KCN Quang Châu, Bắc Giang', industry_zone: 'KCN Quang Châu', industry: 'Điện tử',
      contact_main_name: 'Ông Trịnh Văn Đức', contact_main_title: 'Trưởng phòng QA', contact_main_phone: '090xxxxxxx',
      contact_secondary_name: null, contact_secondary_title: null, contact_secondary_phone: null,
      product_interest: [{ product: 'Găng tay Nitrile ISO 5', qty_expected: 500, frequency: 'Hàng tháng' }],
      purchase_process: 'Duyệt qua 3 cấp: QA -> Purchasing -> GM; yêu cầu báo giá + mẫu thử trước khi ký hợp đồng khung',
      new_vendor_process: 'Yêu cầu hồ sơ năng lực, chứng nhận ISO 9001, mẫu COA/COC 3 lô liên tiếp đạt chuẩn',
      potential_level: 'Cao', approach_strategy: 'Tiếp cận qua giới thiệu từ Samsung Display, mời tham quan nhà máy đối tác hiện hữu',
      status: 'dang_theo_doi', nvkd_id: NVKD_HUNG, converted_customer_id: null, converted_opportunity_id: null,
      created_at: isoMinus('days', 5), updated_at: isoMinus('days', 5)
    }
  ];

  const opportunities = [
    { id: SEQ.opportunity++, customer_id: custLuxshare, title: 'Găng tay phòng sạch Class 100 & Giấy lau Kimtech', stage: 'dang_tu_van', value_estimate: 1250000000, lost_reason: null, nvkd_id: NVKD_HUNG, from_lead_id: null, last_update_at: isoMinus('days', 18) },
    { id: SEQ.opportunity++, customer_id: custSamsung, title: 'Thảm dính bụi Sticky Mat 200 cuộn', stage: 'da_bao_gia', value_estimate: 850000000, lost_reason: null, nvkd_id: NVKD_HUNG, from_lead_id: null, last_update_at: isoMinus('days', 3) },
    { id: SEQ.opportunity++, customer_id: custJASolar, title: 'Bộ lọc Hepa filter & kiểm định Air Shower', stage: 'dam_phan', value_estimate: 620000000, lost_reason: null, nvkd_id: NVKD_HUNG, from_lead_id: null, last_update_at: isoMinus('days', 1) },
    { id: SEQ.opportunity++, customer_id: custMinhPhat, title: 'Bộ đồ vô trùng chống tĩnh điện', stage: 'moi_tao', value_estimate: 180000000, lost_reason: null, nvkd_id: NVKD_LAN, from_lead_id: null, last_update_at: isoMinus('days', 0) },
    { id: SEQ.opportunity++, customer_id: custHoaBinh, title: 'Khẩu trang & bao tay cao su công nghiệp', stage: 'chot_don', value_estimate: 95000000, lost_reason: null, nvkd_id: NVKD_LAN, from_lead_id: null, last_update_at: isoMinus('days', 30) }
  ];

  function buildQuote(code, customerId, oppId, nvkdId, segment, lines) {
    const { marginPercent } = computeMargin(lines);
    const status = quoteStatusFromMargin(segment, marginPercent);
    return {
      id: SEQ.quote++, code, customer_id: customerId, opportunity_id: oppId, nvkd_id: nvkdId,
      status, segment, margin_percent: marginPercent, version: 1, parent_quote_id: null,
      approval_deadline_at: status === 'cho_duyet' ? new Date(Date.now() + QUOTE_APPROVAL_SLA_HOURS * 3600 * 1000).toISOString() : null,
      decided_by: null, decision_note: null, created_at: isoMinus('hours', 6), sent_at: null,
      lines: lines.map((l, i) => ({ id: i + 1, ...l }))
    };
  }
  const quotes = [
    buildQuote('QUO-2024-0982', custSamsung, 2, NVKD_HUNG, 'SX', [{ product_name: 'Thảm dính bụi Sticky Mat', origin: 'Hàn Quốc', unit: 'Cuộn', quantity: 200, cost_price: 950000, sell_price: 1040000 }]),
    buildQuote('QUO-2024-0991', custJASolar, 3, NVKD_HUNG, 'SX', [{ product_name: 'Hepa Filter H14', origin: 'Nhật Bản', unit: 'Bộ', quantity: 40, cost_price: 3200000, sell_price: 4100000 }]),
    buildQuote('QUO-2024-0995', custMinhPhat, 4, NVKD_LAN, 'TM', [{ product_name: 'Bộ đồ vô trùng chống tĩnh điện', origin: 'Việt Nam', unit: 'Bộ', quantity: 300, cost_price: 85000, sell_price: 105000 }])
  ];

  function buildComplaint(customerId, title, description, priority, assigneeId, hoursAgo) {
    const createdAt = isoMinus('hours', hoursAgo);
    return {
      id: SEQ.complaint++, customer_id: customerId, title, description, priority, status: 'moi',
      assignee_id: assigneeId, deadline_at: complaintDeadline(priority, new Date(createdAt)).toISOString(),
      resolution_note: null, reopened_count: 0, created_at: createdAt, resolved_at: null
    };
  }
  const complaints = [
    buildComplaint(custNamHa, 'Lô quần áo vô trùng dính bụi hạt sợi', 'Yêu cầu kiểm tra mẫu tại Lab - lô LOT-202410-CL08, khách phản ánh phát hiện hạt sợi bất thường trên bề mặt vải.', 'khan_cap', NVKD_HUNG, 2),
    buildComplaint(custLuxshare, 'Chậm giao hàng đợt 2 so với cam kết', 'Khách yêu cầu xác nhận lại lịch giao hàng đợt 2 cho đơn găng tay Class 100.', 'binh_thuong', NVKD_HUNG, 20)
  ];

  const revenueSeries = {
    [custLuxshare]: [820, 910, 980, 1050, 1120, 1250],
    [custSamsung]: [1500, 1600, 1550, 1700, 1800, 1900],
    [custJASolar]: [400, 420, 410, 450, 470, 480],
    [custMinhPhat]: [90, 95, 100, 98, 105, 110],
    [custHoaBinh]: [60, 62, 58, 65, 63, 70]
  };
  const revenue = [];
  const now = new Date();
  for (const [custIdStr, series] of Object.entries(revenueSeries)) {
    const custId = Number(custIdStr);
    const nvkdOwner = customers.find((c) => c.id === custId).nvkd_id;
    series.forEach((valueMillion, idx) => {
      const back = 5 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      revenue.push({
        id: SEQ.revenue++, customer_id: custId, nvkd_id: nvkdOwner,
        year: d.getFullYear(), month: d.getMonth() + 1, revenue: valueMillion * 1000000,
        source: 'manual', change_reason: null, created_at: isoMinus('days', back * 30)
      });
    });
  }

  DB = { users, customers, leads, opportunities, quotes, complaints, revenue };
}
seedDb();

// ================= LOCAL "API" (mo phong dung route/logic cua ban server that) =================
function findOr404(arr, id, label) {
  const row = arr.find((x) => x.id === Number(id));
  if (!row) { const e = new Error('Khong tim thay ' + label); e.status = 404; throw e; }
  return row;
}
function userName(id) { const u = DB.users.find((x) => x.id === id); return u ? u.name : null; }
function customerName(id) { const c = DB.customers.find((x) => x.id === id); return c ? c.name : null; }

function withStaleOpp(o) { return { ...o, customer_name: customerName(o.customer_id), customer_segment: DB.customers.find((c) => c.id === o.customer_id)?.segment, nvkd_name: userName(o.nvkd_id), is_stale: isOpportunityStale(o.last_update_at) }; }
function withOverdueComplaint(c) {
  const overdue = ['moi', 'dang_xu_ly', 'mo_lai'].includes(c.status) && new Date(c.deadline_at) < new Date();
  return { ...c, customer_name: customerName(c.customer_id), assignee_name: userName(c.assignee_id), is_overdue: overdue };
}
function withChangeRevenue(r) {
  const priorRows = DB.revenue.filter((x) => x.customer_id === r.customer_id && (x.year < r.year || (x.year === r.year && x.month < r.month)));
  priorRows.sort((a, b) => (b.year - a.year) || (b.month - a.month));
  const prev = priorRows[0];
  const change = revenueChangeLabel(r.revenue, prev ? prev.revenue : null);
  return { ...r, customer_name: customerName(r.customer_id), nvkd_name: userName(r.nvkd_id), change_label: change.label, change_pct: change.pct, is_significant_change: isRevenueSignificantChange(change.pct) };
}

const ROUTES = [
  ['GET', /^\/api\/customers$/, () => DB.customers.map((c) => ({ ...c, nvkd_name: userName(c.nvkd_id) })).sort((a, b) => a.name.localeCompare(b.name))],
  ['GET', /^\/api\/users$/, () => DB.users],

  ['GET', /^\/api\/leads$/, () => DB.leads.map((l) => ({ ...l, nvkd_name: userName(l.nvkd_id) })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))],
  ['POST', /^\/api\/leads$/, (m, body) => {
    if (!body.company_name) { const e = new Error('Thieu ten cong ty (company_name)'); e.status = 400; throw e; }
    const lead = {
      id: SEQ.lead++, company_name: body.company_name, tax_code: body.tax_code || null, address: body.address || null,
      industry_zone: body.industry_zone || null, industry: body.industry || null,
      contact_main_name: body.contact_main_name || null, contact_main_title: body.contact_main_title || null, contact_main_phone: body.contact_main_phone || null,
      contact_secondary_name: null, contact_secondary_title: null, contact_secondary_phone: null,
      product_interest: body.product_interest || [], purchase_process: body.purchase_process || null, new_vendor_process: body.new_vendor_process || null,
      potential_level: body.potential_level || 'Trung binh', approach_strategy: body.approach_strategy || null,
      status: 'dang_theo_doi', nvkd_id: body.nvkd_id || null, converted_customer_id: null, converted_opportunity_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    DB.leads.unshift(lead);
    return lead;
  }],
  ['POST', /^\/api\/leads\/(\d+)\/convert$/, (m, body) => {
    const lead = findOr404(DB.leads, m[1], 'Lead');
    if (lead.status === 'da_chuyen_co_hoi') { const e = new Error('Lead nay da duoc chuyen thanh Co hoi truoc do'); e.status = 409; throw e; }
    const segment = body.segment === 'SX' ? 'SX' : 'TM';
    const customer = {
      id: SEQ.customer++, name: lead.company_name, tax_code: lead.tax_code, address: lead.address,
      industry_zone: lead.industry_zone, segment, rank: body.rank || 'C', nvkd_id: lead.nvkd_id, source: 'crm'
    };
    DB.customers.push(customer);
    const opportunity = {
      id: SEQ.opportunity++, customer_id: customer.id, title: body.title || `Co hoi tu Lead: ${lead.company_name}`,
      stage: 'moi_tao', value_estimate: body.value_estimate || 0, lost_reason: null, nvkd_id: lead.nvkd_id,
      from_lead_id: lead.id, last_update_at: new Date().toISOString()
    };
    DB.opportunities.push(opportunity);
    lead.status = 'da_chuyen_co_hoi';
    lead.converted_customer_id = customer.id;
    lead.converted_opportunity_id = opportunity.id;
    lead.updated_at = new Date().toISOString();
    return { lead_id: lead.id, customer, opportunity };
  }],

  ['GET', /^\/api\/opportunities$/, () => DB.opportunities.map(withStaleOpp).sort((a, b) => new Date(b.last_update_at) - new Date(a.last_update_at))],
  ['PATCH', /^\/api\/opportunities\/(\d+)\/stage$/, (m, body) => {
    const opp = findOr404(DB.opportunities, m[1], 'Co hoi');
    const { stage } = body;
    if (!OPPORTUNITY_STAGES.includes(stage)) { const e = new Error('Giai doan khong hop le: ' + stage); e.status = 400; throw e; }
    if (stage === 'mat_co_hoi' && !LOST_REASONS.includes(body.lost_reason)) {
      const e = new Error('Bat buoc chon ly do mat co hoi trong danh sach dinh san'); e.status = 400; throw e;
    }
    opp.stage = stage;
    opp.lost_reason = stage === 'mat_co_hoi' ? body.lost_reason : null;
    opp.last_update_at = new Date().toISOString();
    return withStaleOpp(opp);
  }],

  ['GET', /^\/api\/quotes$/, () => DB.quotes.map((q) => ({ ...q, customer_name: customerName(q.customer_id), nvkd_name: userName(q.nvkd_id) })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))],
  ['POST', /^\/api\/quotes$/, (m, body) => {
    if (!body.customer_id || !Array.isArray(body.lines) || !body.lines.length) { const e = new Error('Thieu customer_id hoac danh sach dong hang (lines)'); e.status = 400; throw e; }
    const customer = findOr404(DB.customers, body.customer_id, 'Khach hang');
    const { marginPercent } = computeMargin(body.lines);
    const status = quoteStatusFromMargin(customer.segment, marginPercent);
    const quote = {
      id: SEQ.quote++, code: body.code || ('QUO-' + Date.now()), customer_id: customer.id, opportunity_id: body.opportunity_id || null,
      nvkd_id: body.nvkd_id || null, status, segment: customer.segment, margin_percent: marginPercent, version: 1, parent_quote_id: null,
      approval_deadline_at: status === 'cho_duyet' ? new Date(Date.now() + QUOTE_APPROVAL_SLA_HOURS * 3600 * 1000).toISOString() : null,
      decided_by: null, decision_note: null, created_at: new Date().toISOString(), sent_at: null,
      lines: body.lines.map((l, i) => ({ id: i + 1, product_name: l.product_name, origin: l.origin || null, unit: l.unit || null, quantity: l.quantity || 1, cost_price: l.cost_price || 0, sell_price: l.sell_price || 0 }))
    };
    DB.quotes.push(quote);
    return quote;
  }],
  ['POST', /^\/api\/quotes\/(\d+)\/approve$/, (m, body) => {
    const q = findOr404(DB.quotes, m[1], 'Bao gia');
    if (q.status !== 'cho_duyet') { const e = new Error('Bao gia khong o trang thai cho duyet'); e.status = 409; throw e; }
    q.status = 'san_sang_gui'; q.decided_by = body.decided_by || null; q.decision_note = body.decision_note || null;
    return q;
  }],
  ['POST', /^\/api\/quotes\/(\d+)\/reject$/, (m, body) => {
    const q = findOr404(DB.quotes, m[1], 'Bao gia');
    if (q.status !== 'cho_duyet') { const e = new Error('Bao gia khong o trang thai cho duyet'); e.status = 409; throw e; }
    if (!body.decision_note) { const e = new Error('Bat buoc nhap ly do tu choi (decision_note)'); e.status = 400; throw e; }
    q.status = 'nhap'; q.decision_note = body.decision_note; q.approval_deadline_at = null;
    return q;
  }],
  ['POST', /^\/api\/quotes\/(\d+)\/send$/, (m) => {
    const q = findOr404(DB.quotes, m[1], 'Bao gia');
    if (q.status !== 'san_sang_gui') { const e = new Error('Chi duoc gui bao gia o trang thai san_sang_gui'); e.status = 409; throw e; }
    q.status = 'da_gui'; q.sent_at = new Date().toISOString();
    return q;
  }],
  ['POST', /^\/api\/quotes\/(\d+)\/new-version$/, (m, body) => {
    const parent = findOr404(DB.quotes, m[1], 'Bao gia');
    if (parent.status !== 'da_gui') { const e = new Error('Chi tao phien ban moi tu bao gia da o trang thai da_gui'); e.status = 409; throw e; }
    const lines = (Array.isArray(body.lines) && body.lines.length) ? body.lines : parent.lines;
    const customer = findOr404(DB.customers, parent.customer_id, 'Khach hang');
    const { marginPercent } = computeMargin(lines);
    const status = quoteStatusFromMargin(customer.segment, marginPercent);
    const quote = {
      id: SEQ.quote++, code: parent.code + '-v' + (parent.version + 1), customer_id: parent.customer_id, opportunity_id: parent.opportunity_id,
      nvkd_id: parent.nvkd_id, status, segment: customer.segment, margin_percent: marginPercent, version: parent.version + 1, parent_quote_id: parent.id,
      approval_deadline_at: status === 'cho_duyet' ? new Date(Date.now() + QUOTE_APPROVAL_SLA_HOURS * 3600 * 1000).toISOString() : null,
      decided_by: null, decision_note: null, created_at: new Date().toISOString(), sent_at: null,
      lines: lines.map((l, i) => ({ id: i + 1, ...l }))
    };
    DB.quotes.push(quote);
    return quote;
  }],

  ['GET', /^\/api\/complaints$/, () => DB.complaints.map(withOverdueComplaint).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))],
  ['POST', /^\/api\/complaints$/, (m, body) => {
    if (!body.customer_id || !body.title || !body.priority) { const e = new Error('Thieu customer_id, title hoac priority'); e.status = 400; throw e; }
    if (!COMPLAINT_SLA_HOURS[body.priority]) { const e = new Error('Muc do uu tien khong hop le (khan_cap | binh_thuong)'); e.status = 400; throw e; }
    const complaint = {
      id: SEQ.complaint++, customer_id: body.customer_id, title: body.title, description: body.description || null,
      priority: body.priority, status: 'moi', assignee_id: body.assignee_id || null,
      deadline_at: complaintDeadline(body.priority).toISOString(), resolution_note: null, reopened_count: 0,
      created_at: new Date().toISOString(), resolved_at: null
    };
    DB.complaints.unshift(complaint);
    return withOverdueComplaint(complaint);
  }],
  ['POST', /^\/api\/complaints\/(\d+)\/start$/, (m) => {
    const c = findOr404(DB.complaints, m[1], 'Khieu nai');
    if (!['moi', 'mo_lai'].includes(c.status)) { const e = new Error('Chi chuyen sang dang_xu_ly tu trang thai moi hoac mo_lai'); e.status = 409; throw e; }
    c.status = 'dang_xu_ly';
    return withOverdueComplaint(c);
  }],
  ['POST', /^\/api\/complaints\/(\d+)\/resolve$/, (m, body) => {
    const c = findOr404(DB.complaints, m[1], 'Khieu nai');
    if (c.status !== 'dang_xu_ly') { const e = new Error('Chi giai quyet tu trang thai dang_xu_ly'); e.status = 409; throw e; }
    if (!body.resolution_note) { const e = new Error('Bat buoc nhap ghi chu huong xu ly (resolution_note) truoc khi dong'); e.status = 400; throw e; }
    c.status = 'da_giai_quyet'; c.resolution_note = body.resolution_note; c.resolved_at = new Date().toISOString();
    return withOverdueComplaint(c);
  }],
  ['POST', /^\/api\/complaints\/(\d+)\/reopen$/, (m) => {
    const c = findOr404(DB.complaints, m[1], 'Khieu nai');
    if (c.status !== 'da_giai_quyet') { const e = new Error('Chi mo lai tu trang thai da_giai_quyet'); e.status = 409; throw e; }
    c.status = 'mo_lai'; c.reopened_count++; c.resolved_at = null;
    return withOverdueComplaint(c);
  }],

  ['GET', /^\/api\/revenue$/, () => DB.revenue.map(withChangeRevenue).sort((a, b) => (b.year - a.year) || (b.month - a.month))],
  ['POST', /^\/api\/revenue$/, (m, body) => {
    const { customer_id, year, month, revenue } = body;
    if (!customer_id || !year || !month || revenue === undefined) { const e = new Error('Thieu customer_id, year, month hoac revenue'); e.status = 400; throw e; }
    const existing = DB.revenue.find((r) => r.customer_id === customer_id && r.year === year && r.month === month);
    if (existing && existing.source === 'import') { const e = new Error('Da co du lieu import tu he thong khac cho ky nay - khong cho phep nhap tay de de'); e.status = 409; throw e; }
    const customer = findOr404(DB.customers, customer_id, 'Khach hang');
    if (existing) {
      existing.revenue = revenue; existing.source = 'manual'; existing.change_reason = body.change_reason || null;
      return withChangeRevenue(existing);
    }
    const row = { id: SEQ.revenue++, customer_id, nvkd_id: customer.nvkd_id, year, month, revenue, source: 'manual', change_reason: body.change_reason || null, created_at: new Date().toISOString() };
    DB.revenue.push(row);
    return withChangeRevenue(row);
  }],

  ['GET', /^\/api\/dashboard\/summary$/, () => {
    const openOpps = DB.opportunities.filter((o) => !['chot_don', 'mat_co_hoi'].includes(o.stage));
    const staleOpps = openOpps.filter((o) => isOpportunityStale(o.last_update_at));
    const quotesPending = DB.quotes.filter((q) => q.status === 'cho_duyet');
    const quotesOverdue = quotesPending.filter((q) => q.approval_deadline_at && new Date(q.approval_deadline_at) < new Date());
    const complaintsOpen = DB.complaints.filter((c) => ['moi', 'dang_xu_ly', 'mo_lai'].includes(c.status));
    const complaintsOverdue = complaintsOpen.filter((c) => new Date(c.deadline_at) < new Date());
    const now = new Date();
    const sumRevenue = (y, mo) => DB.revenue.filter((r) => r.year === y && r.month === mo).reduce((s, r) => s + r.revenue, 0);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const byStage = {};
    for (const st of OPPORTUNITY_STAGES) {
      const rows = DB.opportunities.filter((o) => o.stage === st);
      byStage[st] = { count: rows.length, total_value: rows.reduce((s, o) => s + (o.value_estimate || 0), 0) };
    }
    return {
      pipeline: { open_count: openOpps.length, open_value: openOpps.reduce((s, o) => s + (o.value_estimate || 0), 0), stale_count: staleOpps.length, by_stage: byStage },
      quotes: { pending_approval_count: quotesPending.length, pending_approval_overdue_count: quotesOverdue.length },
      complaints: { open_count: complaintsOpen.length, overdue_count: complaintsOverdue.length },
      revenue: { this_month_total: sumRevenue(now.getFullYear(), now.getMonth() + 1), last_month_total: sumRevenue(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1), deadline_day: REVENUE_DEADLINE_DAY }
    };
  }]
];

function localApi(method, path, body) {
  for (const [m, re, handler] of ROUTES) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) return handler(match, body || {});
  }
  const e = new Error('Khong tim thay API mo phong: ' + method + ' ' + path);
  e.status = 404;
  throw e;
}

// ================= UI (giu nguyen logic giao dien nhu ban co backend that) =================
const STAGE_LABELS = {
  moi_tao: 'Mới tạo', dang_tu_van: 'Đang tư vấn', da_bao_gia: 'Đã báo giá',
  dam_phan: 'Đàm phán', chot_don: 'Chốt đơn', mat_co_hoi: 'Mất cơ hội'
};
const STAGES = OPPORTUNITY_STAGES;
const QUOTE_STATUS_LABELS = { nhap: 'Nháp', cho_duyet: 'Chờ duyệt', san_sang_gui: 'Sẵn sàng gửi', da_gui: 'Đã gửi' };
const COMPLAINT_STATUS_LABELS = { moi: 'Mới', dang_xu_ly: 'Đang xử lý', da_giai_quyet: 'Đã giải quyết', mo_lai: 'Mở lại' };

const state = { view: 'dashboard', customers: [], users: [] };

async function api(pathAndMethod, body) {
  const [method, path] = pathAndMethod.includes(' ') ? pathAndMethod.split(' ') : ['GET', pathAndMethod];
  // gia lap do tre mang nhe cho giong trai nghiem goi API that
  await new Promise((r) => setTimeout(r, 80));
  try {
    return localApi(method, path.split('?')[0], body);
  } catch (e) {
    throw new Error(e.message);
  }
}

function money(n) {
  return (Number(n) || 0).toLocaleString('vi-VN') + ' đ';
}
function dt(s) {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('modal-box').innerHTML = '';
}
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') closeModal();
});

document.querySelectorAll('.nav-item').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    el.classList.add('active');
    render(el.dataset.view);
  });
});

const TITLES = {
  dashboard: 'Dashboard', leads: 'Khách hàng tiềm năng (Lead)', pipeline: 'Pipeline / Cơ hội',
  quotes: 'Báo giá', complaints: 'Chăm sóc & Khiếu nại', revenue: 'Doanh số hàng tháng', customers: 'Khách hàng'
};

async function render(view) {
  state.view = view;
  document.getElementById('view-title').textContent = TITLES[view] || view;
  const root = document.getElementById('view-root');
  root.innerHTML = 'Đang tải...';
  try {
    state.customers = await api('/api/customers');
    state.users = await api('/api/users');
    const renderer = { dashboard: renderDashboard, leads: renderLeads, pipeline: renderPipeline, quotes: renderQuotes, complaints: renderComplaints, revenue: renderRevenue, customers: renderCustomers }[view];
    await renderer(root);
  } catch (e) {
    root.innerHTML = `<div class="empty-state">Lỗi tải dữ liệu: ${escapeHtml(e.message)}</div>`;
  }
}

async function renderDashboard(root) {
  const s = await api('/api/dashboard/summary');
  root.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="label">Cơ hội đang mở</div><div class="value">${s.pipeline.open_count}</div><div class="sub">${money(s.pipeline.open_value)}</div></div>
      <div class="kpi-card ${s.pipeline.stale_count ? 'alert' : ''}"><div class="label">Cơ hội "im" &gt; 14 ngày</div><div class="value">${s.pipeline.stale_count}</div><div class="sub">cần nhắc NVKD cập nhật</div></div>
      <div class="kpi-card ${s.quotes.pending_approval_overdue_count ? 'alert' : ''}"><div class="label">Báo giá chờ duyệt</div><div class="value">${s.quotes.pending_approval_count}</div><div class="sub">${s.quotes.pending_approval_overdue_count} đã quá hạn SLA</div></div>
      <div class="kpi-card ${s.complaints.overdue_count ? 'alert' : ''}"><div class="label">Khiếu nại đang mở</div><div class="value">${s.complaints.open_count}</div><div class="sub">${s.complaints.overdue_count} quá hạn SLA</div></div>
      <div class="kpi-card"><div class="label">Doanh số tháng này</div><div class="value">${money(s.revenue.this_month_total)}</div><div class="sub">Tháng trước: ${money(s.revenue.last_month_total)}</div></div>
    </div>
    <div class="panel">
      <h2>Cơ hội theo giai đoạn</h2>
      <table><thead><tr><th>Giai đoạn</th><th>Số lượng</th><th>Tổng giá trị ước tính</th></tr></thead><tbody>
        ${STAGES.map((st) => {
          const d = s.pipeline.by_stage[st] || { count: 0, total_value: 0 };
          return `<tr><td>${STAGE_LABELS[st]}</td><td>${d.count}</td><td>${money(d.total_value)}</td></tr>`;
        }).join('')}
      </tbody></table>
    </div>
  `;
}

function renderCustomers(root) {
  root.innerHTML = `
    <div class="panel">
      <h2>Danh sách khách hàng (${state.customers.length})</h2>
      <table><thead><tr><th>Tên</th><th>Phân khúc</th><th>Hạng</th><th>NVKD phụ trách</th><th>Nguồn</th></tr></thead><tbody>
        ${state.customers.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td><span class="badge brand">${c.segment}</span></td><td>${c.rank}</td><td>${escapeHtml(c.nvkd_name || '-')}</td><td>${c.source}</td></tr>`).join('')}
      </tbody></table>
    </div>
  `;
}

async function renderLeads(root) {
  const leads = await api('/api/leads');
  root.innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="btn-new-lead">+ Thêm Lead</button></div>
    <div class="panel">
      <table><thead><tr><th>Công ty</th><th>Liên hệ chính</th><th>Tiềm năng</th><th>NVKD</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        ${leads.map((l) => `
          <tr>
            <td><b>${escapeHtml(l.company_name)}</b><div class="hint">${escapeHtml(l.industry || '')}</div></td>
            <td>${escapeHtml(l.contact_main_name || '-')}<div class="hint">${escapeHtml(l.contact_main_phone || '')}</div></td>
            <td><span class="badge ${l.potential_level === 'Cao' ? 'green' : l.potential_level === 'Thap' ? 'gray' : 'amber'}">${l.potential_level}</span></td>
            <td>${escapeHtml(usersById(l.nvkd_id))}</td>
            <td>${l.status === 'da_chuyen_co_hoi' ? '<span class="badge green">Đã chuyển Cơ hội</span>' : '<span class="badge gray">Đang theo dõi</span>'}</td>
            <td>${l.status !== 'da_chuyen_co_hoi' ? `<button class="btn small primary" onclick="convertLead(${l.id})">Chuyển thành Cơ hội</button>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Chưa có Lead nào</td></tr>'}
      </tbody></table>
    </div>
  `;
  document.getElementById('btn-new-lead').addEventListener('click', showNewLeadModal);
}

function usersById(id) {
  const u = state.users.find((x) => x.id === id);
  return u ? u.name : '-';
}

function showNewLeadModal() {
  openModal(`
    <h2>Thêm Lead mới</h2>
    <div class="form-grid">
      <div class="field"><label>Tên công ty *</label><input id="f-company_name" /></div>
      <div class="field"><label>Ngành</label><input id="f-industry" /></div>
      <div class="field"><label>Người liên hệ chính</label><input id="f-contact_main_name" /></div>
      <div class="field"><label>SĐT liên hệ</label><input id="f-contact_main_phone" /></div>
      <div class="field"><label>Mức độ tiềm năng</label>
        <select id="f-potential_level"><option>Cao</option><option selected>Trung binh</option><option>Thap</option></select>
      </div>
      <div class="field"><label>NVKD phụ trách</label>
        <select id="f-nvkd_id">${state.users.filter((u) => u.role === 'nvkd').map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}</select>
      </div>
      <div class="field full"><label>Chiến lược tiếp cận</label><textarea id="f-approach_strategy"></textarea></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn primary" id="btn-save-lead">Lưu</button>
    </div>
  `);
  document.getElementById('btn-save-lead').addEventListener('click', async () => {
    try {
      const company_name = document.getElementById('f-company_name').value.trim();
      if (!company_name) return alert('Vui lòng nhập tên công ty');
      await api('POST /api/leads', {
        company_name,
        industry: document.getElementById('f-industry').value,
        contact_main_name: document.getElementById('f-contact_main_name').value,
        contact_main_phone: document.getElementById('f-contact_main_phone').value,
        potential_level: document.getElementById('f-potential_level').value,
        nvkd_id: Number(document.getElementById('f-nvkd_id').value) || null,
        approach_strategy: document.getElementById('f-approach_strategy').value
      });
      closeModal();
      render('leads');
    } catch (e) { alert(e.message); }
  });
}

async function convertLead(id) {
  if (!confirm('Chuyển Lead này thành Khách hàng chính thức + Cơ hội mới ở giai đoạn "Mới tạo"?')) return;
  try {
    await api(`POST /api/leads/${id}/convert`, {});
    render('leads');
  } catch (e) { alert(e.message); }
}

async function renderPipeline(root) {
  const opps = await api('/api/opportunities');
  root.innerHTML = `
    <div class="toolbar"><div class="hint">Kéo-thả chưa hỗ trợ trong bản demo - dùng ô chọn giai đoạn trên mỗi thẻ.</div></div>
    <div class="pipeline-board">
      ${STAGES.map((st) => `
        <div class="pipeline-col">
          <h3>${STAGE_LABELS[st]} (${opps.filter((o) => o.stage === st).length})</h3>
          ${opps.filter((o) => o.stage === st).map((o) => `
            <div class="opp-card">
              <div class="title">${escapeHtml(o.title)}</div>
              <div class="meta">${escapeHtml(o.customer_name)} · ${money(o.value_estimate)}</div>
              <div class="meta">NVKD: ${escapeHtml(o.nvkd_name || '-')}</div>
              ${o.is_stale ? '<div class="stale-flag">⚠ Chưa cập nhật &gt; 14 ngày</div>' : ''}
              ${o.stage === 'mat_co_hoi' && o.lost_reason ? `<div class="meta">Lý do: ${escapeHtml(o.lost_reason)}</div>` : ''}
              <select onchange="changeStage(${o.id}, this.value, '${o.stage}')">
                ${STAGES.map((s2) => `<option value="${s2}" ${s2 === o.stage ? 'selected' : ''}>${STAGE_LABELS[s2]}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

async function changeStage(id, newStage, oldStage) {
  if (newStage === oldStage) return;
  let lost_reason;
  if (newStage === 'mat_co_hoi') {
    lost_reason = prompt('Bắt buộc chọn lý do mất cơ hội:\n' + LOST_REASONS.join(' | '));
    if (!lost_reason || !LOST_REASONS.includes(lost_reason.trim())) {
      alert('Phải chọn đúng 1 lý do trong danh sách: ' + LOST_REASONS.join(', '));
      return render('pipeline');
    }
    lost_reason = lost_reason.trim();
  }
  try {
    await api(`PATCH /api/opportunities/${id}/stage`, { stage: newStage, lost_reason });
    render('pipeline');
  } catch (e) { alert(e.message); render('pipeline'); }
}

let quoteLineCount = 0;
async function renderQuotes(root) {
  const quotes = await api('/api/quotes');
  root.innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="btn-new-quote">+ Tạo Báo giá</button></div>
    <div class="panel">
      <table><thead><tr><th>Mã</th><th>Khách hàng</th><th>Margin</th><th>Trạng thái</th><th>Hạn duyệt</th><th></th></tr></thead><tbody>
        ${quotes.map((q) => `
          <tr>
            <td><b>${escapeHtml(q.code)}</b><div class="hint">v${q.version}</div></td>
            <td>${escapeHtml(q.customer_name)}</td>
            <td>${q.margin_percent != null ? q.margin_percent.toFixed(1) + '%' : '-'}</td>
            <td>${statusBadgeQuote(q.status)}</td>
            <td>${q.approval_deadline_at ? dt(q.approval_deadline_at) : '-'}</td>
            <td>${quoteActions(q)}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Chưa có báo giá nào</td></tr>'}
      </tbody></table>
    </div>
  `;
  document.getElementById('btn-new-quote').addEventListener('click', showNewQuoteModal);
}

function statusBadgeQuote(status) {
  const cls = { nhap: 'gray', cho_duyet: 'amber', san_sang_gui: 'green', da_gui: 'brand' }[status] || 'gray';
  return `<span class="badge ${cls}">${QUOTE_STATUS_LABELS[status]}</span>`;
}
function quoteActions(q) {
  if (q.status === 'cho_duyet') return `<button class="btn small primary" onclick="approveQuote(${q.id})">Duyệt</button> <button class="btn small danger" onclick="rejectQuote(${q.id})">Từ chối</button>`;
  if (q.status === 'san_sang_gui') return `<button class="btn small primary" onclick="sendQuote(${q.id})">Đánh dấu đã gửi</button>`;
  if (q.status === 'da_gui') return `<button class="btn small" onclick="newVersionQuote(${q.id})">Tạo phiên bản mới</button>`;
  return '';
}
async function approveQuote(id) { try { await api(`POST /api/quotes/${id}/approve`, {}); render('quotes'); } catch (e) { alert(e.message); } }
async function rejectQuote(id) {
  const note = prompt('Lý do từ chối (bắt buộc):');
  if (!note) return;
  try { await api(`POST /api/quotes/${id}/reject`, { decision_note: note }); render('quotes'); } catch (e) { alert(e.message); }
}
async function sendQuote(id) { try { await api(`POST /api/quotes/${id}/send`, {}); render('quotes'); } catch (e) { alert(e.message); } }
async function newVersionQuote(id) { try { await api(`POST /api/quotes/${id}/new-version`, {}); render('quotes'); } catch (e) { alert(e.message); } }

function showNewQuoteModal() {
  quoteLineCount = 0;
  openModal(`
    <h2>Tạo Báo giá mới</h2>
    <div class="field"><label>Khách hàng *</label>
      <select id="f-customer_id">${state.customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${c.segment})</option>`).join('')}</select>
    </div>
    <table class="lines-table"><thead><tr><th>Sản phẩm</th><th>SL</th><th>Giá vốn</th><th>Giá bán</th></tr></thead>
      <tbody id="quote-lines-body"></tbody>
    </table>
    <button class="btn small" id="btn-add-line" type="button">+ Thêm dòng</button>
    <div class="hint" id="margin-preview"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn primary" id="btn-save-quote">Tạo Báo giá</button>
    </div>
  `);
  addQuoteLine();
  document.getElementById('btn-add-line').addEventListener('click', addQuoteLine);
  document.getElementById('btn-save-quote').addEventListener('click', saveNewQuote);
}
function addQuoteLine() {
  quoteLineCount++;
  const i = quoteLineCount;
  const tbody = document.getElementById('quote-lines-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input id="l-name-${i}" /></td>
    <td><input id="l-qty-${i}" type="number" value="1" style="width:60px" oninput="updateMarginPreview()" /></td>
    <td><input id="l-cost-${i}" type="number" value="0" style="width:90px" oninput="updateMarginPreview()" /></td>
    <td><input id="l-sell-${i}" type="number" value="0" style="width:90px" oninput="updateMarginPreview()" /></td>
  `;
  tbody.appendChild(tr);
  updateMarginPreview();
}
function collectQuoteLines() {
  const lines = [];
  for (let i = 1; i <= quoteLineCount; i++) {
    const nameEl = document.getElementById(`l-name-${i}`);
    if (!nameEl) continue;
    lines.push({
      product_name: nameEl.value || `Sản phẩm ${i}`,
      quantity: Number(document.getElementById(`l-qty-${i}`).value) || 0,
      cost_price: Number(document.getElementById(`l-cost-${i}`).value) || 0,
      sell_price: Number(document.getElementById(`l-sell-${i}`).value) || 0
    });
  }
  return lines;
}
function updateMarginPreview() {
  const lines = collectQuoteLines();
  const totalCost = lines.reduce((s, l) => s + l.cost_price * l.quantity, 0);
  const totalSell = lines.reduce((s, l) => s + l.sell_price * l.quantity, 0);
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
  const el = document.getElementById('margin-preview');
  if (el) el.textContent = `Margin ước tính: ${margin.toFixed(1)}% (SX cần ≥17%, TM cần ≥12% để tự động "sẵn sàng gửi")`;
}
async function saveNewQuote() {
  try {
    const customer_id = Number(document.getElementById('f-customer_id').value);
    const lines = collectQuoteLines().filter((l) => l.product_name);
    if (!lines.length) return alert('Cần ít nhất 1 dòng sản phẩm');
    await api('POST /api/quotes', { customer_id, lines });
    closeModal();
    render('quotes');
  } catch (e) { alert(e.message); }
}

async function renderComplaints(root) {
  const complaints = await api('/api/complaints');
  root.innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="btn-new-complaint">+ Ghi nhận Khiếu nại</button></div>
    <div class="panel">
      <table><thead><tr><th>Khách hàng</th><th>Nội dung</th><th>Ưu tiên</th><th>Trạng thái</th><th>Hạn xử lý (SLA)</th><th></th></tr></thead><tbody>
        ${complaints.map((c) => `
          <tr>
            <td>${escapeHtml(c.customer_name)}</td>
            <td><b>${escapeHtml(c.title)}</b><div class="hint">${escapeHtml(c.description || '')}</div></td>
            <td><span class="badge ${c.priority === 'khan_cap' ? 'red' : 'gray'}">${c.priority === 'khan_cap' ? 'Khẩn cấp' : 'Bình thường'}</span></td>
            <td>${statusBadgeComplaint(c.status)}</td>
            <td>${dt(c.deadline_at)} ${c.is_overdue ? '<span class="badge red">Quá hạn</span>' : ''}</td>
            <td>${complaintActions(c)}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Chưa có khiếu nại nào</td></tr>'}
      </tbody></table>
    </div>
  `;
  document.getElementById('btn-new-complaint').addEventListener('click', showNewComplaintModal);
}
function statusBadgeComplaint(status) {
  const cls = { moi: 'gray', dang_xu_ly: 'amber', da_giai_quyet: 'green', mo_lai: 'red' }[status] || 'gray';
  return `<span class="badge ${cls}">${COMPLAINT_STATUS_LABELS[status]}</span>`;
}
function complaintActions(c) {
  if (c.status === 'moi' || c.status === 'mo_lai') return `<button class="btn small primary" onclick="startComplaint(${c.id})">Tiếp nhận</button>`;
  if (c.status === 'dang_xu_ly') return `<button class="btn small primary" onclick="resolveComplaint(${c.id})">Đóng - Đã giải quyết</button>`;
  if (c.status === 'da_giai_quyet') return `<button class="btn small danger" onclick="reopenComplaint(${c.id})">Mở lại</button>`;
  return '';
}
async function startComplaint(id) { try { await api(`POST /api/complaints/${id}/start`, {}); render('complaints'); } catch (e) { alert(e.message); } }
async function resolveComplaint(id) {
  const note = prompt('Ghi chú hướng xử lý (bắt buộc trước khi đóng):');
  if (!note) return;
  try { await api(`POST /api/complaints/${id}/resolve`, { resolution_note: note }); render('complaints'); } catch (e) { alert(e.message); }
}
async function reopenComplaint(id) {
  if (!confirm('Mở lại khiếu nại này?')) return;
  try { await api(`POST /api/complaints/${id}/reopen`, {}); render('complaints'); } catch (e) { alert(e.message); }
}
function showNewComplaintModal() {
  openModal(`
    <h2>Ghi nhận Khiếu nại mới</h2>
    <div class="field"><label>Khách hàng *</label>
      <select id="f-customer_id">${state.customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Tiêu đề *</label><input id="f-title" /></div>
    <div class="field"><label>Mô tả</label><textarea id="f-description"></textarea></div>
    <div class="field"><label>Mức độ ưu tiên *</label>
      <select id="f-priority"><option value="khan_cap">Khẩn cấp (SLA 4 giờ)</option><option value="binh_thuong" selected>Bình thường (SLA 48 giờ)</option></select>
    </div>
    <div class="field"><label>Người phụ trách</label>
      <select id="f-assignee_id">${state.users.map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}</select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn primary" id="btn-save-complaint">Lưu</button>
    </div>
  `);
  document.getElementById('btn-save-complaint').addEventListener('click', async () => {
    try {
      const title = document.getElementById('f-title').value.trim();
      if (!title) return alert('Vui lòng nhập tiêu đề');
      await api('POST /api/complaints', {
        customer_id: Number(document.getElementById('f-customer_id').value),
        title,
        description: document.getElementById('f-description').value,
        priority: document.getElementById('f-priority').value,
        assignee_id: Number(document.getElementById('f-assignee_id').value) || null
      });
      closeModal();
      render('complaints');
    } catch (e) { alert(e.message); }
  });
}

async function renderRevenue(root) {
  const rows = await api('/api/revenue');
  root.innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="btn-new-revenue">+ Nhập doanh số</button></div>
    <div class="panel">
      <table><thead><tr><th>Khách hàng</th><th>Kỳ</th><th>Doanh số</th><th>So với tháng trước</th><th>Nguồn</th></tr></thead><tbody>
        ${rows.map((r) => `
          <tr>
            <td>${escapeHtml(r.customer_name)}</td>
            <td>${String(r.month).padStart(2, '0')}/${r.year}</td>
            <td>${money(r.revenue)}</td>
            <td>${changeBadge(r)}</td>
            <td><span class="badge ${r.source === 'import' ? 'brand' : 'gray'}">${r.source}</span></td>
          </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Chưa có dữ liệu doanh số</td></tr>'}
      </tbody></table>
    </div>
  `;
  document.getElementById('btn-new-revenue').addEventListener('click', showNewRevenueModal);
}
function changeBadge(r) {
  if (r.change_label === 'khong_co_du_lieu') return '<span class="badge gray">Chưa có kỳ trước</span>';
  const pctStr = r.change_pct != null ? Math.abs(r.change_pct).toFixed(1) + '%' : '';
  if (r.change_label === 'tang') return `<span class="badge green">▲ ${pctStr}</span> ${r.is_significant_change ? '<span class="badge amber">Biến động đáng kể</span>' : ''}`;
  if (r.change_label === 'giam') return `<span class="badge red">▼ ${pctStr}</span> ${r.is_significant_change ? '<span class="badge amber">Biến động đáng kể</span>' : ''}`;
  return '<span class="badge gray">Không đổi</span>';
}
function showNewRevenueModal() {
  const now = new Date();
  openModal(`
    <h2>Nhập doanh số tháng</h2>
    <div class="field"><label>Khách hàng *</label>
      <select id="f-customer_id">${state.customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
    </div>
    <div class="form-grid">
      <div class="field"><label>Năm</label><input id="f-year" type="number" value="${now.getFullYear()}" /></div>
      <div class="field"><label>Tháng</label><input id="f-month" type="number" value="${now.getMonth() + 1}" min="1" max="12" /></div>
    </div>
    <div class="field"><label>Doanh số (VNĐ) *</label><input id="f-revenue" type="number" /></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Hủy</button>
      <button class="btn primary" id="btn-save-revenue">Lưu</button>
    </div>
  `);
  document.getElementById('btn-save-revenue').addEventListener('click', async () => {
    try {
      await api('POST /api/revenue', {
        customer_id: Number(document.getElementById('f-customer_id').value),
        year: Number(document.getElementById('f-year').value),
        month: Number(document.getElementById('f-month').value),
        revenue: Number(document.getElementById('f-revenue').value)
      });
      closeModal();
      render('revenue');
    } catch (e) { alert(e.message); }
  });
}

render('dashboard');
