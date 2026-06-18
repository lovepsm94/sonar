# Thiết kế: PWA chơi offline cho Sonar

**Ngày:** 2026-06-18
**Trạng thái:** Đã duyệt thiết kế

## Mục tiêu

Đăng ký service worker để cache toàn bộ app shell, giúp Sonar **tải và chạy được khi không có mạng**, đồng thời cài đặt được như một PWA.

## Bối cảnh

- Next.js 14.2.5, App Router, **static export** (`output: 'export'`, `images: { unoptimized: true }`).
- Output là SPA: `index.html` + asset có hash trong `_next/static/` (build id đổi mỗi lần build), font self-host qua `next/font`, favicon + `og-image.png` + `site.webmanifest` trong `public/`.
- Game chạy P2P qua WebRTC (Google STUP), không backend.

## Phạm vi "offline" (kỳ vọng đúng)

- ✅ App **tải & chạy** đầy đủ khi offline (menu, bàn cờ, luật, đặt tàu).
- ✅ Hai máy **cùng WiFi không cần internet** thường vẫn kết nối được (local ICE candidates).
- ❌ Hai máy **khác mạng** vẫn cần internet (STUN) — service worker không giải quyết được phần kết nối.

## Phương án đã chọn: `@ducanh2912/next-pwa`

Thư viện (Workbox) tự sinh precache manifest tại thời điểm build — bao phủ mọi asset kể cả chunk load lười (QR scanner). Đánh đổi: thêm một dependency build-time, ngược với phong cách hand-rolled của repo, nhưng nhận được precache manifest đã được kiểm chứng.

(Đã cân nhắc và loại: *runtime cache-first* — đơn giản nhưng chunk load lười có thể thiếu khi offline; *SW tự viết + postbuild script* — không thêm dep nhưng phải tự lo versioning.)

## Thay đổi

1. **Dependency:** thêm `@ducanh2912/next-pwa` (devDependency; SW sinh ra là Workbox thuần, không thêm runtime vào bundle).
2. **`next.config.mjs`:** bọc config hiện tại bằng `withPWA`, giữ nguyên `output: 'export'`:
   - `dest: 'public'`, `register: true`, `disable: NODE_ENV === 'development'`.
   - `cacheOnFrontEndNav: true`, `reloadOnOnline: true`.
   - `workboxOptions`: precache toàn bộ output Next phát ra.
3. **Manifest:** không đổi — `/site.webmanifest` đã link sẵn trong `layout.tsx`.
4. **`.gitignore`:** bỏ qua file SW sinh tự động: `public/sw.js`, `public/sw.js.map`, `public/workbox-*.js`, `public/swe-worker-*.js`, `public/fallback-*.js`.

## KHÔNG làm (YAGNI)

Không push notification, không background sync, không trang offline riêng (vỏ SPA chính là trải nghiệm offline), không cache API (không có API — game P2P).

## Kiểm chứng

- `npm run build` → có `out/sw.js` + precache manifest, build không lỗi type.
- `npm test` → 76 test vẫn xanh.
- Phục vụ thư mục `out/`, bật DevTools → Offline → reload, xác nhận app khởi động từ cache.
