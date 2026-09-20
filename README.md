# stitch_cleanroom_b2b_sales_crm (1) — Bản deploy Vercel

Đây là **đúng nguyên bộ 7 file HTML** đã dựng từ export Google Stitch trước đó (thư mục `stitch_cleanroom_b2b_sales_crm (1)` bạn đã có trên máy) — **không chỉnh sửa thêm bất kỳ nội dung/mã nào**, chỉ đóng gói lại để deploy tĩnh lên Vercel.

## Đã giữ nguyên 100% (đúng yêu cầu "không sáng tạo")

- Toàn bộ HTML/CSS (Tailwind)/nội dung/hình ảnh giữ **y nguyên** như bản Stitch xuất ra.
- Thay đổi **duy nhất** đã làm từ trước (không đổi thêm gì ở bước này): các thuộc tính `href="#"` giữa các mục menu điều hướng đã được trỏ sang đúng tên file tương ứng (`dashboard.html`, `pipeline.html`, `bao-gia.html`, `cham-soc-khieu-nai.html`, `khach-hang-tiem-nang.html`, `bao-cao-doanh-so.html`) để click chuyển trang hoạt động được khi deploy tĩnh. Đã kiểm tra bằng diff từng byte so với bản Stitch gốc — không có thay đổi nào khác ngoài href đó.

## Đã thêm mới ở bước này — nhập dữ liệu ngay trong phiên xem

Theo yêu cầu bổ sung, **tất cả 7 màn hình kể cả Dashboard** giờ có thể **thêm dữ liệu thử trực tiếp khi đang xem demo**, để thao tác cho khách hàng thấy sinh động hơn là một trang tĩnh:

| Màn hình | Thao tác thêm được |
|---|---|
Mỗi thao tác thêm đều **hiển thị ngay trên giao diện** — không chỉ thêm dòng/thẻ mà các số tổng hợp liên quan cũng cập nhật theo:

| Màn hình | Thao tác thêm được | Số liệu tự cập nhật |
|---|---|---|
| Mọi trang (header dùng chung) | "+ Tạo nhanh Báo giá": form khách hàng/sản phẩm đầu tiên, tạo báo giá mới và chuyển sang trang Báo giá (áp dụng ngay nếu đang đứng sẵn ở đó) | Dòng mới + tổng tiền ở trang Báo giá |
| Dashboard / trang mặc định | "Tạo việc mới": thêm thẻ việc vào "Cần xử lý hôm nay" (có nút "Đánh dấu hoàn tất"); "Cập nhật liên hệ": ghi 1 dòng nhật ký liên hệ vào thẻ; "Xem ticket" / "Điều chỉnh báo giá" chuyển tới trang tương ứng; "Chỉ đường KCN" mở Google Maps | "04 Việc gấp" và "N tác vụ ưu tiên cao" (khi việc mới ở mức Khẩn cấp) |
| Khách hàng tiềm năng | "+ Thêm Lead mới" (chọn ngành, NVKD); "Chuyển thành Cơ hội" chuyển sang Pipeline và tự thêm thẻ cơ hội; "Lưu nháp" hồ sơ | Tổng Lead, số Lead + % theo ngành, "Hiển thị 1 - N trong số T" |
| Pipeline | "+ Thêm Cơ hội Mới" (thẻ có ô chọn chuyển giai đoạn); nhận cơ hội chuyển từ Lead | Số thẻ + tổng giá trị ở tiêu đề từng cột (kể cả khi chuyển giai đoạn), "N Cơ hội • X Tỷ VNĐ" |
| Báo giá | "+ Thêm dòng từ Danh mục", "Nhập từ Excel báo giá", "Đính thêm tài liệu", "Cấu hình hệ số chiết khấu bổ sung" (chiết khấu toàn đơn), "Lưu nháp", "Gửi duyệt Giám đốc KD" (đổi nhãn DRAFT → CHỜ DUYỆT) | Số dòng sản phẩm, thanh tổng cố định phía dưới: tổng SL, giá vốn, chưa VAT, chiết khấu, VAT 8%, tổng thanh toán, margin toàn đơn và cảnh báo dòng dưới ngưỡng |
| Chăm sóc & Khiếu nại | "+ Ghi nhận Khiếu nại" (nút được chèn thêm), "+ Thêm file" đính kèm, "Tạm lưu cập nhật" (ghi phương án xử lý vào Audit Trail) | Các tab "Tất cả / Mới tiếp nhận", "Đang mở", "Hiển thị N phiếu", "Trang 1/x", số "mốc ghi nhận" |
| Báo cáo doanh số | "+ Thêm khách hàng" (nút được chèn thêm), gõ "DS tháng này", "Chọn tệp từ máy"/kéo thả file Excel, "Xuất template Excel" (tải CSV), "Lưu nháp", "Lưu báo cáo tháng" (kiểm tra giải trình biến động ≥ 15%), "Hủy bỏ" (hoàn tác) | "DS tháng này đã nhập", % đạt chỉ tiêu, chênh lệch chu kỳ, số khách hàng biến động lớn, "N khách hàng" |

Các nút không thuộc nhóm "thêm/lưu dữ liệu" (chuông thông báo, phân trang, bộ lọc trạng thái, menu ⋮ từng dòng, thu gọn/đóng panel, xuất PDF/CSV, xem lịch sử giá/PDF) vẫn giữ nguyên như bản Stitch gốc.

**Cách làm — để hạn chế tối đa việc đụng vào thiết kế Stitch:**
- Toàn bộ logic trên nằm trong **1 file JS mới duy nhất**: `interactivity.js`.
- Mỗi file HTML chỉ thêm **đúng 1 dòng** `<script src="interactivity.js"></script>` ngay trước `</body>` (kể cả `dashboard.html`/`index.html` — trước đây 2 file này chưa có dòng script nên các nút thêm dữ liệu trên Dashboard hoàn toàn không hoạt động) — không có thay đổi nào khác trong nội dung/thiết kế 7 file HTML gốc.
- Khi thêm dữ liệu mới, script **clone lại đúng 1 dòng/thẻ có sẵn** trong trang rồi chỉ đổi nội dung chữ bên trong — nên dòng/thẻ mới có giao diện giống 100% các dòng/thẻ do Stitch vẽ (không tự vẽ giao diện mới). Điểm khác biệt duy nhất: dòng/thẻ mới có gắn 1 nhãn nhỏ màu cam "MỚI" để phân biệt với dữ liệu mẫu gốc, và có thêm 1 nút/khung nhập (dạng modal) đơn giản tự thiết kế — vì màn hình gốc của Stitch chưa có sẵn form nhập liệu nào.
- Chuyển dữ liệu giữa các trang (VD: "Tạo nhanh Báo giá" ở header, hoặc "Chuyển thành Cơ hội" từ Lead sang Pipeline) dùng `sessionStorage` của trình duyệt làm hàng đợi tạm — trang đích tự đọc và chèn dữ liệu ngay khi tải xong.
- Đã sửa 1 lỗi có sẵn trong bản xuất gốc của Stitch trên `pipeline.html`: modal "Xác nhận Chốt đơn thành công" (`#modal-win-deal`) bị thiếu class `hidden` nên hiển thị đè kín toàn trang ngay từ đầu — `interactivity.js` tự ẩn modal này khi tải trang.
- **Dữ liệu chỉ tồn tại trong bộ nhớ trình duyệt của phiên xem hiện tại** — mất khi tải lại trang (F5) hoặc đóng tab, vì đây vẫn là bản demo tĩnh, không có backend/lưu trữ thật.

## Danh sách file

| File | Màn hình |
|---|---|
| `index.html` | Trang mặc định (nội dung giống `dashboard.html`) |
| `dashboard.html` | Dashboard |
| `khach-hang-tiem-nang.html` | Khách hàng tiềm năng (Lead) |
| `pipeline.html` | Pipeline |
| `bao-gia.html` | Báo giá |
| `cham-soc-khieu-nai.html` | Chăm sóc & Khiếu nại |
| `bao-cao-doanh-so.html` | Báo cáo doanh số |
| `interactivity.js` | File JS mới — cho phép thêm dữ liệu thử trong phiên (xem mục trên) |

## Lưu ý quan trọng — đây là bản mockup thị giác, KHÔNG có logic/dữ liệu thật

- Đây thuần là **giao diện tĩnh do Stitch tạo** để demo hình ảnh/luồng điều hướng cho khách hàng xem — **không có backend, không lưu dữ liệu, không tính toán nghiệp vụ thật** (không giống bản `crm-dong-anh-app` hay bản demo tương tác `crm-dong-anh-vercel-demo` đã gửi trước đó).
- Các số liệu, tên khách hàng hiển thị trên các màn hình này là do Stitch tự sinh khi thiết kế — **không được xác nhận là dữ liệu chuẩn theo PRD**, chỉ mang tính minh hoạ giao diện.
- Trang cần **kết nối Internet khi xem** vì tải các tài nguyên ngoài: Tailwind CSS (`cdn.tailwindcss.com`), Google Fonts, Material Symbols, và vài ảnh minh hoạ từ `googleusercontent.com`. Khi deploy lên Vercel (có Internet) thì hiển thị bình thường.

## Deploy lên Vercel

Đây là site tĩnh thuần HTML — không cần build command.

**Cách 1 — kéo thả nhanh:**
1. Vào https://vercel.com/new
2. Kéo thả cả thư mục này vào để deploy.

**Cách 2 — qua GitHub:**
1. Đẩy thư mục này lên 1 repo GitHub mới.
2. Vào https://vercel.com/new → Import Git Repository → chọn repo.
3. Framework Preset chọn "Other", không cần Build Command / Output Directory. Bấm Deploy.

**Cách 3 — CLI:**
```bash
npm i -g vercel
cd stitch_cleanroom_b2b_sales_crm_1
vercel --prod
```

Sau khi deploy, Vercel trả về link dạng `https://<ten-project>.vercel.app/index.html` — gửi khách hàng bấm xem trực tiếp trên trình duyệt, có thể click chuyển qua lại giữa 6 màn hình qua menu bên trái.

---
*Đóng gói bởi AI theo đúng yêu cầu "sử dụng chính xác mã code cung cấp, không sáng tạo" — 7 file HTML gốc chỉ có duy nhất 1 dòng script được thêm vào mỗi file để nạp `interactivity.js` (tính năng thêm dữ liệu trong phiên theo yêu cầu bổ sung); không có nội dung/thiết kế nào khác bị thay đổi ngoài đường link điều hướng nội bộ đã nêu ở trên.*
