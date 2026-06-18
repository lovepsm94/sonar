# Thiết kế: thêm TURN để chơi cross-network (WiFi ↔ 4G)

**Ngày:** 2026-06-18
**Trạng thái:** Đã duyệt thiết kế

## Vấn đề

Hai máy khác mạng (điển hình: 1 WiFi, 1 4G) không kết nối được. Mạng 4G ở VN gần như luôn dùng **CGNAT / Symmetric NAT**: cổng công khai mà STUN quan sát khác cổng nhà mạng thực sự mở cho peer kia, nên gói tin bị NAT chặn và ICE kết thúc ở `failed`. STUN (đang dùng) không giải quyết được — cần **TURN** (server trung chuyển).

Đây đúng là giới hạn "Symmetric NAT (needs TURN) is unsupported" ghi trong CLAUDE.md; spec này gỡ giới hạn đó.

## Ràng buộc

- App là **static export, không backend** → không thể mint credential TURN động (việc đó cần secret phía server). Credential phải nhúng client.
- Phải giữ kiến trúc phân lớp: `net/` không import `app/`.

## Phương án đã chọn: Metered Open Relay + cấu hình qua env

Loại Cloudflare TURN vì nó cần gọi API bằng secret token để tạo credential ngắn hạn — không hợp app không-backend. Metered có endpoint công khai dùng ngay, và vẫn cho cắm credential riêng.

## Thay đổi

### 1. File mới `src/net/iceConfig.ts` — hàm thuần `buildIceServers`
```ts
export function buildIceServers(raw = process.env.NEXT_PUBLIC_ICE_SERVERS): RTCIceServer[]
```
- Nếu `raw` là JSON array hợp lệ → dùng nó (cho phép cắm Metered/Cloudflare riêng sau này).
- Parse lỗi hoặc rỗng → fallback **default**: Google STUN + Open Relay public TURN.
- Default TURN (Open Relay, credential vốn công khai `openrelayproject`/`openrelayproject`):
  - `turn:openrelay.metered.ca:80` (UDP/TCP)
  - `turn:openrelay.metered.ca:443`
  - `turns:openrelay.metered.ca:443?transport=tcp` — TLS qua 443, vượt firewall chặt.

### 2. `src/net/webrtc.ts`
- `const ICE_CONFIG: RTCConfiguration = { iceServers: buildIceServers() };`
- Nới timeout `waitForIce` 3000 → 5000ms: gather qua TURN (đặc biệt `turns:443`) chậm hơn STUN, 3s đôi khi cắt trước khi có relay candidate.

### 3. Test `test/net/iceConfig.test.ts`
- Default chứa cả STUN và TURN (có ít nhất một entry `turn:`/`turns:`).
- Env JSON hợp lệ → trả đúng mảng đó.
- Env hỏng (JSON sai / không phải array) → fallback default, không ném lỗi.

Không test `RTCPeerConnection` thật (cần browser).

## Đánh đổi / lưu ý

- **Credential TURN nằm trong bundle** (không tránh được với static no-backend). Open Relay vốn công khai nên chấp nhận được. Muốn ổn định: đăng ký Metered free tier (50GB/tháng) lấy credential riêng, set `NEXT_PUBLIC_ICE_SERVERS`.
- Open Relay public **không có SLA** — có thể chậm/đầy lúc cao điểm. Đủ để chơi thử.

## KHÔNG làm (YAGNI)

Không tự dựng coturn, không mint credential động, không UI chọn server.

## Kiểm chứng

- `npm test` → test mới xanh, 76 test cũ vẫn xanh.
- `npm run build` → type-check qua, build tĩnh OK.
- (Thủ công, sau deploy) máy 4G mở `chrome://webrtc-internals` thấy có candidate loại `relay`; thử nối WiFi ↔ 4G thành công.
