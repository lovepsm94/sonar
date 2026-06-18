# Thiết kế: UI thông báo khi không thể kết nối

**Ngày:** 2026-06-18
**Trạng thái:** Đã duyệt thiết kế

## Vấn đề

Khi kết nối thất bại, người dùng không nhận được phản hồi rõ ràng:

| Tình huống | Hiện tại | Vấn đề |
|---|---|---|
| Token/QR sai (decode lỗi) | `catch { return }` (page.tsx 259, 274) | **Im lặng hoàn toàn** |
| Nhầm loại mã (quét QR sai vai) | `return` | Im lặng |
| Lỗi handshake | `fatal='connect'` (398-403) | Màn thô, không style/i18n |
| Mất kết nối giữa game | `connLost` (421-423) | Màn thô, không i18n |
| Kết nối treo (ICE fail lúc handshake) | Không xử lý | Kẹt vĩnh viễn ở màn QR |

## Phương án (Approach 1)

Chia 2 mức theo độ nghiêm trọng:

**A. Lỗi mã → báo inline, không rời màn.** Dán/quét nhầm → dòng đỏ ngay tại HomeScreen
(guest quét) hoặc ConnectScreen (host dán answer). Tự xoá khi gõ lại / quét lại. Không mất QR đã tạo.

**B. Lỗi kết nối nặng → màn `NoticeScreen` có style** (thay 2 màn thô). Song ngữ, icon cảnh báo,
lý do, nút Thử lại / Về sảnh. Dùng cho: handshake-failed, timeout (mới), conn-lost.

## Thành phần

### 1. Hàm thuần `readPeerCode` trong `src/net/signaling.ts`
Tách logic strip `#fragment` + decode + kiểm vai (đang lặp inline ở page.tsx) ra hàm test được:
```ts
export type CodeError = 'bad-code' | 'wrong-role';
export function readPeerCode(raw: string, expect: 'offer' | 'answer'):
  | { ok: true; payload: SignalPayload }
  | { ok: false; error: CodeError };
```
- rỗng / decode lỗi → `bad-code`; sai vai → `wrong-role`; hợp lệ → payload.

### 2. `src/app/screens/NoticeScreen.tsx`
Presentational, dùng token UI sẵn có (`SCREEN`, `CHIP`, `BTN_PRIMARY`, `BTN_GHOST`).
Props: `reason: 'handshake-failed' | 'timeout' | 'conn-lost'`, `onHome`, `onRetry?`.
Chỉ hiện nút Thử lại khi có `onRetry`.

### 3. `ConnectScreen` + `HomeScreen`
Thêm props `error?: CodeError | null` và `onClearError?: () => void`.
- Render dòng lỗi (đỏ, font-mono) dưới ô dán / nút quét.
- Gọi `onClearError` khi đổi nội dung input hoặc mở lại ScanModal.

### 4. `src/app/page.tsx`
- State `codeError: CodeError | null` (inline, hiện trên home hoặc host-wait — chỉ 1 màn render tại 1 thời điểm).
- State `notice: NoticeReason | null` thay `fatal`.
- `onHostScanned`/`joinWithOffer`: dùng `readPeerCode`; lỗi → `setCodeError` (bỏ `catch{return}` im lặng); handshake throw → `setNotice('handshake-failed')`.
- **Timeout:** vào host-wait/guest-wait → hẹn ~20s; `onOpen` xoá timer; quá hạn → `setNotice('timeout')`.
- `connLost` → render `NoticeScreen reason='conn-lost'` (chỉ nút Về sảnh).
- Về sảnh = clear hash + reload; Thử lại = reload.

### 5. i18n (`vi.json` + `en.json`)
Keys mới: `error.badCode`, `error.wrongRole`, `notice.title`, `notice.handshakeFailed`,
`notice.timeout`, `notice.connLost`, `notice.retry`, `notice.home`.

## KHÔNG làm (YAGNI)
Không auto-retry handshake, không phân loại lỗi ICE chi tiết, không toast system.

## Kiểm chứng
- `npm test`: thêm test cho `readPeerCode` (bad-code/wrong-role/ok, xử lý link có `#`); 81 test cũ vẫn xanh.
- `npm run build`: type-check qua.
- Thủ công: dán mã rác → thấy lỗi inline; ngắt mạng giữa game → thấy NoticeScreen.
