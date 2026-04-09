# An Thanh Sơn - Project Infrastructure

Hệ thống được chuyển đổi sang kiến trúc Client-Server chuyên nghiệp.

## Cấu trúc thư mục
- `/client`: Frontend React + Vite
- `/server`: Backend Express + TypeScript

## Hướng dẫn chạy hệ thống

### 1. Khởi động Backend
```bash
cd server
npm install
npm run dev
```
Backend sẽ chạy tại: `http://localhost:3000`

### 2. Khởi động Frontend
```bash
cd client
npm install
npm run dev
```
Frontend mặc định chạy tại: `http://localhost:5173`. Đổi cổng bằng biến `VITE_DEV_PORT` trong `client/.env` (xem `client/.env.example`).

## Các logic đã chuyển sang Backend
1. **Quản lý Nhân sự (Employees)**: CRUD và Tìm kiếm.
2. **Quản lý Dự án (Projects)**: CRUD và tự động Join thông tin Manager/Executor.
3. **Quản lý Hợp đồng (Contracts)**: CRUD và tự động Join Dự án/Nhân sự.
4. **Quản lý Công việc (Tasks)**: CRUD và lọc theo Hợp đồng.
5. **Trợ lý AI (AI Assistant)**: Xử lý ngôn ngữ tự nhiên thông qua Gemini API trên Server.

## Lợi ích của kiến trúc mới
- **Bảo mật**: Thông tin Service Role Key của Supabase được giữ kín ở Server.
- **Hiệu năng**: Các phép Join dữ liệu phức tạp được thực hiện ở Server thay vì Client.
- **Mở rộng**: Dễ dàng thêm logic nghiệp vụ, phân quyền và log mà không làm nặng Client.
