# stitch_cleanroom_b2b_sales_crm (1) — Bản deploy Vercel

Đây là **đúng nguyên bộ 7 file HTML** đã dựng từ export Google Stitch trước đó (thư mục `stitch_cleanroom_b2b_sales_crm (1)` bạn đã có trên máy) — **không chỉnh sửa thêm bất kỳ nội dung/mã nào**, chỉ đóng gói lại để deploy tĩnh lên Vercel.

## Đã giữ nguyên 100% (đúng yêu cầu "không sáng tạo")

- Toàn bộ HTML/CSS (Tailwind)/nội dung/hình ảnh giữ **y nguyên** như bản Stitch xuất ra.
- Thay đổi **duy nhất** đã làm từ trước (không đổi thêm gì ở bước này): các thuộc tính `href="#"` giữa các mục menu điều hướng đã được trỏ sang đúng tên file tương ứng (`dashboard.html`, `pipeline.html`, `bao-gia.html`, `cham-soc-khieu-nai.html`, `khach-hang-tiem-nang.html`, `bao-cao-doanh-so.html`) để click chuyển trang hoạt động được khi deploy tĩnh. Đã kiểm tra bằng diff từng byte so với bản Stitch gốc — không có thay đổi nào khác ngoài href đó.

## Đã thêm mới ở bước này — nhập dữ liệu ngay trong phiên xem

Theo yêu cầu bổ sung, mỗi màn hình (trừ Dashboard) giờ có thể **thêm dữ liệu thử trực tiếp khi đang xem demo**, để thao tác cho khách hàng thấy sinh động hơn là một trang tĩnh:

| Màn hình | Thao tác thêm được |
|---|---|
| Khách hàng tiềm năng | Nút có sẵn "+ Thêm Lead mới" giờ mở form nhập, thêm 1 dòng Lead mới vào đầu bảng |
| Pipeline | Nút có sẵn "+ Thêm Cơ hội Mới" mở form, thêm 1 thẻ vào cột "Mới tạo"; thẻ mới có thêm 1 ô chọn nhỏ để chuyển giai đoạn |
| Báo giá | Nút có sẵn "+ Thêm dòng từ Danh mục" mở form nhập sản phẩm/giá vốn/giá bán, tự tính % margin dòng theo đúng quy tắc SX ≥ 17% / TM ≥ 12%, cập nhật số "X dòng sản phẩm" |
| Chăm sóc & Khiếu nại | Thêm 1 nút "+ Ghi nhận Khiếu nại" (màn hình gốc chưa có nút này) mở form, thêm 1 dòng phiếu khiếu nại mới vào đầu bảng |
| Báo cáo doanh số | Các ô nhập "DS tháng này" (vốn đã có sẵn trên trang) giờ tự tính lại % biến động ngay khi gõ số, đúng logic ngưỡng "biến động đáng kể" ±15% |

**Cách làm — để không đụng vào thiết kế Stitch:**
- Toàn bộ logic trên nằm trong **1 file JS mới duy nhất**: `interactivity.js`.
- Mỗi file HTML chỉ được thêm **đúng 1 dòng** `<script src="interactivity.js"></script>` ngay trước `</body>` — không có thay đổi nào khác trong 7 file HTML gốc (đã diff lại để xác nhận).
- Khi thêm dữ liệu mới, script **clone lại đúng 1 dòng/thẻ có sẵn** trong trang rồi chỉ đổi nội dung chữ bên trong — nên dòng/thẻ mới có giao diện giống 100% các dòng/thẻ do Stitch vẽ (không tự vẽ giao diện mới). Điểm khác biệt duy nhất: dòng/thẻ mới có gắn 1 nhãn nhỏ màu cam "MỚI" để phân biệt với dữ liệu mẫu gốc, và có thêm 1 nút/khung nhập (dạng modal) đơn giản tự thiết kế — vì màn hình gốc của Stitch chưa có sẵn form nhập liệu nào.
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
