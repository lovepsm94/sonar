# Sonar — Game tàu ngầm 2 người P2P (thiết kế)

- **Ngày:** 2026-06-16
- **Trạng thái:** Đã duyệt thiết kế, chờ review spec
- **Tóm tắt:** Web game 2 người chơi kiểu *Captain Sonar* đơn giản hoá, turn-based, kết nối P2P qua WebRTC, bắt tay bằng QR/link, **không có backend**.

## 1. Mục tiêu & phạm vi

Xây một trang web tĩnh cho phép **2 người** đấu tàu ngầm trực tiếp với nhau qua kết nối ngang hàng (WebRTC DataChannel), bắt tay bằng cách **quét QR hoặc mở link** — không cần đăng nhập, không server backend, không lưu trữ phía server.

**Trong phạm vi:**
- Luật chơi turn-based với 5 hành động: Move, Sonar, Silence, Torpedo, Surface.
- Bắt tay WebRTC 2-QR (offer/answer) + dự phòng copy link.
- Đồng bộ trạng thái 2 máy qua DataChannel.
- **Song ngữ Việt / Anh** (i18n) — toàn bộ chữ trong UI.

**Ngoài phạm vi (YAGNI):**
- Server, tài khoản, bảng xếp hạng, ghép trận online ngẫu nhiên.
- TURN server / hỗ trợ NAT đối xứng.
- Hơn 2 người chơi; chế độ real-time.
- Chống gian lận ở mức tinh vi (sửa code phía client).

## 2. Mô hình game

- Hai tàu ngầm ẩn trên **cùng một bản đồ** (cùng layout đảo).
- Mỗi người **chỉ thấy tàu của mình**, vệt đường của mình, và các **dấu suy luận** tự ghi về địch.
- Tàu địch ẩn; chỉ "lộ" trong các sự kiện reveal (xem §5).
- Mỗi lượt người chơi công khai **hành động** (hướng Move / dùng hệ thống / kết quả) → đối thủ dùng để suy luận vị trí.

## 3. Bản đồ

- Lưới **10×10**.
- Chia **4 sector** (4 góc 5×5), đặt tên A/B/C/D.
- **Bản đồ sinh ngẫu nhiên mỗi ván**, từ một **seed** do host tạo và chia sẻ cho cả 2 máy (xem §8) → cả hai chạy cùng thuật toán → ra **bản đồ y hệt** (deterministic).
- **Đảo rải rác, không cụm:** thuật toán đặt đảo có ràng buộc **khoảng cách tối thiểu** giữa hai đảo bất kỳ (≥ 2 ô) + **giới hạn số đảo mỗi sector** (cân bằng giữa 4 sector). Mật độ đảo ~10–15% số ô.
- **Đảm bảo chơi được:** mặt nước phải **liền mạch** (mọi ô nước đi đến được nhau); nếu seed sinh ra map không hợp lệ thì sinh lại (vẫn deterministic theo seed kế tiếp).
- **Vị trí xuất phát:** mỗi người tự chọn ô nước bắt đầu (bí mật) khi vào ván.
- Ràng buộc di chuyển: không đi qua đảo; **không đi đè vệt đường của chính mình**. Vệt reset khi Surface.

## 4. Cấu trúc lượt & năng lượng

Đến lượt mình, chọn **đúng 1 hành động**:

| Hệ thống | Chi phí năng lượng | Tác dụng |
|---|---|---|
| **Move** | — (sinh **+1**) | Đi 1 ô theo 4 hướng; **công khai hướng**; để lại vệt |
| **Sonar** | 3 | Buộc địch tiết lộ **1 thông tin thật + 1 giả** (vd: hàng / cột / sector); người dùng phải đoán cái nào thật |
| **Silence** | 4 | "Tắt máy": đi **0–3 ô thẳng theo 1 hướng mà KHÔNG báo hướng** → cắt mạch suy luận của địch (địch chỉ biết bạn đã dùng Silence) |
| **Torpedo** | 4 | Bắn 1 ô trong tầm (độ dài đường đi ≤ 4 ô tính từ tàu). **Trúng trực tiếp = 1 sát thương**. Bắn trúng đảo / ngoài tầm = phí lượt |
| **Surface** | — | Reset vệt + **nạp đầy năng lượng**, nhưng **khai báo sector** đang đứng cho địch và **nghỉ 3 lượt** (địch đi 3 lượt liên tục) |

- Năng lượng là **một pool dùng chung** (không phải track riêng từng hệ thống), tối đa bằng mức nạp đầy khi Surface (đề xuất trần = 6, chỉnh trong lúc cân bằng).

## 5. Hiển thị & reveal vị trí địch

Tàu địch ẩn mặc định. Các sự kiện làm lộ:
- **Surface** → lộ **sector** đang đứng (vùng, không phải ô chính xác).
- **Torpedo trúng** → ô bị bắn được xác nhận là vị trí địch tại thời điểm đó.
- Ngoài ra chỉ có **dấu suy luận** người chơi tự ghi (từ chuỗi hướng Move + manh mối Sonar).

## 6. Xử lý kết quả & chống gian lận

- P2P không có trọng tài. **Máy bên phòng thủ tự động tính** trúng/trượt từ vị trí thật của nó rồi gửi kết quả về dưới dạng một action phản hồi.
- Người chơi **không bao giờ nhập tay** kết quả → người dùng thường không thể khai man.
- Sonar: máy địch tự sinh cặp thông tin thật/giả đúng luật rồi gửi.
- **Giới hạn đã biết:** chỉ người sửa code client mới gian được — nằm ngoài phạm vi.

## 7. Thắng / thua

- Mỗi tàu **3 HP**. Hết HP → thua.
- Có nút **đầu hàng**.
- Màn kết thúc có nút **chơi lại** (giữ kết nối, reset state).

## 8. Kết nối WebRTC (bắt tay bằng QR, không signaling server)

**Cách trao đổi:** QR là chính, **dự phòng copy link** (dán qua chat/AirDrop khi camera lỗi).

**Luồng 2-QR (Máy B tự vào phòng):**
1. **Máy A (host):** bấm *Tạo phòng* → sinh **seed bản đồ ngẫu nhiên** → tạo **Offer** (kèm seed trong payload) + gom ICE xong → hiện **QR #1 / link Offer**.
2. **Máy B:** **quét QR #1 hoặc mở link** → **tự động** nhận Offer, tạo **Answer** + gom ICE → hiện **QR #2 (Answer)**.
3. **Máy A:** quét **QR #2** → set remote description → **DataChannel mở → vào game**.

**Chi tiết kỹ thuật:**
- **Non-trickle ICE:** chờ gom xong toàn bộ ICE candidate rồi mới đóng gói vào SDP và sinh QR (trễ ~1–2s khi tạo QR).
- **STUN công cộng miễn phí** (vd Google) để xuyên NAT — không phải server tự nuôi.
- SDP được **nén (deflate) + base64url** để vừa **1 QR mỗi bên**; nhét vào **`#fragment`** của URL nên dữ liệu **ở lại trên máy, không gửi lên server nào**.
- **Giới hạn:** NAT đối xứng (một số mạng 4G) cần TURN → **không hỗ trợ**; khuyến nghị chơi **cùng WiFi**.

## 9. Kiến trúc kỹ thuật

**Stack:** Next.js với `output: 'export'` (site tĩnh thuần client) + TypeScript + React + **Framer Motion** (animation) + SVG. State game bằng reducer thuần, tách khỏi UI.

**Phân lớp module (mỗi phần một trách nhiệm, test độc lập):**

- `game/map` — sinh bản đồ **deterministic theo seed**: PRNG có seed, đặt đảo với ràng buộc khoảng cách tối thiểu + giới hạn mỗi sector, kiểm tra nước liền mạch (flood-fill), sinh lại nếu không hợp lệ. Thuần, không UI.
- `game/engine` — luật thuần, không UI/mạng:
  - Kiểu dữ liệu: `GameState`, `Action`, `Cell`, `Direction`, `SystemType`, `MapSeed`.
  - `reduce(state, action): GameState` — hàm chuyển trạng thái thuần.
  - Kiểm tra hợp lệ: move không đè vệt/đảo, đủ năng lượng, torpedo trong tầm.
  - Tính trúng torpedo; sinh dữ liệu Sonar (thật/giả).
  - **Phần được test kỹ nhất (TDD).**
- `net/webrtc` — bọc `RTCPeerConnection` + `RTCDataChannel`: `createHost()`, `joinFrom(offer)`, `onMessage`, `send(action)`; non-trickle ICE; cấu hình STUN.
- `net/signaling` — mã hoá/nén SDP ↔ chuỗi cho QR & link (deflate + base64url, `#fragment`).
- `net/qr` — sinh QR (`qrcode`) + quét QR qua camera (`jsqr` hoặc `html5-qrcode`).
- `app/i18n` — song ngữ Việt/Anh: từ điển `key → { vi, en }`, hook `useI18n()` trả hàm `t(key)`, context giữ ngôn ngữ hiện tại. Mặc định theo `navigator.language` (fallback **vi**), lưu lựa chọn vào `localStorage`. Không dùng thư viện nặng.
- `app/board` — lớp render + animation bàn cờ bằng **SVG + Framer Motion** (`motion`): vẽ lưới/đảo/sector bằng SVG, tàu là `motion` element animate vị trí theo state (trượt mượt ô→ô), vẽ vệt đường, và các hiệu ứng có chuỗi: **ngư lôi bay theo cung**, **sonar ping vòng lan**, **chớp khi trúng**. Render thuần từ `GameState`, không giữ state riêng.
- `app/` — các trang/màn hình Next, ghép engine + net.

**Render & animation:** dùng **Framer Motion + SVG** (không Konva/Pixi) vì game turn-based, ít vật thể động, hợp với React state, dễ i18n/CSS/accessibility. Animation chỉ là lớp trình diễn — **không ảnh hưởng logic** trong `game/engine` (engine tính tức thời, board diễn hoạt kết quả).

**Màn hình (5):** Trang chủ → Bắt tay kết nối → Bàn chơi chính → Chờ lượt địch → Kết thúc. Mọi màn có **nút chuyển ngôn ngữ VI/EN** (góc trên). Ngôn ngữ là tùy chọn cục bộ mỗi máy — không đồng bộ qua mạng (2 người có thể xem 2 ngôn ngữ khác nhau).

**Luồng dữ liệu khi chơi:**
1. UI phát `Action` → `engine.reduce` cập nhật state cục bộ.
2. Đồng thời `net.send(action)` gửi cho địch.
3. Máy địch nhận → chạy `reduce` y hệt → 2 bên đồng bộ.
4. Action hidden-info (kết quả torpedo/sonar) do **máy phòng thủ** tính rồi gửi lại dưới dạng action phản hồi.

**Đồng bộ & chống lệch:** mỗi action gắn **số thứ tự lượt**; bên nhận chỉ chấp nhận đúng lượt. Mất kết nối → màn hình "đang kết nối lại", giữ state.

## 10. Kiểm thử

- **`game/map`:** unit test — cùng seed ra cùng map (deterministic); đảo luôn cách nhau ≥ 2 ô; số đảo mỗi sector trong giới hạn; nước luôn liền mạch.
- **`game/engine`:** unit test (Vitest) — bao phủ luật di chuyển, năng lượng, torpedo, sonar, surface, điều kiện thắng/thua. Viết theo TDD.
- **`net/signaling`:** unit test mã hoá/giải mã + kiểm tra kích thước vừa 1 QR.
- **`app/i18n`:** unit test — mọi key đều có đủ cả `vi` và `en`; `t()` trả đúng theo ngôn ngữ hiện tại và fallback hợp lý.
- **`net/webrtc` & `net/qr`:** test thủ công 2 thiết bị; test luồng bắt tay bằng **2 tab trên localhost**.

## 11. Giới hạn đã biết (tổng hợp)

- Không hỗ trợ NAT đối xứng (cần TURN/server) — khuyến nghị cùng WiFi.
- Chống gian lận chỉ ở mức "không nhập tay"; sửa code client thì gian được.
- Chỉ 2 người, chỉ turn-based.
