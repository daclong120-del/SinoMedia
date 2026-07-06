# Overview — remove-bg

## Dự án là gì
Hệ thống / công cụ tách nền ảnh (remove background) sử dụng PhotoRoom API bằng PowerShell script, hỗ trợ sử dụng bởi AI Agent hoặc người dùng qua tài liệu hướng dẫn `README.md` chi tiết.

## Mục tiêu
- Cung cấp công cụ / tập lệnh PowerShell tách nền ảnh đơn giản nhất cho AI Agent sử dụng (`-InputPath` và `-OutputPath`).
- Hỗ trợ xoay tua nhiều API Keys (Key Rotation) để tự động khắc phục khi một số key hết hạn mức hoặc bị rate limit.
- Cung cấp tài liệu hướng dẫn sử dụng chi tiết (`README.md`) tối ưu cho AI Agent.
- Thiết lập cấu trúc thư mục độc lập, cô lập.

## Phạm vi / Non-goals
- Tập trung vào tính năng cốt lõi là tách nền ảnh qua PhotoRoom API.
- Không xây dựng giao diện người dùng đồ họa phức tạp (GUI) hay các tính năng chỉnh sửa ảnh khác.
