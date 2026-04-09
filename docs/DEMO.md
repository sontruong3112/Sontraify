# Demo Quickstart

## 1) Backend env
- Copy backend/.env.example to backend/.env
- Check these values:
  - MONGODB_URI
  - JWT_ACCESS_SECRET
  - JWT_REFRESH_SECRET

## 2) Seed data
Run inside backend folder:
- npm run seed:reset

This creates:
- 1 admin user

Default admin credentials:
- email: admin@music.local
- password: admin123

## 3) Start backend
Run inside backend folder:
- npm run dev

If startup fails, check backend/.env first.

## 4) Frontend env
- Copy frontend/.env.example to frontend/.env
- Ensure VITE_API_BASE_URL points to backend

## 4.1) Cloudinary env (backend)
Add these values to backend/.env:
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- CLOUDINARY_FOLDER=music-app

Notes:
- Upload signature endpoint is admin-only: POST /api/v1/uploads/signature
- In Admin song manager, you can select audio/image files from your computer.
- Audio files are uploaded to Cloudinary as resource_type=video (Cloudinary standard for audio hosting).

## 5) Start frontend
Run inside frontend folder:
- npm run dev

## 6) Demo flow
- Open frontend app in browser
- Login with admin account
- Confirm Song list loads from API
- Create, edit, delete songs in Admin Songs panel
- Create playlists and add/remove songs

## 7) Common issue
- Wrong command: use npm run dev, not nom run dev

## 8) Checklist release nhanh (Tiếng Việt)

Mục tiêu: xác nhận nhanh toàn bộ hệ thống trước khi bàn giao hoặc push bản mới.

### Bước 1: Chuẩn bị backend
- Vào thư mục backend.
- Đảm bảo file `.env` đã có đủ biến bắt buộc:
  - `MONGODB_URI`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `CLOUDINARY_FOLDER`

### Bước 2: Nạp dữ liệu mẫu
- Chạy trong backend:
  - `npm run seed:reset`
- Kết quả mong đợi:
  - Có tài khoản admin mẫu.
  - Khong tu dong tao bai hat mau.
  - Khong tu dong tao playlist mau.

### Bước 3: Chạy backend
- Chạy trong backend:
  - `npm run dev`
- Kiểm tra nhanh health:
  - `GET http://localhost:3000/health`
  - Kỳ vọng: trả về `status: ok`.

### Bước 4: Chạy frontend
- Vào thư mục frontend và chạy:
  - `npm run dev`
- Mở ứng dụng tại `http://localhost:5173`.

### Bước 5: Kiểm tra chất lượng code frontend
- Chạy trong frontend:
  - `npm run test -- --run`
  - `npm run build`
- Kỳ vọng: toàn bộ test pass và build pass.

### Bước 6: Smoke test nghiệp vụ chính trên UI
- Đăng nhập admin:
  - Email: `admin@music.local`
  - Password: `admin123`
- Vào Admin mode:
  - Tạo bài hát mới.
  - Chỉnh sửa bài hát.
  - Xóa bài hát.
- Kiểm tra upload Cloudinary:
  - Upload audio từ máy tính.
  - Upload ảnh cover từ máy tính.
  - Kỳ vọng: URL được điền vào form.
- Kiểm tra user flow:
  - Tạo playlist.
  - Thêm bài hát vào playlist.
  - Xóa bài hát khỏi playlist.
  - Xóa playlist.
- Kiểm tra player:
  - Play/Pause, Next/Prev.
  - Seek timeline.
  - Shuffle/Repeat.
  - Chỉnh volume.

### Bước 7: Kiểm tra quyền (RBAC)
- User thường không được gọi endpoint admin upload signature.
- Admin gọi `POST /api/v1/uploads/signature` phải thành công.

### Bước 8: Tiêu chí pass cuối cùng
- Backend chạy ổn, không lỗi cổng.
- Frontend chạy ổn, không lỗi runtime.
- Test + build frontend pass.
- Luồng admin và user hoạt động đúng.
- RBAC đúng như thiết kế.
