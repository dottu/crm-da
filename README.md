# CRM Đông Anh — Bản Demo tĩnh (deploy Vercel)

Đây là **bản demo giao diện + luồng nghiệp vụ** để cho khách hàng/Ban lãnh đạo xem trước, dùng để trình bày trên Vercel. Khác với bản đầy đủ (Node.js + SQLite, có lưu dữ liệu thật), bản này:

- **Không có backend/server** — chạy 100% trong trình duyệt (HTML/CSS/JS thuần, không framework, không build step).
- **Toàn bộ dữ liệu là dữ liệu mẫu (mockup) hoàn toàn hư cấu** — 6 khách hàng, 1 Lead, 5 Cơ hội, 3 Báo giá, 2 Khiếu nại, 6 tháng doanh số — không có tên/thông tin khách hàng thật, không có SĐT/CCCD thật.
- **Dữ liệu chỉ lưu tạm trong bộ nhớ trình duyệt (JS)** — mọi thao tác (thêm Lead, chuyển giai đoạn, duyệt báo giá...) chỉ tồn tại trong phiên xem hiện tại, **mất khi tải lại trang (F5)**. Đây là chủ đích để tránh hiểu nhầm là dữ liệu thật được lưu lại.
- Có banner cảnh báo màu vàng cố định ở đầu trang: *"BẢN DEMO — TOÀN BỘ DỮ LIỆU LÀ DỮ LIỆU MẪU..."* để người xem không nhầm với số liệu thật.

Logic nghiệp vụ (margin báo giá, SLA khiếu nại, bắt buộc lý do khi mất cơ hội, không cho sửa báo giá đã gửi, chặn nhập tay đè dữ liệu import...) được **giữ đúng y hệt** bản backend thật — chỉ khác là chạy bằng JavaScript ngay trong trình duyệt thay vì gọi API server. Xem chi tiết từng quy tắc trong `js/app.js` (phần đầu file, đã copy nguyên từ `lib/business-rules.js` của bản đầy đủ).

## Deploy lên Vercel

Đây là site tĩnh (static site) — không cần cấu hình gì thêm.

**Cách 1 — kéo thả (nhanh nhất, không cần Git):**
1. Vào https://vercel.com/new
2. Chọn "Deploy" rồi kéo thả cả thư mục này vào (hoặc dùng lệnh CLI bên dưới).

**Cách 2 — qua GitHub (khuyến nghị nếu muốn cập nhật sau này):**
1. Đẩy thư mục này lên 1 repo GitHub mới.
2. Vào https://vercel.com/new, chọn "Import Git Repository", chọn repo vừa tạo.
3. Vercel tự nhận diện đây là site tĩnh (Framework Preset: "Other") — không cần Build Command, không cần Output Directory (để mặc định hoặc "./"). Bấm Deploy.

**Cách 3 — dùng Vercel CLI:**
```bash
npm i -g vercel
cd crm-dong-anh-vercel-demo
vercel --prod
```

Sau khi deploy xong, Vercel cho 1 link dạng `https://<ten-project>.vercel.app` để gửi khách hàng xem trực tiếp trên trình duyệt — không cần cài đặt gì.

## Khác biệt so với bản đầy đủ (có backend + lưu dữ liệu thật)

| | Bản demo tĩnh (thư mục này) | Bản đầy đủ (`crm-dong-anh-app`) |
|---|---|---|
| Backend | Không có — chạy hoàn toàn trên trình duyệt | Node.js (server.js) + `node:sqlite` |
| Lưu dữ liệu | Chỉ trong bộ nhớ JS, mất khi F5 | File SQLite thật, lưu vĩnh viễn |
| Deploy | Vercel / bất kỳ static hosting nào | Cần môi trường chạy Node.js (VPS, server nội bộ...) |
| Mục đích | Demo giao diện + luồng nghiệp vụ cho khách xem | Ứng dụng dùng thật, cần server riêng |

**Lưu ý quan trọng**: khi khách hàng duyệt xong giao diện/luồng ở bản demo này, phần lưu trữ dữ liệu thật vẫn cần dùng bản đầy đủ (`crm-dong-anh-app`) hoặc kiến trúc production do Ban lãnh đạo/dev lead phê duyệt — bản demo này **không phải** là sản phẩm cuối cùng.

## Cấu trúc

```
crm-dong-anh-vercel-demo/
├── index.html       # Trang duy nhất (SPA điều hướng bằng JS)
├── css/style.css     # Toàn bộ style
└── js/app.js          # Business rules + dữ liệu mẫu + logic UI (tất cả trong 1 file)
```

---
*Sinh bởi AI theo vai trò draft/prototype builder — không tự động deploy, không tự động push code. Người dùng tự kiểm tra và tự deploy lên Vercel/GitHub theo quy trình nội bộ.*
