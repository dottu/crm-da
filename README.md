# stitch_cleanroom_b2b_sales_crm (1) — Bản deploy Vercel (1 file duy nhất)

Toàn bộ 6 màn hình dựng từ export Google Stitch (Dashboard, Khách hàng tiềm năng, Pipeline, Báo giá, Chăm sóc & Khiếu nại, Báo cáo doanh số) được **gộp thành 1 file `index.html` duy nhất** — HTML, JS đều nhúng sẵn trong file, chỉ tải thêm Tailwind/Google Fonts từ Internet. Chỉ cần deploy/mở đúng file này.

- Dùng chung 1 sidebar + 1 header; bấm menu bên trái để chuyển màn hình **không tải lại trang**. Mỗi màn hình có địa chỉ riêng: `index.html#dashboard`, `#khach-hang-tiem-nang`, `#pipeline`, `#bao-gia`, `#cham-soc-khieu-nai`, `#bao-cao-doanh-so`.
- Nội dung/thiết kế từng màn hình giữ nguyên như bản Stitch (chỉ thống nhất sidebar/header theo 1 mẫu, và gộp cấu hình Tailwind của 6 trang thành 1).

## Đã thêm mới ở bước này — nhập dữ liệu ngay trong phiên xem

Theo yêu cầu bổ sung, **cả 6 màn hình (kể cả Dashboard)** đều có thể **thêm dữ liệu thử trực tiếp khi đang xem demo**, để thao tác cho khách hàng thấy sinh động hơn là một trang tĩnh.

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

**Sửa / Xóa** — mọi dòng/thẻ dữ liệu đều sửa và xóa được (kể cả dữ liệu mẫu gốc), có hộp xác nhận trước khi xóa và số liệu tổng hợp tự tính lại:

| Màn hình | Nút Sửa / Xóa |
|---|---|
| Khách hàng tiềm năng | Nút ⋮ ở cột "Thao tác" của từng dòng mở menu **Sửa thông tin / Xóa Lead**; tổng Lead, số Lead + % theo ngành, "Hiển thị 1 - N" tự cập nhật |
| Pipeline | Mỗi thẻ cơ hội có **Sửa / Xóa** ở góc dưới; số thẻ + tổng giá trị của cột và "N Cơ hội • X Tỷ" tự cập nhật (đã sửa lưới 5 cột không còn chồng lên nhau ở màn hình nhỏ hơn ~1500px — bảng cuộn ngang) |
| Báo giá | Mỗi dòng có icon ✏️ **Sửa** cạnh icon 🗑 **Xóa** (icon thùng rác gốc trước đây không có tác dụng); STT được đánh lại, tổng SL/giá vốn/VAT/tổng thanh toán/margin toàn đơn và danh sách dòng dưới ngưỡng tính lại |
| Chăm sóc & Khiếu nại | Mỗi phiếu có **Sửa / Xóa** dưới mã phiếu; các tab trạng thái, "Đang mở", "Hiển thị N phiếu" tự tính lại theo trạng thái phiếu |
| Dashboard | Mỗi việc có **Sửa / Xóa**; việc do người dùng tạo còn đổi được mức ưu tiên, "Việc gấp" tự cập nhật |
| Báo cáo doanh số | Mỗi khách hàng đang nhập được có **Sửa / Xóa** (dòng "Đã import" bị khóa nên không có); tổng DS, DS tháng trước, chênh lệch, số khách biến động lớn tự tính lại; "Hủy bỏ" hoàn tác cả dòng đã xóa, "Lưu báo cáo tháng" chốt số liệu làm mốc mới |

Các nút không thuộc nhóm "thêm/lưu dữ liệu" (chuông thông báo, phân trang, bộ lọc trạng thái, thu gọn/đóng panel, xuất PDF/CSV, xem lịch sử giá/PDF) vẫn giữ nguyên như bản Stitch gốc.

**Cách làm — để hạn chế tối đa việc đụng vào thiết kế Stitch:**
- Toàn bộ logic thêm dữ liệu nằm trong `src/app.js` (được nhúng vào `index.html` khi dựng file).
- Mỗi màn hình là 1 khối `<main data-page="...">`; mã chỉ thao tác trong phạm vi khối của màn hình đó nên các nút trùng tên giữa các trang không ảnh hưởng nhau.
- Khi thêm dữ liệu mới, script **clone lại đúng 1 dòng/thẻ có sẵn** trong trang rồi chỉ đổi nội dung chữ bên trong — nên dòng/thẻ mới có giao diện giống 100% các dòng/thẻ do Stitch vẽ (không tự vẽ giao diện mới). Điểm khác biệt duy nhất: dòng/thẻ mới có gắn 1 nhãn nhỏ màu cam "MỚI" để phân biệt với dữ liệu mẫu gốc, và có thêm 1 nút/khung nhập (dạng modal) đơn giản tự thiết kế — vì màn hình gốc của Stitch chưa có sẵn form nhập liệu nào.
- Thao tác liên màn hình ("Tạo nhanh Báo giá" ở header, "Chuyển thành Cơ hội" từ Lead sang Pipeline) gọi thẳng hàm của màn hình đích rồi chuyển tới màn hình đó — không cần tải lại trang.
- Đã sửa 1 lỗi có sẵn trong bản xuất gốc của Stitch trên `pipeline.html`: modal "Xác nhận Chốt đơn thành công" (`#modal-win-deal`) bị thiếu class `hidden` nên hiển thị đè kín toàn trang ngay từ đầu — `src/app.js` tự ẩn modal này khi tải trang.
- **Dữ liệu chỉ tồn tại trong bộ nhớ trình duyệt của phiên xem hiện tại** — mất khi tải lại trang (F5) hoặc đóng tab, vì đây vẫn là bản demo tĩnh, không có backend/lưu trữ thật.

## Cấu trúc thư mục

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | **File duy nhất cần deploy** (được sinh ra bởi `src/build.js`) |
| `src/app.js` | Mã thêm dữ liệu + router chuyển màn hình |
| `src/pages/*.html` | 6 màn hình Stitch gốc dùng làm nguồn để gộp |
| `src/build.js` | Gộp `src/pages` + `src/app.js` thành `index.html` — chạy: `node src/build.js` |

> Các file `dashboard.html`, `khach-hang-tiem-nang.html`, `pipeline.html`, `bao-gia.html`, `cham-soc-khieu-nai.html`, `bao-cao-doanh-so.html`, `interactivity.js` ở thư mục gốc là bản cũ (nhiều file) — không còn cần thiết cho `index.html`, có thể xóa.

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
