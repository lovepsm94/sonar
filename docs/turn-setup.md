# Hướng dẫn lấy TURN riêng (Metered free) cho Sonar

App đã chạy được với TURN public mặc định (Open Relay), **không cần làm gì thêm**. Nhưng
Open Relay public không đảm bảo (có thể chậm/đầy lúc cao điểm). Nếu muốn ổn định cho
trường hợp WiFi ↔ 4G, lấy TURN riêng của Metered (miễn phí 50GB/tháng) theo các bước dưới.

## 1. Đăng ký Metered (miễn phí)

1. Vào https://dashboard.metered.ca/signup → đăng ký bằng email (không cần thẻ).
2. Xác nhận email, đăng nhập vào dashboard.

## 2. Tạo TURN app

1. Trong dashboard chọn **TURN Server** → **Create App** (đặt tên bất kỳ, ví dụ `sonar`).
2. Bạn sẽ có một subdomain dạng `your-app.metered.live` và một **API Key**.

## 3. Lấy danh sách iceServers

Cách dễ nhất: trong trang TURN app, mục **"Credentials"** / **"ICE Servers"** sẽ hiện sẵn
một mảng JSON kiểu:

```json
[
  { "urls": "stun:stun.relay.metered.ca:80" },
  { "urls": "turn:standard.relay.metered.ca:80",  "username": "abc123", "credential": "xyz789" },
  { "urls": "turn:standard.relay.metered.ca:443", "username": "abc123", "credential": "xyz789" },
  { "urls": "turns:standard.relay.metered.ca:443?transport=tcp", "username": "abc123", "credential": "xyz789" }
]
```

Copy nguyên cụm này. (Credential ở đây là loại dùng được lâu dài, không phải secret API key —
nhúng vào client là chấp nhận được.)

> ⚠️ ĐỪNG dùng **API Key** làm credential và đừng đưa API Key vào code/env client.
> API Key chỉ dùng phía server để mint credential — app này không có server nên ta dùng
> thẳng cụm iceServers ở trên.

## 4. Ép JSON về một dòng

Biến môi trường phải là JSON **một dòng**. Bỏ hết xuống dòng:

```
[{"urls":"stun:stun.relay.metered.ca:80"},{"urls":"turn:standard.relay.metered.ca:80","username":"abc123","credential":"xyz789"},{"urls":"turn:standard.relay.metered.ca:443","username":"abc123","credential":"xyz789"},{"urls":"turns:standard.relay.metered.ca:443?transport=tcp","username":"abc123","credential":"xyz789"}]
```

## 5. Cắm vào project

**Trên Vercel (production):**
1. Project → **Settings** → **Environment Variables**.
2. Thêm biến `NEXT_PUBLIC_ICE_SERVERS` = chuỗi JSON một dòng ở bước 4.
3. **Redeploy** (Deployments → … → Redeploy) để biến được build vào bundle.

**Chạy local:**
1. Copy `.env.example` thành `.env.local`.
2. Dán giá trị vào dòng `NEXT_PUBLIC_ICE_SERVERS=...`.
3. `npm run dev`.

## 6. Kiểm chứng

- Mở app trên máy 4G → `chrome://webrtc-internals` → tạo/scan QR.
- Tìm trong danh sách ICE candidate có dòng loại **`relay`** → TURN đang hoạt động.
- Thử nối WiFi ↔ 4G: phải vào được game.

## Ghi chú

- Code đọc env này ở [`src/net/iceConfig.ts`](../src/net/iceConfig.ts) qua hàm `buildIceServers()`.
  Nếu JSON sai cú pháp, nó tự fallback về default (Google STUN + Open Relay) chứ không vỡ kết nối.
- Hết 50GB/tháng thì kết nối qua relay sẽ ngừng tới chu kỳ sau; phần lớn ván nối trực tiếp được
  (không qua relay) nên thực tế tiêu thụ rất ít.
